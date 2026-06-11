import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Download,
  Wallet,
  Percent,
  Receipt,
  Boxes,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import api from '../lib/professionalApi';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import { useToast, toast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Report types. Each tab maps 1:1 to an existing backend endpoint. The
// endpoints below are UNCHANGED from the original page:
//   GET /reports/sales, /reports/inventory,
//   GET /reports/customer-analysis, /reports/profit-loss
// ---------------------------------------------------------------------------
type ReportType = 'sales' | 'inventory' | 'customers' | 'financial';

const REPORT_ENDPOINT: Record<ReportType, string> = {
  sales: '/reports/sales',
  inventory: '/reports/inventory',
  customers: '/reports/customer-analysis',
  financial: '/reports/profit-loss',
};

interface ReportTab {
  id: ReportType;
  label: string;
  icon: typeof ShoppingCart;
}

const REPORT_TABS: ReportTab[] = [
  { id: 'sales', label: latinToCyrillic('Sotuvlar'), icon: ShoppingCart },
  { id: 'inventory', label: latinToCyrillic('Ombor'), icon: Package },
  { id: 'customers', label: latinToCyrillic('Mijozlar'), icon: Users },
  { id: 'financial', label: latinToCyrillic('Foyda / Zarar'), icon: DollarSign },
];

const PERIODS = ['all', 'today', 'week', 'month', 'year'] as const;
type Period = (typeof PERIODS)[number];

interface KpiCard {
  label: string;
  value: string;
  icon: typeof ShoppingCart;
  tint: string;
}

const fmtNum = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '0');
const fmtMoney = (n: number, currency = 'UZS') => `${fmtNum(n)} ${currency}`;

const SHORT_MONTHS = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Compute the startDate query param for a given period (endDate = now).
// This is sent only when supported by the endpoint; backend ignores it
// otherwise, so data handling stays compatible.
const periodToRange = (period: Period): { startDate?: string; endDate?: string } => {
  if (period === 'all') return {};
  const now = new Date();
  const start = new Date();
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start.setTime(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }
  return { startDate: start.toISOString(), endDate: now.toISOString() };
};

