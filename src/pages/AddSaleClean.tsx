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
import { ArrowLeft, Package, ShoppingCart, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { latinToCyrillic } from '../lib/transliterator';
import { useSaleForm } from '../hooks/useSaleForm';
import { ProductTypeCard, CartItem, CustomerSelector, PaymentSection } from '../components/sales';
import { filterProductsByCategory, getCurrencySymbol, getDisplayAmount } from '../lib/saleUtils';
import { useRealtime } from '../hooks/useRealtime';
import api from '../lib/professionalApi';
import { extractArray } from '../lib/apiHelpers';
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
    { id: 'all', label: 'All' },
    { id: 'preform', label: 'Pre' },
    { id: 'krishka', label: 'Kri' },
    { id: 'ruchka', label: 'Ruc' },
    { id: 'other', label: 'Bsh' },
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
    <div className="space-y-3">
      <div className="glass-card p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{latinToCyrillic('Mahsulotlar')}</h2>
            <p className="text-sm text-gray-500">{filteredProducts.length} {latinToCyrillic('mahsulot')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {/* Search */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Package className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder={latinToCyrillic('Mahsulot qidirish...')}
            value={productSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-12 px-4 pl-12 text-sm font-bold rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white shadow-sm"
          />
        </div>

        {/* Categories */}
        <div className="grid grid-cols-5 gap-1 p-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl shadow-inner">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`py-2.5 px-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-white/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Type Cards */}
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-500" />
              </div>
              <p className="text-gray-600 font-bold text-lg">{latinToCyrillic('Mahsulot topilmadi')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preformGroups.map((group) => (
                <ProductTypeCard
                  key={group.key}
                  title={group.title}
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
    </div>
  );
};

// Main Component
export default function AddSaleClean() {
  const navigate = useNavigate();
  const location = useLocation();
  const editSale = location.state?.editSale;
  const orderData = location.state?.orderData;

  const saleForm = useSaleForm({ editSale, orderData });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

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

  // Initialize real-time connection
  useRealtime({
    onProductCreated: handleProductUpdate,
    onProductUpdated: handleProductUpdate,
    onStockAdjusted: handleProductUpdate,
    onProductDeleted: handleProductDelete,
    onSettingsChanged: handleProductUpdate,
  });

  // Load initial data - to'g'ridan-to'g'ri API dan
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, customersRes] = await Promise.all([
          api.get('/products'),
          api.get('/customers'),
        ]);

        // ✅ Handle standardized API response format
        const productsData = extractArray<Product>(productsRes, []);
        const customersData = extractArray<any>(customersRes, []);
        
        if (productsData.length > 0) {
          saleForm.setProducts(productsData);
        }
        if (customersData.length > 0) {
          saleForm.setCustomers(customersData);
        }
      } catch (error) {
        // Silently handle error - UI shows empty state
      }
    };

    loadData();
  }, []);

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
    try {
      await saleForm.submitSale();
    } catch (error: any) {
      console.error('❌ Sotuv yaratishda xatolik:', error);
      // Extract detailed error message from server response
      let errorMessage = 'Sotuv yaratib bo\'lmadi';
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
      alert('Xatolik: ' + errorMessage);
    }
  }, [saleForm]);

  return (
    <div className="modern-bg page-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="glass-card p-4 mb-4 fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/cashier/sales')}
                className="btn-gradient-primary px-4 py-2 flex items-center gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {latinToCyrillic('Orqaga')}
              </button>

              <div>
                <h1 className="text-2xl font-bold text-blue-600 mb-0.5">
                  {saleForm.isEditMode ? latinToCyrillic('Sotuvni Tahrirlash') : latinToCyrillic('Yangi Sotuv')}
                </h1>
                <p className="text-gray-500 text-sm font-medium">
                  {saleForm.form.items.length} {latinToCyrillic('ta mahsulot tanlandi')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="toggle-modern">
                <button
                  type="button"
                  onClick={() => saleForm.updateFormField('currency', 'UZS')}
                  className={`toggle-option ${saleForm.form.currency === 'UZS' ? 'active' : ''}`}
                >
                  UZS
                </button>
                <button
                  type="button"
                  onClick={() => saleForm.updateFormField('currency', 'USD')}
                  className={`toggle-option ${saleForm.form.currency === 'USD' ? 'active' : ''}`}
                >
                  $
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="glass-card p-5 slide-up">
          {/* Row 1: Products + Cart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Products Column */}
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

            {/* Cart Column */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{latinToCyrillic('Savat')}</h2>
                    <p className="text-sm text-emerald-100">{saleForm.form.items.length} {latinToCyrillic('ta mahsulot')}</p>
                  </div>
                </div>
              </div>

              {saleForm.form.items.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-gray-900">{latinToCyrillic('Savat')}</h3>
                      <button
                        type="button"
                        onClick={saleForm.clearItems}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        {latinToCyrillic('Tozalash')}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
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

                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">{latinToCyrillic('Jami')}:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {getCurrencySymbol(saleForm.form.currency)}
                          {getDisplayAmount(saleForm.totalAmount, saleForm.form.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-bold mb-2">{latinToCyrillic("Savat bo'sh")}</p>
                  <p className="text-gray-400">{latinToCyrillic("Mahsulot qo'shing")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Customer & Payment (Full Width) */}
          <div className="border-t border-gray-200 pt-6">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{latinToCyrillic("Mijoz va To'lov")}</h2>
                  <p className="text-sm text-purple-100">
                    {latinToCyrillic('Sotuvni yakunlash')} ({saleForm.customers.length} {latinToCyrillic('ta mijoz')})
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Selector */}
              <CustomerSelector
                customers={saleForm.customers}
                selectedCustomerId={saleForm.form.customerId}
                isKocha={saleForm.form.isKocha}
                customerSearch={saleForm.customerSearch}
                manualCustomerName={saleForm.form.manualCustomerName}
                manualCustomerPhone={saleForm.form.manualCustomerPhone}
                latinToCyrillic={latinToCyrillic}
                onSelectCustomer={(customer) => {
                  saleForm.updateFormField('customerId', customer.id);
                  saleForm.updateFormField('customerName', customer.name);
                  saleForm.updateFormField('isKocha', false);
                  saleForm.setCustomerSearch('');
                }}
                onSelectKocha={() => {
                  saleForm.updateFormField('customerId', '');
                  saleForm.updateFormField('customerName', '');
                  saleForm.updateFormField('isKocha', true);
                }}
                onSearchChange={saleForm.setCustomerSearch}
                onManualNameChange={(val) => saleForm.updateFormField('manualCustomerName', val)}
                onManualPhoneChange={(val) => saleForm.updateFormField('manualCustomerPhone', val)}
              />

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
                onCancel={() => navigate('/cashier/sales')}
                onReset={saleForm.resetForm}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
