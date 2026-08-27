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

    def test_selection_capture_is_not_discarded_or_paired_with_page_images(self):
        source = (ROOT / "extension" / "content.js").read_text(encoding="utf-8")
        extractor = source[source.index("function extractUniversalContent()"):source.index("/**\n * Find PowerPoint")]
        self.assertIn("selected: Boolean(selected)", extractor)
        self.assertNotIn("content.length < 50", extractor)
        self.assertIn("images: []", extractor)

    def test_review_shows_source_and_actionable_empty_state(self):
        popup = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")
        script = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        self.assertIn('id="capture-source"', popup)
        self.assertIn("captureSource", script)
        self.assertIn("capturing a screenshot", script)
        self.assertIn("opening a PDF or PowerPoint", script)

    def test_legacy_auto_generating_message_handler_is_removed(self):
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        self.assertNotIn("message.action === 'sendContent'", worker)


if __name__ == "__main__":
    unittest.main()
