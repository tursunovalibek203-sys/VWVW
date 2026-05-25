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
  Package,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import api from '../lib/professionalApi';
import { extractPaginatedData } from '../lib/apiHelpers';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import EmptyState from '../components/EmptyState';
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
  // UI-only: detail modal (replaces alert())
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

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

  // Map a sale status to a Badge variant.
  // Real backend values are paid / partial / unpaid; legacy values
  // (completed / pending / cancelled) are kept for compatibility.
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'success';
      case 'partial':
      case 'pending':
        return 'warning';
      case 'unpaid':
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return latinToCyrillic("To'langan");
      case 'partial':
        return latinToCyrillic('Qisman');
      case 'unpaid':
        return latinToCyrillic("To'lanmagan");
      case 'completed':
        return latinToCyrillic('Bajarildi');
      case 'pending':
        return latinToCyrillic('Kutilmoqda');
      case 'cancelled':
        return latinToCyrillic('Bekor qilindi');
      default:
        return status;
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

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  };

  const getCompletedSales = () => {
    return filteredSales.filter(sale => sale.status === 'completed' || sale.status === ('paid' as Sale['status'])).length;
  };

  const getTodaySales = () =>
    filteredSales
      .filter(sale => new Date(sale.date).toDateString() === new Date().toDateString())
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

  const hasActiveFilters = !!debouncedSearchTerm || selectedStatus !== 'all' || selectedPeriod !== 'all';

  const stats = [
    {
      label: latinToCyrillic('Jami sotuv'),
      value: `${getTotalSales().toLocaleString('en-US')} UZS`,
      icon: ShoppingCart,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: latinToCyrillic('Bajarilgan'),
      value: getCompletedSales().toLocaleString('en-US'),
      icon: TrendingUp,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: latinToCyrillic("O'rtacha sotuv"),
      value: `${filteredSales.length > 0 ? Math.round(getTotalSales() / filteredSales.length).toLocaleString('en-US') : 0} UZS`,
      icon: DollarSign,
      tint: 'bg-violet-50 text-violet-600',
    },
    {
      label: latinToCyrillic('Bugungi sotuv'),
      value: `${getTodaySales().toLocaleString('en-US')} UZS`,
      icon: Receipt,
      tint: 'bg-sky-50 text-sky-600',
    },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {latinToCyrillic('Sotuvlar')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? latinToCyrillic('Yuklanmoqda...')
                : `${filteredSales.length} ${latinToCyrillic('ta sotuv')}`}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
            </button>
            <button
              onClick={() => navigate('/cashier/sales/add')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {latinToCyrillic('Yangi sotuv')}
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[116px] animate-pulse" />
              ))
            : stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                        {stat.label}
                      </p>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.tint}`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                  </div>
                );
              })}
        </div>

        {/* Filters bar */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                id="sales-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={latinToCyrillic('Mijoz, summa yoki kassir...')}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex gap-3">
              {/* Status Filter */}
              <div className="relative">
                <label htmlFor="sales-status-filter" className="sr-only">Status Filter</label>
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="sales-status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status === 'all' ? latinToCyrillic('Barcha holat') : getStatusText(status)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Filter */}
              <div className="relative">
                <label htmlFor="sales-period-filter" className="sr-only">Period Filter</label>
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="sales-period-filter"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  {periods.map(period => (
                    <option key={period} value={period}>
                      {period === 'all' ? latinToCyrillic('Barcha vaqt') :
                       period === 'today' ? latinToCyrillic('Bugun') :
                       period === 'week' ? latinToCyrillic('Oxirgi 7 kun') :
                       period === 'month' ? latinToCyrillic('Oylik') :
                       period === 'year' ? latinToCyrillic('Yillik') : period}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredSales.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70">
            <EmptyState
              icon={ShoppingCart}
              title={
                hasActiveFilters
                  ? latinToCyrillic('Sotuvlar topilmadi')
                  : latinToCyrillic("Hali sotuvlar yo'q")
              }
              description={
                hasActiveFilters
                  ? latinToCyrillic("Qidiruv shartlarini o'zgartirib qayta urinib ko'ring")
                  : latinToCyrillic("Birinchi savdoni yarating va u shu yerda ko'rinadi")
              }
              action={
                <button
                  onClick={() => navigate('/cashier/sales/add')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {latinToCyrillic('Yangi sotuv')}
                </button>
              }
            />
          </div>
        )}

        {/* Sales table (desktop) */}
        {!loading && filteredSales.length > 0 && (
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/60">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Sana')}</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mijoz')}</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mahsulotlar')}</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Summa')}</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic("To'lov")}</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Holat')}</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Kassir')}</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Amallar')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 tabular-nums">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(sale.date)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {sale.customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{sale.customerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="neutral">{sale.items}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{sale.totalAmount.toLocaleString('en-US')} UZS</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          {getPaymentTypeText(sale.paymentType)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={getStatusVariant(sale.status)}>
                          {getStatusText(sale.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">{sale.cashier}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSale(sale)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            aria-label={latinToCyrillic("Sotuvni ko'rish")}
                            title={latinToCyrillic("Ko'rish")}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/cashier/sales/add')}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            aria-label={latinToCyrillic('Yangi sotuv')}
                            title={latinToCyrillic('Yangi sotuv')}
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

        {/* Sales cards (mobile) */}
        {!loading && filteredSales.length > 0 && (
          <div className="md:hidden space-y-3">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white rounded-2xl border border-slate-200/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {sale.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{sale.customerName}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                        <Calendar className="w-3 h-3" />
                        {formatDate(sale.date)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(sale.status)}>
                    {getStatusText(sale.status)}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 tabular-nums">{sale.totalAmount.toLocaleString('en-US')} UZS</span>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Package className="w-3.5 h-3.5" />
                      {sale.items}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      {getPaymentTypeText(sale.paymentType)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {sale.cashier}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSale(sale)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {latinToCyrillic("Ko'rish")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredSales.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/70 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 tabular-nums">
                {latinToCyrillic(`Jami: ${total} ta`)} &middot; {latinToCyrillic(`Sahifa ${page}/${totalPages}`)}
              </p>

              {/* Page Size Selector */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label={latinToCyrillic('Sahifadagi soni')}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
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
              <div className="hidden sm:flex items-center gap-1">
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
                      className={`w-9 h-9 text-sm font-semibold rounded-lg transition-colors tabular-nums ${
                        pageNum === page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
      </div>

      {/* Sale detail modal (replaces alert()) */}
      <Modal
        isOpen={selectedSale !== null}
        onClose={() => setSelectedSale(null)}
        title={latinToCyrillic("Sotuv ma'lumotlari")}
        footer={
          <Button variant="secondary" onClick={() => setSelectedSale(null)}>
            {latinToCyrillic('Yopish')}
          </Button>
        }
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">
                  {selectedSale.customerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{selectedSale.customerName}</p>
                  <p className="text-xs text-slate-400 tabular-nums">{formatDate(selectedSale.date)}</p>
                </div>
              </div>
              <Badge variant={getStatusVariant(selectedSale.status)}>
                {getStatusText(selectedSale.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Summa')}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{selectedSale.totalAmount.toLocaleString('en-US')} UZS</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Mahsulotlar')}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{selectedSale.items}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic("To'lov turi")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{getPaymentTypeText(selectedSale.paymentType)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Kassir')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedSale.cashier}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
