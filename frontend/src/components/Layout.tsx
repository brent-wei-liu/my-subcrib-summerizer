import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/AutoAwesome';
import SourceIcon from '@mui/icons-material/RssFeed';
import ArticleIcon from '@mui/icons-material/Article';
import SummaryIcon from '@mui/icons-material/Summarize';
import SettingsIcon from '@mui/icons-material/TuneRounded';
import MenuIcon from '@mui/icons-material/MenuRounded';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Sources', path: '/sources', icon: <SourceIcon /> },
  { label: 'Articles', path: '/articles', icon: <ArticleIcon /> },
  { label: 'Summaries', path: '/summaries', icon: <SummaryIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 2 }}>
      <Box sx={{ px: 3, mb: 4, mt: 1 }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Playfair Display", serif',
            color: 'primary.main',
            lineHeight: 1.2,
          }}
        >
          Feed
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          Digest
        </Typography>
      </Box>

      <List sx={{ px: 1.5, flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <ListItemButton
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                px: 2,
                py: 1,
                color: active ? 'primary.main' : 'text.secondary',
                backgroundColor: active
                  ? (t) => alpha(t.palette.primary.main, 0.08)
                  : 'transparent',
                '&:hover': {
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.06),
                  color: 'text.primary',
                },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'inherit',
                  minWidth: 36,
                  '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 500,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.5) }}>
          RSS Subscription Summarizer
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile ? (
        <>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ position: 'fixed', top: 12, left: 12, zIndex: 1200 }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                backgroundColor: 'background.paper',
                borderRight: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.08)}`,
              },
            }}
          >
            {drawerContent}
          </Drawer>
        </>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              backgroundColor: 'background.paper',
              borderRight: (t) => `1px solid ${alpha(t.palette.text.secondary, 0.08)}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          px: { xs: 2, sm: 4, md: 5 },
          py: { xs: 3, md: 4 },
          ml: isMobile ? 0 : 0,
          mt: isMobile ? 6 : 0,
          maxWidth: 1200,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
