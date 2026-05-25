import { useState, useEffect } from 'react';
import {
  Activity, Clock, User, FileText, ShoppingCart, Package,
  DollarSign, AlertTriangle, CheckCircle, XCircle,
  Search, Download, Monitor, Users, Zap, RefreshCw, X, Eye, Filter,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

const L = latinToCyrillic;

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
  tint: string;
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

const TYPE_LABEL: Record<ActivityLog['type'], string> = {
  sale: 'Sotuv',
  product: 'Mahsulot',
  user: 'Foydalanuvchi',
  system: 'Tizim',
  expense: 'Xarajat',
};

const STATUS_LABEL: Record<ActivityLog['status'], string> = {
  success: 'Muvaffaqiyatli',
  error: 'Xatolik',
  warning: 'Ogohlantirish',
};

export default function ActivityMonitor() {
  const { addToast } = useToast();
  const [activities] = useState<ActivityLog[]>(mockActivities);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  // Simulate initial load so skeletons get a chance to render (no real API here)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const metrics: SystemMetric[] = [
    { label: 'Faol foydalanuvchilar', value: '24', change: '+12%', icon: <Users className="w-[18px] h-[18px]" />, tint: 'bg-sky-50 text-sky-600' },
    { label: 'Jami harakatlar', value: '1,847', change: '+8%', icon: <Activity className="w-[18px] h-[18px]" />, tint: 'bg-indigo-50 text-indigo-600' },
    { label: 'Tizim yuklanishi', value: '42%', change: '-5%', icon: <Zap className="w-[18px] h-[18px]" />, tint: 'bg-amber-50 text-amber-600' },
    { label: 'Oxirgi zaxira', value: '2 soat', change: 'Yaxshi', icon: <CheckCircle className="w-[18px] h-[18px]" />, tint: 'bg-emerald-50 text-emerald-600' },
  ];

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => {
      setRefreshing(false);
      setLoading(false);
      addToast({ type: 'success', title: L('Yangilandi'), message: L('Faoliyat jurnali yangilandi') });
    }, 600);
  };

  const handleExport = () => {
    addToast({ type: 'info', title: L('Eksport'), message: L('Eksport funksiyasi tez orada qo\'shiladi') });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
  };

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
      case 'sale': return 'bg-emerald-50 text-emerald-600';
      case 'product': return 'bg-sky-50 text-sky-600';
      case 'user': return 'bg-violet-50 text-violet-600';
      case 'system': return 'bg-slate-100 text-slate-600';
      case 'expense': return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'error' | 'warning' | 'neutral' => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'neutral';
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

  const hasActiveFilters = searchTerm !== '' || filterType !== 'all' || filterStatus !== 'all';

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {L('Faoliyat monitoringi')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? L('Yuklanmoqda...')
                : `${filteredActivities.length} ${L('ta harakat')}`}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{L('Yangilash')}</span>
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{L('Eksport')}</span>
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[116px] animate-pulse" />
              ))
            : metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                      {L(metric.label)}
                    </p>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${metric.tint}`}>
                      {metric.icon}
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{metric.value}</p>
                  <p className={`mt-1 text-xs font-medium ${metric.change.startsWith('+') ? 'text-emerald-600' : metric.change.startsWith('-') ? 'text-rose-600' : 'text-slate-400'}`}>
                    {L(metric.change)}
                  </p>
                </div>
              ))}
        </div>

        {/* Filters bar */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={L('Qidirish (foydalanuvchi, harakat, obyekt)')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex gap-3">
              {/* Type Filter */}
              <div className="relative">
                <label htmlFor="activity-type-filter" className="sr-only">{L('Turi bo\'yicha filter')}</label>
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="activity-type-filter"
                  title={L('Turi bo\'yicha filter')}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option value="all">{L('Barcha turlar')}</option>
                  <option value="sale">{L('Sotuv')}</option>
                  <option value="product">{L('Mahsulot')}</option>
                  <option value="user">{L('Foydalanuvchi')}</option>
                  <option value="system">{L('Tizim')}</option>
                  <option value="expense">{L('Xarajat')}</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <label htmlFor="activity-status-filter" className="sr-only">{L('Status bo\'yicha filter')}</label>
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="activity-status-filter"
                  title={L('Status bo\'yicha filter')}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option value="all">{L('Barcha statuslar')}</option>
                  <option value="success">{L('Muvaffaqiyatli')}</option>
                  <option value="error">{L('Xatolik')}</option>
                  <option value="warning">{L('Ogohlantirish')}</option>
                </select>
              </div>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 tabular-nums">
                {filteredActivities.length} {L('ta natija topildi')}
              </p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                {L('Filterlarni tozalash')}
              </button>
            </div>
          )}
        </div>

        {/* Activity feed */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70">
            <EmptyState
              icon={Activity}
              title={L('Faoliyat topilmadi')}
              description={
                hasActiveFilters
                  ? L('Qidiruv yoki filterlarga mos faoliyat yo\'q. Filterlarni o\'zgartirib ko\'ring')
                  : L('Hozircha hech qanday faoliyat qayd etilmagan')
              }
              action={
                hasActiveFilters ? (
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                  >
                    <X className="w-4 h-4" />
                    {L('Filterlarni tozalash')}
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200/70 bg-slate-50/60">
                      <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{L('Vaqt')}</th>
                      <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{L('Foydalanuvchi')}</th>
                      <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{L('Harakat')}</th>
                      <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{L('Turi')}</th>
                      <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{L('Status')}</th>
                      <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{L('Amal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-slate-600 tabular-nums">
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{activity.timestamp}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {activity.user.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{activity.user}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{activity.target}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getTypeColor(activity.type)}`}>
                            {getTypeIcon(activity.type)}
                            {L(TYPE_LABEL[activity.type])}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={getStatusBadgeVariant(activity.status)}>
                            {L(STATUS_LABEL[activity.status])}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedActivity(activity)}
                            title={L('Ko\'rish')}
                            aria-label={L('Batafsil ko\'rish')}
                            className="inline-flex p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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

            {/* Mobile: timeline card list */}
            <div className="lg:hidden space-y-3">
              {filteredActivities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200/70 p-4 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(activity.type)}`}>
                      {getTypeIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{activity.action}</p>
                        <Badge variant={getStatusBadgeVariant(activity.status)}>
                          {L(STATUS_LABEL[activity.status])}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.target}</p>
                      <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {activity.user}
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {activity.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedActivity && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)] border border-slate-200/70"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{L('Harakat tafsilotlari')}</h2>
              <button
                onClick={() => setSelectedActivity(null)}
                title={L('Yopish')}
                aria-label={L('Yopish')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeColor(selectedActivity.type)}`}>
                    {getTypeIcon(selectedActivity.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{selectedActivity.action}</p>
                    <p className="text-sm text-slate-400 truncate">{selectedActivity.target}</p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(selectedActivity.status)}>
                  {L(STATUS_LABEL[selectedActivity.status])}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{L('Foydalanuvchi')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedActivity.user}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{L('Vaqt')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{selectedActivity.timestamp}</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">{L('Status')}</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedActivity.status)}
                  <span className="text-sm font-semibold text-slate-900">{L(STATUS_LABEL[selectedActivity.status])}</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">{L('Tafsilotlar')}</p>
                <p className="text-sm text-slate-700">{selectedActivity.details}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
