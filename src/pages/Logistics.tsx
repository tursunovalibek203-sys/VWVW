import React, { useEffect, useState } from 'react';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import { useToast, toast as toastFactory } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import api from '../lib/professionalApi';
import { formatDate } from '../lib/utils';
import { latinToCyrillic, trData } from '../lib/transliterator';
import {
  Truck,
  User,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  RefreshCw,
  Plus,
  Phone,
  Star,
  Gauge,
  X,
  Loader2,
} from 'lucide-react';

const L = latinToCyrillic;

type TabKey = 'deliveries' | 'vehicles' | 'drivers';
type ModalType = 'vehicle' | 'driver' | 'delivery';
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

// Map raw backend status codes to Badge variants + human label
const statusMeta: Record<string, { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: 'warning', label: L('Kutilmoqda') },
  ASSIGNED: { variant: 'info', label: L('Tayinlangan') },
  IN_PROGRESS: { variant: 'info', label: L('Jarayonda') },
  IN_TRANSIT: { variant: 'info', label: L("Yo'lda") },
  COMPLETED: { variant: 'success', label: L('Yakunlandi') },
  DELIVERED: { variant: 'success', label: L('Yetkazildi') },
  CANCELLED: { variant: 'error', label: L('Bekor qilindi') },
  AVAILABLE: { variant: 'success', label: L("Bo'sh") },
  IN_USE: { variant: 'info', label: L('Bandlik') },
  ON_DUTY: { variant: 'info', label: L('Smenada') },
  OFF_DUTY: { variant: 'neutral', label: L('Smenadan tashqari') },
};

const getStatusMeta = (status: string) =>
  statusMeta[status] || { variant: 'neutral' as BadgeVariant, label: status || '-' };

