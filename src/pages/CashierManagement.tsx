import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Phone,
  Search,
  RefreshCw,
  X,
  UserCheck,
  UserX,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { errorHandler } from '../lib/professionalErrorHandler';
import { notify } from '../lib/professionalNotifications';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

interface Cashier {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  password?: string;
}

export default function CashierManagement() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  // UI-only: in-button spinners + delete confirmation target (replaces window.confirm)
  const [submitting, setSubmitting] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [cashierToDelete, setCashierToDelete] = useState<Cashier | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'cashier'
  });

  // Faqat adminlar kirishi mumkin
  useEffect(() => {
    if (!hasPermission('admin')) {
      navigate('/dashboard');
      return;
    }
    loadCashiers();
  }, []);

  const loadCashiers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      const cashiersData = response.data.filter((u: any) => u.role === 'cashier' || u.role === 'admin');
      setCashiers(cashiersData);
    } catch (error) {
      errorHandler.handleError(error, { action: 'loadCashiers' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      notify.error(latinToCyrillic("Xatolik"), latinToCyrillic("Parollar mos kelmadi!"));
      return;
    }

    try {
      setSubmitting(true);
      const userData = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        fullName: formData.fullName,
        password: formData.password,
        role: formData.role
      };

      if (selectedCashier) {
        await api.put(`/users/${selectedCashier.id}`, userData);
        notify.success(latinToCyrillic("Muvaffaqiyat"), latinToCyrillic("Kassir muvaffaqiyat yangilandi!"));
      } else {
        await api.post('/users', userData);
        notify.success(latinToCyrillic("Muvaffaqiyat"), latinToCyrillic("Yangi kassir muvaffaqiyat qo'shildi!"));
      }

      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      loadCashiers();
    } catch (error) {
      errorHandler.handleError(error, { action: selectedCashier ? 'updateCashier' : 'createCashier' });
    } finally {
      setSubmitting(false);
    }
  };

  // Kassirni o'chirish (ConfirmDialog tasdiqlagandan keyin)
  const handleConfirmDelete = async () => {
    if (!cashierToDelete) return;
    const cashierId = cashierToDelete.id;
    try {
      await api.delete(`/users/${cashierId}`);
      notify.success(latinToCyrillic("Muvaffaqiyat"), latinToCyrillic("Kassir muvaffaqiyat o'chirildi!"));
      loadCashiers();
    } catch (error) {
      errorHandler.handleError(error, { action: 'deleteCashier' });
    } finally {
      setCashierToDelete(null);
    }
  };

  const handleToggleActive = async (cashierId: string, isActive: boolean) => {
    try {
      await api.put(`/users/${cashierId}`, { isActive });
      notify.success(latinToCyrillic("Muvaffaqiyat"), latinToCyrillic(isActive ? "Kassir aktivlashtirildi!" : "Kassir deaktivlashtirildi!"));
      loadCashiers();
    } catch (error) {
      errorHandler.handleError(error, { action: 'toggleCashierActive' });
    }
  };

  const handleChangePassword = async () => {
    if (!selectedCashier || !newPassword) {
      notify.error(latinToCyrillic("Xatolik"), latinToCyrillic("Yangi parolni kiriting!"));
      return;
    }

    try {
      setSavingPassword(true);
      await api.put(`/users/${selectedCashier.id}`, { password: newPassword });
      notify.success(latinToCyrillic("Muvaffaqiyat"), latinToCyrillic("Parol muvaffaqiyat o'zgartirildi!"));
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedCashier(null);
    } catch (error) {
      errorHandler.handleError(error, { action: 'changeCashierPassword' });
    } finally {
      setSavingPassword(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      phone: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      role: 'cashier'
    });
    setSelectedCashier(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowPassword(false);
    setShowAddModal(true);
  };

  const openEditModal = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setShowPassword(false);
    setFormData({
      username: cashier.username,
      email: cashier.email || '',
      phone: cashier.phone || '',
      fullName: cashier.fullName,
      password: '',
      confirmPassword: '',
      role: cashier.role
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const closeFormModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  };

  const filteredCashiers = cashiers.filter(cashier =>
    cashier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cashier.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cashier.email && cashier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cashier.phone && cashier.phone.includes(searchTerm))
  );

  // Lavozim Badge varianti: admin = info, kassir = neutral
  const getRoleVariant = (role: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (role) {
      case 'admin': return 'info';
      case 'cashier': return 'neutral';
      default: return 'neutral';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return latinToCyrillic('Admin');
      case 'cashier': return latinToCyrillic('Kassir');
      default: return role;
    }
  };

  // Avatar: soft indigo for admin, soft slate for cashier (premium, not gradient)
  const avatarTint = (role: string) =>
    role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600';

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const hasActiveFilters = !!searchTerm;
  const activeCount = cashiers.filter(c => c.isActive).length;
  const adminCount = cashiers.filter(c => c.role === 'admin').length;

  if (!hasPermission('admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.06)] border border-slate-200/70 p-8 sm:p-10 text-center max-w-md w-full">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
            {latinToCyrillic("Ruxsat yo'q")}
          </h1>
          <p className="text-sm text-slate-500">
            {latinToCyrillic("Bu sahifaga faqat adminlar kirishi mumkin")}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            {latinToCyrillic("Orqaga")}
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: latinToCyrillic('Jami xodimlar'),
      value: cashiers.length.toLocaleString('en-US'),
      icon: Users,
      tint: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: latinToCyrillic('Aktiv'),
      value: activeCount.toLocaleString('en-US'),
      icon: UserCheck,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: latinToCyrillic('Adminlar'),
      value: adminCount.toLocaleString('en-US'),
      icon: Shield,
      tint: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: clean title + count + actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Xodimlar boshqaruvi')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 tabular-nums">
            {loading
              ? latinToCyrillic('Yuklanmoqda...')
              : `${filteredCashiers.length.toLocaleString('en-US')} ${latinToCyrillic('ta xodim')}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadCashiers}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {latinToCyrillic('Yangi xodim')}
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
                  <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                </div>
              );
            })}
      </div>

      {/* Search card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
          <input
            id="cashiers-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={latinToCyrillic('Ism, login, email yoki telefon...')}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
          <TableSkeleton rows={6} cols={5} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCashiers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={Users}
            title={
              hasActiveFilters
                ? latinToCyrillic('Xodimlar topilmadi')
                : latinToCyrillic("Hali xodimlar yo'q")
            }
            description={
              hasActiveFilters
                ? latinToCyrillic("Qidiruv shartlarini o'zgartirib qayta urinib ko'ring")
                : latinToCyrillic("Birinchi xodimni qo'shing va u shu yerda ko'rinadi")
            }
            action={
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {latinToCyrillic('Yangi xodim')}
              </button>
            }
          />
        </div>
      )}

      {/* Cashiers table (desktop) */}
      {!loading && filteredCashiers.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Xodim')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Aloqa')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Lavozim')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Holati')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic("So'nggi kirish")}</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Amallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCashiers.map((cashier) => (
                  <tr key={cashier.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarTint(cashier.role)}`}>
                          {getInitials(cashier.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{cashier.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">@{cashier.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {cashier.email && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{cashier.email}</span>
                          </p>
                        )}
                        {cashier.phone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 tabular-nums">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            {cashier.phone}
                          </p>
                        )}
                        {!cashier.email && !cashier.phone && (
                          <span className="text-sm text-slate-300">&mdash;</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getRoleVariant(cashier.role)}>
                        <span className="inline-flex items-center gap-1">
                          {cashier.role === 'admin' && <Shield className="w-3 h-3" />}
                          {getRoleLabel(cashier.role)}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(cashier.id, !cashier.isActive)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          cashier.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title={cashier.isActive ? latinToCyrillic('Deaktivlashtirish') : latinToCyrillic('Aktivlashtirish')}
                      >
                        {cashier.isActive
                          ? <><UserCheck className="w-3 h-3" />{latinToCyrillic('Aktiv')}</>
                          : <><UserX className="w-3 h-3" />{latinToCyrillic('Noaktiv')}</>}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 tabular-nums">
                      {cashier.lastLogin ? new Date(cashier.lastLogin).toLocaleDateString('uz-UZ') : <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openPasswordModal(cashier)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={latinToCyrillic("Parolni o'zgartirish")}
                          aria-label={latinToCyrillic("Parolni o'zgartirish")}
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(cashier)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={latinToCyrillic("Tahrirlash")}
                          aria-label={latinToCyrillic("Tahrirlash")}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCashierToDelete(cashier)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title={latinToCyrillic("O'chirish")}
                          aria-label={latinToCyrillic("O'chirish")}
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

      {/* Cashiers cards (mobile) */}
      {!loading && filteredCashiers.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredCashiers.map((cashier) => (
            <div
              key={cashier.id}
              className="bg-white rounded-2xl border border-slate-200/70 p-4 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarTint(cashier.role)}`}>
                    {getInitials(cashier.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{cashier.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">@{cashier.username}</p>
                  </div>
                </div>
                <Badge variant={getRoleVariant(cashier.role)}>
                  <span className="inline-flex items-center gap-1">
                    {cashier.role === 'admin' && <Shield className="w-3 h-3" />}
                    {getRoleLabel(cashier.role)}
                  </span>
                </Badge>
              </div>

              {(cashier.email || cashier.phone) && (
                <div className="mt-3 space-y-1.5">
                  {cashier.email && (
                    <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{cashier.email}</span>
                    </p>
                  )}
                  {cashier.phone && (
                    <p className="text-sm text-slate-600 flex items-center gap-1.5 tabular-nums">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {cashier.phone}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleActive(cashier.id, !cashier.isActive)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    cashier.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cashier.isActive
                    ? <><UserCheck className="w-3 h-3" />{latinToCyrillic('Aktiv')}</>
                    : <><UserX className="w-3 h-3" />{latinToCyrillic('Noaktiv')}</>}
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openPasswordModal(cashier)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    aria-label={latinToCyrillic("Parolni o'zgartirish")}
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(cashier)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    aria-label={latinToCyrillic("Tahrirlash")}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCashierToDelete(cashier)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label={latinToCyrillic("O'chirish")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation (replaces window.confirm) */}
      <ConfirmDialog
        isOpen={cashierToDelete !== null}
        onClose={() => setCashierToDelete(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={latinToCyrillic("Xodimni o'chirish")}
        message={
          cashierToDelete
            ? latinToCyrillic(`"${cashierToDelete.fullName}" xodimini rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)
            : ''
        }
        confirmText={latinToCyrillic("O'chirish")}
        cancelText={latinToCyrillic('Bekor qilish')}
      />

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  {selectedCashier ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {selectedCashier ? latinToCyrillic("Xodimni tahrirlash") : latinToCyrillic("Yangi xodim qo'shish")}
                </h3>
              </div>
              <button
                onClick={closeFormModal}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title={latinToCyrillic('Yopish')}
                aria-label={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="space-y-4">
                <div>
                  <label htmlFor="cashier-fullname" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic("To'liq ism")}
                  </label>
                  <input
                    id="cashier-fullname"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="cashier-username" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic("Login")}
                  </label>
                  <input
                    id="cashier-username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cashier-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {latinToCyrillic("Email")}
                    </label>
                    <input
                      id="cashier-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="cashier-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {latinToCyrillic("Telefon")}
                    </label>
                    <input
                      id="cashier-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cashier-role" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic("Lavozim")}
                  </label>
                  <select
                    id="cashier-role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  >
                    <option value="cashier">{latinToCyrillic("Kassir")}</option>
                    <option value="admin">{latinToCyrillic("Admin")}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="cashier-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic("Parol")}
                    {selectedCashier && (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        {latinToCyrillic("(o'zgartirmasangiz bo'sh qoldiring)")}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      id="cashier-password"
                      type={showPassword ? "text" : "password"}
                      required={!selectedCashier}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? latinToCyrillic("Parolni yashirish") : latinToCyrillic("Parolni ko'rsatish")}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="cashier-confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic("Parolni tasdiqlash")}
                  </label>
                  <input
                    id="cashier-confirm-password"
                    type="password"
                    required={!selectedCashier}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  {latinToCyrillic("Bekor qilish")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedCashier ? latinToCyrillic("Yangilash") : latinToCyrillic("Qo'shish")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && selectedCashier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {latinToCyrillic("Parolni o'zgartirish")}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setSelectedCashier(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title={latinToCyrillic('Yopish')}
                aria-label={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarTint(selectedCashier.role)}`}>
                  {getInitials(selectedCashier.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{selectedCashier.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">@{selectedCashier.username}</p>
                </div>
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {latinToCyrillic("Yangi parol")}
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setSelectedCashier(null);
                  }}
                  disabled={savingPassword}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  {latinToCyrillic("Bekor qilish")}
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {latinToCyrillic("O'zgartirish")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
