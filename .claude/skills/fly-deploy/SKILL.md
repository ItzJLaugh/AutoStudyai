---
name: fly-deploy
description: Deploy the FastAPI backend to Fly.io and tail logs to confirm success. Use when the user asks to deploy, ship, or push backend changes.
disable-model-invocation: true
---

Deploy the backend to Fly.io and watch the logs for 15 seconds to catch any startup errors.

Steps:
1. Run `cd backend && fly deploy` and wait for it to complete.
2. Run `cd backend && fly logs` — report any ERROR or WARN lines. If clean, confirm the deploy succeeded.
