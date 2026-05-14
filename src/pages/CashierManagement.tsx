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
  UserPlus,
  Lock,
  Mail,
  Phone,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { errorHandler } from '../lib/professionalErrorHandler';
import { notify } from '../lib/professionalNotifications';

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
    }
  };

  const handleDelete = async (cashierId: string) => {
    if (!confirm(latinToCyrillic("Kassirni o'chirishni tasdiqlaysizmi?"))) return;

    try {
      await api.delete(`/users/${cashierId}`);
      notify.success(latinToCyrillic("Muvaffaqiyat"), latinToCyrillic("Kassir muvaffaqiyat o'chirildi!"));
      loadCashiers();
    } catch (error) {
      errorHandler.handleError(error, { action: 'deleteCashier' });
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
      await api.put(`/users/${selectedCashier.id}`, { password: newPassword });
      notify.success(latinToCyrillic("Muvaffaqiyat"), latinToCyrillic("Parol muvaffaqiyat o'zgartirildi!"));
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedCashier(null);
    } catch (error) {
      errorHandler.handleError(error, { action: 'changeCashierPassword' });
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

  const openEditModal = (cashier: Cashier) => {
    setSelectedCashier(cashier);
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

  const filteredCashiers = cashiers.filter(cashier =>
    cashier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cashier.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cashier.email && cashier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cashier.phone && cashier.phone.includes(searchTerm))
  );

  if (!hasPermission('admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {latinToCyrillic("Ruxsat yo'q")}
          </h1>
          <p className="text-gray-600">
            {latinToCyrillic("Bu sahifaga faqat adminlar kirishi mumkin")}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {latinToCyrillic("Orqaga")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {latinToCyrillic("Kassirlar Boshqaruvi")}
                </h1>
                <p className="text-gray-600">
                  {latinToCyrillic("Barcha kassirlarni boshqarish")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadCashiers}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={latinToCyrillic("Yangilash")}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {latinToCyrillic("Yangi Kassir")}
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={latinToCyrillic("Kassirlarni qidirish...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Cashiers List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-pulse mx-auto"></div>
              <p className="mt-2 text-gray-600">
                {latinToCyrillic("Yuklanmoqda...")}
              </p>
            </div>
          ) : filteredCashiers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {latinToCyrillic("Kassirlar topilmadi")}
              </h3>
              <p className="text-gray-600 mb-4">
                {latinToCyrillic("Birinchi kassirni qo'shing")}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {latinToCyrillic("Yangi Kassir Qo'shish")}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {latinToCyrillic("Kassir")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {latinToCyrillic("Aloqa")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {latinToCyrillic("Lavozim")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {latinToCyrillic("Holati")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {latinToCyrillic("So'nggi kirish")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {latinToCyrillic("Amallar")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCashiers.map((cashier) => (
                    <tr key={cashier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {cashier.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{cashier.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cashier.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {cashier.email}
                            </div>
                          )}
                          {cashier.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {cashier.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {cashier.role === 'admin' ? latinToCyrillic("Admin") : latinToCyrillic("Kassir")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(cashier.id, !cashier.isActive)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cashier.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cashier.isActive ? latinToCyrillic("Aktiv") : latinToCyrillic("Noaktiv")}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cashier.lastLogin ? new Date(cashier.lastLogin).toLocaleDateString('uz-UZ') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPasswordModal(cashier)}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title={latinToCyrillic("Parolni o'zgartirish")}
                            aria-label={latinToCyrillic("Parolni o'zgartirish")}
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(cashier)}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title={latinToCyrillic("Tahrirlash")}
                            aria-label={latinToCyrillic("Tahrirlash")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cashier.id)}
                            className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
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
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {selectedCashier ? latinToCyrillic("Kassirni Tahrirlash") : latinToCyrillic("Yangi Kassir Qo'shish")}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cashier-fullname" className="block text-sm font-medium text-gray-700 mb-1">
                      {latinToCyrillic("To'liq ism")}
                    </label>
                    <input
                      id="cashier-fullname"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="cashier-username" className="block text-sm font-medium text-gray-700 mb-1">
                      {latinToCyrillic("Login")}
                    </label>
                    <input
                      id="cashier-username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="cashier-email" className="block text-sm font-medium text-gray-700 mb-1">
                      {latinToCyrillic("Email")}
                    </label>
                    <input
                      id="cashier-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="cashier-phone" className="block text-sm font-medium text-gray-700 mb-1">
                      {latinToCyrillic("Telefon")}
                    </label>
                    <input
                      id="cashier-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="cashier-role" className="block text-sm font-medium text-gray-700 mb-1">
                      {latinToCyrillic("Lavozim")}
                    </label>
                    <select
                      id="cashier-role"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cashier">{latinToCyrillic("Kassir")}</option>
                      <option value="admin">{latinToCyrillic("Admin")}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cashier-password" className="block text-sm font-medium text-gray-700 mb-1">
                      {latinToCyrillic("Parol")}
                    </label>
                    <div className="relative">
                      <input
                        id="cashier-password"
                        type={showPassword ? "text" : "password"}
                        required={!selectedCashier}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? latinToCyrillic("Parolni yashirish") : latinToCyrillic("Parolni ko'rsatish")}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cashier-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                      {latinToCyrillic("Parolni tasdiqlash")}
                    </label>
                    <input
                      id="cashier-confirm-password"
                      type="password"
                      required={!selectedCashier}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {latinToCyrillic("Bekor qilish")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedCashier ? latinToCyrillic("Yangilash") : latinToCyrillic("Qo'shish")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && selectedCashier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {latinToCyrillic("Parolni O'zgartirish")}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {latinToCyrillic("Kassir")}: {selectedCashier.fullName}
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    {latinToCyrillic("Yangi parol")}
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setSelectedCashier(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {latinToCyrillic("Bekor qilish")}
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {latinToCyrillic("O'zgartirish")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
