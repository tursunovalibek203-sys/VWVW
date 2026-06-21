import React, { useState, useEffect } from 'react';
import api from '../lib/professionalApi';
import {
  Truck,
  Phone,
  Star,
  MessageSquare,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Search,
  User,
  MapPin,
  Send,
  X,
  CreditCard,
  Package,
  Trash2,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  Magnet,
} from 'lucide-react';
import { latinToCyrillic, trData } from '../lib/transliterator';
import { exportToExcel } from '../lib/excelUtils';
import { useToast, toast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber: string;
  telegramChatId?: string;
  telegramUsername?: string;
  status: string;
  rating: number;
  totalDeliveries: number;
  currentLocation?: string;
  debtToCompany?: number;
  debtToCompanyUSD?: number;
  active: boolean;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
  _count?: {
    assignments: number;
  };
}

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  deliveryAddress: string;
  order: {
    orderNumber: string;
    totalAmount: number;
    customer: {
      name: string;
      phone: string;
    };
  };
}

export function Drivers() {
  const { addToast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  // UI-only states
  const [addLoading, setAddLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDriver, setPaymentDriver] = useState<Driver | null>(null);
  const [paymentUSD, setPaymentUSD] = useState('');
  const [paymentUZS, setPaymentUZS] = useState('');
  const [paymentKarta, setPaymentKarta] = useState('');
  const [paymentExchangeRate, setPaymentExchangeRate] = useState('12700');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showCancelDebt, setShowCancelDebt] = useState(false);
  const [cancelDebtNote, setCancelDebtNote] = useState('');
  const [cancelDebtLoading, setCancelDebtLoading] = useState(false);

  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    vehicleNumber: '',
    login: '',
    password: '',
    telegramBotToken: ''
  });

  useEffect(() => {
    fetchDrivers();
    fetchOrders();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Haydovchilarni yuklashda xatolik yuz berdi')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
    fetchOrders();
  };

  const handleExport = () => {
    if (drivers.length === 0) {
      addToast(toast.warning(latinToCyrillic('Diqqat'), latinToCyrillic("Haydovchilar ro'yxati bo'sh!")));
      return;
    }
    const dataToExport = drivers.map(d => ({
      'Ism': trData(d.name),
      'Telefon': d.phone,
      'Guvohnoma': d.licenseNumber,
      'Mashina': d.vehicleNumber,
      'Status': d.status,
      'Reyting': d.rating,
      'Jami yetkazish': d.totalDeliveries
    }));
    exportToExcel(dataToExport, { fileName: 'Haydovchilar', sheetName: 'Haydovchilar' });
    addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic(`${drivers.length} ta haydovchi eksport qilindi!`)));
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders?status=READY_FOR_DELIVERY');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchAssignments = async (driverId: string) => {
    try {
      const response = await api.get(`/drivers/${driverId}/assignments`);
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchChatMessages = async (driverId: string) => {
    try {
      const response = await api.get(`/drivers/${driverId}/chat`);
      setChatMessages(response.data);
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/drivers', newDriver);
      setShowAddModal(false);
      setNewDriver({
        name: '',
        phone: '',
        licenseNumber: '',
        vehicleNumber: '',
        login: '',
        password: '',
        telegramBotToken: ''
      });
      fetchDrivers();
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic("Haydovchi muvaffaqiyatli qo'shildi!")));
    } catch (error: any) {
      console.error('Error adding driver:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), error.response?.data?.error || latinToCyrillic("Haydovchi qo'shishda xatolik yuz berdi")));
    } finally {
      setAddLoading(false);
    }
  };

  const handleAssignOrder = async (orderId: string) => {
    if (!selectedDriver) return;

    try {
      await api.post(`/drivers/${selectedDriver.id}/assign-order`, { orderId });
      setShowAssignModal(false);
      fetchAssignments(selectedDriver.id);
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Buyurtma tayinlandi!')));
    } catch (error) {
      console.error('Error assigning order:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Buyurtma tayinlashda xatolik yuz berdi')));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !newMessage.trim()) return;

    setSendLoading(true);
    try {
      await api.post(`/drivers/${selectedDriver.id}/chat`, { message: newMessage });
      setNewMessage('');
      fetchChatMessages(selectedDriver.id);
    } catch (error) {
      console.error('Error sending message:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Xabar yuborishda xatolik yuz berdi')));
    } finally {
      setSendLoading(false);
    }
  };

  const updateDriverStatus = async (driverId: string, status: string) => {
    setStatusUpdatingId(driverId);
    try {
      await api.put(`/drivers/${driverId}/status`, { status });
      fetchDrivers();
    } catch (error) {
      console.error('Error updating status:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Statusni yangilashda xatolik yuz berdi')));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    const id = driverToDelete.id;
    try {
      await api.delete(`/drivers/${id}`);
      setDrivers(prev => prev.filter(d => d.id !== id));
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic("Haydovchi o'chirildi!")));
    } catch (error) {
      console.error('Error deleting driver:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic("Haydovchini o'chirishda xatolik yuz berdi")));
    } finally {
      setDriverToDelete(null);
    }
  };

  const openPaymentModal = (driver: Driver) => {
    setPaymentDriver(driver);
    setPaymentUSD('');
    setPaymentUZS('');
    setPaymentKarta('');
    setPaymentExchangeRate('12700');
    setPaymentNotes('');
    setShowCancelDebt(false);
    setCancelDebtNote('');
    setShowPaymentModal(true);
  };

  const handleDriverPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDriver) return;
    const usd = parseFloat(paymentUSD) || 0;
    const uzs = parseFloat(paymentUZS) || 0;
    const karta = parseFloat(paymentKarta) || 0;
    if (usd <= 0 && uzs <= 0 && karta <= 0) return;
    setPaymentLoading(true);
    try {
      await api.post(`/drivers/${paymentDriver.id}/payment`, {
        amountUSD: usd,
        amountUZS: uzs,
        amountKarta: karta,
        exchangeRate: parseFloat(paymentExchangeRate) || 12700,
        notes: paymentNotes,
      });
      setShowPaymentModal(false);
      fetchDrivers();
      const parts = [];
      if (usd > 0)   parts.push(`$${usd.toLocaleString()}`);
      if (uzs > 0)   parts.push(`${uzs.toLocaleString()} UZS`);
      if (karta > 0) parts.push(`${karta.toLocaleString()} UZS (${latinToCyrillic('karta')})`);
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), `${trData(paymentDriver.name)}: ${parts.join(' + ')} ${latinToCyrillic('qabul qilindi')}`));
    } catch (error: any) {
      addToast(toast.error(latinToCyrillic('Xatolik'), error.response?.data?.error || latinToCyrillic("To'lovda xatolik yuz berdi")));
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelDebt = async () => {
    if (!paymentDriver) return;
    setCancelDebtLoading(true);
    try {
      const result = await api.post(`/drivers/${paymentDriver.id}/cancel-debt`, {
        note: cancelDebtNote,
      });
      setShowPaymentModal(false);
      fetchDrivers();
      const data = result.data;
      const parts = [];
      if (data.transferredUSD > 0) parts.push(`$${data.transferredUSD.toLocaleString()}`);
      if (data.transferredUZS > 0) parts.push(`${Math.round(data.transferredUZS).toLocaleString()} UZS`);
      const msg = parts.length > 0
        ? `${trData(paymentDriver.name)}: ${parts.join(' + ')} ${latinToCyrillic("mijozlarga o'tkazildi")}`
        : `${trData(paymentDriver.name)}: ${latinToCyrillic('qarz bekor qilindi')}`;
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), msg));
    } catch (error: any) {
      addToast(toast.error(latinToCyrillic('Xatolik'), error.response?.data?.error || latinToCyrillic('Xatolik yuz berdi')));
    } finally {
      setCancelDebtLoading(false);
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'AVAILABLE': return 'success';
      case 'BUSY': return 'warning';
      case 'OFFLINE': return 'neutral';
      default: return 'neutral';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return latinToCyrillic('Mavjud');
      case 'BUSY': return latinToCyrillic('Band');
      case 'OFFLINE': return latinToCyrillic('Offline');
      default: return status;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // Avatar: soft slate tint (premium, not rainbow). Mirrors CustomersModern standard.
  const avatarTint = (_status: string) => 'bg-slate-100 text-slate-600';

  const filteredDrivers = drivers.filter(d =>
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.phone || '').includes(searchTerm) ||
    (d.vehicleNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasActiveFilters = !!searchTerm;
  const availableCount = drivers.filter(d => d.status === 'AVAILABLE').length;
  const busyCount = drivers.filter(d => d.status === 'BUSY').length;

  const totalDebt = drivers.reduce((sum, d) => sum + (d.debtToCompany || 0), 0);

  const stats = [
    {
      label: latinToCyrillic('Jami haydovchilar'),
      value: drivers.length.toLocaleString('en-US'),
      icon: Users,
      tint: 'bg-sky-50 text-sky-600',
    },
    {
      label: latinToCyrillic('Mavjud'),
      value: availableCount.toLocaleString('en-US'),
      icon: CheckCircle2,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: latinToCyrillic('Jami qarz (UZS)'),
      value: Math.round(totalDebt).toLocaleString('en-US'),
      icon: Clock,
      tint: totalDebt > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: clean title + count + actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Haydovchilar')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 tabular-nums">
            {loading
              ? latinToCyrillic('Yuklanmoqda...')
              : `${filteredDrivers.length.toLocaleString('en-US')} ${latinToCyrillic('ta haydovchi')}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
            title={latinToCyrillic('Barcha haydovchilarni eksport qilish')}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{latinToCyrillic('Excel')}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {latinToCyrillic("Yangi haydovchi")}
          </button>
        </div>
      </div>

      {/* Stat cards: premium white */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[104px] animate-pulse" />
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
                  <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
                    {stat.value}
                  </p>
                </div>
              );
            })}
      </div>

      {/* Search card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
          <input
            id="drivers-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={latinToCyrillic('Ism, telefon yoki mashina raqami...')}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
          <TableSkeleton rows={8} cols={6} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredDrivers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={Truck}
            title={
              hasActiveFilters
                ? latinToCyrillic('Haydovchilar topilmadi')
                : latinToCyrillic("Hali haydovchilar yo'q")
            }
            description={
              hasActiveFilters
                ? latinToCyrillic("Qidiruv shartlarini o'zgartirib qayta urinib ko'ring")
                : latinToCyrillic("Birinchi haydovchini qo'shing va u shu yerda ko'rinadi")
            }
            action={
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {latinToCyrillic("Yangi haydovchi")}
              </button>
            }
          />
        </div>
      )}

      {/* Drivers table (desktop) */}
      {!loading && filteredDrivers.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Haydovchi')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Aloqa')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Guvohnoma / Mashina')}</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Qarz (UZS)')}</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Status')}</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Amallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarTint(driver.status)}`}>
                          {getInitials(trData(driver.name))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{trData(driver.name)}</p>
                          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                            {driver.totalDeliveries} {latinToCyrillic('ta yetkazish')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600 flex items-center gap-1.5 tabular-nums">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {driver.phone}
                        </p>
                        {driver.currentLocation && (
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{trData(driver.currentLocation)}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          {driver.licenseNumber || <span className="text-slate-300">&mdash;</span>}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                          {driver.vehicleNumber || <span className="text-slate-300">&mdash;</span>}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {(() => {
                        const usdDebt = driver.debtToCompanyUSD || 0;
                        const uzsTotal = driver.debtToCompany || 0;
                        const rate = parseFloat(paymentExchangeRate) || 12700;
                        const pureUZS = Math.max(0, Math.round(uzsTotal - usdDebt * rate));
                        if (usdDebt <= 0 && uzsTotal <= 0) return <span className="text-slate-300 text-sm">—</span>;
                        return (
                          <div className="flex flex-col items-center gap-0.5">
                            {usdDebt > 0 && (
                              <span className="text-sm font-bold text-amber-600 tabular-nums">
                                ${usdDebt.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            )}
                            {pureUZS > 1000 && (
                              <span className="text-xs font-semibold text-amber-500 tabular-nums">
                                {pureUZS.toLocaleString()} UZS
                              </span>
                            )}
                            {usdDebt <= 0 && uzsTotal > 0 && pureUZS <= 1000 && (
                              <span className="text-xs font-semibold text-amber-500 tabular-nums">
                                {Math.round(uzsTotal).toLocaleString()} UZS
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge variant={getStatusVariant(driver.status)}>
                        {getStatusText(driver.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {(driver.debtToCompany || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(driver)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title={latinToCyrillic('Pul topshirdi')}
                          >
                            <Send className="w-3.5 h-3.5" />
                            {latinToCyrillic('Pul topshirdi')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDriver(driver);
                            fetchAssignments(driver.id);
                            setShowAssignModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          aria-label={latinToCyrillic('Buyurtma tayinlash')}
                          title={latinToCyrillic('Buyurtma tayinlash')}
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDriver(driver);
                            fetchChatMessages(driver.id);
                            setShowChatModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          aria-label="Chat"
                          title="Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDriverStatus(driver.id, driver.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE')}
                          disabled={statusUpdatingId === driver.id}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            driver.status === 'AVAILABLE'
                              ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                              : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          aria-label={driver.status === 'AVAILABLE' ? latinToCyrillic('Offline qilish') : latinToCyrillic('Online qilish')}
                          title={driver.status === 'AVAILABLE' ? latinToCyrillic('Offline qilish') : latinToCyrillic('Online qilish')}
                        >
                          {statusUpdatingId === driver.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDriverToDelete(driver)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          aria-label={latinToCyrillic("Haydovchini o'chirish")}
                          title={latinToCyrillic("O'chirish")}
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
      )}

      {/* Drivers cards (mobile) */}
      {!loading && filteredDrivers.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-2xl border border-slate-200/70 p-4 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarTint(driver.status)}`}>
                    {getInitials(trData(driver.name))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{trData(driver.name)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                      <Phone className="w-3 h-3" />
                      {driver.phone}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(driver.status)}>
                  {getStatusText(driver.status)}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Yetkazishlar')}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">{driver.totalDeliveries}</p>
                </div>
                <div className={`rounded-xl p-3 ${(driver.debtToCompany || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wide ${(driver.debtToCompany || 0) > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{latinToCyrillic('Qarz (UZS)')}</p>
                  <p className={`mt-0.5 text-sm font-bold tabular-nums ${(driver.debtToCompany || 0) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                    {(driver.debtToCompany || 0) > 0 ? Math.round(driver.debtToCompany!).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{driver.licenseNumber || '—'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Truck className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{driver.vehicleNumber || '—'}</span>
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1 flex-wrap">
                {(driver.debtToCompany || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => openPaymentModal(driver)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {latinToCyrillic('Pul topshirdi')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDriver(driver);
                    fetchAssignments(driver.id);
                    setShowAssignModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  {latinToCyrillic('Buyurtma')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDriver(driver);
                    fetchChatMessages(driver.id);
                    setShowChatModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => updateDriverStatus(driver.id, driver.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE')}
                  disabled={statusUpdatingId === driver.id}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  aria-label={driver.status === 'AVAILABLE' ? latinToCyrillic('Offline qilish') : latinToCyrillic('Online qilish')}
                >
                  {statusUpdatingId === driver.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setDriverToDelete(driver)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  aria-label={latinToCyrillic("Haydovchini o'chirish")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation (replaces window.confirm) */}
      <ConfirmDialog
        isOpen={driverToDelete !== null}
        onClose={() => setDriverToDelete(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={latinToCyrillic("Haydovchini o'chirish")}
        message={
          driverToDelete
            ? latinToCyrillic(`"${trData(driverToDelete.name)}" haydovchisini rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)
            : ''
        }
        confirmText={latinToCyrillic("O'chirish")}
        cancelText={latinToCyrillic('Bekor qilish')}
      />

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <User className="w-5 h-5" />
                </span>
                {latinToCyrillic('Yangi haydovchi')}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                aria-label={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="driver-name" className="block text-xs font-semibold text-slate-600">{latinToCyrillic('Ism')} <span className="text-rose-500">*</span></label>
                  <input
                    id="driver-name"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="driver-phone" className="block text-xs font-semibold text-slate-600">{latinToCyrillic('Telefon')}</label>
                  <input
                    id="driver-phone"
                    placeholder="+998901234567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="driver-license" className="block text-xs font-semibold text-slate-600">{latinToCyrillic('Guvohnoma raqami')}</label>
                  <input
                    id="driver-license"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    value={newDriver.licenseNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="driver-vehicle" className="block text-xs font-semibold text-slate-600">{latinToCyrillic('Mashina raqami')}</label>
                  <input
                    id="driver-vehicle"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    value={newDriver.vehicleNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, vehicleNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="driver-login" className="block text-xs font-semibold text-slate-600">{latinToCyrillic('Login')} ({latinToCyrillic('ixtiyoriy')})</label>
                <input
                  id="driver-login"
                  type="text"
                  placeholder="driver_login"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  value={newDriver.login}
                  onChange={(e) => setNewDriver({ ...newDriver, login: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {latinToCyrillic('Bekor qilish')}
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {latinToCyrillic("Qo'shish")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Order Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Package className="w-5 h-5" />
                </span>
                {latinToCyrillic('Buyurtma tayinlash')}
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                aria-label={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">{latinToCyrillic('Tayyor buyurtmalar')}</h4>
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 bg-slate-50 rounded-xl flex justify-between items-center gap-3 hover:bg-indigo-50/60 transition-colors border border-transparent hover:border-indigo-100">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate tabular-nums">#{order.orderNumber}</p>
                        <p className="text-xs text-slate-500 truncate">{trData(order.customer?.name)}</p>
                      </div>
                      <button
                        onClick={() => handleAssignOrder(order.id)}
                        className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors active:scale-[0.98]"
                      >
                        {latinToCyrillic('Tayinlash')}
                      </button>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-400">{latinToCyrillic("Tayyor buyurtmalar yo'q")}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">{latinToCyrillic('Joriy buyurtmalar')}</h4>
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="p-4 bg-white rounded-xl border border-slate-200/70 flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate tabular-nums">#{assignment.order.orderNumber}</p>
                        <p className="text-xs text-slate-500 truncate">{trData(assignment.order.customer?.name)}</p>
                      </div>
                      <Badge variant={getStatusVariant(assignment.status)}>{assignment.status}</Badge>
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">{latinToCyrillic("Joriy buyurtmalar yo'q")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg h-[80vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarTint(selectedDriver?.status || '')}`}>
                  {selectedDriver ? getInitials(trData(selectedDriver.name)) : '?'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{trData(selectedDriver?.name || '')}</h3>
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {latinToCyrillic('Onlayn chat')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0"
                aria-label={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
                    message.senderType === 'ADMIN'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white text-slate-900 border border-slate-200/70 rounded-tl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    <p className={`text-[10px] mt-1 tabular-nums ${message.senderType === 'ADMIN' ? 'text-white/60' : 'text-slate-400'}`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-slate-300">
                  <MessageSquare className="w-12 h-12" />
                  <p className="text-sm font-medium text-slate-400">{latinToCyrillic("Hali xabarlar yo'q")}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200/70 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={latinToCyrillic('Xabar yozing...')}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !newMessage.trim()}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors active:scale-[0.98] flex-shrink-0"
                  aria-label={latinToCyrillic('Xabar yuborish')}
                >
                  {sendLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentDriver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <Send className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">{latinToCyrillic('Pul topshirdi')}</h3>
                  <p className="text-xs text-slate-400 truncate">{trData(paymentDriver.name)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDriverPayment} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Joriy qarz */}
              <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-amber-700">{latinToCyrillic('Joriy qarz')}</span>
                <span className="text-sm font-bold text-amber-800 tabular-nums">
                  {Math.round(paymentDriver.debtToCompany || 0).toLocaleString()} UZS
                </span>
              </div>

              {/* Kurs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  {latinToCyrillic('Kurs')} (1 USD = ? UZS)
                </label>
                <input type="number" min="1" placeholder="12700"
                  value={paymentExchangeRate}
                  onChange={e => setPaymentExchangeRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 focus:bg-white transition-all"
                />
              </div>

              {/* 3 ta input */}
              {(() => {
                const _rate = parseFloat(paymentExchangeRate) || 12700;
                const _uzs = parseFloat(paymentUZS) || 0;
                const _usd = parseFloat(paymentUSD) || 0;
                const _karta = parseFloat(paymentKarta) || 0;
                const totalDebt = paymentDriver?.debtToCompany || 0;
                const fUSD  = () => { const r = Math.max(0, (totalDebt - _uzs - _karta) / _rate); setPaymentUSD(r > 0 ? r.toFixed(2) : '0'); };
                const fUZS  = () => setPaymentUZS(String(Math.max(0, Math.round(totalDebt - _usd * _rate - _karta))));
                const fKarta = () => setPaymentKarta(String(Math.max(0, Math.round(totalDebt - _uzs - _usd * _rate))));
                return (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{latinToCyrillic('Topshirilgan summalar')}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 w-20 flex-shrink-0">💵 USD ($)</span>
                  <input type="number" min="0" placeholder="0" value={paymentUSD} onChange={e => setPaymentUSD(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 focus:bg-white transition-all" />
                  <button type="button" onClick={fUSD} title="Qolgan summani to'ldirish" className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors active:scale-90 flex-shrink-0"><Magnet className="w-4 h-4" /></button>
                  {paymentUSD && parseFloat(paymentUSD) > 0 && (
                    <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">≈ {Math.round(parseFloat(paymentUSD) * _rate).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 w-20 flex-shrink-0">💴 {latinToCyrillic('Naqd')}</span>
                  <input type="number" min="0" placeholder="0" value={paymentUZS} onChange={e => setPaymentUZS(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 focus:bg-white transition-all" />
                  <button type="button" onClick={fUZS} title="Qolgan summani to'ldirish" className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors active:scale-90 flex-shrink-0"><Magnet className="w-4 h-4" /></button>
                  {paymentUZS && parseFloat(paymentUZS) > 0 && <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">UZS</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-600 w-20 flex-shrink-0">💳 {latinToCyrillic('Karta')}</span>
                  <input type="number" min="0" placeholder="0" value={paymentKarta} onChange={e => setPaymentKarta(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 focus:bg-white transition-all" />
                  <button type="button" onClick={fKarta} title="Qolgan summani to'ldirish" className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors active:scale-90 flex-shrink-0"><Magnet className="w-4 h-4" /></button>
                  {paymentKarta && parseFloat(paymentKarta) > 0 && <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">UZS</span>}
                </div>
              </div>
                );
              })()}

              {/* Jami va qolgan qarz */}
              {(() => {
                const usd = parseFloat(paymentUSD) || 0;
                const uzs = parseFloat(paymentUZS) || 0;
                const karta = parseFloat(paymentKarta) || 0;
                const rate = parseFloat(paymentExchangeRate) || 12700;
                const totalUZS = usd * rate + uzs + karta;
                if (totalUZS <= 0) return null;
                const remaining = Math.max(0, Math.round((paymentDriver.debtToCompany || 0) - totalUZS));
                return (
                  <div className="bg-emerald-50 rounded-xl px-4 py-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700 font-medium">{latinToCyrillic('Jami (UZS)')}</span>
                      <span className="font-bold text-emerald-800 tabular-nums">{Math.round(totalUZS).toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{latinToCyrillic('Qolgan qarz')}</span>
                      <span className={`font-semibold tabular-nums ${remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {remaining.toLocaleString()} UZS
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  {latinToCyrillic('Izoh')} <span className="text-slate-300 font-normal">({latinToCyrillic('ixtiyoriy')})</span>
                </label>
                <input type="text" placeholder={latinToCyrillic('Ixtiyoriy...')}
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 focus:bg-white transition-all"
                />
              </div>

              {/* Qarzni bekor qilish */}
              <div className="border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setShowCancelDebt(!showCancelDebt)}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors">
                  {showCancelDebt ? '▲' : '▼'} {latinToCyrillic('Qarzni bekor qilish (kassaga tushmaydi)')}
                </button>
                {showCancelDebt && (
                  <div className="mt-3 space-y-3">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-semibold text-rose-700">
                        {latinToCyrillic('Diqqat!')}
                      </p>
                      <p className="text-xs text-rose-600 mt-0.5">
                        {latinToCyrillic("Haydovchining barcha kutayotgan sotuvlari avtomatik ravishda mijozlarga o'tkaziladi. Kassaga pul tushmaydi.")}
                      </p>
                    </div>
                    <input type="text" placeholder={latinToCyrillic('Sabab (ixtiyoriy)')}
                      value={cancelDebtNote}
                      onChange={e => setCancelDebtNote(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 focus:bg-white transition-all"
                    />
                    <button type="button" onClick={handleCancelDebt}
                      disabled={cancelDebtLoading}
                      className="w-full py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200">
                      {cancelDebtLoading
                        ? latinToCyrillic('Yuklanmoqda...')
                        : latinToCyrillic("Bekor qil — qarz mijozlarga o'tkazilsin")
                      }
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  {latinToCyrillic('Bekor')}
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading || ((parseFloat(paymentUSD) || 0) <= 0 && (parseFloat(paymentUZS) || 0) <= 0 && (parseFloat(paymentKarta) || 0) <= 0)}
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paymentLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {latinToCyrillic('Tasdiqlash')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
