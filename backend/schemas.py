"""
Pydantic models for API request/response validation.
"""

from pydantic import BaseModel
from typing import List, Optional


class IngestRequest(BaseModel):
    """Request to ingest page content."""
    content: str
    page_url: str
    content_type: str = "webpage"  # webpage, slideshow, pdf


class IngestResponse(BaseModel):
    """Response from content ingestion."""
    content_id: str
    content_type: str = "webpage"
    detected_slideshow: bool = False


class GenerateRequest(BaseModel):
    """Request to generate study materials."""
    content_id: str
    notes: bool = True
    study_guide: bool = True
    flashcards: bool = False


class GenerateResponse(BaseModel):
    """Response with generated study materials."""
    notes: Optional[str] = None
    study_guide: Optional[str] = None
    flashcards: Optional[List[dict]] = None


class FlashcardRequest(BaseModel):
    """Request to generate flashcards only."""
    content_id: str
    max_cards: int = 15


class Flashcard(BaseModel):
    """Single flashcard."""
    front: str
    back: str


class FlashcardResponse(BaseModel):
    """Response with flashcards."""
    flashcards: List[Flashcard]
    count: int


class ChatRequest(BaseModel):
    """Request for chat Q&A."""
    question: str
    content: str
    mode: str = "short"  # short, detailed, example


class ChatResponse(BaseModel):
    """Response from chat."""
    answer: str
