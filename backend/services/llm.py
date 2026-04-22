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

CRITICAL: ONLY extract facts that are explicitly stated in the content below. NEVER invent, assume, or hallucinate any information. If the content contains no educational material (only navigation, UI elements, or unrelated text), respond with exactly: "NO_EDUCATIONAL_CONTENT"

IGNORE completely:
- Website navigation (Main Page, Contents, menus, sidebars)
- UI elements (Edit, View history, Talk, buttons, links)
- Wikipedia/LMS metadata (contributions, donations, community portal)
- Login/account features, unread message counts, notification badges
- Social media or sharing features
- Table of contents listings, lecture recording lists, file listings
- Any text about how to use the website or LMS

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

        # Detect if AI found no educational content
        if "NO_EDUCATIONAL_CONTENT" in result:
            logger.warning("Notes generation: no educational content detected")
            return ["No educational content found in the captured page. Try capturing a page with actual course material."]

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

def _build_study_guide_prompt(context: str, domain_context: str = "") -> str:
    """Build the study guide generation prompt for a chunk of content."""
    domain_block = ""
    if domain_context:
        domain_block = f"\n[DOMAIN CONTEXT]\n{domain_context}\n\n"

    return f"""Create a study guide Q&A from the text below.
{domain_block}

CRITICAL RULES:
• ONLY use information that is explicitly stated in the text below.
• NEVER invent, assume, or hallucinate any facts, terms, or answers.
• If the text contains no educational content (e.g., only navigation menus, UI elements, or unrelated text), respond with exactly: "NO_EDUCATIONAL_CONTENT"
• Every answer MUST be directly supported by the text provided.
• NEVER generate a question where the answer is "no additional information is provided" or similar — if the text doesn't explain a term, skip it.
• IGNORE these non-educational sections entirely — do NOT generate questions from them:
  - References, citations, bibliographies, footnotes, ISBNs, DOIs
  - "See also", "Further reading", "External links" sections
  - Author names, publication dates, journal names, and book titles that are citations (not the subject being taught)
  - Navigation elements, categories, tags, sidebar links
  - Lists of names, terms, or entities without substantive explanation — only ask about a named item if the text provides meaningful detail (definition, role, contribution, context, or relationship)

Step 1 — Identify every single testable item in the text. Testable items include:
• Named terms and their definitions
• Named entities (people, places, works, organisms, events, theories, laws)
• Classifications, categories, periods, or taxonomies and what distinguishes them
• Cause-and-effect relationships (why something happens or happened)
• Processes, procedures, methods, or sequences of steps
• Comparisons or contrasts between related items
• Significance — why something matters, its impact or implications
• Key facts a student would need to know for an exam on this subject

Step 2 — Write questions following these rules:

CONSOLIDATE identification details: When multiple facts describe ONE entity (e.g., a person's name, role, and dates; an artwork's title, medium, date, and dimensions; a compound's name, formula, and properties), write 2-4 questions that ask to identify or describe that entity — separate questions for each detail.
  GOOD (4 trivial questions about one item):
    Q: What material is X made of?
    Q: What is the height of X?
    Q: Where was X found?
    Q: When was X created?
  BAD (1 consolidated question):
    Q: Identify X — its origin, date, material, and dimensions.
    A: [All details in one answer]

SEPARATE distinct concepts: When the text covers multiple distinct aspects of a topic (e.g., causes vs. symptoms vs. treatment; structure vs. function; characteristics of Period A vs. Period B), write a separate question for each aspect.

FULL COVERAGE: Every named entity, concept, and key term in the text MUST appear in at least one question. After drafting all questions, re-scan the text to check for anything you missed.

INCLUDE HIGHER-ORDER QUESTIONS where supported by the text:
  • "Why" questions (causes, reasons, explanations)
  • "How" questions (processes, mechanisms, relationships)
  • Significance questions (why something is important or notable)
  • Comparison questions (how two or more related items differ)
  • Classification questions (what are the types/periods/categories)

Do NOT skip any item. Do NOT stop until every identified item has been asked about.

{context}

FORMAT:
Q1: [question]
A1: [answer in 1-3 sentences]

Continue until every item is covered."""


