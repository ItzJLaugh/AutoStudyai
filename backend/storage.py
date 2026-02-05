"""
In-memory storage for content and generated materials.
"""

from typing import Optional, Dict, Any
from datetime import datetime


class InMemoryStorage:
    """Simple in-memory storage for ingested content."""

    def __init__(self):
        self.contents: Dict[str, Dict[str, Any]] = {}

    def save_content(
        self,
        content_id: str,
        content: str,
        page_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Save content with optional metadata.

        Args:
            content_id: Unique identifier for the content
            content: The raw text content
            page_url: Source URL of the content
            metadata: Optional dict with content_type, is_slideshow, etc.
        """
        self.contents[content_id] = {
            "content": content,
            "page_url": page_url,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }

    def get_content(self, content_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve content by ID.

        Args:
            content_id: The content identifier

        Returns:
            Content dict or None if not found
        """
        return self.contents.get(content_id)

    def delete_content(self, content_id: str) -> bool:
        """
        Delete content by ID.

        Args:
            content_id: The content identifier

        Returns:
            True if deleted, False if not found
        """
        if content_id in self.contents:
            del self.contents[content_id]
            return True
        return False

    def clear(self) -> None:
        """Clear all stored content."""
        self.contents.clear()

    def count(self) -> int:
        """Return number of stored items."""
        return len(self.contents)
