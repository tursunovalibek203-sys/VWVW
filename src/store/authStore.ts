import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { checkPermission, PermissionType } from '../lib/permissions';

const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 soat

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loginTime: number | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permission: PermissionType) => boolean;
  isAdmin: () => boolean;
  isCashier: () => boolean;
  isSeller: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loginTime: null,
      setAuth: (token, user) => {
        set({ token, user, loginTime: Date.now() });
      },
      logout: () => {
        set({ token: null, user: null, loginTime: null });
      },
      hasPermission: (permission: PermissionType) => {
        const { user } = get();
        return checkPermission(user?.role, permission);
      },
      isAdmin: () => {
        const { user } = get();
        return user?.role?.toUpperCase() === 'ADMIN';
      },
      isCashier: () => {
        const { user } = get();
        const role = user?.role?.toUpperCase();
        return role === 'CASHIER' || role === 'SELLER';
      },
      isSeller: () => {
        const { user } = get();
        return user?.role?.toUpperCase() === 'SELLER';
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.loginTime && Date.now() - state.loginTime > TOKEN_TTL) {
          state.token = null;
          state.user = null;
          state.loginTime = null;
        }
      },
    }
  )
);
