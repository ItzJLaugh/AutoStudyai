import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExtensionCaptureContractTests(unittest.TestCase):
    def setUp(self):
        self.worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        self.panel = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        self.html = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")
        self.scraper = (ROOT / "extension" / "content.js").read_text(encoding="utf-8")
        self.manifest = json.loads((ROOT / "extension" / "manifest.json").read_text(encoding="utf-8"))

    def test_extension_exposes_only_four_study_actions(self):
        self.assertIn("const ACTIONS = { captureScreen, scrapePage, extractEducationalContent, createStudyGuide }", self.worker)
        self.assertEqual(self.html.count('class="action'), 4)
        for action in ("captureScreen", "scrapePage", "extractEducationalContent", "createStudyGuide"):
            self.assertIn(f"action: '{action}'", self.panel)
        for removed in ("getTutorSession", "setTutorSkill", "updateBrowserContext", "requestActiveTabAccess"):
            self.assertNotIn(removed, self.worker + self.panel)

    def test_site_access_is_declared_not_runtime_choreography(self):
        self.assertEqual(self.manifest["host_permissions"], ["http://*/*", "https://*/*"])
        self.assertNotIn("optional_host_permissions", self.manifest)
        self.assertNotIn("addHostAccessRequest", self.worker)

    def test_scraper_uses_readability_with_lms_fallback(self):
        self.assertTrue((ROOT / "extension" / "vendor" / "Readability.js").exists())
        self.assertIn("new Readability(copy", self.scraper)
        self.assertIn(".ic-Layout-contentMain", self.scraper)
        self.assertIn("window.getSelection()", self.scraper)
        self.assertIn("iframe[src], embed[src], object[data], a[href]", self.scraper)
        self.assertIn("normalizeCanvasDownload", self.scraper)

    def test_documents_are_downloaded_from_extension_origin(self):
        self.assertIn("async function extractDocument", self.worker)
        self.assertIn("credentials: 'include'", self.worker)
        self.assertIn("new FormData()", self.worker)
        self.assertIn("'/extract-file-text'", self.worker)
        self.assertNotIn("fetchFile", self.scraper)

    def test_screen_capture_and_generation_reuse_existing_backend(self):
        self.assertIn("chrome.tabs.captureVisibleTab", self.worker)
        self.assertIn("apiFetch('/ingest'", self.worker)
        self.assertIn("apiFetch('/generate'", self.worker)
        self.assertIn("apiFetch('/guides'", self.worker)
        self.assertIn("'[Screenshot fallback]'", self.panel)

    def test_extension_reuses_classroom_session_without_password_form(self):
        bridge = (ROOT / "extension" / "asai-bridge.js").read_text(encoding="utf-8")
        self.assertNotIn('type="password"', self.html)
        self.assertIn("localStorage.getItem('authToken')", bridge)
        self.assertIn("chrome.storage.local.set", bridge)
        self.assertIn("syncClassroomAuth", self.worker)

    def test_custom_extension_code_is_small(self):
        self.assertLess(len(self.worker.splitlines()), 220)
        self.assertLess(len(self.panel.splitlines()), 180)
        self.assertLess(len(self.scraper.splitlines()), 130)


if __name__ == "__main__":
    unittest.main()
