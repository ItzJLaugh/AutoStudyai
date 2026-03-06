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
    Identifies every term, concept, definition, and clinical fact and writes
    one question per identified item — no numeric targets.
    """
    client = get_openai_client()
    if not client:
        return "[Error: OpenAI API key not configured]"

    context = '\n\n'.join(chunks)[:30000]

    prompt = f"""Create a study guide Q&A from the text below.

Step 1 — Identify every single testable item in the text:
• Named terms and their definitions
• Drug names, mechanisms, dosages, side effects
• Conditions and their signs/symptoms/causes/treatments
• Lab values and what they indicate
• Procedures and how/when they are performed
• Classifications and their members
• Cause-and-effect relationships
• Any other specific fact a student must know

Step 2 — Write exactly ONE question for each item identified above.
Do NOT group multiple items into one question.
Do NOT skip any item.
Do NOT stop until every identified item has been asked about.

EXAMPLE — if a slide contains:
  "Hypokalemia: K+ < 3.5. Causes: vomiting, diuretics. Symptoms: muscle weakness, arrhythmia. Treatment: oral or IV KCl."
You should produce FOUR questions:
  Q: What is the definition of hypokalemia?
  Q: What are common causes of hypokalemia?
  Q: What are the symptoms of hypokalemia?
  Q: How is hypokalemia treated?
NOT one question that asks "describe hypokalemia."

{context}

FORMAT:
Q1: [question]
A1: [answer in 1-2 sentences]

Continue until every item is covered."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an exhaustive study guide generator. Never stop until every fact in the text has been turned into a question."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=12000,
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


def generate_nclex_questions(content: str) -> list:
    """
    Generate NCLEX-style clinical scenario questions (MCQ and SATA) from content.
    Generates one question per Q&A pair found in the study guide, so the student
    encounters every concept from the study material in NCLEX format.
    Returns a list of question dicts with type, stem, options, correct_indices, rationale.
    """
    import re as _re
    import json as _json

    client = get_openai_client()
    if not client:
        return []

    context = content[:25000]

    # Count Q&A pairs already identified in the study guide so we can give
    # GPT-4o an explicit target instead of letting it cluster into themes.
    qa_matches = _re.findall(r'^Q\d+:', context, _re.MULTILINE)
    n_pairs = len(qa_matches)

    if n_pairs > 0:
        count_instruction = (
            f"The study guide below contains {n_pairs} Q&A pairs (Q1/A1, Q2/A2, …). "
            f"Each pair represents ONE distinct clinical concept. "
            f"Generate exactly one NCLEX question per Q&A pair — that means a minimum of {n_pairs} questions. "
            f"Do NOT merge multiple Q&A pairs into a single question."
        )
    else:
        count_instruction = (
            "Identify every clinical concept, condition, medication, lab value, and procedure in the content. "
            "Generate one NCLEX question per identified item — do NOT group multiple items into one question."
        )

    prompt = f"""Create NCLEX-style practice questions from the nursing study material below.

{count_instruction}

QUESTION RULES:
- Mix types: ~60% MCQ (4 options, 1 correct) and ~40% SATA (5 options, 2-4 correct)
- Each question opens with a clinical scenario ("A nurse is caring for...", "A client presents with...", "The nurse is assessing...")
- Test clinical reasoning and application, not memorization
- Distractors must be plausible nursing errors, not obviously wrong
- SATA stems must end with "(Select all that apply)"
- Rationale: 2-3 sentences — explain why correct answers are right AND why key distractors are wrong

CONTENT:
{context}

Return ONLY a valid JSON array — no markdown, no extra text:
[
  {{
    "type": "mcq",
    "stem": "A 72-year-old client with chronic kidney disease has a serum potassium of 6.2 mEq/L. Which finding would the nurse expect on the ECG?",
    "options": ["Prolonged PR interval", "Peaked T waves", "ST depression", "Widened QRS only"],
    "correct_indices": [1],
    "rationale": "Hyperkalemia causes peaked T waves on ECG — the earliest cardiac sign. Prolonged PR and widened QRS appear later. ST depression is associated with hypokalemia or ischemia, not hyperkalemia."
  }},
  {{
    "type": "sata",
    "stem": "A nurse is planning care for a client in sickle cell crisis. Which interventions should be included? (Select all that apply)",
    "options": ["Administer IV fluids as ordered", "Apply cold packs to painful areas", "Encourage high fluid intake", "Administer oxygen if SpO2 < 95%", "Place client in a cool room"],
    "correct_indices": [0, 2, 3],
    "rationale": "Hydration and supplemental oxygen are priorities — they reduce sickling and correct hypoxia. Cold and cool environments cause vasoconstriction, worsening the crisis; warm compresses are used instead."
  }}
]

Do NOT stop until every Q&A pair has a corresponding NCLEX question."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert NCLEX question writer with 20 years of nursing education experience. "
                        "You write one NCLEX question for each Q&A pair in the study material — never fewer. "
                        "Never merge multiple Q&A pairs into one question. "
                        "Always return valid JSON only — no markdown, no extra text."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=16000,
            temperature=0.6,
        )
        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        # Attempt to parse; if truncated mid-JSON, recover completed objects
        try:
            questions = _json.loads(raw)
        except _json.JSONDecodeError:
            last_complete = raw.rfind('},')
            if last_complete > 0:
                try:
                    questions = _json.loads(raw[:last_complete + 1] + ']')
                except _json.JSONDecodeError:
                    logger.error("Could not recover partial NCLEX JSON")
                    return []
            else:
                logger.error("NCLEX response was not valid JSON")
                return []

        # Validate basic structure
        validated = []
        for q in questions:
            if not all(k in q for k in ("type", "stem", "options", "correct_indices", "rationale")):
                continue
            if q["type"] not in ("mcq", "sata"):
                continue
            validated.append(q)
        return validated

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
        max_tokens = 200

    prompt = f"""Context:
{context[:25000]}

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


def extract_image_text(image_data: str) -> str:
    """
    Extract text and describe visual content (diagrams, graphs, charts, illustrations)
    from a base64-encoded image using GPT-4o Vision.
    Returns empty string for decorative/irrelevant images.
    """
    client = get_openai_client()
    if not client:
        return ''
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data, "detail": "low"}
                    },
                    {
                        "type": "text",
                        "text": (
                            "Analyze this image from a lecture slide. "
                            "Extract all visible text. "
                            "If it contains a diagram, flowchart, or illustration: describe every labeled component, arrow, and relationship. "
                            "If it contains a graph or chart: describe the title, axes, values, and key trends. "
                            "If it contains a table: transcribe the headers and data. "
                            "If it is purely decorative (logo, background, photo with no educational content): respond only with DECORATIVE. "
                            "Be thorough — your output will be used to create study questions."
                        )
                    }
                ]
            }],
            max_tokens=600,
            temperature=0.1,
        )
        result = response.choices[0].message.content.strip()
        return '' if result == 'DECORATIVE' else result
    except Exception as e:
        logger.error(f"Error extracting image text: {e}")
        return ''
