import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Wallet,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Package,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  Plus,
  Hash,
  CreditCard,
  Crown,
  ShieldAlert,
  Banknote,
  DollarSign,
  Magnet,
} from 'lucide-react';
import { latinToCyrillic, trData } from '../lib/transliterator';
import { formatDate, formatCurrency } from '../lib/utils';
import { exportToExcel } from '../lib/excelUtils';
import api from '../lib/professionalApi';
import { extractData, extractPaginatedData } from '../lib/apiHelpers';
import { useToast, toast } from '../components/ui/Toast';
import { PageLoading, TableSkeleton } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  code?: string;
  category?: string;
  balanceUSD: number;
  balanceUZS: number;
  debtUSD: number;
  debtUZS: number;
  createdAt: string;
}

interface SaleItem {
  id: string;
  productId?: string;
  quantity: number;
  pricePerBag: number;
  product?: {
    id: string;
    name: string;
  };
  variant?: {
    id: string;
    variantName: string;
    parent?: {
      id: string;
      name: string;
    };
  };
}

interface Sale {
  id: string;
  createdAt: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  currency: string;
  paymentStatus: string;
  items?: SaleItem[];
  product?: {
    name: string;
  };
  quantity?: number;
}

export default function CustomerProfileModern() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ uzs: '', usd: '', karta: '', kurs: '12700', notes: '', debtTarget: 'UZS' as 'UZS' | 'USD' });

  const loadCustomerData = async () => {
    try {
      setRefreshing(true);
      const [customerRes, salesRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/sales?customerId=${id}`)
      ]);

      // Handle standardized API response format
      const customerData = extractData<Customer | null>(customerRes, null);
      const { data: salesData } = extractPaginatedData<Sale>(salesRes, 'sales', []);

      setCustomer(customerData);
      setSales(salesData);
    } catch (error) {
      console.error('Mijoz ma\'lumotlarini yuklashda xatolik:', error);
      addToast(
        toast.error(
          latinToCyrillic('Xatolik'),
          latinToCyrillic("Mijoz ma'lumotlarini yuklashda xatolik yuz berdi")
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const handleRefresh = () => {
    loadCustomerData();
  };

  const handleExportExcel = () => {
    if (!customer || sales.length === 0) return;
    const paymentLabel = (m: string) => {
      if (m === 'CARD') return latinToCyrillic('Karta');
      if (m === 'CLICK') return 'Click';
      return latinToCyrillic('Naqd');
    };
    const rows = sales.map(s => ({
      [latinToCyrillic('Sana')]:                 formatDate(s.createdAt),
      [latinToCyrillic('Mahsulotlar')]:           getProductNames(s),
      [latinToCyrillic('Jami')]:                  s.totalAmount,
      [latinToCyrillic("To'langan")]:             s.paidAmount,
      [latinToCyrillic('Qarz')]:                  s.debtAmount || 0,
      [latinToCyrillic('Valyuta')]:               s.currency,
      [latinToCyrillic("To'lov turi")]:           paymentLabel(s.paymentMethod || s.paymentType || 'CASH'),
      [latinToCyrillic('Haydovchi')]:             trData(s.driver?.name || s.driverName || '—'),
      [latinToCyrillic('Yetkazib berish narxi')]: s.deliveryFee || 0,
      [latinToCyrillic('Holat')]:                 s.paymentStatus,
    }));
    exportToExcel(rows, {
      fileName: `${trData(customer.name)} - savdolar`,
      sheetName: latinToCyrillic('Savdolar'),
    });
  };

  const handlePayment = () => {
    const defaultTarget = (customer?.debtUZS || 0) > 0 ? 'UZS' : 'USD';
    setPaymentForm(prev => ({ ...prev, debtTarget: defaultTarget as 'UZS' | 'USD' }));
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const uzs = parseFloat(paymentForm.uzs) || 0;
    const usd = parseFloat(paymentForm.usd) || 0;
    const karta = parseFloat(paymentForm.karta) || 0;

    if (uzs <= 0 && usd <= 0 && karta <= 0) {
      addToast(toast.warning(latinToCyrillic('Diqqat'), latinToCyrillic("Iltimos, kamida bitta to'lov summasini kiriting")));
      return;
    }

    const exchangeRate = parseFloat(paymentForm.kurs) || 12700;
    const hasBothDebts = (customer?.debtUZS || 0) > 0 && (customer?.debtUSD || 0) > 0;
    const debtTarget = hasBothDebts ? paymentForm.debtTarget : undefined;
    setIsSubmitting(true);
    try {
      const calls = [];
      if (uzs > 0)   calls.push(api.post(`/customers/${id}/payment`, { amount: uzs,   currency: 'UZS', type: 'CASH',  notes: paymentForm.notes, exchangeRate, debtTarget }));
      if (usd > 0)   calls.push(api.post(`/customers/${id}/payment`, { amount: usd,   currency: 'USD', type: 'CASH',  notes: paymentForm.notes, exchangeRate, debtTarget }));
      if (karta > 0) calls.push(api.post(`/customers/${id}/payment`, { amount: karta, currency: 'UZS', type: 'CARD',  notes: paymentForm.notes, exchangeRate, debtTarget }));
      await Promise.all(calls);

      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic("To'lov amalga oshirildi va kassaga qo'shildi!")));
      setShowPaymentModal(false);
      setPaymentForm({ uzs: '', usd: '', karta: '', kurs: '12700', notes: '', debtTarget: 'UZS' });
      loadCustomerData();
    } catch (error: any) {
      addToast(toast.error(latinToCyrillic('Xatolik'), error?.details?.error || error?.message || latinToCyrillic("To'lovda xatolik yuz berdi")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewSale = () => {
    const base = location.pathname.startsWith('/cashier') ? '/cashier/sales/add' : '/sales/add';
    navigate(base, { state: { customerId: id } });
  };

  if (loading) {
    return <PageLoading text={latinToCyrillic("Mijoz ma'lumotlari yuklanmoqda...")} />;
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={AlertTriangle}
            title={latinToCyrillic('Mijoz topilmadi')}
            description={latinToCyrillic('Bu mijoz mavjud emas')}
            action={
              <button
                onClick={() => navigate('/cashier/customers')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" />
                {latinToCyrillic('Qaytish')}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const totalPurchasesUZS = sales.filter(s => s.currency === 'UZS').reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalPurchasesUSD = sales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const uzsCount = sales.filter(s => s.currency === 'UZS').length;
  const usdCount = sales.filter(s => s.currency === 'USD').length;
  const avgUZS = uzsCount > 0 ? totalPurchasesUZS / uzsCount : 0;
  const avgUSD = usdCount > 0 ? totalPurchasesUSD / usdCount : 0;
  const hasDebt = (customer.debtUSD || 0) > 0 || (customer.debtUZS || 0) > 0;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // Kategoriya Badge varianti: VIP=info, WHOLESALE=success, NORMAL=neutral, RISK/PROBLEMATIC=error
  const getCategoryVariant = (category?: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (category) {
      case 'VIP': return 'info';
      case 'WHOLESALE': return 'success';
      case 'PROBLEMATIC':
      case 'RISK': return 'error';
      case 'NORMAL': return 'neutral';
      default: return 'neutral';
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'VIP': return 'VIP';
      case 'WHOLESALE': return latinToCyrillic('Optom');
      case 'NORMAL': return latinToCyrillic('Oddiy');
      case 'PROBLEMATIC':
      case 'RISK': return latinToCyrillic('Xavfli');
      case 'NEW': return latinToCyrillic('Yangi');
      default: return null;
    }
  };

  const getProductNames = (sale: Sale) => {
    if (sale.items && sale.items.length > 0) {
      const names = sale.items.map(item => {
        if (item.product?.name) return item.product.name;
        if (item.variant?.parent?.name && item.variant?.variantName) {
          return `${item.variant.parent.name} (${item.variant.variantName})`;
        }
        if (item.variant?.parent?.name) return item.variant.parent.name;
        if (item.variant?.variantName) return item.variant.variantName;
        return null;
      }).filter(Boolean);
      if (names.length > 0) return trData(names.join(', '));
    }
    if (sale.product?.name) return trData(sale.product.name);
    return '-';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') {
      return <Badge variant="success">{latinToCyrillic("To'langan")}</Badge>;
    }
    if (status === 'PARTIAL') {
      return <Badge variant="warning">{latinToCyrillic('Qisman')}</Badge>;
    }
    return <Badge variant="error">{latinToCyrillic('Qarz')}</Badge>;
  };

  const categoryLabel = getCategoryLabel(customer.category);
  // Avatar: soft slate/indigo tint (premium, not rainbow). Qarz holatda nozik rose ishorasi.
  const avatarTint = hasDebt ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600';

  const infoCards = [
    {
      icon: Phone,
      label: latinToCyrillic('Telefon'),
      value: customer.phone || '-',
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      icon: MapPin,
      label: latinToCyrillic('Manzil'),
      value: trData(customer.address) || '-',
      tint: 'bg-sky-50 text-sky-600',
    },
    {
      icon: Hash,
      label: latinToCyrillic('Mijoz kodi'),
      value: customer.code || 'N/A',
      tint: 'bg-violet-50 text-violet-600',
    },
    {
      icon: Calendar,
      label: latinToCyrillic("Ro'yxat sanasi"),
      value: formatDate(customer.createdAt),
      tint: 'bg-emerald-50 text-emerald-600',
    },
  ];

  const fmtBoth = (uzs: number, usd: number) => {
    const parts: string[] = [];
    if (uzs > 0) parts.push(`${Math.round(uzs).toLocaleString('en-US')} so'm`);
    if (usd > 0) parts.push(`$${usd.toFixed(2)}`);
    return parts.join(' / ') || '0';
  };

  const financialCards = [
    {
      icon: Wallet,
      label: latinToCyrillic('Balans'),
      main: (customer.balanceUZS || 0) > 0 || (customer.balanceUSD || 0) > 0
        ? `${Math.round(customer.balanceUZS || 0).toLocaleString('en-US')} so'm`
        : '0',
      sub: (customer.balanceUSD || 0) > 0
        ? `+ $${(customer.balanceUSD || 0).toFixed(2)}`
        : latinToCyrillic('Balans'),
      mainClass: 'text-slate-900',
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: AlertTriangle,
      label: latinToCyrillic('Qarz'),
      main: (customer.debtUZS || 0) > 0
        ? `${Math.round(customer.debtUZS || 0).toLocaleString('en-US')} so'm`
        : (customer.debtUSD || 0) > 0 ? `$${(customer.debtUSD || 0).toFixed(2)}` : '0',
      sub: (customer.debtUSD || 0) > 0 && (customer.debtUZS || 0) > 0
        ? `+ $${(customer.debtUSD || 0).toFixed(2)}`
        : latinToCyrillic(hasDebt ? 'To\'lanmagan' : 'Qarz yo\'q'),
      mainClass: hasDebt ? 'text-rose-600' : 'text-slate-900',
      tint: hasDebt ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600',
    },
    {
      icon: ShoppingCart,
      label: latinToCyrillic('Jami xaridlar'),
      main: `${sales.length} ${latinToCyrillic('ta')}`,
      sub: fmtBoth(totalPurchasesUZS, totalPurchasesUSD),
      mainClass: 'text-slate-900',
      tint: 'bg-sky-50 text-sky-600',
    },
    {
      icon: TrendingUp,
      label: latinToCyrillic("O'rtacha"),
      main: fmtBoth(avgUZS, avgUSD),
      sub: latinToCyrillic('Har bir savdo'),
      mainClass: 'text-slate-900',
      tint: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: back + clean identity + actions */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 -ml-1 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          {latinToCyrillic('Mijozlar')}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0 ${avatarTint}`}>
              {getInitials(trData(customer.name))}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                  {trData(customer.name)}
                </h1>
                {categoryLabel && (
                  <Badge variant={getCategoryVariant(customer.category)}>
                    <span className="inline-flex items-center gap-1">
                      {customer.category === 'VIP' && <Crown className="w-3 h-3" />}
                      {(customer.category === 'RISK' || customer.category === 'PROBLEMATIC') && <ShieldAlert className="w-3 h-3" />}
                      {categoryLabel}
                    </span>
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5 tabular-nums">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone || '-'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handlePayment}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors active:scale-[0.98]"
            >
              <Coins className="w-4 h-4 text-indigo-600" />
              {latinToCyrillic("To'lov")}
            </button>
            <button
              onClick={handleNewSale}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {latinToCyrillic('Yangi savdo')}
            </button>
          </div>
        </div>
      </div>

      {/* Financial cards: premium white */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          {latinToCyrillic("Moliyaviy ma'lumot")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {financialCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                    {card.label}
                  </p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.tint}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                </div>
                <p className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${card.mainClass}`}>
                  {card.main}
                </p>
                <p className="mt-1 text-xs text-slate-400 truncate tabular-nums">{card.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact info cards: premium white */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          {latinToCyrillic("Aloqa ma'lumotlari")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {infoCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                    {card.label}
                  </p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.tint}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900 break-words" title={card.value}>
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" />
            {latinToCyrillic('Savdolar tarixi')}
          </h2>
          <span className="text-xs font-medium text-slate-400 tabular-nums">
            {sales.length} {latinToCyrillic('ta savdo')}
          </span>
        </div>

        {/* Loading */}
        {refreshing && sales.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70">
            <EmptyState
              icon={Package}
              title={latinToCyrillic("Savdolar yo'q")}
              description={latinToCyrillic('Bu mijoz hali xarid qilmadi')}
              action={
                <button
                  onClick={handleNewSale}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {latinToCyrillic('Yangi savdo')}
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200/70 bg-slate-50/60">
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Sana')}</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Mahsulotlar')}</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Jami')}</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic("To'langan")}</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Qarz')}</th>
                      <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Holat')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap tabular-nums">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0" />
                            <span className="truncate max-w-[260px]" title={getProductNames(sale)}>
                              {getProductNames(sale)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900 text-right whitespace-nowrap tabular-nums">
                          {formatCurrency(sale.totalAmount, sale.currency)}
                        </td>
                        <td className="px-5 py-4 text-sm text-emerald-600 font-medium text-right whitespace-nowrap tabular-nums">
                          {formatCurrency(sale.paidAmount, sale.currency)}
                        </td>
                        <td className="px-5 py-4 text-sm text-right whitespace-nowrap tabular-nums">
                          {(sale.debtAmount || 0) > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              {formatCurrency(sale.debtAmount, sale.currency)}
                            </span>
                          ) : (
                            <span className="text-slate-300">&mdash;</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {getStatusBadge(sale.paymentStatus)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-white rounded-2xl border border-slate-200/70 p-4 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        {formatDate(sale.createdAt)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700 break-words" title={getProductNames(sale)}>
                        {getProductNames(sale)}
                      </p>
                    </div>
                    {getStatusBadge(sale.paymentStatus)}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Jami')}</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">
                        {formatCurrency(sale.totalAmount, sale.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic("To'langan")}</p>
                      <p className="mt-0.5 text-sm font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(sale.paidAmount, sale.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Qarz')}</p>
                      <p className={`mt-0.5 text-sm font-bold tabular-nums ${(sale.debtAmount || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {(sale.debtAmount || 0) > 0
                          ? formatCurrency(sale.debtAmount, sale.currency)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      {sales.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
          <CreditCard className="w-3.5 h-3.5" />
          <span>{latinToCyrillic('Barcha savdolar shu yerda')}</span>
        </div>
      )}

      {/* To'lov modal */}
      {showPaymentModal && customer && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => { if (!isSubmitting) setShowPaymentModal(false); }}
          title={latinToCyrillic("Mijozdan to'lov qabul qilish")}
          size="md"
        >
          {(() => {
            const kurs = parseFloat(paymentForm.kurs) || 0;
            const uzs = parseFloat(paymentForm.uzs) || 0;
            const usd = parseFloat(paymentForm.usd) || 0;
            const karta = parseFloat(paymentForm.karta) || 0;
            const totalUZS = uzs + (usd * kurs) + karta;
            const hasAny = uzs > 0 || usd > 0 || karta > 0;
            return (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                {/* Mijoz info */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">
                      {trData(customer.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{trData(customer.name)}</h3>
                      <p className="text-sm text-slate-500">
                        {latinToCyrillic('Qarz')}: <span className="font-semibold text-rose-600">{(customer.debtUZS || 0) > 0 ? `${Math.round(customer.debtUZS).toLocaleString()} so'm` : ''}{(customer.debtUSD || 0) > 0 ? ` $${customer.debtUSD.toFixed(2)}` : ''}{(customer.debtUZS || 0) <= 0 && (customer.debtUSD || 0) <= 0 ? '0' : ''}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Qaysi qarzni yopish (faqat ikkala valyutada qarz bo'lganda) */}
                {(customer.debtUZS || 0) > 0 && (customer.debtUSD || 0) > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {latinToCyrillic('Qaysi qarzni yopish?')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, debtTarget: 'UZS' })}
                        className={`flex flex-col items-center gap-1 py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${
                          paymentForm.debtTarget === 'UZS'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span className="text-base">{latinToCyrillic("So'm qarzini")}</span>
                        <span className="text-xs font-bold text-rose-500">{Math.round(customer.debtUZS || 0).toLocaleString()} {latinToCyrillic("so'm")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, debtTarget: 'USD' })}
                        className={`flex flex-col items-center gap-1 py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${
                          paymentForm.debtTarget === 'USD'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <span className="text-base">{latinToCyrillic("$ qarzini")}</span>
                        <span className="text-xs font-bold text-rose-500">${(customer.debtUSD || 0).toFixed(2)}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Kurs */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {latinToCyrillic('Valyuta kursi')} (1$ = ? so'm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={paymentForm.kurs}
                    onChange={(e) => setPaymentForm({ ...paymentForm, kurs: e.target.value })}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder="12700"
                  />
                </div>

                {/* 3 ta to'lov inputi */}
                {(() => {
                  const _kurs = parseFloat(paymentForm.kurs) || 12700;
                  const _uzs = parseFloat(paymentForm.uzs) || 0;
                  const _usd = parseFloat(paymentForm.usd) || 0;
                  const _karta = parseFloat(paymentForm.karta) || 0;
                  const totalDebtUZS = (customer.debtUZS || 0) + (customer.debtUSD || 0) * _kurs;
                  const fillUzs = () => setPaymentForm({ ...paymentForm, uzs: String(Math.max(0, Math.round(totalDebtUZS - _usd * _kurs - _karta))) });
                  const fillUsd = () => { const r = Math.max(0, (totalDebtUZS - _uzs - _karta) / _kurs); setPaymentForm({ ...paymentForm, usd: r > 0 ? r.toFixed(2) : '0' }); };
                  const fillKarta = () => setPaymentForm({ ...paymentForm, karta: String(Math.max(0, Math.round(totalDebtUZS - _uzs - _usd * _kurs))) });
                  return (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5 text-emerald-600" />{latinToCyrillic("Naqt so'm")}</span>
                      <button type="button" onClick={fillUzs} title="Qolgan summani to'ldirish" className="p-0.5 text-indigo-400 hover:text-indigo-600 transition-colors active:scale-90"><Magnet className="w-3.5 h-3.5" /></button>
                    </label>
                    <input type="number" min="0" value={paymentForm.uzs} onChange={(e) => setPaymentForm({ ...paymentForm, uzs: e.target.value })}
                      className="w-full h-12 px-3 text-base font-bold bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" placeholder="0" autoFocus />
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-blue-600" />{latinToCyrillic('Naqt $')}</span>
                      <button type="button" onClick={fillUsd} title="Qolgan summani to'ldirish" className="p-0.5 text-indigo-400 hover:text-indigo-600 transition-colors active:scale-90"><Magnet className="w-3.5 h-3.5" /></button>
                    </label>
                    <input type="number" min="0" step="0.01" value={paymentForm.usd} onChange={(e) => setPaymentForm({ ...paymentForm, usd: e.target.value })}
                      className="w-full h-12 px-3 text-base font-bold bg-blue-50 border border-blue-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="0" />
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-purple-600" />{latinToCyrillic('Karta')}</span>
                      <button type="button" onClick={fillKarta} title="Qolgan summani to'ldirish" className="p-0.5 text-indigo-400 hover:text-indigo-600 transition-colors active:scale-90"><Magnet className="w-3.5 h-3.5" /></button>
                    </label>
                    <input type="number" min="0" value={paymentForm.karta} onChange={(e) => setPaymentForm({ ...paymentForm, karta: e.target.value })}
                      className="w-full h-12 px-3 text-base font-bold bg-purple-50 border border-purple-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all" placeholder="0" />
                  </div>
                </div>
                  );
                })()}

                {/* Jami */}
                {hasAny && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{latinToCyrillic("Jami to'lov")}</p>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-xl font-bold text-emerald-700">{Math.round(totalUZS).toLocaleString()} {latinToCyrillic("so'm")}</span>
                      {kurs > 0 && <span className="text-sm font-semibold text-slate-400">≈ ${(totalUZS / kurs).toFixed(2)}</span>}
                    </div>
                  </div>
                )}

                {/* Izoh */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {latinToCyrillic('Izoh')} ({latinToCyrillic('ixtiyoriy')})
                  </label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder={latinToCyrillic("Qo'shimcha ma'lumot...")}
                  />
                </div>

                {/* Tugmalar */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {latinToCyrillic('Bekor qilish')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !hasAny}
                    className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        {latinToCyrillic('Saqlanmoqda...')}
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        {latinToCyrillic("To'lovni qabul qilish")}
                      </>
                    )}
                  </button>
                </div>
              </form>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
