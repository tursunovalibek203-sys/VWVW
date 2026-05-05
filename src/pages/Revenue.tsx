import { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Calculator, 
  PieChart, BarChart3, Calendar, Download, Filter,
  ArrowUpRight, ArrowDownRight, Target, Wallet, Receipt,
  Search, Plus, MoreHorizontal, ChevronDown, Printer
} from 'lucide-react';
import api from '../lib/professionalApi';

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

// Revenue data will be loaded from API

export default function Revenue() {
  const [timeRange, setTimeRange] = useState('6months');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcValues, setCalcValues] = useState({ price: '', cost: '', quantity: '' });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [productRevenue, setProductRevenue] = useState<ProductRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRevenueData = async () => {
      try {
        setLoading(true);
        const [revenueRes, productRes] = await Promise.all([
          api.get('/revenue/monthly').catch(() => ({ data: [] })),
          api.get('/revenue/by-product').catch(() => ({ data: [] }))
        ]);
        setRevenueData(revenueRes.data || []);
        setProductRevenue(productRes.data || []);
      } catch (error) {
        console.error('Error loading revenue data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRevenueData();
  }, [timeRange]);

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = revenueData.reduce((sum, d) => sum + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', { 
      style: 'currency', 
      currency: 'UZS',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const calculateProfit = () => {
    const price = parseFloat(calcValues.price) || 0;
    const cost = parseFloat(calcValues.cost) || 0;
    const quantity = parseFloat(calcValues.quantity) || 0;
    return (price - cost) * quantity;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daromad kalkulyatori</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Moliyaviy tahlil va foyda hisoblash</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowCalculator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                Kalkulyator
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                Eksport
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Bu oy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-emerald-600 mt-1">Umumiy daromad</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Bu oy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalExpenses)}</p>
            <p className="text-sm text-rose-600 mt-1">Umumiy xarajat</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Bu oy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalProfit)}</p>
            <p className="text-sm text-blue-600 mt-1">Sof foyda</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Bu oy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{profitMargin.toFixed(1)}%</p>
            <p className="text-sm text-amber-600 mt-1">Foyda marjasi</p>
          </div>
        </div>

        {/* Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Oylik daromad</h3>
              <select
                title="Vaqt oralig'ini tanlash"
                aria-label="Vaqt oralig'ini tanlash"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="6months">So'nggi 6 oy</option>
                <option value="12months">So'nggi 12 oy</option>
                <option value="year">Bu yil</option>
              </select>
            </div>
            <div className="space-y-4">
              {revenueData.map((data, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-gray-600 dark:text-gray-400">{data.month}</span>
                  <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg transition-all duration-500"
                      style={{ width: `${(data.revenue / 70000000) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 text-sm font-medium text-gray-900 dark:text-white text-right">
                    {(data.revenue / 1000000).toFixed(0)} mln
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Mahsulotlar bo'yicha daromad</h3>
            <div className="space-y-4">
              {productRevenue.map((product, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${product.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{product.percentage}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">{(product.revenue / 1000000).toFixed(0)} mln</p>
                    <p className={`text-xs ${product.growth > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {product.growth > 0 ? '+' : ''}{product.growth}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Batafsil moliyaviy hisobot</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Oy</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Daromad</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Xarajat</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sof foyda</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Foyda %</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buyurtmalar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {revenueData.map((data, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{data.month}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">{formatCurrency(data.revenue)}</td>
                    <td className="px-6 py-4 text-right text-rose-600 font-medium">{formatCurrency(data.expenses)}</td>
                    <td className="px-6 py-4 text-right text-blue-600 font-medium">{formatCurrency(data.profit)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                        {((data.profit / data.revenue) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">{data.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Foyda kalkulyatori
              </h2>
              <button 
                onClick={() => setShowCalculator(false)}
                title="Yopish"
                aria-label="Yopish"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sotish narxi (so'm)</label>
                <input
                  type="number"
                  value={calcValues.price}
                  onChange={(e) => setCalcValues({...calcValues, price: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tannarx (so'm)</label>
                <input
                  type="number"
                  value={calcValues.cost}
                  onChange={(e) => setCalcValues({...calcValues, cost: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Miqdori (dona)</label>
                <input
                  type="number"
                  value={calcValues.quantity}
                  onChange={(e) => setCalcValues({...calcValues, quantity: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Sof foyda:</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(calculateProfit())}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
