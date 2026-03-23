"""
Feedback router for AutoStudyAI.
Handles user feedback/bug report submissions.
"""

import logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from database import get_supabase
from auth_utils import get_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    category: Optional[str] = Field(default="general", max_length=20)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        allowed = {"bug", "feature", "general"}
        if v and v not in allowed:
            raise ValueError(f"category must be one of: {allowed}")
        return v or "general"


@router.post("")
def submit_feedback(request: FeedbackRequest, authorization: str = Header(default="")):
    """Submit user feedback."""
    try:
        user_id = get_user_id(authorization)
        supabase = get_supabase()

        supabase.table("feedback").insert({
            "user_id": user_id,
            "message": request.message,
            "category": request.category,
        }).execute()

        return {"submitted": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
