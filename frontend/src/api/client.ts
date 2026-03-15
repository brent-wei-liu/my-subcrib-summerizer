import axios from 'axios';
import type {
  Source, SourceCreate, SourceUpdate,
  ArticleListResponse, Article,
  Summary, SummaryListResponse, SummaryGenerateRequest,
  CrawlResult,
  SchedulerStatus, SchedulerConfigUpdate,
  Settings, SettingsUpdate,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  response => response,
  error => {
    const method = error.config?.method?.toUpperCase() ?? '?';
    const url = error.config?.url ?? '?';

    if (error.response) {
      const { status, data } = error.response;
      console.error(`[API ${method} ${url}] ${status}:`, data?.detail ?? data);
    } else {
      console.error(`[API ${method} ${url}] Network error:`, error.message);
      error.message = 'Cannot connect to server. Please check that the backend is running.';
    }

    return Promise.reject(error);
  },
);

// ─── Sources ──────────────────────────────────────────
export const sources = {
  list: () => api.get<Source[]>('/sources').then(r => r.data),
  get: (id: string) => api.get<Source>(`/sources/${id}`).then(r => r.data),
  create: (data: SourceCreate) => api.post<Source>('/sources', data).then(r => r.data),
  update: (id: string, data: SourceUpdate) => api.put<Source>(`/sources/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/sources/${id}`),
};

// ─── Articles ─────────────────────────────────────────
export const articles = {
  list: (params?: { source_id?: string; since?: string; limit?: number; offset?: number }) =>
    api.get<ArticleListResponse>('/articles', { params }).then(r => r.data),
  get: (id: string) => api.get<Article>(`/articles/${id}`).then(r => r.data),
};

// ─── Summaries ────────────────────────────────────────
export const summaries = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<SummaryListResponse>('/summaries', { params }).then(r => r.data),
  get: (id: string) => api.get<Summary>(`/summaries/${id}`).then(r => r.data),
  generate: (data: SummaryGenerateRequest) =>
    api.post<Summary>('/summaries/generate', data).then(r => r.data),
  delete: (id: string) => api.delete(`/summaries/${id}`),
};

// ─── Crawler ──────────────────────────────────────────
export const crawler = {
  trigger: () => api.post<CrawlResult>('/crawler/trigger').then(r => r.data),
};

// ─── Scheduler ────────────────────────────────────────
export const scheduler = {
  status: () => api.get<SchedulerStatus>('/scheduler/status').then(r => r.data),
  updateConfig: (data: SchedulerConfigUpdate) =>
    api.put<SchedulerStatus>('/scheduler/config', data).then(r => r.data),
};

// ─── Settings ─────────────────────────────────────────
export const settings = {
  get: () => api.get<Settings>('/settings').then(r => r.data),
  update: (data: SettingsUpdate) => api.put<Settings>('/settings', data).then(r => r.data),
};

export default api;
