import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import type { Source, SourceCreate, SourceUpdate } from '../types';

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { detail?: string } } }).response;
    if (typeof resp?.data?.detail === 'string') return resp.data.detail;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

interface SourceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SourceCreate | SourceUpdate) => Promise<void>;
  source?: Source | null;
}

export default function SourceForm({ open, onClose, onSubmit, source }: SourceFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source) {
      setName(source.name);
      setUrl(source.url);
      setCategory(source.category);
      setEnabled(source.enabled);
    } else {
      setName('');
      setUrl('');
      setCategory('general');
      setEnabled(true);
    }
    setError(null);
  }, [source, open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, url, category, enabled });
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Playfair Display", serif' }}>
        {source ? 'Edit Source' : 'Add RSS Source'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <TextField
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Hacker News"
            fullWidth
            required
          />
          <TextField
            label="Feed URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/rss"
            fullWidth
            required
          />
          <TextField
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="tech, ai, design..."
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            }
            label="Enabled"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text">Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!name.trim() || !url.trim() || submitting}
        >
          {submitting ? 'Saving…' : source ? 'Update' : 'Add Source'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
