import { Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { SaleItemForm } from '../../types';
import { getCurrencySymbol } from '../../lib/saleUtils';
import { latinToCyrillic, trData } from '../../lib/transliterator';

interface GroupedCartItemProps {
  mainItem: SaleItemForm;
  subItems: SaleItemForm[];
  mainIndex: number;
  subIndices: number[];
  currency: string;
  onUpdate: (index: number, updates: Partial<SaleItemForm>) => void;
  onRemoveGroup: (groupId: string) => void;
}

function qtyNum(qty: string | number): number {
  return typeof qty === 'number' ? qty : parseFloat(qty || '0') || 0;
}

function calcSubtotal(bagQty: number, upb: number, pricePerBag: number, pricePerPiece: number, saleType: string) {
  if (saleType === 'piece') return bagQty * upb * pricePerPiece;
  return bagQty * pricePerBag;
}

export function GroupedCartItem({
  mainItem,
  subItems,
  mainIndex,
  subIndices,
  currency,
  onUpdate,
  onRemoveGroup,
}: GroupedCartItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sym = getCurrencySymbol(currency);
  const isBagMode = mainItem.saleType !== 'piece';

  // Narx inputlari uchun mahalliy string state — indeks bo'yicha (main=-1, sub=0,1,2...)
  const [localPrices, setLocalPrices] = useState<Record<number, string>>({});

  const setLocalPrice = useCallback((key: number, val: string | null) => {
    setLocalPrices(prev => {
      if (val === null) { const n = { ...prev }; delete n[key]; return n; }
      return { ...prev, [key]: val };
    });
  }, []);

  const priceInputProps = (key: number, item: SaleItemForm, onCommit: (val: string) => void) => {
    const stored = isBagMode ? item.pricePerBag?.toString() || '' : item.pricePerPiece?.toString() || '';
    const local = localPrices[key];
    return {
      type: 'text' as const,
      inputMode: 'decimal' as const,
      placeholder: '0',
      value: local !== undefined ? local : stored,
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => { setLocalPrice(key, stored); e.target.select(); },
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setLocalPrice(key, raw);
        if (raw !== '' && raw !== '.' && !raw.endsWith('.')) onCommit(raw);
      },
      onBlur: () => {
        const lv = localPrices[key];
        if (lv !== undefined) { onCommit(lv === '' || lv === '.' ? '0' : lv); setLocalPrice(key, null); }
      },
    };
  };

  const groupTotal =
    mainItem.subtotal +
    subItems.reduce((sum, i) => sum + i.subtotal, 0);

  // ── Toggle: qop ↔ dona, barcha guruhdagi elementlarga qo'llaniladi ──
  const handleToggleSaleType = () => {
    const newType = isBagMode ? 'piece' : 'bag';

    const applyToggle = (item: SaleItemForm, idx: number) => {
      const upb = item.unitsPerBag || 1;
      const bagQty = qtyNum(item.quantity);
      let ppb = item.pricePerBag || 0;
      let ppp = item.pricePerPiece || 0;

      if (isBagMode) {
        // qop → dona: narxni donaga o'tkazish
        ppp = ppb / upb;
      } else {
        // dona → qop: narxni qopga qaytarish
        ppb = ppp * upb;
      }

      onUpdate(idx, {
        saleType: newType,
        pricePerBag: ppb,
        pricePerPiece: ppp,
        subtotal: calcSubtotal(bagQty, upb, ppb, ppp, newType),
      });
    };

    applyToggle(mainItem, mainIndex);
    subItems.forEach((sub, i) => applyToggle(sub, subIndices[i]));
  };

  // ── Main item handlers ──
  const handleMainQtyChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const qty = parseFloat(clean) || 0;
    const upb = mainItem.unitsPerBag || 1;
    onUpdate(mainIndex, {
      quantity: clean,
      bagDisplayValue: clean,
      subtotal: calcSubtotal(qty, upb, mainItem.pricePerBag, mainItem.pricePerPiece || 0, mainItem.saleType || 'bag'),
    });

    // Preform soni o'zgarganda krishka/ruchka qayta hisoblash
    const totalPreformUnits = qty * upb;
    subItems.forEach((sub, i) => {
      const subUpb = sub.unitsPerBag || 1;
      const newSubQty = Math.round((totalPreformUnits / subUpb) * 10000) / 10000;
      onUpdate(subIndices[i], {
        quantity: newSubQty.toString(),
        bagDisplayValue: newSubQty.toString(),
        subtotal: calcSubtotal(newSubQty, subUpb, sub.pricePerBag, sub.pricePerPiece || 0, sub.saleType || 'bag'),
      });
    });
  };

  const handleMainPriceChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const price = parseFloat(clean) || 0;
    const qty = qtyNum(mainItem.quantity);
    const upb = mainItem.unitsPerBag || 1;
    if (isBagMode) {
      onUpdate(mainIndex, { pricePerBag: price, pricePerPiece: price / upb, subtotal: qty * price });
    } else {
      onUpdate(mainIndex, { pricePerPiece: price, pricePerBag: price * upb, subtotal: qty * upb * price });
    }
  };

  const handleMainUnitsChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const units = parseFloat(clean) || 0;
    onUpdate(mainIndex, { unitsPerBag: units });
  };

  // ── Sub item handlers ──
  const handleSubQtyChange = (idx: number, item: SaleItemForm, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const qty = parseFloat(clean) || 0;
    const upb = item.unitsPerBag || 1;
    onUpdate(idx, {
      quantity: clean,
      bagDisplayValue: clean,
      subtotal: calcSubtotal(qty, upb, item.pricePerBag, item.pricePerPiece || 0, item.saleType || 'bag'),
    });
  };

  const handleSubPriceChange = (idx: number, item: SaleItemForm, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const price = parseFloat(clean) || 0;
    const qty = qtyNum(item.quantity);
    const upb = item.unitsPerBag || 1;
    if (isBagMode) {
      onUpdate(idx, { pricePerBag: price, pricePerPiece: price / upb, subtotal: qty * price });
    } else {
      onUpdate(idx, { pricePerPiece: price, pricePerBag: price * upb, subtotal: qty * upb * price });
    }
  };

  const handleSubUnitsChange = (idx: number, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const units = parseFloat(clean) || 0;
    onUpdate(idx, { unitsPerBag: units });
  };

  const priceLabel = isBagMode ? latinToCyrillic('Narx/qop') : latinToCyrillic('Narx/dona');

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-100 border-b border-blue-200">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Package className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-blue-900 truncate">{trData(mainItem.productName)}</span>
          <span className="text-xs text-blue-500 shrink-0">{mainItem.unitsPerBag} {latinToCyrillic('dona/qop')}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Qop / Dona toggle */}
          <div className="flex rounded-lg overflow-hidden border border-blue-300 mr-1">
            <button
              type="button"
              onClick={handleToggleSaleType}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all ${isBagMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              {latinToCyrillic('Qop')}
            </button>
            <button
              type="button"
              onClick={handleToggleSaleType}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all border-l border-blue-300 ${!isBagMode ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              {latinToCyrillic('Dona')}
            </button>
          </div>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
            title={latinToCyrillic(collapsed ? 'Kengaytirish' : "Yig'ish")}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onRemoveGroup(mainItem.komplektGroupId!)}
            className="p-1 text-red-400 hover:text-red-600 transition-colors"
            title={latinToCyrillic("Komplektni o'chirish")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Column headers */}
      {!collapsed && (
        <div className="grid grid-cols-[1fr_52px_70px_72px_72px] gap-1.5 px-3 pt-1.5 pb-0.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{latinToCyrillic('Nomi')}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{latinToCyrillic('Qop')}</span>
          <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">1 {latinToCyrillic('qopda')}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{priceLabel} ({sym})</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-right">{latinToCyrillic('Summa')}</span>
        </div>
      )}

      {!collapsed && (
        <div className="divide-y divide-blue-100">
          {/* Asosiy mahsulot */}
          <div className="grid grid-cols-[1fr_52px_70px_72px_72px] items-center gap-1.5 px-3 py-2">
            <span className="text-xs text-slate-700 font-medium truncate">{trData(mainItem.productName)}</span>

            <input type="number" min="0"
              value={qtyNum(mainItem.quantity) || ''}
              onChange={e => handleMainQtyChange(e.target.value)}
              className="w-full text-left text-xs border border-blue-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-500"
              placeholder="0" />

            <input type="number" min="0"
              value={mainItem.unitsPerBag || ''}
              onChange={e => handleMainUnitsChange(e.target.value)}
              className="w-full text-left text-xs border border-amber-300 rounded px-2 py-1.5 bg-amber-50 focus:outline-none focus:border-amber-500"
              placeholder="dona" />

            <input
              {...priceInputProps(-1, mainItem, handleMainPriceChange)}
              className="w-full text-left text-xs border border-blue-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-500"
            />

            <span className="text-xs font-bold text-slate-700 text-right tabular-nums">
              {sym}{mainItem.subtotal.toLocaleString()}
            </span>
          </div>

          {/* Sub mahsulotlar */}
          {subItems.map((sub, i) => (
            <div key={sub.productId} className="grid grid-cols-[1fr_52px_70px_72px_72px] items-center gap-1.5 px-3 py-2 bg-white/60">
              <span className="text-xs text-slate-600 truncate">{trData(sub.productName)}</span>

              <input type="number" min="0"
                value={qtyNum(sub.quantity) || ''}
                onChange={e => handleSubQtyChange(subIndices[i], sub, e.target.value)}
                className="w-full text-left text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
                placeholder="0" />

              <input type="number" min="0"
                value={sub.unitsPerBag || ''}
                onChange={e => handleSubUnitsChange(subIndices[i], e.target.value)}
                className="w-full text-left text-xs border border-amber-300 rounded px-2 py-1.5 bg-amber-50 focus:outline-none focus:border-amber-500"
                placeholder="dona" />

              <input
                {...priceInputProps(i, sub, (v) => handleSubPriceChange(subIndices[i], sub, v))}
                className="w-full text-left text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
              />

              <span className="text-xs font-bold text-slate-700 text-right tabular-nums">
                {sym}{sub.subtotal.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer — jami */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-blue-100/70 border-t border-blue-200">
        <span className="text-xs text-blue-600 font-medium">
          {latinToCyrillic('Komplekt jami')}
          {!isBagMode && <span className="ml-1 text-emerald-600">({latinToCyrillic('dona narxida')})</span>}
        </span>
        <span className="text-sm font-bold text-blue-800 tabular-nums">
          {sym}{groupTotal.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
