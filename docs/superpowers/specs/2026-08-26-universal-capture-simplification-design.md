# Universal Capture Simplification — Design Spec

**Date:** 2026-08-26  
**Status:** Proposed

## Goal

Make AutoStudyAI reliably turn student-authorized course material into study assets with a small, understandable pipeline. The system must identify educational material before generation, let the student choose it, and preserve the source text used for every result.

## Problem in the Current Flow

The extension runs a long, platform-specific sequence (PDF detection, slideshow detection, slide navigation, PPTX download/parsing, page extraction), sends the result to `/ingest`, and immediately calls `/generate`. The backend then runs a large keyword/regex cleaner before generation.

This creates two failures:

1. The capture layer guesses too much about each LMS/site instead of capturing the student-visible source.
2. The student never sees what was accepted or removed before AI generation consumes usage.

## Product Contract

AutoStudyAI does not promise to extract every protected or inaccessible source. It promises:

> From material the student can view or upload, AutoStudyAI captures the best usable source, identifies the study-worthy sections, and lets the student approve them before generating.

The product never follows unrelated links, downloads content in the background, or bypasses access controls.

## New Flow

```text
Student selection or current page
  -> generic browser extraction
  -> /ingest stores raw source
  -> educational-material selection
  -> popup review and section selection
  -> /generate receives selected section IDs
  -> notes, guide, and flashcards
```

### 1. Generic Browser Extraction

`extension/content.js` becomes a small extraction boundary:

1. Capture non-empty user selection when present.
2. Otherwise capture visible text from `main`, `article`, or `[role=main]`; fall back to `document.body`.
3. Remove only semantic chrome (`nav`, `header`, `footer`, `[role=navigation]`) from the cloned element before reading text.
4. Include the title and current URL.
5. When readable text is too short, capture one visible-tab screenshot as the image fallback.

The normal path does not detect Canvas, Moodle, Blackboard, Google Slides, or other brands. It does not fetch an authenticated URL with `curl`; the extension runs in the student’s authenticated browser context.

### 2. Supported Input Boundaries

Keep file extraction as a separate, explicit capability because files cannot be reduced to DOM text:

- PDF, DOCX, PPTX, plain text: existing authenticated `/extract-file-text` endpoint.
- Image/scanned source: existing vision extraction path.
- Multi-page slides: retain the existing slide/PPTX capture implementation only as an explicit fallback if generic capture cannot obtain enough readable content. It is not part of default page capture.

The refactor must not delete proven file or visual extraction paths without a replacement test. It removes their automatic, brand-specific dispatch from the normal capture path.

### 3. Educational-Material Selection

Add one server function, `select_educational_sections(raw_text)`, using structured JSON from a low-cost model. Its system instruction is universal:

> Return only material a student should study. Exclude navigation, account controls, menus, dates, unrelated links, and administrative text. Preserve source order and headings. If no meaningful educational material exists, say so.

Its output is bounded to:

```json
{
  "is_educational": true,
  "title": "Lecture 4: Cellular Respiration",
  "sections": [
    {"id": "section-1", "heading": "Glycolysis", "text": "..."}
  ],
  "excluded_summary": "Canvas navigation and due-date text"
}
```

The raw source remains in temporary user-owned storage. The selected sections and their stable IDs are stored in metadata. No regex catalog decides educational relevance.

### 4. Review Before Generation

`/ingest` returns the selection result. The extension popup renders a compact review state:

- source title and URL
- number of sections found
- checkbox per section, all selected by default
- `Generate study materials` button
- a clear no-content/error state with file upload or screenshot guidance

The background worker no longer calls `/generate` immediately. It returns ingest data to the popup. The popup supplies chosen section IDs when it asks the background worker to generate.

### 5. Generation Contract

`GenerateRequest` gains optional `section_ids`. When supplied, `/generate` concatenates only matching stored section text in source order. When omitted, it uses all stored selected sections for backwards compatibility.

The study guide prompt remains source-grounded. Each stored section keeps its heading and source order, allowing future source citations such as `Lecture 4 / Glycolysis` without another schema migration.

## Model Use

- Educational section selection: `gpt-4o-mini` with structured JSON because the task is classification/extraction, not final reasoning.
- Visual/image fallback and final study-guide output: keep current GPT-4o behavior initially.
- Do not switch the full product to a newer model in this refactor. Add a small evaluation fixture set first; a model upgrade is a separate, measurable decision.

## Files and Scope

| File | Change |
|---|---|
| `extension/content.js` | Replace default brand-specific extraction with generic selection/main-content extraction and one screenshot fallback; retain isolated explicit slide fallback only if required by tests. |
| `extension/popup.js` | Replace automatic generate-after-capture with review/selection UI state and explicit generate action. |
| `extension/popup.html` / `extension/styles.css` | Add minimal section-review UI, no new navigation or product surface. |
| `extension/background.js` | Split current `sendContent` into ingest and generate messages; preserve authenticated request handling. |
| `backend/schemas.py` | Add validated educational-section and selected-section request/response fields. |
| `backend/services/llm.py` | Add the single structured educational-section selector; leave final generation prompts focused on generation. |
| `backend/main.py` | Run selection at ingest, store it, and generate from explicit stored section IDs. Remove the normal-path dependency on `clean_text` and slideshow marker detection. |
| `backend/services/text_processing.py` | Reduce normal web-content cleanup to whitespace/length safety only; retain file/slide formatting helpers that the explicit fallbacks require. |
| `tests/` | Add contract tests for universal extraction decisions, ingest selection, selected-section generation, empty-material handling, and unchanged file-upload behavior. |

## Compatibility and Failure Handling

- Existing stored items without selection metadata still generate from their stored raw content after minimal normalization.
- A malformed model response fails closed: return a user-facing `No clear study material found` result and preserve the source for retry, rather than generating from arbitrary page chrome.
- An empty selection cannot generate; the popup explains that at least one section must be included.
- A page with no readable text offers screenshot or file upload fallback. It does not pretend to have captured the content.
- The free-generation limit is checked only at explicit generation, not selection/preview.

## Verification

1. Unit-test the selection parser against page, LMS-noise, selected-text, and no-content fixtures.
2. Contract-test `/ingest` response storage and `/generate(section_ids=...)` source ordering/ownership validation.
3. Run the extension capture against a generic article, a Canvas-like page, selected text, a PDF, a PPTX, and an image-only page.
4. Run backend tests, the web build, and the extension packaging/static checks.
5. Deploy backend with `fly deploy`, inspect `fly logs`, then verify the deployed web and extension flow before claiming it live.

## Out of Scope

- Crawling an LMS module or following links automatically.
- Circumventing authentication, DRM, or cross-origin restrictions.
- Changing the core study-guide, flashcard, NCLEX, or SmartNotes product behavior beyond using selected source sections.
- A platform-wide model upgrade without evaluation data.