def _postprocess_study_guide(raw_result: str, start_index: int = 1) -> tuple:
    """Post-process study guide output: truncate answers and renumber Q&A pairs.
    Returns (processed_text, next_index)."""
    import re
    lines = raw_result.split('\n')
    processed_lines = []
    current_q_num = start_index

    for line in lines:
        line = line.strip()
        if not line:
            processed_lines.append('')
            continue

        # Renumber question lines
        q_match = re.match(r'^Q\d+:\s*(.*)', line)
        if q_match:
            processed_lines.append(f"Q{current_q_num}: {q_match.group(1)}")
            continue

        # Renumber and truncate answer lines
        a_match = re.match(r'^A\d+:\s*(.*)', line)
        if a_match:
            answer = a_match.group(1)
            sentences = answer.split('. ')
            if len(sentences) > 3:
                answer = '. '.join(sentences[:3]) + '.'
            if len(answer) > 350:
                answer = answer[:347] + '...'
            processed_lines.append(f"A{current_q_num}: {answer}")
            current_q_num += 1
            continue

        processed_lines.append(line)

    return '\n'.join(processed_lines), current_q_num


def generate_study_guide(chunks: List[str], has_images: bool = False, domain: Optional[str] = None) -> str:
    """
    Generate a comprehensive study guide with AI-generated questions and answers.
    Uses chunked generation: splits content into ~8000-char batches and makes
    a separate LLM call per batch, then merges and renumbers all Q&A pairs.

    When has_images is True, uses gpt-4o instead of gpt-4o-mini for better
    comprehension of image-described content.

    When domain is set, injects domain-specific terminology and context to
    steer vocabulary and focus without changing the core prompt rules.
    """
    client = get_openai_client()
    if not client:
        return "[Error: OpenAI API key not configured]"

    # Group chunks into batches of ~8000 chars each (works for both XML slides
    # and regular text — matching the batch size that produced 92 Q&A for 59 slides)
    MAX_BATCH_CHARS = 8000
    batches = []
    current_batch = []
    current_len = 0

    for chunk in chunks:
        chunk_len = len(chunk)
        if current_len + chunk_len > MAX_BATCH_CHARS and current_batch:
            batches.append('\n\n'.join(current_batch))
            current_batch = [chunk]
            current_len = chunk_len
        else:
            current_batch.append(chunk)
            current_len += chunk_len

    if current_batch:
        batches.append('\n\n'.join(current_batch))

    # Single batch: use original single-call path
    if len(batches) <= 1:
        context = batches[0] if batches else '\n\n'.join(chunks)
        context = context[:30000]
        batches = [context]

    logger.info(
        f"Study guide: {len(chunks)} chunks, "
        f"{len(batches)} batch(es), batch_chars=[{', '.join(str(len(b)) for b in batches)}]"
    )

    # Load domain context once (empty string if no domain)
    domain_context = ""
    if domain:
        from domains import get_study_guide_context
        domain_context = get_study_guide_context(domain)
        if domain_context:
            logger.info(f"Study guide using domain context: {domain}")

    all_results = []
    for i, batch_text in enumerate(batches):
        prompt = _build_study_guide_prompt(batch_text[:30000], domain_context=domain_context)
        try:
            # Use gpt-4o when images present or when input is small enough
            # that the cost difference is negligible — gpt-4o is more thorough
            # at exhaustive coverage than mini
            model = "gpt-4o" if (has_images or len(batch_text) < 10000) else "gpt-4o-mini"
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an exhaustive study guide generator. You MUST cover every single named entity, concept, and key term in the text — no exceptions. After generating questions, re-read the source text and add questions for anything you missed. Stopping early or skipping items is a failure."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=12000,
                temperature=0.1,
            )
            result = response.choices[0].message.content.strip()
            # Detect if AI found no educational content (anti-hallucination guard)
            if "NO_EDUCATIONAL_CONTENT" in result:
                logger.warning(f"Study guide batch {i+1}: no educational content detected, skipping")
                continue
            all_results.append(result)
            import re as _re_log
            q_count = len(_re_log.findall(r'^Q\d+:', result, _re_log.MULTILINE))
            logger.info(f"Study guide batch {i+1}/{len(batches)} complete — {q_count} Q&A pairs, {len(batch_text)} chars input")
        except Exception as e:
            logger.error(f"Error in study guide batch {i+1}: {e}")
            if hasattr(e, 'status_code') and e.status_code == 429:
                return "[Error: OpenAI rate limit reached. Please try again later.]"

    if not all_results:
        return "[Error generating study guide]"

    # Merge all batch results and renumber sequentially
    merged_parts = []
    next_index = 1
    for raw in all_results:
        processed, next_index = _postprocess_study_guide(raw, start_index=next_index)
        merged_parts.append(processed)

    return '\n\n'.join(merged_parts)


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


