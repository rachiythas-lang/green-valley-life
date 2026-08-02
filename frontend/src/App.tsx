import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import GamePage from './pages/GamePage';

function Guard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, fetchMe } = useAuthStore();
  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/game" element={<Guard><GamePage /></Guard>} />
      <Route path="*" element={<Navigate to={token ? '/game' : '/login'} replace />} />
    </Routes>
  );
}
