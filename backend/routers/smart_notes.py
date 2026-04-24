import re
import logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, field_validator
from typing import Optional
from database import get_supabase
from auth_utils import get_user_id

_UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/smart_notes", tags=["smart_notes"])


def _validate_uuid(value: str, name: str = "ID") -> str:
    if not value or not _UUID_RE.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {name}")
    return value


class CreateNoteRequest(BaseModel):
    title: str = "Untitled Notes"

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        v = v.strip() if v else "Untitled Notes"
        return v[:200] or "Untitled Notes"


class UpdateNoteRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

    model_config = {"str_max_length": 500_000}

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if v is not None:
            return v.strip()[:200]
        return v


class DiagramRequest(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Content is required")
        return v[:10_000]


@router.get("")
def list_notes(authorization: str = Header(default="")):
    try:
        user_id = get_user_id(authorization)
        supabase = get_supabase()
        result = supabase.table("smart_notes") \
            .select("id, title, updated_at, created_at") \
            .eq("user_id", user_id) \
            .order("updated_at", desc=True) \
            .execute()
        return {"notes": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing smart notes: {e}")
        raise HTTPException(status_code=500, detail="Failed to list notes")


@router.post("")
def create_note(request: CreateNoteRequest, authorization: str = Header(default="")):
    try:
        user_id = get_user_id(authorization)
        supabase = get_supabase()
        result = supabase.table("smart_notes").insert({
            "user_id": user_id,
            "title": request.title,
            "content": "",
        }).execute()
        if result.data:
            return {"note": result.data[0]}
        raise HTTPException(status_code=500, detail="Failed to create note")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating smart note: {e}")
        raise HTTPException(status_code=500, detail="Failed to create note")


@router.get("/{note_id}")
def get_note(note_id: str, authorization: str = Header(default="")):
    try:
        _validate_uuid(note_id, "note ID")
        user_id = get_user_id(authorization)
        supabase = get_supabase()
        result = supabase.table("smart_notes") \
            .select("*") \
            .eq("id", note_id) \
            .eq("user_id", user_id) \
            .execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"note": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting smart note: {e}")
        raise HTTPException(status_code=500, detail="Failed to get note")


@router.put("/{note_id}")
def update_note(note_id: str, request: UpdateNoteRequest, authorization: str = Header(default="")):
    try:
        _validate_uuid(note_id, "note ID")
        user_id = get_user_id(authorization)
        supabase = get_supabase()

        updates = {}
        if request.title is not None:
            updates["title"] = request.title or "Untitled Notes"
        if request.content is not None:
            updates["content"] = request.content
        if not updates:
            return {"updated": False}

        from datetime import datetime, timezone
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        supabase.table("smart_notes") \
            .update(updates) \
            .eq("id", note_id) \
            .eq("user_id", user_id) \
            .execute()

        return {"updated": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating smart note: {e}")
        raise HTTPException(status_code=500, detail="Failed to update note")


@router.delete("/{note_id}")
def delete_note(note_id: str, authorization: str = Header(default="")):
    try:
        _validate_uuid(note_id, "note ID")
        user_id = get_user_id(authorization)
        supabase = get_supabase()
        supabase.table("smart_notes") \
            .delete() \
            .eq("id", note_id) \
            .eq("user_id", user_id) \
            .execute()
        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting smart note: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete note")


@router.post("/diagram")
def generate_diagram(request: DiagramRequest, authorization: str = Header(default="")):
    try:
        get_user_id(authorization)
        import os
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {"mermaid": None}

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=800,
            messages=[{
                "role": "system",
                "content": (
                    "You generate Mermaid.js diagrams for student notes. "
                    "The user has manually selected this text specifically because they want a visual. "
                    "Always try to create the most useful diagram possible — use sequenceDiagram for "
                    "communication/protocol flows, flowchart for processes, graph for relationships, "
                    "mindmap for hierarchies, or classDiagram for structures. "
                    "Output ONLY raw valid Mermaid.js syntax — no markdown fences, no explanation. "
                    "Keep diagrams concise (max 14 nodes). "
                    "Only output the exact text NO_DIAGRAM if the input is completely undiagrammable "
                    "(e.g. a single random word or pure numbers with no context)."
                )
            }, {
                "role": "user",
                "content": request.content
            }]
        )

        text = response.choices[0].message.content.strip()
        # Strip markdown fences if the model wrapped output anyway
        text = re.sub(r'^```(?:mermaid)?\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\s*```$', '', text).strip()
        if not text or 'NO_DIAGRAM' in text:
            return {"mermaid": None}
        return {"mermaid": text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating diagram: {e}")
        return {"mermaid": None}
