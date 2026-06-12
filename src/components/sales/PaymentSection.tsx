import { ShoppingCart, X, RotateCcw } from 'lucide-react';
import type { SaleFormData } from '../../types';
import { getCurrencySymbol, getDisplayAmount } from '../../lib/saleUtils';

interface PaymentSectionProps {
  form: SaleFormData;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  exchangeRate: string;
  currency: string;
  isSubmitting: boolean;
  isEditMode: boolean;
  latinToCyrillic: (text: string) => string;
  onUpdateForm: (updates: Partial<SaleFormData>) => void;
  onExchangeRateChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export const PaymentSection = ({
  form,
  totalAmount,
  paidAmount,
  debtAmount,
  exchangeRate,
  currency,
  isSubmitting,
  isEditMode,
  latinToCyrillic,
  onUpdateForm,
  onExchangeRateChange,
  onSubmit,
  onCancel,
  onReset,
}: PaymentSectionProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleCancel = () => {
    if (form.items.length > 0) {
      const confirmed = confirm(latinToCyrillic('Savatda mahsulotlar bor. Bekor qilishni xohlaysizmi?'));
      if (!confirmed) return;
    }
    onCancel();
  };

  const handleReset = () => {
    if (form.items.length > 0) {
      const confirmed = confirm(latinToCyrillic('Savat tozalanadi. Davom etishni xohlaysizmi?'));
      if (!confirmed) return;
    }
    onReset();
  };

  const isDisabled = isSubmitting || form.items.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <label htmlFor="paymentType" className="block text-sm font-semibold text-slate-900">
          {latinToCyrillic("To'lov")}
        </label>

        <div className="space-y-4">
          {/* Payment Type — segmented buttons */}
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              {latinToCyrillic("To'lov turi")}
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {([
                { value: 'cash', label: latinToCyrillic('Naqd') },
                { value: 'debt', label: latinToCyrillic('Qarz') },
                { value: 'partial', label: latinToCyrillic('Qisman') },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateForm({ paymentType: opt.value as SaleFormData['paymentType'] })}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-all active:scale-[0.97] ${
                    form.paymentType === opt.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Keep accessible select in sync (visually hidden) */}
            <select
              id="paymentType"
              title={latinToCyrillic("To'lov turini tanlash")}
              value={form.paymentType}
              onChange={(e) => onUpdateForm({ paymentType: e.target.value as SaleFormData['paymentType'] })}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            >
              <option value="cash">{latinToCyrillic('Naqd')}</option>
              <option value="debt">{latinToCyrillic('Qarz')}</option>
              <option value="partial">{latinToCyrillic('Qisman')}</option>
            </select>
          </div>

          {/* Payment Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="paidUZS" className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">UZS</label>
              <input
                id="paidUZS"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.paidUZS}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onUpdateForm({ paidUZS: val });
                }}
                className="w-full h-11 px-3 text-sm font-medium text-slate-900 tabular-nums rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="paidUSD" className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">USD</label>
              <input
                id="paidUSD"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form.paidUSD}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                  onUpdateForm({ paidUSD: val });
                }}
                className="w-full h-11 px-3 text-sm font-medium text-slate-900 tabular-nums rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="paidCLICK" className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">CLICK</label>
              <input
                id="paidCLICK"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.paidCLICK}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                  onUpdateForm({ paidCLICK: val });
                }}
                className="w-full h-11 px-3 text-sm font-medium text-slate-900 tabular-nums rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3.5 space-y-2">
            {debtAmount > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{latinToCyrillic('Qarz')}:</span>
                <span className="font-semibold text-rose-600 tabular-nums">
                  {getCurrencySymbol(currency)}
                  {debtAmount.toFixed(currency === 'UZS' ? 0 : 2)}
                </span>
              </div>
            ) : debtAmount < 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{latinToCyrillic('Ortiqcha to\'lov (Balans)')}:</span>
                <span className="font-semibold text-emerald-600 tabular-nums">
                  {getCurrencySymbol(currency)}
                  {Math.abs(debtAmount).toFixed(currency === 'UZS' ? 0 : 2)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{latinToCyrillic("To'langan")}:</span>
              <span className="font-semibold text-emerald-600 tabular-nums">
                {getCurrencySymbol(currency)}
                {paidAmount.toFixed(currency === 'UZS' ? 0 : 2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
              <span className="text-sm font-medium text-slate-600">{latinToCyrillic('JAMI')}:</span>
              <span className="text-xl font-bold text-slate-900 tabular-nums">
                {getCurrencySymbol(currency)}
                {getDisplayAmount(totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="flex items-center gap-2.5">
          <label htmlFor="exchangeRate" className="text-sm font-medium text-slate-500 flex-shrink-0">{latinToCyrillic('Kurs')}:</label>
          <input
            id="exchangeRate"
            type="text"
            inputMode="decimal"
            placeholder="12500"
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange(e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, ''))}
            className="flex-1 h-11 px-3 text-sm font-medium text-slate-900 tabular-nums rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
          <span className="text-sm font-medium text-slate-400 flex-shrink-0">UZS/$</span>
        </div>

        {/* Savat bo'sh bo'lganda ogohlantirish */}
        {form.items.length === 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200/70 p-3 text-amber-700 text-sm text-center font-medium">
            {latinToCyrillic('Sotuvni rasmiylashtirish uchun kamida bitta mahsulot qoshish kerak')}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isDisabled}
          className={`w-full rounded-xl py-3.5 text-base font-semibold flex items-center justify-center gap-2.5 transition-colors active:scale-[0.99] ${
            isDisabled
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              {latinToCyrillic('Saqlanmoqda...')}
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              {isEditMode ? latinToCyrillic('Sotuvni saqlash') : latinToCyrillic("Sotuvni rasmiylashtirish")}
            </>
          )}
        </button>

        {/* Action Buttons — secondary / ghost */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-[44px] text-sm font-semibold flex items-center justify-center gap-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors active:scale-[0.98]"
          >
            <X className="w-4 h-4" /> {latinToCyrillic('Bekor')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] text-sm font-semibold flex items-center justify-center gap-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" /> {latinToCyrillic('Tozalash')}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PaymentSection;
