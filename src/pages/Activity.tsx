import { useState, useEffect } from 'react';
import { 
  Activity, Clock, User, FileText, ShoppingCart, Package, 
  DollarSign, AlertTriangle, CheckCircle, XCircle, Filter,
  Search, Download, Calendar, ChevronDown, MoreHorizontal, Eye,
  Monitor, BarChart3, TrendingUp, Users, Zap
} from 'lucide-react';

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'sale' | 'product' | 'user' | 'system' | 'expense';
  status: 'success' | 'error' | 'warning';
  details: string;
}

interface SystemMetric {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

const mockActivities: ActivityLog[] = [
  { id: '1', user: 'A. Karimov', action: 'Sotuv yaratdi', target: 'S-2024-001', timestamp: '2024-01-15 14:30:22', type: 'sale', status: 'success', details: '125,000 so\'m' },
  { id: '2', user: 'S. Rakhimov', action: 'Mahsulot qo\'shdi', target: 'Plastik konteyner 5L', timestamp: '2024-01-15 13:45:10', type: 'product', status: 'success', details: '50 dona' },
  { id: '3', user: 'System', action: 'Avto zaxiralash', target: 'Backup #245', timestamp: '2024-01-15 12:00:00', type: 'system', status: 'success', details: 'Muvaffaqiyatli' },
  { id: '4', user: 'M. Tursunov', action: 'Xarajat kiritdi', target: 'Elektr energiyasi', timestamp: '2024-01-15 11:20:15', type: 'expense', status: 'success', details: '2,450,000 so\'m' },
  { id: '5', user: 'J. Aliev', action: 'Kirishga urindi', target: 'Admin panel', timestamp: '2024-01-15 10:15:30', type: 'user', status: 'error', details: 'Parol noto\'g\'ri' },
  { id: '6', user: 'A. Karimov', action: 'Sotuv bekor qildi', target: 'S-2024-089', timestamp: '2024-01-15 09:45:00', type: 'sale', status: 'warning', details: 'Mijoz so\'rovi' },
  { id: '7', user: 'System', action: 'Sinxronizatsiya', target: 'Cloud server', timestamp: '2024-01-15 08:30:00', type: 'system', status: 'success', details: '15MB' },
  { id: '8', user: 'S. Rakhimov', action: 'Ombor yangiladi', target: 'B-003', timestamp: '2024-01-15 08:15:45', type: 'product', status: 'success', details: '-25 dona' },
];

export default function ActivityMonitor() {
  const [activities, setActivities] = useState<ActivityLog[]>(mockActivities);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  const metrics: SystemMetric[] = [
    { label: 'Faol foydalanuvchilar', value: '24', change: '+12%', icon: <Users className="w-5 h-5" />, color: 'text-blue-600' },
    { label: 'Jami harakatlar', value: '1,847', change: '+8%', icon: <Activity className="w-5 h-5" />, color: 'text-emerald-600' },
    { label: 'Tizim yuklanishi', value: '42%', change: '-5%', icon: <Zap className="w-5 h-5" />, color: 'text-amber-600' },
    { label: 'Oxirgi zaxira', value: '2 soat', change: 'Yaxshi', icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600' },
  ];

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ShoppingCart className="w-4 h-4" />;
      case 'product': return <Package className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'system': return <Monitor className="w-4 h-4" />;
      case 'expense': return <DollarSign className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-emerald-100 text-emerald-700';
      case 'product': return 'bg-blue-100 text-blue-700';
      case 'user': return 'bg-purple-100 text-purple-700';
      case 'system': return 'bg-gray-100 text-gray-700';
      case 'expense': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faoliyat monitoringi</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tizim faoliyati va audit jurnali</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                Eksport
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.color} bg-opacity-10`}>
                  {metric.icon}
                </div>
                <span className={`text-xs ${metric.change.startsWith('+') ? 'text-emerald-600' : metric.change.startsWith('-') ? 'text-rose-600' : 'text-blue-600'}`}>
                  {metric.change}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
              <p className={`text-sm ${metric.color} mt-1`}>{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Qidirish (foydalanuvchi, harakat, obyekt)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                title="Turi bo'yicha filter"
                aria-label="Turi bo'yicha filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Barcha turlar</option>
                <option value="sale">Sotuv</option>
                <option value="product">Mahsulot</option>
                <option value="user">Foydalanuvchi</option>
                <option value="system">Tizim</option>
                <option value="expense">Xarajat</option>
              </select>
              <select
                title="Status bo'yicha filter"
                aria-label="Status bo'yicha filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Barcha statuslar</option>
                <option value="success">Muvaffaqiyatli</option>
                <option value="error">Xatolik</option>
                <option value="warning">Ogohlantirish</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vaqt</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Foydalanuvchi</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Harakat</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Obyekt</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Turi</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tafsilot</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{activity.timestamp}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{activity.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{activity.action}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">{activity.target}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg ${getTypeColor(activity.type)}`}>
                        {getTypeIcon(activity.type)}
                        {activity.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(activity.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{activity.details}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedActivity(activity)}
                        title="Ko'rish"
                        aria-label="Batafsil ko'rish"
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Harakat tafsilotlari</h2>
              <button 
                onClick={() => setSelectedActivity(null)}
                title="Yopish"
                aria-label="Yopish"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(selectedActivity.type)}`}>
                  {getTypeIcon(selectedActivity.type)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedActivity.action}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedActivity.target}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Foydalanuvchi</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedActivity.user}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vaqt</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedActivity.timestamp}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedActivity.status)}
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedActivity.status}</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tafsilotlar</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedActivity.details}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
