"""
Shared auth utility for AutoStudyAI.
Verifies Supabase JWT by calling supabase.auth.get_user().
"""

import logging
from fastapi import HTTPException
from database import get_supabase

logger = logging.getLogger(__name__)


def get_user_id(authorization: str) -> str:
    """
    Extract and verify user ID from a Supabase Bearer token.
    Delegates validation to Supabase — handles any JWT algorithm.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization[7:].strip()
    if not token or len(token) > 4096:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        supabase = get_supabase()
        result = supabase.auth.get_user(token)
        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return result.user.id
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
