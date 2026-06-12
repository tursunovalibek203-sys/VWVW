import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const TOKEN_TTL = 12 * 60 * 60 * 1000;

function readLocalToken(): { token: string | null; loginTime: number | null } {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return { token: null, loginTime: null };
    const parsed = JSON.parse(raw);
    return {
      token: parsed?.state?.token ?? null,
      loginTime: parsed?.state?.loginTime ?? null,
    };
  } catch {
    return { token: null, loginTime: null };
  }
}

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { token: storeToken, isTokenValid, _hasHydrated } = useAuthStore();
  const location = useLocation();

  // Fallback: localStorage dan to'g'ri o'qish (agar Zustand hydration ishlamasa)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Zustand hydration tugadi yoki 300ms o'tdi — ikkalasi ham yetarli
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const isHydrated = _hasHydrated || ready;

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Zustand store'dan foydalanish, yoki localStorage fallback
  let token = storeToken;
  let loginTime: number | null = null;

  if (!token) {
    const local = readLocalToken();
    token = local.token;
    loginTime = local.loginTime;
  }

  const isValid = token
    ? (storeToken ? isTokenValid() : loginTime !== null && Date.now() - loginTime < TOKEN_TTL)
    : false;

  if (!token || !isValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
