import { Trash2 } from 'lucide-react';
import type { SaleItemForm, Product } from '../../types';
import { getCurrencySymbol, getDisplayAmount } from '../../lib/saleUtils';

interface CartItemProps {
  item: SaleItemForm;
  index: number;
  isEditing: boolean;
  products: Product[];
  currency: string;
  latinToCyrillic: (text: string) => string;
  onUpdate: (index: number, updates: Partial<SaleItemForm>) => void;
  onRemove: (index: number) => void;
}

export const CartItem = ({
  item,
  index,
  isEditing,
  products,
  currency,
  latinToCyrillic,
  onUpdate,
  onRemove,
}: CartItemProps) => {
  const cartProduct = products.find((p) => p.id === item.productId);

  const handleQuantityChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    if (cleanVal === '') {
      onUpdate(index, { quantity: '', bagDisplayValue: '', subtotal: 0 });
      return;
    }

    const bagQuantity = parseFloat(cleanVal) || 0;
    
    // Stock tekshiruvi
    const availableStock = cartProduct?.currentStock || 0;
    if (bagQuantity > availableStock) {
      alert(`⚠️ ${item.productName} uchun yetarli mahsulot yo'q!\nMavjud: ${availableStock} qop\nSo'ralgan: ${bagQuantity} qop`);
      return;
    }
    
    // unitsPerBag calculation - agar bo'sh bo'lsa 2000 ishlatiladi
    const unitsPerBagValue = item.unitsPerBag?.toString() || '';
    const unitsPerBag = unitsPerBagValue === '' ? 2000 : parseFloat(unitsPerBagValue) || 2000;
    const pricePerBag = item.pricePerBag || 0;
    const pricePerPiece = item.pricePerPiece || pricePerBag / unitsPerBag;
    const totalPieces = bagQuantity * unitsPerBag;

    let subtotal;
    if (item.saleType === 'piece') {
      subtotal = totalPieces * pricePerPiece;
    } else {
      subtotal = bagQuantity * pricePerBag;
    }

    onUpdate(index, {
      quantity: cleanVal,
      bagDisplayValue: cleanVal,
      subtotal,
    });
  };

  const handlePriceChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    console.log('💰 handlePriceChange:', { val, cleanVal, saleType: item.saleType });
    
    if (cleanVal === '') {
      onUpdate(index, { pricePerBag: 0, pricePerPiece: 0, subtotal: 0 });
      return;
    }

    const newPrice = parseFloat(cleanVal) || 0;
    const bagQuantity = parseFloat(item.bagDisplayValue || item.quantity?.toString() || '0') || 0;
    const unitsPerBag = parseFloat(item.unitsPerBag?.toString() || '2000') || 2000;

    console.log('💰 Calculating:', { newPrice, bagQuantity, unitsPerBag, currentPricePerBag: item.pricePerBag, currentPricePerPiece: item.pricePerPiece });

    const updateData: Partial<SaleItemForm> = {};

    if (item.saleType === 'piece') {
      updateData.pricePerPiece = newPrice;
      updateData.pricePerBag = newPrice * unitsPerBag;
      const totalPieces = bagQuantity * unitsPerBag;
      updateData.subtotal = totalPieces * newPrice;
    } else {
      updateData.pricePerBag = newPrice;
      updateData.pricePerPiece = newPrice / unitsPerBag;
      updateData.subtotal = bagQuantity * newPrice;
    }

    console.log('💰 Update data:', updateData);
    onUpdate(index, updateData);
  };

  const toggleSaleType = () => {
    const unitsPerBag = parseFloat(item.unitsPerBag?.toString() || '2000') || 2000;
    const bagQuantity = parseFloat(item.bagDisplayValue || item.quantity?.toString() || '0') || 0;

    let newPricePerBag = item.pricePerBag || 0;
    let newPricePerPiece = item.pricePerPiece || 0;

    if (item.saleType === 'piece') {
      // Donadan qopga o'tish - dona narxini qop narxiga aylantirish
      newPricePerBag = (item.pricePerPiece || 0) * unitsPerBag;
      newPricePerPiece = item.pricePerPiece || 0;
    } else {
      // Qopdan donaga o'tish - qop narxini dona narxiga aylantirish
      newPricePerPiece = (item.pricePerBag || 0) / unitsPerBag;
      newPricePerBag = item.pricePerBag || 0;
    }

    // Subtotalni hisoblash
    let subtotal;
    if (item.saleType === 'piece') {
      // Donadan qopga o'tganda
      subtotal = bagQuantity * newPricePerBag;
    } else {
      // Qopdan donaga o'tganda
      const totalPieces = bagQuantity * unitsPerBag;
      subtotal = totalPieces * newPricePerPiece;
    }

    onUpdate(index, {
      saleType: item.saleType === 'piece' ? 'bag' : 'piece',
      pricePerBag: newPricePerBag,
      pricePerPiece: newPricePerPiece,
      subtotal,
    });
  };

  const totalPieces =
    (parseFloat(item.bagDisplayValue || item.quantity?.toString() || '0') || 0) *
    (parseFloat(item.unitsPerBag?.toString() || '2000') || 2000);

  return (
    <div
      className={`bg-gray-50 p-3 rounded-lg border ${
        isEditing ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <select
            aria-label="Mahsulot tanlash"
            value={item.productId}
            onChange={(e) => {
              const newProduct = products.find((p) => p.id === e.target.value);
              if (newProduct) {
                const unitsPerBag = newProduct.unitsPerBag || 2000;
                const quantity = parseFloat(item.quantity?.toString() || '0') || 0;
                const pricePerBag = parseFloat(newProduct.pricePerBag?.toString() || '0') || 0;
                const pricePerPiece = pricePerBag / unitsPerBag;
                const subtotal = quantity * pricePerBag;

                onUpdate(index, {
                  productId: newProduct.id,
                  productName: newProduct.name,
                  unitsPerBag,
                  pricePerBag,
                  pricePerPiece,
                  subtotal,
                  warehouse: newProduct.warehouse || 'other',
                });
              }
            }}
            className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 mt-1">
            {cartProduct?.bagType && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                {cartProduct.bagType}
              </span>
            )}
            <span className="text-xs text-gray-500">{item.unitsPerBag || 2000} dona/qop</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 p-1"
          title={latinToCyrillic("O'chirish")}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {/* Sale Type Toggle */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={toggleSaleType}
            className={`flex-1 py-1 px-2 rounded text-sm font-medium transition-all ${
              item.saleType !== 'piece'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {latinToCyrillic('Qop')}
          </button>
          <button
            type="button"
            onClick={toggleSaleType}
            className={`flex-1 py-1 px-2 rounded text-sm font-medium transition-all ${
              item.saleType === 'piece'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {latinToCyrillic('Dona')}
          </button>
        </div>

        {/* Quantity and Price Inputs */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label htmlFor={`bag-${index}`} className="text-xs text-gray-500 block mb-1">{latinToCyrillic('Qop')}</label>
            <input
              id={`bag-${index}`}
              type="text"
              placeholder="0"
              value={item.bagDisplayValue || item.quantity?.toString() || ''}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full h-8 px-2 text-sm font-medium border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor={`units-${index}`} className="text-xs text-gray-500 block mb-1">{latinToCyrillic('1 qopda')}</label>
            <input
              id={`units-${index}`}
              type="text"
              placeholder="2000"
              value={item.unitsPerBag?.toString() || ''}
              onChange={(e) => {
                console.log('🔄 unitsPerBag onChange:', e.target.value, '| index:', index);
                const val = e.target.value.replace(/[^0-9.]/g, '');
                const units = val === '' ? 0 : parseFloat(val) || 2000;
                const quantity = parseFloat(item.bagDisplayValue || item.quantity?.toString() || '0') || 0;
                const pricePerBag = item.pricePerBag || 0;
                // Narxni qayta hisoblash - yangi unitsPerBag asosida
                const pricePerPiece = units > 0 ? pricePerBag / units : 0;
                const subtotal = quantity * pricePerBag;

                console.log('   Updating:', { unitsPerBag: units, pricePerPiece, subtotal });
                onUpdate(index, { unitsPerBag: units, pricePerPiece, subtotal });
              }}
              className="w-full h-8 px-2 text-sm font-medium border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{latinToCyrillic('Jami dona')}</label>
            <div className="w-full h-8 px-2 flex items-center bg-gray-50 border border-gray-300 rounded text-sm">
              {totalPieces.toLocaleString()}
            </div>
          </div>
          <div>
            <label htmlFor={`price-${index}`} className="text-xs text-gray-500 block mb-1">
              {item.saleType === 'piece'
                ? `${latinToCyrillic('Narx')} (${getCurrencySymbol(currency)}/dona)`
                : `${latinToCyrillic('Narx')} (${getCurrencySymbol(currency)}/qop)`}
            </label>
            <input
              id={`price-${index}`}
              type="number"
              step="0.0001"
              placeholder="0"
              value={
                item.saleType === 'piece'
                  ? item.pricePerPiece || ''
                  : item.pricePerBag || ''
              }
              onChange={(e) => handlePriceChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-full h-8 px-2 text-sm font-medium border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Subtotal */}
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">{latinToCyrillic('Jami narx')}</label>
            <div className="w-full h-8 px-2 flex items-center bg-white border border-gray-300 rounded text-sm font-bold text-blue-600">
              {getCurrencySymbol(currency)}
              {getDisplayAmount(item.subtotal || 0, currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
