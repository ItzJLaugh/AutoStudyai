"""
Text processing utilities for content extraction and cleaning.
Handles LMS content, slideshows, and general educational material.
"""

import re
from typing import List, Tuple

# Navigation and UI elements to filter out (case-insensitive matching)
LMS_NAVIGATION_PATTERNS = {
    # Canvas LMS
    "dashboard", "inbox", "history", "account", "courses", "calendar", "help",
    "modules", "home", "announcements", "assignments", "discussions", "people",
    "quizzes", "grades", "files", "pages", "syllabus", "outcomes", "rubrics",
    "collaborations", "conferences", "settings",

    # Blackboard
    "course content", "course tools", "my grades", "discussion board",
    "groups", "tools", "course menu",

    # Moodle
    "site home", "site pages", "my courses", "participants", "badges",
    "competencies", "reports",

    # Wikipedia
    "main page", "contents", "current events", "random article", "about wikipedia",
    "contact us", "donate", "contribute", "community portal", "recent changes",
    "upload file", "what links here", "related changes", "special pages",
    "permanent link", "page information", "cite this page", "wikidata item",
    "download as pdf", "printable version", "in other projects", "wikimedia commons",
    "languages", "edit source", "view history", "talk", "article", "read",
    "move to sidebar", "hide", "toggle", "from wikipedia", "free encyclopedia",
    "jump to navigation", "jump to search", "main menu", "personal tools",
    "namespaces", "variants", "views", "more", "search wikipedia",

    # Common UI elements
    "previous", "next", "submit", "save", "cancel", "close", "menu",
    "navigation", "breadcrumb", "footer", "header", "sidebar",
    "click here", "read more", "learn more", "view all",
    "links to an external site", "download", "upload", "print",
    "share this", "bookmark", "subscribe", "follow us", "social media",
    "table of contents", "show", "hide", "expand", "collapse",

    # Video/Media players
    "panopto", "kaltura", "youtube", "vimeo", "play", "pause", "volume",
    "full screen", "captions", "transcript",

    # Zoom/Virtual
    "zoom", "meeting id", "passcode", "join meeting", "webex", "teams",

    # Generic website elements
    "skip to content", "accessibility", "privacy policy", "terms of use",
    "copyright", "all rights reserved", "cookie", "sign out", "log out",
    "sign in", "log in", "register", "create account", "forgot password",
    "newsletter", "subscribe", "unsubscribe", "contact us", "about us",
    "feedback", "report", "flag", "share", "tweet", "like", "comment"
}

# Patterns that indicate slideshow/presentation content
SLIDESHOW_INDICATORS = [
    r"slide\s*\d+",
    r"page\s*\d+\s*of\s*\d+",
    r"^\d+\s*/\s*\d+$",  # "1 / 10" format
    r"presentation",
    r"powerpoint",
    r"\.pptx?",
    r"google\s*slides",
]

# Content section headers that indicate educational content
CONTENT_HEADERS = [
    "learning objectives", "objectives", "goals", "overview", "introduction",
    "summary", "key points", "key concepts", "main ideas", "takeaways",
    "chapter", "section", "module", "unit", "lesson", "topic",
    "definition", "example", "practice", "exercise", "activity",
    "important", "note", "remember", "tip", "warning", "caution"
]


def is_navigation_text(text: str) -> bool:
    """Check if text is likely navigation/UI element."""
    text_lower = text.lower().strip()

    # Too short to be meaningful content
    if len(text_lower) < 3:
        return True

    # Check against navigation patterns
    for pattern in LMS_NAVIGATION_PATTERNS:
        if pattern in text_lower:
            # But allow if it's part of a longer educational sentence
            if len(text_lower) > len(pattern) + 20:
                continue
            return True

    # Check for common non-content patterns
    if re.match(r'^[\d\s\-\./]+$', text_lower):  # Just numbers/dates
        return True
    if re.match(r'^(mon|tue|wed|thu|fri|sat|sun)', text_lower):  # Day names alone
        return True
    if text_lower.startswith('http') or text_lower.startswith('www'):  # URLs
        return True

    return False


