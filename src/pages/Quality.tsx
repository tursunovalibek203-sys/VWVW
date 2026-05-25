import { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Gauge,
  Plus,
  Search,
  Package,
  User,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  X,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/professionalApi';
import { Badge } from '../components/ui/Badge';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast, toast as toastFactory } from '../components/ui/Toast';
import { latinToCyrillic } from '../lib/transliterator';
import { formatDate } from '../lib/utils';

const L = latinToCyrillic;

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

type StatusKey = 'passed' | 'failed' | 'pending';

const statusConfig: Record<
  StatusKey,
  { label: string; variant: 'success' | 'error' | 'warning'; icon: typeof CheckCircle }
> = {
  passed: { label: L('Muvaffaqiyatli'), variant: 'success', icon: CheckCircle },
  failed: { label: L('Brak'), variant: 'error', icon: XCircle },
  pending: { label: L('Kutilmoqda'), variant: 'warning', icon: Clock },
};

const getStatusMeta = (status: string) =>
  statusConfig[status as StatusKey] || {
    label: status,
    variant: 'warning' as const,
    icon: Clock,
  };

export default function Quality() {
  const { addToast } = useToast();

  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Confirm dialog (replaces window.confirm)
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    target: QualityCheck | null;
  }>({ open: false, target: null });

  // Load quality checks from API
  const loadQualityChecks = async () => {
    try {
      const response = await api.get('/quality-checks');
      const data = response.data || [];
      // Map API data to QualityCheck interface
      const mappedChecks: QualityCheck[] = data.map((item: any) => ({
        id: item.id,
        productName: item.product?.name || item.productName || 'Noma\'lum',
        batchNumber: item.batchNumber || item.productionOrder?.batchNumber || '-',
        inspector: item.inspector?.name || item.inspectorName || '-',
        checkDate:
          item.checkDate ||
          item.createdAt?.split('T')[0] ||
          new Date().toISOString().split('T')[0],
        status: item.status?.toLowerCase() || 'pending',
        defects: item.defects || item.defectCount || 0,
        notes: item.notes || item.comments || '-',
        category: item.category || item.product?.category || 'Umumiy',
      }));
      setChecks(mappedChecks);
    } catch (error) {
      console.error('Error loading quality checks:', error);
      setChecks([]);
      addToast(
        toastFactory.error(L('Xatolik'), L("Tekshiruvlarni yuklashda xatolik yuz berdi"))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQualityChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadQualityChecks();
  };

  // "Yangi tekshiruv" — backendda hali POST endpoint yo'q.
  // Soxta create oqimini ko'rsatmaymiz; halol ravishda xabar beramiz.
  const handleCreate = () => {
    addToast(
      toastFactory.info(
        L('Tez orada'),
        L("Yangi tekshiruv qo'shish funksiyasi tayyorlanmoqda")
      )
    );
  };

  // "Tahrirlash" — hali implement qilinmagan (stub). Halol surface.
  const handleEdit = () => {
    addToast(
      toastFactory.info(
        L('Tez orada'),
        L("Tahrirlash funksiyasi tayyorlanmoqda")
      )
    );
  };

  const requestDelete = (check: QualityCheck) =>
    setConfirmState({ open: true, target: check });

  const handleConfirmDelete = async () => {
    const target = confirmState.target;
    if (!target) return;
    setDeletingId(target.id);
    try {
      await api.delete(`/quality-checks/${target.id}`);
      setChecks((prev) => prev.filter((c) => c.id !== target.id));
      addToast(toastFactory.success(L('Tekshiruv ochirildi')));
      if (selectedCheck?.id === target.id) setSelectedCheck(null);
    } catch (error) {
      console.error('Error deleting:', error);
      addToast(toastFactory.error(L('Xatolik'), L("Ochirishda xatolik yuz berdi")));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredChecks = checks.filter((check) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      check.productName.toLowerCase().includes(term) ||
      check.batchNumber.toLowerCase().includes(term) ||
      check.inspector.toLowerCase().includes(term);
    const matchesStatus = filterStatus === 'all' || check.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Live stats derived from real data
  const passedCount = checks.filter((c) => c.status === 'passed').length;
  const failedCount = checks.filter((c) => c.status === 'failed').length;
  const pendingCount = checks.filter((c) => c.status === 'pending').length;
  const qualityRate = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;

  const stats = [
    {
      label: L('Muvaffaqiyatli'),
      value: passedCount.toLocaleString('en-US'),
      icon: CheckCircle,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: L('Brak'),
      value: failedCount.toLocaleString('en-US'),
      icon: XCircle,
      tint: 'bg-rose-50 text-rose-600',
    },
    {
      label: L('Kutilmoqda'),
      value: pendingCount.toLocaleString('en-US'),
      icon: Clock,
      tint: 'bg-amber-50 text-amber-600',
    },
    {
      label: L('Sifat korsatkichi'),
      value: `${qualityRate}%`,
      icon: Gauge,
      tint: 'bg-indigo-50 text-indigo-600',
    },
  ];

  const filterOptions = [
    { value: 'all', label: L('Barcha statuslar') },
    { value: 'passed', label: L('Muvaffaqiyatli') },
    { value: 'failed', label: L('Brak') },
    { value: 'pending', label: L('Kutilmoqda') },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {L('Sifat nazorati')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? L('Yuklanmoqda...')
                : `${checks.length} ${L('ta tekshiruv')}`}
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
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {L('Yangi tekshiruv')}
            </button>
          </div>
        </div>

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
                    </p>
                  </div>
                );
              })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={L('Qidirish (mahsulot, partiya, inspektor)')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                  filterStatus === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredChecks.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70">
            <EmptyState
              icon={Shield}
              title={
                checks.length === 0
                  ? L("Hali sifat tekshiruvlari yo'q")
                  : L("Mos tekshiruv topilmadi")
              }
              description={
                checks.length === 0
                  ? L("Sifat tekshiruvlari shu yerda korinadi")
                  : L("Qidiruv yoki filterni ozgartirib koring")
              }
              action={
                checks.length === 0 ? (
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    {L('Yangi tekshiruv')}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors active:scale-[0.98]"
                  >
                    <X className="w-4 h-4" />
                    {L('Filterni tozalash')}
                  </button>
                )
              }
            />
          </div>
        )}

        {/* Table (desktop) */}
        {!loading && filteredChecks.length > 0 && (
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/60">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Partiya')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Mahsulot')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Inspektor')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Sana')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Status')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Nuqsonlar')}
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Amallar')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChecks.map((check) => {
                    const meta = getStatusMeta(check.status);
                    const busy = deletingId === check.id;
                    return (
                      <tr key={check.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                            <Hash className="w-3.5 h-3.5 text-slate-400" />
                            {check.batchNumber}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {check.productName}
                              </p>
                              <p className="text-xs text-slate-400 truncate">{check.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                            <User className="w-4 h-4 text-slate-400" />
                            {check.inspector}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 tabular-nums">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {check.checkDate ? formatDate(check.checkDate) : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg text-sm font-bold tabular-nums ${
                              check.defects > 0
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {check.defects}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCheck(check)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title={L('Korish')}
                              aria-label={L('Korish')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleEdit}
                              className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title={L('Tahrirlash (tez orada)')}
                              aria-label={L('Tahrirlash (tez orada)')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(check)}
                              disabled={busy}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-lg transition-colors"
                              title={L('Ochirish')}
                              aria-label={L('Ochirish')}
                            >
                              {busy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
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

        {/* Cards (mobile) */}
        {!loading && filteredChecks.length > 0 && (
          <div className="md:hidden space-y-3">
            {filteredChecks.map((check) => {
              const meta = getStatusMeta(check.status);
              const busy = deletingId === check.id;
              return (
                <div
                  key={check.id}
                  className="bg-white rounded-2xl border border-slate-200/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {check.productName}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono tabular-nums">
                          <Hash className="w-3 h-3" />
                          {check.batchNumber}
                        </p>
                      </div>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {check.inspector}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-500 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {check.checkDate ? formatDate(check.checkDate) : '-'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                      {L('Nuqsonlar')}:
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold tabular-nums ${
                          check.defects > 0
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {check.defects}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCheck(check)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg active:scale-95 transition-all"
                        aria-label={L('Korish')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="p-2 bg-slate-100 text-slate-500 rounded-lg active:scale-95 transition-all"
                        aria-label={L('Tahrirlash (tez orada)')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(check)}
                        disabled={busy}
                        className="p-2 bg-rose-50 text-rose-600 disabled:opacity-50 rounded-lg active:scale-95 transition-all"
                        aria-label={L('Ochirish')}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCheck && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Shield className="w-5 h-5" />
                </span>
                {L('Tekshiruv tafsilotlari')}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCheck(null)}
                aria-label={L('Yopish')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {selectedCheck.productName}
                  </p>
                  <p className="text-sm text-slate-500 font-mono truncate tabular-nums">
                    {selectedCheck.batchNumber}
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge variant={getStatusMeta(selectedCheck.status).variant}>
                    {getStatusMeta(selectedCheck.status).label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5 inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {L('Inspektor')}
                  </p>
                  <p className="font-semibold text-slate-900">{selectedCheck.inspector}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5 inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {L('Sana')}
                  </p>
                  <p className="font-semibold text-slate-900 tabular-nums">
                    {selectedCheck.checkDate ? formatDate(selectedCheck.checkDate) : '-'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">{L('Kategoriya')}</p>
                  <p className="font-semibold text-slate-900">{selectedCheck.category}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {L('Nuqsonlar')}
                  </p>
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      selectedCheck.defects > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {selectedCheck.defects} {L('dona')}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">{L('Izohlar')}</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedCheck.notes}</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200/70 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCheck(null)}
                className="w-full h-11 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.98]"
              >
                {L('Yopish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, target: null })}
        onConfirm={handleConfirmDelete}
        title={L('Tekshiruvni ochirish')}
        message={L("Bu tekshiruvni ochirmoqchimisiz? Bu amalni qaytarib bolmaydi.")}
        confirmText={L('Ochirish')}
        cancelText={L('Bekor qilish')}
        variant="danger"
      />
    </>
  );
}
