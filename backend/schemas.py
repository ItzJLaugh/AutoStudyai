"""
Pydantic models for API request/response validation.
All inputs are constrained at the schema level (defense in depth).
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class IngestRequest(BaseModel):
    """Request to ingest page content."""
    content: str = Field(..., min_length=10, max_length=500_000)
    page_url: str = Field(..., max_length=2_048)
    content_type: str = Field(default="webpage", max_length=20)

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v):
        allowed = {"webpage", "slideshow", "pdf"}
        if v not in allowed:
            raise ValueError(f"content_type must be one of: {allowed}")
        return v

    @field_validator("page_url")
    @classmethod
    def validate_url(cls, v):
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class IngestResponse(BaseModel):
    """Response from content ingestion."""
    content_id: str
    content_type: str = "webpage"
    detected_slideshow: bool = False


class GenerateRequest(BaseModel):
    """Request to generate study materials."""
    content_id: str = Field(..., min_length=1, max_length=100)
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
    content_id: str = Field(..., min_length=1, max_length=100)
    max_cards: int = Field(default=15, ge=1, le=30)


class Flashcard(BaseModel):
    """Single flashcard."""
    front: str = Field(..., max_length=2_000)
    back: str = Field(..., max_length=5_000)


class FlashcardResponse(BaseModel):
    """Response with flashcards."""
    flashcards: List[Flashcard]
    count: int = Field(..., ge=0)


class ChatRequest(BaseModel):
    """Request for chat Q&A."""
    question: str = Field(..., min_length=1, max_length=2_000)
    content: str = Field(..., max_length=500_000)
    mode: str = Field(default="short", max_length=10)

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v):
        allowed = {"short", "detailed", "example"}
        if v not in allowed:
            raise ValueError(f"mode must be one of: {allowed}")
        return v


class ChatResponse(BaseModel):
    """Response from chat."""
    answer: str
