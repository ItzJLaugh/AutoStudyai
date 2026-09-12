import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from routers import canvas


class CanvasContractTests(unittest.TestCase):
    def test_external_user_ids_are_namespaced(self):
        self.assertEqual(canvas._external_user_id("student-1"), "cordia-classroom:student-1")

    def test_course_response_is_small_and_human_readable(self):
        self.assertEqual(
            canvas._normalize_course({"id": 4, "name": "Biology", "course_code": "BIO-101"}),
            {"id": 4, "name": "Biology", "code": "BIO-101", "url": ""},
        )

    def test_relative_canvas_links_do_not_break_ingestion(self):
        self.assertEqual(canvas._public_url("/courses/4/assignments/7"), "")
        self.assertEqual(canvas._public_url("https://school.instructure.com/courses/4"), "https://school.instructure.com/courses/4")

    def test_planner_item_uses_canvas_due_date_and_completion(self):
        result = canvas._normalize_planner_item({
            "plannable_id": 7,
            "course_id": 4,
            "plannable_type": "assignment",
            "plannable": {"title": "Chapter 2", "due_at": "2026-09-15T17:00:00Z"},
            "submissions": {"submitted": True},
        })
        self.assertEqual(result["title"], "Chapter 2")
        self.assertEqual(result["due_at"], "2026-09-15T17:00:00Z")
        self.assertTrue(result["completed"])

    def test_assignment_description_is_available_for_guide_creation(self):
        item = {"plannable": {"description": "<p>Review <strong>cell division</strong> before class.</p>"}}
        self.assertEqual(canvas._plannable_text(item["plannable"]), "Review cell division before class.")
        self.assertTrue(canvas._normalize_planner_item(item)["has_study_material"])

    def test_calendar_item_with_false_submission_does_not_crash(self):
        result = canvas._normalize_planner_item({"plannable_id": 8, "submissions": False})
        self.assertFalse(result["completed"])

    def test_dashboard_returns_normalized_canvas_data(self):
        account = {"id": "apn_canvas", "name": "State University"}
        courses = [{"id": 4, "name": "Biology"}]
        planner = [{"plannable_id": 7, "course_id": 4, "plannable": {"title": "Chapter 2"}}]
        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value=account), \
             patch.object(canvas, "_proxy_get", side_effect=[courses, planner]):
            result = canvas.canvas_dashboard("Bearer token")
        self.assertTrue(result["connected"])
        self.assertEqual(result["institution"], "State University")
        self.assertEqual(result["courses"][0]["name"], "Biology")
        self.assertEqual(result["items"][0]["title"], "Chapter 2")

    def test_dashboard_is_empty_until_canvas_is_connected(self):
        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value=None):
            result = canvas.canvas_dashboard("Bearer token")
        self.assertEqual(result, {"connected": False, "courses": [], "items": []})

    def test_canvas_item_can_become_reviewed_guide_source(self):
        item = {
            "course_id": 4,
            "plannable_id": 7,
            "html_url": "https://school.instructure.com/courses/4/assignments/7",
            "plannable": {
                "title": "Mitosis review",
                "description": "<p>Review the stages of mitosis and explain what happens to chromosomes during every stage.</p>",
            },
        }
        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value={"id": "apn_canvas"}), \
             patch.object(canvas, "_proxy_get", return_value=[item]):
            result = canvas.canvas_study_source("4", "7", "Bearer token")
        self.assertEqual(result["title"], "Mitosis review")
        self.assertIn("chromosomes", result["content"])
        self.assertEqual(result["source_url"], item["html_url"])

    @patch.dict(os.environ, {}, clear=True)
    def test_missing_provider_configuration_is_truthful(self):
        with self.assertRaisesRegex(Exception, "Canvas connections are not configured"):
            canvas._config()


if __name__ == "__main__":
    unittest.main()
