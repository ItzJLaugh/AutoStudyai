from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExtensionCaptureContractTests(unittest.TestCase):
    def test_default_capture_uses_universal_extractor(self):
        source = (ROOT / "extension" / "content.js").read_text(encoding="utf-8")
        handler = source[source.index("case 'extractContent':"):source.index("case 'detectSlideshow':")]
        self.assertIn("extractUniversalContent()", handler)
        self.assertNotIn("captureAllSlides", handler)


if __name__ == "__main__":
    unittest.main()
