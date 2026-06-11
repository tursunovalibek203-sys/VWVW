import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus,
  ShoppingCart, Package, Wallet,
  RefreshCw, Factory, AlertTriangle,
  ArrowUpRight, Receipt, CreditCard,
  BarChart2, CircleDollarSign, Clock,
} from 'lucide-react';
import api from '../lib/professionalApi';

// ── Tiplar ────────────────────────────────────────────────────────────────────
interface Stats {
  // Bugun
  todaySales: number;
  todayTotal: number;
  todayPaid: number;
  todayDebt: number;
  todayExpense: number;
  todayProfit: number;
  todayProduced: number;
  // Trend
  dailyTrend: number;
  monthlyTrend: number;
  profitTrend: number;
  yesterdayTotal: number;
  // Bu oy
  monthlyRevenueUZS: number;
  monthlyRevenueUSD: number;
  monthlyExpense: number;
  monthlyProfit: number;
  // Kassa
  cashBalanceUZS: number;
  cashBalanceUSD: number;
  // Mijozlar
  totalCustomers: number;
  totalDebtUZS: number;
  totalDebtUSD: number;
  topDebtors: { id: string; name: string; debtUSD: number; debtUZS: number }[];
  // Ombor
  totalProducts: number;
  lowStockCount: number;
  lowStock: { id: string; name: string; currentStock: number; minStockLimit: number }[];
  // Ishlab chiqarish
  activeProduction: number;
  todayBatchCount: number;
  todayProduces: number;
  // Boshqa
  pendingDeliveries: number;
  pendingTasks: number;
  // Grafik
  weeklyTrend: { day: string; date: string; sales: number; profit: number }[];
  // Top mahsulotlar
  topProducts: { id: string; name: string; totalSold: number; revenue: number }[];
  // Oxirgi faoliyat
  recentActivity: {
    id: string;
    receiptNumber: number | null;
    createdAt: string;
    totalAmount: number;
    paidAmount: number;
    currency: string;
    paymentStatus: string;
    customer: string;
    seller: string;
    product: string;
  }[];
}

const EMPTY: Stats = {
  todaySales: 0, todayTotal: 0, todayPaid: 0, todayDebt: 0,
  todayExpense: 0, todayProfit: 0, todayProduced: 0,
  dailyTrend: 0, monthlyTrend: 0, profitTrend: 0, yesterdayTotal: 0,
  monthlyRevenueUZS: 0, monthlyRevenueUSD: 0, monthlyExpense: 0, monthlyProfit: 0,
  cashBalanceUZS: 0, cashBalanceUSD: 0,
  totalCustomers: 0, totalDebtUZS: 0, totalDebtUSD: 0, topDebtors: [],
  totalProducts: 0, lowStockCount: 0, lowStock: [],
  activeProduction: 0, todayBatchCount: 0, todayProduces: 0,
  pendingDeliveries: 0, pendingTasks: 0,
  weeklyTrend: [], topProducts: [], recentActivity: [],
};

// ── Yordamchi ─────────────────────────────────────────────────────────────────
const nf  = (n: number) => n.toLocaleString('uz-UZ');
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const uzs = (n: number) => `${nf(n)} so'm`;
const pct = (n: number) => `${n > 0 ? '+' : ''}${n}%`;

