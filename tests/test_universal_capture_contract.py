import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from schemas import GenerateRequest


class UniversalCaptureContractTests(unittest.TestCase):
    def test_generate_request_preserves_selected_section_ids(self):
        request = GenerateRequest(content_id="capture-1", section_ids=["section-1"])
        self.assertEqual(request.section_ids, ["section-1"])


if __name__ == "__main__":
    unittest.main()
