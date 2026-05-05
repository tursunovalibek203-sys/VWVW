import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Calendar,
  ShoppingCart,
  AlertTriangle,
  Package,
  FileSpreadsheet,
  MapPin,
  RefreshCw,
  TrendingUp,
  Wallet,
  Trash2,
  Coins
} from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import api from '../lib/professionalApi';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/excelUtils';
import { latinToCyrillic } from '../lib/transliterator';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCashier = location.pathname.startsWith('/cashier');
  const [customer, setCustomer] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'USD',
    type: 'CASH',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    try {
      const [customerRes, salesRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/sales?customerId=${id}`)
      ]);
      setCustomer(customerRes.data);
      
      // ✅ API dan kelgan ma'lumotni to'g'ri parse qilish
      const salesData = salesRes.data?.sales || salesRes.data || [];
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (error) {
      console.error('Mijoz ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCustomerData();
  };

  const handleDeleteCustomer = async () => {
    try {
      if (!id) return;
      console.log('Mijoz o\'chirilmoqda:', id);
      await api.delete(`/customers/${id}`);
      console.log('Mijoz muvaffaqiyatli o\'chirildi');
      setShowDeleteModal(false);
      alert('✅ Mijoz muvaffaqiyatli o\'chirildi!');
      navigate(isCashier ? '/cashier/customers' : '/customers');
    } catch (error: any) {
      console.error('Delete customer error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Mijozni o\'chirishda xatolik yuz berdi';
      alert('❌ Xatolik: ' + errorMsg);
      setShowDeleteModal(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      alert('❌ Iltimos, to\'lov summasini kiriting');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/customers/${id}/payment`, {
        amount,
        currency: paymentForm.currency,
        type: paymentForm.type,
        notes: paymentForm.notes
      });

      alert('✅ To\'lov muvaffaqiyatli amalga oshirildi! Kassaga qo\'shildi.');
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', currency: 'USD', type: 'CASH', notes: '' });
      loadCustomerData(); // Refresh customer data
    } catch (error: any) {
      console.error('To\'lov xatolik:', error);
      alert('❌ To\'lov amalga oshirishda xatolik: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">{latinToCyrillic('Yuklanmoqda...')}</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{latinToCyrillic("Mijoz topilmadi")}</h2>
          <button
            onClick={() => navigate('/cashier/customers')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {latinToCyrillic("Mijozlar ro'yxatiga qaytish")}
          </button>
        </div>
      </div>
    );
  }

  const totalPurchases = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  // totalPaid va totalDebt hisoblash (kelajakda statistika uchun)
  // const totalPaid = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);
  // const totalDebt = sales.reduce((sum, sale) => sum + ((sale.debtAmount || 0)), 0);

  const handleExportExcel = () => {
    const historyData = sales.map(sale => ({
      'Sana': formatDate(sale.createdAt),
      'Mahsulotlar': sale.items?.map((i: any) => `${i.product?.name || i.productName || 'N/A'} (${i.quantity})`).join(', ') || sale.product?.name || 'N/A',
      'Jami': sale.totalAmount,
      'To\'langan': sale.paidAmount,
      'Qarz': sale.debtAmount,
      'Valyuta': sale.currency,
    }));
    exportToExcel(historyData, { fileName: `Mijoz_${customer.name}_Tarixi` });
  };

  // Faqat naqd (cash) savdolarni eksport qilish
  const handleExportCashSales = () => {
    // Faqat CASH to'lov turidagi savdolarni filtrlash
    const cashSales = sales.filter(sale => 
      sale.paymentMethod === 'CASH' || 
      sale.paymentType === 'CASH' ||
      (sale.notes && sale.notes.toLowerCase().includes('naqd'))
    );

    if (cashSales.length === 0) {
      alert(latinToCyrillic('Naqd pul savdolari topilmadi!'));
      return;
    }

    const cashSalesData = cashSales.map(sale => ({
      [latinToCyrillic('Sana')]: formatDate(sale.createdAt),
      [latinToCyrillic('Mahsulotlar')]: sale.items?.map((i: any) => `${i.product?.name || i.productName || 'N/A'} (${i.quantity})`).join(', ') || sale.product?.name || 'N/A',
      [latinToCyrillic('Jami summa')]: sale.totalAmount,
      [latinToCyrillic('To\'langan')]: sale.paidAmount,
      [latinToCyrillic('Qarz')]: sale.debtAmount,
      [latinToCyrillic('Valyuta')]: sale.currency,
      [latinToCyrillic('To\'lov turi')]: latinToCyrillic('Naqd pul'),
    }));

    exportToExcel(cashSalesData, { 
      fileName: `Mijoz_${customer.name}_Naqd_Savdolari` 
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Orqaga"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">{latinToCyrillic("Mijoz kodi")}: {customer.code || 'N/A'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {latinToCyrillic("Yangilash")}
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportCashSales}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm"
            title={latinToCyrillic("Faqat naqd pul savdolari")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {latinToCyrillic("Naqd savdolar")}
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
          >
            <Coins className="w-4 h-4" />
            {latinToCyrillic("To'lov qilish")}
          </button>
          <button
            type="button"
            onClick={() => { console.log('O\'chirish tugmasi bosildi'); setShowDeleteModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-sm transition-all"
            title={latinToCyrillic("Mijozni o'chirish")}
          >
            <Trash2 className="w-4 h-4" />
            {latinToCyrillic("O'chirish")}
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{latinToCyrillic("Telefon")}</p>
              <p className="font-medium text-gray-900">{customer.phone || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{latinToCyrillic("Manzil")}</p>
              <p className="font-medium text-gray-900">{customer.address || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{latinToCyrillic("Ro'yxatdan o'tgan")}</p>
              <p className="font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-500">{latinToCyrillic("Balans")}</p>
          </div>
          <p className="text-xl font-bold text-gray-900">${(customer.balanceUSD || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500">{(customer.balanceUZS || 0).toLocaleString()} sum</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-sm text-gray-500">{latinToCyrillic("Qarz")}</p>
          </div>
          <p className="text-xl font-bold text-rose-600">${(customer.debtUSD || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500">{(customer.debtUZS || 0).toLocaleString()} sum</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">{latinToCyrillic("Xaridlar")}</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{sales.length} {latinToCyrillic("ta")}</p>
          <p className="text-xs text-gray-500">${totalPurchases.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500">{latinToCyrillic("O'rtacha")}</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            ${sales.length > 0 ? (totalPurchases / sales.length).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-gray-500">{latinToCyrillic("Har bir sotuv")}</p>
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            {latinToCyrillic("Sotuvlar tarixi")}
          </h2>
          <span className="text-sm text-gray-500">{sales.length} {latinToCyrillic("ta sotuv")}</span>
        </div>
        
        {sales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>{latinToCyrillic("Sotuvlar mavjud emas")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{latinToCyrillic("Sana")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{latinToCyrillic("Mahsulotlar")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{latinToCyrillic("Jami")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{latinToCyrillic("To'langan")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{latinToCyrillic("Qarz")}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{latinToCyrillic("Holat")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="space-y-1">
                        {sale.items?.map((i: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span className="font-medium">{i.product?.name || i.productName || 'N/A'}</span>
                            <span className="text-gray-400">×</span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold">{i.quantity}</span>
                          </div>
                        )) || (sale.product?.name ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span className="font-medium">{sale.product.name}</span>
                            <span className="text-gray-400">×</span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold">{sale.quantity}</span>
                          </div>
                        ) : '-')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(sale.totalAmount, sale.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-600 text-right">
                      {formatCurrency(sale.paidAmount, sale.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {(sale.debtAmount || 0) > 0 ? (
                        <span className="text-rose-600 font-medium">{formatCurrency(sale.debtAmount, sale.currency)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(sale.debtAmount || 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                          {latinToCyrillic("Qarz")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {latinToCyrillic("To'langan")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mijozni O'chirish Modal */}
      {showDeleteModal && customer && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title={latinToCyrillic("Mijozni O'chirish")}
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-200">
                    {latinToCyrillic("Mijozni o'chirishni tasdiqlang")}
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {customer.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>{latinToCyrillic("Diqqat:")}</strong> {latinToCyrillic("Mijozni o'chirgandan so'ng, barcha ma'lumotlari (sotuvlar, to'lovlar, qarzlar) ham o'chiriladi. Bu amalni qaytarib bo'lmaydi!")}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                {latinToCyrillic("Bekor qilish")}
              </Button>
              <Button
                type="button"
                onClick={handleDeleteCustomer}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {latinToCyrillic("O'chirish")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* To'lov Qilish Modal */}
      {showPaymentModal && customer && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title={latinToCyrillic("Mijozdan To'lov Qilish")}
          size="md"
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {/* Mijoz ma'lumoti */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">{customer.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {latinToCyrillic("Qarz")}: ${customer.debtUSD?.toFixed(2) || '0.00'} | {latinToCyrillic("Balans")}: ${customer.balanceUSD?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Summa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {latinToCyrillic("To'lov summasi")} *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full h-12 px-3 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="0.00"
                required
              />
            </div>

            {/* Valyuta */}
            <div>
              <label htmlFor="payment-currency" className="block text-sm font-medium text-gray-700 mb-1">
                {latinToCyrillic("Valyuta")}
              </label>
              <select
                id="payment-currency"
                value={paymentForm.currency}
                onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                className="w-full h-12 px-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                aria-label={latinToCyrillic("Valyuta tanlash")}
              >
                <option value="USD">USD ($)</option>
                <option value="UZS">UZS (so'm)</option>
              </select>
            </div>

            {/* To'lov turi */}
            <div>
              <label htmlFor="payment-type" className="block text-sm font-medium text-gray-700 mb-1">
                {latinToCyrillic("To'lov turi")}
              </label>
              <select
                id="payment-type"
                value={paymentForm.type}
                onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                className="w-full h-12 px-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                aria-label={latinToCyrillic("To'lov turini tanlash")}
              >
                <option value="CASH">{latinToCyrillic("Naqd pul")}</option>
                <option value="CARD">{latinToCyrillic("Karta")}</option>
                <option value="CLICK">Click</option>
                <option value="TRANSFER">{latinToCyrillic("Bank o'tkazmasi")}</option>
              </select>
            </div>

            {/* Izoh */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {latinToCyrillic("Izoh")} ({latinToCyrillic("ixtiyoriy")})
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                rows={2}
                placeholder={latinToCyrillic("Qo'shimcha ma'lumot...")}
              />
            </div>

            {/* Ogohlantirish */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>{latinToCyrillic("Diqqat:")}</strong> {latinToCyrillic("Bu to'lov avtomatik ravishda kassaga qo'shiladi va mijoz balansi yangilanadi.")}
              </p>
            </div>

            {/* Tugmalar */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                {latinToCyrillic("Bekor qilish")}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    {latinToCyrillic("Saqlanmoqda...")}
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    {latinToCyrillic("To'lovni qabul qilish")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
