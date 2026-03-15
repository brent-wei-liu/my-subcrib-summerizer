import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Skeleton,
  Chip,
  alpha,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveRounded';
import CheckIcon from '@mui/icons-material/CheckCircleRounded';
import {
  settings as settingsApi,
  scheduler as schedulerApi,
} from '../api/client';
import type { Settings, SchedulerStatus, SettingsUpdate, SchedulerConfigUpdate } from '../types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // LLM form state
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude');
  const [model, setModel] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.3);

  // Crawler form state
  const [requestTimeout, setRequestTimeout] = useState(30);
  const [snippetLength, setSnippetLength] = useState(500);

  // Scheduler form state
  const [schedEnabled, setSchedEnabled] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState(360);
  const [maxArticles, setMaxArticles] = useState(100);

  const fetchData = useCallback(async () => {
    try {
      const [s, sch] = await Promise.all([
        settingsApi.get(),
        schedulerApi.status(),
      ]);
      setSettings(s);
      setScheduler(sch);
      // Populate form
      setProvider(s.llm.provider);
      setModel(s.llm.model);
      setMaxTokens(s.llm.max_tokens);
      setTemperature(s.llm.temperature);
      setRequestTimeout(s.crawler.request_timeout_seconds);
      setSnippetLength(s.crawler.max_content_snippet_length);
      setSchedEnabled(sch.enabled);
      setIntervalMinutes(sch.interval_minutes);
      setMaxArticles(sch.max_articles_per_summary);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSnack({ message: 'Failed to load settings', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsPayload: SettingsUpdate = {
        llm: {
          provider,
          model,
          max_tokens: maxTokens,
          temperature,
          ...(claudeKey ? { claude_api_key: claudeKey } : {}),
          ...(openaiKey ? { openai_api_key: openaiKey } : {}),
        },
        crawler: {
          request_timeout_seconds: requestTimeout,
          max_content_snippet_length: snippetLength,
        },
      };
      const schedPayload: SchedulerConfigUpdate = {
        enabled: schedEnabled,
        interval_minutes: intervalMinutes,
        max_articles_per_summary: maxArticles,
      };

      await Promise.all([
        settingsApi.update(settingsPayload),
        schedulerApi.updateConfig(schedPayload),
      ]);

      setClaudeKey('');
      setOpenaiKey('');
      setSnack({ message: 'Settings saved', severity: 'success' });
      fetchData();
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSnack({ message: 'Failed to save settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h1" sx={{ mb: 4 }}>Settings</Typography>
        <Stack spacing={2}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h1" sx={{ mb: 0.5 }}>Settings</Typography>
          <Typography variant="body2">Configure LLM provider, crawler, and scheduler.</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save All'}
        </Button>
      </Stack>

      <Stack spacing={5} sx={{ maxWidth: 640 }}>
        {/* LLM Settings */}
        <Box>
          <Typography variant="h4" sx={{ mb: 2.5 }}>LLM Provider</Typography>
          <Stack spacing={2.5}>
            <FormControl size="small">
              <InputLabel>Provider</InputLabel>
              <Select value={provider} label="Provider" onChange={e => setProvider(e.target.value as 'claude' | 'openai')}>
                <MenuItem value="claude">Claude (Anthropic)</MenuItem>
                <MenuItem value="openai">OpenAI</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Model"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="claude-sonnet-4-20250514"
              helperText="Model identifier (e.g. claude-sonnet-4-20250514, gpt-4o)"
            />

            <Box>
              <TextField
                label="Claude API Key"
                value={claudeKey}
                onChange={e => setClaudeKey(e.target.value)}
                type="password"
                placeholder="sk-ant-..."
                fullWidth
                InputProps={{
                  endAdornment: settings?.llm.claude_api_key_set ? (
                    <Chip
                      icon={<CheckIcon sx={{ fontSize: '0.85rem !important' }} />}
                      label="Set"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ) : null,
                }}
              />
            </Box>

            <Box>
              <TextField
                label="OpenAI API Key"
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                type="password"
                placeholder="sk-..."
                fullWidth
                InputProps={{
                  endAdornment: settings?.llm.openai_api_key_set ? (
                    <Chip
                      icon={<CheckIcon sx={{ fontSize: '0.85rem !important' }} />}
                      label="Set"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ) : null,
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Max Tokens: <strong>{maxTokens}</strong>
              </Typography>
              <Slider
                value={maxTokens}
                onChange={(_, v) => setMaxTokens(v as number)}
                min={100}
                max={8000}
                step={100}
                sx={{ maxWidth: 400 }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Temperature: <strong>{temperature.toFixed(2)}</strong>
              </Typography>
              <Slider
                value={temperature}
                onChange={(_, v) => setTemperature(v as number)}
                min={0}
                max={1}
                step={0.05}
                sx={{ maxWidth: 400 }}
              />
            </Box>
          </Stack>
        </Box>

        <Divider />

        {/* Crawler Settings */}
        <Box>
          <Typography variant="h4" sx={{ mb: 2.5 }}>Crawler</Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Request Timeout (seconds)"
              type="number"
              value={requestTimeout}
              onChange={e => setRequestTimeout(Number(e.target.value))}
              inputProps={{ min: 5, max: 120 }}
            />
            <TextField
              label="Max Content Snippet Length"
              type="number"
              value={snippetLength}
              onChange={e => setSnippetLength(Number(e.target.value))}
              inputProps={{ min: 100, max: 2000 }}
              helperText="Characters of content to store per article"
            />
          </Stack>
        </Box>

        <Divider />

        {/* Scheduler Settings */}
        <Box>
          <Typography variant="h4" sx={{ mb: 2.5 }}>Auto-Crawl Scheduler</Typography>
          <Stack spacing={2.5}>
            <FormControlLabel
              control={
                <Switch checked={schedEnabled} onChange={e => setSchedEnabled(e.target.checked)} />
              }
              label="Enable auto-crawl"
            />
            <TextField
              label="Interval (minutes)"
              type="number"
              value={intervalMinutes}
              onChange={e => setIntervalMinutes(Number(e.target.value))}
              inputProps={{ min: 5, max: 10080 }}
              helperText="How often to automatically crawl sources (5 min – 7 days)"
            />
            <TextField
              label="Max Articles per Summary"
              type="number"
              value={maxArticles}
              onChange={e => setMaxArticles(Number(e.target.value))}
              inputProps={{ min: 10, max: 500 }}
            />

            {scheduler && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: (t) => alpha(t.palette.text.secondary, 0.04),
                  border: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.08)}`,
                }}
              >
                <Stack spacing={0.75}>
                  <Typography variant="caption">
                    Status: <strong>{scheduler.running ? 'Running' : 'Stopped'}</strong>
                  </Typography>
                  {scheduler.next_run_at && (
                    <Typography variant="caption">
                      Next crawl: {new Date(scheduler.next_run_at).toLocaleString()}
                    </Typography>
                  )}
                  {scheduler.last_run_at && (
                    <Typography variant="caption">
                      Last crawl: {new Date(scheduler.last_run_at).toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Stack>

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
