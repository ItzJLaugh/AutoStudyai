"""Canvas LMS connection and dashboard data through Pipedream Connect."""

import base64
import html
import os
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlsplit

import requests
from fastapi import APIRouter, Header, HTTPException, Response

from auth_utils import get_user_id
from database import get_supabase
from routers.billing import check_usage, record_usage
from routers.stats import learning_profile_for_user
from services.llm import generate_study_guide, study_guide_is_complete, study_guide_to_flashcards
from services.text_processing import chunk_text, clean_text

router = APIRouter(prefix="/canvas", tags=["canvas"])

API_BASE = "https://api.pipedream.com/v1"
REQUIRED_CONFIG = (
    "PIPEDREAM_CLIENT_ID",
    "PIPEDREAM_CLIENT_SECRET",
    "PIPEDREAM_PROJECT_ID",
)
_access_token = None
_access_token_expires_at = 0
AUTO_GUIDE_LIMIT = 1
AUTO_GUIDE_SCAN_LIMIT = 6


def _external_user_id(user_id: str) -> str:
    return f"cordia-classroom:{user_id}"


def _config():
    missing = [name for name in REQUIRED_CONFIG if not os.getenv(name)]
    if missing:
        raise HTTPException(status_code=503, detail="Canvas connections are not configured")
    return {
        "client_id": os.environ["PIPEDREAM_CLIENT_ID"],
        "client_secret": os.environ["PIPEDREAM_CLIENT_SECRET"],
        "project_id": os.environ["PIPEDREAM_PROJECT_ID"],
        "environment": os.getenv("PIPEDREAM_ENVIRONMENT", "production"),
    }


def _request(method: str, url: str, *, headers=None, params=None, json=None, raw=False):
    try:
        response = requests.request(
            method, url, headers=headers, params=params, json=json, timeout=30
        )
        response.raise_for_status()
        return response if raw else (response.json() if response.content else {})
    except (requests.RequestException, ValueError) as exc:
        status = getattr(getattr(exc, "response", None), "status_code", "unavailable")
        raise HTTPException(status_code=502, detail=f"Canvas provider request failed ({status})") from exc


def _developer_token(config: dict) -> str:
    global _access_token, _access_token_expires_at
    if _access_token and _access_token_expires_at > time.time() + 30:
        return _access_token
    result = _request(
        "POST",
        f"{API_BASE}/oauth/token",
        json={
            "grant_type": "client_credentials",
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "scope": "connect:accounts:read connect:accounts:write connect:tokens:create connect:proxy",
        },
    )
    _access_token = result.get("access_token")
    if not _access_token:
        raise HTTPException(status_code=502, detail="Canvas provider returned no access token")
    _access_token_expires_at = time.time() + int(result.get("expires_in") or 3600)
    return _access_token


def _headers(config: dict) -> dict:
    return {
        "Authorization": f"Bearer {_developer_token(config)}",
        "x-pd-environment": config["environment"],
    }


def _canvas_account(user_id: str, config: dict):
    result = _request(
        "GET",
        f"{API_BASE}/connect/{config['project_id']}/accounts",
        headers=_headers(config),
        params={"external_user_id": _external_user_id(user_id), "app": "canvas"},
    )
    accounts = result.get("data") or []
    return next(
        (
            account
            for account in accounts
            if account.get("id") and not account.get("dead") and account.get("healthy", True)
        ),
        None,
    )


def _proxy(path: str, user_id: str, account_id: str, config: dict, *, raw=False):
    encoded_path = base64.urlsafe_b64encode(path.encode()).decode().rstrip("=")
    return _request(
        "GET",
        f"{API_BASE}/connect/{config['project_id']}/proxy/{encoded_path}",
        headers=_headers(config),
        params={"external_user_id": _external_user_id(user_id), "account_id": account_id},
        raw=raw,
    )


def _proxy_get(path: str, user_id: str, account_id: str, config: dict):
    return _proxy(path, user_id, account_id, config)


def _normalize_course(course: dict) -> dict:
    return {
        "id": course.get("id"),
        "name": course.get("name") or course.get("course_code") or "Untitled course",
        "code": course.get("course_code") or "",
        "url": _public_url(course.get("html_url")),
    }


def _public_url(value) -> str:
    value = str(value or "")
    return value if value.startswith(("https://", "http://")) else ""


def _normalize_planner_item(item: dict) -> dict:
    plannable = item.get("plannable") or {}
    submissions = item.get("submissions") if isinstance(item.get("submissions"), dict) else {}
    override = item.get("planner_override") if isinstance(item.get("planner_override"), dict) else {}
    item_type = item.get("plannable_type") or "event"
    return {
        "id": item.get("plannable_id") or item.get("id"),
        "course_id": item.get("course_id") or item.get("context_id"),
        "title": plannable.get("title") or item_type or "Course item",
        "type": item_type,
        "due_at": plannable.get("due_at") or item.get("plannable_date"),
        "url": _public_url(item.get("html_url") or plannable.get("html_url")),
        "completed": bool(submissions.get("submitted") or override.get("marked_complete")),
        # Planner responses often omit the assignment description. The detail
        # endpoint can still supply it when the student asks Cordia to study it.
        "has_study_material": item_type == "assignment" or bool(_plannable_text(plannable)),
    }


