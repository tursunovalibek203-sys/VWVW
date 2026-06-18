import { Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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

  const groupTotal =
    mainItem.subtotal +
    subItems.reduce((sum, i) => sum + i.subtotal, 0);

  const handleMainQtyChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const qty = parseFloat(clean) || 0;
    onUpdate(mainIndex, {
      quantity: clean,
      bagDisplayValue: clean,
      subtotal: qty * mainItem.pricePerBag,
    });
  };

  const handleSubQtyChange = (idx: number, item: SaleItemForm, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const qty = parseFloat(clean) || 0;
    onUpdate(idx, {
      quantity: clean,
      bagDisplayValue: clean,
      subtotal: qty * item.pricePerBag,
    });
  };

  const warehouseIcon = (wh?: string) => {
    if (wh === 'krishka') return '⭕';
    if (wh === 'ruchka') return '🎗';
    return '🏭';
  };

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 overflow-hidden">
      {/* Header — asosiy mahsulot */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-100 border-b border-blue-200">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Package className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-blue-900 truncate">{trData(mainItem.productName)}</span>
          <span className="text-xs text-blue-500 shrink-0">{mainItem.unitsPerBag} dona/qop</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
            title={latinToCyrillic(collapsed ? "Kengaytirish" : "Yig'ish")}
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

      {!collapsed && (
        <div className="divide-y divide-blue-100">
          {/* Asosiy mahsulot satri */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-sm w-5">🏭</span>
            <span className="text-xs text-slate-600 flex-1 truncate">{trData(mainItem.productName)}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={qtyNum(mainItem.quantity) || ''}
                onChange={e => handleMainQtyChange(e.target.value)}
                className="w-14 text-center text-sm border border-blue-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500"
                placeholder="0"
              />
              <span className="text-xs text-slate-400">qop</span>
            </div>
            <span className="text-xs text-slate-500 w-20 text-right">
              {sym}{mainItem.pricePerBag.toLocaleString()}/qop
            </span>
            <span className="text-sm font-semibold text-slate-700 w-20 text-right tabular-nums">
              {sym}{mainItem.subtotal.toLocaleString()}
            </span>
          </div>

          {/* Komplekt sub-mahsulotlar */}
          {subItems.map((sub, i) => (
            <div key={sub.productId} className="flex items-center gap-2 px-3 py-2 bg-white/60">
              <span className="text-sm w-5">{warehouseIcon(sub.warehouse)}</span>
              <span className="text-xs text-slate-600 flex-1 truncate">{trData(sub.productName)}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={qtyNum(sub.quantity) || ''}
                  onChange={e => handleSubQtyChange(subIndices[i], sub, e.target.value)}
                  className="w-14 text-center text-sm border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-blue-400"
                  placeholder="0"
                />
                <span className="text-xs text-slate-400">qop</span>
              </div>
              <span className="text-xs text-slate-500 w-20 text-right">
                {sym}{sub.pricePerBag.toLocaleString()}/qop
              </span>
              <span className="text-sm font-semibold text-slate-700 w-20 text-right tabular-nums">
                {sym}{sub.subtotal.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer — jami */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-blue-100/70 border-t border-blue-200">
        <span className="text-xs text-blue-600 font-medium">{latinToCyrillic('Komplekt jami')}</span>
        <span className="text-sm font-bold text-blue-800 tabular-nums">
          {sym}{groupTotal.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
