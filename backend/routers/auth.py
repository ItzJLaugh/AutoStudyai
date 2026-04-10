"""
Authentication router for AutoStudyAI.
Handles user signup, login, and session management via Supabase Auth.
"""

import re
import os
import time
import logging
import requests as http_requests
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Request, Header
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory brute force protection — separate counters for auth vs refresh
# so that automatic token refresh calls don't eat into the login quota.
_auth_attempts = defaultdict(list)    # login/signup: IP -> [timestamps]
_refresh_attempts = defaultdict(list) # token refresh: IP -> [timestamps]
MAX_AUTH_ATTEMPTS = 10
MAX_REFRESH_ATTEMPTS = 30
WINDOW_SECONDS = 300  # 5 minutes
MAX_TRACKED_IPS = 10_000


def _check_rate_limit(request: Request, store: defaultdict, max_attempts: int):
    """Block IPs that exceed max_attempts within WINDOW_SECONDS."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Evict stale IPs if tracker is too large
    if len(store) > MAX_TRACKED_IPS:
        stale_ips = [k for k, v in store.items() if not v or now - v[-1] > WINDOW_SECONDS]
        for k in stale_ips:
            del store[k]
        if len(store) > MAX_TRACKED_IPS:
            sorted_ips = sorted(store.keys(), key=lambda k: store[k][-1] if store[k] else 0)
            for k in sorted_ips[:len(sorted_ips) // 2]:
                del store[k]

    store[ip] = [t for t in store[ip] if now - t < WINDOW_SECONDS]
    if len(store[ip]) >= max_attempts:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    store[ip].append(now)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r'[0-9]', v):
            raise ValueError("Password must contain a number")
        return v

    @field_validator("email")
    @classmethod
    def validate_email_length(cls, v):
        if len(v) > 254:
            raise ValueError("Email too long")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) > 200:
                raise ValueError("Name too long")
            return v if v else None
        return v

    @field_validator("university", "major")
    @classmethod
    def validate_optional_field(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) > 300:
                raise ValueError("Field value too long")
            return v if v else None
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not v or len(v) > 128:
            raise ValueError("Invalid password")
        return v


class AuthResponse(BaseModel):
    user_id: str
    email: str
    access_token: str
    refresh_token: str = ""


@router.post("/signup", response_model=AuthResponse)
def signup(request: SignupRequest, req: Request):
    """Create a new user account. Rate limited."""
    _check_rate_limit(req, _auth_attempts, MAX_AUTH_ATTEMPTS)
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })

        if not result.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        # Store profile data in user_profiles table for Make.com integration
        try:
            profile_data = {
                "id": result.user.id,
                "email": request.email,
                "name": request.name,
                "university": request.university,
                "major": request.major,
            }
            supabase.table("user_profiles").insert(profile_data).execute()
        except Exception as profile_err:
            # Don't fail signup if profile insert fails — user is already created
            logger.warning(f"Failed to save user profile: {profile_err}")

        # Notify Make.com webhook with new user data
        try:
            make_url = os.getenv("MAKE_WEBHOOK_URL", "")
            make_api_key = os.getenv("MAKE_API_KEY", "")
            if make_url:
                http_requests.post(
                    make_url,
                    json={
                        "name": request.name,
                        "email": request.email,
                        "university": request.university,
                        "major": request.major,
                    },
                    headers={"x-make-apikey": make_api_key} if make_api_key else {},
                    timeout=5,
                )
        except Exception as make_err:
            # Don't fail signup if Make.com call fails
            logger.warning(f"Failed to notify Make.com: {make_err}")

        return AuthResponse(
            user_id=result.user.id,
            email=result.user.email,
            access_token=result.session.access_token if result.session else "",
            refresh_token=result.session.refresh_token if result.session else ""
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail="Signup failed. Email may already be in use.")


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, req: Request):
    """Login with email and password. Rate limited."""
    _check_rate_limit(req, _auth_attempts, MAX_AUTH_ATTEMPTS)
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return AuthResponse(
            user_id=result.user.id,
            email=result.user.email,
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid email or password")


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(request: RefreshRequest, req: Request):
    """Refresh an expired access token. Rate limited."""
    _check_rate_limit(req, _refresh_attempts, MAX_REFRESH_ATTEMPTS)
    try:
        supabase = get_supabase()
        result = supabase.auth.refresh_session(request.refresh_token)

        if not result.user or not result.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        return AuthResponse(
            user_id=result.user.id,
            email=result.user.email,
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh error: {e}")
        raise HTTPException(status_code=401, detail="Failed to refresh token")


@router.get("/me")
def get_current_user(authorization: str = Header(default="")):
    """Get current user info from access token."""
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="No token provided")

        # Validate format before extracting token
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")

        token = authorization[7:].strip()
        if not token or len(token) > 4096:
            raise HTTPException(status_code=401, detail="Invalid token")

        supabase = get_supabase()
        result = supabase.auth.get_user(token)

        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {
            "user_id": result.user.id,
            "email": result.user.email
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth check error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
