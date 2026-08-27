from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExtensionCaptureContractTests(unittest.TestCase):
    def test_default_capture_uses_universal_extractor(self):
        source = (ROOT / "extension" / "content.js").read_text(encoding="utf-8")
        handler = source[source.index("case 'extractContent':"):source.index("case 'detectSlideshow':")]
        self.assertIn("extractUniversalContent()", handler)
        self.assertNotIn("captureAllSlides", handler)

    def test_review_requires_explicit_generation(self):
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        popup = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")
        self.assertIn("message.action === 'ingestContent'", worker)
        self.assertIn("message.action === 'generateContent'", worker)
        self.assertIn('id="generate-selected-btn"', popup)


if __name__ == "__main__":
    unittest.main()
