import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Calculator,
  LogOut,
  User,
  Users,
  ClipboardList,
  Plus,
  MessageCircle,
  Shield,
  Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

const CashierLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const isInventoryPage =
    location.pathname === '/cashier/products' || location.pathname === '/cashier/inventory';

  // Bitta accent (indigo) — har element uchun alohida rang YO'Q (professional, izchil)
  const navItems = [
    { path: '/cashier/sales', icon: ShoppingCart, label: 'Sotuv' },
    { path: '/cashier/products', icon: Package, label: 'Ombor' },
    { path: '/cashier/customers', icon: Users, label: 'Mijozlar' },
    { path: '/cashier/cashbox', icon: Calculator, label: 'Kassa' },
    { path: '/cashier/drivers', icon: Truck, label: 'Haydovchi' },
    { path: '/cashier/chat', icon: MessageCircle, label: 'Chat' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* Header */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-200 bg-white border-b',
          isScrolled ? 'border-slate-200 shadow-sm' : 'border-slate-100'
        )}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16 px-4 sm:px-6">
          {/* Logo + kompaniya */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm overflow-hidden"
              style={{
                backgroundImage: 'url("/logo.png")',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
              title="LUX PET PLAST"
            >
              {/* logo.png bo'lmasa fallback harf */}
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight text-slate-900 truncate">
                LUX PET PLAST
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium leading-tight truncate">
                Buxoro viloyati, Vobkent tumani
              </p>
            </div>
          </div>

          {/* Foydalanuvchi */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Admin uchun professional panelga o'tish tugmasi */}
            {isAdmin() && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-xs font-semibold"
                title="Admin paneliga o'tish"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</span>
              <span className="text-xs text-indigo-600 font-medium leading-tight">
                {isAdmin() ? 'Admin' : 'Kassir'}
              </span>
            </div>
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors duration-200"
              title="Chiqish"
              aria-label="Chiqish"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom navigation — bitta indigo accent, touch-friendly */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <div className="max-w-3xl mx-auto flex items-stretch justify-between px-1 sm:px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center flex-1 py-2 min-h-[60px] group"
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-indigo-600" />
                )}
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold tracking-wide mt-1 transition-colors',
                    active ? 'text-indigo-600' : 'text-slate-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="pt-16 pb-24 w-full">
        {/* Kontekstga mos suzuvchi tugma (FAB) */}
        {!isActive('/cashier/sales') && (
          <button
            type="button"
            onClick={() =>
              isInventoryPage ? navigate('/cashier/add-product') : navigate('/cashier/sales')
            }
            className="fixed right-5 sm:right-8 bottom-24 w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/40 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200 z-40 group"
            title={isInventoryPage ? 'Yangi mahsulot' : 'Yangi sotuv'}
            aria-label={isInventoryPage ? 'Yangi mahsulot' : 'Yangi sotuv'}
          >
            <Plus className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}

        {children}
      </main>
    </div>
  );
};

export default CashierLayout;
