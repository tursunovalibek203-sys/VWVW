import { Plus } from 'lucide-react';
import type { Product } from '../../types';
import { getCurrencySymbol, getDisplayAmount } from '../../lib/saleUtils';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  currency: string;
  onSelect: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  latinToCyrillic: (text: string) => string;
}

export const ProductCard = ({
  product,
  isSelected,
  currency,
  onSelect,
  onQuickAdd,
  latinToCyrillic,
}: ProductCardProps) => {
  return (
    <div
      onClick={onSelect}
      className={`group p-3 rounded-xl cursor-pointer transition-all duration-300 border-2 relative overflow-hidden ${
        isSelected
          ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 border-blue-400 shadow-xl shadow-blue-500/30 scale-[1.02]'
          : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1'
      }`}
    >
      {/* Quick Add Button - Kattaroq va ko'zga tashlanarli */}
      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={onQuickAdd}
          aria-label={isSelected ? 'Tanlangan' : 'Savatga qoshish'}
          title={isSelected ? 'Tanlangan' : 'Savatga qoshish'}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 active:scale-95 ${
            isSelected
              ? 'bg-white text-blue-600 hover:bg-gray-100 shadow-white/50'
              : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/40'
          }`}
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      <div className="pr-14">
        <span
          className={`font-bold text-sm line-clamp-2 leading-snug ${
            isSelected ? 'text-white drop-shadow-sm' : 'text-gray-800'
          }`}
        >
          {product.name}
        </span>
        <div className="flex items-center gap-2 mt-2">
          {product.bagType && (
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm ${
                isSelected
                  ? 'bg-white/25 text-white backdrop-blur-sm'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              {product.bagType}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/40">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
            isSelected
              ? 'bg-white/20 text-white backdrop-blur-sm'
              : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {product.currentStock || 0} {latinToCyrillic('qop')}
        </div>
        <span
          className={`text-sm font-bold ${
            isSelected ? 'text-white drop-shadow-sm' : 'text-blue-600'
          }`}
        >
          {getCurrencySymbol(currency)}
          {getDisplayAmount(parseFloat(product.pricePerBag?.toString() || '0'), currency)}
        </span>
      </div>
    </div>
  );
};

export default ProductCard;
