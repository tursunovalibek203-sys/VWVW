import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Target,
  Activity,
  ShoppingCart
} from 'lucide-react';
// Note: Charts removed until real data API is available
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import ModernLayout from '../components/ModernLayout';

interface DashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  monthlyOrders: number;
  totalCustomers: number;
  totalProducts: number;
  netProfit: number;
  growth: number;
}

export default function DashboardModern() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Real API call
        const response = await api.get('/dashboard/stats');
        const data = response.data;
        
        if (data) {
          setStats({
            totalRevenue: data.totalRevenue || 0,
            monthlyRevenue: data.monthlyRevenue || 0,
            totalOrders: data.totalOrders || 0,
            monthlyOrders: data.monthlyOrders || 0,
            totalCustomers: data.totalCustomers || 0,
            totalProducts: data.totalProducts || 0,
            netProfit: data.netProfit || 0,
            growth: data.growth || 0
          });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="modern-bg page-container">
        <div className="content-wrapper">
          <div className="glass-card p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16">
                <div className="animate-pulse rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
              <p className="mt-6 text-lg font-semibold text-primary">{latinToCyrillic("Yuklanmoqda...")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="modern-bg page-container">
        <div className="content-wrapper">
          <div className="glass-card p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-lg text-primary mb-4">{latinToCyrillic("Xatolik yuz berdi")}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="btn-gradient-primary px-6 py-3"
              >
                {latinToCyrillic("Qayta urinish")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Note: Chart data should be fetched from API endpoint
  // For now, charts are hidden until real data is available

  return (
    <ModernLayout 
      title={latinToCyrillic("Ð‘Ð¾ÑˆÒ›Ð°Ñ€ÑƒÐ² ÐŸÐ°Ð½ÐµÐ»Ð¸")}
      subtitle={new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
    >
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card-light p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Ð–Ð°Ð¼Ð¸ Ð”Ð°Ñ€Ð¾Ð¼Ð°Ð´")}</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.totalRevenue.toLocaleString()} UZS
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">+{stats.growth}%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card-light p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("ÐžÐ¹Ð»Ð¸Ðº Ð”Ð°Ñ€Ð¾Ð¼Ð°Ð´")}</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.monthlyRevenue.toLocaleString()} UZS
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-500">+8.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card-light p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Ð–Ð°Ð¼Ð¸ Ð‘ÑƒÑŽÑ€Ñ‚Ð¼Ð°Ð»Ð°Ñ€")}</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.totalOrders.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ShoppingCart className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-purple-500">+{stats.monthlyOrders}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card-light p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("ÐœÐ¸Ð¶Ð¾Ð·Ð»Ð°Ñ€")}</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.totalCustomers.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-orange-500">+12</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </ModernLayout>
  );
}
