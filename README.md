# AutoStudyAI

A production-grade Chrome extension that automatically generates study materials from any webpage. Designed for students at all levels (middle school, high school, college) to efficiently capture and learn from online educational content.

## Overview

AutoStudyAI captures content from Learning Management Systems (Canvas, Blackboard, Moodle), online textbooks, PDFs, slideshows, and any webpage, then uses AI to transform it into organized study materials.

## Features

### Core Functionality

| Feature | Description | AI Usage |
|---------|-------------|----------|
| **Smart Notes** | AI extracts key information, filtering out navigation and irrelevant content | GPT-4o identifies important concepts, definitions, and facts |
| **Study Guide** | Generates comprehensive Q&A study guides | GPT-4o creates varied question types (definition, explanation, application, comparison) with detailed answers |
| **Flashcards** | Creates flashcard-style question/answer pairs for quick review | GPT-4o generates concise Q&A pairs optimized for memorization |
| **Chat Assistant** | Interactive Q&A using captured content as knowledge base | GPT-4o answers questions in 3 modes: short, detailed, or with examples |

### Slideshow Detection & Extraction

AutoStudyAI automatically detects and extracts content from slideshows:

| Platform | Detection | Extraction |
|----------|-----------|------------|
| **Canvas LMS** | Native slideshow modules | Full text extraction from all slides |
| **Google Slides** | Embedded iframes | Detects embed, prompts to open directly |
| **PowerPoint Online** | OneDrive/SharePoint embeds | Detects embed, extracts surrounding content |
| **PowerPoint Files** | .pptx download links | Downloads and parses slide content |
| **Prezi** | Embedded presentations | Detects embed URL |
| **Generic Slideshows** | CSS class detection (.slides, .carousel) | Extracts visible slide content |

### Content Sources Supported

- **LMS Pages**: Canvas, Blackboard, Moodle, D2L Brightspace
- **Slideshows**: Google Slides, PowerPoint (online & .pptx files), Prezi, native LMS slideshows
- **Documents**: Embedded PDFs, text-based content
- **Rich Content**: Image alt-text, structured educational content

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome Extension                            │
├─────────────────────────────────────────────────────────────────┤
│  popup.js            │  content.js          │  background.js    │
│  - UI/Tab control    │  - Slideshow detect  │  - API calls      │
│  - Display results   │  - PDF extraction    │  - Message router │
│  - Chat interface    │  - LMS content grab  │                   │
│  - Flashcard view    │  - PPTX detection    │                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ HTTP (localhost:8000)
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
├─────────────────────────────────────────────────────────────────┤
│  /ingest             │  /generate           │  /flashcards      │
│  - Store content     │  - AI notes          │  - Generate cards │
│  - Detect slideshow  │  - AI study guide    │  - Q&A pairs      │
│  - Return metadata   │  - AI flashcards     │                   │
├─────────────────────────────────────────────────────────────────┤
│  /chat               │  Text Processing     │  Storage          │
│  - Q&A modes         │  - LMS filtering     │  - In-memory      │
│  - Context-aware     │  - Smart chunking    │  - Metadata       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OpenAI GPT-4o                               │
│  - Intelligent note extraction (identifies exam-worthy content) │
│  - Study guide generation (varied question types)               │
│  - Flashcard creation (memorization-optimized)                  │
│  - Contextual Q&A (short/detailed/example modes)                │
│  - Slideshow summarization                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
NoteScrapeExt/
├── extension/                 # Chrome extension
│   ├── manifest.json          # Extension configuration (Manifest V3)
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # UI logic and API communication
│   ├── content.js             # Page/slideshow content extraction
│   ├── background.js          # Service worker for API calls
│   ├── styles.css             # Popup styling
│   └── pptx-parser.js         # PowerPoint file parsing
│
├── backend/                   # Python FastAPI server
│   ├── main.py                # API endpoints
│   ├── schemas.py             # Pydantic request/response models
│   ├── storage.py             # In-memory content storage
│   ├── services/
│   │   ├── text_processing.py # Content cleaning, slideshow detection
│   │   └── llm.py             # OpenAI integration for all AI features
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # API keys (not committed)
│
└── README.md                  # This file
```

## Setup

### Prerequisites

- Python 3.10+
- Chrome or Edge browser
- OpenAI API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure API key - create .env file:
echo "OPENAI_API_KEY=your_key_here" > .env
```

