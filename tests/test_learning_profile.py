import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from routers.stats import _build_learning_profile
from services.llm import answer_question


class LearningProfileTests(unittest.TestCase):
    def test_profile_waits_for_real_evidence(self):
        profile = _build_learning_profile([], [])
        self.assertEqual(profile["status"], "collecting")
        self.assertIsNone(profile["strongest_observed_format"])

    def test_profile_adapts_depth_from_quiz_results(self):
        attempts = [{"guide_id": "g1", "score": score} for score in (55, 65, 70)]
        profile = _build_learning_profile(attempts, [])
        self.assertEqual(profile["status"], "active")
        self.assertIn("foundational", profile["generation_guidance"])

    def test_profile_uses_observed_format_performance(self):
        attempts = [
            {"guide_id": "g1", "score": 92},
            {"guide_id": "g2", "score": 88},
            {"guide_id": "g3", "score": 75},
        ]
        sessions = [
            {"guide_id": "g1", "session_type": "flashcard"},
            {"guide_id": "g2", "session_type": "flashcard"},
            {"guide_id": "g3", "session_type": "read"},
        ]
        profile = _build_learning_profile(attempts, sessions)
        self.assertEqual(profile["strongest_observed_format"], "recall cards")

    def test_tutor_prompt_uses_observed_learning_guidance(self):
        client = MagicMock()
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="Cell division creates new cells."))
        ]
        with patch("services.llm.get_openai_client", return_value=client):
            answer_question(
                "What is cell division?",
                "Cell division creates new cells.",
                learning_guidance="Start with foundational recall.",
            )
        messages = client.chat.completions.create.call_args.kwargs["messages"]
        self.assertIn("Start with foundational recall.", messages[0]["content"])


if __name__ == "__main__":
    unittest.main()
