// ROUTER layer — root layout with sidebar navigation.
import { useEffect }       from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar             from './components/Sidebar';
import NotificationBanner  from './components/NotificationBanner';
import { TicketPresenter } from './presenters/TicketPresenter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { checkPendingNotifications } from './services/notifScheduler';

import HomePage     from './pages/HomePage';
import UploadPage   from './pages/UploadPage';
import HistoryPage  from './pages/HistoryPage';
import ResultsPage  from './pages/ResultsPage';
import PredictPage  from './pages/PredictPage';
import SettingsPage from './pages/SettingsPage';

function AppLayout() {
  const { user } = useAuth();

  // Check + fire any pending draw-result notifications on mount and every 60s
  useEffect(() => {
    checkPendingNotifications();
    const interval = setInterval(checkPendingNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Not logged in — show login page full screen, no sidebar
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<HomePage />} />
      </Routes>
    );
  }

  // Logged in — show sidebar + app
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-body">
        <NotificationBanner />
        <main className="main-content">
          <Routes>
            <Route path="/"        element={<Navigate to="/upload" replace />} />
            <Route path="/upload"  element={<UploadPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/predict" element={<PredictPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TicketPresenter>
          <AppLayout />
        </TicketPresenter>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
