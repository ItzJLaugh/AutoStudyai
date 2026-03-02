"""
LLM service for AI-powered study material generation.
Uses OpenAI GPT-4o for intelligent content processing.
"""

import os
import logging
from typing import List, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

logger = logging.getLogger(__name__)


def get_openai_client() -> Optional[OpenAI]:
    """Get configured OpenAI client."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        logger.error("OPENAI_API_KEY not set")
        return None
    return OpenAI(api_key=api_key)


def generate_notes_ai(content: str, max_notes: int = 25) -> List[str]:
    """
    Use AI to extract key notes from educational content.
    Returns a list of concise, important points.
    """
    client = get_openai_client()
    if not client:
        return _generate_notes_fallback(content)

    prompt = f"""Analyze the following educational content and extract the most important key points as study notes.

IGNORE completely:
- Website navigation (Main Page, Contents, menus, sidebars)
- UI elements (Edit, View history, Talk, buttons, links)
- Wikipedia metadata (contributions, donations, community portal)
- Login/account features
- Social media or sharing features
- Table of contents listings
- Any text about how to use the website

FOCUS ONLY on actual educational/academic content that would be on an exam.

Rules:
1. Extract {max_notes} or fewer key points
2. Each note should be concise (1-2 sentences max)
3. Focus on facts, definitions, concepts, and important details
4. Prioritize information that would appear on an exam
5. Format each note as a standalone bullet point

Content:
{content[:20000]}

Return ONLY the bullet points, one per line, starting with "- ":"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.3,
        )
        result = response.choices[0].message.content.strip()

        # Parse the response into individual notes
        notes = []
        for line in result.split('\n'):
            line = line.strip()
            if line.startswith('- '):
                notes.append(line[2:].strip())
            elif line.startswith('• '):
                notes.append(line[2:].strip())
            elif line and not line.startswith('#'):
                notes.append(line)

        return notes[:max_notes]

    except Exception as e:
        logger.error(f"Error generating notes with AI: {e}")
        return _generate_notes_fallback(content)


def _generate_notes_fallback(content: str) -> List[str]:
    """Fallback note extraction without AI."""
    notes = []
    for line in content.split('\n'):
        line = line.strip()
        if len(line) > 20 and len(line) < 300:
            if not any(skip in line.lower() for skip in ['click', 'menu', 'navigation', 'http']):
                notes.append(line)
    return notes[:15]


def generate_study_guide(chunks: List[str]) -> str:
    """
    Generate a comprehensive study guide with AI-generated questions and answers.
    """
    client = get_openai_client()
    if not client:
        return "[Error: OpenAI API key not configured]"

    context = '\n\n'.join(chunks)[:20000]

    prompt = f"""Generate Q&A pairs from this text to cover ALL key concepts.

Create one question for EACH distinct concept, term, definition, medication, condition, procedure, or system covered. Do NOT use a fixed number — generate as many as needed for complete coverage of the material (aim for at least 1 question per slide or section).

{context}

FORMAT:
Q1: [question]
A1: [short answer]

RULES:
- Cover every distinct topic — do not skip any
- Answers: 1-2 sentences max"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Quiz generator. Short answers only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=8000,
            temperature=0.1,
        )
        raw_result = response.choices[0].message.content.strip()

        # POST-PROCESS: Force short answers by truncating
        lines = raw_result.split('\n')
        processed_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                processed_lines.append('')
                continue
            # If it's an answer line (starts with A followed by number)
            if line.startswith('A') and len(line) > 1 and (line[1].isdigit() or line[1] == ':'):
                # Find the colon and get the answer part
                colon_idx = line.find(':')
                if colon_idx > 0:
                    prefix = line[:colon_idx+1]
                    answer = line[colon_idx+1:].strip()
                    # Allow up to 2 sentences
                    sentences = answer.split('. ')
                    if len(sentences) > 2:
                        answer = '. '.join(sentences[:2]) + '.'
                    if len(answer) > 220:
                        answer = answer[:217] + '...'
                    processed_lines.append(f"{prefix} {answer}")
                else:
                    processed_lines.append(line)
            else:
                processed_lines.append(line)

        return '\n'.join(processed_lines)

    except Exception as e:
        logger.error(f"Error generating study guide: {e}")
        if hasattr(e, 'status_code') and e.status_code == 429:
            return "[Error: OpenAI rate limit reached. Please try again later.]"
        return f"[Error generating study guide: {e}]"


def generate_nclex_questions(content: str, num_questions: int = 10) -> list:
    """
    Generate NCLEX-style clinical scenario questions (MCQ and SATA) from content.
    Returns a list of question dicts with type, stem, options, correct_indices, rationale.
    """
    client = get_openai_client()
    if not client:
        return []

    context = content[:25000]

    # Scale question count with content length
    content_len = len(context)
    if content_len < 5000:
        num_questions = min(num_questions, 8)
    elif content_len < 12000:
        num_questions = min(num_questions, 15)
    else:
        num_questions = min(num_questions, 20)

    prompt = f"""Generate {num_questions} NCLEX-style practice questions from the nursing/medical content below.
Mix question types: roughly 60% MCQ (4 options, exactly 1 correct) and 40% SATA (5 options, 2-4 correct).

REQUIREMENTS:
- Each question must open with a realistic clinical scenario ("A nurse is caring for...", "A client presents with...", "The nurse is assessing...")
- Test clinical reasoning and application, not just memorization
- Distractors must be plausible common nursing errors, not obviously wrong
- SATA stems must end with "(Select all that apply)"
- Rationale must explain why the correct answer(s) are right AND briefly why key distractors are wrong

