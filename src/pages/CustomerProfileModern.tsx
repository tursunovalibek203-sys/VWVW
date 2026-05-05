import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Calendar,
  Wallet,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Package,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  Trash2,
  Plus,
  User
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { formatDate, formatCurrency } from '../lib/utils';
import DashboardCard from '../components/cards/DashboardCard';
import api from '../lib/professionalApi';
import { extractData, extractPaginatedData } from '../lib/apiHelpers';
import MainLayout from '../components/layout/MainLayout';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  code?: string;
  balanceUSD: number;
  balanceUZS: number;
  debtUSD: number;
  debtUZS: number;
  createdAt: string;
}

interface SaleItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  pricePerBag: number;
  product?: {
    name: string;
  };
}

interface Sale {
  id: string;
  createdAt: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  currency: string;
  paymentStatus: string;
  items?: SaleItem[];
  product?: {
    name: string;
  };
  quantity?: number;
}

export default function CustomerProfileModern() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCustomerData = async () => {
    try {
      setRefreshing(true);
      const [customerRes, salesRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/sales?customerId=${id}`)
      ]);
      
      // ✅ Handle standardized API response format
      const customerData = extractData<Customer | null>(customerRes, null);
      const { data: salesData } = extractPaginatedData<Sale>(salesRes, 'sales', []);
      
      setCustomer(customerData);
      setSales(salesData);
    } catch (error) {
      console.error('Mijoz ma\'lumotlarini yuklashda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const handleRefresh = () => {
    loadCustomerData();
  };

  const handleExportExcel = () => {
    // Excel export logic
    console.log('Exporting to Excel...');
  };

  const handlePayment = () => {
    navigate(`/cashier/payments?customerId=${id}`);
  };

  const handleNewSale = () => {
    navigate('/cashier/sales/new', { state: { customerId: id } });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (!customer) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <p className="text-gray-500">{latinToCyrillic('Mijoz topilmadi')}</p>
          <button
            onClick={() => navigate('/cashier/customers')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            {latinToCyrillic('Orqaga')}
          </button>
        </div>
      </MainLayout>
    );
  }

  const totalPurchases = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const averagePurchase = sales.length > 0 ? totalPurchases / sales.length : 0;

  const getProductNames = (sale: Sale) => {
    if (sale.items && sale.items.length > 0) {
      return sale.items.map(item => item.product?.name || item.productName || 'N/A').join(', ');
    }
    if (sale.product?.name) {
      return sale.product.name;
    }
    return '-';
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 pb-24">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-100">
          {/* Company Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LP</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                  LUX PET PLAST
                </h1>
                <p className="text-xs text-gray-500 uppercase">
                  {latinToCyrillic('BUXORO VILOYATI VOBKENT TUMAN')}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-500">{latinToCyrillic('Kassir')}</span>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Header */}
          <div className="px-4 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/cashier/customers')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={latinToCyrillic('Орқага')}
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-blue-600">
                    {customer.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {latinToCyrillic('Mijoz kodi')}: {customer.code || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {latinToCyrillic('Yangilash')}
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={() => {}}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium transition-colors"
                  aria-label={latinToCyrillic('Нақд савдолар')}
                >
                  {latinToCyrillic('Нақд савдолар')}
                </button>
                <button
                  onClick={handlePayment}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Coins className="w-3.5 h-3.5" />
                  {latinToCyrillic('Тўлов қилиш')}
                </button>
                <button
                  onClick={() => {}}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {latinToCyrillic('Учирмоқ')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Contact Info Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{latinToCyrillic('Телефон')}</p>
                <p className="text-sm font-semibold text-gray-900">{customer.phone || '-'}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{latinToCyrillic('Манзил')}</p>
                <p className="text-sm font-semibold text-gray-900">{customer.address || '-'}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{latinToCyrillic('Рўйхатдан ўтган')}</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(customer.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <DashboardCard
              icon={Wallet}
              title={latinToCyrillic('Баланс')}
              mainValue={customer.balanceUSD || 0}
              subValue={`${(customer.balanceUZS || 0).toLocaleString()} sum`}
              variant="success"
            />
            <DashboardCard
              icon={AlertTriangle}
              title={latinToCyrillic('Қарз')}
              mainValue={customer.debtUSD || 0}
              subValue={`${(customer.debtUZS || 0).toLocaleString()} sum`}
              variant="danger"
            />
            <DashboardCard
              icon={ShoppingCart}
              title={latinToCyrillic('Харидлар')}
              mainValue={`${sales.length} ${latinToCyrillic('та')}`}
              subValue={`$${totalPurchases.toFixed(2)}`}
              variant="info"
            />
            <DashboardCard
              icon={TrendingUp}
              title={latinToCyrillic('Ўртача')}
              mainValue={`$${averagePurchase.toFixed(2)}`}
              subValue={latinToCyrillic('Хар бир сотув')}
              variant="warning"
            />
          </div>

          {/* Sales History Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-900">
                  {latinToCyrillic('Сотувлар тарихи')}
                </h3>
              </div>
              <span className="text-sm text-gray-500">
                {sales.length} {latinToCyrillic('та сотув')}
              </span>
            </div>

            {sales.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{latinToCyrillic('Сотувлар мавжуд эмас')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {latinToCyrillic('Сана')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {latinToCyrillic('Маҳсулотлар')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {latinToCyrillic('Жами')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {latinToCyrillic('Тўланган')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {latinToCyrillic('Қарз')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {latinToCyrillic('Ҳолат')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <span className="truncate max-w-[200px]">{getProductNames(sale)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(sale.totalAmount, sale.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-600 text-right">
                          {formatCurrency(sale.paidAmount, sale.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {(sale.debtAmount || 0) > 0 ? (
                            <span className="text-rose-600 font-medium">
                              {formatCurrency(sale.debtAmount, sale.currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sale.paymentStatus === 'PAID' 
                              ? 'bg-emerald-100 text-emerald-700'
                              : sale.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {sale.paymentStatus === 'PAID' 
                              ? latinToCyrillic('Тўланган')
                              : sale.paymentStatus === 'PARTIAL'
                              ? latinToCyrillic('Қисман')
                              : latinToCyrillic('Қарз')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={handleNewSale}
          className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-40"
          aria-label={latinToCyrillic('Янги сотув')}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </MainLayout>
  );
}
