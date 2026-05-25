import { useEffect, useState } from 'react';
import {
  Users as UsersIcon,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Search,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Loader2,
  AtSign,
} from 'lucide-react';
import api from '../lib/professionalApi';
import { useAuthStore } from '../store/authStore';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast, toast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

import type { User } from '../types';

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  // UI-only: in-button spinner + delete confirmation target (replaces window.confirm)
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: '',
    login: '',
    password: '',
    role: 'SELLER',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users');
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Foydalanuvchilarni yuklab boʻlmadi')));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, form);
        addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Foydalanuvchi yangilandi')));
      } else {
        await api.post('/auth/register', form);
        addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Yangi foydalanuvchi yaratildi')));
      }
      setShowModal(false);
      setEditingUser(null);
      setForm({ name: '', login: '', password: '', role: 'SELLER' });
      loadUsers();
    } catch (error) {
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Xatolik yuz berdi')));
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setForm({ name: '', login: '', password: '', role: 'SELLER' });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, login: user.login || '', password: '', role: user.role });
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm({ name: '', login: '', password: '', role: 'SELLER' });
  };

  // Foydalanuvchini oʻchirish (ConfirmDialog tasdiqlagandan keyin)
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const id = userToDelete.id;
    try {
      await api.delete(`/users/${id}`);
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Foydalanuvchi oʻchirildi')));
      loadUsers();
    } catch (error) {
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Oʻchirib boʻlmadi')));
    } finally {
      setUserToDelete(null);
    }
  };

  // Rol Badge varianti
  const getRoleVariant = (role: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'SELLER': return 'info';
      case 'WAREHOUSE_MANAGER': return 'warning';
      case 'ACCOUNTANT': return 'success';
      case 'CASHIER': return 'info';
      case 'MANAGER': return 'warning';
      default: return 'neutral';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'ADMIN': return latinToCyrillic('Administrator');
      case 'SELLER': return latinToCyrillic('Sotuvchi');
      case 'WAREHOUSE_MANAGER': return latinToCyrillic('Ombor menejeri');
      case 'ACCOUNTANT': return latinToCyrillic('Buxgalter');
      case 'CASHIER': return latinToCyrillic('Kassir');
      case 'MANAGER': return latinToCyrillic('Menejer');
      default: return role;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-8 sm:p-10 text-center max-w-md mx-auto mt-10">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {latinToCyrillic("Ruxsat yoʻq")}
          </h1>
          <p className="text-sm text-slate-500">
            {latinToCyrillic('Faqat administratorlar foydalanuvchilarni boshqarishi mumkin')}
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.login && u.login.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const hasActiveFilters = !!searchTerm;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const activeCount = users.filter((u) => u.active).length;

  const stats = [
    {
      label: latinToCyrillic('Jami foydalanuvchilar'),
      value: users.length.toLocaleString('en-US'),
      icon: UsersIcon,
      tint: 'bg-sky-50 text-sky-600',
    },
    {
      label: latinToCyrillic('Aktiv'),
      value: activeCount.toLocaleString('en-US'),
      icon: ShieldCheck,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: latinToCyrillic('Administratorlar'),
      value: adminCount.toLocaleString('en-US'),
      icon: Shield,
      tint: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: clean title + count + actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Foydalanuvchilar')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 tabular-nums">
            {loading
              ? latinToCyrillic('Yuklanmoqda...')
              : `${filteredUsers.length.toLocaleString('en-US')} ${latinToCyrillic('ta foydalanuvchi')}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadUsers}
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
            {latinToCyrillic('Yangi foydalanuvchi')}
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
            id="users-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={latinToCyrillic('Ism, login yoki email...')}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
          <TableSkeleton rows={6} cols={4} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredUsers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={UsersIcon}
            title={
              hasActiveFilters
                ? latinToCyrillic('Foydalanuvchilar topilmadi')
                : latinToCyrillic("Hali foydalanuvchilar yoʻq")
            }
            description={
              hasActiveFilters
                ? latinToCyrillic("Qidiruv shartlarini oʻzgartirib qayta urinib koʻring")
                : latinToCyrillic("Birinchi foydalanuvchini qoʻshing va u shu yerda koʻrinadi")
            }
            action={
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {latinToCyrillic('Yangi foydalanuvchi')}
              </button>
            }
          />
        </div>
      )}

      {/* Users table (desktop) */}
      {!loading && filteredUsers.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Foydalanuvchi')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Email')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Rol')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Holati')}</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Amallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs font-normal text-indigo-600">{latinToCyrillic('(siz)')}</span>
                            )}
                          </p>
                          {user.login && (
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <AtSign className="w-3 h-3 flex-shrink-0" />
                              {user.login}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {user.email ? (
                        <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      ) : (
                        <span className="text-sm text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getRoleVariant(user.role)}>
                        <span className="inline-flex items-center gap-1">
                          {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                          {getRoleLabel(user.role)}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {user.active ? latinToCyrillic('Aktiv') : latinToCyrillic('Noaktiv')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={latinToCyrillic('Tahrirlash')}
                          aria-label={latinToCyrillic('Tahrirlash')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={latinToCyrillic("Oʻchirish")}
                            aria-label={latinToCyrillic("Foydalanuvchini oʻchirish")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users cards (mobile) */}
      {!loading && filteredUsers.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-2xl border border-slate-200/70 p-4 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="ml-1.5 text-xs font-normal text-indigo-600">{latinToCyrillic('(siz)')}</span>
                      )}
                    </p>
                    {user.login && (
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <AtSign className="w-3 h-3 flex-shrink-0" />
                        {user.login}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={getRoleVariant(user.role)}>
                  <span className="inline-flex items-center gap-1">
                    {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                    {getRoleLabel(user.role)}
                  </span>
                </Badge>
              </div>

              {user.email && (
                <div className="mt-3">
                  <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {user.active ? latinToCyrillic('Aktiv') : latinToCyrillic('Noaktiv')}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    aria-label={latinToCyrillic('Tahrirlash')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      aria-label={latinToCyrillic("Foydalanuvchini oʻchirish")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation (replaces window.confirm) */}
      <ConfirmDialog
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={latinToCyrillic("Foydalanuvchini oʻchirish")}
        message={
          userToDelete
            ? latinToCyrillic(`"${userToDelete.name}" foydalanuvchisini rostdan ham oʻchirmoqchimisiz? Bu amalni qaytarib boʻlmaydi.`)
            : ''
        }
        confirmText={latinToCyrillic("Oʻchirish")}
        cancelText={latinToCyrillic('Bekor qilish')}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  {editingUser ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingUser ? latinToCyrillic('Foydalanuvchini tahrirlash') : latinToCyrillic('Yangi foydalanuvchi')}
                </h3>
              </div>
              <button
                onClick={closeModal}
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
                  <label htmlFor="user-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic('Ism')}
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={latinToCyrillic('Toʻliq ism')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="user-login" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic('Login (foydalanuvchi nomi)')}
                  </label>
                  <input
                    id="user-login"
                    type="text"
                    required
                    value={form.login}
                    onChange={(e) => setForm({ ...form, login: e.target.value })}
                    placeholder="admin123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="user-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic('Parol')}
                    {editingUser && (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        {latinToCyrillic("(oʻzgartirmasangiz boʻsh qoldiring)")}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      id="user-password"
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? latinToCyrillic('Parolni yashirish') : latinToCyrillic("Parolni koʻrsatish")}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="user-role" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {latinToCyrillic('Rol')}
                  </label>
                  <select
                    id="user-role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
                  >
                    <option value="SELLER">{latinToCyrillic('Sotuvchi')}</option>
                    <option value="WAREHOUSE_MANAGER">{latinToCyrillic('Ombor menejeri')}</option>
                    <option value="ACCOUNTANT">{latinToCyrillic('Buxgalter')}</option>
                    <option value="CASHIER">{latinToCyrillic('Kassir')}</option>
                    <option value="ADMIN">{latinToCyrillic('Administrator')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  {latinToCyrillic('Bekor qilish')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingUser ? latinToCyrillic('Saqlash') : latinToCyrillic('Yaratish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
