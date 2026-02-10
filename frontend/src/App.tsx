import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { initOfflineStorage } from './utils/offlineStorage';
import { startBackgroundSync } from './services/syncService';
import AgentLayout from './pages/agent/AgentLayout';
import AdminLayout from './pages/admin/AdminLayout';
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import LoginPage from './pages/LoginPage';
import './styles/theme.css';

function App() {
  const { isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    // Initialize offline storage first, then start sync
    const initialize = async () => {
      try {
        await initOfflineStorage();
        // Start background sync only after storage is initialized
        cleanup = startBackgroundSync();
      } catch (error) {
        console.error('Failed to initialize offline storage', error);
      }
    };

    initialize();

    // Generate device ID if not exists
    if (!localStorage.getItem('deviceId')) {
      const deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('deviceId', deviceId);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Agent Routes */}
        <Route
          path="/agent/*"
          element={
            isAuthenticated && role === 'agent' ? (
              <AgentLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            isAuthenticated && role === 'operations_admin' ? (
              <AdminLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Super Admin Routes */}
        <Route
          path="/super-admin/*"
          element={
            isAuthenticated && role === 'super_admin' ? (
              <SuperAdminLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
