"""Shared Tutor session endpoints used by Classroom and the Chrome side panel."""

from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field, field_validator

from auth_utils import get_user_id
from services.tutor_sessions import (
    get_or_create_tutor_session,
    public_tutor_session,
    update_browser_context,
    update_tutor_skill,
)


router = APIRouter(prefix="/tutor", tags=["tutor"])


class BrowserObservation(BaseModel):
    url: str = Field(default="", max_length=2_048)
    title: str = Field(default="", max_length=500)
    source_type: str = Field(default="webpage", max_length=40)
    content_refs: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value):
        if value and urlparse(value).scheme not in {"http", "https"}:
            raise ValueError("Browser URL must use http or https")
        return value


class BrowserActionResult(BaseModel):
    command_id: str = Field(..., max_length=36)
    status: str = Field(..., pattern=r"^(completed|failed)$")
    action: str = Field(..., max_length=40)
    error: str = Field(default="", max_length=500)
    section_count: Optional[int] = Field(default=None, ge=0, le=100)


class BrowserContextUpdate(BaseModel):
    session_id: str = Field(..., max_length=36)
    browser_available: bool = True
    browser_observation: Optional[BrowserObservation] = None
    permission_scope: list[str] = Field(default_factory=lambda: ["read_page"], max_length=10)
    last_action_result: Optional[BrowserActionResult] = None

    @field_validator("permission_scope")
    @classmethod
    def validate_permissions(cls, value):
        allowed = {"read_page", "navigate", "download", "calendar_write", "canvas_write"}
        if any(item not in allowed for item in value):
            raise ValueError("Unsupported browser permission")
        return sorted(set(value))


class TutorSkillUpdate(BaseModel):
    session_id: str = Field(..., max_length=36)
    skill: str = Field(..., max_length=30)


@router.get("/session")
def current_tutor_session(authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    return public_tutor_session(get_or_create_tutor_session(user_id))


@router.patch("/session/browser")
def browser_context(body: BrowserContextUpdate, authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    row = update_browser_context(user_id, body.session_id, body.model_dump())
    return public_tutor_session(row)


@router.patch("/session/skill")
def tutor_skill(body: TutorSkillUpdate, authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    return public_tutor_session(update_tutor_skill(user_id, body.session_id, body.skill))
