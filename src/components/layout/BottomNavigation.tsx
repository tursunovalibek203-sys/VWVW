import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Users, Wallet, ClipboardList, MessageCircle } from 'lucide-react';
import { latinToCyrillic } from '../../lib/transliterator';

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'sotuv', icon: ShoppingCart, label: 'SOTUV', path: '/cashier/sales' },
  { id: 'ombor', icon: Package, label: 'OMBOR', path: '/cashier/inventory' },
  { id: 'mijozlar', icon: Users, label: 'MIJOZLAR', path: '/cashier/customers' },
  { id: 'kassa', icon: Wallet, label: 'KASSA', path: '/cashier/cashbox' },
  { id: 'buyurtma', icon: ClipboardList, label: 'BUYURTMA', path: '/cashier/orders' },

  { id: 'chat', icon: MessageCircle, label: 'CHAT', path: '/cashier/chat' },
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] z-50">
      <div className="flex items-center justify-around h-[60px] max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={[
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl mx-0.5 transition-all duration-150',
                isActive
                  ? 'text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              <div className={[
                'relative flex items-center justify-center w-9 h-6 rounded-lg transition-all duration-150',
                isActive ? 'bg-indigo-50' : '',
              ].join(' ')}>
                {isActive && (
                  <span className="absolute inset-0 rounded-lg bg-indigo-100/60" />
                )}
                <Icon className={`w-[18px] h-[18px] relative z-10 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={[
                'text-[9px] uppercase tracking-wider leading-none',
                isActive ? 'font-bold text-indigo-600' : 'font-medium text-slate-400',
              ].join(' ')}>
                {latinToCyrillic(item.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
