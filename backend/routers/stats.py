"""
Stats router for AutoStudyAI.
Handles streak tracking, study session logging, and overview statistics.
"""

import re
import json
import logging
from datetime import date, datetime, timedelta
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from database import get_supabase
from auth_utils import get_user_id

_UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stats", tags=["stats"])


class LogSessionRequest(BaseModel):
    guide_id: Optional[str] = None
    session_type: str = Field(..., max_length=20)
    duration_seconds: int = Field(default=0, ge=0, le=86400)  # max 24 hours
    metadata: Optional[dict] = Field(default_factory=dict)

    @field_validator("session_type")
    @classmethod
    def validate_session_type(cls, v):
        allowed = {"flashcard", "quiz", "read", "timer", "browse"}
        if v not in allowed:
            raise ValueError(f"session_type must be one of: {allowed}")
        return v

    @field_validator("guide_id")
    @classmethod
    def validate_guide_id(cls, v):
        if v is not None and not _UUID_RE.match(v):
            raise ValueError("Invalid guide ID")
        return v

    @field_validator("metadata")
    @classmethod
    def validate_metadata(cls, v):
        import json
        if v and len(json.dumps(v)) > 10_000:
            raise ValueError("Metadata too large")
        return v


def _update_streak(user_id: str):
    """Update streak after a study session."""
    supabase = get_supabase()
    today = date.today()

    result = supabase.table("user_streaks").select("*").eq("user_id", user_id).execute()

    if not result.data:
        supabase.table("user_streaks").insert({
            "user_id": user_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_study_date": str(today)
        }).execute()
        return

    streak = result.data[0]
    last_date = date.fromisoformat(streak["last_study_date"]) if streak["last_study_date"] else None

    if last_date == today:
        return

    if last_date == today - timedelta(days=1):
        new_streak = streak["current_streak"] + 1
    else:
        new_streak = 1

    longest = max(streak["longest_streak"], new_streak)
    supabase.table("user_streaks").update({
        "current_streak": new_streak,
        "longest_streak": longest,
        "last_study_date": str(today),
    }).eq("user_id", user_id).execute()


