# SmartNotes PPTX Visual Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render an uploaded PPTX as a PDF inside SmartNotes, with readable slide cards as the fallback.

**Architecture:** A focused Python service converts PPTX bytes to PDF inside a temporary directory by invoking LibreOffice without a shell. FastAPI exposes that service through an authenticated multipart endpoint, while SmartNotes displays the returned PDF through an object URL and falls back to the existing text extractor when rendering fails.

**Tech Stack:** FastAPI, Python subprocess and tempfile, LibreOffice Impress, React/Next.js, browser Blob URLs, CSS, unittest.

**Spec:** `docs/superpowers/specs/2026-08-18-smartnotes-pptx-renderer-design.md`

## Global Constraints

- Accept only authenticated `.pptx` files up to 20 MB.
- Keep uploads and rendered files temporary and guarantee cleanup.
- Run LibreOffice with fixed arguments, `shell=False`, and a 30-second timeout.
- Validate that output begins with `%PDF-` before returning it.
- Preserve readable, vertically scrollable slide cards as the failure fallback.
- Install LibreOffice in the Fly Docker image and deploy the backend from `backend/`.

---

### Task 1: Isolated converter

**Files:**
- Create: `backend/services/pptx_rendering.py`
- Create: `tests/test_pptx_rendering.py`

**Interfaces:**
- Produces `render_pptx_to_pdf(content_bytes: bytes) -> bytes`.
- Raises `PptxRenderError` for renderer/output failures and `PptxRenderTimeout` for timeouts.

- [ ] Write tests that replace `subprocess.run`, create a fake `%PDF-` result, and assert success, invalid output, missing executable, and timeout behavior.
- [ ] Run `python -m unittest tests.test_pptx_rendering` and confirm failure because the service does not exist.
- [ ] Implement conversion with `TemporaryDirectory`, `Path.write_bytes`, fixed `soffice --headless --convert-to pdf --outdir` arguments, `capture_output=True`, `timeout=30`, and `shell=False`.
- [ ] Validate the generated file and map subprocess failures to the declared exceptions.
- [ ] Run the focused tests and commit `feat: render PPTX uploads to PDF`.

### Task 2: Render endpoint and Docker image

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/Dockerfile`
- Extend: `tests/test_pptx_rendering.py`

**Interfaces:**
- Consumes `render_pptx_to_pdf`.
- Produces authenticated `POST /render-pptx` returning inline `application/pdf` bytes.

- [ ] Add failing endpoint tests for success, wrong extension, oversized content, converter failure, and timeout.
- [ ] Run the focused tests and confirm `/render-pptx` is absent.
- [ ] Add the endpoint with the existing authorization and rate-limit pattern, exact size validation, and `Response` output.
- [ ] Add `libreoffice-impress` to the existing Debian image using one cleaned apt layer.
- [ ] Run the focused tests and commit `feat: expose PPTX render endpoint`.

### Task 3: SmartNotes visual viewer and fallback

**Files:**
- Modify: `web/pages/smartnotes.js`
- Modify: `web/styles/globals.css`
- Extend: `tests/test_smartnotes_upload_contract.py`

**Interfaces:**
- Consumes `POST /render-pptx` PDF responses.
- Produces a revocable PDF object URL or a scrollable slide-card fallback.

- [ ] Add failing source-contract tests requiring `/render-pptx`, `response.blob()`, authorization-only multipart headers, object URL cleanup, vertical scrolling, and bounded slide-card styles.
- [ ] Run the SmartNotes test and confirm failure against the text-only implementation.
- [ ] Refactor the PPTX branch to request visual rendering first and call the existing extraction endpoint only on failure.
- [ ] Revoke every created object URL on file change and unmount; show a visual-render failure notice above fallback cards.
- [ ] Add readable card typography, spacing, and `overflow-y: auto` without changing other file viewers.
- [ ] Run the SmartNotes test and frontend production build; commit `feat: show visual PPTX slides in SmartNotes`.

### Task 4: Integrated verification and release

**Files:**
- No planned source changes.

**Interfaces:**
- Validates the complete backend-to-frontend flow.

- [ ] Run all Python tests and the Next.js production build.
- [ ] Build the backend Docker image and confirm `soffice --version` inside it.
- [ ] Test the render endpoint with the repository PPTX fixture.
- [ ] Review the full diff and commit any test-only adjustments.
- [ ] Merge the reviewed branch into `main`, deploy with `cd backend && fly deploy`, inspect `fly logs` and `fly status`, push `main`, and verify the Vercel production deployment.
