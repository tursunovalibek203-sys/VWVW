import { CheckCircle, Printer, X, ArrowRight, User, Package } from 'lucide-react';
import type { ReceiptData } from '../lib/receiptPrinter';
import { printReceipt } from '../lib/receiptPrinter';
import { latinToCyrillic } from '../lib/transliterator';

interface ReceiptModalProps {
  data: ReceiptData;
  onClose: () => void;
}

export function ReceiptModal({ data, onClose }: ReceiptModalProps) {
  const hasDebt = data.debt > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-slide-up">

        {/* Success header */}
        <div className={`px-5 py-4 flex items-center gap-3 ${hasDebt ? 'bg-amber-500' : 'bg-emerald-500'}`}>
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight">
              {latinToCyrillic('Sotuv muvaffaqiyatli!')}
            </p>
            <p className={`text-sm ${hasDebt ? 'text-amber-100' : 'text-emerald-100'}`}>
              {latinToCyrillic('Chek')} #{data.receiptNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* Grand total */}
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {latinToCyrillic('Jami summa')}
              </p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                {data.total.toLocaleString()}
                <span className="text-sm font-medium text-slate-400 ml-1">so'm</span>
              </p>
            </div>
            <div className={`text-right ${hasDebt ? 'block' : 'hidden'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                {latinToCyrillic('Qarz')}
              </p>
              <p className="text-lg font-bold text-rose-600 tabular-nums mt-0.5">
                {data.debt.toLocaleString()}
                <span className="text-sm font-medium ml-1">so'm</span>
              </p>
            </div>
          </div>

          <div className="p-5 space-y-5">

            {/* Customer */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{latinToCyrillic('Mijoz')}</p>
                <p className="text-sm font-semibold text-slate-900">{data.customer.name}</p>
                {data.customer.phone && (
                  <p className="text-xs text-slate-400">{data.customer.phone}</p>
                )}
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">
                  {data.date} {data.time}
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Items */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {latinToCyrillic('Mahsulotlar')} · {data.items.length} {latinToCyrillic('ta')}
              </p>
              {data.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 leading-tight truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      {item.quantity} {item.unit}
                      {item.piecesPerBag ? ` · 1 ${latinToCyrillic('qopda')} ${item.piecesPerBag}` : ''}
                      {' · '}
                      {item.pricePerUnit.toLocaleString()} so'm
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 tabular-nums flex-shrink-0">
                    {item.subtotal.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <hr className="border-slate-100" />

            {/* Payment breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {latinToCyrillic("To'lov")}
              </p>

              {data.payments.uzs != null && data.payments.uzs > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{latinToCyrillic('Naqd (UZS)')}</span>
                  <span className="font-medium tabular-nums">
                    {data.payments.uzs.toLocaleString()} so'm
                  </span>
                </div>
              )}
              {data.payments.usd != null && data.payments.usd > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dollar (USD)</span>
                  <span className="font-medium tabular-nums">
                    ${(data.payments.usd / data.exchangeRate).toFixed(2)}
                    <span className="text-slate-400 text-xs ml-1">
                      ({data.payments.usd.toLocaleString()})
                    </span>
                  </span>
                </div>
              )}
              {data.payments.card != null && data.payments.card > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{latinToCyrillic('Karta')}</span>
                  <span className="font-medium tabular-nums">
                    {data.payments.card.toLocaleString()} so'm
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-100">
                <span className="text-slate-700">{latinToCyrillic("To'landi")}</span>
                <span className="text-emerald-600 tabular-nums">
                  {data.totalPaid.toLocaleString()} so'm
                </span>
              </div>

              {hasDebt && (
                <div className="flex justify-between text-sm font-semibold bg-rose-50 -mx-1 px-2 py-2 rounded-xl">
                  <span className="text-rose-600">{latinToCyrillic('Qarz')}</span>
                  <span className="text-rose-600 tabular-nums">
                    {data.debt.toLocaleString()} so'm
                  </span>
                </div>
              )}
            </div>

            {/* Driver info */}
            {data.driver && (
              <>
                <hr className="border-slate-100" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {latinToCyrillic('Yetkazib berish')}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{latinToCyrillic('Haydovchi')}</span>
                    <span className="font-medium">{data.driver.name}</span>
                  </div>
                  {data.driver.phone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{latinToCyrillic('Telefon')}</span>
                      <span className="font-medium">{data.driver.phone}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Previous debt banner */}
            {(data.customer.previousBalanceUZS != null && data.customer.previousBalanceUZS > 0) ||
             (data.customer.previousBalanceUSD != null && data.customer.previousBalanceUSD > 0) ? (
              <div className="bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-3 space-y-1">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  {latinToCyrillic('Oldingi qarz')}
                </p>
                {data.customer.previousBalanceUZS != null && data.customer.previousBalanceUZS > 0 && (
                  <p className="text-sm font-medium text-amber-800 tabular-nums">
                    {data.customer.previousBalanceUZS.toLocaleString()} so'm
                  </p>
                )}
                {data.customer.previousBalanceUSD != null && data.customer.previousBalanceUSD > 0 && (
                  <p className="text-sm font-medium text-amber-800 tabular-nums">
                    ${data.customer.previousBalanceUSD.toLocaleString()}
                  </p>
                )}
              </div>
            ) : null}

          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 p-4 sm:p-5 grid grid-cols-2 gap-3 bg-white">
          <button
            type="button"
            onClick={() => printReceipt(data)}
            className="h-12 flex items-center justify-center gap-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors active:scale-[0.97]"
          >
            <Printer className="w-4 h-4" />
            {latinToCyrillic('Chop etish')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`h-12 flex items-center justify-center gap-2 px-4 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.97] ${
              hasDebt
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {latinToCyrillic('Davom etish')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