export default function Logistics() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('deliveries');
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('vehicle');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, deliveriesRes, vehiclesRes, driversRes] = await Promise.all([
        api.get('/logistics/statistics'),
        api.get('/logistics/deliveries'),
        api.get('/logistics/vehicles'),
        api.get('/logistics/drivers'),
      ]);
      setStats(statsRes.data);
      setDeliveries(deliveriesRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      console.error("Ma'lumotlarni yuklashda xatolik");
      addToast(
        toastFactory.error(L('Xatolik'), L("Logistika ma'lumotlarini yuklashda xatolik yuz berdi"))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openModal = (type: ModalType) => {
    setModalType(type);
    setForm({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalType === 'vehicle') {
        await api.post('/logistics/vehicles', form);
        addToast(toastFactory.success(L('Mashina muvaffaqiyatli qoshildi')));
      } else if (modalType === 'driver') {
        await api.post('/logistics/drivers', form);
        addToast(toastFactory.success(L('Haydovchi muvaffaqiyatli qoshildi')));
      }
      closeModal();
      loadData();
    } catch (error: any) {
      console.error('Logistics save error:', error);
      let errorMessage = "Noma'lum xatolik";
      if (error.response) {
        errorMessage =
          error.response.data?.error ||
          error.response.data?.message ||
          `Server xatolik (${error.response.status})`;
      } else if (error.request) {
        errorMessage = "Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.";
      } else {
        errorMessage = error.message || 'Xatolik yuz berdi';
      }
      addToast(
        toastFactory.error(
          modalType === 'vehicle' ? L('Mashina saqlanmadi') : L('Haydovchi saqlanmadi'),
          L(errorMessage)
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Package; count: number }[] = [
    { key: 'deliveries', label: L('Yetkazib berishlar'), icon: Package, count: deliveries.length },
    { key: 'vehicles', label: L('Mashinalar'), icon: Truck, count: vehicles.length },
    { key: 'drivers', label: L('Haydovchilar'), icon: User, count: drivers.length },
  ];

  const summaryCards = [
    {
      label: L('Mashinalar'),
      value: stats?.vehicles?.total ?? 0,
      sub: `${L("Bo'sh")}: ${stats?.vehicles?.available ?? 0}`,
      icon: Truck,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: L('Haydovchilar'),
      value: stats?.drivers?.total ?? 0,
      sub: `${L("Bo'sh")}: ${stats?.drivers?.available ?? 0}`,
      icon: User,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: L('Yetkazib berishlar'),
      value: stats?.deliveries?.total ?? 0,
      sub: `${L("Yo'lda")}: ${stats?.deliveries?.inTransit ?? 0}`,
      icon: Package,
      tint: 'bg-sky-50 text-sky-600',
    },
  ];

  const headerCount = loading
    ? L('Yuklanmoqda...')
    : `${stats?.deliveries?.total ?? deliveries.length} ${L('ta yetkazib berish')}`;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {L('Logistika')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{headerCount}</p>
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
            {activeTab === 'vehicles' && (
              <button
                onClick={() => openModal('vehicle')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {L("Mashina qo'shish")}
              </button>
            )}
            {activeTab === 'drivers' && (
              <button
                onClick={() => openModal('driver')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {L("Haydovchi qo'shish")}
              </button>
            )}
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[116px] animate-pulse"
                />
              ))
            : summaryCards.map((card) => {
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
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.tint}`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
                  </div>
                );
              })}
        </div>

        {/* Pill tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors active:scale-[0.98] ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={6} cols={4} />
          </div>
        )}

        {/* ---------- DELIVERIES ---------- */}
        {!loading && activeTab === 'deliveries' && (
          <>
            {deliveries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70">
                <EmptyState
                  icon={Package}
                  title={L("Hali yetkazib berishlar yo'q")}
                  description={L("Yangi yetkazib berishlar shu yerda ko'rinadi")}
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
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                            {L('Mijoz')}
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                            {L('Manzil')}
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                            {L('Haydovchi / Mashina')}
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                            {L('Sana')}
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                            {L('Holat')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deliveries.map((delivery) => {
                          const meta = getStatusMeta(delivery.status);
                          return (
                            <tr
                              key={delivery.id}
                              className="group hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {(delivery.sale?.customer?.name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">
                                    {delivery.sale?.customer?.name ? trData(delivery.sale.customer.name) : L("Noma'lum")}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-start gap-1.5 text-sm text-slate-600 max-w-xs">
                                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                  <span className="break-words">{delivery.toAddress || '-'}</span>
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {delivery.driver ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-900">
                                      <User className="w-4 h-4 text-slate-400" />
                                      {trData(delivery.driver.name)}
                                    </span>
                                    {delivery.vehicle && (
                                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                                        {delivery.vehicle.plateNumber}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    {L('Tayinlanmagan')}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 tabular-nums">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  {delivery.scheduledDate ? formatDate(delivery.scheduledDate) : '-'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <Badge variant={meta.variant}>{meta.label}</Badge>
                                  {delivery.status === 'DELIVERED' && (
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {deliveries.map((delivery) => {
                    const meta = getStatusMeta(delivery.status);
                    return (
                      <div
                        key={delivery.id}
                        className="bg-white rounded-2xl border border-slate-200/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {(delivery.sale?.customer?.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {delivery.sale?.customer?.name ? trData(delivery.sale.customer.name) : L("Noma'lum")}
                              </p>
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                                <Clock className="w-3 h-3" />
                                {delivery.scheduledDate ? formatDate(delivery.scheduledDate) : '-'}
                              </p>
                            </div>
                          </div>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                          <p className="text-xs text-slate-500 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{delivery.toAddress || '-'}</span>
                          </p>
                          {delivery.driver && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {trData(delivery.driver.name)}
                              {delivery.vehicle && (
                                <>
                                  <Truck className="w-3.5 h-3.5 ml-1.5" />
                                  {delivery.vehicle.plateNumber}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ---------- VEHICLES ---------- */}
        {!loading && activeTab === 'vehicles' && (
          <>
            {vehicles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70">
                <EmptyState
                  icon={Truck}
                  title={L("Hali mashinalar yo'q")}
                  description={L("Birinchi mashinani qo'shing va u shu yerda ko'rinadi")}
                  action={
                    <button
                      onClick={() => openModal('vehicle')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      {L("Mashina qo'shish")}
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {vehicles.map((vehicle) => {
                  const meta = getStatusMeta(vehicle.status);
                  return (
                    <div
                      key={vehicle.id}
                      className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {vehicle.plateNumber}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{vehicle.model}</p>
                          </div>
                        </div>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-600">
                        <Gauge className="w-4 h-4 text-slate-400" />
                        <span>
                          {L("Sig'im")}:{' '}
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {vehicle.capacity} {L('kg')}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ---------- DRIVERS ---------- */}
        {!loading && activeTab === 'drivers' && (
          <>
            {drivers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70">
                <EmptyState
                  icon={User}
                  title={L("Hali haydovchilar yo'q")}
                  description={L("Birinchi haydovchini qo'shing va u shu yerda ko'rinadi")}
                  action={
                    <button
                      onClick={() => openModal('driver')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      {L("Haydovchi qo'shish")}
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {drivers.map((driver) => {
                  const meta = getStatusMeta(driver.status);
                  return (
                    <div
                      key={driver.id}
                      className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {(driver.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{trData(driver.name)}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {driver.phone}
                            </p>
                          </div>
                        </div>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Package className="w-4 h-4 text-slate-400" />
                          {L('Yetkazildi')}:{' '}
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {driver.totalDeliveries}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-500 tabular-nums">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          {typeof driver.rating === 'number' ? driver.rating.toFixed(1) : '0.0'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Vehicle / Driver Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={modalType === 'vehicle' ? L('Yangi mashina') : L('Yangi haydovchi')}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {modalType === 'vehicle' ? (
              <>
                <Input
                  label={L('Davlat raqami')}
                  value={form.plateNumber || ''}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                  required
                />
                <Input
                  label={L('Model')}
                  value={form.model || ''}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  required
                />
                <Input
                  label={L("Sig'im (kg)")}
                  type="number"
                  value={form.capacity || ''}
                  onChange={(e) => setForm({ ...form, capacity: parseFloat(e.target.value) })}
                  required
                />
                <div>
                  <label
                    htmlFor="vehicle-type"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    {L('Turi')}
                  </label>
                  <select
                    id="vehicle-type"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                    value={form.type || ''}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    required
                  >
                    <option value="">{L('Turini tanlang')}</option>
                    <option value="TRUCK">{L('Yuk mashinasi')}</option>
                    <option value="VAN">{L('Furgon')}</option>
                    <option value="CAR">{L('Avtomobil')}</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <Input
                  label={L('Ism')}
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  label={L('Telefon')}
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
                <Input
                  label={L('Litsenziya raqami')}
                  value={form.licenseNumber || ''}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  required
                />
                <Input
                  label={L('Litsenziya muddati')}
                  type="date"
                  value={form.licenseExpiry || ''}
                  onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                  required
                />
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
              >
                <X className="w-4 h-4" />
                {L('Bekor qilish')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {L('Saqlanmoqda...')}
                  </>
                ) : (
                  L('Saqlash')
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