@router.get("/streak")
def get_streak(authorization: str = Header(default=""), tz_offset: int = 0):
    """Get current user's streak info.

    tz_offset: minutes from UTC (e.g. -300 for EST). Used to determine
    the user's local day boundaries (12:00 AM - 11:59:59 PM).
    """
    try:
        # Clamp offset to valid range (-720 to +840 minutes)
        tz_offset = max(-720, min(840, tz_offset))

        user_id = get_user_id(authorization)
        supabase = get_supabase()

        # Determine "today" in the user's local timezone
        user_now = datetime.utcnow() + timedelta(minutes=tz_offset)
        user_today = user_now.date()

        result = supabase.table("user_streaks").select("*").eq("user_id", user_id).execute()

        if not result.data:
            # Build empty Sunday-aligned week
            days_since_sunday = (user_today.weekday() + 1) % 7
            sunday = user_today - timedelta(days=days_since_sunday)
            week = [{"date": str(sunday + timedelta(days=i)), "active": False} for i in range(7)]
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_study_date": None,
                "studied_today": False,
                "week": week
            }

        streak = result.data[0]
        last_date = date.fromisoformat(streak["last_study_date"]) if streak["last_study_date"] else None
        studied_today = last_date == user_today

        current = streak["current_streak"]
        if last_date and last_date < user_today - timedelta(days=1):
            current = 0

        # Sunday-aligned week: find most recent Sunday
        # weekday(): Mon=0 .. Sun=6  →  days_since_sunday = (weekday+1)%7
        days_since_sunday = (user_today.weekday() + 1) % 7
        sunday = user_today - timedelta(days=days_since_sunday)
        saturday = sunday + timedelta(days=6)

        # Convert local day boundaries to UTC for querying
        utc_start = datetime(sunday.year, sunday.month, sunday.day) - timedelta(minutes=tz_offset)
        utc_end = datetime(saturday.year, saturday.month, saturday.day, 23, 59, 59) - timedelta(minutes=tz_offset)

        sessions = supabase.table("study_sessions") \
            .select("started_at") \
            .eq("user_id", user_id) \
            .gte("started_at", utc_start.isoformat()) \
            .lte("started_at", utc_end.isoformat()) \
            .execute()

        # Convert each session's UTC timestamp to the user's local date
        active_days = set()
        for s in (sessions.data or []):
            ts = s["started_at"]
            try:
                utc_dt = datetime.fromisoformat(ts.replace("Z", "+00:00").replace("+00:00", ""))
                local_dt = utc_dt + timedelta(minutes=tz_offset)
                active_days.add(str(local_dt.date()))
            except (ValueError, AttributeError):
                active_days.add(ts[:10])

        week = []
        for i in range(7):
            d = sunday + timedelta(days=i)
            week.append({"date": str(d), "active": str(d) in active_days})

        return {
            "current_streak": current,
            "longest_streak": streak["longest_streak"],
            "last_study_date": streak["last_study_date"],
            "studied_today": studied_today,
            "week": week
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting streak: {e}")
        raise HTTPException(status_code=500, detail="Failed to get streak")


@router.get("/overview")
def get_overview(authorization: str = Header(default="")):
    """Get dashboard overview stats."""
    try:
        user_id = get_user_id(authorization)
        supabase = get_supabase()

        guides = supabase.table("study_guides").select("id, flashcards").eq("user_id", user_id).execute()
        total_guides = len(guides.data or [])

        total_flashcards = 0
        for g in (guides.data or []):
            fc = g.get("flashcards")
            if isinstance(fc, list):
                total_flashcards += len(fc)

        folders = supabase.table("folders").select("id").eq("user_id", user_id).execute()
        total_folders = len(folders.data or [])

        fc_sessions = supabase.table("study_sessions") \
            .select("metadata") \
            .eq("user_id", user_id) \
            .eq("session_type", "flashcard") \
            .execute()
        cards_studied = 0
        for s in (fc_sessions.data or []):
            meta = s.get("metadata", {})
            if isinstance(meta, dict):
                cards_studied += meta.get("cards_studied", 0)

        quizzes = supabase.table("quiz_attempts") \
            .select("score") \
            .eq("user_id", user_id) \
            .execute()
        avg_quiz = 0
        if quizzes.data:
            avg_quiz = round(sum(q["score"] for q in quizzes.data) / len(quizzes.data))

        streak_result = supabase.table("user_streaks").select("current_streak, longest_streak, last_study_date").eq("user_id", user_id).execute()
        current_streak = 0
        if streak_result.data:
            s = streak_result.data[0]
            last = date.fromisoformat(s["last_study_date"]) if s["last_study_date"] else None
            if last and last >= date.today() - timedelta(days=1):
                current_streak = s["current_streak"]

        today_start = str(date.today()) + "T00:00:00"
        today_sessions = supabase.table("study_sessions") \
            .select("duration_seconds") \
            .eq("user_id", user_id) \
            .gte("started_at", today_start) \
            .execute()
        minutes_today = sum(s.get("duration_seconds", 0) for s in (today_sessions.data or [])) // 60

        return {
            "total_guides": total_guides,
            "total_folders": total_folders,
            "total_flashcards": total_flashcards,
            "cards_studied": cards_studied,
            "avg_quiz_score": avg_quiz,
            "current_streak": current_streak,
            "minutes_today": minutes_today
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to get overview")


@router.post("/log-session")
def log_session(request: LogSessionRequest, authorization: str = Header(default="")):
    """Log a study session and update streak."""
    try:
        user_id = get_user_id(authorization)
        supabase = get_supabase()

        data = {
            "user_id": user_id,
            "session_type": request.session_type,
            "duration_seconds": request.duration_seconds,
            "metadata": request.metadata or {}
        }
        if request.guide_id:
            data["guide_id"] = request.guide_id

        supabase.table("study_sessions").insert(data).execute()
        _update_streak(user_id)

        return {"logged": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging session: {e}")
        raise HTTPException(status_code=500, detail="Failed to log session")


@router.post("/beacon")
async def beacon_session(request: Request):
    """Log a session via navigator.sendBeacon (fires on page unload).
    Parses raw body since sendBeacon may send as text/plain."""
    try:
        body = await request.body()
        data = json.loads(body)

        auth = data.get("authorization", "")
        if not auth:
            return {"logged": False}

        user_id = get_user_id(auth)
        supabase = get_supabase()

        session_type = data.get("session_type", "browse")
        allowed = {"flashcard", "quiz", "read", "timer", "browse"}
        if session_type not in allowed:
            session_type = "browse"

        duration = min(max(int(data.get("duration_seconds", 0)), 0), 86400)

        row = {
            "user_id": user_id,
            "session_type": session_type,
            "duration_seconds": duration,
            "metadata": {}
        }
        guide_id = data.get("guide_id")
        if guide_id and _UUID_RE.match(guide_id):
            row["guide_id"] = guide_id

        supabase.table("study_sessions").insert(row).execute()
        _update_streak(user_id)

        return {"logged": True}
    except Exception as e:
        logger.error(f"Error in beacon session: {e}")
        return {"logged": False}
