"""
Billing router for AutoStudyAI.
Handles Stripe subscription management and usage tracking.
Free tier: 10 guide generations per month.
Pro tier: $9.99/mo, unlimited.
"""

import os
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Request
from fastapi.responses import JSONResponse
import stripe
from database import get_supabase
from auth_utils import get_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

FREE_TIER_LIMIT = 2  # guides per month


def _get_stripe():
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="Billing not configured")
    stripe.api_key = key
    return stripe


def get_current_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def get_user_plan(user_id: str) -> dict:
    """Return the user's plan and usage for the current month."""
    supabase = get_supabase()
    month = get_current_month()

    # Check subscription
    sub = supabase.table("user_subscriptions").select("*").eq("user_id", user_id).execute()
    plan = "free"
    period_end = None
    if sub.data:
        row = sub.data[0]
        if row.get("plan") == "pro" and row.get("status") == "active":
            plan = "pro"
        period_end = row.get("current_period_end")

    # Get usage
    usage = supabase.table("monthly_usage") \
        .select("guides_generated") \
        .eq("user_id", user_id) \
        .eq("month", month) \
        .execute()
    guides_used = usage.data[0]["guides_generated"] if usage.data else 0

    return {
        "plan": plan,
        "guides_used": guides_used,
        "guides_limit": None if plan == "pro" else FREE_TIER_LIMIT,
        "period_end": period_end,
    }


def check_and_increment_usage(user_id: str):
    """
    Check if user is within their limit, then increment count.
    Raises 402 if free tier is exceeded.
    """
    supabase = get_supabase()
    month = get_current_month()

    info = get_user_plan(user_id)
    if info["plan"] == "free" and info["guides_used"] >= FREE_TIER_LIMIT:
        raise HTTPException(
            status_code=402,
            detail={
                "message": f"Free tier limit reached ({FREE_TIER_LIMIT} guides/month). Upgrade to Pro for unlimited access.",
                "upgrade_url": "/billing"
            }
        )

    # Upsert usage count
    supabase.table("monthly_usage").upsert(
        {
            "user_id": user_id,
            "month": month,
            "guides_generated": info["guides_used"] + 1
        },
        on_conflict="user_id,month"
    ).execute()


@router.get("/status")
def billing_status(authorization: str = Header(default="")):
    """Get current user's plan and usage."""
    try:
        user_id = get_user_id(authorization)
        return get_user_plan(user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting billing status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get billing status")


@router.post("/create-checkout-session")
def create_checkout_session(authorization: str = Header(default="")):
    """Create a Stripe Checkout session for Pro subscription."""
    try:
        user_id = get_user_id(authorization)
        st = _get_stripe()

        price_id = os.getenv("STRIPE_PRICE_ID", "")
        if not price_id:
            raise HTTPException(status_code=503, detail="Billing not configured")

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

        # Check for existing Stripe customer
        supabase = get_supabase()
        sub = supabase.table("user_subscriptions").select("stripe_customer_id").eq("user_id", user_id).execute()
        customer_id = sub.data[0]["stripe_customer_id"] if sub.data and sub.data[0].get("stripe_customer_id") else None

        session_params = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": frontend_url + "/billing?success=true",
            "cancel_url": frontend_url + "/billing?cancelled=true",
            "metadata": {"user_id": user_id},
            "allow_promotion_codes": True,
        }
        if customer_id:
            session_params["customer"] = customer_id

        session = st.checkout.Session.create(**session_params)
        return {"url": session.url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/cancel")
def cancel_subscription(authorization: str = Header(default="")):
    """Cancel the user's subscription at period end."""
    try:
        user_id = get_user_id(authorization)
        st = _get_stripe()
        supabase = get_supabase()

        sub = supabase.table("user_subscriptions").select("stripe_subscription_id").eq("user_id", user_id).execute()
        if not sub.data or not sub.data[0].get("stripe_subscription_id"):
            raise HTTPException(status_code=404, detail="No active subscription")

        st.Subscription.modify(
            sub.data[0]["stripe_subscription_id"],
            cancel_at_period_end=True
        )
        return {"cancelled": True, "message": "Subscription will cancel at end of billing period"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook — updates user_subscriptions on payment events.
    Must be registered at: https://dashboard.stripe.com/webhooks
    Endpoint URL: https://your-backend.onrender.com/billing/webhook
    Events to enable: checkout.session.completed, customer.subscription.updated,
                      customer.subscription.deleted
    """
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        st = _get_stripe()
        if webhook_secret:
            event = st.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            import json
            event = json.loads(payload)
            logger.warning("Stripe webhook signature verification skipped — set STRIPE_WEBHOOK_SECRET")
    except Exception as e:
        logger.error(f"Webhook signature error: {e}")
        return JSONResponse(status_code=400, content={"error": "Invalid signature"})

    supabase = get_supabase()
    event_type = event["type"]
    data = event["data"]["object"]

    try:
        if event_type == "checkout.session.completed":
            user_id = data.get("metadata", {}).get("user_id")
            if user_id and data.get("subscription"):
                period_end = None
                try:
                    sub = stripe.Subscription.retrieve(data["subscription"])
                    period_end = datetime.utcfromtimestamp(sub["current_period_end"]).isoformat()
                except Exception as sub_err:
                    logger.warning(f"Could not retrieve subscription details: {sub_err}")
                supabase.table("user_subscriptions").upsert({
                    "user_id": user_id,
                    "stripe_customer_id": data.get("customer"),
                    "stripe_subscription_id": data["subscription"],
                    "plan": "pro",
                    "status": "active",
                    "current_period_end": period_end,
                }, on_conflict="user_id").execute()
                logger.info(f"Pro subscription activated for user={user_id[:8]}")

        elif event_type == "customer.subscription.updated":
            customer_id = data.get("customer")
            status = data.get("status")
            plan = "pro" if status == "active" else "free"
            period_end = datetime.utcfromtimestamp(data["current_period_end"]).isoformat() if data.get("current_period_end") else None

            supabase.table("user_subscriptions") \
                .update({"plan": plan, "status": status, "current_period_end": period_end}) \
                .eq("stripe_customer_id", customer_id) \
                .execute()

        elif event_type == "customer.subscription.deleted":
            customer_id = data.get("customer")
            subscription_id = data.get("id")
            # Only downgrade if the deleted subscription matches the one on record
            existing = supabase.table("user_subscriptions") \
                .select("stripe_subscription_id") \
                .eq("stripe_customer_id", customer_id) \
                .execute()
            if existing.data and existing.data[0].get("stripe_subscription_id") == subscription_id:
                supabase.table("user_subscriptions") \
                    .update({"plan": "free", "status": "cancelled", "stripe_subscription_id": None}) \
                    .eq("stripe_customer_id", customer_id) \
                    .execute()
                logger.info(f"Subscription cancelled for customer={customer_id}")
            else:
                logger.info(f"Ignoring deletion of old subscription {subscription_id} for customer={customer_id}")

    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")

    return JSONResponse(content={"received": True})
