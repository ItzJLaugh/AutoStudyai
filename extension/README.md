# AutoStudyAI Chrome Extension

Browser extension that captures educational content and sends it to the backend for study material generation.

## Installation (Developer Mode)

1. Go to `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `extension` folder

## Usage

1. Navigate to any educational webpage (LMS, article, documentation)
2. Click the AutoStudyAI extension icon
3. Click **Capture Page Content**
4. Switch between tabs: **Notes**, **Study Guide**, **Flashcards**, **Chat**

## Features

- **Notes Tab**: Bullet-point extraction of key content
- **Study Guide Tab**: AI-generated Q&A pairs
- **Flashcards Tab**: Coming soon
- **Chat Tab**: Ask questions about captured content
  - Send button: Quick answers
  - Example button: Get concrete examples

## Content Sources

The extension can extract from:
- Standard webpage text
- Embedded PDFs (visible text layer)
- PowerPoint links (.pptx files)
- Image alt-text

## Files

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html/js/css` - Extension popup UI
- `content.js` - Page content extraction scripts
- `background.js` - Service worker for backend API calls
- `pptx-parser.js` - PowerPoint text extraction

## Configuration

Backend URL is configured in `background.js`:
```javascript
fetch('http://localhost:8000/ingest', ...)
```

See main [README](../README.md) for full documentation.
