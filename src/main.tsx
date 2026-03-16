import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import { LoginPage } from './features/login/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { ElectronUpdateBanner } from './components/ElectronUpdateBanner';
import './index.css';

const isElectron =
  typeof window !== 'undefined' &&
  (
    !!window.electronAPI ||
    window.location.protocol === 'file:' ||
    navigator.userAgent.includes('Electron')
  );
const Router = isElectron ? HashRouter : BrowserRouter;
const routerBasename =
  isElectron || import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL;

function ElectronHashFallback() {
  useEffect(() => {
    if (!isElectron) return;
    const h = window.location.hash;
    if (h === '' || h === '#') window.location.hash = '#/';
  }, []);
  return null;
}

const AppWithToast = () => (
  <ToastProvider>
    <App />
  </ToastProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router basename={routerBasename}>
      <ElectronHashFallback />
      <ElectronUpdateBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/general-chat"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cad"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-assign"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared-calendar"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-journal"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-log"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/personnel"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/personnel/:userId"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectNameEncoded"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task/:taskId"
          element={
            <ProtectedRoute>
              <AppWithToast />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/general-chat" replace />} />
      </Routes>
    </Router>
  </StrictMode>,
);
