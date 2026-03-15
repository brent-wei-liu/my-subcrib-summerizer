import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Skeleton,
  Pagination,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  alpha,
  Collapse,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExpandIcon from '@mui/icons-material/ExpandMoreRounded';
import { summaries as api, sources as sourcesApi } from '../api/client';
import type { Summary, Source } from '../types';
import SummaryCard from '../components/SummaryCard';

const PAGE_SIZE = 10;

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const sourcesMap = Object.fromEntries(sources.map(s => [s.id, s.name]));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, srcList] = await Promise.all([
        api.list({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        sourcesApi.list(),
      ]);
      setSummaries(sumRes.items);
      setTotal(sumRes.total);
      setSources(srcList);
    } catch (err) {
      console.error('Failed to load summaries:', err);
      setSnack({ message: 'Failed to load summaries', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(id);
      setSnack({ message: 'Summary deleted', severity: 'success' });
      fetchData();
    } catch (err) {
      console.error('Failed to delete summary:', err);
      setSnack({ message: 'Failed to delete summary', severity: 'error' });
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h1" sx={{ mb: 0.5 }}>Summaries</Typography>
        <Typography variant="body2">{total} summaries generated.</Typography>
      </Box>

      {loading ? (
        <Stack spacing={2}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : summaries.length === 0 ? (
        <Box
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 1,
            border: (t) => `1px dashed ${t.palette.divider}`,
          }}
        >
          <Typography variant="body2">
            No summaries yet. Go to the Dashboard to generate one.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {summaries.map(summary => {
            const expanded = expandedId === summary.id;
            return (
              <Box key={summary.id}>
                {/* Collapsed header */}
                <Box
                  onClick={() => setExpandedId(expanded ? null : summary.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2.5,
                    py: 2,
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor: (t) => t.palette.background.paper,
                    border: (t) => `1px solid ${alpha(t.palette.text.secondary, expanded ? 0.15 : 0.08)}`,
                    borderBottomLeftRadius: expanded ? 0 : undefined,
                    borderBottomRightRadius: expanded ? 0 : undefined,
                    transition: 'border-color 0.2s ease',
                    '&:hover': {
                      borderColor: (t) => alpha(t.palette.primary.main, 0.25),
                    },
                  }}
                >
                  <ExpandIcon
                    sx={{
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'text.secondary',
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h5">
                      {formatDate(summary.period_start)} — {formatDate(summary.period_end)}
                    </Typography>
                    <Typography variant="caption">
                      {summary.article_count} articles · {summary.llm_model}
                    </Typography>
                  </Box>
                  <Typography variant="caption">
                    {formatDate(summary.created_at)}
                  </Typography>
                  <Tooltip title="Delete summary">
                    <IconButton
                      size="small"
                      onClick={e => { e.stopPropagation(); handleDelete(summary.id); }}
                      sx={{ '&:hover': { color: 'error.main' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Expanded content */}
                <Collapse in={expanded}>
                  <Box
                    sx={{
                      borderLeft: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.15)}`,
                      borderRight: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.15)}`,
                      borderBottom: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.15)}`,
                      borderBottomLeftRadius: 6,
                      borderBottomRightRadius: 6,
                    }}
                  >
                    <SummaryCard summary={summary} sourcesMap={sourcesMap} />
                  </Box>
                </Collapse>
              </Box>
            );
          })}
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
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)} variant="filled">
          {snack?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
