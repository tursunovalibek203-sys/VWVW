import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PackagePlus, BarChart3, LogOut, Package, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import LanguageSwitcher from '../components/LanguageSwitcher';

const WarehouseLayout = ({ children }: { children: React.ReactNode }) => {
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

  const isActive = (path: string) => {
    if (path === '/warehouse/products') {
      return location.pathname.startsWith('/warehouse/products') || location.pathname === '/warehouse/add-product';
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: '/warehouse', icon: LayoutDashboard, label: 'Bugun' },
    { path: '/warehouse/products', icon: Package, label: 'Ombor' },
    { path: '/warehouse/add-bag', icon: PackagePlus, label: "Qo'shish" },
    { path: '/warehouse/reports', icon: BarChart3, label: 'Hisobot' },
  ];

  const getInitials = (name: string) => {
    const parts = (name || '').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] ?? 'U').toUpperCase();
  };

  return (
    <div className="min-h-screen font-sans antialiased text-slate-900" style={{ background: '#f0fdf8' }}>
      {/* Header */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm'
            : 'bg-white border-b border-emerald-50'
        )}
      >
        <div className="max-w-2xl mx-auto flex justify-between items-center h-16 px-4">
          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}>
              <Package className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black tracking-tight text-slate-900 leading-none">LUX PET PLAST</span>
              <span className="text-[10px] font-semibold text-emerald-600 leading-tight mt-0.5">Ombor boshqaruvi</span>
            </div>
          </div>

          {/* Right: user + actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-24 sm:w-28 flex-shrink-0">
              <LanguageSwitcher />
            </div>
            {isAdmin() && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin panel
              </button>
            )}
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</span>
              <span className="text-[10px] font-medium text-emerald-600 leading-tight">Ombor mudiri</span>
            </div>
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-black shadow-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
            >
              {getInitials(user?.name ?? 'U')}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200"
              aria-label="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100"
        style={{ boxShadow: '0 -8px 32px rgba(5,150,105,0.08)' }}>
        <div className="max-w-2xl mx-auto flex items-stretch">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center flex-1 py-2.5 min-h-[64px] group transition-all duration-200"
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-12 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #059669, #0d9488)' }}
                  />
                )}
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200',
                  active
                    ? 'text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50'
                )}
                  style={active ? { background: 'linear-gradient(135deg, #059669, #0d9488)' } : {}}>
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={cn(
                  'text-[10px] font-bold mt-1 tracking-wide transition-colors',
                  active ? 'text-emerald-700' : 'text-slate-400'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main */}
      <main className="pt-16 pb-[76px] w-full min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default WarehouseLayout;
