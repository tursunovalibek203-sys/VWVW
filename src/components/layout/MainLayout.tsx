import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const isCashierRoute = location.pathname.startsWith('/cashier');

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Main Content */}
      <main className={`${isCashierRoute ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation - only for cashier routes */}
      {isCashierRoute && <BottomNavigation />}
    </div>
  );
}
