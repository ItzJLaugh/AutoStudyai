"""Stripe subscriptions and monthly AI limits for CordiaClassroom."""

import os
from datetime import datetime, timezone
from typing import Literal

import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth_utils import get_user_id
from database import get_supabase


router = APIRouter(prefix="/billing", tags=["billing"])
PLAN_LIMITS = {
    "free": {"builds": 3, "lightweight_actions": 30},
    "classroom_plus": {"builds": 25, "lightweight_actions": 250},
}
PRICE_ENV = {
    "monthly": "STRIPE_CLASSROOM_PLUS_MONTHLY_PRICE_ID",
    "yearly": "STRIPE_CLASSROOM_PLUS_YEARLY_PRICE_ID",
}
ACTIVE_STATUSES = {"active", "trialing"}


class CheckoutRequest(BaseModel):
    interval: Literal["monthly", "yearly"] = "monthly"


class ConfirmCheckoutRequest(BaseModel):
    session_id: str


def _stripe():
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="Billing not configured")
    stripe.api_key = key
    return stripe


def _month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _plan(subscription: dict | None) -> str:
    if (
        subscription
        and subscription.get("plan") in {"pro", "classroom_plus"}
        and subscription.get("status") in ACTIVE_STATUSES
    ):
        return "classroom_plus"
    return "free"


def get_user_plan(user_id: str) -> dict:
    db = get_supabase()
    subscriptions = (
        db.table("user_subscriptions")
        .select("plan,status,current_period_end,billing_interval,cancel_at_period_end,stripe_customer_id")
        .eq("user_id", user_id)
        .execute()
    )
    subscription = subscriptions.data[0] if subscriptions.data else None
    plan = _plan(subscription)
    limits = PLAN_LIMITS[plan]
    usage_rows = (
        db.table("monthly_usage")
        .select("guides_generated,lightweight_actions")
        .eq("user_id", user_id)
        .eq("month", _month())
        .execute()
    )
    usage = usage_rows.data[0] if usage_rows.data else {}
    builds = int(usage.get("guides_generated") or 0)
    actions = int(usage.get("lightweight_actions") or 0)
    return {
        "plan": plan,
        "billing_interval": subscription.get("billing_interval") if subscription else None,
        "period_end": subscription.get("current_period_end") if subscription else None,
        "cancel_at_period_end": bool(subscription and subscription.get("cancel_at_period_end")),
        "builds_used": builds,
        "builds_limit": limits["builds"],
        "builds_remaining": max(0, limits["builds"] - builds),
        "lightweight_actions_used": actions,
        "lightweight_actions_limit": limits["lightweight_actions"],
        "lightweight_actions_remaining": max(0, limits["lightweight_actions"] - actions),
    }


def _usage_fields(action: str) -> tuple[str, str]:
    if action == "build":
        return "builds_used", "builds_limit"
    if action == "lightweight":
        return "lightweight_actions_used", "lightweight_actions_limit"
    raise ValueError(f"Unknown usage action: {action}")


def check_usage(user_id: str, action: str) -> dict:
    usage = get_user_plan(user_id)
    used, limit = _usage_fields(action)
    if usage[used] >= usage[limit]:
        raise HTTPException(
            status_code=402,
            detail={"message": "Monthly limit reached.", "upgrade_url": "/settings?section=subscription"},
        )
    return usage


def record_usage(user_id: str, action: str, usage: dict) -> None:
    _usage_fields(action)
    get_supabase().table("monthly_usage").upsert(
        {
            "user_id": user_id,
            "month": _month(),
            "guides_generated": usage["builds_used"] + (action == "build"),
            "lightweight_actions": usage["lightweight_actions_used"] + (action == "lightweight"),
        },
        on_conflict="user_id,month",
    ).execute()


@router.get("/status")
def billing_status(authorization: str = Header(default="")):
    return get_user_plan(get_user_id(authorization))


@router.post("/create-checkout-session")
def create_checkout_session(body: CheckoutRequest, authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    if get_user_plan(user_id)["plan"] == "classroom_plus":
        raise HTTPException(status_code=409, detail="Plus is already active")

    price_id = os.getenv(PRICE_ENV[body.interval])
    if body.interval == "monthly" and not price_id:
        price_id = os.getenv("STRIPE_PRICE_ID")
    if not price_id:
        raise HTTPException(status_code=503, detail="Billing not configured")
    rows = (
        get_supabase().table("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user_id)
        .execute()
    )
    customer_id = rows.data[0].get("stripe_customer_id") if rows.data else None
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    metadata = {"user_id": user_id, "product": "classroom_plus", "interval": body.interval}
    params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": (
            f"{frontend_url}/settings?billing=success"
            "&session_id={CHECKOUT_SESSION_ID}"
        ),
        "cancel_url": f"{frontend_url}/settings?billing=cancelled",
        "client_reference_id": user_id,
        "metadata": metadata,
        "subscription_data": {"metadata": metadata},
        "allow_promotion_codes": True,
    }
    if customer_id:
        params["customer"] = customer_id
    return {"url": _stripe().checkout.Session.create(**params).url}


