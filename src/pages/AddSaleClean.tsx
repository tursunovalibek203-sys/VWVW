/**
 * AddSaleClean.tsx - Sotuv qo'shish sahifasi (yangilangan versiya)
 *
 * Xususiyatlar:
 * 1. Komplekt rejimi: Preform tanlanganda avtomatik ravishda mos keluvchi krishka va ruchka qo'shiladi
 * 2. 48 ruchka: 1000 dona/qop, dona narxi: $0.016
 * 3. 48 krishka: 2000 dona/qop, dona narxi: $0.016
 * 4. 28 krishka (bezgaz): dona narxi $0.007, (gazlik): $0.008
 * 5. 38 ruchka: 1000 dona/qop, dona narxi: $0.010
 *
 * Komplekt qoidalari:
 * - 15, 21, 26, 30gr preform → 28 krishka (faqat krishka)
 * - 36gr preform → 28 krishka + 28 ruchka
 * - 52, 70gr preform → 38 krishka + 38 ruchka
 * - 75, 80, 85, 86, 135gr preform → 48 krishka + 48 ruchka
 */

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Package, ShoppingCart, User, WifiOff, AlertCircle, RefreshCw, Search, Trash2, Truck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { printReceipt } from '../lib/receiptPrinter';
import { latinToCyrillic, forceLatinToCyrillic } from '../lib/transliterator';
import { useSaleForm } from '../hooks/useSaleForm';
import { ProductTypeCard, CartItem, GroupedCartItem, PaymentSection } from '../components/sales';
import { filterProductsByCategory } from '../lib/saleUtils';
import { useRealtime } from '../hooks/useRealtime';
import api from '../lib/professionalApi';
import { extractArray } from '../lib/apiHelpers';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PageLoading } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast, toast } from '../components/ui/Toast';
import type { Product } from '../types';

