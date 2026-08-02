import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import GamePage from './pages/GamePage';
import AdminPage from './pages/AdminPage';

function Guard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  if (!hydrated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-pixel-grass">
        <p className="font-cute font-bold text-white text-sm">โหลด...</p>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, fetchMe, hydrated } = useAuthStore();

  useEffect(() => {
    // กรณี persist โหลดช้า บนบางเบราว์เซอร์
    if (!hydrated) {
      const t = setTimeout(() => useAuthStore.getState().setHydrated(true), 300);
      return () => clearTimeout(t);
    }
  }, [hydrated]);

  useEffect(() => {
    if (token && hydrated) fetchMe();
  }, [token, hydrated]);

  if (!hydrated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-pixel-grass">
        <div className="panel-cream px-6 py-4 font-cute font-extrabold text-pixel-dark">🌱 Green Valley...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/game" replace /> : <LoginPage />} />
      <Route path="/game" element={<Guard><GamePage /></Guard>} />
      <Route path="/admin" element={<Guard><AdminPage /></Guard>} />
      <Route path="*" element={<Navigate to={token ? '/game' : '/login'} replace />} />
    </Routes>
  );
}
