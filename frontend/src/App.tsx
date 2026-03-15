import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import SourcesPage from './pages/SourcesPage';
import ArticlesPage from './pages/ArticlesPage';
import SummariesPage from './pages/SummariesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/summaries" element={<SummariesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
