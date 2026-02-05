"""
AutoStudyAI Backend API
FastAPI server for processing educational content and generating study materials.
"""

import os
import logging
import traceback
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AutoStudyAI API",
    description="API for generating study materials from educational content",
    version="1.0.0"
)

# Add CORS middleware for extension access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage
storage = InMemoryStorage()


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


@app.post("/ingest", response_model=IngestResponse)
def ingest(request: IngestRequest):
    """
    Ingest page content for processing.
    Detects slideshows and preprocesses content.
    """
    try:
        logger.info(f"Ingesting content from: {request.page_url}")
        logger.info(f"Content length: {len(request.content)} chars")

        content_id = str(uuid4())

        # Detect if content is from a slideshow
        is_slideshow, slideshow_type = is_slideshow_content(request.content)

        # Store content with metadata
        storage.save_content(
            content_id,
            request.content,
            request.page_url,
            metadata={
                "content_type": request.content_type,
                "is_slideshow": is_slideshow,
                "slideshow_type": slideshow_type
            }
        )

        logger.info(f"Ingested content_id={content_id}, slideshow={is_slideshow}")

        return IngestResponse(
            content_id=content_id,
            content_type=request.content_type,
            detected_slideshow=is_slideshow
        )

    except Exception as e:
        logger.error(f"Error in /ingest: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to ingest content")


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    """
    Generate study materials from ingested content.
    Returns notes, study guide, and/or flashcards based on request.
    """
    try:
        logger.info(f"Generating materials for content_id: {request.content_id}")

        content_obj = storage.get_content(request.content_id)
        if not content_obj:
            raise HTTPException(status_code=404, detail="Content not found")

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

        if request.notes:
            logger.info("Generating notes...")
            notes = generate_notes_ai('\n\n'.join(chunks))
            notes_str = '\n'.join(f"- {note}" for note in notes) if notes else "No notes generated."

        if request.study_guide:
            logger.info("Generating study guide...")
            study_guide = generate_study_guide(chunks)

        if request.flashcards:
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
def create_flashcards(request: FlashcardRequest):
    """
    Generate flashcards from ingested content.
    Dedicated endpoint for flashcard generation.
    """
    try:
        logger.info(f"Generating flashcards for content_id: {request.content_id}")

        content_obj = storage.get_content(request.content_id)
        if not content_obj:
            raise HTTPException(status_code=404, detail="Content not found")

        raw_text = content_obj["content"]
        cleaned = clean_text(raw_text)
        chunks = chunk_text(cleaned)

        if not chunks:
            return FlashcardResponse(flashcards=[], count=0)

        flashcards = generate_flashcards(chunks, max_cards=request.max_cards)

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
def chat(request: ChatRequest):
    """
    Answer questions about the content.
    Supports short, detailed, and example modes.
    """
    try:
        logger.info(f"Chat question: {request.question[:100]}...")
        logger.info(f"Mode: {request.mode}")

        if not request.content:
            return ChatResponse(answer="No content provided. Please capture a page first.")

        answer = answer_question(
            question=request.question,
            context=request.content,
            mode=request.mode
        )

        return ChatResponse(answer=answer)

    except Exception as e:
        logger.error(f"Error in /chat: {e}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"answer": f"Error processing question: {str(e)}"}
        )


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
