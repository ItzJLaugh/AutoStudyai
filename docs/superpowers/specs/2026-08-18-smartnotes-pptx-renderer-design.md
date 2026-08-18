# SmartNotes PPTX Visual Renderer

## Goal

Show the visual content of a user-selected PPTX inside the SmartNotes Class Material pane. A text-only slide-card view remains available only when visual conversion fails.

## Chosen architecture

The browser uploads a selected PPTX to a new authenticated `POST /render-pptx` endpoint. The backend writes the upload to a unique temporary directory, runs LibreOffice headlessly to convert it to PDF, reads the generated PDF, removes the temporary directory, and returns the PDF with `Content-Type: application/pdf` and `Content-Disposition: inline`.

The frontend converts that response to an object URL and uses the existing PDF iframe viewer. It revokes the URL whenever the selected file changes or the component unmounts. The uploaded PPTX and rendered PDF are never persisted.

## Endpoint contract

- Request: authenticated `multipart/form-data` with one `file` field.
- Accepted input: `.pptx` only, at most 20 MB.
- Success: PDF bytes, HTTP 200.
- Client errors: 400 for an absent/unsupported/oversized upload; 401 for invalid authorization; 422 when LibreOffice cannot render the presentation.
- Service errors: 500 for a missing renderer or an unexpected conversion failure; 504 when conversion exceeds its bounded timeout.
- Security: unique temporary directory, fixed subprocess arguments (no shell), bounded execution time, and guaranteed cleanup in `finally`.

## Frontend behavior

For PPTX files, `FileViewer` first requests `/render-pptx`. During conversion it shows a clear loading state. On success it renders the generated PDF in the pane with native PDF scrolling and controls. If conversion fails, it calls the existing extraction endpoint and renders readable, individually bounded slide cards in a vertically scrollable panel, including a clear message that visual rendering was unavailable.

## Deployment

The backend Docker image installs the LibreOffice Impress renderer. The frontend deploys on the repository push; the backend requires `cd backend && fly deploy`. Before release, validate the Docker build, endpoint behavior with a PPTX fixture, the frontend production build, Fly health, and the public SmartNotes route.

## Non-goals

- No permanent upload storage or database schema changes.
- No external Office viewer, public upload URL, or third-party conversion service.
- No editing of PPTX files in the browser.
