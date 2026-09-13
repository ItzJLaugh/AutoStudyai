import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from routers import canvas, guides


class CanvasContractTests(unittest.TestCase):
    def test_external_user_ids_are_namespaced(self):
        self.assertEqual(canvas._external_user_id("student-1"), "cordia-classroom:student-1")

    def test_canvas_guide_save_is_idempotent(self):
        table = MagicMock()
        table.upsert.return_value = table
        table.execute.return_value = MagicMock(data=[{"id": "guide-1"}])
        db = MagicMock()
        db.table.return_value = table
        request = guides.SaveGuideRequest(
            title="Mitosis",
            study_guide="Q1: What is mitosis?\nA1: Cell division.",
            external_source_id="canvas:account:4:assignment:7",
        )
        with patch.object(guides, "get_user_id", return_value="student-1"), \
             patch.object(guides, "get_supabase", return_value=db):
            result = guides.save_guide(request, "Bearer token")
        self.assertEqual(result["guide"]["id"], "guide-1")
        table.upsert.assert_called_once_with(
            unittest.mock.ANY,
            on_conflict="user_id,external_source_id",
        )

    def test_course_response_is_small_and_human_readable(self):
        self.assertEqual(
            canvas._normalize_course({"id": 4, "name": "Biology", "course_code": "BIO-101"}),
            {"id": 4, "name": "Biology", "code": "BIO-101", "url": ""},
        )

    def test_relative_canvas_links_do_not_break_ingestion(self):
        self.assertEqual(canvas._public_url("/courses/4/assignments/7"), "")
        self.assertEqual(canvas._public_url("https://school.instructure.com/courses/4"), "https://school.instructure.com/courses/4")

    def test_canvas_file_download_uses_connected_account(self):
        upstream = MagicMock(
            content=b"PDF content",
            headers={"content-type": "application/pdf"},
        )
        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value={"id": "apn_canvas"}), \
             patch.object(canvas, "_proxy_get", return_value={
                 "url": "https://school.instructure.com/files/99/download?download_frd=1",
                 "content-type": "application/pdf",
             }), \
             patch.object(canvas, "_proxy", return_value=upstream) as proxy:
            result = canvas.canvas_file("99", "Bearer token")
        self.assertEqual(result.body, b"PDF content")
        proxy.assert_called_once_with(
            "/files/99/download?download_frd=1",
            "student-1",
            "apn_canvas",
            unittest.mock.ANY,
            raw=True,
        )

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

    def test_assignment_without_planner_description_still_offers_guide_creation(self):
        item = {
            "plannable_id": 7,
            "plannable_type": "assignment",
            "plannable": {"title": "Chapter 2"},
        }
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
        self.assertEqual(result["external_source_id"], "canvas:apn_canvas:4:item:7")

    def test_study_source_fetches_full_assignment_details(self):
        planner_item = {
            "course_id": 4,
            "plannable_id": 7,
            "plannable_type": "assignment",
            "plannable": {"title": "Chapter 2"},
        }
        assignment = {
            "name": "Chapter 2 review",
            "description": "Explain cell division, chromosome replication, and each phase of mitosis in detail.",
            "html_url": "https://school.instructure.com/courses/4/assignments/7",
        }
        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value={"id": "apn_canvas"}), \
             patch.object(canvas, "_proxy_get", side_effect=[[planner_item], assignment]):
            result = canvas.canvas_study_source("4", "7", "Bearer token")
        self.assertEqual(result["title"], "Chapter 2 review")
        self.assertIn("chromosome replication", result["content"])

    def test_auto_guides_creates_one_missing_assignment_guide(self):
        item = {
            "course_id": 4,
            "plannable_id": 7,
            "plannable_type": "assignment",
            "plannable": {"title": "Mitosis", "due_at": "2026-09-15T17:00:00Z"},
        }
        assignment = {
            "name": "Mitosis",
            "description": "Explain chromosome replication and every phase of mitosis in enough detail for an exam.",
        }
        table = MagicMock()
        table.select.return_value = table
        table.eq.return_value = table
        table.limit.return_value = table
        table.upsert.return_value = table
        table.execute.side_effect = [MagicMock(data=[]), MagicMock(data=[{"id": "guide-1", "title": "Mitosis"}])]
        db = MagicMock()
        db.table.return_value = table
        usage = {"builds_used": 0, "builds_limit": 3, "lightweight_actions_used": 0}

        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value={"id": "apn_canvas"}), \
             patch.object(canvas, "_proxy_get", side_effect=[[item], assignment]), \
             patch.object(canvas, "get_supabase", return_value=db), \
             patch.object(canvas, "check_usage", return_value=usage), \
             patch.object(canvas, "generate_study_guide", return_value="Q1: What is mitosis?\nA1: Cell division."), \
             patch.object(canvas, "learning_profile_for_user", return_value={"generation_guidance": "Use concise explanations."}), \
             patch.object(canvas, "record_usage") as record_usage:
            result = canvas.canvas_auto_guides("Bearer token")

        self.assertEqual(result, {"created": [{"id": "guide-1", "title": "Mitosis"}], "count": 1})
        payload = table.upsert.call_args.args[0]
        self.assertEqual(payload["external_source_id"], "canvas:apn_canvas:4:assignment:7")
        record_usage.assert_called_once_with("student-1", "build", usage)

    def test_auto_guides_skips_an_existing_canvas_source(self):
        item = {
            "course_id": 4,
            "plannable_id": 7,
            "plannable_type": "assignment",
            "plannable": {"title": "Mitosis"},
        }
        table = MagicMock()
        table.select.return_value = table
        table.eq.return_value = table
        table.limit.return_value = table
        table.execute.return_value = MagicMock(data=[{"id": "guide-1"}])
        db = MagicMock()
        db.table.return_value = table

        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value={"id": "apn_canvas"}), \
             patch.object(canvas, "_proxy_get", return_value=[item]), \
             patch.object(canvas, "get_supabase", return_value=db), \
             patch.object(canvas, "check_usage", return_value={"builds_used": 0, "builds_limit": 3}), \
             patch.object(canvas, "generate_study_guide") as generate:
            result = canvas.canvas_auto_guides("Bearer token")

        self.assertEqual(result, {"created": [], "count": 0})
        generate.assert_not_called()

    def test_auto_guides_stops_when_build_limit_is_reached(self):
        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value={"id": "apn_canvas"}), \
             patch.object(canvas, "check_usage", return_value={"builds_used": 3, "builds_limit": 3}), \
             patch.object(canvas, "_proxy_get") as proxy:
            result = canvas.canvas_auto_guides("Bearer token")

        self.assertEqual(result, {"created": [], "count": 0})
        proxy.assert_not_called()

    def test_auto_guides_bounds_the_automatic_scan(self):
        items = [
            {
                "course_id": 4,
                "plannable_id": item_id,
                "plannable_type": "assignment",
                "plannable": {"title": f"Assignment {item_id}"},
            }
            for item_id in range(7)
        ]
        table = MagicMock()
        table.select.return_value = table
        table.eq.return_value = table
        table.limit.return_value = table
        table.execute.return_value = MagicMock(data=[])
        db = MagicMock()
        db.table.return_value = table

        with patch.object(canvas, "get_user_id", return_value="student-1"), \
             patch.object(canvas, "_config", return_value={"project_id": "proj_test"}), \
             patch.object(canvas, "_canvas_account", return_value={"id": "apn_canvas"}), \
             patch.object(canvas, "check_usage", return_value={"builds_used": 0, "builds_limit": 3}), \
             patch.object(canvas, "_proxy_get", return_value=items), \
             patch.object(canvas, "get_supabase", return_value=db), \
             patch.object(canvas, "_study_source", side_effect=canvas.HTTPException(status_code=422)) as study_source:
            result = canvas.canvas_auto_guides("Bearer token")

        self.assertEqual(result, {"created": [], "count": 0})
        self.assertEqual(study_source.call_count, canvas.AUTO_GUIDE_SCAN_LIMIT)

    @patch.dict(os.environ, {}, clear=True)
    def test_missing_provider_configuration_is_truthful(self):
        with self.assertRaisesRegex(Exception, "Canvas connections are not configured"):
            canvas._config()


if __name__ == "__main__":
    unittest.main()
