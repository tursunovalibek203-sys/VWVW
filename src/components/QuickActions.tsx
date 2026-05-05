import { useState } from 'react';
import { Plus, ShoppingCart, Package, Users, DollarSign, Factory, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './Card';

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      icon: ShoppingCart,
      label: 'Yangi Sotuv',
      color: 'bg-green-500 hover:bg-green-600',
      path: '/sales',
    },
    {
      icon: Package,
      label: 'Маҳсулот Қўшиш',
      color: 'bg-blue-500 hover:bg-blue-600',
      path: '/products',
    },
    {
      icon: Users,
      label: 'Мижоз Қўшиш',
      color: 'bg-purple-500 hover:bg-purple-600',
      path: '/customers',
    },
    {
      icon: DollarSign,
      label: 'Харажат Қўшиш',
      color: 'bg-red-500 hover:bg-red-600',
      path: '/expenses',
    },
    {
      icon: Factory,
      label: 'Ишлаб чиқариш',
      color: 'bg-orange-500 hover:bg-orange-600',
      path: '/production',
    },
    {
      icon: Truck,
      label: 'Таъминловчи',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      path: '/suppliers',
    },
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          console.log('QuickActions main button clicked, isOpen:', isOpen);
          setIsOpen(!isOpen);
        }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600 rotate-45' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        title={isOpen ? 'Yopish' : 'Tezkor harakatlar'}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Actions Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Actions Grid */}
          <div className="fixed bottom-24 right-6 z-50 animate-fade-in">
            <Card>
              <CardContent className="p-4 w-80">
                <h3 className="font-semibold mb-4">Тезкор Амаллар</h3>
                <div className="grid grid-cols-2 gap-3">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => {
                          console.log('QuickActions button clicked:', action.label, action.path);
                          navigate(action.path);
                          setIsOpen(false);
                        }}
                        className={`${action.color} text-white p-4 rounded-lg transition-all hover:scale-105 flex flex-col items-center gap-2`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium text-center">
                          {action.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}