def is_slideshow_content(text: str) -> Tuple[bool, str]:
    """
    Detect if content appears to be from a slideshow/presentation.
    Returns (is_slideshow, detected_type).
    """
    text_lower = text.lower()

    for pattern in SLIDESHOW_INDICATORS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return True, "slideshow"

    # Check for slide-like structure (short blocks separated by gaps)
    lines = text.split('\n')
    short_blocks = sum(1 for line in lines if 5 < len(line.strip()) < 100)
    if short_blocks > len(lines) * 0.7 and len(lines) > 5:
        return True, "presentation_style"

    return False, ""


def extract_slideshow_content(text: str) -> List[dict]:
    """
    Extract content from slideshow-formatted text.
    Returns list of slides with title and content.
    """
    slides = []
    current_slide = {"title": "", "content": []}

    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect slide boundaries
        if re.match(r'^slide\s*\d+', line, re.IGNORECASE):
            if current_slide["content"]:
                slides.append(current_slide)
            current_slide = {"title": "", "content": []}
            continue

        # First non-empty line after slide marker is title
        if not current_slide["title"] and len(line) < 100:
            current_slide["title"] = line
        else:
            if not is_navigation_text(line):
                current_slide["content"].append(line)

    # Don't forget last slide
    if current_slide["content"]:
        slides.append(current_slide)

    return slides


def clean_text(text: str) -> str:
    """
    Clean and filter text content, removing navigation and UI elements.
    Preserves educational content structure.
    """
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines = []

    # Track if we've found content section
    in_content_section = False

    for line in lines:
        line = line.strip()

        if not line:
            continue

        # Check for content headers
        line_lower = line.lower()
        if any(header in line_lower for header in CONTENT_HEADERS):
            in_content_section = True

        # Skip navigation elements
        if is_navigation_text(line):
            continue

        # Skip very short lines unless they're headers
        if len(line) < 5 and not line.endswith(':'):
            continue

        # Skip lines that are just punctuation or special characters
        if re.match(r'^[\W\d]+$', line):
            continue

        cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)


def chunk_text(text: str, max_length: int = 1500) -> List[str]:
    """
    Split text into chunks for processing, respecting sentence boundaries.
    Optimized for educational content.
    """
    if not text:
        return []

    # Split by paragraph first, then by sentence
    paragraphs = re.split(r'\n\s*\n', text)
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If paragraph fits, add to current chunk
        if len(current_chunk) + len(para) + 2 <= max_length:
            current_chunk += ("\n\n" if current_chunk else "") + para
        else:
            # Save current chunk if exists
            if current_chunk:
                chunks.append(current_chunk.strip())

            # If paragraph itself is too long, split by sentences
            if len(para) > max_length:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                current_chunk = ""
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) + 1 <= max_length:
                        current_chunk += (" " if current_chunk else "") + sentence
                    else:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        current_chunk = sentence
            else:
                current_chunk = para

    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def format_slideshow_text(slides: List[dict]) -> str:
    """
    Format extracted slides into structured text without AI summarization.
    Preserves all slide content so nothing is lost to compression.
    """
    parts = []
    for i, slide in enumerate(slides, 1):
        title = slide.get('title', '')
        content = slide.get('content', [])
        if title:
            parts.append(f"=== Slide {i}: {title} ===")
        if content:
            parts.extend(content)
        parts.append('')  # blank line between slides
    return '\n'.join(parts)


def extract_key_terms(text: str) -> List[str]:
    """
    Extract potential key terms and concepts from text.
    Looks for capitalized phrases, bold/emphasized text, and defined terms.
    """
    terms = set()

    # Capitalized phrases (potential proper nouns/key terms)
    caps_pattern = r'\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b'
    for match in re.finditer(caps_pattern, text):
        term = match.group(1)
        # Filter out common words and too short terms
        if len(term) > 3 and term.lower() not in {'the', 'this', 'that', 'these', 'those'}:
            terms.add(term)

    # Terms in quotes or parentheses (often definitions)
    quoted_pattern = r'["\']([^"\']+)["\']|\(([^)]+)\)'
    for match in re.finditer(quoted_pattern, text):
        term = match.group(1) or match.group(2)
        if term and 3 < len(term) < 50:
            terms.add(term.strip())

    # Terms followed by "is defined as", "means", "refers to"
    definition_pattern = r'(\b[A-Za-z][\w\s]+?)\s+(?:is defined as|means|refers to|is called)'
    for match in re.finditer(definition_pattern, text, re.IGNORECASE):
        term = match.group(1).strip()
        if 3 < len(term) < 50:
            terms.add(term)

    return list(terms)
