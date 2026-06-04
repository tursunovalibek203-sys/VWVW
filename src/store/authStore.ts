import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { checkPermission, PermissionType } from '../lib/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permission: PermissionType) => boolean;
  isAdmin: () => boolean;
  isCashier: () => boolean;
  isSeller: () => boolean;
}

// Persist auth state to sessionStorage (more secure than localStorage against XSS)
// NOTE: For production, use httpOnly cookies instead
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        set({ token, user });
      },
      logout: () => {
        // Clear from storage
        set({ token: null, user: null });
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
      storage: createJSONStorage(() => sessionStorage), // XSS protection: sessionStorage instead of localStorage
    }
  )
);
