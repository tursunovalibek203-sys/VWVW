import { Trash2 } from 'lucide-react';
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
    <div className={`rounded-xl border px-3 py-2.5 space-y-2 ${isEditing ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>

      {/* Qator 1: Mahsulot tanlash + o'chirish */}
      <div className="flex items-center gap-2">
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
          className="flex-1 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none"
        >
          {filteredProducts.map((p) => (
            <option key={p.id} value={p.id}>{trData(p.name)}</option>
          ))}
        </select>
        <button type="button" onClick={() => onRemove(index)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Qator 2: Qop|Dona + barcha inputlar + subtotal */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Qop / Dona toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
          <button type="button" onClick={toggleSaleType}
            className={`px-2 py-1 text-xs font-semibold transition-colors ${item.saleType !== 'piece' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            {latinToCyrillic('Qop')}
          </button>
          <button type="button" onClick={toggleSaleType}
            className={`px-2 py-1 text-xs font-semibold transition-colors border-l border-slate-200 ${item.saleType === 'piece' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            {latinToCyrillic('Dona')}
          </button>
        </div>

        {/* Qop soni */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input type="text" placeholder="0"
            value={item.bagDisplayValue || item.quantity?.toString() || ''}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-12 h-7 text-center text-xs font-medium border border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
            title={latinToCyrillic('Qop soni')} />
          <span className="text-[10px] text-slate-400">qop</span>
        </div>

        {/* 1 qopda */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input type="text" placeholder="2000"
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
            className="w-14 h-7 text-center text-xs font-medium border border-amber-300 bg-amber-50 rounded-lg focus:border-amber-500 outline-none"
            title={latinToCyrillic('1 qopda nechta dona')} />
          <span className="text-[10px] text-slate-400">/q</span>
        </div>

        {/* Jami dona */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-slate-400">=</span>
          <span className="text-xs font-medium text-slate-600 tabular-nums">{totalPieces.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400">{latinToCyrillic('dona')}</span>
        </div>

        {/* Narx */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-slate-400">{getCurrencySymbol(currency)}</span>
          <input type="number" step="0.0001" placeholder="0"
            value={item.saleType === 'piece' ? item.pricePerPiece || '' : item.pricePerBag || ''}
            onChange={(e) => handlePriceChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-20 h-7 text-center text-xs font-medium border border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
            title={item.saleType === 'piece' ? latinToCyrillic('Dona narxi') : latinToCyrillic('Qop narxi')} />
          <span className="text-[10px] text-slate-400">/{item.saleType === 'piece' ? latinToCyrillic('d') : latinToCyrillic('q')}</span>
        </div>

        {/* Subtotal */}
        <span className="ml-auto text-sm font-bold text-indigo-600 tabular-nums flex-shrink-0">
          {getCurrencySymbol(currency)}{getDisplayAmount(item.subtotal || 0, currency)}
        </span>
      </div>
    </div>
  );
};

export default CartItem;
