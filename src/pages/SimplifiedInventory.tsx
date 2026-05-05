import { useState, useEffect } from 'react';
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
  TrendingUp,
  TrendingDown,
  Eye,
  Table2
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

interface Product {
  id: string;
  name: string;
  pricePerBag: number;
  pricePerPiece: number;
  currentStock: number;
  optimalStock: number;
  unitsPerBag: number;
  warehouse: string;
  bagType: string;
  active: boolean;
}

export default function SimplifiedInventory() {
  const navigate = useNavigate();
  const isCashierRoute = window.location.pathname.startsWith('/cashier');
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setExpandedGroups] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'preform' | 'krishka' | 'ruchka' | 'other'>('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPriceBag, setEditingPriceBag] = useState('');
  const [editingPricePiece, setEditingPricePiece] = useState('');
  const [loading, setLoading] = useState(true);
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

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products');
      // ✅ Handle standardized API response format { success, data }
      const productsData = extractArray<Product>(response, []);
      setProducts(productsData);
      setLastUpdated(new Date());
    } catch (error) {
      errorHandler.handleError(error, { action: 'loadProducts' });
    } finally {
      setLoading(false);
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
        alert(latinToCyrillic('Iltimos, mahsulot nomi va narxini to\'ldiring!'));
        return;
      }
      
      const updateData = {
        name: editingName,
        pricePerBag: parseFloat(editingPriceBag) || 0,
        pricePerPiece: parseFloat(editingPricePiece) || 0
      };
      
      await api.put(`/products/${productId}`, updateData);
      loadProducts();
      setEditingProduct(null);
      alert(latinToCyrillic('✅ Ma\'lumotlar yangilandi!'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Noma\'lum xatolik';
      alert(latinToCyrillic(`❌ Xatolik: ${errorMessage}`));
    }
  };

  const cancelEditing = () => {
    setEditingProduct(null);
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm(latinToCyrillic('Rostdan ham ushbu mahsulotni o\'chirmoqchimisiz?'))) return;
    
    try {
      await api.delete(`/products/${productId}`);
      loadProducts();
      alert(latinToCyrillic('✅ Mahsulot muvaffaqiyatli o\'chirildi!'));
    } catch (error) {
      errorHandler.handleError(error, { action: 'deleteProduct', productId });
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
      loadProducts();
      
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
      const confirmed = confirm(latinToCyrillic('Formda ma\'lumotlar bor. Yopishni xohlaysizmi?'));
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


  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) {
      return { 
        color: 'text-slate-600', 
        bgColor: 'bg-slate-100 border-2 border-slate-300',
        label: latinToCyrillic('Tugagan'),
        emoji: '❌',
        icon: AlertTriangle
      };
    }
    
    if (product.currentStock < (product.optimalStock || 100)) {
      return { 
        color: 'text-slate-500', 
        bgColor: 'bg-slate-50 border-2 border-slate-200',
        label: latinToCyrillic('Kam'),
        emoji: '⚠️',
        icon: TrendingDown
      };
    }
    
    return { 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-2 border-blue-200',
      label: latinToCyrillic('Yaxshi'),
      emoji: '✅',
      icon: TrendingUp
    };
  };

  const extractColor = (productName: string): string => {
    const name = productName.toLowerCase();
    
    const colorPatterns = [
      { pattern: /oq|white|belyy|белый/i, label: latinToCyrillic('Oq'), hex: '#FFFFFF' },
      { pattern: /qora|black|chernyy|черный/i, label: latinToCyrillic('Qora'), hex: '#1F2937' },
      { pattern: /kok|ko'k|blue|siniy|синий|голубой/i, label: latinToCyrillic('Ko\'k'), hex: '#3B82F6' },
      { pattern: /yashil|green|zelenyy|зеленый/i, label: latinToCyrillic('Yashil'), hex: '#10B981' },
      { pattern: /qizil|red|krasnyy|красный/i, label: latinToCyrillic('Qizil'), hex: '#EF4444' },
      { pattern: /sariq|yellow|zheltyy|желтый/i, label: latinToCyrillic('Sariq'), hex: '#F59E0B' },
      { pattern: /jigarrang|brown|korichnevyy|коричневый/i, label: latinToCyrillic('Jigarrang'), hex: '#92400E' },
      { pattern: /kul|gray|seryy|серый/i, label: latinToCyrillic('Kul'), hex: '#6B7280' },
      { pattern: /binafsha|purple|fioletovyy|фиолетовый/i, label: latinToCyrillic('Binafsha'), hex: '#8B5CF6' },
      { pattern: /pushti|pink|rozovyy|розовый/i, label: latinToCyrillic('Pushti'), hex: '#EC4899' },
      { pattern: /to'q|dark|temnyy/i, label: latinToCyrillic('To\'q'), hex: '#374151' },
      { pattern: /och|light|svetlyy/i, label: latinToCyrillic('Och'), hex: '#D1D5DB' }
    ];
    
    for (const color of colorPatterns) {
      if (color.pattern.test(name)) {
        return color.label;
      }
    }
    
    return latinToCyrillic('Boshqa');
  };

  const extractProductType = (productName: string): string => {
    const name = productName.toLowerCase();
    
    // 1. AVVAL Preform mahsulotlarni gramm bo'yicha guruhlash (eng ustuvor)
    // Preform yoki gramajga ega mahsulotlar
    // Katta grammalar (10 dan katta) - preform
    const gramMatch = name.match(/(\d+)\s*(?:g|gr|gram|г|гр|грамм)/i);
    const hasPreform = name.includes('preform') || name.includes('преформ');
    
    if (hasPreform || gramMatch) {
      const gramValue = gramMatch ? parseInt(gramMatch[1]) : null;
      
      // Gram qiymati 10 dan katta bo'lsa - preform deb hisoblash (masalan: 15gr, 20gr, 52gr)
      if (gramValue && gramValue >= 10) {
        return `${gramValue}gr Preform`;
      }
      
      // Faqat preform so'zi bo'lsa
      if (hasPreform) {
        return latinToCyrillic('Preform');
      }
    }
    
    // 2. Krishka/Qopqoqlarni o'lchami bo'yicha guruhlash (mm/ml)
    if (name.includes('krishka') || name.includes('cap') || name.includes('qopqoq') || name.includes('крышка') || name.includes('копкок')) {
      // O'lchamni topish (masalan: 28mm, 28, 30mm, 38mm, 38, 48mm, 48)
      // Avval mm/ml bilan qidirish, keyin faqat raqam
      let sizeMatch = name.match(/(\d+)\s*(mm|ml|мм|мл)/i);
      if (!sizeMatch) {
        // Agar mm/ml yo'q bo'lsa, faqat raqamni qidirish (krishka 28, 28 krishka)
        // Faqat kichik sonlarni (28, 30, 38, 48, 52) krishka o'lchami deb qabul qilish
        sizeMatch = name.match(/(?:krishka|cap|qopqoq|крышка).*?(\d{2})|(\d{2}).*?(?:krishka|cap|qopqoq|крышка)/i);
        if (sizeMatch) {
          const size = sizeMatch[1] || sizeMatch[2];
          // Krishka o'lchamlari: 28, 30, 38, 48, 52
          if (['28', '30', '38', '48', '52'].includes(size)) {
            return `${size}mm Qopqoqlar`;
          }
        }
      } else {
        const size = sizeMatch[1];
        return `${size}mm Qopqoqlar`;
      }
      
      // Rangni topish
      const colorPatterns = [
        { pattern: /oq|white|belyy|белый/i, label: latinToCyrillic('Oq') },
        { pattern: /qora|black|chernyy|черный/i, label: latinToCyrillic('Qora') },
        { pattern: /kok|ko'k|blue|siniy|синий|голубой/i, label: latinToCyrillic('Ko\'k') },
        { pattern: /yashil|green|zelenyy|зеленый/i, label: latinToCyrillic('Yashil') },
        { pattern: /qizil|red|krasnyy|красный/i, label: latinToCyrillic('Qizil') },
        { pattern: /sariq|yellow|zheltyy|желтый/i, label: latinToCyrillic('Sariq') }
      ];
      
      // Agar o'lcham topilmasa, rang bo'yicha guruhlash
      let colorLabel = '';
      for (const color of colorPatterns) {
        if (color.pattern.test(name)) {
          colorLabel = color.label;
          break;
        }
      }
      
      if (colorLabel) {
        return `${colorLabel} ${latinToCyrillic('Qopqoqlar')}`;
      }
      return latinToCyrillic('Qopqoqlar');
    }
    
    // 3. Ruchkalarni hajmi/o'lchami bo'yicha guruhlash (28mm, 38mm, 48mm)
    if (name.includes('ruchka') || name.includes('handle') || name.includes('ручка')) {
      // O'lchamni topish (masalan: 28mm, 28, 38mm, 38, 48mm, 48)
      let sizeMatch = name.match(/(\d+)\s*(mm|ml|мм|мл)/i);
      if (!sizeMatch) {
        // Agar mm/ml yo'q bo'lsa, faqat raqamni qidirish (ruchka 28, 28 ruchka)
        sizeMatch = name.match(/(?:ruchka|handle|ручка).*?(\d{2})|(\d{2}).*?(?:ruchka|handle|ручка)/i);
        if (sizeMatch) {
          const size = sizeMatch[1] || sizeMatch[2];
          // Ruchka o'lchamlari: 28, 30, 38, 48
          if (['28', '30', '38', '48'].includes(size)) {
            return `${size}mm Ruchkalar`;
          }
        }
      } else {
        const size = sizeMatch[1];
        return `${size}mm Ruchkalar`;
      }
      
      return latinToCyrillic('Ruchkalar');
    }
    
    // 4. Kichik grammali mahsulotlar (10 dan kichik) - boshqa kategoriya
    if (gramMatch) {
      const gramValue = parseInt(gramMatch[1]);
      if (gramValue < 10) {
        return `${gramValue}gr ${latinToCyrillic('Boshqa')}`;
      }
    }
    
    return latinToCyrillic('Boshqa');
  };

  const groupProducts = (products: Product[]) => {
    const groups: { [key: string]: { color: string; products: Product[] }[] } = {};
    
    const filteredProducts = products.filter(product => {
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (activeCategory === 'all') return true;

      if (product.warehouse) {
        return product.warehouse === activeCategory;
      }

      const name = product.name.toLowerCase();
      if (activeCategory === 'preform') {
        // Preform yoki gramajga ega mahsulotlar (10g va undan katta)
        const hasGram = /(\d+)\s*(?:g|gr|gram|г|гр|грамм)/i.test(name);
        const gramMatch = name.match(/(\d+)\s*(?:g|gr|gram|г|гр|грамм)/i);
        const gramValue = gramMatch ? parseInt(gramMatch[1]) : 0;
        const hasPreform = name.includes('preform') || name.includes('преформ');
        
        // Preform so'zi bor yoki 10g+ gramajga ega va krishka/ruchka emas
        return (hasPreform || (hasGram && gramValue >= 10)) && 
               !name.includes('krishka') && !name.includes('cap') && !name.includes('крышка') &&
               !name.includes('ruchka') && !name.includes('handle') && !name.includes('ручка');
      }
      if (activeCategory === 'krishka') {
        return name.includes('krishka') || name.includes('cap') || name.includes('qopqoq') || name.includes('крышка') || name.includes('копкок');
      }
      if (activeCategory === 'ruchka') {
        return name.includes('ruchka') || name.includes('handle') || name.includes('ручка');
      }
      return activeCategory === 'other';
    });
    
    filteredProducts.forEach((product) => {
      const productType = extractProductType(product.name);
      const color = extractColor(product.name);
      
      if (!groups[productType]) {
        groups[productType] = [];
      }
      
      // Rang bo'yicha guruhlash
      let colorGroup = groups[productType].find(g => g.color === color);
      if (!colorGroup) {
        colorGroup = { color, products: [] };
        groups[productType].push(colorGroup);
      }
      
      colorGroup.products.push(product);
    });
    
    return groups;
  };

  const groupedProducts = groupProducts(products);
  const groupNames = Object.keys(groupedProducts).sort((a, b) => {
    // Raqamli guruhlarni (masalan: 15gr, 20gr) avval tartiblash
    const aMatch = a.match(/^(\d+)gr/);
    const bMatch = b.match(/^(\d+)gr/);

    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }
    if (aMatch) return -1; // Raqamli guruhlarni boshqalardan oldin qo'yish
    if (bMatch) return 1;

    // Qolganlarini alifbo tartibida
    return a.localeCompare(b);
  });

  // Doim barcha guruhlarni ochiq qilish
  useEffect(() => {
    setExpandedGroups(groupNames);
  }, [groupNames.join(',')]);

  const categories = [
    { id: 'all', label: latinToCyrillic('Barchasi'), icon: '', color: 'blue' },
    { id: 'preform', label: 'Preform', icon: '', color: 'slate' },
    { id: 'krishka', label: latinToCyrillic('Krishka'), icon: '', color: 'slate' },
    { id: 'ruchka', label: latinToCyrillic('Ruchka'), icon: '', color: 'gray' },
    { id: 'other', label: latinToCyrillic('Boshqa'), icon: '', color: 'blue' }
  ];

  const formatPrice = (price: number) => {
    return price.toFixed(2) + ' $';
  };

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
        alert(latinToCyrillic('Iltimos, qop narxini kiriting!'));
        return;
      }

      const updateData = {
        pricePerBag: parseFloat(editPriceBag) || 0,
        pricePerPiece: parseFloat(editPricePiece) || 0,
        unitsPerBag: parseInt(editUnitsPerBag) || 2000
      };

      await api.put(`/products/${productId}`, updateData);
      loadProducts();
      setEditingPriceRow(null);
      alert(latinToCyrillic('✅ Narxlar yangilandi!'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Noma\'lum xatolik';
      alert(latinToCyrillic(`❌ Xatolik: ${errorMessage}`));
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
      const allProducts: Array<{product: Product; category: string}> = [];

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
      const BOM = '\uFEFF';
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

      alert(latinToCyrillic('✅ Narxlar jadvali muvaffaqiyatli yuklandi!'));
    } catch (error) {
      console.error('Export xatolik:', error);
      alert(latinToCyrillic('❌ Yuklashda xatolik yuz berdi'));
    }
  };

  // Har bir gramm guruhi uchun alohida rang va ikonka
  const getGroupStyle = (groupName: string) => {
    // Preform grammalar uchun ranglar
    const gramColors: { [key: string]: { from: string; to: string; icon: string } } = {
      '15gr': { from: 'from-blue-400', to: 'to-blue-500', icon: '' },
      '21gr': { from: 'from-blue-500', to: 'to-blue-600', icon: '' },
      '26gr': { from: 'from-slate-400', to: 'to-slate-500', icon: '' },
      '30gr': { from: 'from-slate-500', to: 'to-slate-600', icon: '' },
      '36gr': { from: 'from-gray-400', to: 'to-gray-500', icon: '' },
      '52gr': { from: 'from-gray-500', to: 'to-gray-600', icon: '' },
      '70gr': { from: 'from-blue-600', to: 'to-blue-700', icon: '' },
      '75gr': { from: 'from-blue-700', to: 'to-blue-800', icon: '' },
      '80gr': { from: 'from-slate-600', to: 'to-slate-700', icon: '' },
      '85gr': { from: 'from-slate-700', to: 'to-slate-800', icon: '' },
      '86gr': { from: 'from-gray-600', to: 'to-gray-700', icon: '' },
      '135gr': { from: 'from-gray-700', to: 'to-gray-800', icon: '' },
    };

    // Guruh nomidan gramm qiymatini olish
    const gramMatch = groupName.match(/^(\d+)gr/);
    if (gramMatch) {
      const gramKey = gramMatch[0];
      if (gramColors[gramKey]) {
        return gramColors[gramKey];
      }
    }

    // Krishka uchun ranglar
    if (groupName.includes('Qopqoqlar')) {
      const sizeMatch = groupName.match(/^(\d+)mm/);
      if (sizeMatch) {
        const size = sizeMatch[1];
        if (size === '28') return { from: 'from-slate-500', to: 'to-slate-600', icon: '' };
        if (size === '38') return { from: 'from-slate-600', to: 'to-slate-700', icon: '' };
        if (size === '48') return { from: 'from-blue-500', to: 'to-blue-600', icon: '' };
      }
      return { from: 'from-gray-500', to: 'to-gray-600', icon: '' };
    }

    // Ruchka uchun ranglar
    if (groupName.includes('Ruchkalar')) {
      const sizeMatch = groupName.match(/^(\d+)mm/);
      if (sizeMatch) {
        const size = sizeMatch[1];
        if (size === '28') return { from: 'from-slate-400', to: 'to-slate-500', icon: '' };
        if (size === '38') return { from: 'from-blue-500', to: 'to-blue-600', icon: '' };
        if (size === '48') return { from: 'from-blue-600', to: 'to-blue-700', icon: '' };
      }
      return { from: 'from-gray-500', to: 'to-gray-600', icon: '' };
    }

    // Default
    return { from: 'from-blue-600', to: 'to-slate-600', icon: '' };
  };

  if (loading) {
    return (
      <div className="min-h-screen professional-bg-pattern flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
            <Package className="w-10 h-10 text-white animate-spin" />
          </div>
          <p className="text-xl font-bold text-gray-700">{latinToCyrillic("Mahsulotlar yuklanmoqda...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen professional-bg-pattern">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">{latinToCyrillic("Ombor")}</h1>
              <p className="text-sm text-gray-600 font-medium">
                {products.length} {latinToCyrillic("ta mahsulot")}
                {lastUpdated && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({latinToCyrillic("Oxirgi yangilanish")}: {lastUpdated.toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPriceTableModal(true)}
              className="professional-button px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl flex items-center gap-3 hover-lift"
            >
              <Table2 className="w-5 h-5" />
              {latinToCyrillic("Narxlari Jadvali")}
            </button>
            
            <button
              type="button"
              onClick={loadProducts}
              className="professional-button px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl font-bold shadow-lg hover:shadow-xl flex items-center gap-3 hover-lift"
            >
              <RefreshCw className="w-5 h-5" />
              {latinToCyrillic("Yangilash")}
            </button>
            
            <button
              type="button"
              onClick={() => {
                const isCashierRoute = window.location.pathname.startsWith('/cashier');
                navigate(isCashierRoute ? '/cashier/add-product' : '/add-product');
              }}
              className="professional-button px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl flex items-center gap-3 hover-lift"
            >
              <Plus className="w-5 h-5" />
              {latinToCyrillic("Mahsulot Qo'shish")}
            </button>
          </div>
        </div>

        {/* Qidiruv va Kategoriyalar */}
        <div className="professional-card p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Qidiruv */}
            <div className="relative">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                placeholder={latinToCyrillic("Mahsulot nomini kiriting...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="professional-input pl-14 pr-5 py-4 text-lg font-bold w-full"
              />
            </div>

            {/* Kategoriya tugmalari */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
                  className={`group py-4 px-3 rounded-2xl text-sm font-black transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    activeCategory === cat.id
                      ? `bg-gradient-to-br from-${cat.color}-500 via-${cat.color}-600 to-${cat.color}-700 text-white shadow-xl shadow-${cat.color}-500/30 ring-2 ring-${cat.color}-300/50`
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 hover:from-gray-200 hover:to-gray-300 border-2 border-transparent hover:border-gray-400 hover:shadow-gray-400/20'
                  }`}
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-300">{cat.icon}</div>
                  <div className="group-hover:font-extrabold transition-all">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mahsulotlar guruhlari */}
        <div className="space-y-4">
          {groupNames.length === 0 ? (
            <div className="professional-card p-16 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-500 mb-2">{latinToCyrillic("Mahsulot topilmadi")}</p>
              <p className="text-gray-400">{latinToCyrillic("Qidiruv shartlarini o'zgartiring")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupNames.map((groupName) => {
              const colorGroups = groupedProducts[groupName];
              const totalStock = colorGroups.reduce((sum, cg) => sum + cg.products.reduce((s, p) => s + (p.currentStock || 0), 0), 0);
              const totalValue = colorGroups.reduce((sum, cg) => sum + cg.products.reduce((s, p) => s + ((p.currentStock || 0) * (p.pricePerBag || 0)), 0), 0);
              const groupStyle = getGroupStyle(groupName);
              
              return (
                <div key={groupName} className={`group border-2 rounded-3xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border-gray-200/60 hover:border-opacity-80`}>
                  {/* Guruh headeri - har bir gramm uchun alohida rang */}
                  <div
                    className={`w-full p-4 bg-gradient-to-br ${groupStyle.from} ${groupStyle.to} border-b-2 border-white/20 relative overflow-hidden text-left`}
                  >
                    {/* Background gradient orqali */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Ikonka container */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm text-2xl shadow-lg scale-100 group-hover:scale-110 transition-transform duration-300`}>
                          {groupStyle.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-black text-white truncate max-w-[160px] drop-shadow-md">{groupName}</h3>
                          <p className="text-xs font-bold text-white/80">
                            {colorGroups.length} {latinToCyrillic("ta rang")} • {totalStock} {latinToCyrillic("qop jami")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-white drop-shadow-md">
                          {formatPrice(totalValue)}
                        </p>
                        <p className="text-xs text-white/70">
                          {latinToCyrillic("Jami qiymat")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ranglar bo'yicha guruhlangan mahsulotlar */}
                  <div className="p-4 bg-gradient-to-br from-gray-50/50 via-white to-blue-50/20">
                    <div className="space-y-4">
                      {colorGroups.map((colorGroup) => {
                        const colorStock = colorGroup.products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
                        const colorValue = colorGroup.products.reduce((sum, p) => sum + ((p.currentStock || 0) * (p.pricePerBag || 0)), 0);
                        
                        return (
                          <div key={colorGroup.color} className="border-2 border-gray-200/60 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
                            {/* Rang header */}
                            <div className="p-3 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300/60">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-md"></div>
                                  <h4 className="font-black text-gray-800 text-sm">{colorGroup.color}</h4>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-gray-600">{colorStock} {latinToCyrillic('qop')}</p>
                                  <p className="text-xs font-bold text-gray-500">{formatPrice(colorValue)}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Mahsulotlar ro'yxati */}
                            <div className="p-3 space-y-2">
                              {colorGroup.products.map((product) => {
                                const stockStatus = getStockStatus(product);
                                const StatusIcon = stockStatus.icon;
                                const isEditing = editingProduct === product.id;
                                
                                return (
                                  <div key={product.id} className="group bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 rounded-xl border border-gray-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] hover:border-blue-300/60">
                                    <div className="p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={editingName}
                                              onChange={(e) => setEditingName(e.target.value)}
                                              aria-label="Mahsulot nomini tahrirlash"
                                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl font-black text-gray-900 text-sm bg-white/90 backdrop-blur-sm shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 transition-all"
                                            />
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <h5 className="font-black text-gray-900 text-xs truncate group-hover:text-blue-700 transition-colors">{product.name}</h5>
                                              <span className={`text-xs font-black px-2 py-0.5 rounded-full shadow-sm ${
                                                product.currentStock === 0 
                                                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white' 
                                                  : product.currentStock < 50 
                                                    ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white'
                                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                              }`}>
                                                {product.currentStock || 0}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1 ml-2">
                                          {isEditing ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => saveProductData(product.id)}
                                                className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-all"
                                                aria-label="Save"
                                              >
                                                <Check className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={cancelEditing}
                                                className="w-7 h-7 bg-slate-500 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition-all"
                                                aria-label="Cancel"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => navigate(isCashierRoute ? `/cashier/products/${product.id}` : `/products/${product.id}`)}
                                                className="h-7 px-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg flex items-center gap-1 transition-all duration-300 hover:scale-105 shadow-md text-xs font-black"
                                                title={latinToCyrillic("Батафсил")}
                                              >
                                                <Eye className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => startEditing(product)}
                                                className="w-7 h-7 bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-500 hover:to-blue-600 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md"
                                                title={latinToCyrillic("Таҳрир")}
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => deleteProduct(product.id)}
                                                className="w-7 h-7 bg-gradient-to-br from-red-100 to-red-200 hover:from-red-500 hover:to-red-600 text-red-600 hover:text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md"
                                                title={latinToCyrillic("Ўчириш")}
                                                aria-label={latinToCyrillic("Ўчириш")}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {/* Yangi mahsulot qo'shish modal oynasi */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {latinToCyrillic("Yangi Mahsulot")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  aria-label={latinToCyrillic("Yopish")}
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
                  label={latinToCyrillic("Mahsulot nomi")}
                  placeholder={latinToCyrillic("Masalan: 15gr Preform Oq")}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="pricePerBag"
                    label={latinToCyrillic("Narx (qop)")}
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="1"
                    required
                  />
                  <FormField
                    name="currentStock"
                    label={latinToCyrillic("Zaxira (qop)")}
                    type="number"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="pricePerPiece"
                    label={latinToCyrillic("Narx (dona)")}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Avtomatik"
                  />
                  <FormField
                    name="unitsPerBag"
                    label={latinToCyrillic("1 qopda (dona)")}
                    type="number"
                    placeholder="2000"
                    min="1"
                  />
                </div>

                <FormField
                  name="warehouse"
                  label={latinToCyrillic("Ombor kategoriyasi")}
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
                  submitText={latinToCyrillic("Saqlash")}
                  cancelText={latinToCyrillic("Bekor qilish")}
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
                {latinToCyrillic("Narxlari Jadvali")}
              </h2>
              <div className="flex items-center gap-3">
                {/* Yuklab olish tugmasi */}
                <button
                  type="button"
                  onClick={exportPriceTableToExcel}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                  title={latinToCyrillic("Excel formatida yuklab olish")}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {latinToCyrillic("Yuklab olish")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPriceTableModal(false)}
                  aria-label="Yopish"
                  title="Yopish"
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
                      {latinToCyrillic("Mahsulot")}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic("Qop Narx ($)")}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic("Dona/qop")}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic("Dona Narx ($)")}
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-200">
                      {latinToCyrillic("Zaxira (qop)")}
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
                                    title={latinToCyrillic("Saqlash")}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic("Bekor")}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic("Tahrirlash")}
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
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic("dona")}</span>
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
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic("qop")}
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
                                    title={latinToCyrillic("Saqlash")}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic("Bekor")}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic("Tahrirlash")}
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
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic("dona")}</span>
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
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic("qop")}
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
                                    title={latinToCyrillic("Saqlash")}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic("Bekor")}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic("Tahrirlash")}
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
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic("dona")}</span>
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
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic("qop")}
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
                                    title={latinToCyrillic("Saqlash")}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelPriceRowEditing}
                                    className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all"
                                    title={latinToCyrillic("Bekor")}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startPriceRowEditing(product)}
                                  className="w-7 h-7 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                  title={latinToCyrillic("Tahrirlash")}
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
                              <span className="text-gray-600">{unitsPerBag.toLocaleString()} {latinToCyrillic("dona")}</span>
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
                            {typeof product.currentStock === 'number' ? product.currentStock.toFixed(2) : (product.currentStock || '0.00')} {latinToCyrillic("qop")}
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
                  {products.length} {latinToCyrillic("ta mahsulot")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPriceTableModal(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all"
                >
                  {latinToCyrillic("Yopish")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  