export default function ReportsModern() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Raw payload for the active report. Each report has a different shape so we
  // keep it as `any` here and narrow at render time.
  const [data, setData] = useState<any>(null);

  const loadReport = useCallback(
    async (type: ReportType, selectedPeriod: Period) => {
      setLoading(true);
      setError(false);

      // Guard against an indefinitely hanging request.
      const timeout = setTimeout(() => {
        setLoading(false);
        setError(true);
        console.warn('Loading timeout reached for report:', type);
      }, 15000);

      try {
        const params = periodToRange(selectedPeriod);
        const res = await api.get(REPORT_ENDPOINT[type], { params });
        clearTimeout(timeout);
        setData(res.data ?? null);
      } catch (err) {
        clearTimeout(timeout);
        console.error('Hisobotni yuklashda xatolik:', err);
        setError(true);
        setData(null);
        // Honest error surface — replaces the previous silent
        // `.catch(() => ({ data: [] }))` which faked an empty success.
        addToast(
          toast.error(
            latinToCyrillic('Xatolik'),
            latinToCyrillic('Hisobotni yuklashda xatolik yuz berdi. Qayta urinib koring.')
          )
        );
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    loadReport(activeTab, period);
  }, [activeTab, period, loadReport]);

  const handleRefresh = () => {
    loadReport(activeTab, period);
  };

  // Export is not implemented on the backend yet. Surface this honestly via a
  // disabled button + tooltip instead of pretending with an console.log().
  const exportDisabledTitle = latinToCyrillic('Yuklab olish hozircha mavjud emas');

  // ---- Derived rows + KPI cards per report ----------------------------------
  const salesRows = useMemo(
    () => (activeTab === 'sales' ? (Array.isArray(data?.sales) ? data.sales : []) : []),
    [activeTab, data]
  );
  const inventoryRows = useMemo(
    () => (activeTab === 'inventory' ? (Array.isArray(data) ? data : []) : []),
    [activeTab, data]
  );
  const customerRows = useMemo(
    () => (activeTab === 'customers' ? (Array.isArray(data) ? data : []) : []),
    [activeTab, data]
  );

  const isEmpty = useMemo(() => {
    if (loading || error) return false;
    switch (activeTab) {
      case 'sales':
        return salesRows.length === 0;
      case 'inventory':
        return inventoryRows.length === 0;
      case 'customers':
        return customerRows.length === 0;
      case 'financial':
        return data == null;
      default:
        return true;
    }
  }, [activeTab, loading, error, salesRows, inventoryRows, customerRows, data]);

  const kpiCards: KpiCard[] = useMemo(() => {
    if (activeTab === 'sales') {
      const s = data?.summary ?? {};
      const uzs = s.totalRevenueUZS ?? s.totalRevenue ?? 0;
      const usd = s.totalRevenueUSD ?? 0;
      const revenueLabel = [uzs > 0 ? fmtMoney(uzs, "so'm") : '', usd > 0 ? `$${usd.toFixed(2)}` : ''].filter(Boolean).join(' + ') || "0 so'm";
      const avgUzs = s.averageSale ?? 0;
      const avgUsd = s.averageSaleUSD ?? 0;
      const avgLabel = [avgUzs > 0 ? fmtMoney(avgUzs, "so'm") : '', avgUsd > 0 ? `$${avgUsd.toFixed(2)}` : ''].filter(Boolean).join(' / ') || "0 so'm";
      return [
        { label: latinToCyrillic('Sotuvlar soni'), value: fmtNum(s.totalSales ?? salesRows.length), icon: Receipt, tint: 'bg-indigo-50 text-indigo-600' },
        { label: latinToCyrillic('Umumiy tushum'), value: revenueLabel, icon: DollarSign, tint: 'bg-emerald-50 text-emerald-600' },
        { label: latinToCyrillic('Sotilgan miqdor'), value: fmtNum(s.totalQuantity ?? 0), icon: Boxes, tint: 'bg-violet-50 text-violet-600' },
        { label: latinToCyrillic('Ortacha chek'), value: avgLabel, icon: TrendingUp, tint: 'bg-sky-50 text-sky-600' },
      ];
    }
    if (activeTab === 'inventory') {
      const totalValue = inventoryRows.reduce((sum: number, p: any) => sum + (p.totalValue || 0), 0);
      const lowStock = inventoryRows.filter((p: any) => p.status === 'LOW' || p.status === 'CRITICAL').length;
      const outStock = inventoryRows.filter((p: any) => p.status === 'OUT_OF_STOCK').length;
      return [
        { label: latinToCyrillic('Mahsulotlar'), value: fmtNum(inventoryRows.length), icon: Package, tint: 'bg-indigo-50 text-indigo-600' },
        { label: latinToCyrillic('Ombor qiymati'), value: fmtMoney(totalValue), icon: Wallet, tint: 'bg-emerald-50 text-emerald-600' },
        { label: latinToCyrillic('Kam qolgan'), value: fmtNum(lowStock), icon: AlertTriangle, tint: 'bg-amber-50 text-amber-600' },
        { label: latinToCyrillic('Tugagan'), value: fmtNum(outStock), icon: Boxes, tint: 'bg-rose-50 text-rose-600' },
      ];
    }
    if (activeTab === 'customers') {
      const totalPurchasesUZS = customerRows.reduce((sum: number, c: any) => sum + (c.totalPurchasesUZS || 0), 0);
      const totalPurchasesUSD = customerRows.reduce((sum: number, c: any) => sum + (c.totalPurchasesUSD || 0), 0);
      const totalDebtUZS = customerRows.reduce((sum: number, c: any) => sum + (c.debtUZS ?? c.debt ?? 0), 0);
      const totalDebtUSD = customerRows.reduce((sum: number, c: any) => sum + (c.debtUSD ?? 0), 0);
      const debtors = customerRows.filter((c: any) => (c.debtUZS ?? c.debt ?? 0) > 0 || (c.debtUSD ?? 0) > 0).length;
      const purchasesLabel = [totalPurchasesUZS > 0 ? fmtMoney(totalPurchasesUZS, "so'm") : '', totalPurchasesUSD > 0 ? `$${totalPurchasesUSD.toFixed(2)}` : ''].filter(Boolean).join(' + ') || "0 so'm";
      const debtLabel = [totalDebtUZS > 0 ? fmtMoney(totalDebtUZS, "so'm") : '', totalDebtUSD > 0 ? `$${totalDebtUSD.toFixed(2)}` : ''].filter(Boolean).join(' + ') || '0';
      return [
        { label: latinToCyrillic('Mijozlar'), value: fmtNum(customerRows.length), icon: Users, tint: 'bg-indigo-50 text-indigo-600' },
        { label: latinToCyrillic('Jami xaridlar'), value: purchasesLabel, icon: ShoppingCart, tint: 'bg-emerald-50 text-emerald-600' },
        { label: latinToCyrillic('Qarzdorlar'), value: fmtNum(debtors), icon: AlertTriangle, tint: 'bg-amber-50 text-amber-600' },
        { label: latinToCyrillic('Umumiy qarz'), value: debtLabel, icon: Wallet, tint: 'bg-rose-50 text-rose-600' },
      ];
    }
    // financial
    const f = data ?? {};
    return [
      { label: latinToCyrillic('Tushum'), value: fmtMoney(f.revenue ?? 0), icon: DollarSign, tint: 'bg-indigo-50 text-indigo-600' },
      { label: latinToCyrillic('Xarajatlar'), value: fmtMoney(f.expenses ?? 0), icon: Receipt, tint: 'bg-amber-50 text-amber-600' },
      { label: latinToCyrillic('Sof foyda'), value: fmtMoney(f.grossProfit ?? 0), icon: TrendingUp, tint: (f.grossProfit ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600' },
      { label: latinToCyrillic('Foyda marjasi'), value: `${(f.profitMargin ?? 0).toLocaleString('en-US')}%`, icon: Percent, tint: 'bg-violet-50 text-violet-600' },
    ];
  }, [activeTab, data, salesRows, inventoryRows, customerRows]);

  const activeTabMeta = REPORT_TABS.find((t) => t.id === activeTab)!;

  const stockBadge = (status: string): { variant: 'success' | 'warning' | 'error' | 'neutral'; text: string } => {
    switch (status) {
      case 'GOOD':
        return { variant: 'success', text: latinToCyrillic('Yetarli') };
      case 'LOW':
        return { variant: 'warning', text: latinToCyrillic('Kam') };
      case 'CRITICAL':
        return { variant: 'warning', text: latinToCyrillic('Kritik') };
      case 'OUT_OF_STOCK':
        return { variant: 'error', text: latinToCyrillic('Tugagan') };
      default:
        return { variant: 'neutral', text: status || '—' };
    }
  };

  const periodLabel = (p: Period) =>
    p === 'all'
      ? latinToCyrillic('Barcha vaqt')
      : p === 'today'
      ? latinToCyrillic('Bugun')
      : p === 'week'
      ? latinToCyrillic('Oxirgi 7 kun')
      : p === 'month'
      ? latinToCyrillic('Oylik')
      : latinToCyrillic('Yillik');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: title + subtitle + period selector + refresh + export */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Hisobotlar')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? latinToCyrillic('Yuklanmoqda...')
              : `${activeTabMeta.label} · ${periodLabel(period)}`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {/* Period selector */}
          <div className="relative">
            <label htmlFor="reports-period" className="sr-only">
              {latinToCyrillic('Davr')}
            </label>
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              id="reports-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="appearance-none cursor-pointer pl-10 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {periodLabel(p)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
          </button>

          {/* Honest export: disabled with explanatory tooltip */}
          <button
            type="button"
            disabled
            title={exportDisabledTitle}
            aria-disabled="true"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl text-sm font-semibold text-slate-300 border border-slate-200 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{latinToCyrillic('Yuklab olish')}</span>
          </button>
        </div>
      </div>

      {/* Report-type pill tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[116px] animate-pulse" />
            ))
          : kpiCards.map((card) => {
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

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
          <TableSkeleton rows={8} cols={5} />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={AlertTriangle}
            title={latinToCyrillic('Hisobotni yuklab bolmadi')}
            description={latinToCyrillic('Server bilan boglanishda xatolik yuz berdi. Internet ulanishini tekshirib qayta urinib koring.')}
            action={
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                {latinToCyrillic('Qayta urinish')}
              </button>
            }
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && isEmpty && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={activeTabMeta.icon}
            title={latinToCyrillic('Malumot topilmadi')}
            description={
              period === 'all'
                ? latinToCyrillic('Bu hisobot uchun hozircha malumot mavjud emas.')
                : latinToCyrillic('Tanlangan davr uchun malumot topilmadi. Boshqa davrni tanlab koring.')
            }
          />
        </div>
      )}

      {/* ---- SALES TABLE ---- */}
      {!loading && !error && activeTab === 'sales' && salesRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Sana')}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mijoz')}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mahsulot')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Miqdor')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Summa')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesRows.map((sale: any, idx: number) => (
                  <tr key={sale.id ?? idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-sm text-slate-600 tabular-nums">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(sale.createdAt || sale.date)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(sale.customer?.name || sale.manualCustomerName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {sale.customer?.name || sale.manualCustomerName || latinToCyrillic('Nomalum')}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {sale.items?.length > 0
                        ? sale.items.map((it: any) => it.product?.name).filter(Boolean).join(', ') || sale.product?.name || '—'
                        : sale.product?.name || '—'}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-600 tabular-nums">{fmtNum(sale.quantity ?? 0)}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">
                      {sale.currency === 'USD'
                        ? `$${(sale.totalAmount ?? 0).toFixed(2)}`
                        : fmtMoney(sale.totalAmount ?? 0, "so'm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- INVENTORY TABLE ---- */}
      {!loading && !error && activeTab === 'inventory' && inventoryRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mahsulot')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Qoldiq')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Birlik')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Qiymati')}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Holat')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryRows.map((p: any, idx: number) => {
                  const badge = stockBadge(p.status);
                  return (
                    <tr key={p.id ?? idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                          <Package className="w-4 h-4 text-slate-400" />
                          {p.name || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600 tabular-nums">{fmtNum(p.currentStock ?? 0)}</td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600 tabular-nums">{fmtNum(p.totalUnits ?? 0)}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">{fmtMoney(p.totalValue ?? 0)}</td>
                      <td className="px-5 py-4">
                        <Badge variant={badge.variant}>{badge.text}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- CUSTOMER ANALYSIS TABLE ---- */}
      {!loading && !error && activeTab === 'customers' && customerRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mijoz')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Sotuvlar')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Xaridlar')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Qarz')}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Oxirgi xarid')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerRows.map((c: any, idx: number) => (
                  <tr key={c.id ?? idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{c.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-600 tabular-nums">{fmtNum(c.salesCount ?? 0)}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">
                      {c.totalPurchasesUZS > 0 && <div>{fmtMoney(c.totalPurchasesUZS, "so'm")}</div>}
                      {c.totalPurchasesUSD > 0 && <div>${c.totalPurchasesUSD.toFixed(2)}</div>}
                      {!c.totalPurchasesUZS && !c.totalPurchasesUSD && fmtMoney(c.totalPurchases ?? 0, "so'm")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(c.debtUZS ?? c.debt ?? 0) > 0 || (c.debtUSD ?? 0) > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {(c.debtUZS ?? c.debt ?? 0) > 0 && <span className="text-sm font-bold text-rose-600 tabular-nums">{fmtMoney(c.debtUZS ?? c.debt, "so'm")}</span>}
                          {(c.debtUSD ?? 0) > 0 && <span className="text-sm font-bold text-rose-600 tabular-nums">${(c.debtUSD ?? 0).toFixed(2)}</span>}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 tabular-nums">{formatDate(c.lastPurchase)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- PROFIT / LOSS BREAKDOWN ---- */}
      {!loading && !error && activeTab === 'financial' && data != null && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{latinToCyrillic('Foyda va zarar tafsiloti')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 px-4 bg-emerald-50 rounded-xl">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                <DollarSign className="w-4 h-4" />
                {latinToCyrillic('Umumiy tushum')}
              </span>
              <span className="text-sm font-bold text-emerald-700 tabular-nums">{fmtMoney(data.revenue ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-xl">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-800">
                <Receipt className="w-4 h-4" />
                {latinToCyrillic('Xarajatlar')}
              </span>
              <span className="text-sm font-bold text-amber-700 tabular-nums">- {fmtMoney(data.expenses ?? 0)}</span>
            </div>
            <div className={`flex items-center justify-between py-4 px-4 rounded-xl border ${(data.grossProfit ?? 0) >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
              <span className={`inline-flex items-center gap-2 text-sm font-bold ${(data.grossProfit ?? 0) >= 0 ? 'text-indigo-800' : 'text-rose-800'}`}>
                <TrendingUp className="w-4 h-4" />
                {latinToCyrillic('Sof foyda')}
              </span>
              <span className={`text-base font-extrabold tabular-nums ${(data.grossProfit ?? 0) >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                {fmtMoney(data.grossProfit ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-violet-50 rounded-xl">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-violet-800">
                <Percent className="w-4 h-4" />
                {latinToCyrillic('Foyda marjasi')}
              </span>
              <span className="text-sm font-bold text-violet-700 tabular-nums">{(data.profitMargin ?? 0).toLocaleString('en-US')}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