// Product Section Component - Yangi tip kartochkalar
const ProductSection = ({
  filteredProducts,
  currency,
  productSearch,
  activeCategory,
  latinToCyrillic,
  onSearchChange,
  onCategoryChange,
  onSelectProduct,
}: {
  filteredProducts: Product[];
  currency: string;
  productSearch: string;
  activeCategory: string;
  latinToCyrillic: (text: string) => string;
  onSearchChange: (val: string) => void;
  onCategoryChange: (cat: string) => void;
  onSelectProduct: (product: Product) => void;
}) => {
  const categories = [
    { id: 'all', label: latinToCyrillic('Hammasi') },
    { id: 'preform', label: latinToCyrillic('Preform') },
    { id: 'krishka', label: latinToCyrillic('Krishka') },
    { id: 'ruchka', label: latinToCyrillic('Ruchka') },
    { id: 'other', label: latinToCyrillic('Boshqa') },
  ];

  // Group products by type
  const allPreforms = filteredProducts.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const warehouse = p.warehouse?.toLowerCase() || '';
    return warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/.test(name);
  });

  // Preformlarni gram bo'yicha dinamik guruhlash
  const gramSizeMap = new Map<number, Product[]>();

  allPreforms.forEach((p) => {
    const name = p.name?.toLowerCase() || '';
    const bagType = p.bagType?.toLowerCase() || '';
    // Kirill гр / Latin gr — \b ishlamaydi Kirill uchun, shuning uchun olib tashlandi
    const gramMatch = (bagType + ' ' + name).match(/(\d+)\s*(?:гр|г|gr|g)/i);
    if (gramMatch) {
      const gramSize = parseInt(gramMatch[1]);
      if (!gramSizeMap.has(gramSize)) gramSizeMap.set(gramSize, []);
      gramSizeMap.get(gramSize)!.push(p);
    }
  });

  const sortedGramSizes = Array.from(gramSizeMap.keys()).sort((a, b) => a - b);
  const groupedPreformIds = new Set(sortedGramSizes.flatMap(g => gramSizeMap.get(g)!.map(p => p.id)));
  const preformGroups: { key: string; title: string; products: Product[] }[] = [];

  sortedGramSizes.forEach((gram) => {
    const groupProducts = gramSizeMap.get(gram)!;
    if (groupProducts.length > 0) {
      preformGroups.push({
        key: `${gram}gr`,
        title: `${gram} гр`,
        products: groupProducts,
      });
    }
  });

  const undefinedGramPreforms = allPreforms.filter(p => !groupedPreformIds.has(p.id));
  if (undefinedGramPreforms.length > 0) {
    preformGroups.push({ key: 'nomsiz', title: 'Boshqa Preformlar', products: undefinedGramPreforms });
  }

  // Krishkalarni o'lchami (mm) bo'yicha guruhlash
  const allKrishka = filteredProducts.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const warehouse = p.warehouse?.toLowerCase() || '';
    return warehouse === 'krishka' || name.includes('krishka') || name.includes('qopqoq') || name.includes('cap');
  });

  const krishkaSizeMap = new Map<number, Product[]>();

  allKrishka.forEach((p) => {
    const name = p.name?.toLowerCase() || '';
    // Nomdan birinchi 2-3 raqamli sonni olish: "Кришка 28 кук" → 28
    const sizeMatch = name.match(/(\d{2,3})/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      if ([28, 38, 48, 55].includes(size)) {
        if (!krishkaSizeMap.has(size)) krishkaSizeMap.set(size, []);
        krishkaSizeMap.get(size)!.push(p);
      }
    }
  });

  const sortedKrishkaSizes = Array.from(krishkaSizeMap.keys()).sort((a, b) => a - b);
  const groupedKrishkaIds = new Set(sortedKrishkaSizes.flatMap(s => krishkaSizeMap.get(s)!.map(p => p.id)));
  const krishkaGroups: { key: string; title: string; products: Product[] }[] = [];

  sortedKrishkaSizes.forEach((size) => {
    const groupProducts = krishkaSizeMap.get(size)!;
    if (groupProducts.length > 0) {
      krishkaGroups.push({ key: `${size}mm`, title: `${size}mm Krishka`, products: groupProducts });
    }
  });

  const undefinedSizeKrishka = allKrishka.filter(p => !groupedKrishkaIds.has(p.id));
  if (undefinedSizeKrishka.length > 0) {
    krishkaGroups.push({ key: 'nomsiz-krishka', title: 'Boshqa Krishkalar', products: undefinedSizeKrishka });
  }

  // Ruchkalarni o'lchami (mm) bo'yicha guruhlash
  const allRuchka = filteredProducts.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const warehouse = p.warehouse?.toLowerCase() || '';
    return warehouse === 'ruchka' || name.includes('ruchka') || name.includes('handle');
  });

  const ruchkaSizeMap = new Map<number, Product[]>();

  allRuchka.forEach((p) => {
    const name = p.name?.toLowerCase() || '';
    // "Ручка 28 сарик 1500" → birinchi 2-3 raqamli son = 28
    const sizeMatch = name.match(/(\d{2,3})/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      if ([28, 38, 48].includes(size)) {
        if (!ruchkaSizeMap.has(size)) ruchkaSizeMap.set(size, []);
        ruchkaSizeMap.get(size)!.push(p);
      }
    }
  });

  const sortedRuchkaSizes = Array.from(ruchkaSizeMap.keys()).sort((a, b) => a - b);
  const groupedRuchkaIds = new Set(sortedRuchkaSizes.flatMap(s => ruchkaSizeMap.get(s)!.map(p => p.id)));
  const ruchkaGroups: { key: string; title: string; products: Product[] }[] = [];

  sortedRuchkaSizes.forEach((size) => {
    const groupProducts = ruchkaSizeMap.get(size)!;
    if (groupProducts.length > 0) {
      ruchkaGroups.push({ key: `${size}mm-ruchka`, title: `${size}mm Ruchka`, products: groupProducts });
    }
  });

  const undefinedSizeRuchka = allRuchka.filter(p => !groupedRuchkaIds.has(p.id));
  if (undefinedSizeRuchka.length > 0) {
    ruchkaGroups.push({ key: 'nomsiz-ruchka', title: 'Boshqa Ruchkalar', products: undefinedSizeRuchka });
  }

  // Custom turlarni alohida guruhlash (custom- boshlangan warehouse ID lar)
  const customGroups: { key: string; title: string; products: Product[] }[] = [];
  const customProducts = filteredProducts.filter((p) => {
    const warehouse = p.warehouse || '';
    return warehouse.startsWith('custom-');
  });

  // Custom turlarni guruhlash
  const customWarehouses = Array.from(new Set(customProducts.map(p => p.warehouse)));
  customWarehouses.forEach(warehouse => {
    const safeWarehouse = warehouse || '';
    const groupProducts = customProducts.filter(p => p.warehouse === warehouse);
    if (groupProducts.length > 0) {
      // Mahsulot nomidan tur nomini olish (masalan: "ETIKETKA OQ" -> "ETIKETKA")
      const firstProduct = groupProducts[0];
      const productName = (firstProduct.name || safeWarehouse) as string;
      const nameParts = productName.split(' ');
      const title = nameParts[0].toUpperCase();
      customGroups.push({
        key: safeWarehouse,
        title: title,
        products: groupProducts,
      });
    }
  });

  const otherProducts = filteredProducts.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const warehouse = p.warehouse?.toLowerCase() || '';
    const isPreform = warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/.test(name);
    const isKrishka = warehouse === 'krishka' || name.includes('krishka') || name.includes('qopqoq') || name.includes('cap');
    const isRuchka = warehouse === 'ruchka' || name.includes('ruchka') || name.includes('handle');
    const isCustom = warehouse.startsWith('custom-');
    return !isPreform && !isKrishka && !isRuchka && !isCustom;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4">
      {/* Section title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <Package className="w-[18px] h-[18px]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">{latinToCyrillic('Mahsulotlar')}</h2>
          <p className="text-xs text-slate-400 tabular-nums">{filteredProducts.length} {latinToCyrillic('mahsulot')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={latinToCyrillic('Mahsulot qidirish...')}
          value={productSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`min-h-[40px] px-4 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
              activeCategory === cat.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Type Cards */}
      <div className="space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 -mr-1">
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={latinToCyrillic('Mahsulot topilmadi')}
            description={latinToCyrillic('Qidiruvni o\'zgartiring yoki boshqa turkumni tanlang')}
          />
        ) : (
          <div className="space-y-3">
            {preformGroups.map((group) => (
              <ProductTypeCard
                key={group.key}
                title={latinToCyrillic(group.title)}
                color="blue"
                products={group.products}
                currency={currency}
                onSelectProduct={onSelectProduct}

                latinToCyrillic={latinToCyrillic}
              />
            ))}
            {krishkaGroups.map((group) => (
              <ProductTypeCard
                key={group.key}
                title={latinToCyrillic(group.title)}
                color="purple"
                products={group.products}
                currency={currency}
                onSelectProduct={onSelectProduct}

                latinToCyrillic={latinToCyrillic}
              />
            ))}
            {ruchkaGroups.map((group) => (
              <ProductTypeCard
                key={group.key}
                title={latinToCyrillic(group.title)}
                color="pink"
                products={group.products}
                currency={currency}
                onSelectProduct={onSelectProduct}

                latinToCyrillic={latinToCyrillic}
              />
            ))}
            {/* Custom turlar */}
            {customGroups.map((group) => (
              <ProductTypeCard
                key={group.key}
                title={group.title}
                color="green"
                products={group.products}
                currency={currency}
                onSelectProduct={onSelectProduct}

                latinToCyrillic={latinToCyrillic}
              />
            ))}
            {otherProducts.length > 0 && (
              <ProductTypeCard
                title={latinToCyrillic('Boshqa mahsulotlar')}
                color="orange"
                products={otherProducts}
                currency={currency}
                onSelectProduct={onSelectProduct}

                latinToCyrillic={latinToCyrillic}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
export default function AddSaleClean() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const editSale = location.state?.editSale;
  const orderData = location.state?.orderData;
  const { isOnline } = useOnlineStatus();

  const debtItem = location.state?.debtItem; // CustomerProfile dan kelgan qarz ma'lumoti
  const presetCustomerId = location.state?.customerId;

  const saleForm = useSaleForm({ editSale, orderData });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; name: string; phone?: string; debtToCompany?: number; debtToCompanyUSD?: number }[]>([]);
  const [driverSearch, setDriverSearch] = useState('');

  // Inline new driver form
  const [showNewDriverForm, setShowNewDriverForm] = useState(false);
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [addingDriver, setAddingDriver] = useState(false);

  // Inline new customer form
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Mijoz mahsulot qarzlari
  const [customerProductDebts, setCustomerProductDebts] = useState<any[]>([]);

  // Real-time product sync
  const handleProductUpdate = useCallback((updatedProduct: Product) => {
    // Update products list
    saleForm.setProducts((prev: Product[]) => {
      const exists = prev.find(p => p.id === updatedProduct.id);
      if (exists) {
        return prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p);
      }
      return [...prev, updatedProduct];
    });

    // Sync cart items with updated inventory
    if (saleForm.form.items.length > 0) {
      const updatedItems = saleForm.form.items.map(item => {
        if (item.productId === updatedProduct.id) {
          console.log('🔄 Realtime sync updating item:', item.productName, 'Old price:', item.pricePerBag, 'New price:', updatedProduct.pricePerBag);
          return {
            ...item,
            // Faqat ombor qoldig'ini yangilaymiz, narxni yo'q
            // pricePerBag: updatedProduct.pricePerBag,
            // pricePerPiece: updatedProduct.pricePerPiece,
            unitsPerBag: updatedProduct.unitsPerBag,
            productName: updatedProduct.name,
          };
        }
        return item;
      });

      // Update cart with new product data
      if (JSON.stringify(updatedItems) !== JSON.stringify(saleForm.form.items)) {
        console.log('🔄 Realtime sync: Updating cart items');
        saleForm.form.items = updatedItems;
      }
    }
  }, [saleForm.setProducts]);

  const handleProductDelete = useCallback((deletedProduct: { id: string }) => {
    saleForm.setProducts((prev: Product[]) =>
      prev.filter(p => p.id !== deletedProduct.id)
    );
  }, [saleForm.setProducts]);

  // Initialize real-time connection only when online
  useRealtime({
    onProductCreated: handleProductUpdate,
    onProductUpdated: handleProductUpdate,
    onStockAdjusted: handleProductUpdate,
    onProductDeleted: handleProductDelete,
    onSettingsChanged: handleProductUpdate,
    onError: () => console.warn('[Realtime] Connection error - will retry'),
  });

  const handleAddNewDriver = useCallback(async () => {
    const name = driverSearch.trim();
    if (!name || addingDriver) return;
    setAddingDriver(true);
    try {
      const res = await api.post('/drivers', { name, phone: newDriverPhone.trim() || undefined });
      const created = res.data?.data || res.data;
      const newDriver = { id: created.id, name: created.name, phone: created.phone };
      setDrivers(prev => [...prev, newDriver]);
      saleForm.updateFormField('driverId', created.id);
      setDriverSearch('');
      setNewDriverPhone('');
      setShowNewDriverForm(false);
      addToast({ type: 'success', title: latinToCyrillic("Haydovchi qo'shildi") });
    } catch {
      addToast({ type: 'error', title: latinToCyrillic("Xatolik"), message: latinToCyrillic("Haydovchi qo'shib bo'lmadi") });
    } finally {
      setAddingDriver(false);
    }
  }, [driverSearch, newDriverPhone, addingDriver, saleForm, addToast]);

  const handleAddNewCustomer = useCallback(() => {
    const name = saleForm.customerSearch.trim();
    if (!name) return;
    saleForm.updateFormField('manualCustomerName', name);
    saleForm.updateFormField('manualCustomerPhone', newCustomerPhone.trim());
    saleForm.updateFormField('isKocha', false);
    saleForm.updateFormField('customerId', '');
    saleForm.setCustomerSearch('');
    setNewCustomerPhone('');
    setShowNewCustomerForm(false);
  }, [saleForm, newCustomerPhone]);

  // Load initial data - to'g'ridan-to'g'ri API dan
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsRes, customersRes, driversRes] = await Promise.all([
        api.get('/products', { timeout: 60000 }),
        api.get('/customers', { timeout: 60000 }),
        api.get('/drivers', { timeout: 60000 }).catch(() => ({ data: [] })),
      ]);

      // ✅ Handle standardized API response format
      const productsData = extractArray<Product>(productsRes, []);
      const customersData = extractArray<any>(customersRes, []);
      const driversData = extractArray<any>(driversRes, []);

      if (productsData.length > 0) {
        saleForm.setProducts(productsData);
      }
      if (customersData.length > 0) {
        saleForm.setCustomers(customersData);
      }
      if (driversData.length > 0) {
        setDrivers(driversData.filter((d: any) => d.active !== false));
      }
    } catch (error: any) {
      console.error('Failed to load initial data:', error);
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError(latinToCyrillic('Internet ulanmagan. Mahsulotlarni yuklab bo\'lmadi.'));
      } else {
        setError(latinToCyrillic('Ma\'lumotlarni yuklab bo\'lmadi. Qaytadan urinib ko\'ring.'));
      }
    } finally {
      setLoading(false);
    }
  }, [saleForm.setProducts, saleForm.setCustomers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mijoz qarzlarini yuklash
  useEffect(() => {
    const customerId = saleForm.form.customerId;
    if (!customerId) {
      setCustomerProductDebts([]);
      return;
    }
    api.get(`/customers/${customerId}/product-debts`)
      .then(res => setCustomerProductDebts(res.data?.data || []))
      .catch(() => setCustomerProductDebts([]));
  }, [saleForm.form.customerId]);

  // CustomerProfile dan kelgan qarz ma'lumotini o'rnatish
  useEffect(() => {
    if (presetCustomerId && !saleForm.form.customerId) {
      saleForm.updateFormField('customerId', presetCustomerId);
    }
  }, [presetCustomerId]);

  // Qarz to'lash uchun debtItem ni savatga qo'shish (mahsulotlar yuklangandan keyin)
  useEffect(() => {
    if (!debtItem || saleForm.products.length === 0) return;
    const product = saleForm.products.find(p => p.id === debtItem.productId);
    if (!product) return;
    saleForm.updateFormField('items', [
      ...saleForm.form.items,
      {
        productId: debtItem.productId,
        productName: debtItem.productName,
        quantity: debtItem.quantity,
        bagDisplayValue: debtItem.quantity.toString(),
        pricePerBag: 0,
        pricePerPiece: 0,
        unitsPerBag: debtItem.unitsPerBag || 1,
        subtotal: 0,
        warehouse: product.warehouse || 'other',
        saleType: 'bag' as const,
        isDebtPayment: true,
        productDebtId: debtItem.debtId,
      }
    ]);
  }, [debtItem, saleForm.products.length]);

  // Sahifa ko'rinib qolganda maxsulotlarni yangilash (bir xil tabda)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const reloadProducts = async () => {
          try {
            const res = await api.get('/products');
            // ✅ Handle standardized API response format
            const productsData = extractArray<Product>(res, []);
            if (productsData.length > 0) {
              saleForm.setProducts(productsData);
            }
          } catch (error) {
            // Silently handle error
          }
        };
        reloadProducts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Filter products — Latin yoki Kirill qidiruvda ham ishlaydi
  const searchFiltered = saleForm.products.filter((p) => {
    const n = p.name?.toLowerCase() || '';
    const q = saleForm.productSearch.toLowerCase();
    return !q || n.includes(q) || n.includes(forceLatinToCyrillic(q));
  });
  const filteredProducts = filterProductsByCategory(searchFiltered, saleForm.activeCategory);

  // Faqat kerakli mahsulotlarni ko'rsatish

  // Handlers

  const handleSelectProduct = useCallback(
    (product: Product) => {
      // selectProduct+addItem orasidagi state race condition (eski narx/komplekt
      // bilan qo'shilishi) oldini olish uchun bittada sinxron qo'shiladi
      saleForm.selectAndAddProduct(product, saleForm.selectedCustomer, saleForm.customerPrices);
    },
    [saleForm]
  );



  const handleSubmit = useCallback(async () => {
    if (saleForm.isSubmitting) return;
    try {
      const receipt = await saleForm.submitSale();
      printReceipt(receipt);
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Sotuv saqlandi. Chek chiqarilmoqda...')));
      const isCashierRoute = window.location.pathname.startsWith('/cashier');
      navigate(isCashierRoute ? '/cashier/sales' : '/sales');
    } catch (error: any) {
      console.error('❌ Sotuv yaratishda xatolik:', error);
      let errorMessage = latinToCyrillic('Sotuv yaratib bo\'lmadi');
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = typeof error.response.data.error === 'string'
          ? error.response.data.error
          : JSON.stringify(error.response.data.error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      addToast(toast.error(latinToCyrillic('Xatolik'), errorMessage));
    }
  }, [saleForm, addToast, navigate]);

  // Handle retry
  const handleRetry = useCallback(() => {
    loadData();
  }, []);

  if (loading) {
    return <PageLoading text={latinToCyrillic('Yuklanmoqda...')} />;
  }

  const itemCount = saleForm.form.items.length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24">
      <div className="space-y-6">
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium text-amber-800">
              {latinToCyrillic('Internet ulanmagan. Ma\'lumotlar yangilanmaydi.')}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              {latinToCyrillic('Qayta urinish')}
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200/70 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium text-rose-800">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              {latinToCyrillic('Qayta urinish')}
            </button>
          </div>
        )}

        {/* Header: back + title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={latinToCyrillic('Orqaga')}
            className="w-11 h-11 flex-shrink-0 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl flex items-center justify-center transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {saleForm.isEditMode ? latinToCyrillic('Sotuvni tahrirlash') : latinToCyrillic('Yangi sotuv')}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
              {itemCount} {latinToCyrillic('ta mahsulot tanlandi')}
            </p>
          </div>
        </div>

        {/* 2 ustunli grid: Chap=Mijoz+Yetkazib berish+Mahsulotlar | O'ng=Savat+To'lov */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* ── USTUN 1: Mahsulotlar (tepada) + Mijoz + Haydovchi (pastda) ── */}
          <div className="flex flex-col gap-4">
            <ProductSection
              filteredProducts={filteredProducts}
              currency={saleForm.form.currency}
              activeCategory={saleForm.activeCategory}
              productSearch={saleForm.productSearch}
              latinToCyrillic={latinToCyrillic}
              onCategoryChange={(cat) => saleForm.setActiveCategory(cat as any)}
              onSearchChange={saleForm.setProductSearch}
              onSelectProduct={handleSelectProduct}
            />

            {/* Mijoz */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{latinToCyrillic('Mijoz')}</p>
              </div>
              {saleForm.form.isKocha ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">{latinToCyrillic("Ko'cha savdosi")}</span>
                  <button type="button" onClick={() => { saleForm.updateFormField('isKocha', false); saleForm.updateFormField('customerId', ''); }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">{latinToCyrillic("O'zgartirish")}</button>
                </div>
              ) : saleForm.form.manualCustomerName ? (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-900">{saleForm.form.manualCustomerName}</span>
                    <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{latinToCyrillic('Yangi')}</span>
                  </div>
                  <button type="button" onClick={() => { saleForm.updateFormField('manualCustomerName', ''); saleForm.updateFormField('customerId', ''); }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">{latinToCyrillic("O'zgartirish")}</button>
                </div>
              ) : saleForm.form.customerId ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {saleForm.customers.find(c => c.id === saleForm.form.customerId)?.name || latinToCyrillic('Noma\'lum')}
                  </span>
                  <button type="button" onClick={() => saleForm.updateFormField('customerId', '')} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">{latinToCyrillic("O'zgartirish")}</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={saleForm.customerSearch}
                    onChange={e => { saleForm.setCustomerSearch(e.target.value); setShowNewCustomerForm(false); setNewCustomerPhone(''); }}
                    placeholder={latinToCyrillic('Mijozni qidiring...')}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                  />
                  {saleForm.customerSearch && (
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {(() => {
                        const q = saleForm.customerSearch.toLowerCase();
                        const qCyr = forceLatinToCyrillic(q);
                        const filtered = saleForm.customers.filter(c => {
                          const n = c.name.toLowerCase();
                          return n.includes(q) || n.includes(qCyr);
                        });
                        if (filtered.length > 0) {
                          return (
                            <div className="max-h-36 overflow-y-auto">
                              {filtered.slice(0, 6).map(c => (
                                <button key={c.id} type="button"
                                  onClick={() => { saleForm.updateFormField('customerId', c.id); saleForm.updateFormField('isKocha', false); saleForm.setCustomerSearch(''); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                                >
                                  <span className="font-medium text-slate-900">{c.name}</span>
                                  {c.phone && <span className="text-slate-400 ml-2 text-xs">{c.phone}</span>}
                                </button>
                              ))}
                            </div>
                          );
                        }
                        return showNewCustomerForm ? (
                          <div className="p-3 space-y-2 bg-slate-50">
                            <p className="text-xs font-semibold text-slate-600">
                              {latinToCyrillic("Yangi mijoz qo'shish")}
                            </p>
                            <input
                              type="text"
                              readOnly
                              value={saleForm.customerSearch}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
                            />
                            <input
                              type="tel"
                              value={newCustomerPhone}
                              onChange={e => setNewCustomerPhone(e.target.value)}
                              placeholder={latinToCyrillic('Telefon raqami (ixtiyoriy)')}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleAddNewCustomer}
                                className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                              >
                                {latinToCyrillic("Qo'shish")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowNewCustomerForm(false)}
                                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors"
                              >
                                {latinToCyrillic('Bekor')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowNewCustomerForm(true)}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors"
                          >
                            <span className="text-slate-400">{latinToCyrillic('Topilmadi')} — </span>
                            <span className="text-indigo-600 font-medium">+ "{saleForm.customerSearch}" {latinToCyrillic('nomida yangi mijoz')}</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                  <button type="button" onClick={() => { saleForm.updateFormField('isKocha', true); saleForm.updateFormField('customerId', ''); saleForm.setCustomerSearch(''); }}
                    className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                  >
                    {latinToCyrillic("Ko'cha savdosi")}
                  </button>
                </div>
              )}
            </div>

            {/* Mijoz mahsulot qarzlari banneri */}
            {customerProductDebts.length > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-300 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-800">
                    {latinToCyrillic('Bu mijozga mahsulot qarzingiz bor')}:
                  </p>
                </div>
                {customerProductDebts.map((debt: any) => {
                  const totalUnits = Math.round(debt.quantity * (debt.unitsPerBag || 1));
                  const alreadyInCart = saleForm.form.items.some(
                    i => i.productDebtId === debt.id && i.isDebtPayment
                  );
                  return (
                    <div key={debt.id} className="flex items-center justify-between gap-2 bg-white rounded-xl border border-amber-200 px-3 py-2">
                      <div>
                        <span className="text-sm font-semibold text-slate-900">{debt.productName}</span>
                        <span className="ml-2 text-xs text-amber-700 font-medium">
                          {totalUnits.toLocaleString()} {latinToCyrillic('dona')} ({debt.quantity.toLocaleString()} {latinToCyrillic('qop')})
                        </span>
                      </div>
                      {alreadyInCart ? (
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                          ✓ {latinToCyrillic('Savatda')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const product = saleForm.products.find(p => p.id === debt.productId);
                            saleForm.updateFormField('items', [
                              ...saleForm.form.items,
                              {
                                productId: debt.productId,
                                productName: debt.productName,
                                quantity: debt.quantity,
                                bagDisplayValue: debt.quantity.toString(),
                                pricePerBag: 0,
                                pricePerPiece: 0,
                                unitsPerBag: debt.unitsPerBag || 1,
                                subtotal: 0,
                                warehouse: product?.warehouse || 'other',
                                saleType: 'bag' as const,
                                isDebtPayment: true,
                                productDebtId: debt.id,
                              }
                            ]);
                          }}
                          className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors active:scale-95"
                        >
                          {latinToCyrillic("Savatga (0 so'm)")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Haydovchi / Yetkazib berish */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-slate-200/70">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">{latinToCyrillic('Yetkazib berish')}</h2>
                  <p className="text-xs text-slate-400">{latinToCyrillic('Ixtiyoriy — haydovchi tayinlang')}</p>
                </div>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {latinToCyrillic('Haydovchi')}
                  </label>
                  {saleForm.form.driverId ? (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-slate-900">
                          {drivers.find(d => d.id === saleForm.form.driverId)?.name}
                        </span>
                        {drivers.find(d => d.id === saleForm.form.driverId)?.phone && (
                          <span className="ml-2 text-xs text-slate-400">{drivers.find(d => d.id === saleForm.form.driverId)?.phone}</span>
                        )}
                        {(() => {
                          const drv = drivers.find(d => d.id === saleForm.form.driverId);
                          const usdDebt = drv?.debtToCompanyUSD || 0;
                          const uzsTotal = drv?.debtToCompany || 0;
                          const pureUZS = Math.max(0, Math.round(uzsTotal - usdDebt * saleForm.exchangeRateNum));
                          if (usdDebt <= 0 && pureUZS <= 0) return null;
                          const parts: string[] = [];
                          if (usdDebt > 0) parts.push(`$${usdDebt.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
                          if (pureUZS > 0) parts.push(`${pureUZS.toLocaleString()} UZS`);
                          return <span className="ml-2 text-xs text-amber-600 font-semibold">{latinToCyrillic('Qarzi')}: {parts.join(' + ')}</span>;
                        })()}
                      </div>
                      <button type="button" onClick={() => { saleForm.updateFormField('driverId', ''); setDriverSearch(''); }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex-shrink-0">
                        {latinToCyrillic("O'zgartirish")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={driverSearch}
                        onChange={e => { setDriverSearch(e.target.value); setShowNewDriverForm(false); setNewDriverPhone(''); }}
                        placeholder={latinToCyrillic('Haydovchini qidiring...')}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                      />
                      {driverSearch && (
                        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                          {(() => {
                            const q = driverSearch.toLowerCase();
                            const qCyr = forceLatinToCyrillic(q);
                            const filtered = drivers.filter(d => {
                              const n = d.name.toLowerCase();
                              return n.includes(q) || n.includes(qCyr) || (d.phone || '').includes(driverSearch);
                            });
                            if (filtered.length > 0) {
                              return (
                                <div className="max-h-40 overflow-y-auto">
                                  {filtered.map(d => (
                                    <button key={d.id} type="button"
                                      onClick={() => { saleForm.updateFormField('driverId', d.id); setDriverSearch(''); }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                                    >
                                      <span className="font-medium text-slate-900">{d.name}</span>
                                      {d.phone && <span className="text-slate-400 ml-2 text-xs">{d.phone}</span>}
                                      {(() => {
                                        const usdDebt = d.debtToCompanyUSD || 0;
                                        const uzsTotal = d.debtToCompany || 0;
                                        const pureUZS = Math.max(0, Math.round(uzsTotal - usdDebt * saleForm.exchangeRateNum));
                                        if (usdDebt <= 0 && pureUZS <= 0) return null;
                                        const parts: string[] = [];
                                        if (usdDebt > 0) parts.push(`$${usdDebt.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
                                        if (pureUZS > 0) parts.push(`${pureUZS.toLocaleString()} UZS`);
                                        return <span className="ml-2 text-xs text-amber-600 font-semibold">{latinToCyrillic('Qarzi')}: {parts.join(' + ')}</span>;
                                      })()}
                                    </button>
                                  ))}
                                </div>
                              );
                            }
                            return showNewDriverForm ? (
                              <div className="p-3 space-y-2 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-600">
                                  {latinToCyrillic("Yangi haydovchi qo'shish")}
                                </p>
                                <input
                                  type="text"
                                  readOnly
                                  value={driverSearch}
                                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
                                />
                                <input
                                  type="tel"
                                  value={newDriverPhone}
                                  onChange={e => setNewDriverPhone(e.target.value)}
                                  placeholder={latinToCyrillic('Telefon raqami (ixtiyoriy)')}
                                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleAddNewDriver}
                                    disabled={addingDriver}
                                    className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60"
                                  >
                                    {addingDriver ? latinToCyrillic('Qo\'shilmoqda...') : latinToCyrillic('Qo\'shish')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowNewDriverForm(false)}
                                    className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors"
                                  >
                                    {latinToCyrillic('Bekor')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowNewDriverForm(true)}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors"
                              >
                                <span className="text-slate-400">{latinToCyrillic('Topilmadi')} — </span>
                                <span className="text-indigo-600 font-medium">+ "{driverSearch}" {latinToCyrillic("nomida yangi haydovchi")}</span>
                              </button>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {saleForm.form.driverId && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        {latinToCyrillic('Pul olish usuli')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => saleForm.updateFormField('driverCollectsAll', false)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${!saleForm.form.driverCollectsAll ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                          {latinToCyrillic("Kompaniya o'zi")}
                        </button>
                        <button type="button" onClick={() => saleForm.updateFormField('driverCollectsAll', true)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${saleForm.form.driverCollectsAll ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                          {latinToCyrillic('Haydovchi yig\'adi')}
                        </button>
                      </div>
                    </div>
                    {saleForm.form.driverCollectsAll && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {latinToCyrillic('Yig\'adigan summa')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => { saleForm.updateFormField('driverCollectsAll', true); saleForm.updateFormField('driverCollectsAmount', ''); }}
                            className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${!saleForm.form.driverCollectsAmount ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {latinToCyrillic("To'liq summa")}
                          </button>
                          <button type="button" onClick={() => saleForm.updateFormField('driverCollectsAmount', ' ')}
                            className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${saleForm.form.driverCollectsAmount?.trim() ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {latinToCyrillic('Aniq summa')}
                          </button>
                        </div>
                        {saleForm.form.driverCollectsAmount != null && saleForm.form.driverCollectsAmount !== '' && (
                          <input type="number" min="0" placeholder={`${latinToCyrillic('Summa')} (${saleForm.form.currency})`}
                            value={saleForm.form.driverCollectsAmount.trim() === '' ? '' : saleForm.form.driverCollectsAmount.trim()}
                            onChange={e => saleForm.updateFormField('driverCollectsAmount', e.target.value || ' ')}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                          />
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        {latinToCyrillic('Yetkazib berish narxi')} <span className="text-slate-300 normal-case font-normal">{latinToCyrillic('(ixtiyoriy)')}</span>
                      </label>
                      <div className="flex gap-2">
                        <input type="number" min="0" placeholder="0" value={saleForm.form.deliveryFee}
                          onChange={e => saleForm.updateFormField('deliveryFee', e.target.value)}
                          className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                        <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0">
                          <button type="button" onClick={() => saleForm.updateFormField('deliveryFeePaidBy', 'COMPANY')}
                            className={`px-3 py-2 text-xs font-semibold transition-all ${saleForm.form.deliveryFeePaidBy === 'COMPANY' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                            {latinToCyrillic('Komp.')}
                          </button>
                          <button type="button" onClick={() => saleForm.updateFormField('deliveryFeePaidBy', 'CUSTOMER')}
                            className={`px-3 py-2 text-xs font-semibold transition-all border-l border-slate-200 ${saleForm.form.deliveryFeePaidBy === 'CUSTOMER' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                            {latinToCyrillic('Mijoz')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── USTUN 2: Savat + To'lov (sticky) ── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">

            {/* Savat */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 tracking-tight">{latinToCyrillic('Savat')}</h2>
                    <p className="text-xs text-slate-400 tabular-nums">{itemCount} {latinToCyrillic('ta mahsulot')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Currency toggle */}
                  <div className="flex p-0.5 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => saleForm.updateFormField('currency', 'UZS')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-[0.97] ${
                        saleForm.form.currency === 'UZS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      UZS
                    </button>
                    <button
                      type="button"
                      onClick={() => saleForm.updateFormField('currency', 'USD')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-[0.97] ${
                        saleForm.form.currency === 'USD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      $
                    </button>
                  </div>
                  {itemCount > 0 && (
                    <button
                      type="button"
                      onClick={saleForm.clearItems}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors active:scale-[0.97]"
                    >
                      <Trash2 className="w-4 h-4" />
                      {latinToCyrillic('Tozalash')}
                    </button>
                  )}
                </div>
              </div>
              {itemCount > 0 ? (
                <div className="p-4 sm:p-5 space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {(() => {
                    const items = saleForm.form.items;
                    const rendered = new Set<string>();
                    const nodes: React.ReactNode[] = [];

                    items.forEach((item, index) => {
                      if (item.komplektGroupId) {
                        if (rendered.has(item.komplektGroupId)) return;
                        rendered.add(item.komplektGroupId);

                        const groupItems = items
                          .map((it, i) => ({ it, i }))
                          .filter(({ it }) => it.komplektGroupId === item.komplektGroupId);
                        const main = groupItems.find(({ it }) => it.isKomplektMain);
                        const subs = groupItems.filter(({ it }) => !it.isKomplektMain);

                        if (!main) return;
                        nodes.push(
                          <GroupedCartItem
                            key={item.komplektGroupId}
                            mainItem={main.it}
                            subItems={subs.map(({ it }) => it)}
                            mainIndex={main.i}
                            subIndices={subs.map(({ i }) => i)}
                            currency={saleForm.form.currency}
                            exchangeRate={saleForm.exchangeRateNum}
                            products={saleForm.products}
                            onUpdate={(idx, updates) => {
                              saleForm.updateItem(idx, updates);
                              setEditingItemIndex(idx);
                            }}
                            onRemoveGroup={(groupId) => {
                              const idxs = items
                                .map((it, i) => ({ it, i }))
                                .filter(({ it }) => it.komplektGroupId === groupId)
                                .map(({ i }) => i)
                                .sort((a, b) => b - a);
                              idxs.forEach(i => saleForm.removeItem(i));
                            }}
                          />
                        );
                      } else {
                        nodes.push(
                          <CartItem
                            key={index}
                            item={item}
                            index={index}
                            isEditing={editingItemIndex === index}
                            products={saleForm.products}
                            currency={saleForm.form.currency}
                            exchangeRate={saleForm.exchangeRateNum}
                            latinToCyrillic={latinToCyrillic}
                            onUpdate={(idx, updates) => {
                              saleForm.updateItem(idx, updates);
                              setEditingItemIndex(idx);
                            }}
                            onRemove={saleForm.removeItem}
                          />
                        );
                      }
                    });
                    return nodes;
                  })()}
                </div>
              ) : (
                <EmptyState
                  icon={ShoppingCart}
                  title={latinToCyrillic('Savat bo\'sh')}
                  description={latinToCyrillic('Chapdagi ro\'yxatdan mahsulot tanlang')}
                />
              )}
            </div>

            {/* To'lov */}
            <PaymentSection
              form={saleForm.form}
              totalAmount={saleForm.totalAmount}
              paidAmount={saleForm.paidAmount}
              debtAmount={saleForm.debtAmount}
              exchangeRate={saleForm.exchangeRate}
              currency={saleForm.form.currency}
              isSubmitting={saleForm.isSubmitting}
              isEditMode={saleForm.isEditMode}
              latinToCyrillic={latinToCyrillic}
              onUpdateForm={(updates) => {
                Object.entries(updates).forEach(([key, value]) => {
                  saleForm.updateFormField(key as any, value);
                });
              }}
              onExchangeRateChange={saleForm.setExchangeRate}
              onSubmit={handleSubmit}
              onCancel={() => navigate(-1)}
              onReset={saleForm.resetForm}
            />

          </div>{/* end right column */}
        </div>{/* end 2-col grid */}
      </div>
    </div>
  );
}
