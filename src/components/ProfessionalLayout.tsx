import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, 
  DollarSign, Moon, Sun, LogOut, FileText, 
  Settings as SettingsIcon, ChevronDown, ChevronUp,
  Factory, Package2, Truck, CheckSquare,
  Wallet, Brain, Menu, X, Bot,
  BarChart3, Activity, Zap, Cloud, Shield
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
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
  cashierRestricted?: boolean;
  badge?: string | number;
  category?: 'main' | 'analytics' | 'management' | 'tools';
}

const getNavigation = (t: (key: string) => string): { main: NavigationItem[]; analytics: NavigationItem[]; management: NavigationItem[]; tools: NavigationItem[] } => ({
  main: [
    { name: t('navigation.dashboard'), href: '/', icon: LayoutDashboard, category: 'main' },
    { name: t('navigation.sales'), href: '/sales', icon: ShoppingCart, category: 'main' },
    { name: t('navigation.orders'), href: '/orders', icon: Package, category: 'main' },
    { name: t('navigation.products'), href: '/products', icon: Package, category: 'main' },
    { name: t('navigation.customers'), href: '/customers', icon: Users, category: 'main' },
    { name: t('navigation.cashbox'), href: '/cashbox', icon: Wallet, category: 'main' },
    { name: t('navigation.cashierManagement'), href: '/cashiers', icon: Shield, adminOnly: true, category: 'main' },
    { name: t('navigation.reports'), href: '/reports', icon: FileText, category: 'main' },
    { name: t('navigation.settings'), href: '/settings', icon: SettingsIcon, category: 'main' },
  ],
  analytics: [
    { name: t('navigation.analytics'), href: '/analytics', icon: BarChart3, category: 'analytics' },
    { name: t('navigation.revenueCalculator'), href: '/revenue', icon: DollarSign, category: 'analytics' },
    { name: t('navigation.activityMonitor'), href: '/activity', icon: Activity, category: 'analytics' },
  ],
  management: [
    { name: t('navigation.inventory'), href: '/inventory', icon: Package2, category: 'management' },
    { name: t('navigation.suppliers'), href: '/suppliers', icon: Truck, category: 'management' },
    { name: t('navigation.production'), href: '/production', icon: Factory, category: 'management' },
    { name: t('navigation.qualityControl'), href: '/quality', icon: CheckSquare, category: 'management' },
    { name: t('navigation.logistics'), href: '/logistics', icon: Truck, category: 'management' },
  ],
  tools: [
    { name: t('navigation.aiAssistant'), href: '/ai-assistant', icon: Brain, category: 'tools' },
    { name: t('navigation.bots'), href: '/bots', icon: Bot, category: 'tools' },
    { name: t('navigation.cloudBackup'), href: '/cloud-backup', icon: Cloud, category: 'tools' },
    { name: t('navigation.shortcuts'), href: '/shortcuts', icon: Zap, category: 'tools' },
  ],
});

export default function ProfessionalLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['main', 'management']));
    
  const sidebarRef = useRef<HTMLDivElement>(null);

  useKeyboardShortcuts({
    'Ctrl+B': () => setIsSidebarOpen(!isSidebarOpen),
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (isMobile) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const navigation = getNavigation(t);
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const isCashier = user?.role?.toUpperCase() === 'CASHIER' || user?.role?.toUpperCase() === 'SELLER';

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = location.pathname === item.href || 
                   (item.href !== '/' && location.pathname.startsWith(item.href));
    
    if (item.adminOnly && !isAdmin) return null;
    if (item.cashierRestricted && isCashier) return null;

    return (
      <Link
        key={item.name}
        to={item.href}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out",
          "hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-md",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isActive 
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-glow hover:shadow-glow-lg" 
            : "text-gray-600"
        )}
      >
        <item.icon className={cn(
          "w-5 h-5 transition-all duration-300 ease-out",
          "group-hover:scale-110 group-hover:rotate-3",
          isActive && "text-white drop-shadow-md"
        )} />
        <span className="font-medium">{latinToCyrillic(item.name)}</span>
        {item.badge && (
          <span className={cn(
            "ml-auto px-2 py-1 text-xs font-bold rounded-full badge",
            isActive 
              ? "bg-white/30 text-white shadow-inner" 
              : "badge-blue"
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  // Kategoriya nomlarini o'zbek tiliga tarjima qilish
  const getCategoryName = (category: string) => {
    const translations: Record<string, string> = {
      'main': 'Asosiy',
      'analytics': 'Analitika',
      'management': 'Boshqaruv',
      'tools': 'Vositalar'
    };
    return latinToCyrillic(translations[category] || category);
  };

  const renderNavigationCategory = (category: string, items: NavigationItem[]) => {
    const isExpanded = expandedCategories.has(category);
    const hasActiveItem = items.some(item => 
      location.pathname === item.href || 
      (item.href !== '/' && location.pathname.startsWith(item.href))
    );

    return (
      <div key={category} className="mb-2">
        <button
          onClick={() => toggleCategory(category)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-200",
            "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500",
            hasActiveItem && "bg-blue-50 text-blue-700"
          )}
        >
          <span className="font-semibold text-sm uppercase tracking-wider">
            {getCategoryName(category)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-1 space-y-1 animate-slide-in">
            {items.map(renderNavigationItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 bg-dots-pattern">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 h-full glass-card border-r border-gray-200/50 shadow-2xl z-50 transition-all duration-300 ease-out",
          isSidebarOpen ? "w-56" : "w-12",
          isMobile && !isSidebarOpen && "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <div className="text-white font-bold text-lg">
                <span className="text-gradient animate-gradient">LUX PET PLAST</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {isSidebarOpen && (
                <div className="scale-90">
                  <LanguageSwitcher />
                </div>
              )}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 hover:scale-105"
              >
                {isSidebarOpen ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {Object.entries(navigation).map(([category, items]) => 
            renderNavigationCategory(category, items)
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200/50 bg-gradient-to-b from-transparent to-gray-50/50">
          <div className="space-y-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/80 hover:shadow-md transition-all duration-300 group"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-500 group-hover:animate-pulse-slow" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-500 group-hover:animate-bounce-gentle" />
              )}
              {isSidebarOpen && (
                <span className="font-medium text-gray-700">{t('settings.theme')}</span>
              )}
            </button>
            
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 hover:shadow-md text-red-600 transition-all duration-300 group"
            >
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              {isSidebarOpen && (
                <span className="font-medium">{t('auth.logout')}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      {isMobile && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-50 p-3 bg-white/90 backdrop-blur-xl rounded-xl shadow-float hover:shadow-glow transition-all duration-300 hover:scale-105"
        >
          {isSidebarOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-blue-600" />
          )}
        </button>
      )}

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        isSidebarOpen ? "ml-56" : "ml-12",
        isMobile && "ml-0"
      )}>
        
        {/* Page Content */}
        <main className="p-6">
          <div className="animate-fade-in transition-all duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
