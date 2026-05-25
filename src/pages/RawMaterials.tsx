import { useEffect, useMemo, useState } from 'react';
import api from '../lib/professionalApi';
import {
  Package2,
  AlertTriangle,
  TrendingUp,
  Truck,
  Plus,
  Layers,
  DollarSign,
  Scale,
  FileText,
  RefreshCw,
  Search,
  Pencil,
  X,
  PackageX,
  Boxes,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { exportToExcel } from '../lib/excelUtils';
import { useToast, toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLimit: number;
  unitPrice: number;
  supplier?: { id: string; name: string } | null;
  supplierId?: string;
}

interface Supplier {
  id: string;
  name: string;
}

const emptyForm = {
  name: '',
  unit: 'kg',
  minStockLimit: '',
  unitPrice: '',
  supplierId: '',
};

export default function RawMaterials() {
  const { addToast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Discard-unsaved-changes confirmation (replaces window.confirm)
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    loadMaterials();
    loadSuppliers();
  }, []);

  const loadMaterials = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/raw-materials');
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load raw materials');
      addToast(
        toast.error(
          latinToCyrillic('Xatolik'),
          latinToCyrillic('Xom ashyolarni yuklab bolmadi')
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load suppliers');
    }
  };

  const handleExport = () => {
    if (materials.length === 0) {
      addToast(
        toast.warning(
          latinToCyrillic('Diqqat'),
          latinToCyrillic('Eksport qilish uchun malumot yoq')
        )
      );
      return;
    }
    const dataToExport = materials.map((m) => ({
      'Xom ashyo': m.name,
      Birlik: m.unit,
      'Joriy zaxira': m.currentStock,
      'Min limit': m.minStockLimit,
      'Birlik narxi': m.unitPrice,
      'Jami qiymat': m.currentStock * m.unitPrice,
      Yetkazuvchi: m.supplier?.name || 'Nomalum',
    }));
    exportToExcel(dataToExport, { fileName: 'Xom_ashyolar', sheetName: 'Xom ashyolar' });
    addToast(
      toast.success(
        latinToCyrillic('Muvaffaqiyatli'),
        latinToCyrillic('Xom ashyolar Excelga eksport qilindi')
      )
    );
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (material: RawMaterial) => {
    setEditingId(material.id);
    setForm({
      name: material.name ?? '',
      unit: material.unit ?? 'kg',
      minStockLimit:
        material.minStockLimit !== undefined && material.minStockLimit !== null
          ? String(material.minStockLimit)
          : '',
      unitPrice:
        material.unitPrice !== undefined && material.unitPrice !== null
          ? String(material.unitPrice)
          : '',
      supplierId: material.supplier?.id ?? material.supplierId ?? '',
    });
    setShowModal(true);
  };

  const hasFormData = () =>
    !!(form.name || form.minStockLimit || form.unitPrice || form.supplierId);

  const requestCloseModal = () => {
    if (hasFormData()) {
      setConfirmClose(true);
      return;
    }
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Payload shape preserved exactly: form fields + numeric coercion.
    const payload = {
      ...form,
      minStockLimit: parseFloat(form.minStockLimit),
      unitPrice: parseFloat(form.unitPrice),
    };
    try {
      if (editingId) {
        await api.put(`/raw-materials/${editingId}`, payload);
      } else {
        await api.post('/raw-materials', payload);
      }
      closeModal();
      addToast(
        toast.success(
          latinToCyrillic('Muvaffaqiyatli'),
          editingId
            ? latinToCyrillic('Xom ashyo yangilandi')
            : latinToCyrillic('Yangi xom ashyo qoshildi')
        )
      );
      loadMaterials(true);
    } catch (error) {
      addToast(
        toast.error(
          latinToCyrillic('Xatolik'),
          latinToCyrillic('Saqlashda xatolik yuz berdi')
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Stock-level (UI only): red at/under the minimum limit, amber when near
  // the limit (within +50%), green when healthy.
  const getStockLevel = (
    material: RawMaterial
  ): { variant: 'error' | 'warning' | 'success'; label: string } => {
    const stock = material.currentStock || 0;
    const limit = material.minStockLimit || 0;
    if (stock <= limit) {
      return {
        variant: 'error',
        label: stock === 0 ? latinToCyrillic('Tugagan') : latinToCyrillic('Kam'),
      };
    }
    if (stock <= limit * 1.5) {
      return { variant: 'warning', label: latinToCyrillic('Tugayapti') };
    }
    return { variant: 'success', label: latinToCyrillic('Yetarli') };
  };

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.supplier?.name || '').toLowerCase().includes(q)
    );
  }, [materials, searchQuery]);

  const lowStockMaterials = useMemo(
    () => materials.filter((m) => (m.currentStock || 0) <= (m.minStockLimit || 0)),
    [materials]
  );

  const totalValue = useMemo(
    () => materials.reduce((sum, m) => sum + (m.currentStock || 0) * (m.unitPrice || 0), 0),
    [materials]
  );

  const summaryStats = [
    {
      label: latinToCyrillic('Jami turlar'),
      value: materials.length.toString(),
      icon: Boxes,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      label: latinToCyrillic('Kam zaxira'),
      value: lowStockMaterials.length.toString(),
      icon: AlertTriangle,
      gradient:
        lowStockMaterials.length > 0
          ? 'from-rose-500 to-red-600'
          : 'from-emerald-500 to-teal-600',
    },
    {
      label: latinToCyrillic('Jami qiymat'),
      value: `${totalValue.toLocaleString()} UZS`,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      label: latinToCyrillic('Yetkazuvchilar'),
      value: suppliers.length.toString(),
      icon: Truck,
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero header: title + count + primary actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-glass-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {latinToCyrillic('Xom ashyo')}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                {loading
                  ? latinToCyrillic('Yuklanmoqda...')
                  : `${materials.length} ${latinToCyrillic('ta xom ashyo')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={() => loadMaterials(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 disabled:opacity-60 rounded-xl text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {latinToCyrillic('Yangi xom ashyo')}
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md"
            >
              <div
                className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-sm mb-3`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Low-stock alert banner */}
      {!loading && lowStockMaterials.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {lowStockMaterials.length} {latinToCyrillic('ta xom ashyo kam qoldi')}
            </p>
            <p className="mt-0.5 text-xs text-amber-700 truncate">
              {lowStockMaterials.slice(0, 4).map((m) => m.name).join(', ')}
              {lowStockMaterials.length > 4 && ` +${lowStockMaterials.length - 4}`}
            </p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            id="raw-material-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={latinToCyrillic('Xom ashyo yoki yetkazuvchi nomini kiriting...')}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <TableSkeleton rows={8} cols={5} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredMaterials.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={searchQuery ? PackageX : Package2}
            title={
              searchQuery
                ? latinToCyrillic('Xom ashyo topilmadi')
                : latinToCyrillic('Hali xom ashyolar yoq')
            }
            description={
              searchQuery
                ? latinToCyrillic('Qidiruv shartlarini ozgartirib qayta urinib koring')
                : latinToCyrillic('Birinchi xom ashyoni qoshing va u shu yerda korinadi')
            }
            action={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all duration-200 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  {latinToCyrillic('Qidiruvni tozalash')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  {latinToCyrillic('Yangi xom ashyo')}
                </button>
              )
            }
          />
        </div>
      )}

      {/* Materials table (desktop) */}
      {!loading && filteredMaterials.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {latinToCyrillic('Xom ashyo')}
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {latinToCyrillic('Yetkazuvchi')}
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {latinToCyrillic('Zaxira')}
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {latinToCyrillic('Birlik narxi')}
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {latinToCyrillic('Jami qiymat')}
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {latinToCyrillic('Holat')}
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {latinToCyrillic('Amallar')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMaterials.map((material) => {
                  const level = getStockLevel(material);
                  return (
                    <tr key={material.id} className="group hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Package2 className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {material.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {latinToCyrillic('Min')}: {material.minStockLimit} {material.unit}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">
                          {material.supplier?.name || latinToCyrillic('Yetkazuvchi yoq')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {(material.currentStock || 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{material.unit}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-emerald-600">
                          {(material.unitPrice || 0).toLocaleString()} UZS
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-blue-600">
                          {((material.currentStock || 0) * (material.unitPrice || 0)).toLocaleString()} UZS
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={level.variant}>{level.label}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => openEditModal(material)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            aria-label={latinToCyrillic('Tahrirlash')}
                            title={latinToCyrillic('Tahrirlash')}
                          >
                            <Pencil className="w-4 h-4" />
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

      {/* Materials cards (mobile) */}
      {!loading && filteredMaterials.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredMaterials.map((material) => {
            const level = getStockLevel(material);
            return (
              <div
                key={material.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Package2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {material.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {material.supplier?.name || latinToCyrillic('Yetkazuvchi yoq')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={level.variant}>{level.label}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-400">{latinToCyrillic('Joriy zaxira')}</p>
                    <p className="text-sm font-bold text-gray-900">
                      {(material.currentStock || 0).toLocaleString()} {material.unit}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-400">{latinToCyrillic('Min limit')}</p>
                    <p className="text-sm font-bold text-gray-900">
                      {material.minStockLimit} {material.unit}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-400">{latinToCyrillic('Birlik narxi')}</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {(material.unitPrice || 0).toLocaleString()} UZS
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-400">{latinToCyrillic('Jami qiymat')}</p>
                    <p className="text-sm font-semibold text-blue-600">
                      {((material.currentStock || 0) * (material.unitPrice || 0)).toLocaleString()} UZS
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => openEditModal(material)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    {latinToCyrillic('Tahrirlash')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    {editingId ? (
                      <Pencil className="w-6 h-6 text-white" />
                    ) : (
                      <Plus className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    {editingId
                      ? latinToCyrillic('Xom ashyoni tahrirlash')
                      : latinToCyrillic('Yangi xom ashyo')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={requestCloseModal}
                  aria-label={latinToCyrillic('Yopish')}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="raw-material-name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {latinToCyrillic('Xom ashyo nomi')}
                    </label>
                    <input
                      id="raw-material-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder={latinToCyrillic('Masalan: Granula')}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="raw-material-unit"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {latinToCyrillic('Olchov birligi')}
                    </label>
                    <select
                      id="raw-material-unit"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    >
                      <option value="kg">{latinToCyrillic('Kilogram (kg)')}</option>
                      <option value="ton">{latinToCyrillic('Tonna (ton)')}</option>
                      <option value="litr">{latinToCyrillic('Litr (l)')}</option>
                      <option value="dona">{latinToCyrillic('Dona')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="raw-material-min"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {latinToCyrillic('Minimal zaxira limiti')}
                    </label>
                    <div className="relative">
                      <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        id="raw-material-min"
                        type="text"
                        inputMode="decimal"
                        value={form.minStockLimit}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.');
                          if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                          setForm({ ...form, minStockLimit: raw });
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="raw-material-price"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {latinToCyrillic('Birlik narxi (UZS)')}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        id="raw-material-price"
                        type="text"
                        inputMode="decimal"
                        value={form.unitPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.');
                          if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                          setForm({ ...form, unitPrice: raw });
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="raw-material-supplier"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {latinToCyrillic('Yetkazuvchi')}
                  </label>
                  <select
                    id="raw-material-supplier"
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    required
                  >
                    <option value="">{latinToCyrillic('Yetkazuvchini tanlang')}</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={requestCloseModal}
                    className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    {latinToCyrillic('Bekor qilish')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Package2 className="w-4 h-4" />
                    )}
                    {submitting
                      ? latinToCyrillic('Saqlanmoqda...')
                      : editingId
                        ? latinToCyrillic('Saqlash')
                        : latinToCyrillic('Xom ashyoni qoshish')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Discard unsaved changes confirmation */}
      <ConfirmDialog
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={closeModal}
        title={latinToCyrillic('Yopishni tasdiqlang')}
        message={latinToCyrillic('Formada saqlanmagan malumotlar bor. Rostdan ham yopmoqchimisiz?')}
        confirmText={latinToCyrillic('Ha, yopish')}
        cancelText={latinToCyrillic('Yoq')}
        variant="warning"
      />
    </div>
  );
}
