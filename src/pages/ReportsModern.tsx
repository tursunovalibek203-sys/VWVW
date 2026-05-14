import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart,
  Plus,
  Eye,
  Printer,
  RefreshCw
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import ModernLayout from '../components/ModernLayout';
import api from '../lib/professionalApi';

interface Report {
  id: string;
  name: string;
  type: 'sales' | 'inventory' | 'customers' | 'financial';
  date: string;
  status: 'generated' | 'pending' | 'failed';
  size: number;
  generatedBy: string;
}

export default function ReportsModern() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const types = ['all', 'sales', 'inventory', 'customers', 'financial'];
  const statuses = ['all', 'generated', 'pending', 'failed'];

  // Hisobotlarni API dan yuklash
  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Haqiqiy API dan ma'lumotlarni olish
      const [salesRes, inventoryRes, customersRes, financialRes] = await Promise.all([
        api.get('/reports/sales').catch(() => ({ data: [] })),
        api.get('/reports/inventory').catch(() => ({ data: [] })),
        api.get('/reports/customer-analysis').catch(() => ({ data: [] })),
        api.get('/reports/profit-loss').catch(() => ({ data: null }))
      ]);
      
      // Hisobotlar ro'yxatini yaratish
      const generatedReports: Report[] = [
        {
          id: 'sales-' + Date.now(),
          name: 'Sotuvlar Hisoboti',
          type: 'sales',
          date: new Date().toISOString().split('T')[0],
          status: 'generated',
          size: JSON.stringify(salesRes.data).length,
          generatedBy: 'System'
        },
        {
          id: 'inventory-' + Date.now(),
          name: 'Ombor Hisoboti',
          type: 'inventory',
          date: new Date().toISOString().split('T')[0],
          status: 'generated',
          size: JSON.stringify(inventoryRes.data).length,
          generatedBy: 'System'
        },
        {
          id: 'customers-' + Date.now(),
          name: 'Mijozlar Hisoboti',
          type: 'customers',
          date: new Date().toISOString().split('T')[0],
          status: 'generated',
          size: JSON.stringify(customersRes.data).length,
          generatedBy: 'System'
        }
      ];
      
      if (financialRes.data) {
        generatedReports.push({
          id: 'financial-' + Date.now(),
          name: 'Moliyaviy Hisobot',
          type: 'financial',
          date: new Date().toISOString().split('T')[0],
          status: 'generated',
          size: JSON.stringify(financialRes.data).length,
          generatedBy: 'System'
        });
      }
      
      setReports(generatedReports);
      
    } catch (error) {
      console.error('Error loading reports:', error);
      // Xatolik yuz bersa, bo'sh ro'yxat ko'rsatish
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    let filtered = reports;
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(report => report.type === selectedType);
    }
    
    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(report => report.status === selectedStatus);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.generatedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredReports(filtered);
  }, [reports, selectedType, selectedStatus, searchTerm]);

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'sales': return 'badge-blue';
      case 'inventory': return 'badge-success';
      case 'customers': return 'badge-warning';
      case 'financial': return 'badge-purple';
      default: return 'badge-gray';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'generated': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'failed': return 'badge-danger';
      default: return 'badge-gray';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'sales': return latinToCyrillic('Sotuv');
      case 'inventory': return latinToCyrillic('Ombor');
      case 'customers': return latinToCyrillic('Mijozlar');
      case 'financial': return latinToCyrillic('Moliya');
      default: return type;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generated': return latinToCyrillic('Yaratilgan');
      case 'pending': return latinToCyrillic('Kutilmoqda');
      case 'failed': return latinToCyrillic('Xatolik');
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const f = (bytes / Math.pow(k, i)).toFixed(2);
    return `${parseFloat(f)} ${sizes[i]}`;
  };

  return (
    <ModernLayout 
      title={latinToCyrillic("Hisobotlar")}
      subtitle={`${filteredReports.length} ${latinToCyrillic("ta hisobot")}`}
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                id="reports-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={latinToCyrillic("Ò²Ð¸ÑÐ±Ð¾Ñ‚Ð»Ð°Ñ€Ð½Ð¸ Ò›Ð¸Ð´Ð¸Ñ€Ð¸Ñˆ...")}
                className="input-modern w-full pl-12"
              />
            </div>
            
            {/* Type Filter */}
            <div className="relative">
              <label htmlFor="reports-type-filter" className="sr-only">Type Filter</label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Filter className="w-5 h-5" />
              </div>
              <select
                id="reports-type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="input-modern pl-12 appearance-none cursor-pointer"
              >
                {types.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? latinToCyrillic("Ð‘Ð°Ñ€Ñ‡Ð°ÑÐ¸") : getTypeText(type)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <label htmlFor="reports-status-filter" className="sr-only">Status Filter</label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Filter className="w-5 h-5" />
              </div>
              <select
                id="reports-status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-modern pl-12 appearance-none cursor-pointer"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? latinToCyrillic("Ð‘Ð°Ñ€Ñ‡Ð°ÑÐ¸") : getStatusText(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadReports}
              disabled={loading}
              className="btn-gradient-secondary px-4 py-3 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
              {latinToCyrillic("Ð¯Ð½Ð³Ð¸Ð»Ð°Ñˆ")}
            </button>
            
            {/* Generate Report Button */}
            <button
              type="button"
              onClick={loadReports}
              disabled={loading}
              className="btn-gradient-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              {latinToCyrillic("Ð¯Ð½Ð³Ð¸ Ò²Ð¸ÑÐ±Ð¾Ñ‚")}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Ð–Ð°Ð¼Ð¸ Ò²Ð¸ÑÐ±Ð¾Ñ‚Ð»Ð°Ñ€")}</p>
                <p className="text-2xl font-bold text-primary">{reports.length}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Ð¯Ñ€Ð°Ñ‚Ð¸Ð»Ð³Ð°Ð½")}</p>
                <p className="text-2xl font-bold text-primary">
                  {reports.filter(r => r.status === 'generated').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("ÐšÑƒÑ‚Ð¼Ð¾Ò›Ð´Ð°")}</p>
                <p className="text-2xl font-bold text-primary">
                  {reports.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Ð¥Ð°Ñ‚Ð¾Ð»Ð¸Ðº")}</p>
                <p className="text-2xl font-bold text-primary">
                  {reports.filter(r => r.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass-card-light p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16">
                <div className="animate-pulse rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
              <p className="text-lg font-semibold text-primary mb-4">{latinToCyrillic("Yuklanmoqda...")}</p>
            </div>
          </div>
        )}

        {/* Reports Table */}
        {!loading && (
          <div className="glass-card-light p-6">
            <div className="overflow-x-auto">
              <table className="table-modern w-full">
                <thead>
                  <tr>
                    <th className="table-header">{latinToCyrillic("Nomi")}</th>
                    <th className="table-header">{latinToCyrillic("Turi")}</th>
                    <th className="table-header">{latinToCyrillic("Sana")}</th>
                    <th className="table-header">{latinToCyrillic("Holat")}</th>
                    <th className="table-header">{latinToCyrillic("Hajmi")}</th>
                    <th className="table-header">{latinToCyrillic("Yaratdi")}</th>
                    <th className="table-header">{latinToCyrillic("Amallar")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-secondary" />
                          <span className="font-medium">{report.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs ${getTypeBadgeColor(report.type)}`}>
                          {getTypeText(report.type)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-secondary" />
                          <span>{report.date}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs ${getStatusBadgeColor(report.status)}`}>
                          {getStatusText(report.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm">{formatFileSize(report.size)}</span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm">{report.generatedBy}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => alert(`${report.name}\n${latinToCyrillic('Turi')}: ${getTypeText(report.type)}\n${latinToCyrillic('Sana')}: ${report.date}\n${latinToCyrillic('Hajmi')}: ${formatFileSize(report.size)}`)}
                            className="btn-gradient-secondary p-1"
                            aria-label="Hisobotni ko'rish"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => alert(latinToCyrillic('Yuklab olish funksiyasi tez orada qo\'shiladi!'))}
                            className="btn-gradient-primary p-1"
                            aria-label="Hisobotni yuklab olish"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="btn-gradient-secondary p-1"
                            aria-label="Chop etish"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredReports.length === 0 && (
          <div className="glass-card-light p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                {latinToCyrillic("Ò²Ð¸ÑÐ±Ð¾Ñ‚Ð»Ð°Ñ€ Ñ‚Ð¾Ð¿Ð¸Ð»Ð¼Ð°Ð´Ð¸")}
              </h3>
              <p className="text-secondary">
                {latinToCyrillic("ÒšÐ¸Ð´Ð¸Ñ€Ð¸Ñˆ ÑˆÐ°Ñ€Ñ‚Ð»Ð°Ñ€Ð¸Ð½Ð¸ ÑžÐ·Ð³Ð°Ñ€Ñ‚Ð¸Ñ€Ð¸Ð± Ò›Ð°Ð¹Ñ‚Ð° ÑƒÑ€Ð¸Ð½Ð¸Ð± ÐºÑžÑ€Ð¸Ð½Ð³")}
              </p>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