def _plannable_text(plannable: dict) -> str:
    raw = next(
        (plannable.get(key) for key in ("description", "body", "details", "message") if plannable.get(key)),
        "",
    )
    plain = re.sub(r"<[^>]+>", " ", html.unescape(str(raw)))
    return re.sub(r"\s+", " ", plain).strip()


def _planner_path(now=None) -> str:
    start = now or datetime.now(timezone.utc)
    return "/api/v1/planner/items?" + urlencode({
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=90)).isoformat(),
        "per_page": 100,
    })


def _study_source(item: dict, user_id: str, account_id: str, config: dict) -> dict:
    course_id = str(item.get("course_id") or "")
    item_id = str(item.get("plannable_id") or item.get("id") or "")
    plannable = item.get("plannable") or {}
    details = plannable
    if item.get("plannable_type") == "assignment" and course_id.isdigit() and item_id.isdigit():
        assignment = _proxy_get(
            f"/api/v1/courses/{course_id}/assignments/{item_id}",
            user_id,
            account_id,
            config,
        )
        if isinstance(assignment, dict):
            details = assignment
    content = _plannable_text(details) or _plannable_text(plannable)
    if len(content) < 50:
        raise HTTPException(status_code=422, detail="This Canvas item has no usable study material")
    return {
        "title": details.get("title") or details.get("name") or plannable.get("title") or "Canvas study guide",
        "content": content,
        "source_url": _public_url(details.get("html_url") or item.get("html_url") or plannable.get("html_url")),
        "external_source_id": _source_id(account_id, item),
    }


def _source_id(account_id: str, item: dict) -> str:
    return ":".join((
        "canvas",
        account_id,
        str(item.get("course_id") or ""),
        str(item.get("plannable_type") or "item"),
        str(item.get("plannable_id") or item.get("id") or ""),
    ))


def _course_source_id(account_id: str, course_id) -> str:
    return f"canvas:{account_id}:course:{course_id}"


def _sync_course_folders(courses: list, user_id: str, account_id: str, db) -> None:
    rows = [
        {
            "user_id": user_id,
            "name": course["name"],
            "external_source_id": _course_source_id(account_id, course["id"]),
        }
        for course in courses
        if course.get("id") is not None
    ]
    if not rows:
        return
    db.table("folders").upsert(
        rows,
        on_conflict="user_id,external_source_id",
    ).execute()


def _folder_id_for_course(db, user_id: str, account_id: str, course_id):
    if course_id is None:
        return None
    result = (
        db.table("folders")
        .select("id")
        .eq("user_id", user_id)
        .eq("external_source_id", _course_source_id(account_id, course_id))
        .limit(1)
        .execute()
    )
    return result.data[0]["id"] if result.data else None


def _auto_guide_candidates(items: list) -> list:
    eligible = [
        item
        for item in items
        if isinstance(item, dict)
        and _normalize_planner_item(item)["type"] == "assignment"
        and not _normalize_planner_item(item)["completed"]
    ]
    return sorted(
        eligible,
        key=lambda item: _normalize_planner_item(item).get("due_at") or "9999",
    )[:AUTO_GUIDE_SCAN_LIMIT]


