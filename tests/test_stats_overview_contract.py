import sys
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from routers import stats


class StatsOverviewContractTests(unittest.TestCase):
    def test_transient_database_error_returns_safe_dashboard_defaults(self):
        database = MagicMock()
        database.table.side_effect = TimeoutError("upstream timed out")
        with patch.object(stats, "get_user_id", return_value="student-1"), \
             patch.object(stats, "get_supabase", return_value=database):
            result = stats.get_overview("Bearer token")
        self.assertEqual(result, {
            "total_guides": 0,
            "total_folders": 0,
            "total_flashcards": 0,
            "cards_studied": 0,
            "avg_quiz_score": 0,
            "current_streak": 0,
            "minutes_today": 0,
        })

    def test_authentication_failure_is_not_hidden_as_empty_stats(self):
        with patch.object(stats, "get_user_id", side_effect=HTTPException(status_code=401)):
            with self.assertRaises(HTTPException):
                stats.get_overview("Bearer invalid")


if __name__ == "__main__":
    unittest.main()
