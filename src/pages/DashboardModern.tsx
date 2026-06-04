import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  RefreshCw,
  Clock,
  Plus,
  UserPlus,
  ClipboardList,
  Receipt,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import DashboardCard from '../components/cards/DashboardCard';
import MainLayout from '../components/layout/MainLayout';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
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

export default function DashboardModern() {
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
  const [exchangeRate, setExchangeRate] = useState(12500); // Default fallback

  useEffect(() => {
    loadDashboardStats();
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    try {
      const { data } = await api.get('/exchange-rates/pair?from=USD&to=UZS');
      if (data?.data?.rate) {
        setExchangeRate(data.data.rate);
      }
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
    }
  };

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

  const quickActions = [
    { id: 'sotuv', icon: Plus, label: 'Yangi savdo', gradient: 'from-emerald-500 to-emerald-600', path: '/cashier/sales/add' },
    { id: 'mijoz', icon: UserPlus, label: 'Mijozlar', gradient: 'from-blue-500 to-blue-600', path: '/cashier/customers' },
    { id: 'buyurtma', icon: ClipboardList, label: 'Buyurtmalar', gradient: 'from-amber-500 to-amber-600', path: '/cashier/orders' },
    { id: 'xarajat', icon: Receipt, label: 'Xarajatlar', gradient: 'from-rose-500 to-rose-600', path: '/cashier/expenses' },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/60 pb-24">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Page header: title + date + refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {latinToCyrillic('Boshqaruv paneli')}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-gray-500">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{currentDate}</span>
              </div>
            </div>
            <button
              onClick={loadDashboardStats}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-gray-700 shadow-sm border border-gray-100 transition-all duration-200 active:scale-95 self-start"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {latinToCyrillic('Yangilash')}
            </button>
          </div>

          {/* Hero metric: today's revenue (most important) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-glass-lg">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{latinToCyrillic('Bugungi daromad')}</p>
                {loading ? (
                  <div className="mt-2 h-10 w-48 bg-white/20 rounded-lg animate-pulse" />
                ) : (
                  <p className="mt-1 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                    ${stats.todayRevenue.toLocaleString()}
                  </p>
                )}
                <p className="mt-2 text-sm text-white/70">
                  ≈ {(stats.todayRevenue * exchangeRate).toLocaleString()} {latinToCyrillic("so'm")}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="relative mt-6 flex items-center gap-6 text-white/90">
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : stats.todaySales}</p>
                <p className="text-xs text-white/70">{latinToCyrillic('Bugungi savdolar')}</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : stats.pendingOrders}</p>
                <p className="text-xs text-white/70">{latinToCyrillic('Kutilayotgan buyurtma')}</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className={`group bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-left`}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold block">{latinToCyrillic(action.label)}</span>
                </button>
              );
            })}
          </div>

          {/* Stats grid */}
          {loading ? (
            <CardSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <DashboardCard
                icon={ShoppingCart}
                title={latinToCyrillic('Bugungi savdolar')}
                mainValue={stats.todaySales}
                subValue={`$${stats.todayRevenue.toLocaleString()}`}
                variant="info"
              />
              <DashboardCard
                icon={Wallet}
                title={latinToCyrillic('Kassa balansi')}
                mainValue={`$${stats.cashboxBalance.toLocaleString()}`}
                subValue={`${(stats.cashboxBalance * exchangeRate).toLocaleString()} ${latinToCyrillic("so'm")}`}
                variant="neutral"
              />
              <DashboardCard
                icon={Package}
                title={latinToCyrillic('Mahsulotlar')}
                mainValue={stats.totalProducts}
                subValue={
                  stats.lowStockProducts > 0
                    ? `${stats.lowStockProducts} ${latinToCyrillic('ta kam qoldi')}`
                    : latinToCyrillic('Hammasi yaxshi')
                }
                variant={stats.lowStockProducts > 0 ? 'warning' : 'success'}
              />
              <DashboardCard
                icon={Users}
                title={latinToCyrillic('Mijozlar')}
                mainValue={stats.totalCustomers}
                subValue={
                  stats.newCustomers > 0
                    ? `+${stats.newCustomers} ${latinToCyrillic('yangi')}`
                    : latinToCyrillic('Jami')
                }
                variant="info"
              />
              <DashboardCard
                icon={ClipboardList}
                title={latinToCyrillic('Kutilayotgan buyurtmalar')}
                mainValue={stats.pendingOrders}
                subValue={latinToCyrillic('ta buyurtma')}
                variant={stats.pendingOrders > 0 ? 'warning' : 'neutral'}
              />
              <DashboardCard
                icon={TrendingUp}
                title={latinToCyrillic('Bugungi daromad')}
                mainValue={`$${stats.todayRevenue.toLocaleString()}`}
                subValue={latinToCyrillic('USD')}
                variant="success"
              />
            </div>
          )}

          {/* Recent activity (honest empty state until a feed is wired) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-1">{latinToCyrillic("So'nggi faoliyat")}</h3>
            <p className="text-sm text-gray-500 mb-4">{latinToCyrillic('Eng oxirgi savdo va amallar shu yerda chiqadi')}</p>
            <EmptyState
              icon={Clock}
              title={latinToCyrillic("Hozircha faoliyat yo'q")}
              description={latinToCyrillic("Yangi savdo qilganingizda bu yerda ko'rinadi")}
              action={
                <button
                  onClick={() => navigate('/cashier/sales/add')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  {latinToCyrillic('Yangi savdo')}
                </button>
              }
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
