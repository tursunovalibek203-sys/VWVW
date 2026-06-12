import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Eye,
  Table2,
  Boxes,
  DollarSign,
  PackageX,
  Download
} from 'lucide-react';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { useNavigate } from 'react-router-dom';
import { errorHandler } from '../lib/professionalErrorHandler';
import { extractArray } from '../lib/apiHelpers';
import { productSchema, ProductFormData } from '../lib/validation';
import { ValidatedForm } from '../components/forms/ValidatedForm';
import { FormField, FormActions } from '../components/forms/FormField';
import { useToast, toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

interface Product {
  id: string;
  name: string;
  pricePerBag: number;
  pricePerPiece: number;
  currentStock: number;
  optimalStock: number;
  minStockLimit?: number;
  unitsPerBag: number;
  warehouse: string;
  bagType: string;
  subType?: string;
  active: boolean;
}

type CategoryId = 'all' | 'preform' | 'krishka' | 'ruchka' | 'other';

export default function SimplifiedInventory() {
  const navigate = useNavigate();
  const isCashierRoute = window.location.pathname.startsWith('/cashier');
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPriceBag, setEditingPriceBag] = useState('');
  const [editingPricePiece, setEditingPricePiece] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Yangi mahsulot qo'shish modal uchun state
  const [showAddModal, setShowAddModal] = useState(false);
  // Narxlari jadvali modal uchun state
  const [showPriceTableModal, setShowPriceTableModal] = useState(false);
  // Narxlari jadvali uchun tahrir state
  const [editingPriceRow, setEditingPriceRow] = useState<string | null>(null);
  const [editPriceBag, setEditPriceBag] = useState('');
  const [editPricePiece, setEditPricePiece] = useState('');
  const [editUnitsPerBag, setEditUnitsPerBag] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    pricePerBag: '',
    pricePerPiece: '',
    currentStock: '',
    unitsPerBag: '2000',
    warehouse: 'preform'
  });

  // Form validation states
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [productFormSuccess, setProductFormSuccess] = useState<string | null>(null);

  // Delete confirmation (replaces window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProducts();

    // Avto-yangilash har 30 soniyada
    const intervalId = setInterval(() => {
      loadProducts();
    }, 30000);

    // Oyna fokusga kelganda yangilash
    const handleFocus = () => {
      loadProducts();
    };
    window.addEventListener('focus', handleFocus);

    // Tozalash
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadProducts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
      console.warn('Loading timeout reached for products');
    }, 10000); // 10 second timeout

    try {
      const response = await api.get('/products');
      clearTimeout(timeout);
      // Handle standardized API response format { success, data }
      const productsData = extractArray<Product>(response, []);
      setProducts(productsData);
      setLastUpdated(new Date());
    } catch (error) {
      clearTimeout(timeout);
      errorHandler.handleError(error, { action: 'loadProducts' });
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditingName(product.name);
    setEditingPriceBag(product.pricePerBag?.toString() || '');
    setEditingPricePiece(product.pricePerPiece?.toString() || '');
  };

  const saveProductData = async (productId: string) => {
    try {
      if (!editingName || !editingPriceBag) {
        addToast(toast.warning(
          latinToCyrillic('Diqqat'),
          latinToCyrillic('Iltimos, mahsulot nomi va narxini to\'ldiring!')
        ));
        return;
      }

      const updateData = {
        name: editingName,
        pricePerBag: parseFloat(editingPriceBag) || 0,
        pricePerPiece: parseFloat(editingPricePiece) || 0
      };

      await api.put(`/products/${productId}`, updateData);
      loadProducts(true);
      setEditingProduct(null);
      addToast(toast.success(
        latinToCyrillic('Muvaffaqiyatli'),
        latinToCyrillic('Ma\'lumotlar yangilandi!')
      ));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Noma\'lum xatolik';
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic(errorMessage)));
    }
  };

  const cancelEditing = () => {
    setEditingProduct(null);
  };

  // Soft-delete flow: open ConfirmDialog instead of window.confirm
  const requestDelete = (product: Product) => {
    setDeleteTarget(product);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const productId = deleteTarget.id;
    setDeleting(true);
    try {
      await api.delete(`/products/${productId}`);
      loadProducts(true);
      addToast(toast.success(
        latinToCyrillic('Muvaffaqiyatli'),
        latinToCyrillic('Mahsulot o\'chirildi!')
      ));
    } catch (error) {
      errorHandler.handleError(error, { action: 'deleteProduct', productId });
      addToast(toast.error(
        latinToCyrillic('Xatolik'),
        latinToCyrillic('Mahsulotni o\'chirishda xatolik yuz berdi')
      ));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleAddProduct = async (data: ProductFormData) => {
    setProductFormLoading(true);
    setProductFormError(null);
    setProductFormSuccess(null);

    try {
      const productData = {
        ...data,
        bagType: data.warehouse,
        active: true
      };

      await api.post('/products', productData);

      // Modalni yopish
      setShowAddModal(false);

      // Mahsulotlar ro'yxatini yangilash
      loadProducts(true);

      // Show success message
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Yangi mahsulot muvaffaqiyatli qo\'shildi!')));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Noma\'lum xatolik';
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic(`Xatolik: ${errorMessage}`)));
    } finally {
      setProductFormLoading(false);
    }
  };

  const closeAddModal = () => {
    // Check if form has any data
    const hasData = newProduct.name || newProduct.pricePerBag || newProduct.currentStock;
    if (hasData) {
      const confirmed = window.confirm(latinToCyrillic('Formda ma\'lumotlar bor. Yopishni xohlaysizmi?'));
      if (!confirmed) return;
    }
    setShowAddModal(false);
    setNewProduct({
      name: '',
      pricePerBag: '',
      pricePerPiece: '',
      currentStock: '',
      unitsPerBag: '2000',
      warehouse: 'preform'
    });
  };

  // Stock-level threshold (UI only - never changes API/data).
  // Red/danger: at or below the minimum limit. Amber/warning: near the
  // limit (within +50%). Green/success: healthy stock.
  const getStockThreshold = (product: Product) =>
    product.minStockLimit ?? product.optimalStock ?? 0;

  type StockLevel = {
    variant: 'error' | 'warning' | 'success';
    label: string;
  };

  const getStockLevel = (product: Product): StockLevel => {
    const stock = product.currentStock || 0;
    const limit = getStockThreshold(product);

    if (stock <= limit) {
      return {
        variant: 'error',
        label: stock === 0 ? latinToCyrillic('Tugagan') : latinToCyrillic('Kam')
      };
    }
    if (stock <= limit * 1.5) {
      return { variant: 'warning', label: latinToCyrillic('Tugayapti') };
    }
    return { variant: 'success', label: latinToCyrillic('Yetarli') };
  };

  const getColorDot = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('oq') || n.includes('white')) return 'bg-white border-gray-400';
    if (n.includes('qora') || n.includes('black')) return 'bg-gray-900 border-gray-700';
    if (n.includes('sariq') || n.includes('yellow')) return 'bg-yellow-400 border-yellow-500';
    if (n.includes('gidro') || n.includes('hydro')) return 'bg-blue-300 border-blue-400';
    if (n.includes("ko'k") || n.includes('blue')) return 'bg-blue-600 border-blue-700';
    if (n.includes('qizil') || n.includes('red')) return 'bg-red-500 border-red-600';
    if (n.includes('yashil') || n.includes('green')) return 'bg-green-500 border-green-600';
    if (n.includes('binafsha') || n.includes('purple')) return 'bg-purple-500 border-purple-600';
    if (n.includes('toq') || n.includes('dark')) return 'bg-gray-800 border-gray-700';
    if (n.includes('engil') || n.includes('light')) return 'bg-gray-200 border-gray-300';
    return 'bg-slate-300 border-slate-400';
  };

  // Mahsulot kategoriyasini aniqlash (warehouse yoki nom bo'yicha)
  const matchesCategory = (product: Product, category: CategoryId): boolean => {
    if (category === 'all') return true;

    const wh = (product.warehouse || '').toLowerCase();
    const name = product.name.toLowerCase();
    const bag = (product.bagType || '').toLowerCase();

    if (category === 'krishka') {
      return wh === 'krishka' || wh === 'caps' ||
        name.includes('krishka') || name.includes('qopqoq') ||
        bag.includes('krishka') || bag.includes('cap') || bag.includes('qopqoq');
    }
    if (category === 'ruchka') {
      return wh === 'ruchka' || wh === 'handles' ||
        name.includes('ruchka') || bag.includes('ruchka') || bag.includes('handle');
    }
    if (category === 'preform') {
      if (wh === 'preform') return true;
      const gramMatch = name.match(/(\d+)\s*(?:g|gr|gram|г|гр|грамм)/i);
      const gramValue = gramMatch ? parseInt(gramMatch[1]) : 0;
      const hasPreform = name.includes('preform') || name.includes('преформ');
      return (hasPreform || (!!gramMatch && gramValue >= 10)) &&
        !name.includes('krishka') && !name.includes('cap') && !name.includes('крышка') &&
        !name.includes('ruchka') && !name.includes('handle') && !name.includes('ручка');
    }
    if (category === 'other') {
      return wh !== 'preform' && wh !== 'krishka' && wh !== 'ruchka' &&
        wh !== 'caps' && wh !== 'handles' &&
        !name.includes('preform') && !name.includes('krishka') &&
        !name.includes('qopqoq') && !name.includes('ruchka');
    }
    return false;
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return matchesCategory(product, activeCategory);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchQuery, activeCategory]);

  const getGroupKey = (product: Product): string => {
    const name = product.name.toLowerCase();
    const warehouse = (product.warehouse || '').toLowerCase();
    const bagTypeLower = (product.bagType || '').toLowerCase();
    const subType = (product.subType || '').trim();

    const extractNum = (str: string): string | null => {
      const m = str.match(/(\d+)/);
      return m ? m[1] : null;
    };

    const isKrishka =
      warehouse === 'krishka' ||
      warehouse === 'caps' ||
      name.includes('krishka') ||
      name.includes('qopqoq') ||
      bagTypeLower.includes('krishka') ||
      bagTypeLower.includes('cap') ||
      bagTypeLower.includes('qopqoq');

    const isRuchka =
      warehouse === 'ruchka' ||
      warehouse === 'handles' ||
      name.includes('ruchka') ||
      bagTypeLower.includes('ruchka') ||
      bagTypeLower.includes('handle');

    const isPreform =
      warehouse === 'preform' ||
      name.includes('preform') ||
      /^\d+\s*g/i.test(bagTypeLower) ||
      (!isKrishka && !isRuchka && /\d+\s*(?:g|gr)/i.test(name));

    if (isPreform) {
      const gram =
        extractNum(bagTypeLower) ||
        (() => { const m = name.match(/(\d+)\s*(?:g|gr)/i); return m ? m[1] : null; })() ||
        extractNum(name) ||
        'Boshqa';
      return `${gram}G`;
    }

    if (isKrishka) {
      // subType → bagType → nom bo'yicha razmer aniqlash
      const sizeFromSubType = subType ? extractNum(subType) : null;
      const size =
        sizeFromSubType ||
        extractNum(bagTypeLower) ||
        extractNum(name) ||
        'Boshqa';
      return `${size} Krishka`;
    }

    if (isRuchka) {
      // subType → bagType → nom bo'yicha razmer aniqlash
      const sizeFromSubType = subType ? extractNum(subType) : null;
      const size =
        sizeFromSubType ||
        extractNum(bagTypeLower) ||
        extractNum(name) ||
        'Boshqa';
      return `${size} Ruchka`;
    }

    return product.bagType || latinToCyrillic('Boshqa');
  };

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const key = getGroupKey(product);
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });

    const sortWeight = (key: string): [number, number] => {
      if (/^\d+G$/.test(key)) return [0, parseInt(key)];
      if (/^\d+\s*Krishka$/i.test(key)) { const m = key.match(/(\d+)/); return [1, m ? parseInt(m[1]) : 999]; }
      if (/^\d+\s*Ruchka$/i.test(key)) { const m = key.match(/(\d+)/); return [2, m ? parseInt(m[1]) : 999]; }
      return [3, 0];
    };

    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => {
        const [ao, an] = sortWeight(a);
        const [bo, bn] = sortWeight(b);
        if (ao !== bo) return ao - bo;
        if (an !== bn) return an - bn;
        return a.localeCompare(b);
      })
    );
  }, [filteredProducts]);

  // Kam qolgan mahsulotlar (qizil/sariq darajada)
  const lowStockProducts = useMemo(
    () => products.filter((p) => (p.currentStock || 0) <= getStockThreshold(p)),
    [products]
  );

  const categories: { id: CategoryId; label: string }[] = [
    { id: 'all', label: latinToCyrillic('Barchasi') },
    { id: 'preform', label: 'Preform' },
    { id: 'krishka', label: latinToCyrillic('Krishka') },
    { id: 'ruchka', label: latinToCyrillic('Ruchka') },
    { id: 'other', label: latinToCyrillic('Boshqa') }
  ];

  const formatPrice = (price: number) => {
    return (price || 0).toFixed(2) + ' $';
  };

  // Umumiy statistikalar
  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.pricePerBag || 0), 0),
    [products]
  );
  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + (p.currentStock || 0), 0),
    [products]
  );

  // Narxlari jadvalida tahrirni boshlash
  const startPriceRowEditing = (product: Product) => {
    setEditingPriceRow(product.id);
    setEditPriceBag(product.pricePerBag?.toString() || '');
    setEditPricePiece(product.pricePerPiece?.toString() || '');
    setEditUnitsPerBag(product.unitsPerBag?.toString() || '2000');
  };

  // Narxlari jadvalidagi o'zgarishlarni saqlash
  const savePriceRowData = async (productId: string) => {
    try {
      if (!editPriceBag) {
        addToast(toast.warning(latinToCyrillic('Diqqat'), latinToCyrillic('Iltimos, qop narxini kiriting!')));
        return;
      }

      const updateData = {
        pricePerBag: parseFloat(editPriceBag) || 0,
        pricePerPiece: parseFloat(editPricePiece) || 0,
        unitsPerBag: parseInt(editUnitsPerBag) || 2000
      };

      await api.put(`/products/${productId}`, updateData);
      loadProducts(true);
      setEditingPriceRow(null);
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Narxlar yangilandi!')));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Noma\'lum xatolik';
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic(errorMessage)));
    }
  };

  // Tahrirni bekor qilish
  const cancelPriceRowEditing = () => {
    setEditingPriceRow(null);
    setEditPriceBag('');
    setEditPricePiece('');
    setEditUnitsPerBag('');
  };

  // Narxlar jadvalini Excel formatida yuklab olish
  const exportPriceTableToExcel = () => {
    try {
      // CSV sarlavhalari
      const headers = [
        latinToCyrillic('Mahsulot'),
        latinToCyrillic('Turkum'),
        latinToCyrillic('Qop Narx ($)'),
        latinToCyrillic('Dona/qop'),
        latinToCyrillic('Dona Narx ($)'),
        latinToCyrillic('Zaxira (qop)')
      ];

      // Barcha mahsulotlarni birlashtirish
      const allProducts: Array<{ product: Product; category: string }> = [];

      // Preformlar
      products
        .filter(p => p.warehouse === 'preform' || p.name.toLowerCase().includes('preform') || /\d+\s*(gr|g|гр|г)/i.test(p.name))
        .forEach(p => allProducts.push({ product: p, category: 'Preform' }));

      // Krishkalar
      products
        .filter(p => p.warehouse === 'krishka' || p.name.toLowerCase().includes('krishka') || p.name.toLowerCase().includes('qopqoq'))
        .forEach(p => allProducts.push({ product: p, category: latinToCyrillic('Krishka') }));

      // Ruchkalar
      products
        .filter(p => p.warehouse === 'ruchka' || p.name.toLowerCase().includes('ruchka') || p.name.toLowerCase().includes('handle'))
        .forEach(p => allProducts.push({ product: p, category: latinToCyrillic('Ruchka') }));

      // Boshqalar
      products
        .filter(p => {
          const name = p.name.toLowerCase();
          const isPreform = p.warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/i.test(name);
          const isKrishka = p.warehouse === 'krishka' || name.includes('krishka') || name.includes('qopqoq');
          const isRuchka = p.warehouse === 'ruchka' || name.includes('ruchka') || name.includes('handle');
          return !isPreform && !isKrishka && !isRuchka;
        })
        .forEach(p => allProducts.push({ product: p, category: latinToCyrillic('Boshqa') }));

      // Ma'lumotlarni qatorlarga aylantirish
      const rows = allProducts.map(({ product, category }) => {
        const unitsPerBag = product.unitsPerBag || 2000;
        const pricePerPiece = product.pricePerPiece || (product.pricePerBag / unitsPerBag) || 0;
        return [
          product.name,
          category,
          product.pricePerBag?.toFixed(2) || '0.00',
          unitsPerBag.toString(),
          pricePerPiece.toFixed(4),
          (typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')).toString()
        ];
      });

      // CSV yaratish
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell => {
            // Agar cell vergul yoki qo'shtirnoq ichida bo'lsa, qo'shtirnoq bilan o'rash
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        )
      ].join('\n');

      // BOM (Byte Order Mark) qo'shish - Excel uchun UTF-8
      const BOM = '﻿';
      const fullContent = BOM + csvContent;

      // Faylni yuklab olish
      const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `${latinToCyrillic('Narxlari_Jadvali')}_${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Narxlar jadvali yuklandi!')));
    } catch (error) {
      console.error('Export xatolik:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Yuklashda xatolik yuz berdi')));
    }
  };

  const hasActiveFilters = !!searchQuery || activeCategory !== 'all';

  // Bitta mahsulot uchun amallar (jadval va karta uchun umumiy)
  const renderRowActions = (product: Product) => (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => navigate(isCashierRoute ? `/cashier/products/${product.id}` : `/products/${product.id}`)}
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        aria-label={latinToCyrillic('Batafsil')}
        title={latinToCyrillic('Batafsil')}
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => startEditing(product)}
        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        aria-label={latinToCyrillic('Tahrirlash')}
        title={latinToCyrillic('Tahrirlash')}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => requestDelete(product)}
        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        aria-label={latinToCyrillic('O\'chirish')}
        title={latinToCyrillic('O\'chirish')}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const summaryStats = [
    {
      label: latinToCyrillic('Jami mahsulot'),
      value: products.length.toString(),
      icon: Boxes,
      tint: 'bg-indigo-50 text-indigo-600'
    },
    {
      label: latinToCyrillic('Jami zaxira'),
      value: `${totalStock.toLocaleString()} ${latinToCyrillic('qop')}`,
      icon: Package,
      tint: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: latinToCyrillic('Jami qiymat'),
      value: formatPrice(totalValue),
      icon: DollarSign,
      tint: 'bg-violet-50 text-violet-600'
    },
    {
      label: latinToCyrillic('Kam qolgan'),
      value: lowStockProducts.length.toString(),
      icon: AlertTriangle,
      tint: lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500',
      alert: lowStockProducts.length > 0
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Clean header: title + meta + actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Ombor')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? latinToCyrillic('Yuklanmoqda...')
              : `${products.length} ${latinToCyrillic('ta mahsulot')}`}
            {lastUpdated && !loading && (
              <span className="text-slate-400 ml-1.5">
                &middot; {latinToCyrillic('yangilandi')} {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowPriceTableModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <Table2 className="w-4 h-4" />
            <span className="hidden sm:inline">{latinToCyrillic('Narxlar jadvali')}</span>
          </button>
          <button
            type="button"
            onClick={() => loadProducts(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(isCashierRoute ? '/cashier/add-product' : '/add-product')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {latinToCyrillic('Mahsulot qo\'shish')}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[108px] animate-pulse" />
            ))
          : summaryStats.map((stat) => {
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
                  <p className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${stat.alert ? 'text-amber-600' : 'text-slate-900'}`}>
                    {stat.value}
                  </p>
                </div>
              );
            })}
      </div>

      {/* Low-stock alert banner */}
      {!loading && lowStockProducts.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-[18px] h-[18px] text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {lowStockProducts.length} {latinToCyrillic('ta mahsulot kam qoldi')}
            </p>
            <p className="mt-0.5 text-xs text-amber-700 truncate">
              {lowStockProducts.slice(0, 4).map((p) => p.name).join(', ')}
              {lowStockProducts.length > 4 && ` +${lowStockProducts.length - 4}`}
            </p>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
            <input
              id="inventory-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={latinToCyrillic('Mahsulot nomini kiriting...')}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
          <TableSkeleton rows={8} cols={5} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={hasActiveFilters ? PackageX : Package}
            title={
              hasActiveFilters
                ? latinToCyrillic('Mahsulot topilmadi')
                : latinToCyrillic('Hali mahsulotlar yo\'q')
            }
            description={
              hasActiveFilters
                ? latinToCyrillic('Qidiruv shartlarini o\'zgartirib qayta urinib ko\'ring')
                : latinToCyrillic('Birinchi mahsulotni qo\'shing va u shu yerda ko\'rinadi')
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors active:scale-[0.98]"
                >
                  <X className="w-4 h-4" />
                  {latinToCyrillic('Filtrlarni tozalash')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(isCashierRoute ? '/cashier/add-product' : '/add-product')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {latinToCyrillic('Mahsulot qo\'shish')}
                </button>
              )
            }
          />
        </div>
      )}

      {/* Grouped product cards */}
      {!loading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.entries(groupedProducts).map(([groupKey, groupProds]) => {
            const totalGroupStock = groupProds.reduce((sum, p) => sum + (p.currentStock || 0), 0);
            return (
              <div
                key={groupKey}
                className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
              >
                {/* Card header */}
                <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{groupKey}</h3>
                      <p className="text-xs text-slate-400">{groupProds.length} {latinToCyrillic('ta rang')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">{latinToCyrillic('Jami')}</p>
                    <p className="text-base font-bold text-slate-900 tabular-nums">
                      {totalGroupStock.toLocaleString()} <span className="text-xs font-normal text-slate-400">{latinToCyrillic('qop')}</span>
                    </p>
                  </div>
                </div>

                {/* Variants list */}
                <div className="divide-y divide-slate-50">
                  {groupProds.map(product => {
                    const level = getStockLevel(product);
                    const isEditing = editingProduct === product.id;
                    const colorLabel = (product.bagType && product.name.toLowerCase().startsWith(product.bagType.toLowerCase()))
                      ? product.name.slice(product.bagType.length).trim()
                      : product.name;

                    return (
                      <div key={product.id} className="px-4 py-3 hover:bg-slate-50/70 transition-colors">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              aria-label={latinToCyrillic('Mahsulot nomi')}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={editingPriceBag}
                                onChange={(e) => setEditingPriceBag(e.target.value)}
                                aria-label={latinToCyrillic('Narx (qop)')}
                                className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder={latinToCyrillic('Qop narxi')}
                              />
                              <input
                                type="number"
                                step="0.0001"
                                value={editingPricePiece}
                                onChange={(e) => setEditingPricePiece(e.target.value)}
                                aria-label={latinToCyrillic('Narx (dona)')}
                                className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder={latinToCyrillic('Dona narxi')}
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => saveProductData(product.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {latinToCyrillic('Saqlash')}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                {latinToCyrillic('Bekor')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 border ${getColorDot(product.name)}`} />
                            <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{colorLabel || product.name}</span>
                            <span className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
                              {(product.currentStock || 0).toLocaleString()}
                              <span className="text-xs font-normal text-slate-400 ml-1">{latinToCyrillic('qop')}</span>
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 tabular-nums flex-shrink-0 hidden sm:inline">{formatPrice(product.pricePerBag)}</span>
                            <Badge variant={level.variant}>{level.label}</Badge>
                            {renderRowActions(product)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Card footer */}
                <div className="px-5 py-3 bg-slate-50/40 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate(
                      isCashierRoute
                        ? `/cashier/add-product?bagType=${encodeURIComponent(groupKey)}`
                        : `/add-product?bagType=${encodeURIComponent(groupKey)}`
                    )}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {latinToCyrillic("Rang qo'shish")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Yangi mahsulot qo'shish modal oynasi */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {latinToCyrillic('Yangi Mahsulot')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  aria-label={latinToCyrillic('Yopish')}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Form */}
              <ValidatedForm
                schema={productSchema}
                defaultValues={{
                  name: '',
                  pricePerBag: 0,
                  pricePerPiece: 0,
                  currentStock: 0,
                  unitsPerBag: 2000,
                  warehouse: 'preform',
                  active: true
                }}
                onSubmit={handleAddProduct}
                loading={productFormLoading}
                error={productFormError}
                success={productFormSuccess}
              >
                <FormField
                  name="name"
                  label={latinToCyrillic('Mahsulot nomi')}
                  placeholder={latinToCyrillic('Masalan: 15gr Preform Oq')}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="pricePerBag"
                    label={latinToCyrillic('Narx (qop)')}
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="1"
                    required
                  />
                  <FormField
                    name="currentStock"
                    label={latinToCyrillic('Zaxira (qop)')}
                    type="number"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="pricePerPiece"
                    label={latinToCyrillic('Narx (dona)')}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Avtomatik"
                  />
                  <FormField
                    name="unitsPerBag"
                    label={latinToCyrillic('1 qopda (dona)')}
                    type="number"
                    placeholder="2000"
                    min="1"
                  />
                </div>

                <FormField
                  name="warehouse"
                  label={latinToCyrillic('Ombor kategoriyasi')}
                  type="select"
                  options={[
                    { value: 'preform', label: 'Preform' },
                    { value: 'krishka', label: 'Krishka' },
                    { value: 'ruchka', label: 'Ruchka' },
                    { value: 'other', label: 'Boshqa' }
                  ]}
                />

                <FormActions
                  onCancel={() => {
                    closeAddModal();
                    setProductFormError(null);
                    setProductFormSuccess(null);
                  }}
                  submitText={latinToCyrillic('Saqlash')}
                  cancelText={latinToCyrillic('Bekor qilish')}
                  loading={productFormLoading}
                />
              </ValidatedForm>
            </div>
          </div>
        </div>
      )}

      {/* Narxlari Jadvali Modal */}
      {showPriceTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <Table2 className="w-7 h-7" />
                {latinToCyrillic('Narxlari Jadvali')}
              </h2>
              <div className="flex items-center gap-3">
                {/* Yuklab olish tugmasi */}
                <button
                  type="button"
                  onClick={exportPriceTableToExcel}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                  title={latinToCyrillic('Excel formatida yuklab olish')}
                >
                  <Download className="w-5 h-5" />
                  {latinToCyrillic('Yuklab olish')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPriceTableModal(false)}
                  aria-label={latinToCyrillic('Yopish')}
                  title={latinToCyrillic('Yopish')}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="p-6 overflow-auto flex-1">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic('Mahsulot')}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic('Qop Narx ($)')}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic('Dona/qop')}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic('Dona Narx ($)')}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic('Zaxira (qop)')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Preformlar */}
                  {products
                    .filter(p => p.warehouse === 'preform' || p.name.toLowerCase().includes('preform') || /\d+\s*(gr|g|гр|г)/i.test(p.name))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((product, index) => {
                      const isEditingRow = editingPriceRow === product.id;
                      const unitsPerBag = isEditingRow ? (parseInt(editUnitsPerBag) || 2000) : (product.unitsPerBag || 2000);
                      const pricePerBag = isEditingRow ? (parseFloat(editPriceBag) || 0) : (product.pricePerBag || 0);
                      const pricePerPiece = isEditingRow
                        ? (parseFloat(editPricePiece) || (pricePerBag / unitsPerBag) || 0)
                        : (product.pricePerPiece || (product.pricePerBag / unitsPerBag) || 0);
                      return (
                        <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <span>{product.name}</span>
                              {isEditingRow ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => savePriceRowData(product.id)}
                                    className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Saqlash')}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Bekor')}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic('Tahrirlash')}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editPriceBag}
                                onChange={(e) => setEditPriceBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-emerald-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="font-bold text-emerald-600">${product.pricePerBag?.toFixed(2) || '0.00'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                value={editUnitsPerBag}
                                onChange={(e) => setEditUnitsPerBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="2000"
                              />
                            ) : (
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic('dona')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.0001"
                                value={editPricePiece}
                                onChange={(e) => setEditPricePiece(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-blue-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="0.0000"
                              />
                            ) : (
                              <span className="font-bold text-blue-600">${pricePerPiece.toFixed(4)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 border-b border-gray-100">
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic('qop')}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Krishkalar */}
                  {products
                    .filter(p => p.warehouse === 'krishka' || p.name.toLowerCase().includes('krishka') || p.name.toLowerCase().includes('qopqoq'))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((product, index) => {
                      const isEditingRow = editingPriceRow === product.id;
                      const unitsPerBag = isEditingRow ? (parseInt(editUnitsPerBag) || 2000) : (product.unitsPerBag || 2000);
                      const pricePerBag = isEditingRow ? (parseFloat(editPriceBag) || 0) : (product.pricePerBag || 0);
                      const pricePerPiece = isEditingRow
                        ? (parseFloat(editPricePiece) || (pricePerBag / unitsPerBag) || 0)
                        : (product.pricePerPiece || (product.pricePerBag / unitsPerBag) || 0);
                      return (
                        <tr key={product.id} className={index % 2 === 0 ? 'bg-purple-50' : 'bg-white'}>
                          <td className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <span>{product.name}</span>
                              {isEditingRow ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => savePriceRowData(product.id)}
                                    className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Saqlash')}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Bekor')}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic('Tahrirlash')}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editPriceBag}
                                onChange={(e) => setEditPriceBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-emerald-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="font-bold text-emerald-600">${product.pricePerBag?.toFixed(2) || '0.00'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                value={editUnitsPerBag}
                                onChange={(e) => setEditUnitsPerBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="2000"
                              />
                            ) : (
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic('dona')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.0001"
                                value={editPricePiece}
                                onChange={(e) => setEditPricePiece(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-blue-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="0.0000"
                              />
                            ) : (
                              <span className="font-bold text-blue-600">${pricePerPiece.toFixed(4)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 border-b border-gray-100">
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic('qop')}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Ruchkalar */}
                  {products
                    .filter(p => p.warehouse === 'ruchka' || p.name.toLowerCase().includes('ruchka') || p.name.toLowerCase().includes('handle'))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((product, index) => {
                      const isEditingRow = editingPriceRow === product.id;
                      const unitsPerBag = isEditingRow ? (parseInt(editUnitsPerBag) || 2000) : (product.unitsPerBag || 2000);
                      const pricePerBag = isEditingRow ? (parseFloat(editPriceBag) || 0) : (product.pricePerBag || 0);
                      const pricePerPiece = isEditingRow
                        ? (parseFloat(editPricePiece) || (pricePerBag / unitsPerBag) || 0)
                        : (product.pricePerPiece || (product.pricePerBag / unitsPerBag) || 0);
                      return (
                        <tr key={product.id} className={index % 2 === 0 ? 'bg-pink-50' : 'bg-white'}>
                          <td className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <span>{product.name}</span>
                              {isEditingRow ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => savePriceRowData(product.id)}
                                    className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Saqlash')}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Bekor')}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic('Tahrirlash')}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editPriceBag}
                                onChange={(e) => setEditPriceBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-emerald-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="font-bold text-emerald-600">${product.pricePerBag?.toFixed(2) || '0.00'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                value={editUnitsPerBag}
                                onChange={(e) => setEditUnitsPerBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="2000"
                              />
                            ) : (
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic('dona')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.0001"
                                value={editPricePiece}
                                onChange={(e) => setEditPricePiece(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-blue-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="0.0000"
                              />
                            ) : (
                              <span className="font-bold text-blue-600">${pricePerPiece.toFixed(4)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 border-b border-gray-100">
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic('qop')}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Boshqalar */}
                  {products
                    .filter(p => {
                      const name = p.name.toLowerCase();
                      const isPreform = p.warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/i.test(name);
                      const isKrishka = p.warehouse === 'krishka' || name.includes('krishka') || name.includes('qopqoq');
                      const isRuchka = p.warehouse === 'ruchka' || name.includes('ruchka') || name.includes('handle');
                      return !isPreform && !isKrishka && !isRuchka;
                    })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((product, index) => {
                      const isEditingRow = editingPriceRow === product.id;
                      const unitsPerBag = isEditingRow ? (parseInt(editUnitsPerBag) || 2000) : (product.unitsPerBag || 2000);
                      const pricePerBag = isEditingRow ? (parseFloat(editPriceBag) || 0) : (product.pricePerBag || 0);
                      const pricePerPiece = isEditingRow
                        ? (parseFloat(editPricePiece) || (pricePerBag / unitsPerBag) || 0)
                        : (product.pricePerPiece || (product.pricePerBag / unitsPerBag) || 0);
                      return (
                        <tr key={product.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <span>{product.name}</span>
                              {isEditingRow ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => savePriceRowData(product.id)}
                                    className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Saqlash')}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic('Bekor')}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic('Tahrirlash')}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editPriceBag}
                                onChange={(e) => setEditPriceBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-emerald-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="font-bold text-emerald-600">${product.pricePerBag?.toFixed(2) || '0.00'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                value={editUnitsPerBag}
                                onChange={(e) => setEditUnitsPerBag(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="2000"
                              />
                            ) : (
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic('dona')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-gray-100">
                            {isEditingRow ? (
                              <input
                                type="number"
                                step="0.0001"
                                value={editPricePiece}
                                onChange={(e) => setEditPricePiece(e.target.value)}
                                className="w-24 px-2 py-1 border-2 border-gray-300 rounded-lg text-right font-bold text-blue-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                placeholder="0.0000"
                              />
                            ) : (
                              <span className="font-bold text-blue-600">${pricePerPiece.toFixed(4)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 border-b border-gray-100">
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic('qop')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {products.length} {latinToCyrillic('ta mahsulot')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPriceTableModal(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all"
                >
                  {latinToCyrillic('Yopish')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog (replaces window.confirm) */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        title={latinToCyrillic('Mahsulotni o\'chirish')}
        message={
          deleteTarget
            ? `"${deleteTarget.name}" ${latinToCyrillic('mahsulotini o\'chirmoqchimisiz? Bu amalni qaytarib bo\'lmaydi.')}`
            : ''
        }
        confirmText={latinToCyrillic('O\'chirish')}
        cancelText={latinToCyrillic('Bekor qilish')}
        variant="danger"
      />
    </div>
  );
}
