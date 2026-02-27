import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import { LoginPage } from './features/login/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

const AppWithToast = () => (
  <ToastProvider>
    <App />
  </ToastProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
          path="/work-assign"
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
    </BrowserRouter>
  </StrictMode>,
);
