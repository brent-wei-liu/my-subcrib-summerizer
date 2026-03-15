# RSS Summarizer Backend

Python FastAPI backend for the RSS Subscription Summarizer.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

Server starts at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

All API routes are prefixed with `/api/v1`.

## Configuration

LLM API keys can be set via:
1. Environment variables: `CLAUDE_API_KEY`, `OPENAI_API_KEY`
2. API: `PUT /api/v1/settings`

Data is stored as JSON files in `app/data/` (gitignored).

## API Overview

| Endpoint | Description |
|---|---|
| `GET/POST /sources` | RSS source management |
| `GET /articles` | Browse fetched articles |
| `POST /crawler/trigger` | Fetch articles from all enabled sources |
| `POST /summaries/generate` | Generate LLM summary from articles |
| `GET/PUT /settings` | LLM and crawler configuration |
| `GET /scheduler/status` | Auto-crawl scheduler status |
| `PUT /scheduler/config` | Update crawl interval |

See `openapi.yaml` in the project root for the full API spec.

## Manual API Verification (curl)

> 12 default RSS sources (AI leaders & tech figures) are seeded on first startup.

### Health Check

```bash
curl http://localhost:8000/health
```

### Sources

```bash
# List all sources (12 seeded by default)
curl -s http://localhost:8000/api/v1/sources | python3 -m json.tool

# Get a single source (replace SOURCE_ID)
curl -s http://localhost:8000/api/v1/sources/SOURCE_ID | python3 -m json.tool

# Add a new source
curl -s -X POST http://localhost:8000/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker News","url":"https://news.ycombinator.com/rss","category":"tech"}' \
  | python3 -m json.tool

# Update a source
curl -s -X PUT http://localhost:8000/api/v1/sources/SOURCE_ID \
  -H "Content-Type: application/json" \
  -d '{"category":"news","enabled":false}' \
  | python3 -m json.tool

# Delete a source
curl -s -X DELETE http://localhost:8000/api/v1/sources/SOURCE_ID -w "%{http_code}\n"
# Expected: 204
```

### Crawler

```bash
# Trigger a crawl (fetches articles from all enabled sources)
curl -s -X POST http://localhost:8000/api/v1/crawler/trigger | python3 -m json.tool
# Expected: {"total_new_articles": N, "sources_crawled": N, "errors": [...]}

# Run again to verify deduplication (total_new_articles should be 0)
curl -s -X POST http://localhost:8000/api/v1/crawler/trigger | python3 -m json.tool
```

### Articles

```bash
# List articles (default limit=50)
curl -s http://localhost:8000/api/v1/articles | python3 -m json.tool

# Paginate
curl -s "http://localhost:8000/api/v1/articles?limit=5&offset=0" | python3 -m json.tool

# Filter by source
curl -s "http://localhost:8000/api/v1/articles?source_id=SOURCE_ID&limit=10" | python3 -m json.tool

# Filter by date
curl -s "http://localhost:8000/api/v1/articles?since=2026-03-01T00:00:00" | python3 -m json.tool

# Get single article
curl -s http://localhost:8000/api/v1/articles/ARTICLE_ID | python3 -m json.tool
```

### Settings

```bash
# Get current settings
curl -s http://localhost:8000/api/v1/settings | python3 -m json.tool

# Set Claude API key (note: key is never returned in GET, only claude_api_key_set: true)
curl -s -X PUT http://localhost:8000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"llm":{"claude_api_key":"sk-ant-your-key-here"}}' \
  | python3 -m json.tool

# Switch to OpenAI
curl -s -X PUT http://localhost:8000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"llm":{"provider":"openai","model":"gpt-4o","openai_api_key":"sk-your-key"}}' \
  | python3 -m json.tool

# Update crawler settings
curl -s -X PUT http://localhost:8000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"crawler":{"request_timeout_seconds":60,"max_content_snippet_length":1000}}' \
  | python3 -m json.tool
```

### Summaries

```bash
# Generate summary — all sources, past 7 days (requires API key + articles)
curl -s -X POST http://localhost:8000/api/v1/summaries/generate \
  -H "Content-Type: application/json" \
  -d '{"since_days":7}' \
  | python3 -m json.tool

# Generate summary — specific sources only
curl -s -X POST http://localhost:8000/api/v1/summaries/generate \
  -H "Content-Type: application/json" \
  -d '{"source_ids":["SOURCE_ID_1","SOURCE_ID_2"],"since_days":3}' \
  | python3 -m json.tool

# List all summaries
curl -s http://localhost:8000/api/v1/summaries | python3 -m json.tool

# Get a single summary
curl -s http://localhost:8000/api/v1/summaries/SUMMARY_ID | python3 -m json.tool

# Delete a summary
curl -s -X DELETE http://localhost:8000/api/v1/summaries/SUMMARY_ID -w "%{http_code}\n"
# Expected: 204
```

### Scheduler

```bash
# Check scheduler status
curl -s http://localhost:8000/api/v1/scheduler/status | python3 -m json.tool

# Change crawl interval to 60 minutes
curl -s -X PUT http://localhost:8000/api/v1/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"interval_minutes":60}' \
  | python3 -m json.tool

# Disable auto-crawl
curl -s -X PUT http://localhost:8000/api/v1/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}' \
  | python3 -m json.tool

# Re-enable
curl -s -X PUT http://localhost:8000/api/v1/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}' \
  | python3 -m json.tool
```

### Automated Test Script

A full end-to-end verification script is also available:

```bash
bash test_api.sh
# Runs 41 checks across all endpoints
# Set CLAUDE_API_KEY env var to also test real summary generation
```
