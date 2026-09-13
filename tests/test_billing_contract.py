import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch


sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))
ROOT = Path(__file__).resolve().parents[1]

from fastapi import HTTPException
from routers import billing


class BillingContractTests(unittest.TestCase):
    def test_plan_limits_and_paid_status(self):
        self.assertEqual(billing.PLAN_LIMITS["free"], {"builds": 3, "lightweight_actions": 30})
        self.assertEqual(billing.PLAN_LIMITS["classroom_plus"], {"builds": 25, "lightweight_actions": 250})
        self.assertEqual(billing._plan({"plan": "pro", "status": "active"}), "classroom_plus")
        self.assertEqual(billing._plan({"plan": "classroom_plus", "status": "past_due"}), "free")

    def test_usage_limit_blocks_without_writing(self):
        usage = {
            "builds_used": 3,
            "builds_limit": 3,
            "lightweight_actions_used": 0,
            "lightweight_actions_limit": 30,
        }
        with patch.object(billing, "get_user_plan", return_value=usage):
            with self.assertRaises(HTTPException) as error:
                billing.check_usage("user-1", "build")
        self.assertEqual(error.exception.status_code, 402)

    def test_create_page_surfaces_billing_message_and_upgrade_action(self):
        source = (ROOT / "web" / "pages" / "create.js").read_text(encoding="utf-8")
        self.assertIn("generated.detail.message", source)
        self.assertIn("generated.detail.upgrade_url", source)
        self.assertIn(">View plans</button>", source)

    def test_record_usage_increments_only_requested_counter(self):
        query = MagicMock()
        db = MagicMock()
        db.table.return_value = query
        with patch.object(billing, "get_supabase", return_value=db):
            billing.record_usage(
                "user-1",
                "lightweight",
                {"builds_used": 2, "lightweight_actions_used": 8},
            )
        payload = query.upsert.call_args.args[0]
        self.assertEqual(payload["guides_generated"], 2)
        self.assertEqual(payload["lightweight_actions"], 9)

    def test_webhook_rejects_missing_signature(self):
        request = MagicMock()
        request.body = AsyncMock(return_value=b"{}")
        request.headers = {}
        with patch.dict(os.environ, {"STRIPE_WEBHOOK_SECRET": "whsec_test"}, clear=True):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(billing.stripe_webhook(request))
        self.assertEqual(error.exception.status_code, 400)

    def test_subscription_update_upserts_by_user(self):
        query = MagicMock()
        db = MagicMock()
        db.table.return_value = query
        event = {
            "type": "customer.subscription.updated",
            "data": {"object": {
                "id": "sub_1",
                "customer": "cus_1",
                "status": "active",
                "metadata": {"user_id": "user-1"},
                "items": {"data": [{"price": {"recurring": {"interval": "month"}}}]},
            }},
        }
        with patch.object(billing, "get_supabase", return_value=db):
            billing.process_stripe_event(event)
        payload = query.upsert.call_args.args[0]
        self.assertEqual(payload["user_id"], "user-1")
        self.assertEqual(payload["billing_interval"], "monthly")


if __name__ == "__main__":
    unittest.main()
