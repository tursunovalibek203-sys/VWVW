import { useEffect, useMemo, useState } from 'react';
import api from '../lib/professionalApi';
import { formatCurrency, formatDate } from '../lib/utils';
import { latinToCyrillic } from '../lib/transliterator';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast, toast } from '../components/ui/Toast';
import {
  DollarSign,
  TrendingDown,
  Plus,
  RefreshCw,
  Receipt,
  Calendar,
  Zap,
  Truck,
  UserCheck,
  MoreHorizontal,
  Layers,
  CalendarDays,
  X,
  Users,
  Wrench,
  Building2,
  ShoppingCart,
} from 'lucide-react';

const t = latinToCyrillic;

// Category metadata: icon + tint + Badge variant + readable name.
type CategoryMeta = {
  id: string;
  name: string;
  icon: typeof Receipt;
  tint: string;
  badge: 'success' | 'warning' | 'error' | 'info' | 'neutral';
};

const CATEGORIES: CategoryMeta[] = [
  { id: 'SALARY',        name: 'Ish haqi',  icon: UserCheck,     tint: 'bg-sky-50 text-sky-600',       badge: 'info' },
  { id: 'ADVANCE',       name: 'Avans',     icon: Users,         tint: 'bg-indigo-50 text-indigo-600', badge: 'info' },
  { id: 'LOAN',          name: 'Qarz',      icon: Users,         tint: 'bg-purple-50 text-purple-600', badge: 'neutral' },
  { id: 'ELECTRICITY',   name: 'Elektr',    icon: Zap,           tint: 'bg-amber-50 text-amber-600',   badge: 'warning' },
  { id: 'RAW_MATERIALS', name: 'Xom ashyo', icon: Receipt,       tint: 'bg-emerald-50 text-emerald-600', badge: 'success' },
  { id: 'MAINTENANCE',   name: 'Tamirlash', icon: Wrench,        tint: 'bg-orange-50 text-orange-600', badge: 'warning' },
  { id: 'RENT',          name: 'Ijara',     icon: Building2,     tint: 'bg-violet-50 text-violet-600', badge: 'info' },
  { id: 'MARKETING',     name: 'Marketing', icon: ShoppingCart,  tint: 'bg-pink-50 text-pink-600',     badge: 'neutral' },
  { id: 'TAX',           name: 'Soliq',     icon: DollarSign,    tint: 'bg-rose-50 text-rose-600',     badge: 'error' },
  { id: 'TRANSPORT',     name: 'Transport', icon: Truck,         tint: 'bg-indigo-50 text-indigo-600', badge: 'info' },
  { id: 'UTILITIES',     name: 'Kommunal',  icon: Zap,           tint: 'bg-lime-50 text-lime-600',     badge: 'warning' },
  { id: 'SUPPLIES',      name: 'Taminot',   icon: ShoppingCart,  tint: 'bg-teal-50 text-teal-600',     badge: 'info' },
  { id: 'OTHER',         name: 'Boshqa',    icon: MoreHorizontal, tint: 'bg-slate-100 text-slate-600', badge: 'neutral' },
];

