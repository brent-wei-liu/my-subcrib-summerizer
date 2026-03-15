import { Box, Typography, Chip, Stack, alpha } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import type { Summary } from '../types';

interface Props {
  summary: Summary;
  sourcesMap?: Record<string, string>;
}

export default function SummaryCard({ summary, sourcesMap }: Props) {
  const date = new Date(summary.created_at);
  const periodStart = new Date(summary.period_start);
  const periodEnd = new Date(summary.period_end);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 1.5,
        backgroundColor: (t) => t.palette.background.paper,
        border: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.08)}`,
        transition: 'border-color 0.2s ease',
        '&:hover': {
          borderColor: (t) => alpha(t.palette.primary.main, 0.2),
        },
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
            {formatDate(periodStart)} — {formatDate(periodEnd)}
          </Typography>
          <Typography variant="h3">
            Summary · {summary.article_count} articles
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
          <Chip label={summary.llm_model} size="small" variant="outlined" />
          {summary.prompt_tokens && (
            <Chip
              label={`${((summary.prompt_tokens + (summary.completion_tokens || 0)) / 1000).toFixed(1)}k tok`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Stack>

      {/* Source tags */}
      {sourcesMap && summary.source_ids.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 0.5 }}>
          {summary.source_ids.map(id => (
            <Chip
              key={id}
              label={sourcesMap[id] || id.slice(0, 8)}
              size="small"
            />
          ))}
        </Stack>
      )}

      {/* Markdown content */}
      <Box
        sx={{
          '& h2': {
            fontFamily: '"Playfair Display", serif',
            fontSize: '1.3rem',
            fontWeight: 600,
            mt: 3,
            mb: 1.5,
            color: 'text.primary',
            borderBottom: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.1)}`,
            pb: 1,
          },
          '& h3': {
            fontFamily: '"Playfair Display", serif',
            fontSize: '1.1rem',
            fontWeight: 600,
            mt: 2.5,
            mb: 1,
            color: 'primary.main',
          },
          '& p': {
            lineHeight: 1.75,
            color: 'text.primary',
            mb: 1.5,
          },
          '& ul, & ol': {
            pl: 2.5,
            mb: 1.5,
            '& li': {
              mb: 0.5,
              lineHeight: 1.7,
              color: 'text.primary',
            },
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'none',
            borderBottom: (t) => `1px solid ${alpha(t.palette.primary.main, 0.3)}`,
            '&:hover': {
              borderBottomColor: 'primary.main',
            },
          },
          '& code': {
            fontFamily: 'monospace',
            fontSize: '0.85em',
            backgroundColor: (t) => alpha(t.palette.text.secondary, 0.1),
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
          },
          '& blockquote': {
            borderLeft: (t) => `3px solid ${t.palette.primary.main}`,
            pl: 2,
            ml: 0,
            color: 'text.secondary',
            fontStyle: 'italic',
          },
        }}
      >
        <ReactMarkdown>{summary.content}</ReactMarkdown>
      </Box>

      {/* Footer timestamp */}
      <Typography variant="caption" sx={{ display: 'block', mt: 3, textAlign: 'right' }}>
        Generated {date.toLocaleString()}
      </Typography>
    </Box>
  );
}
