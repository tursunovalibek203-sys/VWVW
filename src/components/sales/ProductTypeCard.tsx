import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Product } from '../../types';
import { getCurrencySymbol, getDisplayAmount } from '../../lib/saleUtils';

interface ProductVariant {
  id: string;
  name: string;
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

const colorClasses = {
  blue:   { accent: 'bg-blue-500',   light: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700',   hover: 'hover:bg-blue-50 hover:border-blue-300',   bar: 'bg-blue-500'   },
  purple: { accent: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', hover: 'hover:bg-purple-50 hover:border-purple-300', bar: 'bg-purple-500' },
  pink:   { accent: 'bg-pink-500',   light: 'bg-pink-50',   border: 'border-pink-100',   text: 'text-pink-600',   badge: 'bg-pink-100 text-pink-700',   hover: 'hover:bg-pink-50 hover:border-pink-300',   bar: 'bg-pink-500'   },
  orange: { accent: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', hover: 'hover:bg-orange-50 hover:border-orange-300', bar: 'bg-orange-500' },
  green:  { accent: 'bg-emerald-500',light: 'bg-emerald-50',border: 'border-emerald-100',text: 'text-emerald-600',badge: 'bg-emerald-100 text-emerald-700',hover: 'hover:bg-emerald-50 hover:border-emerald-300',bar: 'bg-emerald-500'},
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
  const c = colorClasses[color];

  const variants: ProductVariant[] = products.map((p) => ({
    id: p.id,
    name: p.name || '',
    pricePerBag: parseFloat(p.pricePerBag?.toString() || '0'),
    currentStock: p.currentStock || 0,
    bagType: p.bagType,
  }));

  const totalStock = variants.reduce((sum, v) => sum + v.currentStock, 0);

  if (products.length === 0) return null;

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-6 rounded-full ${c.bar}`} />
          <span className="text-sm font-bold text-slate-800">{title}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
            {products.length} {latinToCyrillic('tur')}
          </span>
          <span className="text-xs text-slate-400 tabular-nums">{totalStock} {latinToCyrillic('qop')}</span>
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {/* Variants */}
      {isExpanded && (
        <div className={`border-t ${c.border} divide-y ${c.border}`}>
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelectProduct(products.find((p) => p.id === variant.id)!)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors active:scale-[0.99] ${c.hover} border-l-0`}
            >
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-medium text-slate-800 leading-tight truncate">{variant.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${c.badge}`}>
                    {variant.currentStock} {latinToCyrillic('qop')}
                  </span>
                  {variant.bagType && (
                    <span className="text-[11px] text-slate-400">{variant.bagType}</span>
                  )}
                </div>
              </div>
              <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${c.text}`}>
                {getCurrencySymbol(currency)}{getDisplayAmount(variant.pricePerBag, currency)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductTypeCard;
