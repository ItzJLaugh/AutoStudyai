# AutoStudyAI Chrome Extension

Browser extension that captures educational content and sends it to the backend for study material generation.

## Installation (Developer Mode)

1. Go to `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `extension` folder

## Usage

1. Navigate to any educational webpage (LMS, article, documentation)
2. Sign in once at **classroom.cordiacode.com**; the extension reuses that session
3. Click the CordiaClassroom extension icon
4. Click **Capture study material**
5. Switch between tabs: **Notes**, **Study Guide**, **Flashcards**, **Chat**

## Features

- **Notes Tab**: Bullet-point extraction of key content
- **Study Guide Tab**: AI-generated Q&A pairs
- **Flashcards Tab**: Review cards generated from the captured material
- **Chat Tab**: Ask questions about captured content
  - Send button: Quick answers
  - Example button: Get concrete examples

## Content Sources

The extension can extract from:
- Standard webpage text
- Selected text or the main content of an LMS page
- Linked or embedded PDF, DOCX, PPTX, text, and common image files
- A screenshot fallback when a protected viewer does not expose its source

## Files

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html/js/css` - Extension popup UI
- `content.js` - Small source resolver for selections, documents, and LMS pages
- `background.js` - Service worker for backend API calls
- The backend is the single document extractor; the extension does not duplicate PDF or PowerPoint parsing

## Configuration

The production backend URL is configured in `background.js` and `popup.js`:
```javascript
const API_URL = 'https://autostudy-ai.fly.dev';
```

See main [README](../README.md) for full documentation.
