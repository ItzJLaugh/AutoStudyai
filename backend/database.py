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
    """Get or create Supabase DB client singleton (service_role — never used for auth operations)."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        if not url or not key:
            logger.error("SUPABASE_URL or Supabase service-role key not set")
            raise ValueError("Supabase credentials not configured")
        _supabase_client = create_client(url, key)
        logger.info("Supabase DB client initialized")
    return _supabase_client


def get_auth_supabase() -> Client:
    """Create one stateless Supabase Auth client for one server operation.

    Supabase clients persist and auto-refresh sessions by default. Reusing one
    process-wide client therefore lets unrelated login, validation, and refresh
    requests overwrite each other's in-memory session. Server auth calls always
    receive their token explicitly, so persistence and automatic refresh belong
    in the browser, not in this shared API process.
    """
    url = os.getenv("SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_KEY")
    )
    if not url or not key:
        raise ValueError("Supabase credentials not configured")
    # This client is already scoped to one operation, so its default in-memory
    # auth storage cannot leak a session into another request. Avoid custom
    # ClientOptions here: supabase-py 2.31 can raise while constructing a sync
    # client because that options object does not expose ``storage``.
    return create_client(url, key)
