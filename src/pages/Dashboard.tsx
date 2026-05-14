import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  Wallet, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  User,
  Bell
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import DashboardCard from '../components/cards/DashboardCard';
import MainLayout from '../components/layout/MainLayout';
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

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Simulated data - replace with actual API calls
      setStats({
        todaySales: 12,
        todayRevenue: 8540,
        totalProducts: 156,
        lowStockProducts: 3,
        totalCustomers: 248,
        newCustomers: 5,
        cashboxBalance: 12500,
        pendingOrders: 8,
      });
    } catch (error) {
      console.error('Dashboard stats loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const quickActions = [
    { id: 'sotuv', icon: ShoppingCart, label: 'Ð¯Ð½Ð³Ð¸ ÑÐ¾Ñ‚ÑƒÐ²', color: 'bg-emerald-500', path: '/cashier/sales/new' },
    { id: 'mijoz', icon: Users, label: 'Ð¯Ð½Ð³Ð¸ mijoz', color: 'bg-blue-500', path: '/cashier/customers/new' },
    { id: 'buyurtma', icon: Package, label: 'Ð¯Ð½Ð³Ð¸ buyurtma', color: 'bg-amber-500', path: '/cashier/orders/new' },
    { id: 'xarajat', icon: Wallet, label: 'Xarajat', color: 'bg-rose-500', path: '/cashier/expenses' },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 pb-24">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-100">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-white font-bold text-lg">LP</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-blue-700 uppercase tracking-wide">
                    LUX PET PLAST
                  </h1>
                  <p className="text-xs text-gray-500 uppercase">
                    {latinToCyrillic('BUXORO VILOYATI VOBKENT TUMAN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={latinToCyrillic('Ð‘ildirishÐ½Ð¾Ð¼Ð°Ð»Ð°Ñ€')}
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{latinToCyrillic('Kassir')}</span>
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Date and Refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{currentDate}</span>
            </div>
            <button
              onClick={loadDashboardStats}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
              {latinToCyrillic('Ð¯Ð½Ð³Ð¸Ð»Ð°Ñˆ')}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className={`${action.color} text-white rounded-xl p-4 shadow-lg shadow-gray-200 hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <span className="text-xs font-medium block">{latinToCyrillic(action.label)}</span>
                </button>
              );
            })}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <DashboardCard
              icon={ShoppingCart}
              title={latinToCyrillic('Ð‘ÑƒÐ³ÑƒÐ½Ð³Ð¸ ÑÐ°Ð²Ð´Ð¾Ð»Ð°Ñ€')}
              mainValue={stats.todaySales}
              subValue={`$${stats.todayRevenue.toLocaleString()}`}
              variant="info"
            />
            <DashboardCard
              icon={TrendingUp}
              title={latinToCyrillic('Ð”Ð°Ñ€Ð¾Ð¼Ð°Ð´')}
              mainValue={`$${stats.todayRevenue.toLocaleString()}`}
              subValue={
                <span className="flex items-center gap-1 text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" />
                  +12%
                </span>
              }
              variant="success"
            />
            <DashboardCard
              icon={Package}
              title={latinToCyrillic('ÐœÐ°Ò³ÑÑƒÐ»Ð¾Ñ‚Ð»Ð°Ñ€')}
              mainValue={stats.totalProducts}
              subValue={
                stats.lowStockProducts > 0 ? (
                  <span className="text-rose-600">
                    {stats.lowStockProducts} {latinToCyrillic('Ñ‚Ð° ÐºÐ°Ð¼ Ò›Ð¾Ð»Ð´Ð¸')}
                  </span>
                ) : (
                  latinToCyrillic('Ò²Ð°Ð¼Ð¼Ð°ÑÐ¸ ÑÑ…ÑˆÐ¸')
                )
              }
              variant={stats.lowStockProducts > 0 ? 'warning' : 'success'}
            />
            <DashboardCard
              icon={Users}
              title={latinToCyrillic('ÐœÐ¸Ð¶Ð¾Ð·Ð»Ð°Ñ€')}
              mainValue={stats.totalCustomers}
              subValue={
                <span className="text-emerald-600">
                  +{stats.newCustomers} {latinToCyrillic('ÑÒ£Ð¸')}
                </span>
              }
              variant="info"
            />
            <DashboardCard
              icon={Wallet}
              title={latinToCyrillic('ÐšÐ°ÑÑÐ° Ð±Ð°Ð»Ð°Ð½Ñ')}
              mainValue={`$${stats.cashboxBalance.toLocaleString()}`}
              subValue={`${(stats.cashboxBalance * 12500).toLocaleString()} ÑÑƒÐ¼`}
              variant="neutral"
            />
            <DashboardCard
              icon={Package}
              title={latinToCyrillic('ÐšÑƒÑ‚Ð¸Ð»Ð°Ñ‘Ñ‚Ð³Ð°Ð½ Ð±ÑƒÑŽÑ€Ñ‚Ð¼Ð°Ð»Ð°Ñ€')}
              mainValue={stats.pendingOrders}
              subValue={latinToCyrillic('Ñ‚Ð° Ð±ÑƒÑŽÑ€Ñ‚Ð¼Ð°')}
              variant="warning"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-4">
              {latinToCyrillic('Ð¡ÑžÐ½Ð³Ð¸ Ñ„Ð°Ð¾Ð»Ð¸ÑÑ‚')}
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {latinToCyrillic('Ð¡Ð¾Ñ‚ÑƒÐ² â„–')}{1000 + i}
                    </p>
                    <p className="text-xs text-gray-500">
                      {latinToCyrillic('Ever-Mac Caldo')} â€¢ 2 {latinToCyrillic('Ñ‚Ð° Ð¼Ð°Ò³ÑÑƒÐ»Ð¾Ñ‚')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">$640.00</p>
                    <p className="text-xs text-gray-500">2 {latinToCyrillic('ÑÐ¾Ð°Ñ‚ Ð¾Ð»Ð´Ð¸Ð½')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
