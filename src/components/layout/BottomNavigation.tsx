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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.path);
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                isActive 
                  ? 'text-blue-600 bg-blue-50/50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                {latinToCyrillic(item.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
