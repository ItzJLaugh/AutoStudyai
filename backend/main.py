"""
AutoStudyAI Backend API
FastAPI server for processing educational content and generating study materials.
"""

import os
import re
import logging
import traceback
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import bleach

from storage import InMemoryStorage
from schemas import (
    IngestRequest, IngestResponse,
    GenerateRequest, GenerateResponse,
    FlashcardRequest, FlashcardResponse,
    ChatRequest, ChatResponse
)
from services.text_processing import (
    clean_text, chunk_text,
    is_slideshow_content, extract_slideshow_content
)
from services.llm import (
    generate_notes_ai, generate_study_guide,
    generate_flashcards, answer_question,
    summarize_for_slideshow
)
from routers import auth, folders, guides, stats, search, quiz, billing, nclex
from auth_utils import get_user_id
from routers.billing import check_and_increment_usage

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Configure logging — never log tokens or secrets
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiter — keyed by IP address
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="AutoStudyAI API",
    description="API for generating study materials from educational content",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None,
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — restrict to known origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if os.getenv("FRONTEND_URL"):
    ALLOWED_ORIGINS.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"chrome-extension://.*|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # HSTS — enforce HTTPS in production
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Include Supabase-backed routers
app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(guides.router)
app.include_router(stats.router)
app.include_router(search.router)
app.include_router(quiz.router)
app.include_router(nclex.router)
app.include_router(billing.router)

# Initialize storage with limits
storage = InMemoryStorage()

# === Input sanitization helpers ===
MAX_CONTENT_LENGTH = 500_000  # 500KB max content
MAX_QUESTION_LENGTH = 2_000
MAX_URL_LENGTH = 2_048


def _sanitize_text(text: str, max_length: int = MAX_CONTENT_LENGTH) -> str:
    """Enforce length limits on text input."""
    if not text:
        return ""
    return text[:max_length]


def _validate_url(url: str) -> str:
    """Validate and sanitize URL."""
    if not url:
        return ""
    url = url[:MAX_URL_LENGTH]
    if not re.match(r'^https?://', url):
        raise HTTPException(status_code=400, detail="Invalid URL")
    return url


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


