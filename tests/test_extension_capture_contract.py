from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExtensionCaptureContractTests(unittest.TestCase):
    def test_capture_runs_one_source_resolution_flow(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        handler = popup[popup.index("async function captureActiveTab"):popup.index("function sendToBackend")]
        self.assertIn("runCaptureFlow(tabId)", handler)
        self.assertIn("captureBtn.addEventListener('click', () => captureActiveTab())", popup)
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
        extractor = popup[popup.index("async function extractDocumentText"):popup.index("async function readLinkedDocuments")]
        capture = popup[popup.index("async function captureDocument"):popup.index("async function screenshotFallback")]
        self.assertIn("new FormData()", extractor)
        self.assertIn("'/extract-file-text'", extractor)
        self.assertIn("headers: { Authorization:", extractor)
        self.assertNotIn("Content-Type", extractor)
        self.assertIn("documentFilename(source, fetched)", extractor)
        self.assertLess(capture.index("action: 'fetchFile'"), capture.index("API + '/canvas/file/'"))
        self.assertIn("extractDocumentText(source, fetched, token, blob)", capture)

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
        self.assertIn("message.action !== 'syncCordiaAuth'", bridge)
        self.assertIn("message.action === 'syncClassroomAuth'", (ROOT / "extension" / "background.js").read_text(encoding="utf-8"))
        self.assertIn('"https://classroom.cordiacode.com/*"', manifest)

    def test_side_panel_resolves_the_real_active_tab_in_the_service_worker(self):
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        manifest = (ROOT / "extension" / "manifest.json").read_text(encoding="utf-8")

        self.assertIn("async function resolveActiveStudyTab", worker)
        self.assertIn("lastFocusedWindow: true", worker)
        self.assertIn("windows.getLastFocused", worker)
        self.assertIn("message.action === 'getActiveStudyTab'", worker)
        self.assertNotIn("currentWindow: true", popup)
        self.assertIn("requestActiveTabAccess", worker)
        self.assertIn("permissions.addHostAccessRequest", worker)
        self.assertIn('"optional_host_permissions": ["http://*/*", "https://*/*"]', manifest)
        self.assertNotIn("'Browser available'", popup)
        self.assertIn("'Current tab ready'", popup)

    def test_tutor_ask_reports_missing_auth_instead_of_silently_returning(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        handler = popup[popup.index("async function sendChat"):popup.index("function updateChatHistory")]

        self.assertIn("const authenticated = await initAuth()", handler)
        self.assertIn("Sign in to CordiaClassroom in this browser profile", handler)
        self.assertNotIn("!tutorSession?.id || tutorSession.status !== 'idle') return", handler)

    def test_side_panel_is_event_driven_instead_of_polling_session_and_browser(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")

        self.assertNotIn("window.setInterval", popup)
        self.assertIn("window.addEventListener('focus', refreshTutorSession)", popup)
        self.assertIn("visibilitychange", popup)
        self.assertIn("await publishBrowserPresence()", popup)

    def test_tutor_can_queue_the_same_user_approved_capture_flow(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        self.assertIn("command.type === 'capture_current_page'", popup)
        self.assertIn("captureActiveTab(command.id)", popup)
        self.assertIn("last_action_result: message.lastActionResult", worker)
        self.assertIn("browserContent", popup)
        self.assertIn("browser_content: message.browserContent", worker)
        self.assertIn("session.permission_scope?.includes", popup)
        self.assertNotIn("chrome.debugger", popup + worker)

    def test_find_material_follows_only_bounded_links_from_the_active_site(self):
        popup = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        manifest = (ROOT / "extension" / "manifest.json").read_text(encoding="utf-8")
        handler = popup[popup.index("async function findStudyMaterialOnPage"):popup.index("tutorSkill?.addEventListener")]
        self.assertIn("find_material_current_page", popup)
        self.assertIn("chrome.scripting.executeScript", handler)
        self.assertIn("root.querySelectorAll('a[href]')", handler)
        self.assertIn("command.goal", handler)
        self.assertIn("navigateToStudyMaterial(evidence[0])", handler)
        self.assertIn("evidence,", handler)
        self.assertIn("url.origin === location.origin", handler)
        self.assertIn("credentials: 'include'", handler)
        self.assertIn("candidate.depth < 2", handler)
        self.assertIn("seen.size < 12", handler)
        self.assertIn("/\\/quizzes\\//i", handler)
        self.assertIn("buildGuideFromFoundMaterial", handler)
        self.assertIn("readLinkedDocuments", handler)
        self.assertIn("courseSourceUrl", handler)
        self.assertIn("contextUrl: sourceUrl", handler)
        self.assertIn("skill: 'build_guide'", handler)
        self.assertNotIn("chrome.debugger", popup)
        self.assertNotIn('"history"', manifest)
        self.assertNotIn('"<all_urls>"', manifest)

    def test_visible_navigation_is_same_origin_and_excludes_graded_routes(self):
        background = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        self.assertIn("message.action === 'navigateActiveTab'", background)
        self.assertIn("requested.origin !== current.origin", background)
        self.assertRegex(background, r"quizzes\|grades\|submissions")
        self.assertIn("chrome.tabs.update(tab.id, { url: target })", background)

    def test_side_panel_is_tutor_first_and_keeps_tab_context_local_until_requested(self):
        panel = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")
        script = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")

        self.assertIn('class="tab-btn active" data-tab="chat"', panel)
        self.assertIn('id="page-context-title"', panel)
        self.assertIn('Not sent until you ask', script)
        self.assertIn("find_material: 'Finding Canvas material…'", script)
        self.assertIn('id="capture-section" class="tab-section"', panel)


if __name__ == "__main__":
    unittest.main()
