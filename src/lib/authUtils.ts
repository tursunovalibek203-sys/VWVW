import { useAuthStore } from '../store/authStore';

// Token refresh vaqti (5 daqiqa oldindan)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms

// Tokenni tekshirish va yangilash
export const checkAndRefreshToken = async () => {
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) return false;

  try {
    const { state } = JSON.parse(authStorage);
    if (!state.token) return false;

    // Token payload ni olish
    const payload = JSON.parse(atob(state.token.split('.')[1]));
    const now = Date.now();
    const expiresAt = payload.exp * 1000;

    // Agar token tez orada eskirsa, yangilash
    if (expiresAt - now < TOKEN_REFRESH_THRESHOLD) {
      console.log('🔄 Token yangilanmoqda...');
      await refreshToken();
      return true;
    }

    return true;
  } catch (error) {
    console.error('Token tekshirish xatoligi:', error);
    return false;
  }
};

// Yangi token olish
const refreshToken = async () => {
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) throw new Error('Token topilmadi');

  const { state } = JSON.parse(authStorage);
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Token yangilash xatoligi');
    }

    const { token } = await response.json();
    const { setAuth } = useAuthStore.getState();
    
    // Token yangilash
    setAuth(token, state.user);
    console.log('✅ Token muvaffaqiyatli yangilandi');
  } catch (error) {
    console.error('❌ Token yangilash xatoligi:', error);
    // Agar yangilash bo'lmasa, logout qilish
    useAuthStore.getState().logout();
    throw error;
  }
};

// Token validligini tekshirish
export const isTokenValid = () => {
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) return false;

  try {
    const { state } = JSON.parse(authStorage);
    if (!state.token) return false;

    const payload = JSON.parse(atob(state.token.split('.')[1]));
    const now = Date.now();
    const expiresAt = payload.exp * 1000;

    return expiresAt > now;
  } catch (error) {
    return false;
  }
};

// Auto logout oldin sessiyani saqlash
export const saveSessionBeforeLogout = () => {
  const currentPath = window.location.pathname;
  const scrollPosition = window.scrollY;
  
  sessionStorage.setItem('lastSession', JSON.stringify({
    path: currentPath,
    scrollPosition,
    timestamp: Date.now()
  }));
};

// Sessiyani tiklash
export const restoreLastSession = () => {
  const sessionData = sessionStorage.getItem('lastSession');
  if (!sessionData) return null;

  try {
    const session = JSON.parse(sessionData);
    const sessionAge = Date.now() - session.timestamp;
    
    // Agar sessiya 1 soatdan eski bo'lsa, tiklamaslik
    if (sessionAge > 60 * 60 * 1000) {
      sessionStorage.removeItem('lastSession');
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
};
