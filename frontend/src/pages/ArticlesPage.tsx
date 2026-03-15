import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Chip,
  Pagination,
  alpha,
  Link,
  Snackbar,
  Alert,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNewRounded';
import { articles as articlesApi, sources as sourcesApi } from '../api/client';
import type { Article, Source } from '../types';

const PAGE_SIZE = 20;

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sourcesMap = Object.fromEntries(sources.map(s => [s.id, s.name]));

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await articlesApi.list({
        source_id: sourceFilter || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setArticles(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, page]);

  useEffect(() => {
    sourcesApi.list().then(setSources).catch(() => {});
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <Box>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h1" sx={{ mb: 0.5 }}>Articles</Typography>
          <Typography variant="body2">
            {total} articles fetched from your RSS sources.
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter by source</InputLabel>
          <Select
            value={sourceFilter}
            label="Filter by source"
            onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All sources</MenuItem>
            {sources.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Stack spacing={1.5}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={88} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : articles.length === 0 ? (
        <Box
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 1,
            border: (t) => `1px dashed ${t.palette.divider}`,
          }}
        >
          <Typography variant="body2">
            No articles found. Try crawling your RSS sources first.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={0}>
          {articles.map((article, idx) => (
            <Box
              key={article.id}
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: (t) =>
                  idx < articles.length - 1
                    ? `1px solid ${alpha(t.palette.text.secondary, 0.06)}`
                    : 'none',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.03),
                },
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={2}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="none"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      color: 'text.primary',
                      fontWeight: 500,
                      fontSize: '0.935rem',
                      '&:hover': { color: 'primary.main' },
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {article.title}
                    <OpenInNewIcon sx={{ fontSize: '0.85rem', opacity: 0.5 }} />
                  </Link>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                    <Chip
                      label={sourcesMap[article.source_id] || 'Unknown'}
                      size="small"
                    />
                    {article.author && (
                      <Typography variant="caption">{article.author}</Typography>
                    )}
                    <Typography variant="caption">
                      {formatDate(article.published_at)}
                    </Typography>
                  </Stack>

                  {article.content_snippet && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        maxWidth: 700,
                      }}
                    >
                      {article.content_snippet}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            shape="rounded"
            sx={{
              '& .MuiPaginationItem-root': {
                color: 'text.secondary',
                '&.Mui-selected': {
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.15),
                  color: 'primary.main',
                },
              },
            }}
          />
        </Box>
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
