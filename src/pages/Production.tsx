import { useEffect, useState } from 'react';
import ProductSelector from '../components/ProductSelector';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { Badge } from '../components/ui/Badge';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { useToast, toast as toastFactory } from '../components/ui/Toast';
import api from '../lib/professionalApi';
import { formatDate } from '../lib/utils';
import { latinToCyrillic } from '../lib/transliterator';
import {
  Factory,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Package,
  X,
  RefreshCw,
  Hash,
  Calendar,
  Loader2,
  Layers,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const L = latinToCyrillic;

type StatusKey = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusConfig: Record<
  StatusKey,
  { label: string; variant: 'info' | 'warning' | 'success' | 'error'; icon: typeof Clock }
> = {
  PLANNED: { label: L('Rejalashtirilgan'), variant: 'info', icon: Clock },
  IN_PROGRESS: { label: L('Jarayonda'), variant: 'warning', icon: Play },
  COMPLETED: { label: L('Tugallangan'), variant: 'success', icon: CheckCircle },
  CANCELLED: { label: L('Bekor qilingan'), variant: 'error', icon: XCircle },
};

const getStatusMeta = (status: string) =>
  statusConfig[status as StatusKey] || {
    label: status,
    variant: 'neutral' as const,
    icon: Factory,
  };

export default function Production() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // ── Partiyalar (Batch) ─────────────────────────────────────────────────────
  const [activeTab,          setActiveTab]          = useState<'orders' | 'batches'>('orders');
  const [batches,            setBatches]            = useState<any[]>([]);
  const [batchStats,         setBatchStats]         = useState<any>(null);
  const [batchTotal,         setBatchTotal]         = useState(0);
  const [batchProductFilter, setBatchProductFilter] = useState('');
  const [batchLoading,       setBatchLoading]       = useState(false);
  const [showBatchForm,      setShowBatchForm]      = useState(false);
  const [submittingBatch,    setSubmittingBatch]    = useState(false);
  const [batchForm,          setBatchForm]          = useState({
    productId: '', productName: '',
    quantity: '', productionDate: '',
    shift: 'Kunduzgi', responsiblePerson: '',
  });

  // Confirm dialog (replaces alert / window.confirm)
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmText: L('Tasdiqlash'),
    variant: 'warning',
    onConfirm: () => {},
  });

  const [form, setForm] = useState({
    productId: '',
    productName: '',
    targetQuantity: '',
    plannedDate: '',
    shift: 'Kunduzgi',
    supervisorId: '',
    notes: '',
    accessories: [] as any[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/production/orders'),
        api.get('/products'),
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data?.data || productsRes.data || []);
    } catch (error) {
      console.error('Ishlab chiqarish buyurtmalarini yuklashda xatolik');
      addToast(
        toastFactory.error(L('Xatolik'), L("Ma'lumotlarni yuklashda xatolik yuz berdi"))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    if (activeTab === 'batches') loadBatchData();
  };

  const loadBatchData = async (productId?: string) => {
    setBatchLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (productId) params.set('productId', productId);
      const [batchRes, statsRes] = await Promise.all([
        api.get(`/production/batches?${params}`),
        api.get('/production/batches/stats'),
      ]);
      setBatches(batchRes.data?.batches || []);
      setBatchTotal(batchRes.data?.total || 0);
      setBatchStats(statsRes.data || null);
    } catch {
      addToast(toastFactory.error(L('Xatolik'), L("Partiyalarni yuklashda xatolik")));
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.productId || !batchForm.quantity || +batchForm.quantity <= 0) return;
    setSubmittingBatch(true);
    try {
      await api.post('/production/batches', {
        productId:        batchForm.productId,
        quantity:         +batchForm.quantity,
        productionDate:   batchForm.productionDate || new Date().toISOString(),
        shift:            batchForm.shift,
        responsiblePerson: batchForm.responsiblePerson || L("Noma'lum"),
      });
      setShowBatchForm(false);
      setBatchForm({ productId: '', productName: '', quantity: '', productionDate: '', shift: 'Kunduzgi', responsiblePerson: '' });
      addToast(toastFactory.success(L('Partiya qo\'shildi')));
      loadBatchData(batchProductFilter || undefined);
    } catch {
      addToast(toastFactory.error(L('Xatolik'), L('Partiya yaratilmadi')));
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Batch tab aktivlashganda ma'lumotlarni yuklash
  const handleTabChange = (tab: 'orders' | 'batches') => {
    setActiveTab(tab);
    if (tab === 'batches' && batches.length === 0) loadBatchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const notesWithAccessories =
        form.accessories.length > 0
          ? `${form.notes}\n\nAksessuarlar:\n${form.accessories
              .map((a) => `- ${a.name}: ${a.quantity} dona (Narxi: ${a.price || 0})`)
              .join('\n')}`
          : form.notes;

      await api.post('/production/orders', {
        ...form,
        targetQuantity: parseInt(form.targetQuantity) || 0,
        plannedDate: new Date(form.plannedDate),
        notes: notesWithAccessories,
      });
      setShowForm(false);
      setForm({
        productId: '',
        productName: '',
        targetQuantity: '',
        plannedDate: '',
        shift: 'Kunduzgi',
        supervisorId: '',
        notes: '',
        accessories: [],
      });
      setProductSearch('');
      addToast(toastFactory.success(L('Buyurtma muvaffaqiyatli yaratildi')));
      loadData();
    } catch (error) {
      addToast(toastFactory.error(L('Buyurtma yaratilmadi'), L('Xatolik yuz berdi')));
    } finally {
      setSubmitting(false);
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.put(`/production/orders/${id}/status`, { status });
      addToast(toastFactory.success(L('Holat yangilandi')));
      loadData();
    } catch (error) {
      addToast(toastFactory.error(L('Xatolik'), L('Status yangilanmadi')));
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm helpers for destructive / forward transitions
  const requestStart = (id: string) =>
    setConfirmState({
      open: true,
      title: L('Ishlab chiqarishni boshlash'),
      message: L('Bu buyurtmani jarayonga otkazmoqchimisiz?'),
      confirmText: L('Boshlash'),
      variant: 'info',
      onConfirm: () => updateOrderStatus(id, 'IN_PROGRESS'),
    });

  const requestComplete = (id: string) =>
    setConfirmState({
      open: true,
      title: L('Ishlab chiqarishni tugatish'),
      message: L('Bu buyurtmani tugallangan deb belgilamoqchimisiz?'),
      confirmText: L('Tugatish'),
      variant: 'info',
      onConfirm: () => updateOrderStatus(id, 'COMPLETED'),
    });

  const requestCancel = (id: string) =>
    setConfirmState({
      open: true,
      title: L('Buyurtmani bekor qilish'),
      message: L('Buyurtmani bekor qilmoqchimisiz? Bu amalni qaytarib bolmaydi.'),
      confirmText: L('Bekor qilish'),
      variant: 'danger',
      onConfirm: () => updateOrderStatus(id, 'CANCELLED'),
    });

  // Stats
  const stats = [
    {
      label: L('Rejalashtirilgan'),
      value: orders.filter((o) => o.status === 'PLANNED').length,
      icon: Clock,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: L('Jarayonda'),
      value: orders.filter((o) => o.status === 'IN_PROGRESS').length,
      icon: Play,
      tint: 'bg-amber-50 text-amber-600',
    },
    {
      label: L('Tugallangan'),
      value: orders.filter((o) => o.status === 'COMPLETED').length,
      icon: CheckCircle,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: L('Samaradorlik'),
      value:
        orders.length > 0
          ? Math.round(
              (orders.filter((o) => o.status === 'COMPLETED').length / orders.length) * 100
            )
          : 0,
      suffix: '%',
      icon: Factory,
      tint: 'bg-sky-50 text-sky-600',
    },
  ];

  const renderProgress = (order: any) => {
    const target = Number(order.targetQuantity) || 0;
    const actual = Number(order.actualQuantity) || 0;
    const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
    const done = order.status === 'COMPLETED';
    return (
      <div className="min-w-[140px]">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-sm font-bold text-slate-900 tabular-nums">
            {actual}
            <span className="text-slate-400 font-medium"> / {target}</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-400">{L('QOP')}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              done ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('Ishlab Chiqarish')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeTab === 'orders'
                ? (loading ? L('Yuklanmoqda...') : `${orders.length} ${L('ta buyurtma')}`)
                : (batchLoading ? L('Yuklanmoqda...') : `${batchTotal} ${L('ta partiya')}`)}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading || batchLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{L('Yangilash')}</span>
            </button>
            {activeTab === 'orders' ? (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {t('Yangi ishlab chiqarish')}
              </button>
            ) : (
              <button
                onClick={() => setShowBatchForm(true)}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {L('Yangi partiya')}
              </button>
            )}
          </div>
        </div>

        {/* Tab tugmalari */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {(['orders', 'batches'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'orders' ? L('Buyurtmalar') : L('Partiyalar')}
            </button>
          ))}
        </div>

        {/* ── Buyurtmalar tab ──────────────────────────────────────────────────── */}
        {activeTab === 'orders' && <>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[116px] animate-pulse"
                />
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
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.tint}`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                      {stat.value}
                      {stat.suffix && (
                        <span className="text-base text-slate-400 font-semibold">{stat.suffix}</span>
                      )}
                    </p>
                  </div>
                );
              })}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        )}

        {/* Empty state */}
        {!loading && orders.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70">
            <EmptyState
              icon={Factory}
              title={L("Hali ishlab chiqarish buyurtmalari yo'q")}
              description={L("Birinchi buyurtmani yarating va u shu yerda ko'rinadi")}
              action={
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {L('Yangi ishlab chiqarish')}
                </button>
              }
            />
          </div>
        )}

        {/* Orders table (desktop) */}
        {!loading && orders.length > 0 && (
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/60">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Buyurtma')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Mahsulot')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Bajarilishi')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Sana / Smena')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Holat')}
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Amallar')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const meta = getStatusMeta(order.status);
                    const busy = updatingId === order.id;
                    return (
                      <tr key={order.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Hash className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900 tabular-nums">
                              {order.orderNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {order.product?.name || L("Noma'lum")}
                              </p>
                              {order.product?.bagType && (
                                <p className="text-xs text-slate-400 truncate">
                                  {order.product.bagType}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">{renderProgress(order)}</td>
                        <td className="px-5 py-4">
                          <div className="text-sm">
                            <span className="inline-flex items-center gap-1.5 text-slate-600 tabular-nums">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {order.plannedDate ? formatDate(order.plannedDate) : '-'}
                            </span>
                            {order.shift && (
                              <p className="text-xs text-indigo-600 font-medium mt-0.5 ml-5">
                                {order.shift}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status === 'PLANNED' && (
                              <button
                                type="button"
                                onClick={() => requestStart(order.id)}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-600 hover:text-white hover:bg-amber-500 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors"
                                title={L('Boshlash')}
                              >
                                {busy ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                                {L('Boshlash')}
                              </button>
                            )}
                            {order.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                onClick={() => requestComplete(order.id)}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 hover:text-white hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors"
                                title={L('Tugatish')}
                              >
                                {busy ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                {L('Tugatish')}
                              </button>
                            )}
                            {(order.status === 'PLANNED' ||
                              order.status === 'IN_PROGRESS') && (
                              <button
                                type="button"
                                onClick={() => requestCancel(order.id)}
                                disabled={busy}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-lg transition-colors"
                                aria-label={L('Bekor qilish')}
                                title={L('Bekor qilish')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {(order.status === 'COMPLETED' ||
                              order.status === 'CANCELLED') && (
                              <span className="text-xs text-slate-300">—</span>
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
        )}

        {/* Orders cards (mobile) */}
        {!loading && orders.length > 0 && (
          <div className="md:hidden space-y-3">
            {orders.map((order) => {
              const meta = getStatusMeta(order.status);
              const busy = updatingId === order.id;
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/70 p-4 cursor-default"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {order.product?.name || L("Noma'lum")}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                          <Hash className="w-3 h-3" />
                          {order.orderNumber}
                        </p>
                      </div>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>

                  <div className="mt-3">{renderProgress(order)}</div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 inline-flex items-center gap-1.5 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {order.plannedDate ? formatDate(order.plannedDate) : '-'}
                      {order.shift && (
                        <span className="text-indigo-600 font-medium">· {order.shift}</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {order.status === 'PLANNED' && (
                        <button
                          type="button"
                          onClick={() => requestStart(order.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 disabled:opacity-50 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                        >
                          {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          {L('Boshlash')}
                        </button>
                      )}
                      {order.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={() => requestComplete(order.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 disabled:opacity-50 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                        >
                          {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          {L('Tugatish')}
                        </button>
                      )}
                      {(order.status === 'PLANNED' || order.status === 'IN_PROGRESS') && (
                        <button
                          type="button"
                          onClick={() => requestCancel(order.id)}
                          disabled={busy}
                          className="p-2 bg-rose-50 text-rose-600 disabled:opacity-50 rounded-lg active:scale-95 transition-all"
                          aria-label={L('Bekor qilish')}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        </> /* end activeTab === 'orders' */}

        {/* ── Partiyalar tab ───────────────────────────────────────────────────── */}
        {activeTab === 'batches' && <>

          {/* Batch stats */}
          {batchStats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: L('Bugun'), value: batchStats.today?.qty ?? 0, sub: `${batchStats.today?.count ?? 0} ta partiya`, tint: 'bg-indigo-50 text-indigo-600', icon: Factory },
                { label: L('Bu hafta'), value: batchStats.week?.qty ?? 0, sub: `${batchStats.week?.count ?? 0} ta partiya`, tint: 'bg-violet-50 text-violet-600', icon: Layers },
                { label: L('Bu oy'), value: batchStats.month?.qty ?? 0, sub: `${batchStats.month?.count ?? 0} ta partiya`, tint: 'bg-emerald-50 text-emerald-600', icon: Package },
                { label: L('Haftalik o\'rtacha'), value: batchStats.week?.count ? Math.round((batchStats.week?.qty ?? 0) / 7) : 0, sub: L('qop/kun'), tint: 'bg-amber-50 text-amber-600', icon: CheckCircle },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-slate-200/70 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.tint}`}><Icon className="w-[18px] h-[18px]" /></div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{s.value.toLocaleString()} <span className="text-sm font-medium text-slate-400">qop</span></p>
                    <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Haftalik grafik */}
          {batchStats?.weeklyTrend?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">{L('Haftalik ishlab chiqarish (qop)')}</p>
              <div className="flex items-end gap-2 h-24">
                {batchStats.weeklyTrend.map((d: any) => {
                  const max = Math.max(...batchStats.weeklyTrend.map((x: any) => x.total), 1);
                  const h = Math.max(4, Math.round((d.total / max) * 100));
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500 tabular-nums">{d.total > 0 ? d.total : ''}</span>
                      <div className={`w-full rounded-t-md ${d.isToday ? 'bg-violet-500' : 'bg-slate-200'}`} style={{ height: `${h}%` }} title={`${d.day}: ${d.total} qop`} />
                      <span className={`text-[10px] ${d.isToday ? 'text-violet-600 font-bold' : 'text-slate-400'}`}>{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mahsulot filtri */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <select
                aria-label={L('Mahsulot tanlash')}
                value={batchProductFilter}
                onChange={e => {
                  setBatchProductFilter(e.target.value);
                  loadBatchData(e.target.value || undefined);
                }}
                className="w-full pl-4 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">{L("Barcha mahsulotlar")}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {/* Top mahsulotlar */}
            {batchStats?.topProducts?.map((tp: any) => (
              <button
                key={tp.productId}
                onClick={() => { setBatchProductFilter(tp.productId); loadBatchData(tp.productId); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  batchProductFilter === tp.productId
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {tp.name} · {tp.qty.toLocaleString()} qop
              </button>
            ))}
          </div>

          {/* Batch jadval */}
          {batchLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
              <div className="space-y-3">{[0,1,2,3,4].map(i=><div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
            </div>
          ) : batches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-10 text-center">
              <Factory className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">{L("Partiyalar yo'q")}</p>
              <p className="text-sm text-slate-400 mt-1">{L("Birinchi partiyani qo'shing")}</p>
              <button onClick={() => setShowBatchForm(true)} className="mt-4 inline-flex items-center gap-2 bg-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-violet-700 transition-colors">
                <Plus className="w-4 h-4" />{L("Yangi partiya")}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200/70 bg-slate-50/60">
                      {[L('Mahsulot'), L('Miqdor'), L('Sana va vaqt'), L('Smena'), L('Mas\'ul shaxs')].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map(b => {
                      const dt = new Date(b.productionDate);
                      const dateStr = dt.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
                      const timeStr = dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 flex-shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <p className="text-sm font-semibold text-slate-900">{b.product?.name ?? L("Noma'lum")}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-slate-900 tabular-nums">{b.quantity.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 ml-1">qop</span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-900 tabular-nums">{dateStr}</p>
                            <p className="text-xs text-slate-400 tabular-nums mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{timeStr}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${b.shift === 'Tungi' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                              {b.shift}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-700">{b.responsiblePerson}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </> /* end activeTab === 'batches' */}

      </div>

      {/* New Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                <span className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <Plus className="w-5 h-5" />
                </span>
                {t('Yangi ishlab chiqarish')}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label={L('Yopish')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              {/* Product */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('production.product')}
                </label>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <ProductSelector
                    products={products}
                    selectedId={form.productId}
                    searchValue={productSearch}
                    onSearchChange={setProductSearch}
                    onSelect={(id, name) => {
                      const selectedProductData = products.find((p) => p.id === id);
                      const lowerName = name.toLowerCase();
                      const isPreform =
                        selectedProductData?.warehouse === 'preform' ||
                        lowerName.includes('g') ||
                        lowerName.includes('gr') ||
                        lowerName.includes('preform');

                      let newAccessories: any[] = [];
                      if (isPreform) {
                        const sizeMatch = lowerName.match(/(\d+)/);
                        const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
                        let krishkaSize = selectedProductData?.subType || '';
                        let ruchkaSize = '';

                        if (!krishkaSize) {
                          if (size >= 50 && size <= 70) krishkaSize = '38';
                          else if (size > 70) krishkaSize = '48';
                          else if (size > 0 && size < 50) krishkaSize = '28';
                        }
                        if (['28', '38', '48'].includes(krishkaSize)) {
                          ruchkaSize = krishkaSize;
                        }

                        const targetQty = parseInt(form.targetQuantity) || 0;
                        const unitsPerBag = selectedProductData?.unitsPerBag || 1000;
                        const totalUnits = targetQty * unitsPerBag;

                        if (krishkaSize) {
                          const krishka = products.find(
                            (p) =>
                              (p.warehouse === 'krishka' ||
                                p.name.toLowerCase().includes('krishka') ||
                                p.name.toLowerCase().includes('qopqoq')) &&
                              p.name.toLowerCase().includes(krishkaSize) &&
                              p.active !== false
                          );
                          if (krishka) {
                            newAccessories.push({
                              id: krishka.id,
                              name: krishka.name,
                              quantity: totalUnits,
                              price: krishka.pricePerBag / (krishka.unitsPerBag || 2000),
                              type: 'krishka',
                            });
                          }
                        }

                        if (ruchkaSize) {
                          const ruchka = products.find(
                            (p) =>
                              (p.warehouse === 'ruchka' ||
                                p.name.toLowerCase().includes('ruchka')) &&
                              p.name.toLowerCase().includes(ruchkaSize) &&
                              p.active !== false
                          );
                          if (ruchka) {
                            newAccessories.push({
                              id: ruchka.id,
                              name: ruchka.name,
                              quantity: totalUnits,
                              price: ruchka.pricePerBag / (ruchka.unitsPerBag || 1000),
                              type: 'ruchka',
                            });
                          }
                        }
                      }

                      setForm((prev) => ({
                        ...prev,
                        productId: id,
                        productName: name,
                        accessories: newAccessories,
                      }));
                    }}
                  />
                </div>
              </div>

              {/* Target quantity */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('production.quantity')}
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={t('production.quantity')}
                    value={form.targetQuantity}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      const targetQty = parseFloat(raw) || 0;
                      const selectedProductData = products.find((p) => p.id === form.productId);
                      const unitsPerBag = selectedProductData?.unitsPerBag || 1000;
                      const totalUnits = targetQty * unitsPerBag;

                      setForm((prev) => ({
                        ...prev,
                        targetQuantity: raw,
                        accessories: prev.accessories.map((acc) => {
                          const selectedAcc = products.find((p) => p.id === acc.id);
                          const isKrishka =
                            acc.type === 'krishka' || selectedAcc?.warehouse === 'krishka';
                          const defaultUnits = isKrishka ? 2000 : 1000;
                          return {
                            ...acc,
                            quantity: totalUnits,
                            price:
                              acc.price ||
                              (selectedAcc
                                ? selectedAcc.pricePerBag /
                                  (selectedAcc.unitsPerBag || defaultUnits)
                                : 0),
                          };
                        }),
                      }));
                    }}
                    className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl font-bold text-xl outline-none transition-all"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Accessories */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    {t('production.accessories')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const firstKrishka = products.find((p) => p.warehouse === 'krishka');
                      if (firstKrishka) {
                        setForm((prev) => ({
                          ...prev,
                          accessories: [
                            ...prev.accessories,
                            {
                              id: firstKrishka.id,
                              name: firstKrishka.name,
                              quantity: 0,
                              price: firstKrishka.pricePerBag / (firstKrishka.unitsPerBag || 2000),
                              type: 'krishka',
                            },
                          ],
                        }));
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('production.add')}
                  </button>
                </div>
                {form.accessories.length > 0 && (
                  <div className="space-y-3">
                    {form.accessories.map((acc, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-end gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100"
                      >
                        <div className="flex-1 min-w-[120px]">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">
                            {t('production.category')}
                          </p>
                          <select
                            aria-label="Kategoriya tanlash"
                            value={acc.type}
                            onChange={(e) => {
                              const newType = e.target.value;
                              const firstOfNewType = products.find(
                                (p) => p.warehouse === newType
                              );
                              const isKrishka = newType === 'krishka';
                              const defaultUnits = isKrishka ? 2000 : 1000;
                              setForm((prev) => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) =>
                                  i === index
                                    ? {
                                        ...a,
                                        type: newType,
                                        id: firstOfNewType?.id || '',
                                        name: firstOfNewType?.name || '',
                                        price: firstOfNewType
                                          ? firstOfNewType.pricePerBag /
                                            (firstOfNewType.unitsPerBag || defaultUnits)
                                          : 0,
                                      }
                                    : a
                                ),
                              }));
                            }}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-lg font-semibold text-purple-600 outline-none transition-all"
                          >
                            <option value="krishka">{t('production.krishka')}</option>
                            <option value="ruchka">{t('production.ruchka')}</option>
                          </select>
                        </div>
                        <div className="flex-[2] min-w-[140px]">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">
                            {t('production.product')}
                          </p>
                          <select
                            aria-label="Mahsulot tanlash"
                            value={acc.id}
                            onChange={(e) => {
                              const newId = e.target.value;
                              const newProduct = products.find((p) => p.id === newId);
                              const isKrishka =
                                acc.type === 'krishka' || newProduct?.warehouse === 'krishka';
                              const defaultUnits = isKrishka ? 2000 : 1000;
                              setForm((prev) => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) =>
                                  i === index
                                    ? {
                                        ...a,
                                        id: newId,
                                        name: newProduct?.name || '',
                                        price: newProduct
                                          ? newProduct.pricePerBag /
                                            (newProduct.unitsPerBag || defaultUnits)
                                          : a.price,
                                      }
                                    : a
                                ),
                              }));
                            }}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-lg font-semibold text-gray-900 outline-none transition-all"
                          >
                            {products
                              .filter((p) => p.warehouse === acc.type)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">
                            {t('production.quantity')}
                          </p>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t('production.quantity')}
                            placeholder="0"
                            value={acc.quantity}
                            onChange={(e) => {
                              const raw = e.target.value.replace(',', '.');
                              if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                              setForm((prev) => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) =>
                                  i === index ? { ...a, quantity: raw } : a
                                ),
                              }));
                            }}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-lg font-semibold text-gray-900 outline-none transition-all"
                          />
                        </div>
                        <div className="w-24">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">
                            {t('products.price')}
                          </p>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t('products.price')}
                            placeholder="0"
                            value={acc.price}
                            onChange={(e) => {
                              const raw = e.target.value.replace(',', '.');
                              if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                              setForm((prev) => ({
                                ...prev,
                                accessories: prev.accessories.map((a, i) =>
                                  i === index ? { ...a, price: raw } : a
                                ),
                              }));
                            }}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-lg font-semibold text-emerald-600 outline-none transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              accessories: prev.accessories.filter((_, i) => i !== index),
                            }));
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                          aria-label="O'chirish"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Date + Shift */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('production.date')}
                  </label>
                  <input
                    type="date"
                    aria-label={t('production.date')}
                    placeholder="YYYY-MM-DD"
                    value={form.plannedDate}
                    onChange={(e) => setForm({ ...form, plannedDate: e.target.value })}
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl font-semibold outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('production.shift')}
                  </label>
                  <select
                    aria-label={t('production.shift')}
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl font-semibold appearance-none outline-none transition-all"
                  >
                    <option value="Kunduzgi">{t('Kunduzgi')}</option>
                    <option value="Tungi">{t('Tungi')}</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('settings.general')}
                </label>
                <textarea
                  aria-label={t('settings.general')}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl font-medium text-sm min-h-[100px] outline-none resize-none transition-all"
                  placeholder={t("Ishlab chiqarish haqida qo'shimcha ma'lumot...")}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-12 rounded-xl border border-gray-200 font-semibold text-sm text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {t('production.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] h-12 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Factory className="w-5 h-5" />
                  )}
                  {t('production.createOrder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Batch Form Modal */}
      {showBatchForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-violet-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                <span className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                  <Factory className="w-5 h-5" />
                </span>
                {L('Yangi partiya')}
              </h3>
              <button type="button" onClick={() => setShowBatchForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBatchSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L('Mahsulot')}</label>
                <select
                  aria-label={L('Mahsulot tanlash')}
                  value={batchForm.productId}
                  onChange={e => setBatchForm(f => ({ ...f, productId: e.target.value }))}
                  required
                  className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">{L('Tanlang...')}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L('Miqdor (qop)')}</label>
                <input
                  type="number" min="1" required
                  value={batchForm.quantity}
                  onChange={e => setBatchForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                  className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L('Sana va vaqt')}</label>
                <input
                  type="datetime-local" required
                  value={batchForm.productionDate}
                  onChange={e => setBatchForm(f => ({ ...f, productionDate: e.target.value }))}
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L('Smena')}</label>
                  <select
                    aria-label={L('Smena tanlash')}
                    value={batchForm.shift}
                    onChange={e => setBatchForm(f => ({ ...f, shift: e.target.value }))}
                    className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="Kunduzgi">{L('Kunduzgi')}</option>
                    <option value="Tungi">{L('Tungi')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{L("Mas'ul shaxs")}</label>
                  <input
                    type="text"
                    value={batchForm.responsiblePerson}
                    onChange={e => setBatchForm(f => ({ ...f, responsiblePerson: e.target.value }))}
                    placeholder={L("F.I.O")}
                    className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBatchForm(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                  {L('Bekor')}
                </button>
                <button type="submit" disabled={submittingBatch} className="flex-[2] h-11 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  {submittingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Factory className="w-4 h-4" />}
                  {L("Qo'shish")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmState.open}
        onClose={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={L('Bekor qilish')}
        variant={confirmState.variant}
      />
    </>
  );
}
