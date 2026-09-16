from datetime import datetime, timedelta, timezone
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SharedTutorSessionContractTests(unittest.TestCase):
    def test_skill_router_is_small_and_intent_based(self):
        import sys
        sys.path.insert(0, str(ROOT / "backend"))
        from services.tutor_sessions import TUTOR_SKILLS, infer_tutor_skill

        self.assertEqual(infer_tutor_skill("Create practice questions from this guide"), "practice")
        self.assertEqual(infer_tutor_skill("Build a study guide from this page"), "build_guide")
        self.assertEqual(infer_tutor_skill("Find material for Exam 1 in Canvas"), "find_material")
        self.assertEqual(infer_tutor_skill("Explain why this answer is wrong"), "explain")
        self.assertEqual(infer_tutor_skill("Explain this study guide"), "explain")
        self.assertEqual(infer_tutor_skill("Create a study guide from this"), "build_guide")
        self.assertEqual(set(TUTOR_SKILLS), {
            "explain", "capture", "build_guide", "practice", "retain", "plan", "find_material", "organize"
        })
        for definition in TUTOR_SKILLS.values():
            self.assertTrue(definition["outcome"])
            self.assertEqual(definition["version"], 1)
            self.assertTrue(definition["complete_when"])
            self.assertIn("available", definition)
            self.assertIn("tools", definition)
            self.assertIn("requires_context", definition)
            self.assertIn("confirm", definition)
            self.assertTrue(definition["instruction"])

    def test_browser_presence_expires_instead_of_claiming_a_stale_connection(self):
        import sys
        sys.path.insert(0, str(ROOT / "backend"))
        from services.tutor_sessions import public_tutor_session

        old = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
        session = public_tutor_session({
            "id": "session-1",
            "browser_available": True,
            "browser_last_seen_at": old,
        })
        self.assertFalse(session["browser_available"])
        fresh = public_tutor_session({
            "id": "session-1",
            "browser_available": True,
            "browser_last_seen_at": datetime.now(timezone.utc).isoformat(),
        })
        self.assertTrue(fresh["browser_available"])

    def test_background_presence_heartbeat_does_not_collect_every_visited_url(self):
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        panel = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        self.assertIn("browser_observation: message.observation", worker)
        heartbeat = panel[panel.index("async function publishBrowserPresence"):panel.index("tutorSkill?.addEventListener")]
        self.assertIn("if (contentRefs)", heartbeat)
        self.assertNotIn("contentRefs = []", heartbeat)

    def test_stale_agent_run_does_not_leave_both_surfaces_permanently_locked(self):
        import sys
        sys.path.insert(0, str(ROOT / "backend"))
        from services.tutor_sessions import public_tutor_session

        stale = public_tutor_session({
            "id": "session-1",
            "status": "running",
            "run_started_at": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        self.assertEqual(stale["status"], "idle")

    def test_extension_is_a_side_panel_bound_to_the_shared_session(self):
        import json

        manifest = json.loads((ROOT / "extension" / "manifest.json").read_text(encoding="utf-8"))
        worker = (ROOT / "extension" / "background.js").read_text(encoding="utf-8")
        panel = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
        web_tutor = (ROOT / "web" / "components" / "AIChatWidget.js").read_text(encoding="utf-8")

        self.assertEqual(manifest["side_panel"]["default_path"], "popup.html")
        self.assertIn("sidePanel", manifest["permissions"])
        self.assertNotIn("default_popup", manifest["action"])
        self.assertIn("openPanelOnActionClick", worker)
        self.assertIn("'/tutor/session'", worker)
        self.assertIn("sessionId: tutorSession.id", panel)
        self.assertNotIn("let chatHistory", panel)
        self.assertIn("apiFetch('/tutor/session')", web_tutor)
        self.assertIn("session_id: session.id", web_tutor)

    def test_session_schema_is_one_per_user_and_user_scoped(self):
        migration = (ROOT / "supabase" / "migrations" / "20260917000000_shared_tutor_sessions.sql").read_text(encoding="utf-8")
        self.assertIn("unique (user_id)", migration)
        self.assertIn("enable row level security", migration)
        self.assertIn("auth.uid()) = user_id", migration)

    def test_browser_context_rejects_non_web_urls_and_unbounded_results(self):
        import sys
        from pydantic import ValidationError
        sys.path.insert(0, str(ROOT / "backend"))
        from routers.tutor import BrowserActionResult, BrowserObservation
        from schemas import ChatRequest

        with self.assertRaises(ValidationError):
            BrowserObservation(url="javascript:alert(1)")
        with self.assertRaises(ValidationError):
            ChatRequest(question="Explain", content="notes", context_url="file:///secret")
        with self.assertRaises(ValidationError):
            BrowserActionResult(command_id="command-1", status="completed", action="capture", error="x" * 501)


if __name__ == "__main__":
    unittest.main()
