import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  User,
  Eye,
  Plus,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import api from '../lib/professionalApi';
import { extractPaginatedData } from '../lib/apiHelpers';
import ModernLayout from '../components/ModernLayout';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { useToast, toast } from '../components/ui/Toast';

interface Sale {
  id: string;
  date: string;
  customerName: string;
  totalAmount: number;
  paymentType: string;
  status: 'completed' | 'pending' | 'cancelled';
  items: number;
  cashier: string;
}

export default function SalesModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const statuses = ['all', 'completed', 'pending', 'cancelled'];
  const periods = ['all', 'today', 'week', 'month', 'year'];

  const loadSales = async (pageNum = 1) => {
    setLoading(true);
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
      console.warn('Loading timeout reached for sales');
    }, 10000); // 10 second timeout
    
    try {
      const response = await api.get(`/sales?limit=${pageSize}&page=${pageNum}`);
      clearTimeout(timeout);
      
      // Handle standardized API response format
      const { data: salesData, pagination } = extractPaginatedData<any>(
        response,
        'sales',
        []
      );
      
      const mappedSales: Sale[] = salesData.map((s: any) => ({
        id: s.id,
        date: s.createdAt || s.date || new Date().toISOString().split('T')[0],
        customerName: s.manualCustomerName || s.customer?.name || s.customerName || 'Noma\'lum',
        totalAmount: s.totalAmount || s.amount || 0,
        paymentType: s.paymentMethod || s.paymentType || 'cash',
        status: s.paymentStatus?.toLowerCase() || 'completed',
        items: s.itemCount || s.items?.length || 0,
        cashier: s.user?.name || s.cashier?.name || s.cashierName || 'Admin'
      }));
      
      setSales(mappedSales);
      setTotalPages(pagination?.totalPages || 1);
      setTotal(pagination?.total || 0);
      
    } catch (error) {
      clearTimeout(timeout);
      console.error('Sotuvlarni yuklashda xatolik:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Sotuvlarni yuklashda xatolik yuz berdi')));
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sahifa pathname o'zgarganda sotuvlarni yangilash
  useEffect(() => {
    loadSales(1);
    setPage(1);
  }, [location.pathname]);

  // Page o'zgarganda sotuvlarni yangilash
  useEffect(() => {
    if (page > 1) {
      loadSales(page);
    }
  }, [page]);

  // Page size o'zgarganda sotuvlarni yangilash
  useEffect(() => {
    setPage(1);
    loadSales(1);
  }, [pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSales(page);
  };

  // Memoized filtered sales for better performance
  const memoizedFilteredSales = useMemo(() => {
    let filtered = sales;
    
    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(sale => sale.status === selectedStatus);
    }
    
    // Filter by period
    if (selectedPeriod !== 'all') {
      const today = new Date();
      const saleDate = new Date();
      
      switch (selectedPeriod) {
        case 'today':
          filtered = filtered.filter(sale => {
            saleDate.setTime(new Date(sale.date).getTime());
            return saleDate.toDateString() === today.toDateString();
          });
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(sale => {
            saleDate.setTime(new Date(sale.date).getTime());
            return saleDate >= weekAgo;
          });
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(sale => {
            saleDate.setTime(new Date(sale.date).getTime());
            return saleDate >= monthAgo;
          });
          break;
        case 'year':
          const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(sale => {
            saleDate.setTime(new Date(sale.date).getTime());
            return saleDate >= yearAgo;
          });
          break;
      }
    }
    
    // Search (using debounced term)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.customerName.toLowerCase().includes(searchLower) ||
        sale.totalAmount.toString().includes(debouncedSearchTerm) ||
        sale.paymentType.toLowerCase().includes(searchLower) ||
        sale.cashier.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [sales, selectedStatus, selectedPeriod, debouncedSearchTerm]);

  // Update filtered sales state when memoized value changes
  useEffect(() => {
    setFilteredSales(memoizedFilteredSales);
  }, [memoizedFilteredSales]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return latinToCyrillic('Bajarildi');
      case 'pending': return latinToCyrillic('Kutilmoqda');
      case 'cancelled': return latinToCyrillic('Bekor qilindi');
      default: return status;
    }
  };

  const getPaymentTypeText = (type: string) => {
    switch (type) {
      case 'cash': return latinToCyrillic('Naqt');
      case 'card': return latinToCyrillic('Karta');
      case 'click': return latinToCyrillic('Click');
      default: return type;
    }
  };

  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  };

  const getCompletedSales = () => {
    return filteredSales.filter(sale => sale.status === 'completed').length;
  };

  return (
    <ModernLayout 
      title={latinToCyrillic("Sotuvlar")}
      subtitle={`${filteredSales.length} ${latinToCyrillic("ta sotuv")}`}
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
                id="sales-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={latinToCyrillic("Сотувларни қидириш...")}
                className="input-modern w-full pl-12"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <label htmlFor="sales-status-filter" className="sr-only">Status Filter</label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Filter className="w-5 h-5" />
              </div>
              <select
                id="sales-status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-modern pl-12 appearance-none cursor-pointer"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? latinToCyrillic("Барчаси") : getStatusText(status)}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div className="relative">
              <label htmlFor="sales-period-filter" className="sr-only">Period Filter</label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar className="w-5 h-5" />
              </div>
              <select
                id="sales-period-filter"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="input-modern pl-12 appearance-none cursor-pointer"
              >
                {periods.map(period => (
                  <option key={period} value={period}>
                    {period === 'all' ? latinToCyrillic("Barcha vaqt") : 
                     period === 'today' ? latinToCyrillic("Bugun") :
                     period === 'week' ? latinToCyrillic("Oxirgi 7 kun") :
                     period === 'month' ? latinToCyrillic("Oylik") :
                     period === 'year' ? latinToCyrillic("Yillik") : period}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              isLoading={refreshing}
              loadingText={latinToCyrillic("Yangilanmoqda...")}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              {latinToCyrillic("Yangilash")}
            </Button>
            
            <Button
              onClick={() => navigate('/cashier/sales/add')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {latinToCyrillic("Янги Сотув")}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Жами Сотув")}</p>
                <p className="text-2xl font-bold text-primary">{getTotalSales().toLocaleString()} UZS</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Бажарилган")}</p>
                <p className="text-2xl font-bold text-primary">{getCompletedSales()}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Ортача Сотув")}</p>
                <p className="text-2xl font-bold text-primary">
                  {filteredSales.length > 0 ? Math.round(getTotalSales() / filteredSales.length).toLocaleString() : 0} UZS
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card-light p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-secondary">{latinToCyrillic("Бугунги Сотув")}</p>
                <p className="text-2xl font-bold text-primary">
                  {filteredSales
                    .filter(sale => sale.status === 'completed' && new Date(sale.date).toDateString() === new Date().toDateString())
                    .reduce((sum, sale) => sum + sale.totalAmount, 0)
                    .toLocaleString()} UZS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass-card-light p-6">
            <TableSkeleton rows={10} cols={8} />
          </div>
        )}

        {/* Sales Table */}
        {!loading && (
          <div className="glass-card-light p-6">
            <div className="overflow-x-auto">
              <table className="table-modern w-full">
                <thead>
                  <tr>
                    <th className="table-header">{latinToCyrillic("Sana")}</th>
                    <th className="table-header">{latinToCyrillic("Mijoz")}</th>
                    <th className="table-header">{latinToCyrillic("Mahsulotlar")}</th>
                    <th className="table-header">{latinToCyrillic("Summa")}</th>
                    <th className="table-header">{latinToCyrillic("To'lov")}</th>
                    <th className="table-header">{latinToCyrillic("Holat")}</th>
                    <th className="table-header">{latinToCyrillic("Kassir")}</th>
                    <th className="table-header">{latinToCyrillic("Amallar")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-secondary" />
                          <span>{sale.date}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-secondary" />
                          <span className="font-medium">{sale.customerName}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="badge-blue">{sale.items}</span>
                      </td>
                      <td className="table-cell">
                        <span className="font-bold text-primary">{sale.totalAmount.toLocaleString()} UZS</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge-secondary">{getPaymentTypeText(sale.paymentType)}</span>
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs ${getStatusBadgeColor(sale.status)}`}>
                          {getStatusText(sale.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm">{sale.cashier}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => alert(`Sotuv ID: ${sale.id}\nMijoz: ${sale.customerName}\nSumma: ${sale.totalAmount.toLocaleString()} UZS\nSana: ${sale.date}`)}
                            className="btn-gradient-secondary p-1"
                            aria-label="Sotuvni ko'rish"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/cashier/sales/add')}
                            className="btn-gradient-primary p-1"
                            aria-label="Yangi sotuv"
                          >
                            <Plus className="w-4 h-4" />
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

        {/* Pagination */}
        {!loading && filteredSales.length > 0 && (
          <div className="flex items-center justify-between glass-card-light p-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-secondary">
                {latinToCyrillic(`Jami: ${total} ta | Sahifa ${page}/${totalPages}`)}
              </p>
              
              {/* Page Size Selector */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-secondary">
                {latinToCyrillic('ta/sahifa')}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                {latinToCyrillic('Oldingi')}
              </Button>
              
              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm font-medium rounded ${
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                {latinToCyrillic('Keyingi')}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSales.length === 0 && (
          <div className="glass-card-light p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                {latinToCyrillic("Сотувлар топилмади")}
              </h3>
              <p className="text-secondary">
                {latinToCyrillic("Қидириш шартларини ўзгартириб қайта уриниб кўринг")}
              </p>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
