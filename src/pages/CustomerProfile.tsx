import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Calendar,
  ShoppingCart,
  AlertTriangle,
  Package,
  FileSpreadsheet,
  MapPin,
  RefreshCw,
  TrendingUp,
  Wallet,
  Trash2,
  Coins,
  Banknote,
  Crown,
  ShieldAlert,
  User,
} from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { Badge } from '../components/ui/Badge';
import { TableSkeleton, PageLoading } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast, toast } from '../components/ui/Toast';
import api from '../lib/professionalApi';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/excelUtils';
import { latinToCyrillic } from '../lib/transliterator';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCashier = location.pathname.startsWith('/cashier');
  const { addToast } = useToast();
  const [customer, setCustomer] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'USD',
    type: 'CASH',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    try {
      const [customerRes, salesRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/sales?customerId=${id}`)
      ]);
      setCustomer(customerRes.data);

      // API dan kelgan ma'lumotni to'g'ri parse qilish
      const salesData = salesRes.data?.sales || salesRes.data || [];
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (error) {
      console.error('Mijoz ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCustomerData();
  };

  const handleDeleteCustomer = async () => {
    try {
      if (!id) return;
      setIsDeleting(true);
      await api.delete(`/customers/${id}`);
      setShowDeleteModal(false);
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Mijoz muvaffaqiyatli o\'chirildi!')));
      navigate(isCashier ? '/cashier/customers' : '/customers');
    } catch (error: any) {
      console.error('Delete customer error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || latinToCyrillic('Mijozni o\'chirishda xatolik yuz berdi');
      addToast(toast.error(latinToCyrillic('Xatolik'), errorMsg));
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      addToast(toast.warning(latinToCyrillic('Diqqat'), latinToCyrillic('Iltimos, to\'lov summasini kiriting')));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/customers/${id}/payment`, {
        amount,
        currency: paymentForm.currency,
        type: paymentForm.type,
        notes: paymentForm.notes
      });

      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Тўлов амалга оширилди ва кассага қўшилди!')));
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', currency: 'USD', type: 'CASH', notes: '' });
      loadCustomerData(); // Refresh customer data
    } catch (error: any) {
      console.error('To\'lov xatolik:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), error.response?.data?.error || error.message || latinToCyrillic('To\'lov amalga oshirishda xatolik')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoading text={latinToCyrillic('Yuklanmoqda...')} />;
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={AlertTriangle}
            title={latinToCyrillic('Mijoz topilmadi')}
            description={latinToCyrillic('Бу мижоз мавжуд эмас ёки ўчирилган. Мижозлар рўйхатига қайтиб қайта уриниб кўринг.')}
            action={
              <button
                onClick={() => navigate(isCashier ? '/cashier/customers' : '/customers')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                {latinToCyrillic('Mijozlar ro\'yxati')}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const totalPurchases = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const averagePurchase = sales.length > 0 ? totalPurchases / sales.length : 0;

  const handleExportExcel = () => {
    const historyData = sales.map(sale => ({
      'Sana': formatDate(sale.createdAt),
      'Mahsulotlar': sale.items?.map((i: any) => `${i.product?.name || i.productName || 'N/A'} (${i.quantity})`).join(', ') || sale.product?.name || 'N/A',
      'Jami': sale.totalAmount,
      'To\'langan': sale.paidAmount,
      'Qarz': sale.debtAmount,
      'Valyuta': sale.currency,
    }));
    exportToExcel(historyData, { fileName: `Mijoz_${customer.name}_Tarixi` });
  };

  // Faqat naqd (cash) savdolarni eksport qilish
  const handleExportCashSales = () => {
    // Faqat CASH to'lov turidagi savdolarni filtrlash
    const cashSales = sales.filter(sale =>
      sale.paymentMethod === 'CASH' ||
      sale.paymentType === 'CASH' ||
      (sale.notes && sale.notes.toLowerCase().includes('naqd'))
    );

    if (cashSales.length === 0) {
      addToast(toast.warning(latinToCyrillic('Diqqat'), latinToCyrillic('Naqd pul savdolari topilmadi!')));
      return;
    }

    const cashSalesData = cashSales.map(sale => ({
      [latinToCyrillic('Sana')]: formatDate(sale.createdAt),
      [latinToCyrillic('Mahsulotlar')]: sale.items?.map((i: any) => `${i.product?.name || i.productName || 'N/A'} (${i.quantity})`).join(', ') || sale.product?.name || 'N/A',
      [latinToCyrillic('Jami summa')]: sale.totalAmount,
      [latinToCyrillic('To\'langan')]: sale.paidAmount,
      [latinToCyrillic('Qarz')]: sale.debtAmount,
      [latinToCyrillic('Valyuta')]: sale.currency,
      [latinToCyrillic('To\'lov turi')]: latinToCyrillic('Naqd pul'),
    }));

    exportToExcel(cashSalesData, {
      fileName: `Mijoz_${customer.name}_Naqd_Savdolari`
    });
  };

  // Avatar uchun bosh harflar
  const getInitials = (name: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // Kategoriya Badge varianti
  const getCategoryVariant = (category: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (category) {
      case 'VIP': return 'info';
      case 'WHOLESALE': return 'success';
      case 'PROBLEMATIC':
      case 'RISK': return 'error';
      default: return 'neutral';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'VIP': return 'VIP';
      case 'WHOLESALE': return latinToCyrillic('Optom');
      case 'NORMAL': return latinToCyrillic('Oddiy');
      case 'PROBLEMATIC':
      case 'RISK': return latinToCyrillic('Xavfli');
      case 'NEW': return latinToCyrillic('Yangi');
      default: return category;
    }
  };

  const debtUSD = customer.debtUSD || 0;
  const debtUZS = customer.debtUZS || 0;
  const hasDebt = debtUSD > 0 || debtUZS > 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero header: avatar + name + category + key figures + actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-glass-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-12 w-56 h-56 bg-white/5 rounded-full blur-3xl" />

        <div className="relative">
          {/* Top row: back + actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 active:scale-95"
              aria-label={latinToCyrillic('Орқага')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{latinToCyrillic('Орқага')}</span>
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 disabled:opacity-60 rounded-xl text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 active:scale-95"
                title={latinToCyrillic('Yangilash')}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">{latinToCyrillic('Yangilash')}</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 active:scale-95"
                title="Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden lg:inline">Excel</span>
              </button>
              <button
                onClick={handleExportCashSales}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 active:scale-95"
                title={latinToCyrillic('Naqd savdolar')}
              >
                <Banknote className="w-4 h-4" />
                <span className="hidden lg:inline">{latinToCyrillic('Naqd savdolar')}</span>
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                <Coins className="w-4 h-4" />
                {latinToCyrillic('To\'lov qilish')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-rose-500/90 hover:bg-rose-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-200 active:scale-95"
                title={latinToCyrillic('Mijozni o\'chirish')}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden lg:inline">{latinToCyrillic('O\'chirish')}</span>
              </button>
            </div>
          </div>

          {/* Identity + key figures */}
          <div className="mt-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-xl sm:text-2xl font-extrabold flex-shrink-0 shadow-inner">
                {getInitials(customer.name)}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                  {customer.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {customer.category && (
                    <Badge variant={getCategoryVariant(customer.category)}>
                      <span className="inline-flex items-center gap-1">
                        {customer.category === 'VIP' && <Crown className="w-3 h-3" />}
                        {(customer.category === 'RISK' || customer.category === 'PROBLEMATIC') && <ShieldAlert className="w-3 h-3" />}
                        {getCategoryLabel(customer.category)}
                      </span>
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 bg-white/10 rounded-full px-2.5 py-0.5">
                    <User className="w-3 h-3" />
                    {latinToCyrillic('Mijoz kodi')}: {customer.code || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Key figures: balance + debt */}
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
              <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-4 py-3 min-w-[9rem]">
                <p className="text-xs font-medium text-white/70">{latinToCyrillic('Balans')}</p>
                <p className="mt-0.5 text-lg sm:text-xl font-bold text-white tracking-tight">
                  ${(customer.balanceUSD || 0).toFixed(2)}
                </p>
                <p className="text-xs text-white/60">{(customer.balanceUZS || 0).toLocaleString()} UZS</p>
              </div>
              <div className={`rounded-2xl backdrop-blur-sm px-4 py-3 min-w-[9rem] ${hasDebt ? 'bg-rose-500/30' : 'bg-white/15'}`}>
                <p className="text-xs font-medium text-white/70">{latinToCyrillic('Qarz')}</p>
                <p className={`mt-0.5 text-lg sm:text-xl font-bold tracking-tight ${hasDebt ? 'text-rose-100' : 'text-white'}`}>
                  ${debtUSD.toFixed(2)}
                </p>
                <p className="text-xs text-white/60">{debtUZS.toLocaleString()} UZS</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards: contact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-3 transition-all duration-200 hover:shadow-md">
          <div className="w-11 h-11 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500">{latinToCyrillic('Telefon')}</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900 truncate">{customer.phone || '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-3 transition-all duration-200 hover:shadow-md">
          <div className="w-11 h-11 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500">{latinToCyrillic('Manzil')}</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900 truncate">{customer.address || '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-3 transition-all duration-200 hover:shadow-md">
          <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500">{latinToCyrillic('Ro\'yxatdan o\'tgan')}</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900 truncate">{formatDate(customer.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-sm mb-3">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-medium text-gray-500">{latinToCyrillic('Balans')}</p>
          <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900 tracking-tight">${(customer.balanceUSD || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400">{(customer.balanceUZS || 0).toLocaleString()} UZS</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
          <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-sm mb-3">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-medium text-gray-500">{latinToCyrillic('Qarz')}</p>
          <p className={`mt-1 text-lg sm:text-xl font-bold tracking-tight ${hasDebt ? 'text-rose-600' : 'text-gray-900'}`}>${debtUSD.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{debtUZS.toLocaleString()} UZS</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-sm mb-3">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-medium text-gray-500">{latinToCyrillic('Xaridlar')}</p>
          <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900 tracking-tight">{sales.length} {latinToCyrillic('ta')}</p>
          <p className="text-xs text-gray-400">${totalPurchases.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-sm mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-medium text-gray-500">{latinToCyrillic('O\'rtacha')}</p>
          <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900 tracking-tight">${averagePurchase.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{latinToCyrillic('Har bir sotuv')}</p>
        </div>
      </div>

      {/* Sales history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-500" />
            {latinToCyrillic('Sotuvlar tarixi')}
          </h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
            {sales.length} {latinToCyrillic('ta sotuv')}
          </span>
        </div>

        {refreshing ? (
          <div className="p-4 sm:p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Package}
            title={latinToCyrillic('Sotuvlar mavjud emas')}
            description={latinToCyrillic('Бу мижоз учун ҳали ҳеч қандай сотув қайд этилмаган.')}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Sana')}</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mahsulotlar')}</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Jami')}</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('To\'langan')}</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Qarz')}</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Holat')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(sale.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="space-y-1">
                          {sale.items?.map((i: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                              <span className="font-medium text-gray-900">{i.product?.name || i.productName || 'N/A'}</span>
                              <span className="text-gray-300">×</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-semibold text-gray-700">{i.quantity}</span>
                            </div>
                          )) || (sale.product?.name ? (
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                              <span className="font-medium text-gray-900">{sale.product.name}</span>
                              <span className="text-gray-300">×</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-semibold text-gray-700">{sale.quantity}</span>
                            </div>
                          ) : <span className="text-gray-300">—</span>)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-900 text-right font-semibold whitespace-nowrap">
                        {formatCurrency(sale.totalAmount, sale.currency)}
                      </td>
                      <td className="px-5 py-4 text-sm text-emerald-600 text-right whitespace-nowrap">
                        {formatCurrency(sale.paidAmount, sale.currency)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right whitespace-nowrap">
                        {(sale.debtAmount || 0) > 0 ? (
                          <span className="text-rose-600 font-semibold">{formatCurrency(sale.debtAmount, sale.currency)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {(sale.debtAmount || 0) > 0 ? (
                          <Badge variant="error">{latinToCyrillic('Qarz')}</Badge>
                        ) : (
                          <Badge variant="success">{latinToCyrillic('To\'langan')}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {sales.map((sale) => (
                <div key={sale.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-500 inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(sale.createdAt)}
                    </span>
                    {(sale.debtAmount || 0) > 0 ? (
                      <Badge variant="error">{latinToCyrillic('Qarz')}</Badge>
                    ) : (
                      <Badge variant="success">{latinToCyrillic('To\'langan')}</Badge>
                    )}
                  </div>

                  <div className="mt-3 space-y-1">
                    {sale.items?.map((i: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                        <span className="font-medium text-gray-900">{i.product?.name || i.productName || 'N/A'}</span>
                        <span className="text-gray-300">×</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-semibold text-gray-700">{i.quantity}</span>
                      </div>
                    )) || (sale.product?.name ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                        <span className="font-medium text-gray-900">{sale.product.name}</span>
                        <span className="text-gray-300">×</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-semibold text-gray-700">{sale.quantity}</span>
                      </div>
                    ) : <span className="text-sm text-gray-300">—</span>)}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[11px] text-gray-500">{latinToCyrillic('Jami')}</p>
                      <p className="mt-0.5 text-sm font-bold text-gray-900">{formatCurrency(sale.totalAmount, sale.currency)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[11px] text-gray-500">{latinToCyrillic('To\'langan')}</p>
                      <p className="mt-0.5 text-sm font-bold text-emerald-600">{formatCurrency(sale.paidAmount, sale.currency)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[11px] text-gray-500">{latinToCyrillic('Qarz')}</p>
                      <p className={`mt-0.5 text-sm font-bold ${(sale.debtAmount || 0) > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                        {(sale.debtAmount || 0) > 0 ? formatCurrency(sale.debtAmount, sale.currency) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mijozni o'chirish tasdiqlash */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => { if (!isDeleting) setShowDeleteModal(false); }}
        onConfirm={handleDeleteCustomer}
        variant="danger"
        title={latinToCyrillic('Mijozni o\'chirish')}
        message={latinToCyrillic(`"${customer.name}" mijozini rostdan ham o'chirmoqchimisiz? Barcha sotuvlar, to'lovlar va qarzlar ham o'chiriladi. Bu amalni qaytarib bo'lmaydi.`)}
        confirmText={isDeleting ? latinToCyrillic('O\'chirilmoqda...') : latinToCyrillic('O\'chirish')}
        cancelText={latinToCyrillic('Bekor qilish')}
      />

      {/* To'lov qilish modal */}
      {showPaymentModal && customer && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => { if (!isSubmitting) setShowPaymentModal(false); }}
          title={latinToCyrillic('Mijozdan to\'lov qilish')}
          size="md"
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-5">
            {/* Mijoz ma'lumoti */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {getInitials(customer.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{customer.name}</h3>
                  <p className="text-sm text-gray-600">
                    {latinToCyrillic('Qarz')}: <span className="font-semibold text-rose-600">${debtUSD.toFixed(2)}</span>
                    <span className="text-gray-300 mx-1.5">|</span>
                    {latinToCyrillic('Balans')}: <span className="font-semibold text-emerald-600">${(customer.balanceUSD || 0).toFixed(2)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Summa */}
            <div>
              <label htmlFor="payment-amount" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {latinToCyrillic('To\'lov summasi')} *
              </label>
              <input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full h-12 px-4 text-lg font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="0.00"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Valyuta */}
              <div>
                <label htmlFor="payment-currency" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {latinToCyrillic('Valyuta')}
                </label>
                <select
                  id="payment-currency"
                  value={paymentForm.currency}
                  onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                  className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  aria-label={latinToCyrillic('Valyuta tanlash')}
                >
                  <option value="USD">USD ($)</option>
                  <option value="UZS">UZS (so'm)</option>
                </select>
              </div>

              {/* To'lov turi */}
              <div>
                <label htmlFor="payment-type" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {latinToCyrillic('To\'lov turi')}
                </label>
                <select
                  id="payment-type"
                  value={paymentForm.type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  aria-label={latinToCyrillic('To\'lov turini tanlash')}
                >
                  <option value="CASH">{latinToCyrillic('Naqd pul')}</option>
                  <option value="CARD">{latinToCyrillic('Karta')}</option>
                  <option value="CLICK">Click</option>
                  <option value="TRANSFER">{latinToCyrillic('Bank o\'tkazmasi')}</option>
                </select>
              </div>
            </div>

            {/* Izoh */}
            <div>
              <label htmlFor="payment-notes" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {latinToCyrillic('Izoh')} ({latinToCyrillic('ixtiyoriy')})
              </label>
              <textarea
                id="payment-notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all resize-none"
                rows={2}
                placeholder={latinToCyrillic('Qo\'shimcha ma\'lumot...')}
              />
            </div>

            {/* Ogohlantirish */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {latinToCyrillic('Бу тўлов автоматик равишда кассага қўшилади ва мижоз баланси янгиланади.')}
              </p>
            </div>

            {/* Tugmalar */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                {latinToCyrillic('Bekor qilish')}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    {latinToCyrillic('Saqlanmoqda...')}
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    {latinToCyrillic('To\'lovni qabul qilish')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
