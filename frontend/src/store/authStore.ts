import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'contributor' | 'agent' | 'operations_admin' | 'super_admin';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  role: UserRole | null;
  login: (token: string, userId: string, role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      userId: null,
      role: null,
      login: (token, userId, role) =>
        set({ isAuthenticated: true, token, userId, role }),
      logout: () =>
        set({ isAuthenticated: false, token: null, userId: null, role: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
