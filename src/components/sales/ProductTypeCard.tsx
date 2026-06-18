import { useState } from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import type { Product } from '../../types';
import { getCurrencySymbol, getDisplayAmount } from '../../lib/saleUtils';

interface ProductVariant {
  id: string;
  name: string;
  color?: string;
  pricePerBag: number;
  currentStock: number;
  bagType?: string;
}

interface ProductTypeCardProps {
  title: string;
  color: 'blue' | 'purple' | 'pink' | 'orange' | 'green';
  products: Product[];
  currency: string;
  onSelectProduct: (product: Product) => void;
  latinToCyrillic: (text: string) => string;
}

// Helper to extract color from product name
function extractColorFromName(name: string | undefined): string {
  if (!name) return 'gray';
  const lowerName = name.toLowerCase();
  const colors = ['qizil', 'red', 'ko\'k', 'blue', 'yashil', 'green', 'sariq', 'yellow', 'qora', 'black', 
    'oq', 'white', 'pushti', 'pink', 'jigarrang', 'brown', 'kulrang', 'gray', 
    'binafsha', 'purple', 'turquoise', 'moviy', 'cyan', 'to\'q sariq', 'orange', 
    'bronze', 'oltin', 'gold', 'kumush', 'silver'];
  
  for (const color of colors) {
    if (lowerName.includes(color)) {
      return color;
    }
  }
  return 'gray';
}

const colorClasses = {
  blue: {
    header: 'from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    hover: 'hover:border-blue-400 hover:shadow-blue-500/20',
    badge: 'bg-blue-100 text-blue-700',
  },
  purple: {
    header: 'from-purple-500 to-purple-600',
    light: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    hover: 'hover:border-purple-400 hover:shadow-purple-500/20',
    badge: 'bg-purple-100 text-purple-700',
  },
  pink: {
    header: 'from-pink-500 to-pink-600',
    light: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-600',
    hover: 'hover:border-pink-400 hover:shadow-pink-500/20',
    badge: 'bg-pink-100 text-pink-700',
  },
  orange: {
    header: 'from-orange-500 to-orange-600',
    light: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600',
    hover: 'hover:border-orange-400 hover:shadow-orange-500/20',
    badge: 'bg-orange-100 text-orange-700',
  },
  green: {
    header: 'from-emerald-500 to-emerald-600',
    light: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    hover: 'hover:border-emerald-400 hover:shadow-emerald-500/20',
    badge: 'bg-emerald-100 text-emerald-700',
  },
};

export const ProductTypeCard = ({
  title,
  color,
  products,
  currency,
  onSelectProduct,
  latinToCyrillic,
}: ProductTypeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = colorClasses[color];

  // Extract variants from products
  const variants: ProductVariant[] = products.map((p) => ({
    id: p.id,
    name: p.name || '',
    color: p.bagType || extractColorFromName(p.name),
    pricePerBag: parseFloat(p.pricePerBag?.toString() || '0'),
    currentStock: p.currentStock || 0,
    bagType: p.bagType,
  }));

  const totalStock = variants.reduce((sum, v) => sum + v.currentStock, 0);

  if (products.length === 0) return null;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-lg border-2 ${colors.border} transition-all duration-300`}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-gradient-to-r ${colors.header} p-4 cursor-pointer transition-all duration-300`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-sm text-white/80">
                {products.length} {latinToCyrillic('ta tur')} • {totalStock} {latinToCyrillic('qop')}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Variants */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-3 grid grid-cols-1 gap-2">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelectProduct(products.find((p) => p.id === variant.id)!)}
              className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 ${colors.light} border ${colors.border} ${colors.hover} hover:shadow-md active:scale-[0.98] text-left`}
            >
              <div className="flex items-center gap-3">
                {variant.color && (
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: getColorHex(variant.color) }}
                  >
                    {variant.color.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800 text-sm leading-tight">{variant.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${colors.badge}`}>
                      {variant.currentStock} {latinToCyrillic('qop')}
                    </span>
                    {variant.bagType && (
                      <span className="text-xs text-gray-400">{variant.bagType}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className={`font-bold ${colors.text} flex-shrink-0`}>
                {getCurrencySymbol(currency)}
                {getDisplayAmount(variant.pricePerBag, currency)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper to get color hex from color name
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    'qizil': '#ef4444',
    'red': '#ef4444',
    'ko\'k': '#3b82f6',
    'blue': '#3b82f6',
    'yashil': '#22c55e',
    'green': '#22c55e',
    'sariq': '#eab308',
    'yellow': '#eab308',
    'qora': '#1f2937',
    'black': '#1f2937',
    'oq': '#f3f4f6',
    'white': '#f3f4f6',
    'pushti': '#ec4899',
    'pink': '#ec4899',
    'jigarrang': '#92400e',
    'brown': '#92400e',
    'kulrang': '#6b7280',
    'gray': '#6b7280',
    'binafsha': '#8b5cf6',
    'purple': '#8b5cf6',
    'turquoise': '#14b8a6',
    'moviy': '#06b6d4',
    'cyan': '#06b6d4',
    'to\'q sariq': '#f97316',
    'orange': '#f97316',
    'bronze': '#cd7f32',
    'oltin': '#ffd700',
    'gold': '#ffd700',
    'kumush': '#c0c0c0',
    'silver': '#c0c0c0',
  };

  const normalizedColor = colorName?.toLowerCase().trim() || '';
  return colorMap[normalizedColor] || '#6b7280';
}

export default ProductTypeCard;
