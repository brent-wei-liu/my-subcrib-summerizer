# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RSS Subscription Summarizer — a full-stack app that fetches articles from RSS feeds (12 default AI/tech leader feeds), generates LLM-powered summaries via Claude or OpenAI, and provides a React UI for managing sources, articles, and summaries.

## Architecture

- **Backend**: Python 3.11+ / FastAPI with JSON file storage (thread-safe via mutex locks in `JsonStore`). No database — data lives in `backend/app/data/*.json`.
- **Frontend**: React 19 + TypeScript + Vite + Material-UI. All API calls go through a centralized axios client (`frontend/src/api/client.ts`) with base URL `/api/v1`.
- **API spec**: `openapi.yaml` at project root. FastAPI auto-generates matching docs at `/docs`.

Key design decisions:
- Crawling (automated via APScheduler) is separated from summarization (manual trigger only)
- API keys come from environment variables (`CLAUDE_API_KEY`, `OPENAI_API_KEY`), which override `config.json`
- Frontend dev server proxies `/api/*` to backend at `localhost:8000` (configured in `vite.config.ts`)

## Commands

### Backend
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload          # Dev server on :8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # Dev server on :5173
npm run build    # Production build
npm run lint     # ESLint
```

### Tests
```bash
cd backend
pytest                                  # All tests
pytest tests/test_sources.py -v         # Single test file
pytest tests/test_sources.py::TestCreateSource -v  # Single test class
```

Tests use pytest with `pytest-httpx` for HTTP mocking. Each test gets an isolated temp data directory via the `isolated_data_dir` fixture in `conftest.py`. The scheduler is mocked in the test client fixture.

## Backend Service Layer

- `services/storage.py` — `JsonStore` with thread-safe read/write to JSON files
- `services/crawler.py` — RSS fetching via `feedparser`, deduplication by GUID
- `services/llm.py` — Abstraction over Claude/OpenAI APIs
- `services/summarizer.py` — Builds prompts from grouped articles, calls LLM
- `services/scheduler.py` — APScheduler background job for periodic crawling

## Linting

- Backend: Ruff with 120 char line length (configured in `pyproject.toml`)
- Frontend: ESLint with TypeScript support
