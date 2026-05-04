# AutoStudyAI UI Modernization — Design Spec
**Date:** 2026-04-20  
**Status:** Approved

---

## Context

The current AutoStudyAI frontend uses system fonts (Segoe UI), a pill-less button style, a background-highlight active nav indicator, and flat cards with no depth. The result looks like a personal project rather than a 100,000-user SaaS platform. The goal is to bring the UI to Quizlet/Linear/Notion-level polish — consistent, professional, and visually clear — without changing the layout (3-column: sidebar + main + streak panel) or color theme (purple accent `#a78bfa`).

Reference: orbit media 27 web design tips — specifically visual hierarchy (#1), use color for CTAs (#14), descriptive navigation (#15), meaningful subheads (#20), and serial position / section labeling (#23).

---
## Test Case Changes Documented ##
### Frontend changes: ###
1. logo image in top right next to "AutoStudyAI" not showing actual logo image 
2. Number count of the study guides, flashcards, avg quiz score, and minutes today is too large/bold. decrease the size slightly
3. when hovering over a card option for study guides at bottom of dashboard (where study guides are listed), create a left to right "shine" live visual that gives the user a sense of interaction to click it.
4. the "new class" card seems too project-like. change the font to the same as the "Dashboard" title's font and remove dotted line border and box in general. There should be an invisible box and seem as if it is only showing new class and the addition/plus symbol
5. AutoStudyAI logo does not follow orginal color them where StudyAI is a different color (purple or blue) than Auto (white or black).
6. Complete login page redesign to follow the exact ui of the screenshot image found in the same specs/ folder as this .md file (disregard the human visual art and instead replace it with the autostudyai logo - modifying it to be transparent to the ui)
7. In Study guides, the search guides search bar is very project like. remove the  grayish outline and make the search guide text more transparent and give the search bar box a 3d illusion (fade and popout illusion)
8. in flashcards, when practicing a flashcard set, the "study again" and "got it" buttons are very project-like. simply keep the text and outline border the green and red color but make the background of the button the lighter purple color (seem in left adn right side bars) 
9. in flashcards, when practicing a flashcard set, remove the flashcard border that has the lighter purple outline and instead, do not give it an outline/border, but give the flashcard a 3d popout illusion.
10. for the loading content loading visual, change "loading your content" to fit the font of inter and the correlating color theme
11. for all buttons, remove the outline border color. instead just add the 3d popout illusion
12. as created in the plan mode ui prototype, as the left indicator 
## Backend modifcations to align with UI ##
13. In flashcards, create an option to go back to the previous flashcard 
14. In flashcards, add a progress tracker that complies with the new UI modifcations and themes. It should show the amount the use rhas gotten right, amount they have gotten wrong, and amount they still need to learn (got wrong and right). If they get the card wrong the first time, they should see the card again to practice it again.

## Design Decisions (Finalized via Visual Brainstorming)

| Decision | Choice | Reason |
|---|---|---|
| Font | **Inter** (all weights 400–800) | SaaS standard (Figma, Linear, Vercel); superior legibility at small sizes |
| Sidebar active state | **Left 3px gradient bar** (purple → indigo) | Matches VS Code / GitHub; clean, not boxy |
| Nav items | **Icon + Label** with section group labels | Industry standard; removes "plain text list" project look |
| CTA button shape | **Pill (border-radius: 100px)** | Quizlet/Notion style; clearly primary at a glance |
| Card elevation | **Lifted tile**: top-edge highlight border + subtle gradient fill + drop shadow | Physical depth without glow overdose; works in both themes |
| Logo mark | **icon128.png** (book + molecule) | Real brand anchor vs letter placeholder |
| Decorative effects | **None** — no ambient orbs, no gradient text, no color-coded scores | Professional restraint; glows read as "AI project" |
| Section labels | **UPPERCASE 10px labels** above content groups | Quizlet pattern; creates visual hierarchy and scanability |

---

## Files to Modify

### 1. `web/pages/_app.js`
- Replace Google Fonts import: `Lato` → `Inter` (weights 400, 500, 600, 700, 800)
- Keep existing font link tag structure

### 2. `web/styles/globals.css`
Primary change file. Specific updates:

**Typography:**
```css
body { font-family: 'Inter', -apple-system, sans-serif; }
button, .btn, input[type="submit"] { font-family: 'Inter', sans-serif; }
```

**Button — pill shape:**
```css
.btn { border-radius: 100px; font-weight: 700; letter-spacing: -0.01em; }
```
Primary CTA gets `box-shadow: 0 2px 14px rgba(167,139,250,0.3)` in dark mode.

**Card elevation — dark mode:**
```css
.card, .stat-card, .folder-card, .guide-card {
  background: linear-gradient(160deg, #1e1a3a 0%, #171430 100%);
  border-top: 1px solid rgba(255,255,255,0.1);     /* top light edge */
  border-left: 1px solid rgba(255,255,255,0.06);
  border-right: 1px solid rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(0,0,0,0.4);
  box-shadow: 0 6px 20px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.08) inset;
}
```

**Card elevation — light mode:**
```css
[data-theme="light"] .card, [data-theme="light"] .stat-card ... {
  background: linear-gradient(160deg, #ffffff 0%, #f4f0ff 100%);
  border-top: 1px solid rgba(255,255,255,0.95);
  border-bottom: 1px solid rgba(124,58,237,0.12);
  box-shadow: 0 4px 16px rgba(100,80,200,0.12), 0 1px 0 rgba(255,255,255,1) inset;
}
```

**Section labels pattern (new utility class):**
```css
.section-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--text-muted); margin-bottom: 12px;
}
```

**Nav item spacing increases:**
- Nav item padding: `8px 14px` → `10px 18px`
- Gap between nav groups: add `margin-top: 8px` on second group

### 3. `web/components/Sidebar.js`
- Import logo: `<img src="/icon128.png">` (32×32, border-radius: 8px) in logo row
- Add SVG icons inline for each nav item (Dashboard, Create Guide, Study Guides, Flashcards, Classes, Settings)
- Add section group label "Your Classes" above class list items
- Add `::before` pseudo-element active bar via CSS class `nav-active` 
- Move user email + logout to a bottom user row (already in footer, restructure slightly)
- Remove old `.active` background-highlight style; rely on new CSS class

### 4. `web/pages/dashboard.js`
- Add `<div className="section-label">Recent Guides</div>` above guide list
- Add `<div className="section-label">Stats</div>` above stats grid (optional — check if it helps or clutters)

---

## What Does NOT Change

- Color variables (`--accent`, `--bg-primary`, etc.) — keep all existing CSS custom properties
- 3-column layout (sidebar + main + streak panel)
- Responsive breakpoints (1100px, 768px)
- All existing component functionality (flashcards, quiz, NCLEX, AI chat)
- Light mode accent (`#2196f3` blue) — only border/shadow values update to match the blue theme

---

## Orbit Media Tips Applied

| Tip | Application |
|---|---|
| #1 Visual hierarchy | Bolder page titles (800 weight), section labels, pill CTA pops above content |
| #5 Show one thing at a time | Section labels divide dashboard into scannable zones |
| #6 Standard layouts | 3-column retained; sidebar left — conventional |
| #14 Color for CTAs | Pill CTA uses `--accent` with glow shadow; clearly stands out |
| #15 Descriptive navigation | Nav labels kept specific ("Create Guide" not "New") |
| #20 Meaningful subheads | Section labels above content groups |

---

## Verification

1. Start dev server: `cd web && npm run dev`
2. Open `http://localhost:3000/dashboard` — verify dashboard cards have visible but not overdone depth
3. Toggle light mode — verify card borders and shadows translate correctly (no invisible cards on white bg)
4. Check sidebar: logo image loads, icons render, active bar visible on current page
5. Verify responsive: at 768px sidebar collapses correctly, no icon layout breaks
6. Check all pages that use `.card` class: `/guide/[id]`, `/flashcards`, `/quiz/[id]` — no regressions

---

## Out of Scope

- Login page redesign (separate task)
- Right streak panel redesign
- Mobile nav redesign
- Flashcard 3D flip card style changes
