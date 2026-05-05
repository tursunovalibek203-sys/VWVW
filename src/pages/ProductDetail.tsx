import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import api from '../lib/professionalApi';
import { extractData, extractArray } from '../lib/apiHelpers';
import { 
  Package, 
  Plus,
  Minus, 
  ArrowLeft, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Users,
  Puzzle,
  X,
  Search
} from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCashier = window.location.pathname.startsWith('/cashier');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustType, setAdjustType] = useState<'units' | 'bags'>('units');
  const [salesStats, setSalesStats] = useState({
    totalSold: 0,
    totalRevenue: 0,
    totalProfit: 0,
    salesCount: 0,
  });
  
  const [adjustForm, setAdjustForm] = useState({
    value: '',
    type: 'ADD',
    reason: '',
    notes: '',
  });
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
      
      alert('Komplekt muvaffaqiyatli saqlandi!');
    } catch (error) {
      console.error('Komplektni saqlashda xatolik:', error);
      alert('Komplektni saqlashda xatolik yuz berdi');
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
      
      // Sotuv statistikasini yuklash
      try {
        const salesResponse = await api.get(`/sales?productId=${id}`);
        const sales = extractArray<any>(salesResponse, []);
        
        // Statistikani hisoblash
        const totalSold = sales.reduce((sum: number, sale: any) => {
          const item = sale.items?.find((i: any) => i.productId === id);
          return sum + (item?.quantity || 0);
        }, 0);
        
        const totalRevenue = sales.reduce((sum: number, sale: any) => {
          const item = sale.items?.find((i: any) => i.productId === id);
          return sum + (item?.totalPrice || 0);
        }, 0);
        
        const totalProfit = sales.reduce((sum: number, sale: any) => {
          const item = sale.items?.find((i: any) => i.productId === id);
          const profit = (item?.totalPrice || 0) - ((item?.quantity || 0) * data.pricePerBag);
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
      alert('✅ Mahsulot muvaffaqiyatli o\'chirildi!');
      navigate(isCashier ? '/cashier/products' : '/products');
    } catch (error) {
      console.error('Mahsulotni o\'chirishda xatolik:', error);
      alert('❌ Xatolik yuz berdi!');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const pBag = parseFloat(settingsForm.pricePerBag);
    const pPiece = parseFloat(settingsForm.pricePerPiece);
    const units = parseInt(settingsForm.unitsPerBag);
    
    if (isNaN(units) || units <= 0) {
      alert('Qopdagi donalar soni musbat bo\'lishi kerak');
      return;
    }
    if (!isNaN(pBag) && pBag < 0) {
      alert('Narx manfiy bo\'lishi mumkin emas');
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
      alert('✅ Sozlamalar yangilandi!');
    } catch (error: any) {
      if (error.response?.status === 403) {
        const requiredRoles = error.response?.data?.requiredRoles?.join(', ') || 'ADMIN, WAREHOUSE_MANAGER, MANAGER';
        const yourRole = error.response?.data?.yourRole || 'unknown';
        alert(`❌ Ruxsat yo'q! Sizning rolingiz: ${yourRole}\nKerakli rollar: ${requiredRoles}`);
      } else {
        alert('❌ Sozlamalarni yangilashda xatolik');
      }
    }
  };


  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const value = parseInt(adjustForm.value);
    if (isNaN(value) || value <= 0) {
      alert('Iltimos, musbat son kiriting');
      return;
    }
    
    // Agar sabab tanlanmagan bo'lsa, "Boshqa" deb o'rnatish
    const reason = adjustForm.reason || 'Boshqa';
    
    try {
      const endpoint = adjustType === 'units' ? 'adjust-units' : 'adjust-bags';
      const payload = adjustType === 'units' 
        ? { units: value, type: adjustForm.type, reason, notes: adjustForm.notes }
        : { bags: value, type: adjustForm.type, reason, notes: adjustForm.notes };
      
      await api.post(`/products/${id}/${endpoint}`, payload);
      
      setShowAdjustModal(false);
      setAdjustForm({ value: '', type: 'ADD', reason: '', notes: '' });
      loadProduct();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const getStockStatus = () => {
    if (!product) return { color: 'text-gray-500', label: 'Noma\'lum', icon: AlertCircle };
    if (product.currentStock === 0) return { color: 'text-red-500', label: 'Tugagan', icon: AlertCircle };
    if (product.currentStock < product.minStockLimit) return { color: 'text-red-500', label: 'Kritik', icon: AlertCircle };
    if (product.currentStock < product.optimalStock) return { color: 'text-yellow-500', label: 'Kam', icon: AlertCircle };
    return { color: 'text-green-500', label: 'Yaxshi', icon: CheckCircle };
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Package className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse rounded-lg" />
          <p className="text-lg font-semibold">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 rounded-lg" />
        <p className="text-muted-foreground">Mahsulot topilmadi</p>
        <Button onClick={() => navigate(isCashier ? '/cashier/products' : '/products')} className="mt-4">
          Orqaga
        </Button>
      </div>
    );
  }

  const status = getStockStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(isCashier ? '/cashier/products' : '/products')}>
            <ArrowLeft className="w-4 h-4 mr-2 rounded-lg" />
            Orqaga
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-semibold uppercase tracking-widest">
                {product.warehouse === 'preform' ? '📦 PREFORMA' : 
                 product.warehouse === 'krishka' ? '⭕ QOPQOQ' : 
                 product.warehouse === 'ruchka' ? '🎗️ RUCHKA' : '🛠️ BOSHQA'}
              </span>
              {product.productType && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-semibold uppercase tracking-widest">
                  {product.productType.name}
                </span>
              )}
              {product.category && (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-semibold uppercase tracking-widest">
                  {product.category.name}
                </span>
              )}
              {product.bagType && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded text-[10px] font-semibold uppercase tracking-widest">
                  {product.bagType}
                </span>
              )}
              {product.subType && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[10px] font-semibold uppercase tracking-widest">
                  {product.subType}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
            className="border-purple-500 text-purple-500 hover:bg-purple-50"
          >
            <Settings className="w-4 h-4 mr-2 rounded-lg" />
            Sozlamalar
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowPriceModal(true)}
            className="border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            <DollarSign className="w-4 h-4 mr-2 rounded-lg" />
            Narx Belgilash
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setShowKomplektModal(true);
              loadAllProducts();
            }}
            className="border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            <Puzzle className="w-4 h-4 mr-2 rounded-lg" />
            Komplekt
          </Button>
          <Button 
            onClick={() => {
              setAdjustType('bags');
              setAdjustForm({ ...adjustForm, type: 'ADD' });
              setShowAdjustModal(true);
            }}
            className="bg-green-600 hover:bg-green-700"
            title="Omborga qop qo'shish (ishlab chiqarish, import)"
          >
            <Plus className="w-4 h-4 mr-2 rounded-lg" />
            Qop Qo'shish
          </Button>
          <Button 
            onClick={() => {
              setAdjustType('bags');
              setAdjustForm({ ...adjustForm, type: 'REMOVE' });
              setShowAdjustModal(true);
            }}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50"
            title="Ombordan qop ayirish (yaroqsiz, yo'qotish)"
          >
            <Minus className="w-4 h-4 mr-2 rounded-lg" />
            Qop Ayirish
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Jami Qoplar</span>
              <Package className="w-5 h-5 text-blue-500 rounded-lg" />
            </div>
            <p className="text-3xl font-bold">{product.currentStock}</p>
            <p className="text-xs text-muted-foreground mt-1">qop</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Qopdagi Dona</span>
              <Package className="w-5 h-5 text-orange-500 rounded-lg" />
            </div>
            <p className="text-3xl font-bold">{product.unitsPerBag}</p>
            <p className="text-xs text-muted-foreground mt-1">dona/qop</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Jami Donalar</span>
              <Package className="w-5 h-5 text-purple-500 rounded-lg" />
            </div>
            <p className="text-3xl font-bold">{product.currentUnits}</p>
            <p className="text-xs text-muted-foreground mt-1">dona</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Holat</span>
              <StatusIcon className={`w-5 h-5 ${status.color} rounded-lg`} />
            </div>
            <p className={`text-2xl font-bold ${status.color}`}>{status.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Min: {product.minStockLimit} qop
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Info */}
      <Card>
        <CardHeader>
          <CardTitle>Mahsulot Ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Qop Narxi (UZS)</p>
              <p className="text-xl font-bold text-emerald-600">{(product.pricePerBag || 0).toLocaleString()} UZS</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Qop Narxi ($)</p>
              <p className="text-xl font-bold text-blue-600">${(product.pricePerBag / exchangeRates.USD_TO_UZS).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dona Narxi (UZS)</p>
              <p className="text-xl font-bold text-emerald-600">{(product.pricePerPiece || 0).toLocaleString()} UZS</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dona Narxi ($)</p>
              <p className="text-xl font-bold text-blue-600">${(product.pricePerPiece / exchangeRates.USD_TO_UZS).toFixed(4)}</p>
            </div>
            <div className="pt-4 border-t col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Minimal Zaxira</p>
                <p className="font-semibold">{product.minStockLimit} qop</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Optimal Zaxira</p>
                <p className="font-semibold">{product.optimalStock} qop</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qopdagi dona</p>
                <p className="font-semibold">{product.unitsPerBag} dona</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Analytics */}
      {salesStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Jami Sotilgan</span>
                <ShoppingCart className="w-5 h-5 text-green-500 rounded-lg" />
              </div>
              <p className="text-3xl font-bold text-green-600">{salesStats.totalSold}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {salesStats.salesCount} ta sotuv
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Jami Daromad</span>
                <DollarSign className="w-5 h-5 text-blue-500 rounded-lg" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {salesStats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">UZS</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Jami Foyda</span>
                <TrendingUp className="w-5 h-5 text-emerald-500 rounded-lg" />
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                {salesStats.totalProfit.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">UZS</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Chart */}
      {salesStats && salesStats.totalSold > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 rounded-lg" />
              Sotuv Analitikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress bars */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Sotilgan Mahsulotlar</span>
                  <span className="text-sm text-muted-foreground">
                    {salesStats.totalSold} / {product.currentStock + salesStats.totalSold}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(salesStats.totalSold / (product.currentStock + salesStats.totalSold)) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Foyda Darajasi</span>
                  <span className="text-sm text-muted-foreground">
                    {((salesStats.totalProfit / salesStats.totalRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(salesStats.totalProfit / salesStats.totalRevenue) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{salesStats.salesCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sotuvlar soni</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {(salesStats.totalRevenue / salesStats.salesCount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">O'rtacha sotuv</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {(salesStats.totalSold / salesStats.salesCount).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">O'rtacha miqdor</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {(salesStats.totalProfit / salesStats.totalSold).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Qop foyda</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adjust Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={`${adjustType === 'units' ? 'Dona' : 'Qop'} ${adjustForm.type === 'ADD' ? 'Qo\'shish' : 'Ayirish'}`}
      >
        <form onSubmit={handleAdjust} className="space-y-4">
          <Input
            label={adjustType === 'units' ? 'Dona Soni' : 'Qop Soni'}
            type="number"
            min="1"
            value={adjustForm.value}
            onChange={(e) => setAdjustForm({ ...adjustForm, value: e.target.value })}
            required
            autoFocus
          />

          {/* Sabab tanlash (ixtiyoriy) */}
          <div>
            <label htmlFor="adjust-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Sabab (ixtiyoriy)
            </label>
            <select
              id="adjust-reason"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Sabab tanlash"
            >
              <option value="">-- Boshqa --</option>
              <option value="Ishlab chiqarish">Ishlab chiqarish</option>
              <option value="Import">Import</option>
              <option value="Yaroqsiz">Yaroqsiz (brak)</option>
              <option value="Yo'qotish">Yo'qotish</option>
              <option value="Tuzatish">Tuzatish</option>
              <option value="Sotuv qaytarish">Sotuv qaytarish</option>
            </select>
          </div>

          {/* Izoh (ixtiyoriy) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Izoh (ixtiyoriy)
            </label>
            <textarea
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              placeholder="Qo'shimcha ma'lumot..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Tasdiqlash
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAdjustModal(false)}
              className="flex-1"
            >
              Bekor qilish
            </Button>
          </div>
        </form>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Mahsulot Sozlamalari"
      >
        <form onSubmit={handleUpdateSettings} className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground font-bold">
              Mahsulotning asosiy parametrlarini tahrirlash
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qopdagi Dona Soni"
              numeric
              value={settingsForm.unitsPerBag}
              onChange={(e) => setSettingsForm({ ...settingsForm, unitsPerBag: e.target.value })}
              required
            />
            
            <Input
              label="Minimal Zaxira (qop)"
              numeric
              value={settingsForm.minStockLimit}
              onChange={(e) => setSettingsForm({ ...settingsForm, minStockLimit: e.target.value })}
              required
            />
            
            <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Asosiy Narxlar (USD)</div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase">Qop Narxi ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settingsForm.pricePerBag}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                    setSettingsForm(prev => ({ ...prev, pricePerBag: val }));
                  }}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase">Dona Narxi ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settingsForm.pricePerPiece}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                    setSettingsForm(prev => ({ ...prev, pricePerPiece: val }));
                  }}
                  placeholder="0.0000"
                  className="w-full bg-white dark:bg-gray-900 border-2 border-emerald-500 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                />
              </div>
              
              <div className="col-span-2 text-[10px] text-gray-500 mt-2">
                * Narxlar USD da saqlanadi. Joriy kurs: 1 USD = {exchangeRates.USD_TO_UZS.toLocaleString()} UZS
              </div>
            </div>
            
            <Input
              label="Optimal Zaxira (qop)"
              numeric
              value={settingsForm.optimalStock}
              onChange={(e) => setSettingsForm({ ...settingsForm, optimalStock: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Saqlash
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowSettingsModal(false)}
              className="flex-1"
            >
              Bekor qilish
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm(`Ростдан ҳам "${product.name}" маҳсулотни ўчирмоқчимисиз? Бу амал бекор қилинмайdi!`)) {
                  deleteProduct();
                }
              }}
              className="w-full bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white"
            >
              Mahsulotni butunlay o'chirish
            </Button>
          </div>
        </form>
      </Modal>

      {/* Narx belgilash Modal */}
      {showPriceModal && (
        <Modal
          isOpen={showPriceModal}
          onClose={() => setShowPriceModal(false)}
          title="Mijozlar uchun narx belgilash"
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
          title={`${product.name} - Komplekt qo'shish`}
        >
          <div className="space-y-4">
            {/* Qidiruv */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={komplektSearch}
                onChange={(e) => setKomplektSearch(e.target.value)}
                placeholder="Mahsulot qidirish..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              />
            </div>

            {/* Tanlangan mahsulotlar */}
            {komplektItems.length > 0 && (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">Komplekt tarkibi:</h4>
                <div className="space-y-2">
                  {komplektItems.map((item, index) => (
                    <div key={item.productId} className="flex items-center justify-between bg-white p-3 rounded-lg">
                      <span className="font-medium">{item.productName}</span>
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
                          aria-label="Quantity"
                          className="w-20 px-2 py-1 border rounded text-center"
                        />
                        <span className="text-sm text-gray-500">dona</span>
                        <button
                          onClick={() => setKomplektItems(prev => prev.filter((_, i) => i !== index))}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          aria-label="Remove item"
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
                        productName: p.name,
                        quantity: 1
                      }]);
                      setKomplektSearch('');
                    }}
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors text-left"
                  >
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <p className="text-sm text-gray-500">{p.currentStock} qop qoldiq</p>
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
                Bekor qilish
              </Button>
              <Button
                type="button"
                onClick={handleSaveKomplekt}
                disabled={komplektItems.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                Saqlash
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
        console.log('📥 Mijozlar yuklanmoqda...');
        const customersResponse = await api.get('/customers');
        const customersData = extractArray<any>(customersResponse, []);
        console.log('✅ Mijozlar yuklandi:', customersData.length, 'ta');
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
        console.log('💰 Narxlar yuklandi:', Object.keys(prices).length, 'ta');
        
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
                  console.log(`💎 ${customer.name}: chegirma ${discount} UZS`);
                }
              }
            } catch (error) {
              console.error('Error parsing customer prices:', error);
            }
          }
        });
        setCustomerDiscounts(discounts);
        console.log('🎁 Chegirma shablonlari yuklandi:', Object.keys(discounts).length, 'ta');
      } catch (error) {
        console.error('❌ Mijozlarni yuklashda xatolik:', error);
      } finally {
        setLoading(false);
      }
    };

    const applyBulkAdjustment = (increase: boolean) => {
      const amount = parseFloat(bulkAmount);
      if (!amount || amount <= 0) {
        alert('⚠️ Iltimos, to\'g\'ri miqdor kiriting!');
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
      
      const action = increase ? 'ko\'tarildi' : 'tushirildi';
      const typeText = bulkType === 'percent' ? `${amount}%` : `${amount} UZS`;
      alert(`✅ ${appliedCount} ta mijoz uchun narx ${typeText} ga ${action}!`);
    };

    const applyDiscountTemplates = async () => {
      if (Object.keys(customerDiscounts).length === 0) {
        alert('⚠️ Hech qanday chegirma shabloni topilmadi!\n\nAvval kamida bitta mijoz uchun narx belgilang.');
        return;
      }
      
      const confirmMsg = `🎁 Chegirma shablonlarini boshqa mahsulotlarga qo'llash:\n\n${
        Object.entries(customerDiscounts).map(([customerId, discount]) => {
          const customer = localCustomers.find(c => c.id === customerId);
          return `• ${customer?.name}: ${discount > 0 ? '-' : '+'}${Math.abs(discount)} UZS`;
        }).join('\n')
      }\n\nDavom ettirilsinmi?`;
      
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
            const customer = localCustomers.find(c => c.id === customerId);
            console.log(`✅ ${customer?.name} uchun chegirma qo'llandi`);
          } catch (error: any) {
            errorCount++;
            console.error(`❌ Xatolik:`, error);
          }
        }
        
        if (errorCount === 0) {
          alert(`✅ Barcha chegirma shablonlari muvaffaqiyatli qo'llandi!\n\n${successCount} ta mijoz uchun barcha mahsulotlarga chegirma qo'llandi.`);
        } else {
          alert(`⚠️ ${successCount} ta muvaffaqiyatli, ${errorCount} ta xatolik!`);
        }
      } catch (error: any) {
        console.error('❌ Umumiy xatolik:', error);
        alert(`Xatolik: ${error.response?.data?.error || error.message}`);
      }
    };

    const handleSave = async () => {
      try {
        console.log('💾 Narxlar saqlanmoqda...');
        console.log('📝 Kiritilgan narxlar:', localPrices);
        console.log('👥 Mijozlar soni:', localCustomers.length);
        
        // Debug
        Object.keys(localPrices).forEach(key => {
          console.log(`  - ${key}: "${localPrices[key]}" (${typeof localPrices[key]})`);
        });
        
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
                  console.warn(`⚠️ ${customer.name} uchun mavjud narxlarni parse qilishda xatolik:`, parseError);
                  existingPrices = {};
                }
              }
              
              // Narxni raqamga aylantirish va tekshirish
              const priceNumber = parseFloat(price.toString());
              if (isNaN(priceNumber) || priceNumber < 0) {
                console.error(`❌ ${customer.name} uchun noto'g'ri narx:`, price);
                errorCount++;
                continue;
              }
              
              // Yangi narxni qo'shish
              const newPrices = {
                ...existingPrices,
                [id as string]: priceNumber
              };
              
              console.log(`💰 ${customer.name} uchun narx saqlanmoqda:`, priceNumber);
              console.log(`📊 Yangi narxlar obyekti:`, newPrices);
              
              const pricesJson = JSON.stringify(newPrices);
              console.log(`📝 JSON string:`, pricesJson);
              console.log(`📏 JSON uzunligi:`, pricesJson.length);
              
              // Saqlash - FAQAT productPrices maydonini yuborish
              const response = await api.put(`/customers/${customer.id}`, {
                productPrices: pricesJson
              });
              
              console.log(`✅ Response:`, response.data);
              
              savedCount++;
              console.log(`✅ ${customer.name} uchun narx saqlandi`);
            } catch (customerError: any) {
              errorCount++;
              const errorDetails = customerError.response?.data;
              console.error(`❌ ${customer.name} uchun xatolik:`, errorDetails);
              console.error('Full error object:', {
                message: customerError.message,
                status: customerError.response?.status,
                data: errorDetails,
                code: errorDetails?.code,
                meta: errorDetails?.meta
              });
            }
          }
        }
        
        setShowPriceModal(false);
        
        if (savedCount === 0) {
          alert(`⚠️ Hech qanday narx saqlanmadi!\n\nIltimos, kamida bitta mijoz uchun narx kiriting.`);
        } else if (errorCount === 0) {
          alert(`✅ ${savedCount} ta mijoz uchun narxlar muvaffaqiyatli saqlandi!`);
        } else {
          alert(`⚠️ ${savedCount} ta saqlandi, ${errorCount} ta xatolik!`);
        }
        
        console.log(`📊 Natija: ${savedCount} saqlandi, ${errorCount} xatolik`);
      } catch (error: any) {
        console.error('❌ Umumiy xatolik:', error);
        alert(`Xatolik: ${error.response?.data?.error || error.message || 'Narxlarni saqlashda xatolik!'}`);
      }
    };

    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Mijozlar yuklanmoqda...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">
            📦 <strong>{product?.name}</strong> mahsuloti uchun har bir mijozga alohida narx belgilang
          </p>
          <p className="text-xs text-muted-foreground">
            💰 Asosiy narx: <strong>{product?.pricePerBag?.toLocaleString()} UZS</strong>/qop
          </p>
        </div>

        {/* Ommaviy narx o'zgartirish */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            Barcha mijozlar uchun narxni birdan o'zgartirish
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder="Miqdorni kiriting"
                min="0"
                step="1"
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:bg-gray-800"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkType('percent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  bulkType === 'percent'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                % Foiz
              </button>
              <button
                type="button"
                onClick={() => setBulkType('fixed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  bulkType === 'fixed'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                UZS So'm
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => applyBulkAdjustment(true)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">📈</span>
              Ko'tarish
            </button>
            <button
              type="button"
              onClick={() => applyBulkAdjustment(false)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">📉</span>
              Tushirish
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            💡 Masalan: 10% yoki 5000 UZS ga barcha narxlarni birdan o'zgartiring
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ℹ️ Jami <strong>{localCustomers.length}</strong> ta mijoz topildi
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
          {localCustomers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium mb-2">
                Mijozlar yo'q
              </p>
              <p className="text-xs text-gray-400">
                Avval mijozlar qo'shing
              </p>
            </div>
          ) : (
            localCustomers.map((customer, index) => (
              <div 
                key={customer.id} 
                className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-md bg-white dark:bg-gray-800"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg truncate">{customer.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">📞 {customer.phone}</span>
                    {customer.pricePerBag && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        • Umumiy: {customer.pricePerBag} UZS/qop
                      </span>
                    )}
                    {customerDiscounts[customer.id] && (
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">
                        • Chegirma: {customerDiscounts[customer.id] > 0 ? '-' : '+'}{Math.abs(customerDiscounts[customer.id])} UZS
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">UZS</span>
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
                          console.log(`🎁 ${customer.name} uchun chegirma saqlandi: ${discount} UZS`);
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
                    className="w-24 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">/qop</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chegirma shablonlarini qo'llash */}
        {Object.keys(customerDiscounts).length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <span className="text-lg">🎁</span>
              Chegirma shablonlari topildi
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {Object.keys(customerDiscounts).length} ta mijoz uchun chegirma shabloni mavjud. 
              Ushbu chegirmalarni barcha boshqa mahsulotlarga ham qo'llashingiz mumkin.
            </p>
            <button
              type="button"
              onClick={applyDiscountTemplates}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">✨</span>
              Barcha mahsulotlarga qo'llash
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
            Bekor qilish
          </Button>
          <Button 
            type="button"
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            💾 Saqlash
          </Button>
        </div>
      </div>
    );
  }
}
