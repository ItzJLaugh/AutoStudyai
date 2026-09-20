# CordiaClassroom Backend

FastAPI server that processes captured content and generates study materials using OpenAI GPT-4o.

## Quick Start

```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```

Server runs at `http://localhost:8000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check - returns `{"status": "ok"}` |
| `/ingest` | POST | Find reviewable educational sections |
| `/generate` | POST | Generate materials from reviewed text |
| `/chat` | POST | Q&A with 3 modes: short, detailed, example |

## Environment Variables

Create `.env` file:

```
OPENAI_API_KEY=your_key_here
```

## Project Files

- `main.py` - API endpoints and request handling
- `schemas.py` - Pydantic models for request/response validation
- `services/text_processing.py` - Content cleaning and chunking
- `services/llm.py` - OpenAI integration for Q&A generation

See main [README](../README.md) for full documentation.
