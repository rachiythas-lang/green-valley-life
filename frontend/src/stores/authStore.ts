import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  character?: any;
  farm?: any;
  inventory?: any[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  loginGuest: (displayName?: string) => Promise<void>;
  login: (data: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,

      setAuth: (token, user) => set({ token, user }),

      logout: () => {
        set({ token: null, user: null });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const { data } = await api.get('/api/auth/me');
          set({ user: data.user });
        } catch {
          set({ token: null, user: null });
        }
      },

      loginGuest: async (displayName) => {
        set({ loading: true });
        try {
          const { data } = await api.post('/api/auth/guest', { displayName });
          set({ token: data.token, user: data.user, loading: false });
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      login: async (payload) => {
        set({ loading: true });
        try {
          const { data } = await api.post('/api/auth/login', payload);
          set({ token: data.token, user: data.user, loading: false });
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },
    }),
    {
      name: 'gvl-auth',
      partialize: (s) => ({ token: s.token }),
    }
  )
);
