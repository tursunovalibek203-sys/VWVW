import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  Wallet,
  TrendingUp,
  RefreshCw,
  Clock,
  Plus,
  UserPlus,
  ClipboardList,
  Receipt,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import EmptyState from '../components/EmptyState';
import api from '../lib/professionalApi';

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  newCustomers: number;
  cashboxBalance: number;
  pendingOrders: number;
}

const USD_TO_UZS = 12500;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayRevenue: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    newCustomers: 0,
    cashboxBalance: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setRefreshing(true);
    try {
      // Haqiqiy backend ma'lumotlari
      const { data } = await api.get('/dashboard/stats');
      setStats({
        todaySales: data.todaySales ?? 0,
        todayRevenue: data.dailyRevenue ?? 0,
        totalProducts: data.totalProducts ?? 0,
        lowStockProducts: Array.isArray(data.lowStock) ? data.lowStock.length : 0,
        totalCustomers: data.totalCustomers ?? 0,
        newCustomers: data.newCustomers ?? 0,
        cashboxBalance: data.cashBalance ?? 0,
        pendingOrders: data.pendingDeliveries ?? 0,
      });
    } catch (error) {
      console.error('Dashboard stats loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const nf = (n: number) => n.toLocaleString('en-US');

  const kpis = [
    {
      label: 'Kassa balansi',
      value: `$${nf(stats.cashboxBalance)}`,
      sub: `${nf(stats.cashboxBalance * USD_TO_UZS)} ${latinToCyrillic("so'm")}`,
      icon: Wallet,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Mahsulotlar',
      value: nf(stats.totalProducts),
      sub:
        stats.lowStockProducts > 0
          ? `${stats.lowStockProducts} ${latinToCyrillic('ta kam qoldi')}`
          : latinToCyrillic('Zaxira yetarli'),
      icon: Package,
      tint: stats.lowStockProducts > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600',
      alert: stats.lowStockProducts > 0,
    },
    {
      label: 'Mijozlar',
      value: nf(stats.totalCustomers),
      sub: stats.newCustomers > 0 ? `+${stats.newCustomers} ${latinToCyrillic('yangi')}` : latinToCyrillic('Jami baza'),
      icon: Users,
      tint: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Kutilayotgan buyurtma',
      value: nf(stats.pendingOrders),
      sub: latinToCyrillic('ta buyurtma'),
      icon: ClipboardList,
      tint: 'bg-violet-50 text-violet-600',
    },
  ];

  const quickActions = [
    { id: 'sotuv', icon: Plus, label: 'Yangi savdo', tint: 'bg-indigo-50 text-indigo-600', path: '/cashier/sales/add' },
    { id: 'mijoz', icon: UserPlus, label: 'Mijozlar', tint: 'bg-sky-50 text-sky-600', path: '/cashier/customers' },
    { id: 'buyurtma', icon: ClipboardList, label: 'Buyurtmalar', tint: 'bg-violet-50 text-violet-600', path: '/cashier/orders' },
    { id: 'xarajat', icon: Receipt, label: 'Xarajatlar', tint: 'bg-rose-50 text-rose-600', path: '/cashier/expenses' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Boshqaruv paneli')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 capitalize">{currentDate}</p>
        </div>
        <button
          onClick={loadDashboardStats}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98] self-start"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {latinToCyrillic('Yangilash')}
        </button>
      </div>

      {/* Top: dark revenue hero + KPI grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Premium dark KPI: today's revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {latinToCyrillic('Bugungi daromad')}
              </p>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-[18px] h-[18px] text-indigo-300" />
              </div>
            </div>
            {loading ? (
              <div className="mt-4 h-9 w-40 bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">${nf(stats.todayRevenue)}</p>
            )}
            <p className="mt-1.5 text-sm text-slate-400 tabular-nums">
              ≈ {nf(stats.todayRevenue * USD_TO_UZS)} {latinToCyrillic("so'm")}
            </p>
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-8">
              <div>
                <p className="text-xl font-bold tabular-nums">{loading ? '—' : nf(stats.todaySales)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{latinToCyrillic('Bugungi savdolar')}</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{loading ? '—' : nf(stats.pendingOrders)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{latinToCyrillic('Kutilmoqda')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[120px] animate-pulse" />
              ))
            : kpis.map((k) => {
                const Icon = k.icon;
                return (
                  <div
                    key={k.label}
                    className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                        {latinToCyrillic(k.label)}
                      </p>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${k.tint}`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{k.value}</p>
                    <p className={`mt-1 text-xs flex items-center gap-1 ${k.alert ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                      {k.alert && <AlertTriangle className="w-3 h-3" />}
                      {k.sub}
                    </p>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          {latinToCyrillic('Tezkor amallar')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className="group flex items-center gap-3 bg-white border border-slate-200/70 rounded-2xl p-4 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${action.tint}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 flex-1">{latinToCyrillic(action.label)}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-900">{latinToCyrillic("So'nggi faoliyat")}</h3>
        </div>
        <p className="text-sm text-slate-400 mb-2">{latinToCyrillic('Eng oxirgi savdo va amallar shu yerda chiqadi')}</p>
        <EmptyState
          icon={Clock}
          title={latinToCyrillic("Hozircha faoliyat yo'q")}
          description={latinToCyrillic("Yangi savdo qilganingizda bu yerda ko'rinadi")}
          action={
            <button
              onClick={() => navigate('/cashier/sales/add')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {latinToCyrillic('Yangi savdo')}
            </button>
          }
        />
      </div>
    </div>
  );
}
