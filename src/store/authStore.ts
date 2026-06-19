import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { checkPermission, PermissionType } from '../lib/permissions';

const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 kun (JWT bilan mos)

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loginTime: number | null;
  _hasHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permission: PermissionType) => boolean;
  isAdmin: () => boolean;
  isCashier: () => boolean;
  isSeller: () => boolean;
  isTokenValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loginTime: null,
      _hasHydrated: false,
      setAuth: (token, user) => {
        set({ token, user, loginTime: Date.now() });
      },
      logout: () => {
        set({ token: null, user: null, loginTime: null });
      },
      isTokenValid: () => {
        const { token, loginTime } = get();
        if (!token || !loginTime) return false;
        return Date.now() - loginTime < TOKEN_TTL;
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
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        loginTime: state.loginTime,
      }),
      onRehydrateStorage: () => (state) => {
        // Hydration tugadi — flag qo'yamiz
        useAuthStore.setState({ _hasHydrated: true });

        // 12 soatdan o'tgan bo'lsa token o'chiramiz
        if (state?.loginTime && Date.now() - state.loginTime > TOKEN_TTL) {
          useAuthStore.setState({ token: null, user: null, loginTime: null });
        }
      },
    }
  )
);
