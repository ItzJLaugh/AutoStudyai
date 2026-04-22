"""
Supabase database client for AutoStudyAI.
Handles connection to Supabase for user data, folders, and study guides.
"""

import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase_client = None
_supabase_auth_client = None


def get_supabase() -> Client:
    """Get or create Supabase DB client singleton (service_role — never used for auth operations)."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            logger.error("SUPABASE_URL or SUPABASE_KEY not set")
            raise ValueError("Supabase credentials not configured")
        _supabase_client = create_client(url, key)
        logger.info("Supabase DB client initialized")
    return _supabase_client


def get_auth_supabase() -> Client:
    """Get or create a separate Supabase client used only for JWT validation.
    Kept separate so auth.get_user() calls never modify the DB client's session state."""
    global _supabase_auth_client
    if _supabase_auth_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Supabase credentials not configured")
        _supabase_auth_client = create_client(url, key)
        logger.info("Supabase auth client initialized")
    return _supabase_auth_client
