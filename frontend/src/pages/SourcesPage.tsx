import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Stack,
  Switch,
  Snackbar,
  Alert,
  Skeleton,
  Tooltip,
  Collapse,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import { sources as api } from '../api/client';
import type { Source, SourceCreate, SourceUpdate } from '../types';
import SourceForm from '../components/SourceForm';

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editSource, setEditSource] = useState<Source | null>(null);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      setSources(await api.list());
    } catch (err) {
      console.error('Failed to load sources:', err);
      setSnack({ message: 'Failed to load sources', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleCreate = async (data: SourceCreate | SourceUpdate) => {
    await api.create(data as SourceCreate);
    setSnack({ message: 'Source added', severity: 'success' });
    fetchSources();
  };

  const handleUpdate = async (data: SourceCreate | SourceUpdate) => {
    if (!editSource) return;
    await api.update(editSource.id, data as SourceUpdate);
    setSnack({ message: 'Source updated', severity: 'success' });
    setEditSource(null);
    fetchSources();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(id);
      setSnack({ message: 'Source deleted', severity: 'success' });
      fetchSources();
    } catch (err) {
      console.error('Failed to delete source:', err);
      setSnack({ message: 'Failed to delete source', severity: 'error' });
    }
  };

  const handleToggle = async (source: Source) => {
    try {
      await api.update(source.id, { enabled: !source.enabled });
      fetchSources();
    } catch (err) {
      console.error('Failed to toggle source:', err);
      setSnack({ message: 'Failed to toggle source', severity: 'error' });
    }
  };

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleString() : '—';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h1" sx={{ mb: 0.5 }}>Sources</Typography>
          <Typography variant="body2">Manage your RSS feed subscriptions.</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditSource(null); setFormOpen(true); }}
        >
          Add Source
        </Button>
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : sources.length === 0 ? (
        <Box
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 1,
            border: (t) => `1px dashed ${t.palette.divider}`,
          }}
        >
          <Typography variant="body2" sx={{ mb: 2 }}>
            No RSS sources yet. Add your first feed to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
          >
            Add Source
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell>Last Fetched</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources.map(source => {
                const expanded = expandedId === source.id;
                return (
                  <React.Fragment key={source.id}>
                    <TableRow
                      hover
                      onClick={() => setExpandedId(expanded ? null : source.id)}
                      sx={{ cursor: 'pointer', '& > td': { borderBottom: expanded ? 'none' : undefined } }}
                    >
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {source.name}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.25, opacity: 0.6 }}>
                          {source.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={source.category} size="small" />
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={source.enabled}
                          onChange={() => handleToggle(source)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(source.last_fetched_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" onClick={e => e.stopPropagation()}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => { setEditSource(source); setFormOpen(true); }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(source.id)}
                            sx={{ ml: 0.5, '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, px: 0 }}>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              px: 3,
                              py: 2.5,
                              backgroundColor: (t) => alpha(t.palette.text.secondary, 0.03),
                            }}
                          >
                            {source.description && (
                              <Typography variant="body2" sx={{ mb: 2 }}>
                                {source.description}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={4}>
                              <Box>
                                <Typography variant="caption" sx={{ opacity: 0.6 }}>Created</Typography>
                                <Typography variant="body2">{formatDate(source.created_at)}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ opacity: 0.6 }}>Updated</Typography>
                                <Typography variant="body2">{formatDate(source.updated_at)}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ opacity: 0.6 }}>Last Fetched</Typography>
                                <Typography variant="body2">{formatDate(source.last_fetched_at)}</Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <SourceForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSource(null); }}
        onSubmit={editSource ? handleUpdate : handleCreate}
        source={editSource}
      />

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