def generate_practice_questions(content: str) -> list:
    """
    Generate practice questions (MCQ and multi-select) from any academic content.
    Generic version — not nursing/NCLEX-specific.
    Returns a list of question dicts with type, stem, options, correct_indices, rationale.
    """
    import re as _re
    import json as _json

    client = get_openai_client()
    if not client:
        return []

    context = content[:25000]

    # Count Q&A pairs in the study guide for target count
    qa_matches = _re.findall(r'^Q\d+:', context, _re.MULTILINE)
    n_pairs = len(qa_matches)

    if n_pairs > 0:
        count_instruction = (
            f"The study guide below contains {n_pairs} Q&A pairs (Q1/A1, Q2/A2, …). "
            f"Each pair represents ONE distinct concept. "
            f"Generate exactly one practice question per Q&A pair — that means a minimum of {n_pairs} questions. "
            f"Do NOT merge multiple Q&A pairs into a single question."
        )
    else:
        count_instruction = (
            "Identify every key concept, definition, process, cause-effect relationship, "
            "and factual detail in the content. "
            "Generate one practice question per identified item — do NOT group multiple items into one question."
        )

    prompt = f"""Create practice exam questions from the academic study material below.

{count_instruction}

QUESTION RULES:
- Mix types: ~60% MCQ (4 options, 1 correct) and ~40% multi-select (5 options, 2-4 correct)
- Each question should test understanding and application, not just memorization
- Distractors must be plausible and relevant to the topic, not obviously wrong
- ALL options (correct and incorrect) MUST be similar in length and level of detail — never make the correct answer longer or more specific than the distractors
- Multi-select stems must end with "(Select all that apply)"
- Rationale: 2-3 sentences — explain why correct answers are right AND why key distractors are wrong

CONTENT:
{context}

Return ONLY a valid JSON array — no markdown, no extra text:
[
  {{
    "type": "mcq",
    "stem": "Which of the following best describes...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_indices": [1],
    "rationale": "Option B is correct because... Option A is incorrect because..."
  }},
  {{
    "type": "sata",
    "stem": "Which of the following are characteristics of...? (Select all that apply)",
    "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
    "correct_indices": [0, 2, 3],
    "rationale": "Options A, C, and D are correct because... Options B and E are incorrect because..."
  }}
]

Do NOT stop until every Q&A pair has a corresponding practice question."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert exam question writer. "
                        "You write one practice question for each Q&A pair in the study material — never fewer. "
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

        # Parse JSON, recover if truncated
        try:
            questions = _json.loads(raw)
        except _json.JSONDecodeError:
            last_complete = raw.rfind('},')
            if last_complete > 0:
                try:
                    questions = _json.loads(raw[:last_complete + 1] + ']')
                except _json.JSONDecodeError:
                    logger.error("Could not recover partial practice questions JSON")
                    return []
            else:
                logger.error("Practice questions response was not valid JSON")
                return []

        # Validate structure
        validated = []
        for q in questions:
            if not all(k in q for k in ("type", "stem", "options", "correct_indices", "rationale")):
                continue
            if q["type"] not in ("mcq", "sata"):
                continue
            validated.append(q)
        return validated

    except Exception as e:
        logger.error(f"Error generating practice questions: {e}")
        return []


def generate_exam_questions(content: str, domain_id: str, exam_mode_id: str) -> list:
    """
    Generate domain-specific exam questions using few-shot examples from domain config.
    Generalized version that works for any domain with exam modes (NAPLEX, Bar, etc.).
    Returns a list of question dicts with type, stem, options, correct_indices, rationale.
    """
    import re as _re
    import json as _json
    from domains import get_domain, get_exam_examples

    client = get_openai_client()
    if not client:
        return []

    domain = get_domain(domain_id)
    if not domain:
        logger.warning(f"Unknown domain '{domain_id}', falling back to generic practice questions")
        return generate_practice_questions(content)

    # Find the exam mode config
    exam_mode = None
    for mode in domain.get('exam_modes', []):
        if mode['id'] == exam_mode_id:
            exam_mode = mode
            break
    if not exam_mode:
        logger.warning(f"Unknown exam mode '{exam_mode_id}' for domain '{domain_id}', falling back")
        return generate_practice_questions(content)

    context = content[:25000]

    # Count Q&A pairs for target count
    qa_matches = _re.findall(r'^Q\d+:', context, _re.MULTILINE)
    n_pairs = len(qa_matches)

    if n_pairs > 0:
        count_instruction = (
            f"The study guide below contains {n_pairs} Q&A pairs (Q1/A1, Q2/A2, …). "
            f"Each pair represents ONE distinct concept. "
            f"Generate exactly one exam question per Q&A pair — that means a minimum of {n_pairs} questions. "
            f"Do NOT merge multiple Q&A pairs into a single question."
        )
    else:
        count_instruction = (
            "Identify every key concept, definition, process, and factual detail in the content. "
            "Generate one exam question per identified item — do NOT group multiple items into one question."
        )

    # Build few-shot examples block from domain config
    examples = get_exam_examples(domain_id, exam_mode_id)
    examples_block = ""
    if examples:
        examples_json = _json.dumps(examples[:2], indent=2)
        examples_block = f"\nHere are example questions in the correct style:\n{examples_json}\n\nGenerate questions in a similar style and format.\n"

    prompt = f"""Create {exam_mode['display_name']} practice exam questions from the study material below.