@app.post("/ingest", response_model=IngestResponse)
@limiter.limit("30/minute")
async def ingest(body: IngestRequest, request: Request, authorization: str = Header(default="")):
    """
    Ingest page content for processing.
    Requires authentication. Rate limited.
    """
    try:
        # Require auth to prevent OpenAI credit abuse
        user_id = get_user_id(authorization)
        logger.info(f"Ingesting content for user={user_id[:8]}...")

        # Sanitize inputs
        content = _sanitize_text(body.content, MAX_CONTENT_LENGTH)
        page_url = _validate_url(body.page_url)

        if not content or len(content) < 10:
            raise HTTPException(status_code=400, detail="Content too short")

        logger.info(f"Content length: {len(content)} chars")

        content_id = str(uuid4())

        # Detect if content is from a slideshow
        is_slideshow, slideshow_type = is_slideshow_content(content)

        # Store content with metadata (keyed by user to prevent cross-user access)
        storage.save_content(
            content_id,
            content,
            page_url,
            metadata={
                "content_type": body.content_type,
                "is_slideshow": is_slideshow,
                "slideshow_type": slideshow_type,
                "user_id": user_id,
            }
        )

        logger.info(f"Ingested content_id={content_id}, slideshow={is_slideshow}")

        return IngestResponse(
            content_id=content_id,
            content_type=body.content_type,
            detected_slideshow=is_slideshow
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /ingest: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to ingest content")


@app.post("/generate", response_model=GenerateResponse)
@limiter.limit("15/minute")
async def generate(body: GenerateRequest, request: Request, authorization: str = Header(default="")):
    """
    Generate study materials from ingested content.
    Requires authentication. Rate limited.
    """
    try:
        user_id = get_user_id(authorization)
        logger.info(f"Generating materials for user={user_id[:8]}...")

        # Enforce freemium usage limit before doing any work
        check_and_increment_usage(user_id)

        content_obj = storage.get_content(body.content_id)
        if not content_obj:
            raise HTTPException(status_code=404, detail="Content not found")

        # Verify content belongs to requesting user
        if content_obj.get("metadata", {}).get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        raw_text = content_obj["content"]
        metadata = content_obj.get("metadata", {})

        # Check if this is slideshow content
        if metadata.get("is_slideshow"):
            slides = extract_slideshow_content(raw_text)
            if slides:
                # Use slideshow-specific processing
                slideshow_summary = summarize_for_slideshow(slides)
                cleaned = slideshow_summary if slideshow_summary else clean_text(raw_text)
            else:
                cleaned = clean_text(raw_text)
        else:
            cleaned = clean_text(raw_text)

        # Chunk the content for processing
        chunks = chunk_text(cleaned)

        if not chunks:
            logger.warning("No content chunks after cleaning")
            return GenerateResponse(
                notes="No meaningful content found to process.",
                study_guide=None,
                flashcards=None
            )

        # Generate requested materials
        notes_str = None
        study_guide = None
        flashcards = None

        if body.notes:
            logger.info("Generating notes...")
            notes = generate_notes_ai('\n\n'.join(chunks))
            notes_str = '\n'.join(f"- {note}" for note in notes) if notes else "No notes generated."

        if body.study_guide:
            logger.info("Generating study guide...")
            study_guide = generate_study_guide(chunks)

        if body.flashcards:
            logger.info("Generating flashcards...")
            flashcards = generate_flashcards(chunks)

        return GenerateResponse(
            notes=notes_str,
            study_guide=study_guide,
            flashcards=flashcards
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /generate: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to generate materials")


@app.post("/flashcards", response_model=FlashcardResponse)
@limiter.limit("15/minute")
async def create_flashcards(body: FlashcardRequest, request: Request, authorization: str = Header(default="")):
    """
    Generate flashcards from ingested content.
    Requires authentication. Rate limited.
    """
    try:
        user_id = get_user_id(authorization)
        logger.info(f"Generating flashcards for user={user_id[:8]}...")

        # Enforce max_cards limit
        max_cards = min(body.max_cards, 30)

        content_obj = storage.get_content(body.content_id)
        if not content_obj:
            raise HTTPException(status_code=404, detail="Content not found")

        # Verify content belongs to requesting user
        if content_obj.get("metadata", {}).get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        raw_text = content_obj["content"]
        cleaned = clean_text(raw_text)
        chunks = chunk_text(cleaned)

        if not chunks:
            return FlashcardResponse(flashcards=[], count=0)

        flashcards = generate_flashcards(chunks, max_cards=max_cards)

        return FlashcardResponse(
            flashcards=[{"front": fc["front"], "back": fc["back"]} for fc in flashcards],
            count=len(flashcards)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /flashcards: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to generate flashcards")


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(body: ChatRequest, request: Request, authorization: str = Header(default="")):
    """
    Answer questions about the content.
    Requires authentication. Rate limited.
    """
    try:
        user_id = get_user_id(authorization)
        logger.info(f"Chat from user={user_id[:8]}...")

        question = _sanitize_text(body.question, MAX_QUESTION_LENGTH)
        content = _sanitize_text(body.content, MAX_CONTENT_LENGTH)

        if not question:
            raise HTTPException(status_code=400, detail="Question is required")

        if not content:
            return ChatResponse(answer="No content provided. Please capture a page first.")

        # Validate mode
        if body.mode not in ("short", "detailed", "example"):
            raise HTTPException(status_code=400, detail="Invalid mode")

        answer = answer_question(
            question=question,
            context=content,
            mode=body.mode
        )

        return ChatResponse(answer=answer)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /chat: {e}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"answer": "Error processing your question. Please try again."}
        )

