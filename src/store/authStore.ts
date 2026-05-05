import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  hasPermission: (permission: string) => boolean;
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
        const { token } = get();
        // Clear from storage
        set({ token: null, user: null });
      },
      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        // Case-insensitive role check
        const userRole = user.role?.toLowerCase();
        const requiredRole = permission?.toLowerCase();
        return userRole === requiredRole || userRole === 'admin';
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage), // XSS protection: sessionStorage instead of localStorage
    }
  )
);
