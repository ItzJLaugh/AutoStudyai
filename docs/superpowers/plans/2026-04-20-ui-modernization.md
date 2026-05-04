# UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize AutoStudyAI's frontend to Quizlet/Linear-level professional polish — Inter font, pill CTAs, elevated cards with physical depth, left-bar sidebar active state, and real logo mark — without changing layout structure or color theme variables.

**Architecture:** All visual changes live in `globals.css` (CSS) and `_app.js` (font import). The sidebar logo is updated in `Sidebar.js`. Both dark and light themes are handled using the existing `[data-theme="light"]` selector pattern already in the stylesheet. No new files needed.

**Tech Stack:** Next.js, vanilla CSS (CSS custom properties), Google Fonts (Inter), React

---

## File Map

| File | Change |
|---|---|
| `web/pages/_app.js` | Swap Lato → Inter font import (both `<Head>` blocks) |
| `web/styles/globals.css` | Font, buttons, sidebar active state, card elevation, section label utility |
| `web/components/Sidebar.js` | Logo: replace `<h1>` text with `<img>` + wordmark |

---

### Task 1: Swap font import from Lato to Inter

**Files:**
- Modify: `web/pages/_app.js:43` and `web/pages/_app.js:56`

- [ ] **Step 1: Replace both Google Fonts `<link>` tags in `_app.js`**

Change this (appears twice, lines ~43 and ~56):
```html
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" />
```
To this (same replacement both times):
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Commit**
```bash
git add web/pages/_app.js
git commit -m "feat: switch font from Lato to Inter"
```

---

### Task 2: Update base typography in globals.css

**Files:**
- Modify: `web/styles/globals.css:67-75`

- [ ] **Step 1: Replace body and button font families**

Change:
```css
body {
  font-family: 'Segoe UI', -apple-system, sans-serif;
  background: var(--bg-deepest);
  color: var(--text-primary);
  min-height: 100vh;
}

button, .btn, .tab-btn, input[type="submit"] {
  font-family: 'Lato', 'Segoe UI', -apple-system, sans-serif;
}
```
To:
```css
body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg-deepest);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

button, .btn, .tab-btn, input[type="submit"] {
  font-family: 'Inter', -apple-system, sans-serif;
}
```

- [ ] **Step 2: Commit**
```bash
git add web/styles/globals.css
git commit -m "feat: set Inter as app-wide font"
```

---

### Task 3: Pill-shaped CTA buttons

**Files:**
- Modify: `web/styles/globals.css:255-273`

- [ ] **Step 1: Update `.btn` and `.btn-outline` to pill shape**

Change:
```css
.btn {
  background: var(--accent); color: var(--bg-deepest); border: none;
  padding: 8px 20px; border-radius: var(--radius); cursor: pointer;
  font-size: 0.9em; font-weight: 600; transition: all 0.15s;
}
.btn:hover { background: var(--accent-secondary); }
.btn:active { background: var(--accent-dark); }
```
To:
```css
.btn {
  background: var(--accent); color: var(--bg-deepest); border: none;
  padding: 9px 22px; border-radius: 100px; cursor: pointer;
  font-size: 0.9em; font-weight: 700; transition: all 0.15s;
  letter-spacing: -0.01em;
  box-shadow: 0 2px 12px var(--accent-glow);
}
.btn:hover { background: var(--accent-secondary); box-shadow: 0 4px 16px var(--accent-glow); }
.btn:active { background: var(--accent-dark); }
```

Change:
```css
.btn-outline {
  background: transparent; border: 1px solid var(--border-default);
  color: var(--accent); padding: 8px 20px; border-radius: var(--radius);
  cursor: pointer; font-size: 0.9em; font-weight: 500; transition: all 0.15s;
}
.btn-outline:hover { background: var(--accent-glow); border-color: var(--accent); }
```
To:
```css
.btn-outline {
  background: transparent; border: 1.5px solid var(--border-default);
  color: var(--accent); padding: 8px 20px; border-radius: 100px;
  cursor: pointer; font-size: 0.9em; font-weight: 600; transition: all 0.15s;
  letter-spacing: -0.01em;
}
.btn-outline:hover { background: var(--accent-glow); border-color: var(--accent); }
```

- [ ] **Step 2: Commit**
```bash
git add web/styles/globals.css
git commit -m "feat: pill-shaped buttons with glow shadow"
```

