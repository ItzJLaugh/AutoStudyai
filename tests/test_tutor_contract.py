import sys
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from main import app


class TutorContractTests(unittest.TestCase):
    client = TestClient(app)
    guide_id = "11111111-1111-4111-8111-111111111111"

    def guide_db(self, created=None):
        table = MagicMock()
        table.select.return_value = table
        table.eq.return_value = table
        table.insert.return_value = table
        guide = {
            "id": self.guide_id,
            "title": "Biology",
            "folder_id": "folder-1",
            "study_guide": "Q1: What is mitosis?\nA1: Cell division.",
            "notes": None,
            "source_url": "https://canvas.example/biology",
        }
        responses = [MagicMock(data=[guide])]
        if created:
            responses.append(MagicMock(data=[created]))
        table.execute.side_effect = responses
        db = MagicMock()
        db.table.return_value = table
        return db, table

    @patch("main._learning_guidance", return_value="")
    @patch("main.record_usage")
    @patch("main.check_usage", return_value={"used": 0})
    @patch("main.answer_question", return_value="Mitosis is cell division.")
    @patch("main.get_user_id", return_value="student-1")
    def test_tutor_grounds_answer_in_owned_guide(self, _auth, answer, _usage, _record, _guidance):
        db, _table = self.guide_db()
        with patch("main.get_supabase", return_value=db):
            response = self.client.post(
                "/chat",
                headers={"Authorization": "Bearer test"},
                json={"question": "Explain mitosis", "content": "untrusted client text", "guide_id": self.guide_id},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "Mitosis is cell division.")
        self.assertEqual(answer.call_args.kwargs["context"], "Q1: What is mitosis?\nA1: Cell division.")

    @patch("main._learning_guidance", return_value="")
    @patch("main.record_usage")
    @patch("main.check_usage", return_value={"used": 0})
    @patch("main.generate_practice_guide", return_value="Q1: Apply mitosis.\nA1: Cell division.")
    @patch("main.get_user_id", return_value="student-1")
    def test_tutor_creates_practice_guide_in_source_class(self, _auth, _generate, _usage, record, _guidance):
        created = {
            "id": "22222222-2222-4222-8222-222222222222",
            "title": "Biology — Practice Problems",
            "folder_id": "folder-1",
        }
        db, table = self.guide_db(created)
        with patch("main.get_supabase", return_value=db):
            response = self.client.post(
                "/chat",
                headers={"Authorization": "Bearer test"},
                json={"question": "Create practice problems from this guide", "content": "", "guide_id": self.guide_id},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["action"], "created_guide")
        payload = table.insert.call_args.args[0]
        self.assertEqual(payload["folder_id"], "folder-1")
        self.assertEqual(payload["source_guide_id"], self.guide_id)
        self.assertEqual(payload["flashcards"], [{"front": "Apply mitosis.", "back": "Cell division."}])
        record.assert_called_once()


if __name__ == "__main__":
    unittest.main()
