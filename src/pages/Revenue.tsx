import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Calculator,
  BarChart3, Wallet, Target, RefreshCw, X, AlertCircle, DollarSign,
} from 'lucide-react';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
}

interface ProductRevenue {
  name: string;
  revenue: number;
  percentage: number;
  growth: number;
}

export default function Revenue() {
  const t = latinToCyrillic;
  const { addToast } = useToast();

  const [timeRange, setTimeRange] = useState('6months');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcValues, setCalcValues] = useState({ price: '', cost: '', quantity: '' });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [productRevenue, setProductRevenue] = useState<ProductRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadRevenueData = useCallback(async () => {
    setError(false);
    try {
      // NOTE: backend /api/revenue routes are not mounted yet — these calls
      // will fail (404) until the endpoint exists. We surface this honestly
      // instead of silently swallowing the error and showing a fake-empty page.
      const [revenueRes, productRes] = await Promise.all([
        api.get('/revenue/monthly'),
        api.get('/revenue/by-product'),
      ]);
      setRevenueData(Array.isArray(revenueRes.data) ? revenueRes.data : []);
      setProductRevenue(Array.isArray(productRes.data) ? productRes.data : []);
    } catch (err) {
      console.error('Error loading revenue data:', err);
      setRevenueData([]);
      setProductRevenue([]);
      setError(true);
      addToast({
        type: 'error',
        title: t('Hisobotni yuklab bolmadi'),
        message: t('Daromad hisoboti hozircha mavjud emas'),
      });
    }
  }, [addToast, t]);

  useEffect(() => {
    setLoading(true);
    loadRevenueData().finally(() => setLoading(false));
  }, [timeRange, loadRevenueData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRevenueData();
    if (!error) {
      addToast({ type: 'success', title: t('Malumotlar yangilandi') });
    }
    setRefreshing(false);
  };

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = revenueData.reduce((sum, d) => sum + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const maxRevenue = revenueData.reduce((m, d) => Math.max(m, d.revenue), 0) || 1;

  const calculateProfit = () => {
    const price = parseFloat(calcValues.price) || 0;
    const cost = parseFloat(calcValues.cost) || 0;
    const quantity = parseFloat(calcValues.quantity) || 0;
    return (price - cost) * quantity;
  };

  const periodLabel: Record<string, string> = {
    '6months': t('Songgi 6 oy'),
    '12months': t('Songgi 12 oy'),
    'year': t('Bu yil'),
  };

  const hasData = revenueData.length > 0 || productRevenue.length > 0;

  const kpiCards = [
    {
      title: t('Umumiy daromad'),
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: t('Umumiy xarajat'),
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      tint: 'bg-amber-50 text-amber-600',
    },
    {
      title: t('Sof foyda'),
      value: formatCurrency(totalProfit),
      icon: Wallet,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: t('Foyda marjasi'),
      value: `${profitMargin.toFixed(1)}%`,
      icon: Target,
      tint: 'bg-sky-50 text-sky-600',
    },
  ];

  // ── Loading: clean header + KPI skeletons matching premium standard ──────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse" />
            <div className="mt-2 h-4 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-9 w-32 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>
        <CardSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('Daromad tahlili')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('Daromad, xarajat va foyda korsatkichlari')} · {periodLabel[timeRange]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <select
            title={t('Vaqt oraligini tanlash')}
            aria-label={t('Vaqt oraligini tanlash')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="6months">{t('Songgi 6 oy')}</option>
            <option value="12months">{t('Songgi 12 oy')}</option>
            <option value="year">{t('Bu yil')}</option>
          </select>
          <button
            onClick={() => setShowCalculator(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <Calculator className="w-4 h-4" />
            {t('Kalkulyator')}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('Yangilash')}
          </button>
        </div>
      </div>

      {/* Honest error / no-data state (backend endpoint is missing) */}
      {(error || !hasData) ? (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={AlertCircle}
            title={t('Bu hisobot hozircha mavjud emas')}
            description={t(
              'Daromad hisoboti uchun server xizmati hali ulanmagan. Iltimos keyinroq qayta urinib koring.'
            )}
            action={
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors active:scale-[0.98]"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {t('Qayta urinish')}
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {kpiCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                      {kpi.title}
                    </p>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.tint}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Monthly revenue bars */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-[18px] h-[18px]" />
                </div>
                <h2 className="font-semibold text-slate-900 tracking-tight">{t('Oylik daromad')}</h2>
              </div>
              {revenueData.length > 0 ? (
                <div className="space-y-4">
                  {revenueData.map((data, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="w-14 text-sm font-medium text-slate-500 tabular-nums">{data.month}</span>
                      <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-lg transition-all duration-500"
                          style={{ width: `${Math.min(100, (data.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 text-sm font-semibold text-slate-900 text-right tabular-nums">
                        {(data.revenue / 1_000_000).toFixed(1)} {t('mln')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title={t('Malumot yoq')}
                  description={t('Tanlangan davr uchun oylik daromad topilmadi')}
                />
              )}
            </div>

            {/* Product revenue */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <DollarSign className="w-[18px] h-[18px]" />
                </div>
                <h2 className="font-semibold text-slate-900 tracking-tight">
                  {t('Mahsulotlar boyicha daromad')}
                </h2>
              </div>
              {productRevenue.length > 0 ? (
                <div className="space-y-3">
                  {productRevenue.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 sm:p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, product.percentage)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-400 tabular-nums">
                            {product.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-slate-900 tabular-nums">
                          {(product.revenue / 1_000_000).toFixed(1)} {t('mln')}
                        </p>
                        <p
                          className={`text-xs font-medium tabular-nums ${
                            product.growth > 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {product.growth > 0 ? '+' : ''}
                          {product.growth}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={DollarSign}
                  title={t('Malumot yoq')}
                  description={t('Mahsulotlar boyicha daromad topilmadi')}
                />
              )}
            </div>
          </div>

          {/* Detailed financial table */}
          {revenueData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 tracking-tight">
                  {t('Batafsil moliyaviy hisobot')}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Oy')}</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Daromad')}</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Xarajat')}</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Sof foyda')}</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Foyda')} %</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Buyurtmalar')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revenueData.map((data, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{data.month}</td>
                        <td className="px-6 py-4 text-right text-slate-900 font-medium tabular-nums">{formatCurrency(data.revenue)}</td>
                        <td className="px-6 py-4 text-right text-amber-600 font-medium tabular-nums">{formatCurrency(data.expenses)}</td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-medium tabular-nums">{formatCurrency(data.profit)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium tabular-nums">
                            {data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500 tabular-nums">{data.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Profit calculator modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] border border-slate-200/70">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calculator className="w-[18px] h-[18px]" />
                </span>
                {t('Foyda kalkulyatori')}
              </h2>
              <button
                onClick={() => setShowCalculator(false)}
                title={t('Yopish')}
                aria-label={t('Yopish')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('Sotish narxi')} (so'm)</label>
                <input
                  type="number"
                  value={calcValues.price}
                  onChange={(e) => setCalcValues({ ...calcValues, price: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('Tannarx')} (so'm)</label>
                <input
                  type="number"
                  value={calcValues.cost}
                  onChange={(e) => setCalcValues({ ...calcValues, cost: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('Miqdori')} (dona)</label>
                <input
                  type="number"
                  value={calcValues.quantity}
                  onChange={(e) => setCalcValues({ ...calcValues, quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="0"
                />
              </div>
              <div className="p-4 bg-indigo-50 rounded-xl">
                <p className="text-sm text-indigo-600 mb-1">{t('Sof foyda')}:</p>
                <p className="text-2xl font-bold text-indigo-700 tabular-nums">{formatCurrency(calculateProfit())}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
