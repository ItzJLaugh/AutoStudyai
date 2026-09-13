import sys
from pathlib import Path
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from schemas import GenerateRequest
from services.llm import parse_educational_selection
from main import app


class UniversalCaptureContractTests(unittest.TestCase):
    client = TestClient(app)

    def test_generate_request_carries_reviewed_content_without_server_state(self):
        request = GenerateRequest(content="Cells divide through mitosis.")
        self.assertEqual(request.content, "Cells divide through mitosis.")

    def test_selection_parser_fails_closed_and_assigns_stable_ids(self):
        self.assertEqual(parse_educational_selection('{"is_educational": false}')["sections"], [])
        selected = parse_educational_selection('{"is_educational": true, "sections": [{"heading": "Mitosis", "text": "Cells divide through mitosis."}]}')
        self.assertEqual(selected["sections"][0]["id"], "section-1")
        self.assertEqual(parse_educational_selection("not json")["sections"], [])

    def test_capture_generation_does_not_depend_on_process_memory(self):
        source = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        create = (ROOT / "web" / "pages" / "create.js").read_text(encoding="utf-8")
        self.assertNotIn("InMemoryStorage", source)
        self.assertNotIn("content_id: message.contentId", worker)
        self.assertIn("content: message.content", worker)
        self.assertIn("content: reviewedContent", create)

    def test_image_only_ingest_uses_vision_before_section_selection(self):
        source = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
        ingest = source[source.index("async def ingest"):source.index("@app.post(\"/generate\"")]
        self.assertIn("analyze_images_for_slides(images_data", ingest)
        self.assertLess(ingest.index("analyze_images_for_slides(images_data"), ingest.index("select_educational_sections(content)"))

    def test_screenshot_vision_output_is_not_reanalyzed_during_generation(self):
        source = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
        ingest = source[source.index("async def ingest"):source.index("@app.post(\"/generate\"")]
        self.assertIn("images_data = []", ingest)

    @patch("main.select_educational_sections")
    @patch("main.get_user_id", return_value="student-1")
    def test_ingest_returns_reviewable_text_without_a_temporary_id(self, _auth, select_sections):
        select_sections.return_value = {
            "is_educational": True,
            "sections": [{"id": "section-1", "heading": "Mitosis", "text": "Cells divide."}],
            "excluded_summary": "",
        }
        response = self.client.post(
            "/ingest",
            headers={"Authorization": "Bearer test"},
            json={"content": "Cells divide through mitosis."},
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("content_id", response.json())
        self.assertEqual(response.json()["sections"][0]["text"], "Cells divide.")

    @patch("main._learning_guidance", return_value="")
    @patch("main.record_usage")
    @patch("main.check_usage", return_value={"used": 0})
    @patch("main.generate_study_guide", return_value="Study guide")
    @patch("main.generate_notes_ai", return_value=["Study note"])
    @patch("main.get_user_id", return_value="student-1")
    def test_generate_accepts_reviewed_text_directly(self, _auth, _notes, _guide, _usage, _record, _guidance):
        response = self.client.post(
            "/generate",
            headers={"Authorization": "Bearer test"},
            json={"content": "Cells divide through mitosis.", "flashcards": False},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["notes"], "- Study note")
        self.assertEqual(response.json()["study_guide"], "Study guide")


if __name__ == "__main__":
    unittest.main()