---

### Task 4: Sidebar active state — left bar only, no background fill

**Files:**
- Modify: `web/styles/globals.css:100-112`

- [ ] **Step 1: Update sidebar tab styles**

Change:
```css
.sidebar-tab {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 20px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s ease;
  border-left: 3px solid transparent;
  font-size: 0.95em; user-select: none;
}
.sidebar-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
.sidebar-tab-active {
  background: var(--accent-glow); color: var(--accent);
  border-left-color: var(--accent); font-weight: 600;
}
.sidebar-tab svg { width: 20px; height: 20px; flex-shrink: 0; }
```
To:
```css
.sidebar-tab {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 20px; color: var(--text-muted);
  cursor: pointer; transition: color 0.15s ease;
  border-left: 3px solid transparent;
  font-size: 0.92em; user-select: none; letter-spacing: -0.01em;
}
.sidebar-tab:hover { color: var(--text-primary); }
.sidebar-tab-active {
  color: var(--text-primary);
  border-left-color: var(--accent); font-weight: 600;
}
.sidebar-tab svg { width: 18px; height: 18px; flex-shrink: 0; opacity: 0.5; }
.sidebar-tab-active svg { opacity: 1; }
```

- [ ] **Step 2: Commit**
```bash
git add web/styles/globals.css
git commit -m "feat: sidebar active state uses left bar only"
```

---

### Task 5: Elevated card treatment — dark mode

**Files:**
- Modify: `web/styles/globals.css:198-252`

- [ ] **Step 1: Update `.stat-card`, `.card`, `.folder-card` with lifted tile effect**

Change the `.stat-card` block:
```css
.stat-card {
  background: var(--card-glass); border: 1px solid var(--card-glass-border);
  border-radius: var(--radius-lg); padding: 18px; transition: all 0.2s;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.stat-card:hover { border-color: var(--border-default); box-shadow: var(--shadow-glow); }
```
To:
```css
.stat-card {
  background: var(--bg-secondary);
  border-top: 1px solid rgba(255,255,255,0.08);
  border-left: 1px solid rgba(255,255,255,0.05);
  border-right: 1px solid rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(0,0,0,0.3);
  border-radius: var(--radius-lg); padding: 18px; transition: box-shadow 0.2s;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset;
}
.stat-card:hover { box-shadow: 0 6px 22px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset; }
```

Change the `.card` block:
```css
.card {
  background: var(--card-glass); border: 1px solid var(--card-glass-border);
  border-radius: var(--radius); padding: 16px; margin-bottom: 10px;
  cursor: pointer; transition: all 0.2s;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.card:hover { border-color: var(--border-default); box-shadow: var(--shadow-sm); background: var(--bg-tertiary); }
```
To:
```css
.card {
  background: var(--bg-secondary);
  border-top: 1px solid rgba(255,255,255,0.07);
  border-left: 1px solid rgba(255,255,255,0.04);
  border-right: 1px solid rgba(0,0,0,0.18);
  border-bottom: 1px solid rgba(0,0,0,0.25);
  border-radius: var(--radius-lg); padding: 16px; margin-bottom: 8px;
  cursor: pointer; transition: box-shadow 0.2s;
  box-shadow: 0 3px 12px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.05) inset;
}
.card:hover { box-shadow: 0 5px 18px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.07) inset; }
```

Change the `.folder-card` block:
```css
.folder-card {
  background: var(--card-glass); border: 1px solid var(--card-glass-border);
  border-radius: var(--radius-lg); padding: 20px; text-align: center;
  cursor: pointer; transition: all 0.2s;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.folder-card:hover { border-color: var(--accent); box-shadow: var(--shadow-glow); }
```
To:
```css
.folder-card {
  background: var(--bg-secondary);
  border-top: 1px solid rgba(255,255,255,0.07);
  border-left: 1px solid rgba(255,255,255,0.04);
  border-right: 1px solid rgba(0,0,0,0.18);
  border-bottom: 1px solid rgba(0,0,0,0.25);
  border-radius: var(--radius-lg); padding: 20px; text-align: center;
  cursor: pointer; transition: box-shadow 0.2s;
  box-shadow: 0 3px 12px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.05) inset;
}
.folder-card:hover { box-shadow: 0 5px 18px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.07) inset; border-color: var(--accent); }
```