const getCategory = (id: string): CategoryMeta =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export default function Expenses() {
  const { addToast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'SALARY',
    amount: '',
    currency: 'UZS',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.allSettled([
        api.get('/expenses'),
        api.get('/expenses/summary'),
      ]);
      if (expRes.status === 'fulfilled') {
        setExpenses(Array.isArray(expRes.value.data) ? expRes.value.data : []);
      } else {
        addToast(toast.error(t('Xatolik'), t('Malumotlarni yuklashda xatolik yuz berdi')));
      }
      if (sumRes.status === 'fulfilled') {
        const chartData = sumRes.value.data.map((item: any) => ({
          name: item.category,
          value: item._sum.amount,
        }));
        setSummary(chartData);
      }
    } catch (err) {
      console.error(err);
      addToast(toast.error(t('Xatolik'), t('Malumotlarni yuklashda xatolik yuz berdi')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/expenses', {
        ...form,
        amount: parseFloat(form.amount),
      });
      setShowForm(false);
      setForm({
        category: 'SALARY',
        amount: '',
        currency: 'UZS',
        description: '',
      });
      loadData();
      addToast(toast.success(t('Saqlandi'), t('Xarajat muvaffaqiyatli qoshildi')));
    } catch (err) {
      console.error('Failed to save expense:', err);
      addToast(toast.error(t('Xatolik'), t('Xarajatni saqlashda xatolik yuz berdi')));
    } finally {
      setSubmitting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setForm({ category: 'SALARY', amount: '', currency: 'UZS', description: '' });
  };

  const totalExpenses = useMemo(
    () => summary.reduce((sum, item) => sum + (item.value || 0), 0),
    [summary],
  );

  // "This month" total from the raw expense list (no API/payload change).
  const monthTotal = useMemo(() => {
    const now = new Date();
    return expenses.reduce((sum, e) => {
      const d = new Date(e.createdAt || e.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        return sum + (Number(e.amount) || 0);
      }
      return sum;
    }, 0);
  }, [expenses]);

  const summaryCards = [
    {
      label: t('Umumiy xarajat'),
      value: `${totalExpenses.toLocaleString('en-US')} UZS`,
      icon: TrendingDown,
      tint: 'bg-rose-50 text-rose-600',
    },
    {
      label: t('Kategoriyalar'),
      value: `${summary.length}`,
      icon: Layers,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: t('Bu oy'),
      value: `${monthTotal.toLocaleString('en-US')} UZS`,
      icon: CalendarDays,
      tint: 'bg-amber-50 text-amber-600',
    },
    {
      label: t('Operatsiyalar'),
      value: `${expenses.length}`,
      icon: Receipt,
      tint: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('Xarajatlar')}
            </h1>
            <p className="mt-1 text-sm text-slate-500 tabular-nums">
              {loading
                ? t('Yuklanmoqda...')
                : `${totalExpenses.toLocaleString('en-US')} UZS · ${expenses.length} ${t('ta operatsiya')}`}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('Yangilash')}</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {t('Yangi xarajat')}
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[116px] animate-pulse" />
              ))
            : summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                        {card.label}
                      </p>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.tint}`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{card.value}</p>
                  </div>
                );
              })}
        </div>

        {/* Category breakdown */}
        {!loading && summary.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Kategoriyalar boyicha')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {[...summary]
                .sort((a, b) => (b.value || 0) - (a.value || 0))
                .map((item) => {
                  const cat = getCategory(item.name);
                  const Icon = cat.icon;
                  const pct = totalExpenses > 0 ? ((item.value || 0) / totalExpenses) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.tint}`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-sm font-medium text-slate-700 truncate">{t(cat.name)}</span>
                          <span className="text-sm font-semibold text-slate-900 flex-shrink-0 tabular-nums">
                            {(item.value || 0).toLocaleString('en-US')} UZS
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 tabular-nums w-9 text-right flex-shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={8} cols={4} />
          </div>
        )}

        {/* Empty state */}
        {!loading && expenses.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70">
            <EmptyState
              icon={Receipt}
              title={t("Hali xarajatlar yo'q")}
              description={t("Birinchi xarajatni qoshing va u shu yerda korinadi")}
              action={
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {t('Yangi xarajat')}
                </button>
              }
            />
          </div>
        )}

        {/* Expenses table (desktop) */}
        {!loading && expenses.length > 0 && (
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/60">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{t('Sana')}</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{t('Kategoriya')}</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{t('Tavsif')}</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{t('Summa')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((expense) => {
                    const cat = getCategory(expense.category);
                    const Icon = cat.icon;
                    return (
                      <tr key={expense.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600 tabular-nums">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{formatDate(expense.createdAt || expense.date)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.tint}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <Badge variant={cat.badge}>{t(cat.name)}</Badge>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-600 line-clamp-1 max-w-xs">{expense.description || '—'}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-semibold text-rose-600 tabular-nums">
                            -{formatCurrency(expense.amount, expense.currency)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses cards (mobile) */}
        {!loading && expenses.length > 0 && (
          <div className="md:hidden space-y-3">
            {expenses.map((expense) => {
              const cat = getCategory(expense.category);
              const Icon = cat.icon;
              return (
                <div key={expense.id} className="bg-white rounded-2xl border border-slate-200/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.tint}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <Badge variant={cat.badge}>{t(cat.name)}</Badge>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1.5 tabular-nums">
                          <Calendar className="w-3 h-3" />
                          {formatDate(expense.createdAt || expense.date)}
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-bold text-rose-600 flex-shrink-0 tabular-nums">
                      -{formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </div>
                  {expense.description && (
                    <p className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 line-clamp-2">
                      {expense.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add expense modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={t('Yangi xarajat')}
        footer={
          <>
            <button
              type="button"
              onClick={closeForm}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <X className="w-4 h-4" />
              {t('Bekor qilish')}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting ? t('Saqlanmoqda...') : t('Saqlash')}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('Kategoriya')}</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = form.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.id })}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-indigo-100 text-indigo-600' : cat.tint}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className={`text-[11px] font-medium text-center ${active ? 'text-indigo-700' : 'text-slate-600'}`}>
                      {t(cat.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-amount" className="block text-sm font-medium text-slate-700 mb-2">{t('Summa')}</label>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(',', '.');
                  if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                  setForm({ ...form, amount: raw });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label htmlFor="expense-currency" className="block text-sm font-medium text-slate-700 mb-2">{t('Valyuta')}</label>
              <select
                id="expense-currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="UZS">UZS (so'm)</option>
                <option value="USD">USD ($)</option>
                <option value="CLICK">CLICK</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="expense-description" className="block text-sm font-medium text-slate-700 mb-2">{t('Tavsif')}</label>
            <textarea
              id="expense-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all min-h-[96px] resize-none"
              placeholder={t('Izoh qoldiring...')}
              required
            />
          </div>

          {/* Hidden submit to keep Enter-key submit working */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>
    </>
  );
}
