import { createTheme, alpha } from '@mui/material/styles';

// Editorial / ink-on-paper aesthetic with warm amber accents
const AMBER = '#E8A838';
const AMBER_LIGHT = '#F2C46D';
const INK = '#0D0D0D';
const PAPER_DARK = '#141414';
const PAPER_MID = '#1C1C1C';
const PAPER_SURFACE = '#242424';
const TEXT_PRIMARY = '#E8E4DC';
const TEXT_SECONDARY = '#9A9489';
const DANGER = '#D4534B';
const SUCCESS = '#5BA77C';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: AMBER, light: AMBER_LIGHT, dark: '#C48A20' },
    secondary: { main: TEXT_SECONDARY },
    error: { main: DANGER },
    success: { main: SUCCESS },
    background: {
      default: INK,
      paper: PAPER_DARK,
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
    },
    divider: alpha(TEXT_SECONDARY, 0.15),
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
    },
    h2: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      letterSpacing: '-0.01em',
      lineHeight: 1.25,
    },
    h3: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.35rem',
      letterSpacing: '-0.01em',
    },
    h4: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
      fontSize: '1.1rem',
      letterSpacing: '0.02em',
      textTransform: 'uppercase' as const,
    },
    h5: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
      fontSize: '0.95rem',
    },
    h6: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
      fontSize: '0.85rem',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    },
    body1: { fontSize: '0.935rem', lineHeight: 1.7 },
    body2: { fontSize: '0.84rem', lineHeight: 1.65, color: TEXT_SECONDARY },
    caption: { fontSize: '0.75rem', letterSpacing: '0.04em', color: TEXT_SECONDARY },
    button: { fontWeight: 600, letterSpacing: '0.04em' },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        body {
          background: ${INK};
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 0%, ${alpha(AMBER, 0.03)} 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 100% 100%, ${alpha(AMBER, 0.02)} 0%, transparent 50%);
          min-height: 100vh;
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${alpha(TEXT_SECONDARY, 0.25)};
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${alpha(TEXT_SECONDARY, 0.4)};
        }
      `,
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: PAPER_MID,
          border: `1px solid ${alpha(TEXT_SECONDARY, 0.08)}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: PAPER_MID,
          border: `1px solid ${alpha(TEXT_SECONDARY, 0.08)}`,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: alpha(AMBER, 0.25),
            boxShadow: `0 4px 24px ${alpha(INK, 0.5)}`,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none' as const,
          fontWeight: 600,
          padding: '8px 20px',
        },
        contained: {
          backgroundColor: AMBER,
          color: INK,
          '&:hover': { backgroundColor: AMBER_LIGHT },
        },
        outlined: {
          borderColor: alpha(TEXT_SECONDARY, 0.25),
          color: TEXT_PRIMARY,
          '&:hover': {
            borderColor: AMBER,
            backgroundColor: alpha(AMBER, 0.06),
          },
        },
        text: {
          color: TEXT_SECONDARY,
          '&:hover': { color: TEXT_PRIMARY, backgroundColor: alpha(TEXT_SECONDARY, 0.08) },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: TEXT_SECONDARY,
          '&:hover': { color: TEXT_PRIMARY, backgroundColor: alpha(TEXT_SECONDARY, 0.1) },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 500,
          fontSize: '0.75rem',
          letterSpacing: '0.03em',
        },
        filled: {
          backgroundColor: alpha(AMBER, 0.12),
          color: AMBER_LIGHT,
        },
        outlined: {
          borderColor: alpha(TEXT_SECONDARY, 0.2),
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: PAPER_SURFACE,
            '& fieldset': { borderColor: alpha(TEXT_SECONDARY, 0.15) },
            '&:hover fieldset': { borderColor: alpha(TEXT_SECONDARY, 0.3) },
            '&.Mui-focused fieldset': { borderColor: AMBER },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: PAPER_SURFACE,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: alpha(TEXT_SECONDARY, 0.08),
          padding: '14px 16px',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: TEXT_SECONDARY,
          backgroundColor: PAPER_DARK,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: PAPER_MID,
          border: `1px solid ${alpha(TEXT_SECONDARY, 0.12)}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: PAPER_SURFACE,
          border: `1px solid ${alpha(TEXT_SECONDARY, 0.15)}`,
          color: TEXT_PRIMARY,
          fontSize: '0.78rem',
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: PAPER_SURFACE,
          color: TEXT_PRIMARY,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: AMBER,
            '& + .MuiSwitch-track': {
              backgroundColor: alpha(AMBER, 0.4),
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: alpha(AMBER, 0.1), borderRadius: 2 },
        bar: { backgroundColor: AMBER },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: alpha(TEXT_SECONDARY, 0.08) },
      },
    },
  },
});

export default theme;
