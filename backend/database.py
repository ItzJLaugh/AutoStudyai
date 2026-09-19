"""
Supabase database client for AutoStudyAI.
Handles connection to Supabase for user data, folders, and study guides.
"""

import os
import logging
from supabase import create_client, Client
from supabase.lib.client_options import SyncClientOptions

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
    # OAuth starts on the API but finishes in the browser callback. Use the
    # implicit flow so Supabase returns the access and refresh tokens in the URL
    # fragment; a server-only PKCE verifier would be lost between requests.
    # SyncClientOptions is required here: the base ClientOptions type does not
    # provide the synchronous storage field expected by supabase-py 2.31.
    return create_client(
        url,
        key,
        options=SyncClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            flow_type="implicit",
        ),
    )
