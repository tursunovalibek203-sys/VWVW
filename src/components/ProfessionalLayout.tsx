import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, ShoppingCart, Users,
  DollarSign, LogOut, FileText,
  Settings as SettingsIcon,
  Factory, Package2, Truck, CheckSquare,
  Wallet, Brain, Menu, Bot,
  BarChart3, Activity, Zap, Cloud, Shield,
  PanelLeftClose, PanelLeft, BookOpen,
  X, Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { latinToCyrillic } from '../lib/transliterator';
import LanguageSwitcher from './LanguageSwitcher';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
  allowedRoles?: string[];
}

interface NavSection {
  key: string;
  label: string;
  items: NavigationItem[];
}

const SELLER_ROLES = ['ADMIN', 'SELLER', 'CASHIER'];
const FINANCE_ROLES = ['ADMIN', 'ACCOUNTANT'];
const WAREHOUSE_ROLES = ['ADMIN', 'WAREHOUSE_MANAGER'];

const getSections = (t: (key: string) => string): NavSection[] => [
  {
    key: 'main',
    label: 'Asosiy',
    items: [
      { name: t('navigation.dashboard'), href: '/dashboard', icon: LayoutDashboard },
      { name: 'Kassir paneli', href: '/cashier/sales', icon: ShoppingCart, allowedRoles: SELLER_ROLES },
      { name: t('navigation.sales'), href: '/sales', icon: ShoppingCart, allowedRoles: [...SELLER_ROLES, 'ACCOUNTANT'] },
      { name: t('navigation.products'), href: '/products', icon: Package2 },
      { name: t('navigation.customers'), href: '/customers', icon: Users, allowedRoles: [...SELLER_ROLES, 'ACCOUNTANT'] },
      { name: t('navigation.cashbox'), href: '/cashbox', icon: Wallet, allowedRoles: FINANCE_ROLES },
      { name: 'Daftar', href: '/daftar', icon: BookOpen, allowedRoles: FINANCE_ROLES },
      { name: t('navigation.cashierManagement'), href: '/cashiers', icon: Shield, adminOnly: true },
      { name: t('navigation.reports'), href: '/reports', icon: FileText, allowedRoles: FINANCE_ROLES },
      { name: t('navigation.settings'), href: '/settings', icon: SettingsIcon, adminOnly: true },
    ],
  },
  {
    key: 'analytics',
    label: 'Analitika',
    items: [
      { name: t('navigation.analytics'), href: '/analytics', icon: BarChart3, allowedRoles: FINANCE_ROLES },
      { name: t('navigation.revenueCalculator'), href: '/revenue', icon: DollarSign, allowedRoles: FINANCE_ROLES },
      { name: t('navigation.activityMonitor'), href: '/activity', icon: Activity, allowedRoles: FINANCE_ROLES },
    ],
  },
  {
    key: 'management',
    label: 'Boshqaruv',
    items: [
      { name: t('navigation.inventory'), href: '/inventory', icon: Package2, allowedRoles: WAREHOUSE_ROLES },
      { name: t('navigation.suppliers'), href: '/suppliers', icon: Truck, allowedRoles: WAREHOUSE_ROLES },
      { name: t('navigation.production'), href: '/production', icon: Factory, allowedRoles: WAREHOUSE_ROLES },
      { name: t('navigation.qualityControl'), href: '/quality', icon: CheckSquare, allowedRoles: WAREHOUSE_ROLES },
      { name: t('navigation.logistics'), href: '/logistics', icon: Truck, allowedRoles: [...WAREHOUSE_ROLES, 'DRIVER'] },
    ],
  },
  {
    key: 'tools',
    label: 'Vositalar',
    items: [
      { name: t('navigation.aiAssistant'), href: '/ai-assistant', icon: Brain, allowedRoles: FINANCE_ROLES },
      { name: t('navigation.bots'), href: '/bots', icon: Bot, adminOnly: true },
      { name: t('navigation.cloudBackup'), href: '/cloud-backup', icon: Cloud, adminOnly: true },
      { name: t('navigation.shortcuts'), href: '/shortcuts', icon: Zap },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Boshqaruv paneli',
  '/sales': 'Sotuvlar',
  '/sales/add': 'Yangi sotuv',
  '/products': 'Mahsulotlar',
  '/add-product': 'Yangi mahsulot',
  '/customers': 'Mijozlar',
  '/cashbox': 'Kassa',
  '/daftar': 'Daftar',
  '/cashiers': 'Xodimlar',
  '/reports': 'Hisobotlar',
  '/settings': 'Sozlamalar',
  '/analytics': 'Analitika',
  '/revenue': "Daromad kalkulyatori",
  '/activity': 'Faoliyat jurnali',
  '/inventory': 'Inventar',
  '/suppliers': "Ta'minotchilar",
  '/production': 'Ishlab chiqarish',
  '/quality': 'Sifat nazorati',
  '/logistics': 'Logistika',
  '/ai-assistant': 'AI Yordamchi',
  '/bots': 'Botlar',
  '/cloud-backup': 'Bulut zaxira',
  '/shortcuts': 'Klaviatura yorliqlari',
  '/cashier/sales': 'Kassir - Sotuvlar',
  '/cashier/sales/add': 'Kassir - Yangi sotuv',
  '/cashier/products': 'Kassir - Mahsulotlar',
  '/cashier/customers': 'Kassir - Mijozlar',
  '/cashier/cashbox': 'Kassir - Kassa',
  '/cashier/orders': 'Kassir - Buyurtmalar',
  '/cashier/expenses': 'Kassir - Xarajatlar',
  '/cashier/inventory': 'Kassir - Inventar',
  '/cashier/chat': 'Kassir - Chat',
};

const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find(k => pathname.startsWith(k + '/'));
  return prefix ? PAGE_TITLES[prefix] : 'LUX PET PLAST';
};

export default function ProfessionalLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);

  useKeyboardShortcuts({ 'Ctrl+B': () => setCollapsed((c) => !c) });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString('uz-UZ', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateDate();
    const timer = setInterval(updateDate, 60_000);
    return () => clearInterval(timer);
  }, []);

  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const sections = getSections(t);

  const isItemActive = (href: string) =>
    location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href));

  const iconOnly = collapsed && !isMobile;

  const renderItem = (item: NavigationItem) => {
    if (item.adminOnly && !isUserAdmin) return null;
    if (item.allowedRoles && !isUserAdmin) {
      const userRole = user?.role?.toUpperCase() || '';
      if (!item.allowedRoles.includes(userRole)) return null;
    }
    const active = isItemActive(item.href);
    return (
      <Link
        key={item.href}
        to={item.href}
        title={iconOnly ? latinToCyrillic(item.name) : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150',
          iconOnly ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
          active
            ? 'bg-indigo-100 text-indigo-800'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-indigo-600" />
        )}
        <item.icon
          className={cn('w-5 h-5 flex-shrink-0', active ? 'text-indigo-700' : 'text-slate-400')}
          strokeWidth={2}
        />
        {!iconOnly && <span className="truncate">{latinToCyrillic(item.name)}</span>}
      </Link>
    );
  };

  const pageTitle = latinToCyrillic(getPageTitle(location.pathname));
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  const sidebar = (
    <aside
      ref={sidebarRef}
      className={cn(
        'flex flex-col bg-white border-r border-slate-200 h-full transition-[width] duration-200',
        iconOnly ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-slate-100 flex-shrink-0',
          iconOnly ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        {!iconOnly && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight truncate">LUX PET PLAST</span>
          </div>
        )}
        {iconOnly && (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">LP</span>
          </div>
        )}
        {!isMobile && !iconOnly && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Yig'ish (Ctrl+B)"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Til almashtirish */}
      <div
        className={cn(
          'flex border-b border-slate-100 flex-shrink-0 py-2',
          iconOnly ? 'justify-center px-2' : 'px-4'
        )}
      >
        <LanguageSwitcher iconOnly={iconOnly} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {iconOnly && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex justify-center p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Ochish (Ctrl+B)"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}
        {sections.map((section) => {
          const visible = section.items.filter((i) => !(i.adminOnly && !isUserAdmin));
          if (visible.length === 0) return null;
          return (
            <div key={section.key} className="space-y-0.5">
              {!iconOnly && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {latinToCyrillic(section.label)}
                </p>
              )}
              {section.items.map(renderItem)}
            </div>
          );
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="border-t border-slate-100 p-3 flex-shrink-0">
        <div className={cn('flex items-center gap-3', iconOnly && 'justify-center')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">{userInitial}</span>
          </div>
          {!iconOnly && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Foydalanuvchi'}</p>
              <p className="text-xs text-indigo-600 capitalize truncate">{user?.role?.toLowerCase()}</p>
            </div>
          )}
          <button
            onClick={logout}
            title={latinToCyrillic('Chiqish')}
            className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors flex-shrink-0"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Desktop sidebar (fixed) */}
      {!isMobile && (
        <div className="fixed inset-y-0 left-0 z-40">{sidebar}</div>
      )}

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 shadow-2xl">{sidebar}</div>
        </>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 flex-shrink-0"
            aria-label="Menyu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">LP</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm truncate">{pageTitle}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {userInitial}
          </div>
        </header>
      )}

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-[padding] duration-200',
          !isMobile && (iconOnly ? 'pl-[72px]' : 'pl-64'),
          isMobile && 'pt-14'
        )}
      >
        {/* Desktop sticky top header */}
        {!isMobile && (
          <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 flex items-center justify-between px-6 flex-shrink-0">
            {/* Left: page title */}
            <h2 className="text-sm font-semibold text-slate-700">{pageTitle}</h2>

            {/* Right: date + user */}
            <div className="flex items-center gap-4">
              {currentDate && (
                <span className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  {currentDate}
                </span>
              )}
              <div className="w-px h-4 bg-slate-200 hidden lg:block" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                  {userInitial}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-semibold text-slate-800 leading-none">
                    {user?.name || 'Foydalanuvchi'}
                  </p>
                  <p className="text-[10px] text-indigo-600 capitalize mt-0.5">
                    {user?.role?.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
