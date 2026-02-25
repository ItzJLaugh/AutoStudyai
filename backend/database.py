"""
Supabase database client for AutoStudyAI.
Handles connection to Supabase for user data, folders, and study guides.
"""

import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase_client = None


def get_supabase() -> Client:
    """Get or create Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            logger.error("SUPABASE_URL or SUPABASE_KEY not set")
            raise ValueError("Supabase credentials not configured")
        _supabase_client = create_client(url, key)
        logger.info("Supabase client initialized")
    return _supabase_client
