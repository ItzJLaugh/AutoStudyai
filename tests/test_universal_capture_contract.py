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


if __name__ == "__main__":
    unittest.main()