@router.post("/create-portal-session")
def create_portal_session(authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    rows = (
        get_supabase().table("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user_id)
        .execute()
    )
    customer_id = rows.data[0].get("stripe_customer_id") if rows.data else None
    if not customer_id:
        raise HTTPException(status_code=404, detail="No billing account found")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    session = _stripe().billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{frontend_url}/settings?section=subscription",
    )
    return {"url": session.url}


def _plain(value) -> dict:
    if hasattr(value, "to_dict_recursive"):
        return value.to_dict_recursive()
    if hasattr(value, "to_dict"):
        return value.to_dict()
    return dict(value)


def _subscription_row(subscription: dict) -> dict:
    items = subscription.get("items", {}).get("data", [])
    item = items[0] if items else {}
    price = item.get("price", {})
    price_id = price.get("id")
    interval = next(
        (name for name, env in PRICE_ENV.items() if price_id and price_id == os.getenv(env)),
        None,
    )
    if not interval:
        interval = {"month": "monthly", "year": "yearly"}.get(
            price.get("recurring", {}).get("interval")
        )
    period_end = subscription.get("current_period_end") or item.get("current_period_end")
    return {
        "stripe_customer_id": subscription.get("customer"),
        "stripe_subscription_id": subscription.get("id"),
        "plan": "classroom_plus",
        "status": subscription.get("status"),
        "billing_interval": interval,
        "current_period_end": datetime.fromtimestamp(period_end, timezone.utc).isoformat() if period_end else None,
        "cancel_at_period_end": bool(subscription.get("cancel_at_period_end")),
    }


def _activate_checkout(session: dict, user_id: str) -> dict:
    """Verify a completed Stripe Checkout Session and mirror its entitlement."""
    session_user_id = session.get("metadata", {}).get("user_id") or session.get(
        "client_reference_id"
    )
    if session_user_id != user_id:
        raise HTTPException(status_code=403, detail="Checkout session does not belong to this account")
    if session.get("status") != "complete":
        raise HTTPException(status_code=409, detail="Checkout is not complete")
    if session.get("payment_status") not in {"paid", "no_payment_required"}:
        raise HTTPException(status_code=409, detail="Payment is still processing")

    subscription_id = session.get("subscription")
    if not subscription_id:
        raise HTTPException(status_code=409, detail="Checkout did not create a subscription")
    if not isinstance(subscription_id, str):
        subscription_id = subscription_id.get("id")

    row = _subscription_row(_plain(_stripe().Subscription.retrieve(subscription_id)))
    row["user_id"] = user_id
    get_supabase().table("user_subscriptions").upsert(row, on_conflict="user_id").execute()
    return get_user_plan(user_id)


@router.post("/confirm-checkout")
def confirm_checkout(body: ConfirmCheckoutRequest, authorization: str = Header(default="")):
    user_id = get_user_id(authorization)
    if not body.session_id.startswith("cs_"):
        raise HTTPException(status_code=400, detail="Invalid Checkout session")
    session = _plain(_stripe().checkout.Session.retrieve(body.session_id))
    return _activate_checkout(session, user_id)


def process_stripe_event(event) -> None:
    event_type = event["type"]
    data = _plain(event["data"]["object"])
    db = get_supabase()

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        subscription_id = data.get("subscription")
        user_id = data.get("metadata", {}).get("user_id") or data.get("client_reference_id")
        if not subscription_id or not user_id:
            raise ValueError("Checkout event is missing subscription metadata")
        row = _subscription_row(_plain(_stripe().Subscription.retrieve(subscription_id)))
        row["user_id"] = user_id
        db.table("user_subscriptions").upsert(row, on_conflict="user_id").execute()
    elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
        row = _subscription_row(data)
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            row["user_id"] = user_id
            db.table("user_subscriptions").upsert(row, on_conflict="user_id").execute()
        elif row["stripe_customer_id"]:
            db.table("user_subscriptions").update(row).eq(
                "stripe_customer_id", row["stripe_customer_id"]
            ).execute()
    elif event_type == "customer.subscription.deleted":
        db.table("user_subscriptions").update(
            {
                "plan": "free",
                "status": "cancelled",
                "stripe_subscription_id": None,
                "billing_interval": None,
                "current_period_end": None,
                "cancel_at_period_end": False,
            }
        ).eq("stripe_customer_id", data.get("customer")).eq(
            "stripe_subscription_id", data.get("id")
        ).execute()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    signature = request.headers.get("stripe-signature", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Billing webhook not configured")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    try:
        event = _stripe().Webhook.construct_event(await request.body(), signature, secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature") from exc
    process_stripe_event(event)
    return JSONResponse(content={"received": True})
