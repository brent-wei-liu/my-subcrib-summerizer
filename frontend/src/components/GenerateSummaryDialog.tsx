import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  alpha,
  CircularProgress,
} from '@mui/material';
import type { Source, SummaryGenerateRequest } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (req: SummaryGenerateRequest) => Promise<void>;
  sources: Source[];
  generating: boolean;
}

export default function GenerateSummaryDialog({ open, onClose, onGenerate, sources, generating }: Props) {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [sinceDays, setSinceDays] = useState(7);

  useEffect(() => {
    if (open) {
      setSelectedSourceIds([]);
      setSinceDays(7);
    }
  }, [open]);

  const handleGenerate = () => {
    onGenerate({
      source_ids: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
      since_days: sinceDays,
    });
  };

  const enabledSources = sources.filter(s => s.enabled);

  return (
    <Dialog open={open} onClose={generating ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Playfair Display", serif' }}>
        Generate Summary
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Select sources to include, or leave empty for all enabled sources.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Sources</InputLabel>
              <Select
                multiple
                value={selectedSourceIds}
                onChange={e => setSelectedSourceIds(e.target.value as string[])}
                label="Sources"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map(id => {
                      const s = sources.find(src => src.id === id);
                      return <Chip key={id} label={s?.name || id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {enabledSources.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Past N days"
            type="number"
            value={sinceDays}
            onChange={e => setSinceDays(Math.max(1, Math.min(90, Number(e.target.value))))}
            inputProps={{ min: 1, max: 90 }}
            helperText="Include articles from the past N days (1–90)"
          />

          {generating && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 1,
                backgroundColor: (t) => alpha(t.palette.primary.main, 0.06),
                border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
              }}
            >
              <CircularProgress size={20} sx={{ color: 'primary.main' }} />
              <Typography variant="body2" sx={{ color: 'primary.main' }}>
                Analyzing articles with LLM… This may take a moment.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" disabled={generating}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} variant="contained" disabled={generating}>
          {generating ? 'Generating…' : 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
