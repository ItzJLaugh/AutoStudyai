"""Shared Cordia Tutor session state for the web app and browser side panel."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException

from database import get_supabase


TUTOR_SKILLS = {
    "explain": {
        "label": "Explain",
        "version": 1,
        "available": True,
        "outcome": "Teach the selected material using the student's learning guidance.",
        "complete_when": "The answer is grounded in the selected source and resolves the student's question.",
        "tools": ["read_context"],
        "requires_context": True,
        "confirm": [],
        "instruction": "Explain only from the selected source and make the reasoning easy to follow.",
    },
    "capture": {
        "label": "Capture",
        "version": 1,
        "available": True,
        "outcome": "Read the student-approved active browser page as study material.",
        "complete_when": "The approved page is extracted or a specific access failure is reported.",
        "tools": ["read_page"],
        "requires_context": False,
        "confirm": [],
        "instruction": "Identify the useful study material in the approved browser page without inventing missing content.",
    },
    "build_guide": {
        "label": "Build guide",
        "version": 1,
        "available": True,
        "outcome": "Create a source-grounded study guide in the matching class.",
        "complete_when": "A complete guide with flashcards is saved with its class and source provenance.",
        "tools": ["read_context", "create_guide"],
        "requires_context": True,
        "confirm": [],
        "instruction": "Create a complete study guide from the selected source and preserve its class and provenance.",
    },
    "practice": {
        "label": "Practice",
        "version": 1,
        "available": True,
        "outcome": "Create source-grounded practice problems in the matching class.",
        "complete_when": "A practice guide is saved in the source material's class.",
        "tools": ["read_context", "create_guide"],
        "requires_context": True,
        "confirm": [],
        "instruction": "Create practice problems that test the selected source without introducing unsupported facts.",
    },
    "retain": {
        "label": "Retain",
        "version": 1,
        "available": True,
        "outcome": "Help the student understand and remember missed material.",
        "complete_when": "The missed concept and a usable memory cue are explained from the source.",
        "tools": ["read_context"],
        "requires_context": True,
        "confirm": [],
        "instruction": "Focus on why the answer is correct, why plausible alternatives fail, and what to remember next time.",
    },
    "plan": {
        "label": "Plan",
        "version": 1,
        "available": False,
        "outcome": "Turn course deadlines and study material into a practical study plan.",
        "complete_when": "The plan covers known deadlines without claiming unconfirmed calendar writes.",
        "tools": ["read_context", "read_deadlines"],
        "requires_context": True,
        "confirm": ["calendar_write"],
        "instruction": "Produce a realistic study plan from known deadlines; do not claim calendar changes without confirmation.",
    },
    "find_material": {
        "label": "Find material",
        "version": 1,
        "available": False,
        "outcome": "Locate relevant material in the student-approved browser session.",
        "complete_when": "Relevant sources are identified with their original course locations.",
        "tools": ["navigate", "read_page"],
        "requires_context": False,
        "confirm": [],
        "instruction": "Use only the approved browser session and report exactly which relevant sources were found.",
    },
    "organize": {
        "label": "Organize",
        "version": 1,
        "available": False,
        "outcome": "Place learning material in the appropriate existing class.",
        "complete_when": "The material is assigned once to the correct existing class.",
        "tools": ["read_context", "organize_material"],
        "requires_context": True,
        "confirm": [],
        "instruction": "Organize material by its real course and source; do not create duplicate classes or guides.",
    },
}
DEFAULT_SKILL = "explain"
MAX_SESSION_MESSAGES = 60
BROWSER_TTL_SECONDS = 45
RUN_TTL_SECONDS = 180
TUTOR_SAFETY_POLICY = (
    "Never take graded assessments, submit assignments, change grades, or impersonate the student. "
    "Require explicit confirmation before downloads, calendar changes, external messages, or Canvas writes."
)


def infer_tutor_skill(message: str) -> str:
    text = (message or "").lower()
    if any(term in text for term in ("practice problem", "practice question", "practice guide")):
        return "practice"
    if "guide" in text and any(term in text for term in ("create", "make", "build", "generate", "turn this into")):
        return "build_guide"
    if any(term in text for term in ("flashcard", "retain", "remember this")):
        return "retain"
    if any(term in text for term in ("schedule", "study plan", "calendar", "deadline")):
        return "plan"
    if any(term in text for term in ("find material", "find notes", "look in canvas", "search canvas")):
        return "find_material"
    if any(term in text for term in ("organize", "move this", "classify")):
        return "organize"
    if any(term in text for term in ("capture", "read this page", "read this document")):
        return "capture"
    return DEFAULT_SKILL


def validate_skill(skill: str | None, message: str = "") -> str:
    selected = skill or infer_tutor_skill(message)
    if selected not in TUTOR_SKILLS:
        raise HTTPException(status_code=400, detail="Unknown Tutor skill")
    if not TUTOR_SKILLS[selected]["available"]:
        raise HTTPException(status_code=409, detail=f"{TUTOR_SKILLS[selected]['label']} is not available yet")
    return selected


def tutor_skill_instruction(skill: str | None) -> str:
    return TUTOR_SKILLS.get(skill or DEFAULT_SKILL, TUTOR_SKILLS[DEFAULT_SKILL])["instruction"]


def _owned_session(user_id: str, session_id: str):
    result = (
        get_supabase().table("tutor_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Tutor session not found")
    return result.data[0]


def get_or_create_tutor_session(user_id: str):
    table = get_supabase().table("tutor_sessions")
    result = table.select("*").eq("user_id", user_id).limit(1).execute()
    if result.data:
        return result.data[0]
    created = table.upsert({"user_id": user_id}, on_conflict="user_id").execute()
    if not created.data:
        # A concurrent request may have won the unique-user upsert.
        result = table.select("*").eq("user_id", user_id).limit(1).execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=500, detail="Tutor session could not be created")
    return created.data[0]


def _browser_is_available(row: dict) -> bool:
    if not row.get("browser_available") or not row.get("browser_last_seen_at"):
        return False
    try:
        seen = datetime.fromisoformat(str(row["browser_last_seen_at"]).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - seen).total_seconds() <= BROWSER_TTL_SECONDS
    except (TypeError, ValueError):
        return False


def _run_is_stale(row: dict) -> bool:
    if row.get("status") != "running" or not row.get("run_started_at"):
        return False
    try:
        started = datetime.fromisoformat(str(row["run_started_at"]).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - started).total_seconds() > RUN_TTL_SECONDS
    except (TypeError, ValueError):
        return False


def public_tutor_session(row: dict) -> dict:
    return {
        "id": row["id"],
        "active_skill": row.get("active_skill") or DEFAULT_SKILL,
        "current_goal": row.get("current_goal") or "",
        "active_class_id": row.get("active_class_id"),
        "active_guide_id": row.get("active_guide_id"),
        "conversation_version": row.get("conversation_version") or 0,
        "status": "idle" if _run_is_stale(row) else (row.get("status") or "idle"),
        "messages": row.get("messages") or [],
        "browser_available": _browser_is_available(row),
        "browser_observation": row.get("browser_observation") or {},
        "browser_command": row.get("browser_command") or {},
        "permission_scope": row.get("permission_scope") or [],
        "last_action_result": row.get("last_action_result") or {},
        "skills": [{"id": key, **definition} for key, definition in TUTOR_SKILLS.items()],
        "updated_at": row.get("updated_at"),
    }


def update_browser_context(user_id: str, session_id: str, update: dict):
    row = _owned_session(user_id, session_id)
    payload = {
        "browser_available": bool(update.get("browser_available")),
        "permission_scope": update.get("permission_scope") or ["read_page"],
        "browser_last_seen_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if update.get("browser_observation") is not None:
        payload["browser_observation"] = update["browser_observation"]
    if update.get("last_action_result") is not None:
        payload["last_action_result"] = update["last_action_result"]
        command = row.get("browser_command") or {}
        if command.get("id") == update["last_action_result"].get("command_id"):
            payload["browser_command"] = {
                **command,
                "status": update["last_action_result"].get("status") or "completed",
            }
    result = (
        get_supabase().table("tutor_sessions")
        .update(payload)
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Tutor session not found")
    return result.data[0]


def queue_browser_command(user_id: str, turn: dict, command_type: str, goal: str):
    command = {
        "id": str(uuid4()),
        "type": command_type,
        "goal": goal,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = (
        get_supabase().table("tutor_sessions")
        .update({"browser_command": command})
        .eq("id", turn["id"])
        .eq("user_id", user_id)
        .eq("run_id", turn["run_id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=409, detail="Browser command could not be queued")
    turn.update(result.data[0])
    return command


def update_tutor_skill(user_id: str, session_id: str, skill: str):
    _owned_session(user_id, session_id)
    selected = validate_skill(skill)
    result = (
        get_supabase().table("tutor_sessions")
        .update({
            "active_skill": selected,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", session_id)
        .eq("user_id", user_id)
        .eq("status", "idle")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=409, detail="Wait for Cordia Tutor to finish before changing skills")
    return result.data[0]


def claim_tutor_turn(
    user_id: str,
    session_id: str,
    expected_version: int | None,
    message: str,
    requested_skill: str | None,
    guide_id: str | None = None,
    class_id: str | None = None,
):
    row = _owned_session(user_id, session_id)
    version = row.get("conversation_version") or 0
    if expected_version is not None and expected_version != version:
        raise HTTPException(status_code=409, detail="Tutor conversation changed. Refresh and try again.")
    if row.get("status") == "running":
        if not _run_is_stale(row):
            raise HTTPException(status_code=409, detail="Cordia Tutor is already working on a request.")
        recovered = (
            get_supabase().table("tutor_sessions")
            .update({"status": "idle", "run_id": None, "run_started_at": None})
            .eq("id", session_id)
            .eq("user_id", user_id)
            .eq("run_id", row.get("run_id"))
            .execute()
        )
        if not recovered.data:
            raise HTTPException(status_code=409, detail="Cordia Tutor is already working on a request.")
        row = recovered.data[0]

    skill = validate_skill(requested_skill, message)
    run_id = str(uuid4())
    messages = list(row.get("messages") or [])[-(MAX_SESSION_MESSAGES - 1):]
    messages.append({"role": "user", "text": message})
    payload = {
        "status": "running",
        "run_id": run_id,
        "run_started_at": datetime.now(timezone.utc).isoformat(),
        "active_skill": skill,
        "current_goal": message,
        "active_guide_id": guide_id,
        "active_class_id": class_id,
        "messages": messages,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = (
        get_supabase().table("tutor_sessions")
        .update(payload)
        .eq("id", session_id)
        .eq("user_id", user_id)
        .eq("conversation_version", version)
        .eq("status", "idle")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=409, detail="Cordia Tutor received another request first. Refresh and try again.")
    claimed = result.data[0]
    claimed["run_id"] = run_id
    claimed["active_skill"] = skill
    claimed["conversation_version"] = version
    return claimed


def complete_tutor_turn(user_id: str, turn: dict, response: dict):
    messages = list(turn.get("messages") or [])
    assistant_message = {"role": "ai", "text": response.get("answer") or ""}
    if response.get("source"):
        assistant_message["source"] = response["source"]
    if response.get("guide"):
        assistant_message["guide"] = response["guide"]
    messages.append(assistant_message)
    next_version = (turn.get("conversation_version") or 0) + 1
    action_result = {
        "status": "completed",
        "action": response.get("action") or "answered",
    }
    result = (
        get_supabase().table("tutor_sessions")
        .update({
            "status": "idle",
            "run_id": None,
            "run_started_at": None,
            "messages": messages[-MAX_SESSION_MESSAGES:],
            "conversation_version": next_version,
            "last_action_result": action_result,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", turn["id"])
        .eq("user_id", user_id)
        .eq("run_id", turn["run_id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=409, detail="Tutor response could not be synchronized")
    return result.data[0]


def fail_tutor_turn(user_id: str, turn: dict | None, detail: str):
    if not turn:
        return
    (
        get_supabase().table("tutor_sessions")
        .update({
            "status": "idle",
            "run_id": None,
            "run_started_at": None,
            "last_action_result": {"status": "failed", "error": detail[:500]},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", turn["id"])
        .eq("user_id", user_id)
        .eq("run_id", turn["run_id"])
        .execute()
    )
