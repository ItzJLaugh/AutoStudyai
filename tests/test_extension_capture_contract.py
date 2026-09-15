from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExtensionCaptureContractTests(unittest.TestCase):
    def test_capture_runs_one_source_resolution_flow(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        handler = popup[popup.index("captureBtn.addEventListener"):popup.index("function sendToBackend")]
        self.assertIn("runCaptureFlow(tabId)", handler)
        self.assertIn("action: 'extractSource'", popup)
        self.assertNotIn("captureSlideshowWithImages", popup)
        self.assertNotIn("capturePptx", popup)

    def test_page_reader_is_injected_only_after_user_click(self):
        manifest = (ROOT / "extension" / "manifest.json").read_text(encoding="utf-8")
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        self.assertNotIn('"<all_urls>"', manifest)
        self.assertIn("files: ['content.js']", popup)
        self.assertIn("ensureContentScript(tabId", popup)

    def test_resolver_finds_selection_embedded_files_and_lms_text(self):
        source = (ROOT / "extension" / "content.js").read_text(encoding="utf-8")
        self.assertIn("window.getSelection()", source)
        self.assertIn("iframe[src], embed[src], object[data], a[href]", source)
        self.assertIn(".ic-Layout-contentMain", source)
        self.assertIn("normalizeCanvasDownload", source)
        self.assertIn("file_preview|download", source)
        resolver = source[source.index("function extractSource"):source.index("async function fetchFile")]
        self.assertLess(resolver.index("window.getSelection()"), resolver.index("findDocument(true)"))
        self.assertLess(resolver.index("findDocument(true)"), resolver.index("visibleText()"))
        self.assertLess(resolver.index("visibleText()"), resolver.index("findDocument()"))

    def test_documents_use_server_file_extractor_without_manual_content_type(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        capture = popup[popup.index("async function captureDocument"):popup.index("async function screenshotFallback")]
        self.assertIn("new FormData()", capture)
        self.assertIn("'/extract-file-text'", capture)
        self.assertIn("headers: { Authorization:", capture)
        self.assertNotIn("Content-Type", capture)
        self.assertIn("documentFilename(source, fetched)", capture)

    def test_client_side_powerpoint_parsers_are_removed(self):
        popup_html = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")
        self.assertNotIn("jszip.min.js", popup_html)
        self.assertNotIn("pptxParser.js", popup_html)
        self.assertFalse((ROOT / "extension" / "pptx-parser.js").exists())
        self.assertFalse((ROOT / "extension" / "pptxParser.js").exists())

    def test_review_requires_explicit_generation(self):
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        popup = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")
        self.assertIn("message.action === 'ingestContent'", worker)
        self.assertIn("message.action === 'generateContent'", worker)
        self.assertIn('id="generate-selected-btn"', popup)

    def test_protected_embeds_have_a_visible_screenshot_fallback(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        self.assertIn("async function screenshotFallback", popup)
        self.assertIn("embedded viewer is protected", popup)

    def test_legacy_auto_generating_handler_is_removed(self):
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        self.assertNotIn("message.action === 'sendContent'", worker)

    def test_structured_billing_errors_are_human_readable(self):
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        self.assertIn("detail && detail.message", worker)
        self.assertIn("response?.status === 402", popup)
        self.assertIn("showGuideLimit()", popup)

    def test_extension_reuses_classroom_session_without_password_form(self):
        popup = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")
        popup_script = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        bridge = (ROOT / "extension" / "asai-bridge.js").read_text(encoding="utf-8")
        manifest = (ROOT / "extension" / "manifest.json").read_text(encoding="utf-8")

        self.assertNotIn('type="password"', popup)
        self.assertNotIn("'/auth/login'", popup_script)
        self.assertIn("localStorage.getItem('authToken')", bridge)
        self.assertIn("chrome.storage.local.set", bridge)
        self.assertIn("CORDIA_AUTH_UPDATED", bridge)
        self.assertIn('"run_at": "document_idle"', manifest)


if __name__ == "__main__":
    unittest.main()
