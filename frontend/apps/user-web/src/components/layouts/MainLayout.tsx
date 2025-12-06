import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '@roomservation/api-client';

export const MainLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center px-2 text-xl font-bold text-primary">
                방 예약 서비스
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/rooms"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
                >
                  방 목록
                </Link>
                <Link
                  to="/reservations"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
                >
                  내 예약
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.name}</span>
              <Link
                to="/profile"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                프로필
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};
