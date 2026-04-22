"""
In-memory storage for content and generated materials.
Includes size limits and auto-expiry to prevent memory exhaustion.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import threading


class InMemoryStorage:
    """In-memory storage with size limits and TTL expiry."""

    MAX_ITEMS = 500          # Max stored content items
    MAX_CONTENT_SIZE = 500_000   # 500KB per item
    TTL_MINUTES = 120        # Expire content after 2 hours

    def __init__(self):
        self.contents: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def _evict_expired(self):
        """Remove expired entries."""
        now = datetime.utcnow()
        expired = [
            k for k, v in self.contents.items()
            if now - datetime.fromisoformat(v["created_at"]) > timedelta(minutes=self.TTL_MINUTES)
        ]
        for k in expired:
            del self.contents[k]

    def save_content(
        self,
        content_id: str,
        content: str,
        page_url: str,
        metadata: Optional[Dict[str, Any]] = None,
        images: Optional[list] = None
    ) -> None:
        """Save content with size and count limits."""
        # Enforce content size limit
        if len(content) > self.MAX_CONTENT_SIZE:
            content = content[:self.MAX_CONTENT_SIZE]

        with self._lock:
            self._evict_expired()

            # Enforce max items — evict oldest if full
            if len(self.contents) >= self.MAX_ITEMS:
                oldest_key = min(self.contents, key=lambda k: self.contents[k]["created_at"])
                del self.contents[oldest_key]

            self.contents[content_id] = {
                "content": content,
                "page_url": page_url,
                "metadata": metadata or {},
                "images": images or [],
                "created_at": datetime.utcnow().isoformat()
            }

    def get_content(self, content_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve content by ID (returns None if expired or not found)."""
        with self._lock:
            self._evict_expired()
            return self.contents.get(content_id)

    def delete_content(self, content_id: str) -> bool:
        """
        Delete content by ID.

        Args:
            content_id: The content identifier

        Returns:
            True if deleted, False if not found
        """
        with self._lock:
            if content_id in self.contents:
                del self.contents[content_id]
                return True
            return False

    def clear(self) -> None:
        """Clear all stored content."""
        with self._lock:
            self.contents.clear()

    def count(self) -> int:
        """Return number of stored items."""
        with self._lock:
            return len(self.contents)
