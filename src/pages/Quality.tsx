import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, AlertTriangle, FileText, 
  Search, Filter, Plus, Download, ChevronDown, MoreHorizontal,
  Shield, Award, TrendingUp, BarChart3, Calendar, Clock,
  User, Package, Settings, Eye, Edit2, Trash2, Printer
} from 'lucide-react';
import api from '../lib/professionalApi';

interface QualityCheck {
  id: string;
  productName: string;
  batchNumber: string;
  inspector: string;
  checkDate: string;
  status: 'passed' | 'failed' | 'pending';
  defects: number;
  notes: string;
  category: string;
}

interface QualityMetric {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}

// Quality checks will be loaded from API

export default function Quality() {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);

  // Load quality checks from API
  useEffect(() => {
    const loadQualityChecks = async () => {
      try {
        setLoading(true);
        const response = await api.get('/quality-checks');
        const data = response.data || [];
        // Map API data to QualityCheck interface
        const mappedChecks: QualityCheck[] = data.map((item: any) => ({
          id: item.id,
          productName: item.product?.name || item.productName || 'Noma\'lum',
          batchNumber: item.batchNumber || item.productionOrder?.batchNumber || '-',
          inspector: item.inspector?.name || item.inspectorName || '-',
          checkDate: item.checkDate || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: item.status?.toLowerCase() || 'pending',
          defects: item.defects || item.defectCount || 0,
          notes: item.notes || item.comments || '-',
          category: item.category || item.product?.category || 'Umumiy'
        }));
        setChecks(mappedChecks);
      } catch (error) {
        console.error('Error loading quality checks:', error);
        setChecks([]);
      } finally {
        setLoading(false);
      }
    };

    loadQualityChecks();
  }, []);

  const metrics: QualityMetric[] = [
    { label: 'Muvaffaqiyatli', value: 156, total: 180, color: 'text-emerald-600', icon: <CheckCircle className="w-5 h-5" /> },
    { label: 'Brak', value: 12, total: 180, color: 'text-rose-600', icon: <XCircle className="w-5 h-5" /> },
    { label: 'Kutilmoqda', value: 8, total: 180, color: 'text-amber-600', icon: <Clock className="w-5 h-5" /> },
    { label: 'Sifat ko\'rsatkichi', value: 94, total: 100, color: 'text-blue-600', icon: <Award className="w-5 h-5" /> },
  ];

  const filteredChecks = checks.filter(check => {
    const matchesSearch = check.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         check.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         check.inspector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || check.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'failed': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed': return 'Muvaffaqiyatli';
      case 'failed': return 'Brak';
      case 'pending': return 'Kutilmoqda';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sifat nazorati</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mahsulot sifati va standartlarni nazorat qilish</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Yangi tekshiruv
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.color} bg-opacity-10`}>
                  {metric.icon}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Bu oy</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metric.value}</span>
                {metric.total > 100 ? (
                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">/ {metric.total}</span>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">%</span>
                )}
              </div>
              <p className={`text-sm ${metric.color} mt-2`}>{metric.label}</p>
              <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${metric.color.replace('text-', 'bg-')}`}
                  style={{ width: `${(metric.value / metric.total) * 100}%` }}
                />
              </div>
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
                placeholder="Qidirish (mahsulot, partiya, inspektor)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                title="Status filter"
                aria-label="Status bo'yicha filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Barcha statuslar</option>
                <option value="passed">Muvaffaqiyatli</option>
                <option value="failed">Brak</option>
                <option value="pending">Kutilmoqda</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partiya</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mahsulot</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategoriya</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inspektor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sana</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nuqsonlar</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredChecks.map((check) => (
                  <tr key={check.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{check.batchNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{check.productName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{check.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{check.inspector}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{check.checkDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(check.status)}`}>
                        {getStatusText(check.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${check.defects > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {check.defects}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedCheck(check)}
                          title="Ko'rish"
                          aria-label="Ko'rish"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => alert(`Tahrirlash: ${check.id}\nBu funksiya tez orada qo'shiladi!`)}
                          title="Tahrirlash"
                          aria-label="Tahrirlash"
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (!confirm('Rostdan ham o\'chirmoqchimisiz?')) return;
                            try {
                              await api.delete(`/quality-checks/${check.id}`);
                              setChecks(checks.filter(c => c.id !== check.id));
                              alert('Muvaffaqiyatli o\'chirildi!');
                            } catch (error) {
                              console.error('Error deleting:', error);
                              alert('O\'chirishda xatolik!');
                            }
                          }}
                          title="O'chirish"
                          aria-label="O'chirish"
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCheck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tekshiruv tafsilotlari</h2>
              <button 
                onClick={() => setSelectedCheck(null)}
                title="Yopish"
                aria-label="Yopish"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCheck.productName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCheck.batchNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inspektor</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCheck.inspector}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sana</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCheck.checkDate}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Status</p>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedCheck.status)}`}>
                  {getStatusText(selectedCheck.status)}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Nuqsonlar soni</p>
                <p className={`text-lg font-bold ${selectedCheck.defects > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {selectedCheck.defects} dona
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Izohlar</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedCheck.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
