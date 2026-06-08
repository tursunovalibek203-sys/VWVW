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
import { ArrowLeft, Package, ShoppingCart, User, WifiOff, AlertCircle, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { latinToCyrillic } from '../lib/transliterator';
import { useSaleForm } from '../hooks/useSaleForm';
import { ProductTypeCard, CartItem, PaymentSection } from '../components/sales';
import { filterProductsByCategory, getCurrencySymbol, getDisplayAmount } from '../lib/saleUtils';
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
  onQuickAdd,
}: {
  filteredProducts: Product[];
  currency: string;
  productSearch: string;
  activeCategory: string;
  latinToCyrillic: (text: string) => string;
  onSearchChange: (val: string) => void;
  onCategoryChange: (cat: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
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

  // Preformlarni gram bo'yicha dinamik guruhlash - ma'lumotdan avtomatik olish
  const gramSizeMap = new Map<number, Product[]>();

  allPreforms.forEach((p) => {
    const name = p.name?.toLowerCase() || '';
    // Gramajni nomdan olish (96g, 96gr, 96 g, va h.k.)
    const gramMatch = name.match(/(\d+)\s*(gr|g|гр|г)\b/i);
    if (gramMatch) {
      const gramSize = parseInt(gramMatch[1]);
      if (!gramSizeMap.has(gramSize)) {
        gramSizeMap.set(gramSize, []);
      }
      gramSizeMap.get(gramSize)!.push(p);
    }
  });

  // Gram o'lchamlarini tartiblash va guruhlarni yaratish
  const sortedGramSizes = Array.from(gramSizeMap.keys()).sort((a, b) => a - b);
  const preformGroups: { key: string; title: string; products: Product[] }[] = [];

  sortedGramSizes.forEach((gram) => {
    const groupProducts = gramSizeMap.get(gram)!;
    if (groupProducts.length > 0) {
      preformGroups.push({
        key: `${gram}gr`,
        title: `${gram} gr Preformlar`,
        products: groupProducts,
      });
    }
  });

  // Gramaj aniqlanmagan preformlar uchun alohida guruh
  const undefinedGramPreforms = allPreforms.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    return !/\d+\s*(gr|g|гр|г)\b/i.test(name);
  });
  if (undefinedGramPreforms.length > 0) {
    preformGroups.push({
      key: 'nomsiz',
      title: 'Boshqa Preformlar',
      products: undefinedGramPreforms,
    });
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
    // O'lchamni nomdan olish (28mm, 28 mm, 28-mm, va h.k.)
    let sizeMatch = name.match(/(\d+)\s*(mm|ml|мм|мл)/i);
    if (!sizeMatch) {
      // Agar mm yo'q bo'lsa, krishka yoki qopqoq dan keyingi/o'ndingi raqamni qidirish
      sizeMatch = name.match(/(?:krishka|qopqoq|cap).*?(\d{2})|(\d{2}).*?(?:krishka|qopqoq|cap)/i);
    }
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1] || sizeMatch[2]);
      // Krishka o'lchamlari: 28, 30, 38, 48, 52
      if ([28, 30, 38, 48, 52].includes(size)) {
        if (!krishkaSizeMap.has(size)) {
          krishkaSizeMap.set(size, []);
        }
        krishkaSizeMap.get(size)!.push(p);
      }
    }
  });

  // O'lchamlarni tartiblash va guruhlarni yaratish
  const sortedKrishkaSizes = Array.from(krishkaSizeMap.keys()).sort((a, b) => a - b);
  const krishkaGroups: { key: string; title: string; products: Product[] }[] = [];

  sortedKrishkaSizes.forEach((size) => {
    const groupProducts = krishkaSizeMap.get(size)!;
    if (groupProducts.length > 0) {
      krishkaGroups.push({
        key: `${size}mm`,
        title: `${size}mm Krishkalar`,
        products: groupProducts,
      });
    }
  });

  // O'lcham aniqlanmagan krishkalar uchun alohida guruh
  const undefinedSizeKrishka = allKrishka.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const hasSize = /(\d+)\s*(mm|ml|мм|мл)/i.test(name) ||
                    /(?:krishka|qopqoq|cap).*?(\d{2})|(\d{2}).*?(?:krishka|qopqoq|cap)/i.test(name);
    return !hasSize;
  });
  if (undefinedSizeKrishka.length > 0) {
    krishkaGroups.push({
      key: 'nomsiz-krishka',
      title: 'Boshqa Krishkalar',
      products: undefinedSizeKrishka,
    });
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
    // O'lchamni nomdan olish (28mm, 28 mm, 28-mm, va h.k.)
    let sizeMatch = name.match(/(\d+)\s*(mm|ml|мм|мл)/i);
    if (!sizeMatch) {
      // Agar mm yo'q bo'lsa, ruchka yoki handle dan keyingi/o'ndingi raqamni qidirish
      sizeMatch = name.match(/(?:ruchka|handle).*?(\d{2})|(\d{2}).*?(?:ruchka|handle)/i);
    }
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1] || sizeMatch[2]);
      // Ruchka o'lchamlari: 28, 30, 38, 48, 52
      if ([28, 30, 38, 48, 52].includes(size)) {
        if (!ruchkaSizeMap.has(size)) {
          ruchkaSizeMap.set(size, []);
        }
        ruchkaSizeMap.get(size)!.push(p);
      }
    }
  });

  // O'lchamlarni tartiblash va guruhlarni yaratish
  const sortedRuchkaSizes = Array.from(ruchkaSizeMap.keys()).sort((a, b) => a - b);
  const ruchkaGroups: { key: string; title: string; products: Product[] }[] = [];

  sortedRuchkaSizes.forEach((size) => {
    const groupProducts = ruchkaSizeMap.get(size)!;
    if (groupProducts.length > 0) {
      ruchkaGroups.push({
        key: `${size}mm-ruchka`,
        title: `${size}mm Ruchkalar`,
        products: groupProducts,
      });
    }
  });

  // O'lcham aniqlanmagan ruchkalar uchun alohida guruh
  const undefinedSizeRuchka = allRuchka.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const hasSize = /(\d+)\s*(mm|ml|мм|мл)/i.test(name) ||
                    /(?:ruchka|handle).*?(\d{2})|(\d{2}).*?(?:ruchka|handle)/i.test(name);
    return !hasSize;
  });
  if (undefinedSizeRuchka.length > 0) {
    ruchkaGroups.push({
      key: 'nomsiz-ruchka',
      title: 'Boshqa Ruchkalar',
      products: undefinedSizeRuchka,
    });
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
                onQuickAdd={onQuickAdd}
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
                onQuickAdd={onQuickAdd}
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
                onQuickAdd={onQuickAdd}
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
                onQuickAdd={onQuickAdd}
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
                onQuickAdd={onQuickAdd}
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

  const saleForm = useSaleForm({ editSale, orderData });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Load initial data - to'g'ridan-to'g'ri API dan
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(latinToCyrillic('Yuklash vaqti tugadi. Internet aloqasini tekshiring.'));
      console.warn('Loading timeout reached for initial data');
    }, 10000); // 10 second timeout

    try {
      const [productsRes, customersRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
      ]);
      clearTimeout(timeout);

      // ✅ Handle standardized API response format
      const productsData = extractArray<Product>(productsRes, []);
      const customersData = extractArray<any>(customersRes, []);

      if (productsData.length > 0) {
        saleForm.setProducts(productsData);
      }
      if (customersData.length > 0) {
        saleForm.setCustomers(customersData);
      }
    } catch (error: any) {
      clearTimeout(timeout);
      console.error('Failed to load initial data:', error);
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError(latinToCyrillic('Internet ulanmagan. Mahsulotlarni yuklab bo\'lmadi.'));
      } else {
        setError(latinToCyrillic('Ma\'lumotlarni yuklab bo\'lmadi. Qaytadan urinib ko\'ring.'));
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [saleForm.setProducts, saleForm.setCustomers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Filter products
  const searchFiltered = saleForm.products.filter((p) =>
    p.name?.toLowerCase().includes(saleForm.productSearch.toLowerCase())
  );
  const filteredProducts = filterProductsByCategory(searchFiltered, saleForm.activeCategory);

  // Faqat kerakli mahsulotlarni ko'rsatish

  // Handlers

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      // Tezlashtirilgan - endi API chaqiruvi yo'q
      saleForm.selectProduct(product, saleForm.products, saleForm.selectedCustomer, saleForm.customerPrices);
      // Avtomatik savatga qo'shish (komplekt bilan)
      await saleForm.addItem();
    },
    [saleForm]
  );

  const handleQuickAdd = useCallback(
    async (product: Product) => {
      // Tezlashtirilgan - endi API chaqiruvi yo'q
      saleForm.selectProduct(product, saleForm.products, saleForm.selectedCustomer, saleForm.customerPrices);
      await saleForm.addItem();
    },
    [saleForm]
  );


  const handleSubmit = useCallback(async () => {
    if (saleForm.isSubmitting) return;
    try {
      await saleForm.submitSale();
    } catch (error: any) {
      console.error('❌ Sotuv yaratishda xatolik:', error);
      // Extract detailed error message from server response
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
  }, [saleForm, addToast]);

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

        {/* Hero: running TOTAL (the most prominent thing on screen) + currency toggle */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-300" />
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {latinToCyrillic('Jami summa')}
                </p>
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                {getCurrencySymbol(saleForm.form.currency)}
                {getDisplayAmount(saleForm.totalAmount, saleForm.form.currency)}
              </p>
              <p className="mt-1 text-sm text-slate-400 tabular-nums">
                {itemCount} {latinToCyrillic('ta mahsulot savatda')}
              </p>
            </div>

            {/* Currency toggle */}
            <div className="flex p-1 bg-white/10 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => saleForm.updateFormField('currency', 'UZS')}
                className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] ${
                  saleForm.form.currency === 'UZS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                UZS
              </button>
              <button
                type="button"
                onClick={() => saleForm.updateFormField('currency', 'USD')}
                className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] ${
                  saleForm.form.currency === 'USD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                $
              </button>
            </div>
          </div>
        </div>

        {/* Zone 1: Product picker (left) + Cart (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Products */}
          <ProductSection
            filteredProducts={filteredProducts}
            currency={saleForm.form.currency}
            activeCategory={saleForm.activeCategory}
            productSearch={saleForm.productSearch}
            latinToCyrillic={latinToCyrillic}
            onCategoryChange={(cat) => saleForm.setActiveCategory(cat as any)}
            onSearchChange={saleForm.setProductSearch}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleQuickAdd}
          />

          {/* Cart + Customer (right column, sticky) */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">

          {/* ─── Compact Customer Quick-Select (always visible) ─── */}
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
                  onChange={e => saleForm.setCustomerSearch(e.target.value)}
                  placeholder={latinToCyrillic('Mijozni qidiring...')}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                />
                {saleForm.customerSearch && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {saleForm.customers
                      .filter(c => c.name.toLowerCase().includes(saleForm.customerSearch.toLowerCase()))
                      .slice(0, 6)
                      .map(c => (
                        <button key={c.id} type="button"
                          onClick={() => { saleForm.updateFormField('customerId', c.id); saleForm.updateFormField('isKocha', false); saleForm.setCustomerSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                        >
                          <span className="font-medium text-slate-900">{c.name}</span>
                          {c.phone && <span className="text-slate-400 ml-2 text-xs">{c.phone}</span>}
                        </button>
                      ))}
                    {saleForm.customers.filter(c => c.name.toLowerCase().includes(saleForm.customerSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-400">{latinToCyrillic('Topilmadi')}</p>
                    )}
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

          {/* Cart */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            {/* Cart header */}
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

            {itemCount > 0 ? (
              <div className="p-4 sm:p-5 space-y-2 max-h-[55vh] overflow-y-auto">
                {saleForm.form.items.map((item, index) => (
                  <CartItem
                    key={index}
                    item={item}
                    index={index}
                    isEditing={editingItemIndex === index}
                    products={saleForm.products}
                    currency={saleForm.form.currency}
                    latinToCyrillic={latinToCyrillic}
                    onUpdate={(idx, updates) => {
                      saleForm.updateItem(idx, updates);
                      setEditingItemIndex(idx);
                    }}
                    onRemove={saleForm.removeItem}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title={latinToCyrillic('Savat bo\'sh')}
                description={latinToCyrillic('Chapdagi ro\'yxatdan mahsulot tanlab savatga qo\'shing')}
              />
            )}
          </div>

          {/* Payment Section */}
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
          </div>{/* end sticky right column wrapper */}
        </div>
      </div>
    </div>
  );
}
