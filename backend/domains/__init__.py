"""
Domain registry for academic discipline-specific study guide generation.
Loads domain configs from JSON files in this directory at import time.
Adding a new domain = adding one JSON file. No code changes needed.
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

DOMAINS: dict = {}       # {domain_id: full config dict}
DOMAIN_LIST: list = []   # [{id, display_name, description, exam_modes}] for API


def _load_domains():
    """Load all .json domain config files from this directory."""
    domain_dir = os.path.dirname(__file__)
    for fname in sorted(os.listdir(domain_dir)):
        if not fname.endswith('.json'):
            continue
        path = os.path.join(domain_dir, fname)
        try:
            with open(path, encoding='utf-8') as f:
                config = json.load(f)
            domain_id = config.get('id')
            if not domain_id:
                logger.warning(f"Domain file {fname} missing 'id' field, skipping")
                continue
            DOMAINS[domain_id] = config
            DOMAIN_LIST.append({
                'id': domain_id,
                'display_name': config.get('display_name', domain_id),
                'description': config.get('description', ''),
                'exam_modes': config.get('exam_modes', [])
            })
            logger.info(f"Loaded domain: {domain_id} ({fname})")
        except Exception as e:
            logger.error(f"Failed to load domain file {fname}: {e}")


_load_domains()


def get_domain(domain_id: str) -> Optional[dict]:
    """Get full domain config by ID. Returns None if not found."""
    return DOMAINS.get(domain_id)


def get_study_guide_context(domain_id: str) -> str:
    """
    Build the domain context block to prepend to study guide prompts.
    Returns empty string for unknown domains (graceful fallback).
    Only returns the study_guide_context sentence — no terminology list,
    since the AI only works with captured content (not web search).
    """
    d = DOMAINS.get(domain_id)
    if not d:
        return ""
    return d.get('study_guide_context', '')


def get_exam_examples(domain_id: str, exam_mode_id: str) -> list:
    """
    Get few-shot example questions for a domain's exam mode.
    Returns up to 3 examples. Returns [] if domain or mode not found.
    """
    d = DOMAINS.get(domain_id)
    if not d:
        return []
    return d.get('example_questions', [])[:3]