- [ ] **Step 2: Commit**
```bash
git add web/styles/globals.css
git commit -m "feat: elevated card treatment with directional borders and depth shadow"
```

---

### Task 6: Light mode card elevation override

**Files:**
- Modify: `web/styles/globals.css` — add after the `[data-theme="light"]` block (after line 64)

- [ ] **Step 1: Add light mode card overrides inside the existing `[data-theme="light"]` block**

Inside the `[data-theme="light"] { ... }` block (lines 37–64), append these lines before the closing `}`:
```css
  --card-elevation-shadow: 0 3px 12px rgba(100,80,200,0.1), 0 1px 0 rgba(255,255,255,1) inset;
  --card-elevation-shadow-hover: 0 5px 18px rgba(100,80,200,0.16), 0 1px 0 rgba(255,255,255,1) inset;
```

Then after the `[data-theme="light"]` closing brace, add a new block:
```css
[data-theme="light"] .stat-card,
[data-theme="light"] .card,
[data-theme="light"] .folder-card {
  border-top: 1px solid rgba(255,255,255,0.95);
  border-left: 1px solid rgba(255,255,255,0.8);
  border-right: 1px solid rgba(0,0,0,0.06);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 3px 12px rgba(100,80,200,0.1), 0 1px 0 rgba(255,255,255,1) inset;
}
[data-theme="light"] .stat-card:hover,
[data-theme="light"] .card:hover,
[data-theme="light"] .folder-card:hover {
  box-shadow: 0 5px 18px rgba(100,80,200,0.16), 0 1px 0 rgba(255,255,255,1) inset;
}
```

- [ ] **Step 2: Commit**
```bash
git add web/styles/globals.css
git commit -m "feat: light mode card elevation override"
```

---

### Task 7: Section label utility class

**Files:**
- Modify: `web/styles/globals.css` — add after the `.section-header` block (~line 215)

- [ ] **Step 1: Add `.section-label` class after the `.section-header` block**

After the `.section-header h2 { ... }` rule, add:
```css
.section-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--text-muted); margin-bottom: 12px;
  display: block;
}
```

- [ ] **Step 2: Commit**
```bash
git add web/styles/globals.css
git commit -m "feat: add section-label utility class"
```

---

### Task 8: Sidebar logo — replace text with icon image + wordmark

**Files:**
- Modify: `web/components/Sidebar.js:39-41`

- [ ] **Step 1: Replace the text-only logo with image + text**

Change:
```jsx
<div className="sidebar-logo">
  <h1><span>Auto</span>StudyAI</h1>
</div>
```
To:
```jsx
<div className="sidebar-logo">
  <img src="/icon128.png" alt="AutoStudyAI" className="sidebar-logo-img" />
  <span className="sidebar-logo-text">AutoStudyAI</span>
</div>
```

- [ ] **Step 2: Update `.sidebar-logo` CSS in `globals.css` (line 93–98)**

Change:
```css
.sidebar-logo {
  padding: 20px;
  border-bottom: 1px solid var(--border-subtle);
}
.sidebar-logo h1 { font-size: 1.2em; color: var(--accent); font-weight: 700; letter-spacing: -0.5px; }
.sidebar-logo span { color: var(--text-primary); }
```
To:
```css
.sidebar-logo {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex; align-items: center; gap: 10px;
}
.sidebar-logo-img { width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0; }
.sidebar-logo-text {
  font-size: 13px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--text-primary);
}
```

- [ ] **Step 3: Commit**
```bash
git add web/components/Sidebar.js web/styles/globals.css
git commit -m "feat: sidebar logo uses icon128.png with wordmark"
```

---

## Verification

After all tasks complete:

1. `cd web && npm run dev`
2. Open `http://localhost:3000` — check login page font is Inter
3. Open `http://localhost:3000/dashboard` — verify:
   - Stat cards show visible depth (top-edge lighter, drop shadow below)
   - Sidebar active item has left purple bar, no background fill
   - Logo image renders in sidebar top-left
   - Primary buttons are pill-shaped
4. Toggle light mode (settings) — verify cards have white gradient fill, blue shadow, no invisible borders
5. Check `/flashcards`, `/guide/[id]` — confirm `.card` class elevation shows correctly, no regressions
