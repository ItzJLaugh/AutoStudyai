# AutoStudyAI Cordia-Inspired UI — Design Spec

**Date:** 2026-08-27  
**Status:** Approved for specification

## Goal

Rebuild the AutoStudyAI web interface into a calm, polished study workspace inspired by the supplied Cordia references: warm ivory surfaces, near-black type, muted olive accents, clear hierarchy, and white panels with soft physical depth. Preserve AutoStudyAI as the product name and preserve all existing product behavior.

## Product Decisions

### Navigation and information architecture

- Keep the current left navigation rail, but make it airier and white rather than purple/dark.
- Remove the standalone **Notes** navigation item. **SmartNotes** is the only notes workspace.
- Keep saved-note data and the SmartNotes editor unchanged. Requests to the prior `/dashboard?view=notes` view redirect to `/smartnotes` so existing links do not dead-end.
- Replace the fixed right-side streak rail with dashboard content cards. Study streak, focus timer, and AI chat remain usable; they are moved or restyled only where required by the responsive shell.
- Add a top application bar for the AutoStudyAI mark, context navigation, and a user avatar trigger.

### Brand mark and typography

- Add an original vector **Academic Infinity Mark** for the web application: the infinity-butterfly silhouette from the reference direction with a small open-book/pages motif in the top-right in place of generic pixels.
- Do not use Cordia’s name, wordmark, image files, or a confusingly similar copied logo.
- Use a refined serif display face for major page and marketing headings; use a clean rounded sans-serif for controls, navigation, body copy, and forms. The combination should reproduce the Cordia visual *style*, not its exact branded typography.
- Use the mark in the sign-in page, top bar, navigation rail, profile surface, and extension-install page. Extension packaging assets stay unchanged.

### Theme and surfaces

- Default to a light, warm-ivory workspace with charcoal text, white surfaces, subtle neutral borders, and muted olive/sage accent states.
- Keep a true dark appearance option using near-black and charcoal surfaces, off-white text, and the same restrained olive accent family.
- Define a small shared token system in `globals.css` for canvas, surface, raised surface, text, muted text, border, accent, focus, and shadow values. Existing page-specific colors should consume these tokens where practical.
- Cards, dropdowns, and modal sheets use 16–20px rounded corners, a faint border, and soft offset shadows. Hovering a card gives a small lift; it must not use gradients, glow effects, or noisy animations.

### Header, profile menu, and controls

- The top bar shows the AutoStudyAI academic mark and product name on the left, page-level navigation or utility actions in the middle/right, and an avatar trigger on the far right.
- Clicking the avatar opens a floating, shadowed profile menu with: account identity, appearance (Light/Dark), Settings, Billing, Send feedback, and Sign out.
- The menu closes on Escape, outside click, route navigation, and its action completion. It uses semantic buttons/links and correct focus behavior.
- Primary actions use a deep olive fill with white text. Secondary controls are white raised buttons with dark text. Destructive actions remain clearly red but restrained.

### Page adaptations

- **Sign-in:** center the familiar login/create-account segmentation inside a large elevated white surface with AutoStudyAI branding above it.
- **Dashboard:** retain guide, class, and study data; reorganize it as a clean content canvas with clearly titled panels. The current right rail does not remain fixed.
- **SmartNotes:** retain editor behavior, saved sessions, and conversion flows. Rename visible generic “Notes” headings to **SmartNotes** where they mean the product feature.
- **Study, flashcards, quiz, guide, settings, and install-extension:** keep their data flows and calls untouched; normalize their typography, cards, buttons, forms, empty states, and overlays to the shared system.
- **Capture review and other dialogs:** use elevated modal sheets over a quiet ivory scrim. No capture logic or locked extension source files are changed.

## Implementation Boundaries

Expected files include:

- `web/styles/globals.css` — theme tokens, shell, shared panels, controls, modal, responsive rules.
- `web/components/Layout.js` and `web/components/Sidebar.js` — new application shell, SmartNotes-only navigation, profile menu trigger, and preservation of existing widgets.
- A new small web-only `web/components/AcademicInfinityMark.js` — reusable accessible SVG mark.
- `web/pages/index.js`, `dashboard.js`, `smartnotes.js`, `settings.js`, and `install-extension.js` — page-level markup/classes needed to adopt the shared system.
- `web/pages/_app.js` — approved font loading and application-wide theme initialization if needed.

No backend routes, capture parsing, model prompts, Chrome extension capture files, database schema, authentication semantics, or study generation behavior change as part of this work.

## Error Handling and Accessibility

- Theme selection persists through the app’s existing local preference mechanism and falls back to light if unavailable.
- The profile menu is usable by mouse and keyboard, visible in both themes, and does not trap users behind an overlay.
- Navigation retains accessible labels and active-route indication. The academic mark has a text alternative or is treated as decorative beside product text.
- Reduced-motion preferences disable nonessential lift and transition effects.

## Verification

1. Run the frontend production build.
2. Check light and dark themes on sign-in, dashboard, SmartNotes, settings, guide, flashcards, quiz, and extension-install pages.
3. Verify the profile dropdown actions, outside-click dismissal, Escape dismissal, keyboard focus, sign-out, feedback, theme switching, and Settings/Billing links.
4. Verify the sidebar has no separate Notes item and `/dashboard?view=notes` lands in SmartNotes.
5. Verify guide creation, content capture review, SmartNotes editing, saved-note loading, and study flows still operate without a code-path change.
6. Check desktop and mobile breakpoints for the top bar, navigation, card grid, dropdown, and modal sheets.

## Out of Scope

- Changing AutoStudyAI’s product name.
- Reusing Cordia’s name, wordmark, proprietary brand assets, or exact logo.
- Publishing a new Chrome extension package or changing its packaged icon.
- Backend/model/capture simplification work already completed in the universal-capture release.
