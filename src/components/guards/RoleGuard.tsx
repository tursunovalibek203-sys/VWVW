import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { PermissionType } from '../../lib/permissions';

interface RoleGuardProps {
  requiredPermission?: PermissionType;
  allowedRoles?: string[];
  children: React.ReactNode;
  fallback?: string;
}

export const RoleGuard = ({ 
  requiredPermission, 
  allowedRoles, 
  children, 
  fallback = '/dashboard' 
}: RoleGuardProps) => {
  const { user, hasPermission, isAdmin } = useAuthStore();
  const userRole = user?.role?.toUpperCase() || '';

  // Admin hamma joyga kira oladi
  if (isAdmin()) {
    return <>{children}</>;
  }

  // Permission bo'yicha tekshirish
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={fallback} replace />;
  }

  // Rol bo'yicha qattiq tekshirish (agar kerak bo'lsa)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
