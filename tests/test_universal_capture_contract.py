import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from schemas import GenerateRequest
from services.llm import parse_educational_selection


class UniversalCaptureContractTests(unittest.TestCase):
    def test_generate_request_preserves_selected_section_ids(self):
        request = GenerateRequest(content_id="capture-1", section_ids=["section-1"])
        self.assertEqual(request.section_ids, ["section-1"])

    def test_selection_parser_fails_closed_and_assigns_stable_ids(self):
        self.assertEqual(parse_educational_selection('{"is_educational": false}')["sections"], [])
        selected = parse_educational_selection('{"is_educational": true, "sections": [{"heading": "Mitosis", "text": "Cells divide through mitosis."}]}')
        self.assertEqual(selected["sections"][0]["id"], "section-1")
        self.assertEqual(parse_educational_selection("not json")["sections"], [])

    def test_generation_uses_selected_sections_in_source_order(self):
        source = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
        self.assertIn("def selected_section_text", source)
        self.assertIn("[section.get(\"text\", \"\") for section in sections", source)
        self.assertIn("Selected sections are invalid or empty", source)

    def test_image_only_ingest_uses_vision_before_section_selection(self):
        source = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
        ingest = source[source.index("async def ingest"):source.index("@app.post(\"/generate\"")]
        self.assertIn("analyze_images_for_slides(images_data", ingest)
        self.assertLess(ingest.index("analyze_images_for_slides(images_data"), ingest.index("select_educational_sections(content)"))

    def test_screenshot_vision_output_is_not_reanalyzed_during_generation(self):
        source = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
        ingest = source[source.index("async def ingest"):source.index("@app.post(\"/generate\"")]
        self.assertIn("images_data = []", ingest)


if __name__ == "__main__":
    unittest.main()
