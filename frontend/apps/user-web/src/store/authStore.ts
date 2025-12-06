import { create } from 'zustand';
import type { User } from '@roomservation/shared-types';
import { apiClient, authApi } from '@roomservation/api-client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    apiClient.clearAccessToken();
    set({ user: null, isAuthenticated: false });
  },
  initialize: async () => {
    const token = apiClient.getAccessToken();
    if (token) {
      try {
        const user = await authApi.getProfile();
        set({ user, isAuthenticated: true, isInitialized: true });
      } catch {
        // 토큰이 유효하지 않으면 삭제
        apiClient.clearAccessToken();
        set({ user: null, isAuthenticated: false, isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },
}));
