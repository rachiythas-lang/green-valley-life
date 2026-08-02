import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface AuthState {
  token: string | null;
  user: any | null;
  loginStreak: number;
  morningBonus: any | null;
  loading: boolean;
  hydrated: boolean;
  setAuth: (token: string, user: any, extra?: any) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, displayName: string) => Promise<any>;
  loginGuest: (displayName?: string) => Promise<void>;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loginStreak: 0,
      morningBonus: null,
      loading: false,
      hydrated: false,

      setHydrated: (v) => set({ hydrated: v }),

      setAuth: (token, user, extra) =>
        set({
          token,
          user,
          loginStreak: extra?.loginStreak ?? 0,
          morningBonus: extra?.morningBonus ?? null,
        }),

      logout: () => {
        set({ token: null, user: null, loginStreak: 0, morningBonus: null });
      },

      fetchMe: async () => {
        if (!get().token) return;
        try {
          const { data } = await api.get('/api/auth/me');
          set({
            user: data.user,
            loginStreak: data.loginStreak || data.user?.loginStreak || 0,
          });
        } catch (e: any) {
          // ล้าง token เฉพาะตอน 401 เท่านั้น — อย่าเตะออกเพราะเน็ตหลุด
          if (e?.response?.status === 401) {
            set({ token: null, user: null });
          }
        }
      },

      login: async (email, password) => {
        set({ loading: true });
        try {
          const { data } = await api.post('/api/auth/login', { email, password });
          set({
            token: data.token,
            user: data.user,
            loginStreak: data.loginStreak || 0,
            morningBonus: data.morningBonus || null,
            loading: false,
          });
          return data;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      register: async (email, password, displayName) => {
        set({ loading: true });
        try {
          const { data } = await api.post('/api/auth/register', { email, password, displayName });
          set({
            token: data.token,
            user: data.user,
            loginStreak: 1,
            morningBonus: null,
            loading: false,
          });
          return data;
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      loginGuest: async (displayName) => {
        set({ loading: true });
        try {
          const { data } = await api.post('/api/auth/guest', { displayName });
          set({
            token: data.token,
            user: data.user,
            loginStreak: data.loginStreak || 1,
            loading: false,
          });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },
    }),
    {
      name: 'gvl-auth',
      partialize: (s) => ({ token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
