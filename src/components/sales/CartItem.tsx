import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SaleItemForm, Product } from '../../types';
import { getCurrencySymbol, getDisplayAmount } from '../../lib/saleUtils';
import { trData } from '../../lib/transliterator';

const getProductTypeKey = (product: Product): string | null => {
  const name = product.name?.toLowerCase() || '';
  const bagType = product.bagType?.toLowerCase() || '';
  const warehouse = product.warehouse?.toLowerCase() || '';

  // Preform - gram bo'yicha
  if (warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/i.test(name + ' ' + bagType)) {
    const gramMatch = (bagType + ' ' + name).match(/(\d+)\s*(?:гр|г|gr|g)/i);
    if (gramMatch) {
      return `preform-${gramMatch[1]}gr`;
    }
    return 'preform-other';
  }

  // Krishka - mm bo'yicha
  if (warehouse === 'krishka' || name.includes('krishka') || name.includes('qopqoq') || name.includes('cap')) {
    const sizeMatch = name.match(/(\d{2,3})/);
    if (sizeMatch && [28, 38, 48, 55].includes(parseInt(sizeMatch[1]))) {
      return `krishka-${sizeMatch[1]}mm`;
    }
    return 'krishka-other';
  }

  // Ruchka - mm bo'yicha
  if (warehouse === 'ruchka' || name.includes('ruchka') || name.includes('handle')) {
    const sizeMatch = name.match(/(\d{2,3})/);
    if (sizeMatch && [28, 38, 48].includes(parseInt(sizeMatch[1]))) {
      return `ruchka-${sizeMatch[1]}mm`;
    }
    return 'ruchka-other';
  }

  // Custom warehouse
  if (warehouse.startsWith('custom-')) {
    return warehouse;
  }

  return 'other';
};

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
  // Narx inputi uchun mahalliy string state — "0.", "0.00", "0.002" yozishga imkon beradi
  const [localPrice, setLocalPrice] = useState<string | null>(null);

  const cartProduct = products.find((p) => p.id === item.productId);
  
  // Faqat shu turdagi mahsulotlarni filterlash
  const filteredProducts = (() => {
    if (!cartProduct) return products;
    const typeKey = getProductTypeKey(cartProduct);
    if (!typeKey) return products;
    return products.filter(p => getProductTypeKey(p) === typeKey);
  })();

  const handleQuantityChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    if (cleanVal === '') {
      onUpdate(index, { quantity: '', bagDisplayValue: '', subtotal: 0 });
      return;
    }

    const bagQuantity = parseFloat(cleanVal) || 0;

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
    <div className={`rounded-xl border overflow-hidden shadow-sm ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'} bg-white`}>

      {/* Qator 1: Mahsulot + Qop|Dona toggle + o'chirish */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
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
              onUpdate(index, { productId: newProduct.id, productName: newProduct.name, unitsPerBag, pricePerBag, pricePerPiece, subtotal, warehouse: newProduct.warehouse || 'other' });
            }
          }}
          className="flex-1 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
        >
          {filteredProducts.map((p) => (
            <option key={p.id} value={p.id}>{trData(p.name)}</option>
          ))}
        </select>

        {/* Qop / Dona toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
          <button type="button" onClick={toggleSaleType}
            className={`px-3 py-2 text-xs font-bold transition-all ${item.saleType !== 'piece' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            {latinToCyrillic('Qop')}
          </button>
          <button type="button" onClick={toggleSaleType}
            className={`px-3 py-2 text-xs font-bold transition-all border-l border-slate-200 ${item.saleType === 'piece' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            {latinToCyrillic('Dona')}
          </button>
        </div>

        <button type="button" onClick={() => onRemove(index)}
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Qator 2: 4 ta labelled input */}
      <div className="grid grid-cols-4 gap-2 px-3 pb-3">
        {/* Miqdor */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
            {latinToCyrillic('Miqdor')}
          </label>
          <input
            type="text"
            placeholder="0"
            value={item.bagDisplayValue || item.quantity?.toString() || ''}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-full h-9 text-center text-sm font-semibold border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        {/* 1 qopda */}
        <div>
          <label className="block text-[11px] font-semibold text-amber-500 mb-1 uppercase tracking-wide">
            1 {latinToCyrillic('qopda')}
          </label>
          <input
            type="text"
            placeholder="2000"
            value={item.unitsPerBag?.toString() || ''}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '');
              const units = val === '' ? 0 : parseFloat(val) || 2000;
              const quantity = parseFloat(item.bagDisplayValue || item.quantity?.toString() || '0') || 0;
              const pricePerBag = item.pricePerBag || 0;
              const pricePerPiece = units > 0 ? pricePerBag / units : 0;
              const subtotal = quantity * pricePerBag;
              onUpdate(index, { unitsPerBag: units, pricePerPiece, subtotal });
            }}
            className="w-full h-9 text-center text-sm font-semibold border border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none bg-amber-50 focus:bg-white transition-all"
          />
        </div>

        {/* Jami dona */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
            {latinToCyrillic('Jami dona')}
          </label>
          <div className="w-full h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 tabular-nums">
            {totalPieces.toLocaleString()}
          </div>
        </div>

        {/* Narx */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
            {latinToCyrillic('Narx')} / {item.saleType === 'piece' ? latinToCyrillic('dona') : latinToCyrillic('qop')}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={
              localPrice !== null
                ? localPrice
                : (item.saleType === 'piece' ? item.pricePerPiece?.toString() || '' : item.pricePerBag?.toString() || '')
            }
            onFocus={(e) => {
              const cur = item.saleType === 'piece' ? item.pricePerPiece?.toString() || '' : item.pricePerBag?.toString() || '';
              setLocalPrice(cur);
              e.target.select();
            }}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, '');
              setLocalPrice(raw);
              // Agar haqiqiy raqam bo'lsa parent ni yangilaymiz
              if (raw !== '' && raw !== '.' && !raw.endsWith('.')) {
                handlePriceChange(raw);
              }
            }}
            onBlur={() => {
              if (localPrice !== null) {
                handlePriceChange(localPrice === '' || localPrice === '.' ? '0' : localPrice);
                setLocalPrice(null);
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-full h-9 text-center text-sm font-semibold border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Qator 3: Subtotal footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
        <span className="text-xs text-slate-400 font-medium">{latinToCyrillic('Jami summa')}</span>
        <span className="text-base font-bold text-indigo-600 tabular-nums">
          {getCurrencySymbol(currency)}{getDisplayAmount(item.subtotal || 0, currency)}
        </span>
      </div>
    </div>
  );
};

export default CartItem;
