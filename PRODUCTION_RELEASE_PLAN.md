# CordiaClassroom production release plan

Updated: 2026-09-15

## Release target

Market CordiaClassroom as a focused student product that reliably turns Canvas or captured course material into a class-organized study guide, then supports practice, Retain flashcards, and source-grounded tutoring.

The first public release is ready only when a new user can complete this path without developer help:

1. Create an account and return through email or Google authentication.
2. Add the user's read-only Canvas calendar-feed link without an API token or connector account.
3. See work due today and upcoming work.
4. Create a guide from real course material captured by the browser extension or uploaded directly.
5. Find the guide in its class and study it with Practice, Retain, quiz, and Tutor help.
6. Understand failures, limits, billing, privacy, and how to recover.

## Current evidence

- Next.js production build passes for all 20 routes.
- 75 backend contracts and 9 frontend/browser contracts pass.
- Canvas calendar reminders, secure file proxy, study-source review, guide generation, billing limits, learning profile, and extension capture contracts are present.
- Live backend health endpoint responds successfully.
- GitHub Actions verifies backend contracts, frontend contracts, the production build, and extension capture on pull requests.
- The repository does not contain a reproducible baseline for the complete Supabase schema.
- The live Classroom Supabase schema and RLS policies were audited; a reproducible schema baseline and warning remediation remain open.
- The RLS hardening migration passed against the live schema inside a rolled-back transaction; all 17 original direct-write policies remained after validation.
- Live Supabase advisors report 0 security errors and 0 performance errors. Remaining warnings cover leaked-password protection and per-row RLS auth evaluation; the hardening migration addresses the unsafe profile policy and signup-function warnings.
- Vercel preview deployment is enforced on pull requests.
- Browser access and refresh tokens are stored in local storage; this is compatible with the extension bridge but remains a public-release security risk to review.

## Implementation order

### P0 — trustworthy core path

- [x] Preserve loaded Classroom data during partial API failures and provide an explicit retry state.
- [x] Normalize structured API errors before rendering them.
- [x] Replace the Canvas API/Pipedream connector with a read-only calendar-feed preview that stores its link only in the user's browser.
- [x] Show the actual synchronous generation state as `building`, `ready`, or `failed`; never invent a queue or imply success before a guide is saved.
- [ ] Test the complete real path: authentication → captured or uploaded source → generated guide → saved class.
- [x] Add structured server error reporting and a request ID visible to support without exposing student content.

### P0 — release safety

- [x] Add one CI workflow for backend contracts, frontend contracts, the production build, and extension browser capture.
- [x] Audit live Classroom RLS and add a rollback-validated migration that removes the duplicate authenticated write surface.
- [ ] Commit a reviewed Supabase schema baseline, migrations, indexes, RLS policies, and rollback notes.
- [x] Run Supabase security and performance advisors against the live project.
- [x] Add conservative frontend security headers without breaking authentication or the extension bridge.
- [ ] Review token storage with the extension authentication bridge before changing the current local-storage contract.
- [ ] Verify billing checkout, webhook idempotency, quota enforcement, cancellation, and failed-payment recovery in Stripe test mode.
- [ ] Verify database backup/restore and document frontend and backend rollback targets.
- [ ] Publish one privacy disclosure that matches actual Canvas, extension, AI, and analytics data use.
- [ ] Complete Chrome Web Store review with only the permissions required by current functionality.

### P1 — coherent learning experience

- [x] Replace the fixed right-side tutor card with one collapsible, resizable left Tutor sidebar shared across learning screens.
- [x] Let Tutor use the active guide, SmartNote, or session-attached PDF, DOCX, PPTX, image, or text file as explicit context.
- [x] Let Tutor use an explicitly selected guide, SmartNote, browser capture, or uploaded file without duplicating the extension capture pipeline.
- [x] Let Tutor create a practice-problem guide linked to the source guide and saved into the same class.
- [x] In Retain Mode, prefill `Explain this question` after an incorrect response and ground the answer in the current guide.
- [x] Store and display source type, title, and ID for every current guide-generation path and Tutor explanation.
- [ ] Keep generation prompts centralized, versioned, evaluated, and as short as the output contract permits.
- [x] Reject malformed Q&A, require answer coverage, and remove duplicate flashcards through one shared parser.
- [ ] Add a small factual-grounding evaluation set using reviewed course-source fixtures.

### P1 — visual and interaction system

- [ ] Consolidate font, color, radius, shadow, spacing, motion, and focus values into one token layer.
- [x] Use the current Cordia white, black, and dark olive identity; remove decorative labels and duplicated headings from the primary learning screens.
- [ ] Use one information hierarchy: page title, primary action, content windows, contextual Tutor.
- [x] Make Tutor resize and collapse behavior predictable, keyboard accessible, and preference-persistent.
- [ ] Meet WCAG 2.2 AA contrast, focus visibility, target size, reduced-motion, and responsive layout requirements.
- [ ] Test the five critical screens at phone, tablet, laptop, and wide desktop sizes.

### P2 — after the public beta is stable

- [x] Add opt-in Canvas calendar-feed reminders with clear authorization and disconnect behavior.
- [ ] Reconsider institution-approved Canvas OAuth only if a school supplies a developer key and student demand justifies the connector.
- [ ] Add institution onboarding, educator controls, and administrative reporting only after student demand is proven.

## Release gates

Every item below needs current evidence, not a configured or mocked state:

- Two fresh user accounts complete sign-up, sign-in, reset, sign-out, and session recovery.
- Two Canvas calendar-feed domains preview and refresh without exposing account credentials to Cordia UI or logs.
- PDF, PPTX, Canvas file, ordinary webpage, selected text, and unsupported-source failure paths are exercised.
- Generated guides retain source provenance, save once, land in the correct class, and survive refresh.
- Quiz, Retain, SmartNotes, and Tutor use the selected guide and do not invent missing source content.
- Free and paid limits behave correctly across UI, API, database, and Stripe webhook retries.
- API outage, AI timeout, expired calendar feed, database failure, and partial response states are understandable and recoverable.
- CI is green from a clean checkout, then the Vercel preview receives keyboard, responsive, and browser smoke tests.
- Production deployment, health checks, logs, and rollback are verified before marketing traffic is enabled.

## Product rules

- Extend an existing owner before adding a new service, agent, connector, or state store.
- Remove duplicated UI or logic when a shared path replaces it.
- Never render configured, requested, or queued capability as verified live behavior.
- Never hide an operational failure as an empty student library.
- Do not claim generated content is grounded unless its source IDs are stored and retrievable.
- Prefer one clear action and progressive disclosure over dense dashboards.
