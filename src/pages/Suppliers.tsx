import { useEffect, useState } from 'react';
import api from '../lib/professionalApi';
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Search,
  User,
  CreditCard,
  WifiOff,
  AlertCircle,
  X,
  Pencil,
  Power,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { latinToCyrillic, trData } from '../lib/transliterator';
import { exportToExcel } from '../lib/excelUtils';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToast, toast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email?: string;
  phone: string;
  address?: string;
  paymentTerms: string;
  active?: boolean;
}

const PAYMENT_TERMS_OPTIONS = [
  { value: '15 days', label: latinToCyrillic('15 kun') },
  { value: '30 days', label: latinToCyrillic('30 kun') },
  { value: '45 days', label: latinToCyrillic('45 kun') },
  { value: '60 days', label: latinToCyrillic('60 kun') },
  { value: 'Cash', label: latinToCyrillic('Naqd') },
];

const paymentTermsLabel = (value: string) =>
  PAYMENT_TERMS_OPTIONS.find((o) => o.value === value)?.label ?? value;

const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

export default function Suppliers() {
  const { isOnline } = useOnlineStatus();
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // UI-only: deactivation confirmation target (uses existing PUT /suppliers/:id { active })
  const [supplierToDeactivate, setSupplierToDeactivate] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '30 days',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
      setError('Loading timeout. Please try again.');
      console.warn('Loading timeout reached for suppliers');
    }, 10000); // 10 second timeout

    try {
      const { data } = await api.get('/suppliers');
      clearTimeout(timeout);
      setSuppliers(data);
      setError(null);
    } catch (error: any) {
      clearTimeout(timeout);
      console.error('Failed to load suppliers:', error);
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError("Internet bilan aloqa yo'q. Ma'lumotlar yuklanmadi.");
      } else {
        setError('Failed to load suppliers. Please try again.');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
  };

  const handleExport = () => {
    if (filteredSuppliers.length === 0) {
      addToast(toast.warning(latinToCyrillic('Diqqat'), latinToCyrillic("Eksport uchun ma'lumot yo'q")));
      return;
    }
    const dataToExport = filteredSuppliers.map((s) => ({
      [latinToCyrillic('Kompaniya')]: trData(s.name),
      [latinToCyrillic("Mas'ul shaxs")]: trData(s.contactPerson),
      [latinToCyrillic('Telefon')]: s.phone,
      [latinToCyrillic('Email')]: s.email || '-',
      [latinToCyrillic('Manzil')]: trData(s.address) || '-',
      [latinToCyrillic("To'lov muddati")]: s.paymentTerms,
      [latinToCyrillic('Status')]: s.active ? latinToCyrillic('Faol') : latinToCyrillic('Nofaol'),
    }));
    exportToExcel(dataToExport, { fileName: 'Taminotchilar', sheetName: 'Taminotchilar' });
    addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Eksport tayyorlandi')));
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      paymentTerms: '30 days',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowModal(false);
      setEditingSupplier(null);
      setForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        paymentTerms: '30 days',
      });
      addToast(
        toast.success(
          latinToCyrillic('Muvaffaqiyatli'),
          latinToCyrillic(editingSupplier ? "Ta'minotchi yangilandi" : "Ta'minotchi qo'shildi"),
        ),
      );
      loadSuppliers();
    } catch (error) {
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Xatolik yuz berdi')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email || '',
      phone: supplier.phone,
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms,
    });
    setShowModal(true);
  };

  const setActive = async (id: string, nextActive: boolean) => {
    try {
      await api.put(`/suppliers/${id}`, { active: nextActive });
      addToast(
        toast.success(
          latinToCyrillic('Muvaffaqiyatli'),
          latinToCyrillic(nextActive ? "Ta'minotchi faollashtirildi" : "Ta'minotchi nofaol qilindi"),
        ),
      );
      loadSuppliers();
    } catch (error) {
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Status yangilanmadi')));
    }
  };

  // Activating is direct; deactivating goes through ConfirmDialog.
  const toggleActive = (supplier: Supplier) => {
    if (supplier.active) {
      setSupplierToDeactivate(supplier);
    } else {
      setActive(supplier.id, true);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!supplierToDeactivate) return;
    await setActive(supplierToDeactivate.id, false);
    setSupplierToDeactivate(null);
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm),
  );

  const activeCount = suppliers.filter((s) => s.active).length;
  const inactiveCount = suppliers.filter((s) => !s.active).length;

  const stats = [
    {
      label: latinToCyrillic("Jami ta'minotchilar"),
      value: suppliers.length.toString(),
      icon: Truck,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: latinToCyrillic('Faol'),
      value: activeCount.toString(),
      icon: CheckCircle2,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: latinToCyrillic('Nofaol'),
      value: inactiveCount.toString(),
      icon: Power,
      tint: 'bg-slate-100 text-slate-600',
    },
  ];

  const hasActiveFilters = !!searchTerm;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Offline warning banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-800">
            {latinToCyrillic("Internet bilan aloqa yo'q. Ma'lumotlar yangilanmaydi.")}
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            {latinToCyrillic('Qayta urinish')}
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200/70 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-red-800">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            {latinToCyrillic('Qayta urinish')}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic("Ta'minotchilar")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? latinToCyrillic('Yuklanmoqda...')
              : `${filteredSuppliers.length} ${latinToCyrillic("ta ta'minotchi")}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            title={latinToCyrillic("Ta'minotchilarni eksport qilish")}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">{latinToCyrillic('Excel')}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{latinToCyrillic("Yangi ta'minotchi")}</span>
            <span className="sm:hidden">{latinToCyrillic('Yangi')}</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[100px] animate-pulse" />
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

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            id="supplier-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={latinToCyrillic("Kompaniya, mas'ul shaxs yoki telefon...")}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
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
      {!loading && filteredSuppliers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={Truck}
            title={
              hasActiveFilters
                ? latinToCyrillic("Ta'minotchilar topilmadi")
                : latinToCyrillic("Hali ta'minotchilar yo'q")
            }
            description={
              hasActiveFilters
                ? latinToCyrillic("Qidiruv shartlarini o'zgartirib qayta urinib ko'ring")
                : latinToCyrillic("Birinchi ta'minotchini qo'shing va u shu yerda ko'rinadi")
            }
            action={
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {latinToCyrillic("Yangi ta'minotchi")}
              </button>
            }
          />
        </div>
      )}

      {/* Suppliers table (desktop) */}
      {!loading && filteredSuppliers.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Kompaniya')}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic("Mas'ul shaxs")}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Aloqa')}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic("To'lov muddati")}</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Status')}</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Amallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(trData(supplier.name))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{trData(supplier.name)}</p>
                          {supplier.address && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{trData(supplier.address)}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{trData(supplier.contactPerson)}</span>
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {supplier.phone && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5 tabular-nums">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {supplier.phone}
                          </p>
                        )}
                        {supplier.email && (
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{supplier.email}</span>
                          </p>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-sm text-slate-300">&mdash;</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                        <CreditCard className="w-3.5 h-3.5" />
                        {paymentTermsLabel(supplier.paymentTerms)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={supplier.active ? 'success' : 'neutral'}>
                        {supplier.active ? latinToCyrillic('Faol') : latinToCyrillic('Nofaol')}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(supplier)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          aria-label={latinToCyrillic('Tahrirlash')}
                          title={latinToCyrillic('Tahrirlash')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(supplier)}
                          className={`p-2 rounded-lg transition-colors ${
                            supplier.active
                              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          aria-label={
                            supplier.active
                              ? latinToCyrillic('Nofaol qilish')
                              : latinToCyrillic('Faollashtirish')
                          }
                          title={
                            supplier.active
                              ? latinToCyrillic('Nofaol qilish')
                              : latinToCyrillic('Faollashtirish')
                          }
                        >
                          <Power className="w-4 h-4" />
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

      {/* Suppliers cards (mobile) */}
      {!loading && filteredSuppliers.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-2xl border border-slate-200/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(trData(supplier.name))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{trData(supplier.name)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{trData(supplier.contactPerson)}</span>
                    </p>
                  </div>
                </div>
                <Badge variant={supplier.active ? 'success' : 'neutral'} className="flex-shrink-0">
                  {supplier.active ? latinToCyrillic('Faol') : latinToCyrillic('Nofaol')}
                </Badge>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-2 tabular-nums">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {supplier.phone}
                </p>
                {supplier.email && (
                  <p className="text-sm text-slate-500 flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </p>
                )}
                {supplier.address && (
                  <p className="text-sm text-slate-500 flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{trData(supplier.address)}</span>
                  </p>
                )}
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {paymentTermsLabel(supplier.paymentTerms)}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleEdit(supplier)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  {latinToCyrillic('Tahrirlash')}
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(supplier)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    supplier.active
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {supplier.active ? latinToCyrillic('Nofaol') : latinToCyrillic('Faollashtirish')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deactivate confirmation (uses existing PUT /suppliers/:id { active:false }) */}
      <ConfirmDialog
        isOpen={supplierToDeactivate !== null}
        onClose={() => setSupplierToDeactivate(null)}
        onConfirm={handleConfirmDeactivate}
        variant="danger"
        title={latinToCyrillic("Ta'minotchini nofaol qilish")}
        message={
          supplierToDeactivate
            ? latinToCyrillic(`"${trData(supplierToDeactivate.name)}" ta'minotchisini nofaol qilmoqchimisiz?`)
            : ''
        }
        confirmText={latinToCyrillic('Nofaol qilish')}
        cancelText={latinToCyrillic('Bekor qilish')}
      />

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200/70">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Truck className="w-[18px] h-[18px]" />
                </span>
                {latinToCyrillic(editingSupplier ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi")}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={latinToCyrillic('Yopish')}
                title={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="supplier-name" className="block text-sm font-medium text-slate-700">
                    {latinToCyrillic('Kompaniya nomi')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="supplier-name"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder={latinToCyrillic('Kompaniya nomi')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-person" className="block text-sm font-medium text-slate-700">
                    {latinToCyrillic("Mas'ul shaxs")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-person"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder={latinToCyrillic("Mas'ul shaxs")}
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="supplier-phone" className="block text-sm font-medium text-slate-700">
                    {latinToCyrillic('Telefon')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="supplier-phone"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="+998901234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="supplier-email" className="block text-sm font-medium text-slate-700">
                    {latinToCyrillic('Email')}
                  </label>
                  <input
                    id="supplier-email"
                    type="email"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder={latinToCyrillic('Email (ixtiyoriy)')}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="supplier-address" className="block text-sm font-medium text-slate-700">
                  {latinToCyrillic('Manzil')}
                </label>
                <input
                  id="supplier-address"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder={latinToCyrillic('Manzil (ixtiyoriy)')}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payment-terms" className="block text-sm font-medium text-slate-700">
                  {latinToCyrillic("To'lov muddati")}
                </label>
                <select
                  id="payment-terms"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                >
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {latinToCyrillic('Bekor qilish')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting
                    ? latinToCyrillic('Saqlanmoqda...')
                    : latinToCyrillic(editingSupplier ? 'Saqlash' : 'Yaratish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
