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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <label htmlFor="paymentType" className="block text-lg font-semibold text-gray-700">
          {latinToCyrillic("To'lov")}
        </label>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          {/* Payment Type */}
          <div>
            <label htmlFor="paymentType" className="block text-base font-medium text-gray-600 mb-1">
              {latinToCyrillic("To'lov turi")}
            </label>
            <select
              id="paymentType"
              title={latinToCyrillic("To'lov turini tanlash")}
              value={form.paymentType}
              onChange={(e) => onUpdateForm({ paymentType: e.target.value as SaleFormData['paymentType'] })}
              className="w-full h-12 px-3 text-base font-medium border rounded-lg bg-white"
            >
              <option value="cash">{latinToCyrillic('Naqd')}</option>
              <option value="debt">{latinToCyrillic('Qarz')}</option>
              <option value="partial">{latinToCyrillic('Qisman')}</option>
            </select>
          </div>

          {/* Payment Inputs */}
          <div className="space-y-2">
            <div>
              <label htmlFor="paidUZS" className="block text-base text-gray-600 font-medium">UZS</label>
              <input
                id="paidUZS"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.paidUZS}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onUpdateForm({ paidUZS: val, paidCLICK: '' });
                }}
                className="w-full h-12 px-3 text-base font-medium border rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="paidUSD" className="block text-base text-gray-600 font-medium">USD</label>
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
                className="w-full h-12 px-3 text-base font-medium border rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="paidCLICK" className="block text-base text-gray-600 font-medium">CLICK</label>
              <input
                id="paidCLICK"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.paidCLICK}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                  onUpdateForm({ paidCLICK: val, paidUZS: '' });
                }}
                className="w-full h-12 px-3 text-base font-medium border rounded-lg"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white p-3 rounded-lg border">
            {debtAmount > 0 ? (
              <div className="flex justify-between text-base mb-2">
                <span className="text-gray-500">{latinToCyrillic('Qarz')}:</span>
                <span className="font-bold text-red-600">
                  {getCurrencySymbol(currency)}
                  {debtAmount.toFixed(currency === 'UZS' ? 0 : 2)}
                </span>
              </div>
            ) : debtAmount < 0 ? (
              <div className="flex justify-between text-base mb-2">
                <span className="text-gray-500">{latinToCyrillic('Ortiqcha to\'lov (Balans)')}:</span>
                <span className="font-bold text-green-600">
                  {getCurrencySymbol(currency)}
                  {Math.abs(debtAmount).toFixed(currency === 'UZS' ? 0 : 2)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-base">
              <span className="text-gray-500">{latinToCyrillic("To'langan")}:</span>
              <span className="font-bold text-green-600">
                {getCurrencySymbol(currency)}
                {paidAmount.toFixed(currency === 'UZS' ? 0 : 2)}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-600 text-white p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="font-medium">{latinToCyrillic('JAMI')}:</span>
              <span className="text-2xl font-bold">
                {getCurrencySymbol(currency)}
                {getDisplayAmount(totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="flex items-center gap-2 bg-amber-50 p-3 rounded border border-amber-200">
          <label htmlFor="exchangeRate" className="text-base font-medium text-amber-700">{latinToCyrillic('Kurs')}:</label>
          <input
            id="exchangeRate"
            type="text"
            inputMode="decimal"
            placeholder="12500"
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange(e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, ''))}
            className="flex-1 h-12 px-3 border rounded-lg text-base"
          />
          <span className="text-amber-700 font-medium">UZS/$</span>
        </div>

        {/* Savat bo'sh bo'lganda ogohlantirish */}
        {form.items.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-yellow-700 text-sm text-center">
            {latinToCyrillic('Sotuvni rasmiylashtirish uchun kamida bitta mahsulot qoshish kerak')}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || form.items.length === 0}
          className={`w-full h-16 text-lg font-bold flex items-center justify-center gap-3 rounded-xl transition-all ${
            isSubmitting || form.items.length === 0
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-pulse rounded-full h-6 w-6 border-b-2 border-white"></div>
              {latinToCyrillic('Saqlanmoqda...')}
            </>
          ) : (
            <>
              <ShoppingCart className="w-6 h-6" />
              {isEditMode ? latinToCyrillic('Sotuvni saqlash') : latinToCyrillic("Sotuvni rasmiylashtirish")}
            </>
          )}
        </button>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="h-14 text-base font-bold flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md transition-all"
          >
            <X className="w-5 h-5" /> {latinToCyrillic('Bekor')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="h-14 text-base font-bold flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 shadow-md transition-all"
          >
            <RotateCcw className="w-5 h-5" /> {latinToCyrillic('Tozalash')}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PaymentSection;
