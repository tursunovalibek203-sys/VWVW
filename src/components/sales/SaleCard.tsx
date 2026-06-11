import { Clock, User, AlertCircle, CheckCircle2, Edit, Printer } from 'lucide-react';
import type { Sale } from '../../types';
import { formatDateTime } from '../../lib/dateUtils';

interface SaleCardProps {
  sale: Sale;
  latinToCyrillic: (text: string) => string;
  onEdit: () => void;
  onPrint: () => void;
}

export const SaleCard = ({ sale, latinToCyrillic, onEdit, onPrint }: SaleCardProps) => {
  const debtAmount = sale.debtAmount || sale.debt || 0;
  const paidAmount = sale.paidAmount || sale.paid || 0;
  const hasDebt = debtAmount > 0;

  const fmtAmt = (n: number) =>
    sale.currency === 'UZS'
      ? `${Math.round(n).toLocaleString('en-US')} so'm`
      : `$${n.toFixed(2)}`;

  return (
    <div className="group relative bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/60 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 hover:-translate-y-2 border border-slate-100/50 overflow-hidden">
      {/* Status Badge */}
      <div className="relative flex items-center justify-between mb-5">
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg ${
            hasDebt
              ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white shadow-rose-500/30'
              : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-emerald-500/30'
          }`}
        >
          {hasDebt ? (
            <>
              <AlertCircle className="w-4 h-4" />
              {latinToCyrillic('Qarz')}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {latinToCyrillic("To'langan")}
            </>
          )}
        </div>
        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
          #{sale.id.slice(0, 6).toUpperCase()}
        </span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 mb-5 text-slate-500 bg-slate-50/80 px-3 py-2 rounded-xl w-fit">
        <Clock className="w-4 h-4 text-slate-400" />
        <p className="text-sm font-semibold">{formatDateTime(sale.createdAt)}</p>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl mb-4 border border-slate-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{sale.customer?.name || 'N/A'}</p>
          <p className="text-xs text-slate-500">{latinToCyrillic('Mijoz')}</p>
        </div>
      </div>

      {/* Financial Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-600 font-medium mb-1">{latinToCyrillic('Jami summa')}</p>
          <p className="text-lg font-bold text-slate-900">{fmtAmt(sale.total || sale.totalAmount || 0)}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-xl border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium mb-1">{latinToCyrillic("To'langan")}</p>
          <p className="text-lg font-bold text-slate-900">{fmtAmt(paidAmount)}</p>
        </div>
      </div>

      {/* Debt Info */}
      {hasDebt && (
        <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl mb-4 border border-rose-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {latinToCyrillic('Qarz')}
            </span>
            <span className="text-lg font-bold text-rose-600">{fmtAmt(debtAmount)}</span>
          </div>
        </div>
      )}

      {/* Items List - Mahsulotlar ro'yxati */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-50 rounded-xl">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <p className="text-sm font-medium text-slate-600">
            {sale.items?.length || 0} {latinToCyrillic('ta mahsulot')}
          </p>
        </div>
        {/* Mahsulotlar ro'yxati */}
        <div className="space-y-1.5">
          {(sale.items || []).slice(0, 3).map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between px-3 py-1.5 bg-blue-50/50 rounded-lg text-xs">
              <span className="font-medium text-slate-700 truncate flex-1">
                {item?.product?.name || item?.productName || latinToCyrillic('Noma\'lum')}
              </span>
              <span className="text-slate-500 ml-2">
                {item?.quantity || 0} {item?.saleType === 'piece' ? 'dona' : 'qop'}
              </span>
            </div>
          ))}
          {sale.items && sale.items.length > 3 && (
            <p className="text-xs text-slate-400 px-3">
              +{(sale.items.length - 3)} {latinToCyrillic('ta boshqa')}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={onEdit}
        className="w-full mb-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <Edit className="w-4 h-4" />
        {latinToCyrillic('Tahrirlash')}
      </button>

      <button
        onClick={onPrint}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 flex items-center justify-center gap-2 group-hover:scale-[1.02]"
      >
        <Printer className="w-4 h-4" />
        {latinToCyrillic('Chek chiqarish')}
      </button>
    </div>
  );
};

export default SaleCard;
