# CordiaClassroom production release plan

Updated: 2026-09-14

## Release target

Market CordiaClassroom as a focused student product that reliably turns Canvas or captured course material into a class-organized study guide, then supports practice, Retain flashcards, and source-grounded tutoring.

The first public release is ready only when a new user can complete this path without developer help:

1. Create an account and return through email or Google authentication.
2. Connect Canvas with the guided token flow.
3. See current courses and upcoming work.
4. Create or automatically receive a guide from real course material.
5. Find the guide in its class and study it with Retain, quiz, and tutor help.
6. Understand failures, limits, billing, privacy, and how to recover.

## Current evidence

- Next.js production build passes for all 20 routes.
- 73 backend contracts and 9 frontend/browser contracts pass.
- Existing Canvas dashboard, secure file proxy, study-source review, guide generation, billing limits, learning profile, and extension capture contracts are present.
- Live backend health endpoint responds successfully.
- GitHub Actions verifies backend contracts, frontend contracts, the production build, and extension capture on pull requests.
- The repository does not contain a reproducible baseline for the complete Supabase schema.
- The live Classroom Supabase schema and RLS policies were audited; a reproducible schema baseline and advisor review remain open.
- Vercel preview deployment is enforced on pull requests.
- Browser access and refresh tokens are stored in local storage; this is compatible with the extension bridge but remains a public-release security risk to review.

## Implementation order

### P0 — trustworthy core path

- [x] Filter Canvas planner noise before applying the automatic-guide scan limit.
- [x] Preserve loaded Classroom data during partial API failures and provide an explicit retry state.
- [x] Normalize structured API errors before rendering them.
- [x] Synchronize Canvas courses to Classes with an immutable external course ID and idempotent updates.
- [x] Attach Canvas-created guides to the matching class automatically.
- [x] Show the actual synchronous generation state as `building`, `ready`, or `failed`; never invent a queue or imply success before a guide is saved.
- [ ] Test the complete real path: authentication → Canvas → source → generated guide → saved class.
- [x] Add structured server error reporting and a request ID visible to support without exposing student content.

### P0 — release safety

- [x] Add one CI workflow for backend contracts, frontend contracts, the production build, and extension browser capture.
- [ ] Commit a reviewed Supabase schema baseline, migrations, indexes, RLS policies, and rollback notes.
- [ ] Run Supabase security and performance advisors against the live project.
- [x] Add conservative frontend security headers without breaking authentication or the extension bridge.
- [ ] Review token storage with the extension authentication bridge before changing the current local-storage contract.
- [ ] Verify billing checkout, webhook idempotency, quota enforcement, cancellation, and failed-payment recovery in Stripe test mode.
- [ ] Verify database backup/restore and document frontend and backend rollback targets.
- [ ] Publish one privacy disclosure that matches actual Canvas, extension, AI, and analytics data use.
- [ ] Complete Chrome Web Store review with only the permissions required by current functionality.

### P1 — coherent learning experience

- [x] Replace the fixed right-side tutor card with one collapsible, resizable left Tutor sidebar shared across learning screens.
- [x] Let Tutor use the active guide, SmartNote, or session-attached PDF, DOCX, PPTX, image, or text file as explicit context.
- [ ] Let Tutor fetch an unsaved Canvas source directly without duplicating the extension capture pipeline.
- [x] Let Tutor create a practice-problem guide linked to the source guide and saved into the same class.
- [x] In Retain Mode, prefill `Explain this question` after an incorrect response and ground the answer in the current guide.
- [x] Store and display source type, title, and ID for every current guide-generation path and Tutor explanation.
- [ ] Keep generation prompts centralized, versioned, evaluated, and as short as the output contract permits.
- [ ] Add small quality evaluations for factual grounding, answer coverage, duplicate cards, and malformed output.

### P1 — visual and interaction system

- [ ] Consolidate font, color, radius, shadow, spacing, motion, and focus values into one token layer.
- [x] Use the current Cordia white, black, and dark olive identity; remove decorative labels and duplicated headings from the primary learning screens.
- [ ] Use one information hierarchy: page title, primary action, content windows, contextual Tutor.
- [x] Make Tutor resize and collapse behavior predictable, keyboard accessible, and preference-persistent.
- [ ] Meet WCAG 2.2 AA contrast, focus visibility, target size, reduced-motion, and responsive layout requirements.
- [ ] Test the five critical screens at phone, tablet, laptop, and wide desktop sizes.

### P2 — after the public beta is stable

- [ ] Replace manual Canvas tokens with institution-approved Canvas OAuth where schools provide developer-key access.
- [ ] Add opt-in calendar reminders with clear authorization and undo behavior.
- [ ] Add institution onboarding, educator controls, and administrative reporting only after student demand is proven.

## Release gates

Every item below needs current evidence, not a configured or mocked state:

- Two fresh user accounts complete sign-up, sign-in, reset, sign-out, and session recovery.
- Two Canvas domains connect and refresh without exposing credentials to Cordia UI or logs.
- PDF, PPTX, Canvas file, ordinary webpage, selected text, and unsupported-source failure paths are exercised.
- Generated guides retain source provenance, save once, land in the correct class, and survive refresh.
- Quiz, Retain, SmartNotes, and Tutor use the selected guide and do not invent missing source content.
- Free and paid limits behave correctly across UI, API, database, and Stripe webhook retries.
- API outage, AI timeout, Canvas expiry, database failure, and partial response states are understandable and recoverable.
- CI is green from a clean checkout, then the Vercel preview receives keyboard, responsive, and browser smoke tests.
- Production deployment, health checks, logs, and rollback are verified before marketing traffic is enabled.

## Product rules

- Extend an existing owner before adding a new service, agent, connector, or state store.
- Remove duplicated UI or logic when a shared path replaces it.
- Never render configured, requested, or queued capability as verified live behavior.
- Never hide an operational failure as an empty student library.
- Do not claim generated content is grounded unless its source IDs are stored and retrievable.
- Prefer one clear action and progressive disclosure over dense dashboards.