{count_instruction}

QUESTION RULES:
- Mix types: ~60% MCQ (4 options, 1 correct) and ~40% multi-select (5 options, 2-4 correct)
- Each question should test understanding and application, not just memorization
- Distractors must be plausible and relevant to the topic, not obviously wrong
- ALL options (correct and incorrect) MUST be similar in length and level of detail — never make the correct answer longer or more specific than the distractors
- Multi-select stems must end with "(Select all that apply)"
- Rationale: 2-3 sentences — explain why correct answers are right AND why key distractors are wrong
{examples_block}
CONTENT:
{context}

Return ONLY a valid JSON array — no markdown, no extra text:
[
  {{
    "type": "mcq",
    "stem": "...",
    "options": ["A", "B", "C", "D"],
    "correct_indices": [1],
    "rationale": "..."
  }}
]

Do NOT stop until every Q&A pair has a corresponding exam question."""

    system_persona = exam_mode.get('system_persona',
        f"You are an expert {domain['display_name']} exam question writer.")

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"{system_persona} "
                        "You write one exam question for each Q&A pair in the study material — never fewer. "
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

        # Parse JSON, recover if truncated
        try:
            questions = _json.loads(raw)
        except _json.JSONDecodeError:
            last_complete = raw.rfind('},')
            if last_complete > 0:
                try:
                    questions = _json.loads(raw[:last_complete + 1] + ']')
                except _json.JSONDecodeError:
                    logger.error(f"Could not recover partial {exam_mode_id} exam JSON")
                    return []
            else:
                logger.error(f"{exam_mode_id} exam response was not valid JSON")
                return []

        # Validate structure
        validated = []
        for q in questions:
            if not all(k in q for k in ("type", "stem", "options", "correct_indices", "rationale")):
                continue
            if q["type"] not in ("mcq", "sata"):
                continue
            validated.append(q)

        logger.info(f"Generated {len(validated)} {exam_mode_id} exam questions for domain {domain_id}")
        return validated

    except Exception as e:
        logger.error(f"Error generating {exam_mode_id} exam questions: {e}")
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
        system_prompt = (
            "You are a study assistant. Your answer MUST be grounded in the exact wording of the provided context — "
            "do not substitute synonyms, paraphrase, or introduce information not present in the context. "
            "Quote or closely follow the source text, then provide a concrete, relatable real-world example "
            "that illustrates the concept as it is described in the context."
        )
        max_tokens = 300
    elif mode == "detailed":
        system_prompt = (
            "You are a study assistant. Begin your answer by reproducing the exact relevant definition or explanation "
            "from the provided context word for word. Then expand on it in 3-7 sentences using only details, "
            "relationships, and implications that are explicitly stated in the context. "
            "Do not paraphrase, substitute synonyms, or add information not present in the context."
        )
        max_tokens = 700
    else:  # short
        system_prompt = (
            "You are a study assistant. Answer using the exact wording from the provided context. "
            "Do not paraphrase or substitute synonyms. Keep it to 1-2 sentences drawn directly from the context."
        )
        max_tokens = 200

    prompt = f"""Context:
{context[:25000]}

