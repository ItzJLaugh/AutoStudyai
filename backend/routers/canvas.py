"""Canvas LMS connection and dashboard data through Pipedream Connect."""

import base64
import html
import os
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Header, HTTPException

from auth_utils import get_user_id

router = APIRouter(prefix="/canvas", tags=["canvas"])

API_BASE = "https://api.pipedream.com/v1"
REQUIRED_CONFIG = (
    "PIPEDREAM_CLIENT_ID",
    "PIPEDREAM_CLIENT_SECRET",
    "PIPEDREAM_PROJECT_ID",
)
_access_token = None
_access_token_expires_at = 0


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


def _request(method: str, url: str, *, headers=None, params=None, json=None):
    try:
        response = requests.request(
            method, url, headers=headers, params=params, json=json, timeout=30
        )
        response.raise_for_status()
        return response.json() if response.content else {}
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


def _proxy_get(path: str, user_id: str, account_id: str, config: dict):
    encoded_path = base64.urlsafe_b64encode(path.encode()).decode().rstrip("=")
    return _request(
        "GET",
        f"{API_BASE}/connect/{config['project_id']}/proxy/{encoded_path}",
        headers=_headers(config),
        params={"external_user_id": _external_user_id(user_id), "account_id": account_id},
    )


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
    return {
        "id": item.get("plannable_id") or item.get("id"),
        "course_id": item.get("course_id") or item.get("context_id"),
        "title": plannable.get("title") or item.get("plannable_type") or "Course item",
        "type": item.get("plannable_type") or "event",
        "due_at": plannable.get("due_at") or item.get("plannable_date"),
        "url": _public_url(item.get("html_url") or plannable.get("html_url")),
        "completed": bool(submissions.get("submitted") or override.get("marked_complete")),
        "has_study_material": bool(_plannable_text(plannable)),
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


@router.get("/dashboard")
def canvas_dashboard(authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    config = _config()
    account = _canvas_account(user_id, config)
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
    content = _plannable_text(item.get("plannable") or {})
    if len(content) < 50:
        raise HTTPException(status_code=422, detail="This Canvas item has no usable study material")
    plannable = item.get("plannable") or {}
    return {
        "title": plannable.get("title") or plannable.get("name") or "Canvas study guide",
        "content": content,
        "source_url": _public_url(item.get("html_url") or plannable.get("html_url")),
    }
