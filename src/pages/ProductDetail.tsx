import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import api from '../lib/professionalApi';
import { extractData, extractArray } from '../lib/apiHelpers';
import { latinToCyrillic, trData } from '../lib/transliterator';
import { Badge } from '../components/ui/Badge';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { useToast, toast } from '../components/ui/Toast';
import EmptyState from '../components/EmptyState';
import {
  Package,
  Plus,
  Minus,
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  Settings,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Users,
  Puzzle,
  X,
  Search,
  Warehouse,
  Boxes,
  Layers,
  Calendar,
  User,
  Receipt,
  ArrowUpDown,
  TrendingDown,
  PackagePlus,
} from 'lucide-react';

// Stock-level UI helper (display only — never touches API/data).
// Red/error: at or below the minimum limit. Amber/warning: near the
// limit (within +50%). Green/success: healthy stock.
type StockLevel = { variant: 'success' | 'warning' | 'error'; label: string };

const warehouseMeta: Record<string, { label: string; icon: typeof Package }> = {
  preform: { label: latinToCyrillic('Preforma'), icon: Boxes },
  krishka: { label: latinToCyrillic('Qopqoq'), icon: Layers },
  ruchka: { label: latinToCyrillic('Ruchka'), icon: Package },
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isCashier = window.location.pathname.startsWith('/cashier');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [salesStats, setSalesStats] = useState({
    totalSold: 0,
    totalRevenue: 0,
    totalProfit: 0,
    salesCount: 0,
  });
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState({ USD_TO_UZS: 12500 });
  const [settingsForm, setSettingsForm] = useState({
    unitsPerBag: '',
    minStockLimit: '',
    optimalStock: '',
    pricePerBag: '',
    pricePerPiece: '',
  });

  // Komplekt state
  const [showKomplektModal, setShowKomplektModal] = useState(false);
  const [komplektItems, setKomplektItems] = useState<Array<{productId: string, productName: string, quantity: number}>>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [komplektSearch, setKomplektSearch] = useState('');

  useEffect(() => {
    loadProduct();
    loadExchangeRate();
  }, [id]);

  const loadExchangeRate = async () => {
    try {
      const response = await api.get('/settings');
      const settingsData = extractData<any>(response, {});
      if (settingsData && settingsData.USD_TO_UZS_RATE) {
        setExchangeRates({ USD_TO_UZS: parseFloat(settingsData.USD_TO_UZS_RATE) });
      }
    } catch (error) {
      console.error('Kursni yuklashda xatolik:', error);
    }
  };

  const loadAllProducts = async () => {
    try {
      const response = await api.get('/products');
      const productsData = extractArray<any>(response, []);
      if (productsData.length > 0) {
        // O'zidan boshqa mahsulotlarni filtrlash
        const filtered = productsData.filter((p: any) => p.id !== id);
        setAllProducts(filtered);
      }
    } catch (error) {
      console.error('Mahsulotlarni yuklashda xatolik:', error);
    }
  };

  const handleSaveKomplekt = async () => {
    try {
      // Komplektni saqlash
      await api.post(`/products/${id}/komplekt`, {
        items: komplektItems
      });

      // Modalni yopish
      setShowKomplektModal(false);
      setKomplektItems([]);
      setKomplektSearch('');

      // Mahsulotni qayta yuklash
      loadProduct();

      addToast(toast.success(
        latinToCyrillic('Muvaffaqiyatli'),
        latinToCyrillic('Komplekt saqlandi!')
      ));
    } catch (error) {
      console.error('Komplektni saqlashda xatolik:', error);
      addToast(toast.error(
        latinToCyrillic('Xatolik'),
        latinToCyrillic('Komplektni saqlashda xatolik yuz berdi')
      ));
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${id}`);
      const data = extractData<any>(response, null);
      setProduct(data);
      setSettingsForm({
        unitsPerBag: (data.unitsPerBag || '').toString(),
        minStockLimit: (data.minStockLimit || 0).toString(),
        optimalStock: (data.optimalStock || 0).toString(),
        pricePerBag: (data.pricePerBag || 0).toString(),
        pricePerPiece: (data.pricePerPiece || 0).toString(),
      });

      // Stock harakat tarixi
      try {
        const movResp = await api.get(`/products/${id}/movements`);
        const movArr = Array.isArray(movResp) ? movResp : extractArray<any>(movResp, []);
        setStockMovements(movArr);
      } catch {
        // silent
      }

      // Sotuv statistikasini yuklash
      try {
        const salesResponse = await api.get(`/sales?productId=${id}`);
        const salesData = extractData<any>(salesResponse, {});
        const sales = Array.isArray(salesData) ? salesData : (salesData?.sales || []);
        setSalesHistory(sales);

        // Statistikani hisoblash
        const totalSold = sales.reduce((sum: number, sale: any) => {
          const item = sale.items?.find((i: any) => i.productId === id || i.product?.id === id);
          return sum + (item?.quantity || 0);
        }, 0);

        const totalRevenue = sales.reduce((sum: number, sale: any) => {
          const item = sale.items?.find((i: any) => i.productId === id || i.product?.id === id);
          return sum + (item?.subtotal || 0);
        }, 0);

        const totalProfit = sales.reduce((sum: number, sale: any) => {
          const item = sale.items?.find((i: any) => i.productId === id || i.product?.id === id);
          const profit = (item?.subtotal || 0) - ((item?.quantity || 0) * data.pricePerBag);
          return sum + profit;
        }, 0);

        setSalesStats({
          totalSold,
          totalRevenue,
          totalProfit,
          salesCount: sales.length,
        });
      } catch (error) {
        console.error('Sotuv statistikasini yuklashda xatolik');
      }
    } catch (error) {
      console.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async () => {
    try {
      await api.delete(`/products/${id}`);
      addToast(toast.success(
        latinToCyrillic('Muvaffaqiyatli'),
        latinToCyrillic('Mahsulot o\'chirildi!')
      ));
      navigate(isCashier ? '/cashier/products' : '/products');
    } catch (error: any) {
      const msg = error?.response?.status === 403
        ? latinToCyrillic('Ruxsat yo\'q — faqat ADMIN o\'chira oladi')
        : (error?.response?.data?.error || latinToCyrillic('Mahsulotni o\'chirishda xatolik yuz berdi'));
      addToast(toast.error(latinToCyrillic('Xatolik'), msg));
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const pBag = parseFloat(settingsForm.pricePerBag);
    const pPiece = parseFloat(settingsForm.pricePerPiece);
    const units = parseInt(settingsForm.unitsPerBag);

    if (isNaN(units) || units <= 0) {
      addToast(toast.warning(
        latinToCyrillic('Diqqat'),
        latinToCyrillic('Qopdagi donalar soni musbat bo\'lishi kerak')
      ));
      return;
    }
    if (!isNaN(pBag) && pBag < 0) {
      addToast(toast.warning(
        latinToCyrillic('Diqqat'),
        latinToCyrillic('Narx manfiy bo\'lishi mumkin emas')
      ));
      return;
    }

    try {
      await api.put(`/products/${id}`, {
        unitsPerBag: parseInt(settingsForm.unitsPerBag),
        minStockLimit: parseInt(settingsForm.minStockLimit),
        optimalStock: parseInt(settingsForm.optimalStock),
        pricePerBag: isNaN(pBag) ? 0 : pBag,
        pricePerPiece: isNaN(pPiece) ? 0 : pPiece,
      });

      setShowSettingsModal(false);
      loadProduct();
      addToast(toast.success(
        latinToCyrillic('Muvaffaqiyatli'),
        latinToCyrillic('Sozlamalar yangilandi!')
      ));
    } catch (error: any) {
      if (error.response?.status === 403) {
        const requiredRoles = error.response?.data?.requiredRoles?.join(', ') || 'ADMIN, WAREHOUSE_MANAGER, MANAGER';
        const yourRole = error.response?.data?.yourRole || 'unknown';
        addToast(toast.error(
          latinToCyrillic('Ruxsat yo\'q'),
          `${latinToCyrillic('Sizning rolingiz')}: ${yourRole}. ${latinToCyrillic('Kerakli rollar')}: ${requiredRoles}`
        ));
      } else {
        addToast(toast.error(
          latinToCyrillic('Xatolik'),
          latinToCyrillic('Sozlamalarni yangilashda xatolik')
        ));
      }
    }
  };


  const getStockLevel = (): StockLevel => {
    const stock = product?.currentStock || 0;
    const min = product?.minStockLimit || 0;
    const optimal = product?.optimalStock || 0;
    if (stock === 0) return { variant: 'error', label: latinToCyrillic('Tugagan') };
    if (stock <= min) return { variant: 'error', label: latinToCyrillic('Kritik') };
    if (stock < optimal) return { variant: 'warning', label: latinToCyrillic('Kam') };
    return { variant: 'success', label: latinToCyrillic('Yetarli') };
  };

  if (loading) {
    return <PageLoading text={latinToCyrillic('Mahsulot yuklanmoqda...')} />;
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={AlertCircle}
            title={latinToCyrillic('Mahsulot topilmadi')}
            description={latinToCyrillic('Bu mahsulot o\'chirilgan yoki mavjud emas')}
            action={
              <button
                type="button"
                onClick={() => navigate(isCashier ? '/cashier/products' : '/products')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                {latinToCyrillic('Orqaga')}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const level = getStockLevel();
  const wh = warehouseMeta[product.warehouse] || { label: latinToCyrillic('Boshqa'), icon: Warehouse };
  const WarehouseIcon = wh.icon;

  const infoCards = [
    {
      label: latinToCyrillic('Qop narxi'),
      value: `${(product.pricePerBag || 0).toLocaleString()} UZS`,
      sub: `$${(product.pricePerBag / exchangeRates.USD_TO_UZS).toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: latinToCyrillic('Dona narxi'),
      value: `${(product.pricePerPiece || 0).toLocaleString()} UZS`,
      sub: `$${(product.pricePerPiece / exchangeRates.USD_TO_UZS).toFixed(4)}`,
      icon: DollarSign,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      label: latinToCyrillic('Qopdagi dona'),
      value: `${(product.unitsPerBag || 0).toLocaleString()}`,
      sub: latinToCyrillic('dona / qop'),
      icon: Layers,
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      label: latinToCyrillic('Ombor'),
      value: wh.label,
      sub: `${latinToCyrillic('Jami')}: ${(product.currentUnits || 0).toLocaleString()} ${latinToCyrillic('dona')}`,
      icon: WarehouseIcon,
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-glass-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        <div className="relative">
          <button
            type="button"
            onClick={() => navigate(isCashier ? '/cashier/products' : '/products')}
            className="inline-flex items-center gap-2 px-3 py-1.5 -ml-1 mb-4 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white/90 backdrop-blur-sm transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            {latinToCyrillic('Orqaga')}
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight break-words">
                  {trData(product.name)}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-lg text-xs font-semibold text-white backdrop-blur-sm">
                    <WarehouseIcon className="w-3.5 h-3.5" />
                    {wh.label}
                  </span>
                  {product.productType?.name && (
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-medium text-white/90 backdrop-blur-sm">
                      {trData(product.productType.name)}
                    </span>
                  )}
                  {product.category?.name && (
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-medium text-white/90 backdrop-blur-sm">
                      {trData(product.category.name)}
                    </span>
                  )}
                  {product.bagType && (
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-medium text-white/90 backdrop-blur-sm">
                      {product.bagType}
                    </span>
                  )}
                  {product.subType && (
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-medium text-white/90 backdrop-blur-sm">
                      {product.subType}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key stock figure */}
            <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 self-start lg:self-auto">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wider">
                    {latinToCyrillic('Joriy zaxira')}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-white leading-none">
                    {(product.currentStock || 0).toLocaleString()}
                    <span className="text-base font-medium text-white/70 ml-1.5">{latinToCyrillic('qop')}</span>
                  </p>
                </div>
                <Badge variant={level.variant} className="text-sm px-3 py-1">{level.label}</Badge>
              </div>
              <p className="mt-2 text-[11px] text-white/60">
                {latinToCyrillic('Minimal')}: {(product.minStockLimit || 0).toLocaleString()} {latinToCyrillic('qop')}
                {' · '}
                {latinToCyrillic('Optimal')}: {(product.optimalStock || 0).toLocaleString()} {latinToCyrillic('qop')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPriceModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-all duration-200 active:scale-95"
          >
            <DollarSign className="w-4 h-4" />
            {latinToCyrillic('Narx belgilash')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowKomplektModal(true);
              loadAllProducts();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-all duration-200 active:scale-95"
          >
            <Puzzle className="w-4 h-4" />
            {latinToCyrillic('Komplekt')}
          </button>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all duration-200 active:scale-95 ml-auto"
          >
            <Settings className="w-4 h-4" />
            {latinToCyrillic('Sozlamalar')}
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {infoCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md"
            >
              <div className={`w-11 h-11 bg-gradient-to-br ${card.gradient} rounded-2xl flex items-center justify-center shadow-sm mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              <p className="mt-1 text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate">{card.value}</p>
              <p className="mt-0.5 text-xs text-gray-400 truncate">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Sales analytics summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">{latinToCyrillic('Jami sotilgan')}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{salesStats.totalSold.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{salesStats.salesCount} {latinToCyrillic('ta sotuv')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">{latinToCyrillic('Jami daromad')}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-600 tracking-tight">{salesStats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">UZS</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">{latinToCyrillic('Jami foyda')}</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">{salesStats.totalProfit.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">UZS</p>
        </div>
      </div>

      {/* Sales history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{latinToCyrillic('Sotuvlar tarixi')}</h2>
            <p className="text-xs text-gray-400">{salesHistory.length} {latinToCyrillic('ta yozuv')}</p>
          </div>
        </div>

        {salesHistory.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={latinToCyrillic('Hali sotuvlar yo\'q')}
            description={latinToCyrillic('Bu mahsulot sotilganda, sotuvlar shu yerda ko\'rinadi')}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Sana')}</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Mijoz')}</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Miqdor')}</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">{latinToCyrillic('Summa')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesHistory.map((sale: any) => {
                    const item = sale.items?.find((i: any) => i.productId === id || i.product?.id === id);
                    const dateRaw = sale.createdAt || sale.date || sale.saleDate;
                    const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString() : '—';
                    const customerName = trData(sale.manualCustomerName || sale.customer?.name || sale.customerName || latinToCyrillic('Noma\'lum'));
                    return (
                      <tr key={sale.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {dateStr}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white">{customerName.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{customerName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">{(item?.quantity || 0).toLocaleString()}</span>
                          <span className="text-xs text-gray-400 ml-1">{latinToCyrillic('qop')}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-emerald-600">{(item?.subtotal || 0).toLocaleString()}</span>
                          <span className="text-xs text-gray-400 ml-1">UZS</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {salesHistory.map((sale: any) => {
                const item = sale.items?.find((i: any) => i.productId === id || i.product?.id === id);
                const dateRaw = sale.createdAt || sale.date || sale.saleDate;
                const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString() : '—';
                const customerName = trData(sale.manualCustomerName || sale.customer?.name || sale.customerName || latinToCyrillic('Noma\'lum'));
                return (
                  <div key={sale.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">{customerName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{customerName}</p>
                          <p className="text-xs text-gray-400 inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dateStr}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-600">{(item?.subtotal || 0).toLocaleString()} <span className="text-xs text-gray-400">UZS</span></p>
                        <p className="text-xs text-gray-500">{(item?.quantity || 0).toLocaleString()} {latinToCyrillic('qop')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Mahsulot haqida ma'lumot */}
      {(() => {
        const firstAdd = stockMovements.find((m: any) => m.type === 'ADD' || m.type === 'PRODUCTION');
        const addedBy = firstAdd?.userName || firstAdd?.user?.name || null;
        const createdAt = product.createdAt
          ? new Date(product.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : null;
        if (!createdAt && !addedBy) return null;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <PackagePlus className="w-4 h-4 text-teal-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">{latinToCyrillic('Mahsulot haqida')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
              {createdAt && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{latinToCyrillic('Qo\'shilgan sana')}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{createdAt}</p>
                  </div>
                </div>
              )}
              {addedBy && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{latinToCyrillic('Kim qo\'shgan')}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{addedBy}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Stock harakat tarixi */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <ArrowUpDown className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{latinToCyrillic('Ombor harakatlari')}</h2>
            <p className="text-xs text-gray-400">{stockMovements.length} {latinToCyrillic('ta yozuv')}</p>
          </div>
        </div>

        {stockMovements.length === 0 ? (
          <EmptyState
            icon={ArrowUpDown}
            title={latinToCyrillic('Harakat tarixi yo\'q')}
            description={latinToCyrillic('Mahsulot sotilganda yoki qo\'shilganda shu yerda ko\'rinadi')}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {stockMovements.map((m: any) => {
              const isAdd = m.type === 'ADD' || m.type === 'PRODUCTION';
              const isSale = m.type === 'SALE';
              const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
              const qtySign = isAdd ? '+' : '-';
              const qtyColor = isAdd ? 'text-emerald-600' : isSale ? 'text-rose-600' : 'text-amber-600';
              const bgColor = isAdd ? 'bg-emerald-50' : isSale ? 'bg-rose-50' : 'bg-amber-50';
              const iconColor = isAdd ? 'text-emerald-600' : isSale ? 'text-rose-600' : 'text-amber-600';
              const TypeIcon = isAdd ? PackagePlus : isSale ? TrendingDown : ArrowUpDown;
              const typeLabel = isAdd
                ? latinToCyrillic('Qo\'shildi')
                : isSale
                  ? latinToCyrillic('Sotildi')
                  : m.type === 'REMOVE'
                    ? latinToCyrillic('Ayirildi')
                    : latinToCyrillic('Tuzatildi');

              return (
                <div key={m.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${bgColor} ${iconColor}`}>{typeLabel}</span>
                      {m.reason && <span className="text-xs text-gray-500 truncate">{m.reason}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{dateStr}</span>
                      {m.userName && <><span>·</span><span>{m.userName}</span></>}
                    </div>
                    {m.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${qtyColor}`}>
                      {qtySign}{m.quantity} {latinToCyrillic('qop')}
                    </p>
                    <p className="text-xs text-gray-400 tabular-nums">
                      {m.newStock} {latinToCyrillic('qoldi')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title={latinToCyrillic('Mahsulot sozlamalari')}
      >
        <form onSubmit={handleUpdateSettings} className="space-y-4">
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 font-bold">
              {latinToCyrillic('Mahsulotning asosiy parametrlarini tahrirlash')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={latinToCyrillic('Qopdagi dona soni')}
              numeric
              value={settingsForm.unitsPerBag}
              onChange={(e) => setSettingsForm({ ...settingsForm, unitsPerBag: e.target.value })}
              required
            />

            <Input
              label={latinToCyrillic('Minimal zaxira (qop)')}
              numeric
              value={settingsForm.minStockLimit}
              onChange={(e) => setSettingsForm({ ...settingsForm, minStockLimit: e.target.value })}
              required
            />

            <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{latinToCyrillic('Asosiy narxlar (USD)')}</div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase">{latinToCyrillic('Qop narxi ($)')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settingsForm.pricePerBag}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                    setSettingsForm(prev => ({ ...prev, pricePerBag: val }));
                  }}
                  placeholder="0.00"
                  className="w-full bg-white border-2 border-blue-500 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase">{latinToCyrillic('Dona narxi ($)')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settingsForm.pricePerPiece}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                    setSettingsForm(prev => ({ ...prev, pricePerPiece: val }));
                  }}
                  placeholder="0.0000"
                  className="w-full bg-white border-2 border-emerald-500 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="col-span-2 text-[10px] text-gray-500 mt-2">
                {latinToCyrillic('* Narxlar USD da saqlanadi. Joriy kurs')}: 1 USD = {exchangeRates.USD_TO_UZS.toLocaleString()} UZS
              </div>
            </div>

            <Input
              label={latinToCyrillic('Optimal zaxira (qop)')}
              numeric
              value={settingsForm.optimalStock}
              onChange={(e) => setSettingsForm({ ...settingsForm, optimalStock: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {latinToCyrillic('Saqlash')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSettingsModal(false)}
              className="flex-1"
            >
              {latinToCyrillic('Bekor qilish')}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm(latinToCyrillic(`Rostdan ham "${trData(product.name)}" mahsulotni o'chirmoqchimisiz? Bu amal bekor qilinmaydi!`))) {
                  deleteProduct();
                }
              }}
              className="w-full bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white"
            >
              {latinToCyrillic('Mahsulotni butunlay o\'chirish')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Narx belgilash Modal */}
      {showPriceModal && (
        <Modal
          isOpen={showPriceModal}
          onClose={() => setShowPriceModal(false)}
          title={latinToCyrillic('Mijozlar uchun narx belgilash')}
        >
          <PriceModalInner />
        </Modal>
      )}

      {/* Komplekt Modal */}
      {showKomplektModal && (
        <Modal
          isOpen={showKomplektModal}
          onClose={() => {
            setShowKomplektModal(false);
            setKomplektItems([]);
            setKomplektSearch('');
          }}
          title={`${trData(product.name)} - ${latinToCyrillic('Komplekt qo\'shish')}`}
        >
          <div className="space-y-4">
            {/* Qidiruv */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={komplektSearch}
                onChange={(e) => setKomplektSearch(e.target.value)}
                placeholder={latinToCyrillic('Mahsulot qidirish...')}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              />
            </div>

            {/* Tanlangan mahsulotlar */}
            {komplektItems.length > 0 && (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">{latinToCyrillic('Komplekt tarkibi')}:</h4>
                <div className="space-y-2">
                  {komplektItems.map((item, index) => (
                    <div key={item.productId} className="flex items-center justify-between bg-white p-3 rounded-lg">
                      <span className="font-medium">{trData(item.productName)}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            setKomplektItems(prev => prev.map((it, i) =>
                              i === index ? { ...it, quantity: newQty } : it
                            ));
                          }}
                          min="1"
                          aria-label={latinToCyrillic('Miqdor')}
                          className="w-20 px-2 py-1 border rounded text-center"
                        />
                        <span className="text-sm text-gray-500">{latinToCyrillic('dona')}</span>
                        <button
                          onClick={() => setKomplektItems(prev => prev.filter((_, i) => i !== index))}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          aria-label={latinToCyrillic('O\'chirish')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mahsulotlar ro'yxati */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allProducts
                .filter(p => p.name.toLowerCase().includes(komplektSearch.toLowerCase()))
                .filter(p => !komplektItems.some(k => k.productId === p.id))
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setKomplektItems(prev => [...prev, {
                        productId: p.id,
                        productName: trData(p.name),
                        quantity: 1
                      }]);
                      setKomplektSearch('');
                    }}
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors text-left"
                  >
                    <div>
                      <span className="font-medium">{trData(p.name)}</span>
                      <p className="text-sm text-gray-500">{p.currentStock} {latinToCyrillic('qop qoldiq')}</p>
                    </div>
                    <Plus className="w-5 h-5 text-orange-500" />
                  </button>
                ))}
            </div>

            {/* Tugmalar */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowKomplektModal(false);
                  setKomplektItems([]);
                  setKomplektSearch('');
                }}
                className="flex-1"
              >
                {latinToCyrillic('Bekor qilish')}
              </Button>
              <Button
                type="button"
                onClick={handleSaveKomplekt}
                disabled={komplektItems.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {latinToCyrillic('Saqlash')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );

  // Modal ichidagi content - alohida component
  function PriceModalInner() {
    const [localCustomers, setLocalCustomers] = useState<any[]>([]);
    const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [bulkAmount, setBulkAmount] = useState<string>('');
    const [bulkType, setBulkType] = useState<'percent' | 'fixed'>('percent');
    const [customerDiscounts, setCustomerDiscounts] = useState<Record<string, number>>({});

    useEffect(() => {
      loadModalData();
    }, []);

    const loadModalData = async () => {
      setLoading(true);
      try {
        const customersResponse = await api.get('/customers');
        const customersData = extractArray<any>(customersResponse, []);
        setLocalCustomers(customersData);

        // Mijozlarning productPrices maydonidan ushbu mahsulot uchun narxni olish
        const prices: Record<string, string> = {};
        customersData.forEach((customer: any) => {
          if (customer.productPrices && id) {
            try {
              const productPrices = JSON.parse(customer.productPrices);
              if (productPrices[id]) {
                prices[customer.id] = productPrices[id];
              }
            } catch (error) {
              console.error('Error parsing customer prices:', error);
            }
          }
        });
        setLocalPrices(prices);

        // Har bir mijoz uchun chegirma shablonini hisoblash
        const discounts: Record<string, number> = {};
        customersData.forEach((customer: any) => {
          if (customer.productPrices && id && product?.pricePerBag) {
            try {
              const productPrices = JSON.parse(customer.productPrices);
              if (productPrices[id]) {
                const customerPrice = parseFloat(productPrices[id]);
                const standardPrice = product.pricePerBag;
                const discount = standardPrice - customerPrice;
                if (discount !== 0) {
                  discounts[customer.id] = discount;
                }
              }
            } catch (error) {
              console.error('Error parsing customer prices:', error);
            }
          }
        });
        setCustomerDiscounts(discounts);
      } catch (error) {
        console.error('Mijozlarni yuklashda xatolik:', error);
      } finally {
        setLoading(false);
      }
    };

    const applyBulkAdjustment = (increase: boolean) => {
      const amount = parseFloat(bulkAmount);
      if (!amount || amount <= 0) {
        addToast(toast.warning(
          latinToCyrillic('Diqqat'),
          latinToCyrillic('Iltimos, to\'g\'ri miqdor kiriting!')
        ));
        return;
      }

      const updatedPrices: Record<string, string> = {};
      let appliedCount = 0;

      localCustomers.forEach((customer) => {
        // Hozirgi narxni olish
        const currentPriceStr = localPrices[customer.id] || product?.pricePerBag?.toString() || '0';
        const currentPrice = parseFloat(currentPriceStr);

        if (currentPrice > 0) {
          let newPrice: number;

          if (bulkType === 'percent') {
            // Foiz asosida hisoblash
            const adjustment = (currentPrice * amount) / 100;
            newPrice = increase ? currentPrice + adjustment : currentPrice - adjustment;
          } else {
            // Qat'iy miqdor asosida
            newPrice = increase ? currentPrice + amount : currentPrice - amount;
          }

          // Manfiy narxlarni oldini olish
          newPrice = Math.max(0, Math.round(newPrice));
          updatedPrices[customer.id] = newPrice.toString();
          appliedCount++;
        }
      });

      setLocalPrices(updatedPrices);

      const action = increase ? latinToCyrillic('ko\'tarildi') : latinToCyrillic('tushirildi');
      const typeText = bulkType === 'percent' ? `${amount}%` : `${amount} UZS`;
      addToast(toast.success(
        latinToCyrillic('Bajarildi'),
        `${appliedCount} ${latinToCyrillic('ta mijoz uchun narx')} ${typeText} ${latinToCyrillic('ga')} ${action}!`
      ));
    };

    const applyDiscountTemplates = async () => {
      if (Object.keys(customerDiscounts).length === 0) {
        addToast(toast.warning(
          latinToCyrillic('Diqqat'),
          latinToCyrillic('Hech qanday chegirma shabloni topilmadi! Avval kamida bitta mijoz uchun narx belgilang.')
        ));
        return;
      }

      const confirmMsg = `${latinToCyrillic('Chegirma shablonlarini boshqa mahsulotlarga qo\'llash')}:\n\n${
        Object.entries(customerDiscounts).map(([customerId, discount]) => {
          const customer = localCustomers.find(c => c.id === customerId);
          return `- ${trData(customer?.name)}: ${discount > 0 ? '-' : '+'}${Math.abs(discount)} UZS`;
        }).join('\n')
      }\n\n${latinToCyrillic('Davom ettirilsinmi?')}`;

      if (!confirm(confirmMsg)) {
        return;
      }

      try {
        let successCount = 0;
        let errorCount = 0;

        for (const [customerId, discount] of Object.entries(customerDiscounts)) {
          try {
            await api.post(`/customers/${customerId}/apply-discount-template`, {
              discount
            });
            successCount++;
          } catch (error: any) {
            errorCount++;
            console.error('Xatolik:', error);
          }
        }

        if (errorCount === 0) {
          addToast(toast.success(
            latinToCyrillic('Muvaffaqiyatli'),
            `${successCount} ${latinToCyrillic('ta mijoz uchun barcha mahsulotlarga chegirma qo\'llandi')}!`
          ));
        } else {
          addToast(toast.warning(
            latinToCyrillic('Qisman bajarildi'),
            `${successCount} ${latinToCyrillic('ta muvaffaqiyatli')}, ${errorCount} ${latinToCyrillic('ta xatolik')}!`
          ));
        }
      } catch (error: any) {
        console.error('Umumiy xatolik:', error);
        addToast(toast.error(
          latinToCyrillic('Xatolik'),
          latinToCyrillic(error.response?.data?.error || error.message || 'Xatolik yuz berdi')
        ));
      }
    };

    const handleSave = async () => {
      try {
        let savedCount = 0;
        let errorCount = 0;

        for (const customer of localCustomers) {
          const price = localPrices[customer.id];

          // Faqat narx kiritilgan mijozlar uchun
          if (price && price.toString().trim() !== '') {
            try {
              let existingPrices = {};

              // Mavjud narxlarni olish
              if (customer.productPrices) {
                try {
                  existingPrices = JSON.parse(customer.productPrices);
                } catch (parseError) {
                  console.warn(`${customer.name} uchun mavjud narxlarni parse qilishda xatolik:`, parseError);
                  existingPrices = {};
                }
              }

              // Narxni raqamga aylantirish va tekshirish
              const priceNumber = parseFloat(price.toString());
              if (isNaN(priceNumber) || priceNumber < 0) {
                console.error(`${customer.name} uchun noto'g'ri narx:`, price);
                errorCount++;
                continue;
              }

              // Yangi narxni qo'shish
              const newPrices = {
                ...existingPrices,
                [id as string]: priceNumber
              };

              const pricesJson = JSON.stringify(newPrices);

              // Saqlash - FAQAT productPrices maydonini yuborish
              await api.put(`/customers/${customer.id}`, {
                productPrices: pricesJson
              });

              savedCount++;
            } catch (customerError: any) {
              errorCount++;
              const errorDetails = customerError.response?.data;
              console.error(`${customer.name} uchun xatolik:`, errorDetails);
            }
          }
        }

        setShowPriceModal(false);

        if (savedCount === 0) {
          addToast(toast.warning(
            latinToCyrillic('Diqqat'),
            latinToCyrillic('Hech qanday narx saqlanmadi! Iltimos, kamida bitta mijoz uchun narx kiriting.')
          ));
        } else if (errorCount === 0) {
          addToast(toast.success(
            latinToCyrillic('Muvaffaqiyatli'),
            `${savedCount} ${latinToCyrillic('ta mijoz uchun narxlar saqlandi')}!`
          ));
        } else {
          addToast(toast.warning(
            latinToCyrillic('Qisman bajarildi'),
            `${savedCount} ${latinToCyrillic('ta saqlandi')}, ${errorCount} ${latinToCyrillic('ta xatolik')}!`
          ));
        }
      } catch (error: any) {
        console.error('Umumiy xatolik:', error);
        addToast(toast.error(
          latinToCyrillic('Xatolik'),
          latinToCyrillic(error.response?.data?.error || error.message || 'Narxlarni saqlashda xatolik!')
        ));
      }
    };

    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-pulse rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">{latinToCyrillic('Mijozlar yuklanmoqda...')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm font-medium mb-1 text-gray-900">
            <strong>{trData(product?.name)}</strong> {latinToCyrillic('mahsuloti uchun har bir mijozga alohida narx belgilang')}
          </p>
          <p className="text-xs text-gray-500">
            {latinToCyrillic('Asosiy narx')}: <strong>{product?.pricePerBag?.toLocaleString()} UZS</strong>/{latinToCyrillic('qop')}
          </p>
        </div>

        {/* Ommaviy narx o'zgartirish */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
          <h3 className="text-sm font-bold mb-3 text-gray-900">
            {latinToCyrillic('Barcha mijozlar uchun narxni birdan o\'zgartirish')}
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder={latinToCyrillic('Miqdorni kiriting')}
                min="0"
                step="1"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkType('percent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  bulkType === 'percent'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {latinToCyrillic('Foiz')}
              </button>
              <button
                type="button"
                onClick={() => setBulkType('fixed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  bulkType === 'fixed'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                UZS
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => applyBulkAdjustment(true)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {latinToCyrillic('Ko\'tarish')}
            </button>
            <button
              type="button"
              onClick={() => applyBulkAdjustment(false)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Minus className="w-4 h-4" />
              {latinToCyrillic('Tushirish')}
            </button>
          </div>

          <p className="text-xs text-gray-600 mt-2">
            {latinToCyrillic('Masalan: 10% yoki 5000 UZS ga barcha narxlarni birdan o\'zgartiring')}
          </p>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            {latinToCyrillic('Jami')} <strong>{localCustomers.length}</strong> {latinToCyrillic('ta mijoz topildi')}
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
          {localCustomers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium mb-2">
                {latinToCyrillic('Mijozlar yo\'q')}
              </p>
              <p className="text-xs text-gray-400">
                {latinToCyrillic('Avval mijozlar qo\'shing')}
              </p>
            </div>
          ) : (
            localCustomers.map((customer, index) => (
              <div
                key={customer.id}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-all hover:shadow-md bg-white"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg truncate">{trData(customer.name)}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {customer.phone}
                    </span>
                    {customer.pricePerBag && (
                      <span className="text-xs text-blue-600">
                        · {latinToCyrillic('Umumiy')}: {customer.pricePerBag} UZS/{latinToCyrillic('qop')}
                      </span>
                    )}
                    {customerDiscounts[customer.id] && (
                      <span className="text-xs font-bold text-green-600">
                        · {latinToCyrillic('Chegirma')}: {customerDiscounts[customer.id] > 0 ? '-' : '+'}{Math.abs(customerDiscounts[customer.id])} UZS
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">UZS</span>
                  <input
                    type="number"
                    value={localPrices[customer.id] || ''}
                    onChange={(e) => {
                      const newPrice = e.target.value;
                      setLocalPrices(prev => ({
                        ...prev,
                        [customer.id]: newPrice
                      }));

                      // Chegirma shablonini hisoblash va saqlash
                      if (newPrice && product?.pricePerBag) {
                        const customerPrice = parseFloat(newPrice);
                        const standardPrice = product.pricePerBag;
                        const discount = standardPrice - customerPrice;

                        if (discount !== 0) {
                          setCustomerDiscounts(prev => ({
                            ...prev,
                            [customer.id]: discount
                          }));
                        } else {
                          // Agar chegirma 0 bo'lsa, o'chirish
                          setCustomerDiscounts(prev => {
                            const updated = { ...prev };
                            delete updated[customer.id];
                            return updated;
                          });
                        }
                      }
                    }}
                    placeholder={product?.pricePerBag?.toString()}
                    min="0"
                    step="1"
                    aria-label={latinToCyrillic('Narx')}
                    className="w-24 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="text-sm text-gray-600">/{latinToCyrillic('qop')}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chegirma shablonlarini qo'llash */}
        {Object.keys(customerDiscounts).length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
            <h3 className="text-sm font-bold mb-2 text-gray-900">
              {latinToCyrillic('Chegirma shablonlari topildi')}
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              {Object.keys(customerDiscounts).length} {latinToCyrillic('ta mijoz uchun chegirma shabloni mavjud. Ushbu chegirmalarni barcha boshqa mahsulotlarga ham qo\'llashingiz mumkin.')}
            </p>
            <button
              type="button"
              onClick={applyDiscountTemplates}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              {latinToCyrillic('Barcha mahsulotlarga qo\'llash')}
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPriceModal(false)}
            className="flex-1"
          >
            {latinToCyrillic('Bekor qilish')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {latinToCyrillic('Saqlash')}
          </Button>
        </div>
      </div>
    );
  }
}