Question: {question}

Answer based on the context above:"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
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


def analyze_images_for_slides(images: list, slide_texts: dict = None) -> dict:
    """
    Analyze images using GPT-4o vision. Returns {slide_index: description}.

    Args:
        images: list of dicts with keys: data (base64), slide_index (int|None),
                context (str|None), alt (str|None)
        slide_texts: {slide_index: text_content} for providing context to vision

    Returns:
        dict mapping slide_index (or sequential int for page images) to description text
    """
    client = get_openai_client()
    if not client:
        logger.error("No OpenAI client for vision analysis")
        return {}

    if not images:
        return {}

    slide_texts = slide_texts or {}
    results = {}

    # Group images by slide_index for batching
    grouped = {}
    page_idx = 1000  # High offset for non-slide images
    for img in images:
        idx = img.get("slide_index")
        if idx is None:
            idx = page_idx
            page_idx += 1
        if idx not in grouped:
            grouped[idx] = []
        grouped[idx].append(img)

    for slide_idx, slide_images in grouped.items():
        try:
            # Build context from slide text if available
            text_context = ""
            if slide_idx < 1000 and slide_idx in slide_texts:
                text_content = slide_texts[slide_idx]
                if isinstance(text_content, list):
                    text_context = "\n".join(text_content)
                else:
                    text_context = str(text_content)
            elif slide_images[0].get("context"):
                text_context = slide_images[0]["context"]

            # Build the message content with text prompt + image(s)
            content_parts = [
                {
                    "type": "text",
                    "text": (
                        "You are analyzing educational content. "
                        "Describe ALL factual and educational information visible in this image: "
                        "labels, values, relationships, processes, data in charts/tables, "
                        "diagram structures, and key concepts shown visually. "
                        "Do NOT describe decorative elements, backgrounds, or layout. "
                        "Be specific and thorough — every piece of information matters for study questions."
                        + (f"\n\nSlide text for context:\n{text_context[:1000]}" if text_context else "")
                    )
                }
            ]

            for img in slide_images[:3]:  # Max 3 images per slide
                data_url = img["data"]
                # Ensure it's a proper data URL
                if not data_url.startswith("data:"):
                    data_url = "data:image/jpeg;base64," + data_url
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": data_url, "detail": "low"}
                })

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": content_parts}],
                max_tokens=500,
                temperature=0.2,
            )

            description = response.choices[0].message.content.strip()

            # Skip if the description adds nothing beyond what's in the text
            if text_context and len(description) < 20:
                logger.info(f"Skipping image for slide {slide_idx} — no new info")
                continue

            results[slide_idx] = description
            logger.info(f"Vision analysis for slide {slide_idx}: {len(description)} chars")

        except Exception as e:
            logger.error(f"Vision analysis failed for slide {slide_idx}: {e}")
            continue

    return results