@router.get("/status")
def canvas_status(authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    config = _config()
    account = _canvas_account(user_id, config)
    return {
        "connected": bool(account),
        "institution": (account or {}).get("name") or "Canvas",
    }


@router.post("/connect")
def connect_canvas(authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    config = _config()
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    result = _request(
        "POST",
        f"{API_BASE}/connect/{config['project_id']}/tokens",
        headers=_headers(config),
        json={
            "external_user_id": _external_user_id(user_id),
            "scope": "connect:accounts:read connect:accounts:write",
            "success_redirect_uri": f"{frontend}/dashboard?canvas=connected",
            "error_redirect_uri": f"{frontend}/dashboard?canvas=error",
        },
    )
    connect_url = result.get("connect_link_url")
    if not connect_url:
        raise HTTPException(status_code=502, detail="Canvas provider returned no connection link")
    separator = "&" if "?" in connect_url else "?"
    return {"connect_url": f"{connect_url}{separator}app=canvas"}


def _dashboard_response(user_id: str, config: dict, account) -> dict:
    if not account:
        return {"connected": False, "courses": [], "items": []}

    courses_path = "/api/v1/courses?" + urlencode({
        "enrollment_state": "active",
        "per_page": 100,
    })
    courses = _proxy_get(courses_path, user_id, account["id"], config)
    items = _proxy_get(_planner_path(), user_id, account["id"], config)
    return {
        "connected": True,
        "institution": account.get("name") or "Canvas",
        "courses": [_normalize_course(course) for course in courses if isinstance(course, dict)],
        "items": [_normalize_planner_item(item) for item in items if isinstance(item, dict)],
    }


@router.get("/dashboard")
def canvas_dashboard(authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    config = _config()
    return _dashboard_response(user_id, config, _canvas_account(user_id, config))


@router.post("/sync")
def canvas_sync(authorization: str = Header(default="")):
    """Refresh Canvas and mirror active courses into the student's Classes."""
    user_id = get_user_id(authorization)
    config = _config()
    account = _canvas_account(user_id, config)
    data = _dashboard_response(user_id, config, account)
    if account:
        _sync_course_folders(data["courses"], user_id, account["id"], get_supabase())
    return data


@router.get("/file/{file_id}")
def canvas_file(file_id: str, authorization: str = Header(default="")):
    if not file_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid Canvas file")
    user_id = get_user_id(authorization)
    config = _config()
    account = _canvas_account(user_id, config)
    if not account:
        raise HTTPException(status_code=409, detail="Connect Canvas first")

    details = _proxy_get(f"/api/v1/files/{file_id}", user_id, account["id"], config)
    download = urlsplit(str(details.get("url") or ""))
    if download.scheme != "https" or not download.netloc:
        raise HTTPException(status_code=502, detail="Canvas returned no download")
    path = download.path + (f"?{download.query}" if download.query else "")
    upstream = _proxy(path, user_id, account["id"], config, raw=True)
    if not upstream.content or len(upstream.content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Canvas file is empty or larger than 20 MB")
    return Response(
        content=upstream.content,
        media_type=details.get("content-type") or upstream.headers.get("content-type"),
    )


@router.get("/study-source")
def canvas_study_source(course_id: str, item_id: str, authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    config = _config()
    account = _canvas_account(user_id, config)
    if not account:
        raise HTTPException(status_code=409, detail="Connect Canvas first")
    items = _proxy_get(_planner_path(), user_id, account["id"], config)
    item = next(
        (
            value for value in items
            if str(value.get("course_id")) == course_id
            and str(value.get("plannable_id") or value.get("id")) == item_id
        ),
        None,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Canvas item not found")
    return _study_source(item, user_id, account["id"], config)


@router.post("/auto-guides")
def canvas_auto_guides(authorization: str = Header(default="")):
    """Create one missing guide from the next useful Canvas assignment."""
    user_id = get_user_id(authorization)
    config = _config()
    account = _canvas_account(user_id, config)
    if not account:
        raise HTTPException(status_code=409, detail="Connect Canvas first")

    usage = check_usage(user_id, "build")
    remaining = min(AUTO_GUIDE_LIMIT, usage["builds_limit"] - usage["builds_used"])
    if remaining <= 0:
        return {"created": [], "count": 0}
    items = _proxy_get(_planner_path(), user_id, account["id"], config)
    candidates = _auto_guide_candidates(items)
    db = get_supabase()
    created = []

    # Canvas can return an entire semester of assignments. Keep the automatic
    # pass fast and inexpensive; students can explicitly build older items.
    for item in candidates:
        external_source_id = _source_id(account["id"], item)
        existing = (
            db.table("study_guides")
            .select("id")
            .eq("user_id", user_id)
            .eq("external_source_id", external_source_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            continue
        try:
            source = _study_source(item, user_id, account["id"], config)
        except HTTPException as error:
            if error.status_code == 422:
                continue
            raise
        chunks = chunk_text(clean_text(source["content"]))
        if not chunks:
            continue
        guide = generate_study_guide(
            chunks,
            learning_guidance=learning_profile_for_user(user_id)["generation_guidance"],
        )
        if not guide or guide.startswith("[Error"):
            raise HTTPException(status_code=502, detail="Automatic guide generation failed")
        if not study_guide_to_flashcards(guide) or not study_guide_is_complete(guide):
            raise HTTPException(status_code=502, detail="Automatic guide generation returned incomplete content")
        saved = db.table("study_guides").upsert(
            {
                "user_id": user_id,
                "title": source["title"],
                "study_guide": guide,
                "source_url": source["source_url"],
                "external_source_id": external_source_id,
                "source_type": "canvas",
                "source_title": source["title"],
                "source_id": external_source_id,
                "folder_id": _folder_id_for_course(
                    db,
                    user_id,
                    account["id"],
                    item.get("course_id"),
                ),
            },
            on_conflict="user_id,external_source_id",
        ).execute()
        if saved.data:
            created.append({"id": saved.data[0]["id"], "title": saved.data[0]["title"]})
            record_usage(user_id, "build", usage)
            usage["builds_used"] += 1
        if len(created) >= remaining:
            break

    return {"created": created, "count": len(created)}
