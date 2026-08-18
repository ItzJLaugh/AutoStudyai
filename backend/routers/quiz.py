"""
Quiz router for AutoStudyAI.
Generates MCQ quizzes from study guide Q&A pairs and tracks attempts.
"""

import re
import json
import random
import logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import List
from database import get_supabase
from services.llm import get_openai_client
from auth_utils import get_user_id

_UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quiz", tags=["quiz"])


def _validate_uuid(value: str, name: str = "ID") -> str:
    if not value or not _UUID_RE.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {name}")
    return value


class QuizAnswer(BaseModel):
    """A single quiz answer with validation."""
    question_index: int = Field(..., ge=0, le=100)
    selected_index: int = Field(..., ge=0, le=10)
    is_correct: bool = False


class QuizSubmission(BaseModel):
    answers: List[QuizAnswer] = Field(..., max_length=50)


def _parse_qa_pairs(text: str) -> list:
    """Parse Question 1: ... Answer 1: ... format into list of {question, answer}."""
    pairs = []
    lines = text.split('\n')
    current_q = None
    for line in lines:
        line = line.strip()
        q_match = re.match(r'^Q(\d+):\s*(.+)', line)
        a_match = re.match(r'^A(\d+):\s*(.+)', line)
        if q_match:
            current_q = q_match.group(2).strip()
        elif a_match and current_q:
            pairs.append({"question": current_q, "answer": a_match.group(2).strip()})
            current_q = None
    return pairs


@router.get("/{guide_id}/generate")
def generate_quiz(guide_id: str, authorization: str = Header(default="")):
    """Generate MCQ quiz from study guide Q&A pairs."""
    try:
        _validate_uuid(guide_id, "guide ID")
        user_id = get_user_id(authorization)
        supabase = get_supabase()

        result = supabase.table("study_guides") \
            .select("study_guide, quiz_questions") \
            .eq("id", guide_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Guide not found")

        # Return cached questions if already generated for this guide
        cached = result.data[0].get("quiz_questions")
        if cached:
            return {"questions": cached}

        study_guide_text = result.data[0].get("study_guide", "")
        if not study_guide_text:
            raise HTTPException(status_code=400, detail="No study guide content to generate quiz from")

        qa_pairs = _parse_qa_pairs(study_guide_text)
        if not qa_pairs:
            raise HTTPException(status_code=400, detail="No Q&A pairs found in study guide")

        qa_pairs = qa_pairs[:50]

        client = get_openai_client()
        if not client:
            raise HTTPException(status_code=500, detail="AI service unavailable")

        qa_text = "\n".join(f"Q: {p['question']}\nA: {p['answer']}" for p in qa_pairs)

        prompt = f"""For each Q&A pair below, generate exactly 3 WRONG answer choices.
Return as JSON array where each element has:
- "distractors": [wrong1, wrong2, wrong3]

CRITICAL RULES — follow every one:
1. Each distractor MUST match the correct answer in sentence structure, length (within ±20% of the correct answer's character count), and level of detail. If the correct answer is a full sentence, every distractor must be a full sentence. If the correct answer is a short phrase, every distractor must be a short phrase. The correct answer must NEVER stand out by being longer, more specific, or more thorough than the distractors.
2. Distractors must be plausible — wrong in a subtle, meaningful way (wrong mechanism, wrong value, wrong direction, wrong agent, wrong sequence). A student who didn't study should reasonably be tempted to choose them. They must NEVER be obviously absurd or off-topic.
3. Never use "None of the above", "All of the above", "Both A and B", or any placeholder/filler text.
4. Ground every distractor in the same domain/topic as the correct answer — no random facts from unrelated subjects.
5. Distractors must be clearly factually incorrect — they cannot also be true statements about the topic.

{qa_text}

Return ONLY a JSON array, no other text:"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Generate quiz distractors. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.5,
        )

        raw = response.choices[0].message.content.strip()
        json_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not json_match:
            raise HTTPException(status_code=500, detail="Failed to generate quiz options")

        distractors_list = json.loads(json_match.group())

        questions = []
        for i, pair in enumerate(qa_pairs):
            if i >= len(distractors_list):
                break
            options = [pair["answer"]] + distractors_list[i].get("distractors", ["Option B", "Option C", "Option D"])[:3]
            correct_answer = pair["answer"]
            random.shuffle(options)
            correct_index = options.index(correct_answer)
            questions.append({
                "question": pair["question"],
                "options": options,
                "correct_index": correct_index
            })

        # Cache generated questions so future Retain clicks load instantly
        try:
            supabase.table("study_guides") \
                .update({"quiz_questions": questions}) \
                .eq("id", guide_id) \
                .eq("user_id", user_id) \
                .execute()
        except Exception as cache_err:
            logger.warning(f"Failed to cache quiz questions for guide {guide_id}: {cache_err}")

        return {"questions": questions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")


@router.post("/{guide_id}/submit")
def submit_quiz(guide_id: str, submission: QuizSubmission, authorization: str = Header(default="")):
    """Submit quiz answers and save results."""
    try:
        _validate_uuid(guide_id, "guide ID")
        user_id = get_user_id(authorization)
        supabase = get_supabase()

        total = len(submission.answers)
        if total == 0:
            raise HTTPException(status_code=400, detail="No answers submitted")
        correct = sum(1 for a in submission.answers if a.is_correct)
        score = round((correct / total) * 100)

        supabase.table("quiz_attempts").insert({
            "user_id": user_id,
            "guide_id": guide_id,
            "score": score,
            "total_questions": total,
            "correct_answers": correct,
            "answers": [a.model_dump() for a in submission.answers]
        }).execute()

        # Log study session
        supabase.table("study_sessions").insert({
            "user_id": user_id,
            "guide_id": guide_id,
            "session_type": "quiz",
            "duration_seconds": 0,
            "metadata": {"score": score, "total": total, "correct": correct}
        }).execute()

        # Update streak
        from routers.stats import _update_streak
        _update_streak(user_id)

        return {"score": score, "total": total, "correct": correct}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit quiz")


@router.get("/{guide_id}/history")
def quiz_history(guide_id: str, authorization: str = Header(default="")):
    """Get quiz attempt history for a guide."""
    try:
        _validate_uuid(guide_id, "guide ID")
        user_id = get_user_id(authorization)
        supabase = get_supabase()

        result = supabase.table("quiz_attempts") \
            .select("id, score, total_questions, correct_answers, completed_at") \
            .eq("user_id", user_id) \
            .eq("guide_id", guide_id) \
            .order("completed_at", desc=True) \
            .limit(10) \
            .execute()

        return {"attempts": result.data or []}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quiz history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get quiz history")
