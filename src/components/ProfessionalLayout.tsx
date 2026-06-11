import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  DollarSign, LogOut, FileText,
  Settings as SettingsIcon,
  Factory, Package2, Truck, CheckSquare,
  Wallet, Brain, Menu, Bot,
  BarChart3, Activity, Zap, Cloud, Shield,
  PanelLeftClose, PanelLeft, User as UserIcon, BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { latinToCyrillic } from '../lib/transliterator';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
  allowedRoles?: string[]; // if set, only these roles (+ ADMIN) can see this item
}

interface NavSection {
  key: string;
  label: string;
  items: NavigationItem[];
}

const SELLER_ROLES = ['ADMIN', 'SELLER', 'CASHIER'];
const FINANCE_ROLES = ['ADMIN', 'ACCOUNTANT'];
const WAREHOUSE_ROLES = ['ADMIN', 'WAREHOUSE_MANAGER'];
const MGMT_ROLES = ['ADMIN', 'SELLER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT'];

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

export default function ProfessionalLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useKeyboardShortcuts({ 'Ctrl+B': () => setCollapsed((c) => !c) });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false); // route o'zgarsa mobil menyuni yopish
  }, [location.pathname]);

  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const sections = getSections(t);

  const isItemActive = (href: string) =>
    location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href));

  // collapsed faqat desktop'da; mobil drawerda doim to'liq (labellar bilan)
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
          'relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-150',
          iconOnly ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
          active
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-600" />}
        <item.icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-indigo-600' : 'text-slate-400')} strokeWidth={2} />
        {!iconOnly && <span className="truncate">{latinToCyrillic(item.name)}</span>}
      </Link>
    );
  };

  const sidebar = (
    <aside
      ref={sidebarRef}
      className={cn(
        'flex flex-col bg-white border-r border-slate-200 h-full transition-[width] duration-200',
        iconOnly ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center h-16 border-b border-slate-100 flex-shrink-0', iconOnly ? 'justify-center px-2' : 'justify-between px-4')}>
        {!iconOnly && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight truncate">LUX PET PLAST</span>
          </div>
        )}
        {iconOnly && (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
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
            <div key={section.key} className="space-y-1">
              {!iconOnly && (
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-5 h-5 text-slate-500" />
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
          <div className="fixed inset-0 bg-slate-900/40 z-40" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50">{sidebar}</div>
        </>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">LP</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">LUX PET PLAST</span>
          </div>
        </header>
      )}

      {/* Main content */}
      <div
        className={cn(
          'transition-[padding] duration-200',
          !isMobile && (iconOnly ? 'pl-[72px]' : 'pl-64'),
          isMobile && 'pt-14'
        )}
      >
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
