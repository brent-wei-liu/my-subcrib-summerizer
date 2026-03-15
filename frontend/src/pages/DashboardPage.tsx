import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  Snackbar,
  Skeleton,
  Chip,
  alpha,
} from '@mui/material';
import CrawlIcon from '@mui/icons-material/CloudDownloadRounded';
import SummarizeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import { sources as sourcesApi, summaries as summariesApi, crawler as crawlerApi } from '../api/client';
import type { Source, Summary, CrawlResult } from '../types';
import SummaryCard from '../components/SummaryCard';
import GenerateSummaryDialog from '../components/GenerateSummaryDialog';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sources, setSources] = useState<Source[]>([]);
  const [latestSummary, setLatestSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [srcList, sumList] = await Promise.all([
        sourcesApi.list(),
        summariesApi.list({ limit: 1, offset: 0 }),
      ]);
      setSources(srcList);
      setLatestSummary(sumList.items[0] || null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setSnack({ message: 'Failed to load data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlResult(null);
    try {
      const result = await crawlerApi.trigger();
      setCrawlResult(result);
      setSnack({
        message: `Crawled ${result.sources_crawled} sources, ${result.total_new_articles} new articles`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Crawl failed:', err);
      setSnack({ message: 'Crawl failed', severity: 'error' });
    } finally {
      setCrawling(false);
    }
  };

  const handleGenerate = async (req: Parameters<typeof summariesApi.generate>[0]) => {
    setGenerating(true);
    try {
      const summary = await summariesApi.generate(req);
      setLatestSummary(summary);
      setDialogOpen(false);
      setSnack({ message: 'Summary generated!', severity: 'success' });
    } catch (err) {
      console.error('Summary generation failed:', err);
      setSnack({ message: 'Summary generation failed', severity: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const sourcesMap = Object.fromEntries(sources.map(s => [s.id, s.name]));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h1" sx={{ mb: 1 }}>
          What are they talking about?
        </Typography>
        <Typography variant="body2" sx={{ maxWidth: 520 }}>
          Your personal feed digest — crawl RSS sources and let AI distill the trends.
        </Typography>
      </Box>

      {/* Action bar */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<CrawlIcon />}
          onClick={handleCrawl}
          disabled={crawling}
        >
          {crawling ? 'Crawling…' : 'Crawl Now'}
        </Button>
        <Button
          variant="contained"
          startIcon={<SummarizeIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Generate Summary
        </Button>
      </Stack>

      {/* Crawl result */}
      {crawlResult && (
        <Box
          sx={{
            mb: 4,
            p: 2,
            borderRadius: 1,
            backgroundColor: (t) => alpha(t.palette.success.main, 0.06),
            border: (t) => `1px solid ${alpha(t.palette.success.main, 0.2)}`,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip label={`${crawlResult.total_new_articles} new articles`} color="success" size="small" />
            <Typography variant="body2">
              from {crawlResult.sources_crawled} sources
            </Typography>
            {crawlResult.errors.length > 0 && (
              <Typography variant="body2" sx={{ color: 'error.main' }}>
                · {crawlResult.errors.length} errors
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/articles')}
            >
              View articles
            </Button>
          </Stack>
        </Box>
      )}

      {/* Stats row */}
      {!loading && (
        <Stack direction="row" spacing={3} sx={{ mb: 5 }}>
          {[
            { label: 'Sources', value: sources.length },
            { label: 'Enabled', value: sources.filter(s => s.enabled).length },
          ].map(stat => (
            <Box
              key={stat.label}
              sx={{
                px: 2.5,
                py: 1.5,
                borderRadius: 1,
                border: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.08)}`,
                minWidth: 100,
              }}
            >
              <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>{stat.value}</Typography>
              <Typography variant="caption">{stat.label}</Typography>
            </Box>
          ))}
        </Stack>
      )}

      {/* Latest summary */}
      <Typography variant="h4" sx={{ mb: 2.5 }}>Latest Summary</Typography>

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
        </Stack>
      ) : latestSummary ? (
        <SummaryCard summary={latestSummary} sourcesMap={sourcesMap} />
      ) : (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 1,
            border: (t) => `1px dashed ${alpha(t.palette.text.secondary, 0.2)}`,
          }}
        >
          <Typography variant="body2" sx={{ mb: 2 }}>
            No summaries yet. Add some RSS sources, crawl them, then generate your first summary.
          </Typography>
          <Button variant="outlined" size="small" onClick={() => navigate('/sources')}>
            Manage Sources
          </Button>
        </Box>
      )}

      {/* Generate dialog */}
      <GenerateSummaryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerate={handleGenerate}
        sources={sources}
        generating={generating}
      />

      {/* Snackbar */}
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack?.severity}
          onClose={() => setSnack(null)}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
