# Feed Digest — Frontend

React + TypeScript + MUI frontend for the RSS Subscription Summarizer.

## Prerequisites

- Node.js >= 18
- Backend running on `http://localhost:8000`

## Setup

```bash
npm install
npm run dev
```

Dev server starts at `http://localhost:5173`. API calls to `/api/*` are proxied to the backend automatically.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Project Structure

```
src/
├── api/client.ts             # Axios API client (all endpoints)
├── types/index.ts            # TypeScript types matching OpenAPI spec
├── hooks/useApi.ts           # Generic async request hook
├── theme.ts                  # MUI dark theme (Playfair Display + DM Sans)
├── components/
│   ├── Layout.tsx            # Sidebar navigation + responsive drawer
│   ├── SourceForm.tsx        # Add/edit RSS source dialog
│   ├── SummaryCard.tsx       # Markdown-rendered summary card
│   └── GenerateSummaryDialog.tsx
└── pages/
    ├── DashboardPage.tsx     # Crawl, generate summary, view latest
    ├── SourcesPage.tsx       # RSS source CRUD
    ├── ArticlesPage.tsx      # Paginated article list with source filter
    ├── SummariesPage.tsx     # Summary history (expandable)
    └── SettingsPage.tsx      # LLM, crawler, scheduler config
```

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — crawl sources, generate summaries, view latest |
| `/sources` | Manage RSS feeds (add, edit, toggle, delete) |
| `/articles` | Browse fetched articles, filter by source |
| `/summaries` | View all generated summaries |
| `/settings` | Configure LLM provider, API keys, crawler, scheduler |
