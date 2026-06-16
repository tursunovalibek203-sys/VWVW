import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';
import { trData } from '../lib/transliterator';

interface ProductVariant {
  id: string;
  variantName: string;
  currentStock: number;
  pricePerBag: number;
  active: boolean;
}

interface ProductVariantCardProps {
  product: {
    id: string;
    name: string;
    bagType: string;
    isParent: boolean;
    variants?: ProductVariant[];
    currentStock?: number;
    pricePerBag?: number;
    totalStock?: number;
  };
  onClick?: (productId: string) => void;
}

export function ProductVariantCard({ product, onClick }: ProductVariantCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(product.id);
    } else {
      navigate(`/products/${product.id}`);
    }
  };

  const handleVariantClick = (e: React.MouseEvent, variantId: string) => {
    e.stopPropagation();
    navigate(`/products/${variantId}`);
  };

  // Color mapping for variants
  const getVariantColor = (variantName: string): string => {
    const name = variantName.toLowerCase();
    if (name.includes('oq') || name.includes('white')) return 'bg-gradient-to-br from-white to-gray-100 text-gray-800 border-gray-300 shadow-sm';
    if (name.includes('qora') || name.includes('black')) return 'bg-gradient-to-br from-gray-800 to-black text-white border-gray-900 shadow-lg';
    if (name.includes('sariq') || name.includes('yellow')) return 'bg-gradient-to-br from-yellow-200 to-yellow-400 text-yellow-900 border-yellow-500 shadow-md';
    if (name.includes('gidro') || name.includes('hydro')) return 'bg-gradient-to-br from-blue-200 to-blue-400 text-blue-900 border-blue-500 shadow-md';
    if (name.includes('ko\'k') || name.includes('blue')) return 'bg-gradient-to-br from-blue-300 to-blue-600 text-white border-blue-700 shadow-md';
    if (name.includes('qizil') || name.includes('red')) return 'bg-gradient-to-br from-red-200 to-red-500 text-white border-red-600 shadow-md';
    if (name.includes('yashil') || name.includes('green')) return 'bg-gradient-to-br from-green-200 to-green-500 text-white border-green-600 shadow-md';
    if (name.includes('binafsha') || name.includes('purple')) return 'bg-gradient-to-br from-purple-200 to-purple-500 text-white border-purple-600 shadow-md';
    if (name.includes('toq') || name.includes('dark')) return 'bg-gradient-to-br from-gray-700 to-gray-900 text-white border-gray-800 shadow-lg';
    if (name.includes('engil') || name.includes('light')) return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-sm';
    return 'bg-gradient-to-br from-gray-100 to-gray-300 text-gray-800 border-gray-400 shadow-sm';
  };

  // Get background color for div based on variant name
  const getVariantBgColor = (variantName: string): string => {
    const name = variantName.toLowerCase();
    if (name.includes('oq') || name.includes('white')) return 'bg-white border-gray-300';
    if (name.includes('qora') || name.includes('black')) return 'bg-gray-900 border-gray-700';
    if (name.includes('sariq') || name.includes('yellow')) return 'bg-yellow-400 border-yellow-500';
    if (name.includes('gidro') || name.includes('hydro')) return 'bg-blue-400 border-blue-500';
    if (name.includes('ko\'k') || name.includes('blue')) return 'bg-blue-600 border-blue-700';
    if (name.includes('qizil') || name.includes('red')) return 'bg-red-500 border-red-600';
    if (name.includes('yashil') || name.includes('green')) return 'bg-green-500 border-green-600';
    if (name.includes('binafsha') || name.includes('purple')) return 'bg-purple-500 border-purple-600';
    if (name.includes('toq') || name.includes('dark')) return 'bg-gray-800 border-gray-700';
    if (name.includes('engil') || name.includes('light')) return 'bg-gray-200 border-gray-300';
    return 'bg-gray-300 border-gray-400';
  };

  // Stock status indicator
  const getStockStatus = (stock: number, minLimit: number = 0): string => {
    if (stock === 0) return 'text-red-600';
    if (stock < minLimit) return 'text-orange-600';
    return 'text-green-600';
  };

  if (!product.isParent || !product.variants || product.variants.length === 0) {
    // Regular product card (no variants)
    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={handleClick}
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{trData(product.name)}</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Ombor:</p>
              <p className={`text-xl font-bold ${getStockStatus(product.currentStock || 0)}`}>
                {product.currentStock || 0} qop
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Narx:</p>
              <p className="text-lg font-semibold">
                {product.pricePerBag?.toLocaleString()} so'm
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Parent product card with variants
  const totalStock = product.totalStock || product.variants.reduce((sum, v) => sum + v.currentStock, 0);
  const activeVariants = product.variants.filter(v => v.active);

  return (
    <Card
      className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-gray-200 hover:border-blue-400"
      onClick={handleClick}
    >
      <div className="p-4">
        {/* Product name */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{trData(product.name)}</h3>
          <p className="text-sm text-gray-500 font-medium">{product.bagType}</p>
        </div>

        {/* Variants */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {activeVariants.map((variant) => (
            <div
              key={variant.id}
              onClick={(e) => handleVariantClick(e, variant.id)}
              className={`
                ${getVariantColor(variant.variantName)}
                border-2 rounded-xl p-3 text-center
                hover:shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer
                ${variant.currentStock === 0 ? 'opacity-60 grayscale' : ''}
                ${variant.currentStock > 0 ? 'ring-2 ring-offset-1' : ''}
              `}
            >
              <div className={`font-bold text-sm mb-1 ${getVariantBgColor(variant.variantName)} rounded px-2 py-1`}>
                {trData(variant.variantName)}
              </div>
              <div className={`text-lg font-bold ${getStockStatus(variant.currentStock)}`}>
                {variant.currentStock} qop
              </div>
              <div className="text-xs font-semibold mt-1">
                {variant.pricePerBag.toLocaleString()}
              </div>
              {variant.currentStock === 0 && (
                <div className="text-xs text-red-600 font-bold mt-1">Tugagan</div>
              )}
            </div>
          ))}
        </div>

        {/* Total stock */}
        <div className="border-t-2 border-gray-200 pt-3">
          <div className="flex justify-between items-center gap-2">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2 rounded-lg flex-1">
              <p className="text-xs text-gray-600 font-semibold">Jami:</p>
              <p className={`text-xl font-bold ${getStockStatus(totalStock)}`}>
                {totalStock} qop
              </p>
            </div>
            <div className="bg-gray-100 px-3 py-2 rounded-lg flex-1">
              <p className="text-xs text-gray-600 font-semibold">Ranglar:</p>
              <p className="text-lg font-bold text-gray-700">
                {activeVariants.length} ta
              </p>
            </div>
            <div className="bg-green-100 px-3 py-2 rounded-lg flex-1">
              <p className="text-xs text-gray-600 font-semibold">Turlar:</p>
              <p className="text-lg font-bold text-green-700">
                {activeVariants.length} ta
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