function Trend({ v }: { v: number }) {
  if (v > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold"><TrendingUp className="w-3 h-3" />{pct(v)}</span>;
  if (v < 0) return <span className="inline-flex items-center gap-0.5 text-rose-500 text-xs font-semibold"><TrendingDown className="w-3 h-3" />{pct(v)}</span>;
  return <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs"><Minus className="w-3 h-3" />0%</span>;
}

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} style={style} />;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, trend, tint = 'bg-slate-100 text-slate-600', alert, loading, onClick,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  trend?: number; tint?: string; alert?: boolean; loading?: boolean; onClick?: () => void;
}) {
  return (
    <Card className={`hover:shadow-md transition-shadow cursor-default ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tint}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{value}</p>
      )}
      <div className="mt-1 flex items-center gap-2">
        {sub && (
          <p className={`text-xs ${alert ? 'text-amber-600 font-medium flex items-center gap-1' : 'text-slate-400'}`}>
            {alert && <AlertTriangle className="w-3 h-3" />}
            {sub}
          </p>
        )}
        {trend !== undefined && <Trend v={trend} />}
      </div>
    </Card>
  );
}

// ── Asosiy komponent ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats({
        todaySales:       data.todaySales       ?? 0,
        todayTotal:       data.todayTotal       ?? 0,
        todayPaid:        data.todayPaid        ?? 0,
        todayDebt:        data.todayDebt        ?? 0,
        todayExpense:     data.todayExpense      ?? 0,
        todayProfit:      data.todayProfit       ?? 0,
        todayProduced:    data.todayProduced     ?? 0,
        dailyTrend:       data.dailyTrend        ?? 0,
        monthlyTrend:     data.monthlyTrend      ?? 0,
        profitTrend:      data.profitTrend       ?? 0,
        yesterdayTotal:   data.yesterdayTotal    ?? 0,
        monthlyRevenueUZS: data.monthlyRevenueUZS ?? 0,
        monthlyRevenueUSD: data.monthlyRevenueUSD ?? 0,
        monthlyExpense:   data.monthlyExpense    ?? 0,
        monthlyProfit:    data.monthlyProfit     ?? 0,
        cashBalanceUZS:   data.cashBalanceUZS    ?? 0,
        cashBalanceUSD:   data.cashBalanceUSD    ?? 0,
        totalCustomers:   data.totalCustomers    ?? 0,
        totalDebtUZS:     data.totalDebtUZS      ?? 0,
        totalDebtUSD:     data.totalDebtUSD      ?? 0,
        topDebtors:       data.topDebtors        ?? [],
        totalProducts:    data.totalProducts     ?? 0,
        lowStockCount:    data.lowStockCount     ?? 0,
        lowStock:         data.lowStock          ?? [],
        activeProduction: data.activeProduction  ?? 0,
        todayBatchCount:  data.todayBatchCount   ?? 0,
        todayProduces:    data.todayProduced      ?? 0,
        pendingDeliveries: data.pendingDeliveries ?? 0,
        pendingTasks:     data.pendingTasks       ?? 0,
        weeklyTrend:      data.weeklyTrend        ?? [],
        topProducts:      data.topProducts        ?? [],
        recentActivity:   data.recentActivity     ?? [],
      });
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('uz-UZ', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const statusLabel: Record<string, string> = {
    PAID: 'To\'langan', PARTIAL: 'Qisman', UNPAID: 'Qarz',
  };
  const statusColor: Record<string, string> = {
    PAID: 'text-emerald-600 bg-emerald-50',
    PARTIAL: 'text-amber-600 bg-amber-50',
    UNPAID: 'text-rose-600 bg-rose-50',
  };

  // Haftalik grafik max qiymati
  const maxSales = Math.max(...stats.weeklyTrend.map(d => d.sales), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">

      {/* ── Sarlavha ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Boshqaruv paneli</h1>
          <p className="mt-0.5 text-sm text-slate-500 capitalize">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} da yangilandi
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>
      </div>

      {/* ── 1-qator: Katta hero + bugungi 3 ta KPI ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Kassa balansi — katta qora karta */}
        <div className="lg:col-span-1 relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kassa balansi</p>
              <Wallet className="w-5 h-5 text-indigo-300" />
            </div>
            {loading ? (
              <Skeleton className="h-10 w-40 bg-white/10" />
            ) : (
              <div>
                <p className="text-3xl font-bold tabular-nums leading-none">
                  {uzs(stats.cashBalanceUZS)}
                </p>
                {stats.cashBalanceUSD > 0 && (
                  <p className="mt-1 text-sm text-slate-300 tabular-nums">
                    + {usd(stats.cashBalanceUSD)} USD
                  </p>
                )}
              </div>
            )}
            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
              <div>
                <p className="text-lg font-bold tabular-nums">{loading ? '—' : nf(stats.todaySales)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Bugungi savdolar</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{loading ? '—' : nf(stats.pendingDeliveries)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Kutilmoqda</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 ta katta KPI */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Bugungi sotuv */}
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bugungi sotuv</p>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShoppingCart className="w-[18px] h-[18px]" />
              </div>
            </div>
            {loading ? <Skeleton className="mt-3 h-8 w-32" /> : (
              <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{uzs(stats.todayTotal)}</p>
            )}
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-slate-400">Kecha: {uzs(stats.yesterdayTotal)}</p>
              <Trend v={stats.dailyTrend} />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-semibold text-emerald-600 tabular-nums">{uzs(stats.todayPaid)}</p>
                <p className="text-xs text-slate-400">Naqt keldi</p>
              </div>
              <div>
                <p className={`text-sm font-semibold tabular-nums ${stats.todayDebt > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {uzs(stats.todayDebt)}
                </p>
                <p className="text-xs text-slate-400">Savdo qarzi</p>
              </div>
            </div>
          </Card>

          {/* Bu oy sotuv */}
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bu oy sotuv</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart2 className="w-[18px] h-[18px]" />
              </div>
            </div>
            {loading ? <Skeleton className="mt-3 h-8 w-32" /> : (
              <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{uzs(stats.monthlyRevenueUZS)}</p>
            )}
            <div className="mt-1 flex items-center gap-2">
              {stats.monthlyRevenueUSD > 0 && (
                <p className="text-xs text-slate-400">{usd(stats.monthlyRevenueUSD)} USD ham</p>
              )}
              <Trend v={stats.monthlyTrend} />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-700 tabular-nums">{uzs(stats.monthlyExpense)}</p>
                <p className="text-xs text-slate-400">Xarajatlar</p>
              </div>
              <div>
                <p className={`text-sm font-semibold tabular-nums ${stats.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {uzs(stats.monthlyProfit)}
                </p>
                <p className="text-xs text-slate-400">Foyda</p>
              </div>
            </div>
          </Card>

          {/* Mijozlar qarzi */}
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mijozlar qarzi</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stats.totalDebtUZS > 0 || stats.totalDebtUSD > 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                <CreditCard className="w-[18px] h-[18px]" />
              </div>
            </div>
            {loading ? <Skeleton className="mt-3 h-8 w-32" /> : (
              <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{uzs(stats.totalDebtUZS)}</p>
            )}
            <p className="mt-1 text-xs text-slate-400 tabular-nums">
              {stats.totalDebtUSD > 0 ? `+ ${usd(stats.totalDebtUSD)} USD` : 'Jami barcha mijozlar'}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-700 tabular-nums">{nf(stats.totalCustomers)}</p>
                <p className="text-xs text-slate-400">Jami mijoz</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 tabular-nums">{nf(stats.topDebtors.length)}</p>
                <p className="text-xs text-slate-400">Qarzdor</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── 2-qator: 4 ta kichik KPI ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={Package}
          label="Mahsulotlar"
          value={nf(stats.totalProducts)}
          sub={stats.lowStockCount > 0 ? `${stats.lowStockCount} ta kam qoldi` : 'Zaxira yetarli'}
          alert={stats.lowStockCount > 0}
          tint={stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}
          loading={loading}
          onClick={() => navigate('/inventory')}
        />
        <KpiCard
          icon={Factory}
          label="Bugun ishlab chiqarildi"
          value={`${nf(stats.todayProduced)} qop`}
          sub={`${stats.activeProduction} ta aktiv buyurtma`}
          tint="bg-violet-50 text-violet-600"
          loading={loading}
          onClick={() => navigate('/production')}
        />
        <KpiCard
          icon={CircleDollarSign}
          label="Bugungi xarajat"
          value={uzs(stats.todayExpense)}
          sub={stats.todayProfit >= 0 ? `Foyda: ${uzs(stats.todayProfit)}` : `Zarar: ${uzs(Math.abs(stats.todayProfit))}`}
          tint={stats.todayProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}
          loading={loading}
          onClick={() => navigate('/expenses')}
        />
        <KpiCard
          icon={Receipt}
          label="Kutilayotgan yetkazma"
          value={nf(stats.pendingDeliveries)}
          sub={stats.pendingDeliveries > 0 ? 'Bajarilishini kutmoqda' : 'Hamma bajarildi'}
          tint={stats.pendingDeliveries > 0 ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}
          loading={loading}
        />
      </div>

      {/* ── 3-qator: Haftalik grafik + Top mahsulotlar ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Haftalik sotuv grafiki */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Haftalik sotuv</h3>
            <p className="text-xs text-slate-400">Oxirgi 7 kun</p>
          </div>
          {loading ? (
            <div className="h-32 flex items-end gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className={`flex-1 rounded`} style={{ height: `${30 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {stats.weeklyTrend.map((d) => {
                const h = Math.max(4, Math.round((d.sales / maxSales) * 100));
                const isToday = d.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all ${isToday ? 'bg-indigo-500' : 'bg-slate-200'}`}
                      style={{ height: `${h}%` }}
                      title={`${d.day}: ${uzs(d.sales)}`}
                    />
                    <p className={`text-[10px] ${isToday ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>{d.day}</p>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-6">
            <div>
              <p className="text-xs text-slate-400">Bu oy sotuv</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">{uzs(stats.monthlyRevenueUZS)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Bu oy foyda</p>
              <p className={`text-sm font-bold tabular-nums ${stats.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {uzs(stats.monthlyProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Oylik o'sish</p>
              <div className="mt-0.5"><Trend v={stats.monthlyTrend} /></div>
            </div>
          </div>
        </Card>

        {/* Top mahsulotlar */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Top mahsulotlar</h3>
            <button
              onClick={() => navigate('/products')}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              Barchasi <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : stats.topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Bu oy sotuv yo'q</p>
          ) : (
            <div className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{nf(p.totalSold)} qop</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 tabular-nums text-right">
                    {uzs(p.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── 4-qator: So'nggi sotuvlar + Kam qolgan mahsulotlar ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Oxirgi 5 sotuv */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">So'nggi sotuvlar</h3>
            <button
              onClick={() => navigate('/sales')}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              Barchasi <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : stats.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Hozircha sotuvlar yo'q</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentActivity.map((s) => {
                const dt = new Date(s.createdAt);
                const time = dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                const date = dt.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
                const statusCls = statusColor[s.paymentStatus] ?? 'text-slate-400 bg-slate-50';
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      #{s.receiptNumber ?? '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.customer}</p>
                      <p className="text-xs text-slate-400 truncate">{s.product || 'Mahsulot'} · {s.seller}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{uzs(s.totalAmount)}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusCls}`}>
                          {statusLabel[s.paymentStatus] ?? s.paymentStatus}
                        </span>
                        <span className="text-[10px] text-slate-400">{date} {time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Kam qolgan mahsulotlar + Top qarzdorlar */}
        <div className="space-y-5">

          {/* Kam qolgan */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Kam qolgan
              </h3>
              <button onClick={() => navigate('/inventory')} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
                Ko'rish <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : stats.lowStock.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Zaxira yetarli ✅</p>
            ) : (
              <div className="space-y-2">
                {stats.lowStock.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-700 truncate flex-1">{p.name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${p.currentStock === 0 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                      {p.currentStock === 0 ? 'Tugagan' : `${p.currentStock} qop`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top qarzdorlar */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Qarzdorlar</h3>
              <button onClick={() => navigate('/customers')} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
                Ko'rish <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : stats.topDebtors.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Qarzlar yo'q ✅</p>
            ) : (
              <div className="space-y-2">
                {stats.topDebtors.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-700 truncate flex-1">{c.name}</p>
                    <div className="text-right flex-shrink-0">
                      {c.debtUSD > 0 && <p className="text-xs font-bold text-rose-600">{usd(c.debtUSD)}</p>}
                      {c.debtUZS > 0 && <p className="text-[10px] text-rose-400">{uzs(c.debtUZS)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
