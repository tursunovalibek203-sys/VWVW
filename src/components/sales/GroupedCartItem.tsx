import { Trash2, Package, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { SaleItemForm, Product } from '../../types';
import { getCurrencySymbol } from '../../lib/saleUtils';
import { latinToCyrillic, trData } from '../../lib/transliterator';

const getProductTypeKey = (product: Product): string | null => {
  const name = product.name?.toLowerCase() || '';
  const bagType = product.bagType?.toLowerCase() || '';
  const warehouse = product.warehouse?.toLowerCase() || '';

  if (warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/i.test(name + ' ' + bagType)) {
    const gramMatch = (bagType + ' ' + name).match(/(\d+)\s*(?:гр|г|gr|g)/i);
    if (gramMatch) return `preform-${gramMatch[1]}gr`;
    return 'preform-other';
  }

  if (warehouse === 'krishka' || name.includes('krishka') || name.includes('qopqoq') || name.includes('cap')) {
    const sizeMatch = name.match(/(\d{2,3})/);
    if (sizeMatch && [28, 38, 48, 55].includes(parseInt(sizeMatch[1]))) return `krishka-${sizeMatch[1]}mm`;
    return 'krishka-other';
  }

  if (warehouse === 'ruchka' || name.includes('ruchka') || name.includes('handle')) {
    const sizeMatch = name.match(/(\d{2,3})/);
    if (sizeMatch && [28, 38, 48].includes(parseInt(sizeMatch[1]))) return `ruchka-${sizeMatch[1]}mm`;
    return 'ruchka-other';
  }

  if (warehouse.startsWith('custom-')) return warehouse;

  return 'other';
};

interface GroupedCartItemProps {
  mainItem: SaleItemForm;
  subItems: SaleItemForm[];
  mainIndex: number;
  subIndices: number[];
  currency: string;
  products: Product[];
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
  products,
  onUpdate,
  onRemoveGroup,
}: GroupedCartItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sym = getCurrencySymbol(currency);
  const isBagMode = mainItem.saleType !== 'piece';

  // "full" = to'liq komplekt narxi, "actual" = real miqdorga qarab
  const isFullMode = mainItem.komplektMode === 'full';

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

  const getFilteredProducts = (item: SaleItemForm) => {
    const found = products.find(p => p.id === item.productId);
    if (!found) return products;
    const typeKey = getProductTypeKey(found);
    if (!typeKey) return products;
    return products.filter(p => getProductTypeKey(p) === typeKey);
  };

  // "Tuliq/Soniga" toggle
  const handleToggleMode = () => {
    const newMode: 'full' | 'actual' = isFullMode ? 'actual' : 'full';
    onUpdate(mainIndex, { komplektMode: newMode });

    if (newMode === 'full') {
      // Sub-itemlarning hozirgi miqdorini "original" sifatida saqlash
      subItems.forEach((sub, i) => {
        onUpdate(subIndices[i], {
          originalQuantity: qtyNum(sub.quantity),
        });
      });
    }
  };

  // Qarz hisoblash (faqat full mode da)
  const getSubDebt = (sub: SaleItemForm) => {
    if (!isFullMode) return 0;
    const orig = sub.originalQuantity ?? qtyNum(sub.quantity);
    return Math.max(0, orig - qtyNum(sub.quantity));
  };

  // Jami hisoblash
  const groupTotal = isFullMode
    ? mainItem.subtotal + subItems.reduce((sum, sub) => {
        const origQty = sub.originalQuantity ?? qtyNum(sub.quantity);
        return sum + origQty * sub.pricePerBag;
      }, 0)
    : mainItem.subtotal + subItems.reduce((sum, i) => sum + i.subtotal, 0);

  // Jami qarz (dona)
  const totalDebtUnits = subItems.reduce((sum, sub) => {
    const debtBags = getSubDebt(sub);
    return sum + debtBags * (sub.unitsPerBag || 1);
  }, 0);
  const hasDebt = isFullMode && totalDebtUnits > 0;

  // ── Toggle: qop ↔ dona ──
  const handleToggleSaleType = () => {
    const newType = isBagMode ? 'piece' : 'bag';

    const applyToggle = (item: SaleItemForm, idx: number) => {
      const upb = item.unitsPerBag || 1;
      const bagQty = qtyNum(item.quantity);
      let ppb = item.pricePerBag || 0;
      let ppp = item.pricePerPiece || 0;

      if (isBagMode) {
        ppp = ppb / upb;
      } else {
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

  // ── Mahsulot turini o'zgartirish ──
  const handleMainProductChange = (productId: string) => {
    const newProduct = products.find(p => p.id === productId);
    if (!newProduct) return;
    const upb = newProduct.unitsPerBag || 1;
    const qty = qtyNum(mainItem.quantity);
    const ppb = parseFloat(newProduct.pricePerBag?.toString() || '0') || 0;
    const ppp = ppb / upb;
    onUpdate(mainIndex, {
      productId: newProduct.id,
      productName: newProduct.name,
      unitsPerBag: upb,
      pricePerBag: ppb,
      pricePerPiece: ppp,
      warehouse: newProduct.warehouse || 'other',
      subtotal: calcSubtotal(qty, upb, ppb, ppp, mainItem.saleType || 'bag'),
    });
  };

  const handleSubProductChange = (subIdx: number, sub: SaleItemForm, productId: string) => {
    const newProduct = products.find(p => p.id === productId);
    if (!newProduct) return;
    const upb = newProduct.unitsPerBag || 1;
    const qty = qtyNum(sub.quantity);
    const ppb = parseFloat(newProduct.pricePerBag?.toString() || '0') || 0;
    const ppp = ppb / upb;
    onUpdate(subIdx, {
      productId: newProduct.id,
      productName: newProduct.name,
      unitsPerBag: upb,
      pricePerBag: ppb,
      pricePerPiece: ppp,
      warehouse: newProduct.warehouse || 'other',
      subtotal: calcSubtotal(qty, upb, ppb, ppp, sub.saleType || 'bag'),
    });
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

    const totalPreformUnits = qty * upb;
    subItems.forEach((sub, i) => {
      const subUpb = sub.unitsPerBag || 1;
      const newSubQty = Math.round((totalPreformUnits / subUpb) * 10000) / 10000;
      const updates: Partial<SaleItemForm> = {
        quantity: newSubQty.toString(),
        bagDisplayValue: newSubQty.toString(),
        subtotal: isFullMode
          ? newSubQty * sub.pricePerBag  // full mode: subtotal = new original qty * price
          : calcSubtotal(newSubQty, subUpb, sub.pricePerBag, sub.pricePerPiece || 0, sub.saleType || 'bag'),
      };
      if (isFullMode) {
        // Main qty o'zgarganda original qty ham yangilanadi
        updates.originalQuantity = newSubQty;
      }
      onUpdate(subIndices[i], updates);
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

    if (isFullMode) {
      // Full mode: subtotal original miqdorga asoslangan (narx o'zgarmaydi)
      const origQty = item.originalQuantity ?? qtyNum(item.quantity);
      onUpdate(idx, {
        quantity: clean,
        bagDisplayValue: clean,
        subtotal: origQty * item.pricePerBag,
      });
    } else {
      onUpdate(idx, {
        quantity: clean,
        bagDisplayValue: clean,
        subtotal: calcSubtotal(qty, upb, item.pricePerBag, item.pricePerPiece || 0, item.saleType || 'bag'),
      });
    }
  };

  const handleSubPriceChange = (idx: number, item: SaleItemForm, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const price = parseFloat(clean) || 0;
    const qty = isFullMode
      ? (item.originalQuantity ?? qtyNum(item.quantity))
      : qtyNum(item.quantity);
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
    <div className={`rounded-xl border-2 overflow-hidden ${hasDebt ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${hasDebt ? 'bg-amber-100 border-amber-200' : 'bg-blue-100 border-blue-200'}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Package className={`w-4 h-4 shrink-0 ${hasDebt ? 'text-amber-600' : 'text-blue-600'}`} />
          <span className={`text-sm font-semibold truncate ${hasDebt ? 'text-amber-900' : 'text-blue-900'}`}>{trData(mainItem.productName)}</span>
          <span className={`text-xs shrink-0 ${hasDebt ? 'text-amber-500' : 'text-blue-500'}`}>{mainItem.unitsPerBag} {latinToCyrillic('dona/qop')}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Tuliq / Soniga toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-300 mr-1">
            <button
              type="button"
              onClick={() => !isFullMode && handleToggleMode()}
              title={latinToCyrillic("To'liq komplekt narxi — yetishmagan mahsulot qarz bo'ladi")}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all ${isFullMode ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              {latinToCyrillic('Tuliq')}
            </button>
            <button
              type="button"
              onClick={() => isFullMode && handleToggleMode()}
              title={latinToCyrillic("Haqiqiy miqdorga qarab narx hisoblanadi")}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all border-l border-slate-300 ${!isFullMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              {latinToCyrillic('Soniga')}
            </button>
          </div>

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
            className={`p-1 transition-colors ${hasDebt ? 'text-amber-500 hover:text-amber-700' : 'text-blue-500 hover:text-blue-700'}`}
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

      {/* Qarz ogohlantirish banneri */}
      {hasDebt && (
        <div className="mx-3 mt-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 font-medium">
            {subItems.map((sub, i) => {
              const debtBags = getSubDebt(sub);
              if (debtBags <= 0) return null;
              const debtUnits = Math.round(debtBags * (sub.unitsPerBag || 1));
              return (
                <div key={i}>
                  {latinToCyrillic('Qarz bo\'ladi')}: <span className="font-bold">{debtUnits.toLocaleString()} {latinToCyrillic('ta')} {trData(sub.productName)}</span>
                  {' '}({debtBags.toLocaleString()} {latinToCyrillic('qop')})
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <select
              aria-label="Mahsulot tanlash"
              value={mainItem.productId}
              onChange={e => handleMainProductChange(e.target.value)}
              className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700 truncate"
            >
              {getFilteredProducts(mainItem).map(p => (
                <option key={p.id} value={p.id}>{trData(p.name)}</option>
              ))}
            </select>

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
          {subItems.map((sub, i) => {
            const debtBags = getSubDebt(sub);
            const hasSubDebt = debtBags > 0;
            const debtUnits = Math.round(debtBags * (sub.unitsPerBag || 1));
            return (
              <div key={sub.productId} className={`grid grid-cols-[1fr_52px_70px_72px_72px] items-center gap-1.5 px-3 py-2 ${hasSubDebt ? 'bg-amber-50/60' : 'bg-white/60'}`}>
                <div>
                  <select
                    aria-label="Mahsulot tanlash"
                    value={sub.productId}
                    onChange={e => handleSubProductChange(subIndices[i], sub, e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400 text-slate-600 truncate"
                  >
                    {getFilteredProducts(sub).map(p => (
                      <option key={p.id} value={p.id}>{trData(p.name)}</option>
                    ))}
                  </select>
                  {hasSubDebt && (
                    <div className="text-[10px] text-amber-600 font-semibold mt-0.5 pl-1">
                      {latinToCyrillic('Kerak')}: {Math.round((sub.originalQuantity ?? 0) * (sub.unitsPerBag || 1)).toLocaleString()} {latinToCyrillic('dona')} — {latinToCyrillic('Qarz')}: {debtUnits.toLocaleString()} {latinToCyrillic('dona')}
                    </div>
                  )}
                </div>

                <div>
                  <input type="number" min="0"
                    value={qtyNum(sub.quantity) || ''}
                    onChange={e => handleSubQtyChange(subIndices[i], sub, e.target.value)}
                    className={`w-full text-left text-xs border rounded px-2 py-1.5 bg-white focus:outline-none ${hasSubDebt ? 'border-amber-300 focus:border-amber-500' : 'border-slate-200 focus:border-blue-400'}`}
                    placeholder="0" />
                  {isFullMode && sub.originalQuantity !== undefined && (
                    <div className="text-[10px] text-slate-400 text-center">{latinToCyrillic('/')} {sub.originalQuantity.toLocaleString()}</div>
                  )}
                </div>

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
                  {sym}{isFullMode
                    ? ((sub.originalQuantity ?? qtyNum(sub.quantity)) * sub.pricePerBag).toLocaleString()
                    : sub.subtotal.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer — jami */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-t ${hasDebt ? 'bg-amber-100/70 border-amber-200' : 'bg-blue-100/70 border-blue-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${hasDebt ? 'text-amber-700' : 'text-blue-600'}`}>
            {isFullMode ? latinToCyrillic('Komplekt jami (to\'liq)') : latinToCyrillic('Komplekt jami')}
            {!isBagMode && <span className="ml-1 text-emerald-600">({latinToCyrillic('dona narxida')})</span>}
          </span>
          {isFullMode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">
              {latinToCyrillic('TULIQ')}
            </span>
          )}
        </div>
        <span className={`text-sm font-bold tabular-nums ${hasDebt ? 'text-amber-800' : 'text-blue-800'}`}>
          {sym}{groupTotal.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
