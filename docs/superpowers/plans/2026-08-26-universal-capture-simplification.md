# Universal Capture Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task.

**Goal:** Replace automatic site-specific capture with universal capture, review, and selected-source generation.

**Architecture:** The extension captures selected text or readable page text and sends it to ingest. Ingest stores raw content plus structured educational sections; the popup lets the student select sections before explicit generation.

**Tech Stack:** Manifest V3 Chrome extension, JavaScript, FastAPI, Pydantic, OpenAI Chat Completions, Python unittest, Next.js.

**Spec:** `docs/superpowers/specs/2026-08-26-universal-capture-simplification-design.md`

## Global Constraints

- Default capture is selection, readable page text, then one screenshot fallback.
- Do not bypass authentication or fetch content outside the student browser context.
- Preserve explicit PDF, DOCX, PPTX, image, and slideshow fallbacks until tested replacements exist.
- Selection uses structured JSON and fails closed; final generation uses only approved sections.
- Keep GPT-4o final generation and use GPT-4o-mini for selection.
- Check usage only on explicit generation.

## File Structure

| File | Responsibility |
|---|---|
| `extension/content.js` | Generic selection/main-content extractor. |
| `extension/popup.js`, `popup.html`, `styles.css` | Review UI and explicit generation. |
| `extension/background.js` | Separate authenticated ingest and generate calls. |
| `backend/schemas.py` | Section request/response contract. |
| `backend/services/llm.py` | Structured section selector. |
| `backend/main.py` | Preview storage and selected-source generation. |
| `tests/test_universal_capture_contract.py` | Backend tests. |
| `tests/test_extension_capture_contract.py` | Extension boundary tests. |

### Task 1: Define and test the selection contract

**Files:** Modify `backend/schemas.py`; create `tests/test_universal_capture_contract.py`.

- [ ] Write a failing test: `GenerateRequest(content_id='capture-1', section_ids=['section-1'])` preserves the list.
- [ ] Run `python -m unittest tests.test_universal_capture_contract -v`; expect failure because `section_ids` is unknown.
- [ ] Add `EducationalSection(id, heading, text)` with `section-N` IDs and bounded strings. Add `GenerateRequest.section_ids`; add `IngestResponse.is_educational`, `sections`, and `excluded_summary` defaults.
- [ ] Re-run the test; expect pass.
- [ ] Commit with `git add backend/schemas.py tests/test_universal_capture_contract.py` followed by `git commit -m "feat: define educational section contract"`.

### Task 2: Add structured educational selection

**Files:** Modify `backend/services/llm.py`; modify `tests/test_universal_capture_contract.py`.

- [ ] Write failing tests that `parse_educational_selection` returns no sections for `is_educational=false`, assigns `section-1` to the first valid section, and returns no sections for malformed JSON.
- [ ] Run the focused unittest; expect failure because the parser is absent.
- [ ] Add `parse_educational_selection(raw_json)` and `select_educational_sections(raw_text)`. Use `gpt-4o-mini`, `temperature=0`, and JSON-only output: keep study material only, remove navigation/account/menu/date/link/admin noise, preserve heading/order, return no sections if there is no material. Validate strings, remove blanks, assign stable IDs, and fail closed.
- [ ] Re-run tests; expect pass.
- [ ] Commit with `git add backend/services/llm.py tests/test_universal_capture_contract.py` followed by `git commit -m "feat: select educational sections"`.

### Task 3: Store preview and generate from approved sections

**Files:** Modify `backend/main.py`; modify `tests/test_universal_capture_contract.py`.

- [ ] Write a failing test where stored `section-1` then `section-2` remain in stored source order even when the request lists `section-2`, `section-1`; test unknown/empty selection returns no source.
- [ ] Run the focused unittest; expect failure because `selected_section_text` is absent.
- [ ] Add `selected_section_text(selection, section_ids)`. In `/ingest`, run selection, store it as `metadata['selection']`, and return it. In `/generate`, use requested IDs in stored order, reject explicit empty/unknown selection with HTTP 422, and retain the old normalization only for legacy content without selection metadata. Remove normal browser generation’s dependence on `clean_text` and slideshow markers.
- [ ] Re-run tests; expect pass.
- [ ] Commit with `git add backend/main.py tests/test_universal_capture_contract.py` followed by `git commit -m "feat: generate from approved sections"`.

### Task 4: Make generic capture the default

**Files:** Modify `extension/content.js`; create `tests/test_extension_capture_contract.py`.

- [ ] Write a failing contract test asserting the `extractContent` handler calls `extractUniversalContent()` and does not call `captureAllSlides`.
- [ ] Run `python -m unittest tests.test_extension_capture_contract -v`; expect failure because default capture traverses slides.
- [ ] Add `extractUniversalContent()`: selected text first; otherwise clone `main`, `article`, `[role="main"]`, or `body`; remove only `nav`, `header`, `footer`, `[role="navigation"]`, `script`, and `style`; return visible text and meaningful images; return empty content below 50 characters. Preserve explicit PDF/PPTX/screenshot/slideshow handlers but do not dispatch them by default.
- [ ] Re-run tests; expect pass.
- [ ] Commit with `git add extension/content.js tests/test_extension_capture_contract.py` followed by `git commit -m "feat: use universal browser capture"`.

### Task 5: Add review before explicit generation

**Files:** Modify `extension/background.js`, `extension/popup.js`, `extension/popup.html`, `extension/styles.css`; modify `tests/test_extension_capture_contract.py`.

- [ ] Write failing tests asserting separate `ingestContent` and `generateContent` messages and `id="generate-selected-btn"` in the popup.
- [ ] Run extension contract tests; expect failure because the worker currently chains ingest directly into generation.
- [ ] Split the worker’s `sendContent` operation into authenticated ingest and generate operations. In popup, render all returned sections as checked checkboxes, display excluded summary, and enable `Generate study materials` only with at least one selection. If generic capture is empty, use one visible-tab screenshot through the existing image ingest path. Retain current results and save-to-platform behavior after explicit generation.
- [ ] Re-run extension contract tests; expect pass.
- [ ] Commit with `git add extension/background.js extension/popup.js extension/popup.html extension/styles.css tests/test_extension_capture_contract.py` followed by `git commit -m "feat: review sections before generation"`.

### Task 6: Verify and release

**Files:** Modify only for an observed verification defect.

- [ ] Run `python -m unittest tests.test_universal_capture_contract tests.test_extension_capture_contract tests.test_smartnotes_upload_contract -v`; expect all pass.
- [ ] Run `python -m compileall backend` and `cd web && npm.cmd run build`; expect exit 0.
- [ ] Manually verify generic page, selected text, Canvas-like page, PDF, PPTX, and image-only page: review must appear before generation and only checked sections can generate.
- [ ] Commit all verified code, push `main`, run `cd backend && fly deploy`, inspect `fly logs`, then verify the public web and installed extension path.