### Extension Setup

1. Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension` folder

## Running

### Start Backend Server

```bash
cd backend
.venv\Scripts\uvicorn main:app --reload
```

Server runs at `http://localhost:8000`

### Use Extension

1. Navigate to any educational webpage or slideshow
2. Click the AutoStudyAI extension icon
3. Click **Capture Page Content**
4. Switch between tabs: **Notes**, **Study Guide**, **Flashcards**, **Chat**

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check - returns `{"status": "ok"}` |
| `/ingest` | POST | Store content, detect slideshows, returns `content_id` |
| `/generate` | POST | Generate notes, study guide, and/or flashcards |
| `/flashcards` | POST | Generate flashcards only (dedicated endpoint) |
| `/chat` | POST | Ask questions about stored content |

### Request Examples

```bash
# Ingest content
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Educational text here", "page_url": "http://example.com"}'

# Generate all materials
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"content_id": "uuid-here", "notes": true, "study_guide": true, "flashcards": true}'

# Generate flashcards only
curl -X POST http://localhost:8000/flashcards \
  -H "Content-Type: application/json" \
  -d '{"content_id": "uuid-here", "max_cards": 15}'

# Chat Q&A
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is X?", "content": "Context here", "mode": "detailed"}'
```

### Chat Modes

- **short**: Brief, direct answers (1-2 sentences)
- **detailed**: Step-by-step explanations with full context
- **example**: Concrete, real-world examples to illustrate concepts

## How AI is Used

| Feature | AI Role | Why AI? |
|---------|---------|---------|
| **Notes** | Identifies key concepts, definitions, and exam-worthy facts | Human-like understanding of what's important to study |
| **Study Guide** | Generates varied question types with detailed answers | Creates questions that test understanding, not just memorization |
| **Flashcards** | Creates concise Q&A pairs for quick review | Optimizes content for memorization and recall |
| **Chat** | Answers questions using captured content as context | Provides personalized explanations based on the material |
| **Slideshow Summary** | Synthesizes slide content into coherent notes | Connects information across slides into study-ready format |

## Configuration

### Text Processing

The content filter in `services/text_processing.py` automatically removes:

- LMS navigation (Dashboard, Inbox, Calendar, Modules, etc.)
- UI elements (buttons, menus, breadcrumbs)
- Video player controls
- Generic web elements (cookies, privacy policy, etc.)

Supports: Canvas, Blackboard, Moodle, D2L Brightspace

### AI Parameters

In `services/llm.py`:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `model` | gpt-4o | Best quality for educational content |
| `temperature` | 0.3-0.5 | Balanced accuracy with some variety |
| `max_tokens` | 150-2048 | Varies by feature (notes vs study guide) |

## Development

### Adding New Content Sources

1. Add selectors to `SLIDESHOW_SELECTORS` or `LMS_CONTENT_SELECTORS` in `content.js`
2. Add extraction logic in `extractPageContent()` or dedicated function
3. Update `text_processing.py` if new filtering patterns needed

### Adding New AI Features

1. Add function in `services/llm.py` with appropriate prompt engineering
2. Add endpoint in `main.py`
3. Update `schemas.py` with request/response models
4. Add UI in `popup.html` and handler in `popup.js`

## Roadmap

- [x] AI-powered note extraction
- [x] Study guide generation with varied question types
- [x] Flashcard generation
- [x] Slideshow detection (Canvas, Google Slides, PowerPoint)
- [ ] Export to Anki/Quizlet format
- [ ] Spaced repetition scheduling
- [ ] Persistent storage (SQLite/PostgreSQL)
- [ ] User accounts and saved study sets
- [ ] Video transcript extraction (YouTube, Panopto)
- [ ] OCR for scanned PDFs

## License

MIT
