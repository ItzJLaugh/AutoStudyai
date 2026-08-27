# Cordia-Inspired UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Cordia-inspired visual system to AutoStudyAI without changing study, auth, capture, or backend behavior.

**Architecture:** Replace the current fixed three-column shell with an application header, left navigation rail, and flexible content canvas. A reusable `AcademicInfinityMark` is the only new UI component; existing pages retain their data/control logic and receive shared tokens/classes through the global stylesheet.

**Tech Stack:** Next.js 16, React 19, CSS custom properties, existing client-side localStorage theme preference.

**Spec:** `docs/superpowers/specs/2026-08-27-cordia-inspired-ui-design.md`

## Global Constraints

- Preserve AutoStudyAI name, study flows, auth semantics, backend routes, capture parsing, model prompts, and Chrome extension source files.
- Remove the standalone Notes navigation destination; retain SmartNotes data and redirect `/dashboard?view=notes` to `/smartnotes`.
- Use an original academic infinity SVG, never Cordia assets or wordmark.
- Default warm ivory light theme with a true usable dark option.
- All floating panels and cards use a subtle border, 16–20px radius, and restrained shadows.

---

### Task 1: Shared brand mark, fonts, and application shell

**Files:**
- Create: `web/components/AcademicInfinityMark.js`
- Modify: `web/pages/_app.js`, `web/components/Layout.js`, `web/styles/globals.css`

**Interfaces:**
- Produces: `AcademicInfinityMark({ className, title })`, an accessible inline SVG with an infinity-butterfly path and an open-book upper-right motif.
- Produces: `app-header`, `app-shell`, and `app-content` layout classes consumed by every authenticated page.

- [ ] **Step 1: Add a structural source check**

Create a Node check that asserts `AcademicInfinityMark.js` exports a component and that the global stylesheet declares the approved `--canvas`, `--surface`, `--ink`, and `--olive` tokens.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node tests/ui-shell-contract.test.js`  
Expected: failure because the component and token declarations do not exist.

- [ ] **Step 3: Implement the minimal shared shell**

Create the SVG component; update font loading in `_app.js`; replace the fixed streak aside with the header/content shell while retaining the timer state props for later placement. Declare shared light/dark tokens and responsive shell styles in `globals.css`.

- [ ] **Step 4: Run the check and frontend build**

Run: `node tests/ui-shell-contract.test.js; npm.cmd run build` from `web`.  
Expected: check and production build pass.

### Task 2: Navigation, SmartNotes consolidation, and profile menu

**Files:**
- Modify: `web/components/Sidebar.js`, `web/pages/dashboard.js`, `web/styles/globals.css`
- Test: `tests/ui-shell-contract.test.js`

**Interfaces:**
- Consumes: `AcademicInfinityMark`, `app-header` shell styles, existing `clearAuth`, `getUserEmail`, and `FeedbackModal`.
- Produces: a keyboard-accessible profile menu and no navigation path to `view=notes`.

- [ ] **Step 1: Extend the failing source check**

Assert that `mainTabs` contains `SmartNotes` but not `Notes`, profile-menu labels include Appearance, Settings, Billing, Send feedback, and Sign out, and dashboard redirects `view=notes` to `/smartnotes`.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node tests/ui-shell-contract.test.js`  
Expected: failure on Notes item and missing profile menu.

- [ ] **Step 3: Implement navigation and menu behavior**

Remove only the standalone Notes item, keep SmartNotes, add the header avatar trigger/menu, support Escape/outside click/route change dismissal, wire existing logout/feedback behavior, provide Settings/Billing routes, and redirect the legacy Notes dashboard view before page rendering.

- [ ] **Step 4: Run contract check and production build**

Run: `node tests/ui-shell-contract.test.js; npm.cmd run build` from `web`.  
Expected: pass.

### Task 3: Page visual migration and responsive verification

**Files:**
- Modify: `web/pages/index.js`, `web/pages/dashboard.js`, `web/pages/smartnotes.js`, `web/pages/settings.js`, `web/pages/install-extension.js`, `web/styles/globals.css`
- Test: `tests/ui-shell-contract.test.js`

**Interfaces:**
- Consumes: shared tokens/classes, existing page data and handlers.
- Produces: a consistent Cordia-inspired sign-in, dashboard, SmartNotes, settings, and installation surface with no changed API calls.

- [ ] **Step 1: Extend the source check**

Assert that login and install pages use `AcademicInfinityMark`, SmartNotes visible feature headings use `SmartNotes`, and `prefers-reduced-motion` is present in global styles.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node tests/ui-shell-contract.test.js`  
Expected: failure because pages still reference the old raster mark and generic Notes headings.

- [ ] **Step 3: Apply shared visual classes without changing handlers**

Replace brand-image markup with the mark component, normalize cards/buttons/inputs/modals through global classes, update the relevant visible labels, and add mobile/dark/reduced-motion CSS. Do not alter API request construction, SmartNotes editor state, or capture UI behavior.

- [ ] **Step 4: Run complete verification**

Run: `node tests/ui-shell-contract.test.js; npm.cmd run build` from `web`; inspect changed files with `git diff --check`.  
Expected: all pass with no whitespace errors.

### Task 4: Release

**Files:**
- Modify: source files from Tasks 1–3 and this plan/spec only.

- [ ] **Step 1: Confirm branch state and full build**

Run: `git status --short; npm.cmd run build` from `web`.

- [ ] **Step 2: Commit the UI redesign**

Run: `git add web docs/superpowers && git commit -m "Redesign AutoStudyAI with Cordia-inspired UI"`.

- [ ] **Step 3: Push main and verify hosting handoff**

Run: `git push origin main`. Confirm the push succeeds; Vercel receives its configured repository deployment automatically.
