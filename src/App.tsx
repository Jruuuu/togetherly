import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoginPage from './pages/Auth/LoginPage';
import CoupleDashboard from './pages/CoupleDashboard/CoupleDashboard';
import VolunteerSignupPage from './pages/VolunteerSignup/VolunteerSignupPage';
import CalendarPage from './pages/Calendar/CalendarPage';
import NotFound from './pages/NotFound';
import { NotificationToast } from './components/shared/NotificationToast';
import { useAuth } from './contexts/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/auth/login" element={<LoginPage />} />
              <Route
                path="/invite/:coupleId/:linkId"
                element={<VolunteerSignupPage />}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <CoupleDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/auth/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <NotificationToast />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

