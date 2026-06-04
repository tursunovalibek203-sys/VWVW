import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore();
  const location = useLocation();

  if (!token) {
    // Agar foydalanuvchi tizimga kirmagan bo'lsa, login sahifasiga qaytaramiz
    // Qaysi sahifaga kirmoqchi bo'lganini state da saqlab qolamiz (login qilsa o'sha joyga qaytishi uchun)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
