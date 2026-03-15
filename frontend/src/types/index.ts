// ─── Source ───────────────────────────────────────────
export interface Source {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_fetched_at: string | null;
}

export interface SourceCreate {
  name: string;
  url: string;
  category?: string;
  description?: string;
  enabled?: boolean;
}

export interface SourceUpdate {
  name?: string;
  url?: string;
  category?: string;
  description?: string;
  enabled?: boolean;
}

// ─── Article ──────────────────────────────────────────
export interface Article {
  id: string;
  source_id: string;
  title: string;
  url: string;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  content_snippet: string;
  guid: string;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Summary ──────────────────────────────────────────
export interface Summary {
  id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  source_ids: string[];
  article_count: number;
  llm_provider: 'claude' | 'openai';
  llm_model: string;
  content: string;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface SummaryListResponse {
  items: Summary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SummaryGenerateRequest {
  source_ids?: string[];
  since_days?: number;
}

// ─── Crawler ──────────────────────────────────────────
export interface CrawlResult {
  total_new_articles: number;
  sources_crawled: number;
  errors: CrawlError[];
}

export interface CrawlError {
  source_id: string;
  source_name: string;
  error: string;
}

// ─── Scheduler ────────────────────────────────────────
export interface SchedulerStatus {
  enabled: boolean;
  interval_minutes: number;
  max_articles_per_summary: number;
  running: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
}

export interface SchedulerConfigUpdate {
  enabled?: boolean;
  interval_minutes?: number;
  max_articles_per_summary?: number;
}

// ─── Settings ─────────────────────────────────────────
export interface LlmSettings {
  provider: 'claude' | 'openai';
  model: string;
  claude_api_key_set: boolean;
  openai_api_key_set: boolean;
  max_tokens: number;
  temperature: number;
}

export interface CrawlerSettings {
  request_timeout_seconds: number;
  max_content_snippet_length: number;
}

export interface Settings {
  llm: LlmSettings;
  crawler: CrawlerSettings;
}

export interface LlmSettingsUpdate {
  provider?: 'claude' | 'openai';
  model?: string;
  claude_api_key?: string;
  openai_api_key?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface SettingsUpdate {
  llm?: LlmSettingsUpdate;
  crawler?: Partial<CrawlerSettings>;
}