CONTENT:
{context}

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {{
    "type": "mcq",
    "stem": "A 72-year-old client with chronic kidney disease has a serum potassium of 6.2 mEq/L. Which finding would the nurse expect on the ECG?",
    "options": ["Prolonged PR interval", "Peaked T waves", "ST depression", "Widened QRS only"],
    "correct_indices": [1],
    "rationale": "Hyperkalemia causes peaked (tall, narrow) T waves on ECG, which is often the earliest cardiac manifestation. Prolonged PR interval and widened QRS occur later. ST depression is associated with hypokalemia or ischemia, not hyperkalemia."
  }},
  {{
    "type": "sata",
    "stem": "A nurse is planning care for a client in sickle cell crisis. Which interventions should the nurse include? (Select all that apply)",
    "options": ["Administer IV fluids as ordered", "Apply cold packs to painful areas", "Encourage high fluid intake", "Administer oxygen if SpO2 < 95%", "Place client in a cool room"],
    "correct_indices": [0, 2, 3],
    "rationale": "Hydration (IV and oral) dilutes sickled cells and improves flow. Supplemental oxygen corrects hypoxia that triggers sickling. Cold causes vasoconstriction and worsens crisis — warm compresses are used instead. Cool rooms can trigger vasospasm and should be avoided."
  }}
]"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert NCLEX question writer with 20 years of nursing education experience. "
                        "You write questions that follow NCSBN Clinical Judgment Measurement Model standards. "
                        "Always return valid JSON only — no markdown, no extra text."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=6000,
            temperature=0.6,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        import json as _json
        questions = _json.loads(raw)
        # Validate basic structure
        validated = []
        for q in questions:
            if not all(k in q for k in ("type", "stem", "options", "correct_indices", "rationale")):
                continue
            if q["type"] not in ("mcq", "sata"):
                continue
            validated.append(q)
        return validated[:num_questions]

    except Exception as e:
        logger.error(f"Error generating NCLEX questions: {e}")
        return []


def generate_flashcards(chunks: List[str], max_cards: int = 15) -> List[dict]:
    """
    Generate flashcards from content.
    Returns list of {front: question, back: answer} dictionaries.
    """
    client = get_openai_client()
    if not client:
        return []

    context = '\n\n'.join(chunks)[:10000]

    prompt = f"""Create {max_cards} flashcards from this educational content.

IGNORE completely:
- Website navigation, menus, UI elements
- Wikipedia/website metadata (edit, history, talk pages)
- Login/sharing/social features
- Table of contents or structural elements

FOCUS ONLY on actual educational content.

Each flashcard should:
1. Have a clear, specific question on the front
2. Have a concise answer (1-2 sentences) on the back
3. Test one concept at a time
4. Be useful for quick review and memorization
5. NEVER ask about website features or navigation

Content:
{context}

Format your response EXACTLY like this (use these exact markers):
FRONT: [Question]
BACK: [Answer]

FRONT: [Question]
BACK: [Answer]

(continue for all flashcards)"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
            temperature=0.4,
        )
        result = response.choices[0].message.content.strip()

        # Parse flashcards
        flashcards = []
        current_front = None

        for line in result.split('\n'):
            line = line.strip()
            if line.upper().startswith('FRONT:'):
                current_front = line[6:].strip()
            elif line.upper().startswith('BACK:') and current_front:
                flashcards.append({
                    'front': current_front,
                    'back': line[5:].strip()
                })
                current_front = None

        return flashcards[:max_cards]

    except Exception as e:
        logger.error(f"Error generating flashcards: {e}")
        return []


def answer_question(question: str, context: str, mode: str = "short") -> str:
    """
    Answer a question using the provided context.
    Modes: short, detailed, example
    """
    client = get_openai_client()
    if not client:
        return "[Error: OpenAI API key not configured]"

    if mode == "example":
        system_prompt = "You are a helpful tutor. Provide a concrete, real-world example that illustrates the answer to the question. Make it relatable and easy to understand."
        max_tokens = 300
    elif mode == "detailed":
        system_prompt = "You are a helpful tutor. Provide a detailed, step-by-step explanation. Break down complex concepts and ensure thorough understanding."
        max_tokens = 500
    else:  # short
        system_prompt = "You are a helpful tutor. Provide a brief, direct answer using only the information in the context. Keep it concise (1-2 sentences)."
        max_tokens = 150

    prompt = f"""Context:
{context[:6000]}

Question: {question}

Answer based on the context above:"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.5,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"Error answering question: {e}")
        return f"[Error: {e}]"


def summarize_for_slideshow(slides: List[dict]) -> str:
    """
    Summarize slideshow content into study material.
    """
    client = get_openai_client()
    if not client:
        return ""

    # Format slides for the prompt
    slides_text = ""
    for i, slide in enumerate(slides, 1):
        slides_text += f"\n--- Slide {i}: {slide.get('title', 'Untitled')} ---\n"
        slides_text += '\n'.join(slide.get('content', []))

    prompt = f"""Summarize this slideshow presentation into comprehensive study notes.

{slides_text[:8000]}

Create:
1. A brief overview (2-3 sentences)
2. Key points from each slide
3. Important terms and definitions
4. Connections between concepts

Format as organized notes with clear sections."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"Error summarizing slideshow: {e}")
        return ""


# Legacy function names for backwards compatibility
def generate_notes(chunks: List[str]) -> List[str]:
    """Legacy wrapper for generate_notes_ai."""
    content = '\n\n'.join(chunks)
    return generate_notes_ai(content)


def generate_questions_from_notes(notes: List[str]) -> List[str]:
    """Legacy function - now handled by generate_study_guide."""
    return [f"What is {note[:50]}...?" for note in notes[:10] if len(note) > 10]
