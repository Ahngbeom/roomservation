import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/rooms/RoomsPage';
import { RoomDetailPage } from './pages/rooms/RoomDetailPage';
import { ReservationsPage } from './pages/reservations/ReservationsPage';
import { ReservationDetailPage } from './pages/reservations/ReservationDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { MainLayout } from './components/layouts/MainLayout';
import { AuthLayout } from './components/layouts/AuthLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

function AppContent() {
  const navigate = useNavigate();
  const { initialize, isInitialized, logout } = useAuthStore();

  useEffect(() => {
    // 앱 시작 시 인증 상태 초기화
    initialize();
  }, [initialize]);

  useEffect(() => {
    // auth:logout 이벤트 리스너 (토큰 만료 시 ApiClient에서 발생)
    const handleLogout = () => {
      logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout, navigate]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/reservations/:id" element={<ReservationDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
