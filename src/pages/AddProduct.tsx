import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, ArrowLeft, RefreshCw, X } from 'lucide-react';
import CustomDropdown from '../components/CustomDropdown';
import { useVariants } from '../hooks/useVariants';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';

export default function AddProduct() {
  const navigate = useNavigate();
  const isCashier = window.location.pathname.startsWith('/cashier');
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [manualSuffix, setManualSuffix] = useState('');
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);
  
  // Variantlar hook
  const { getVariants, deleteVariant, addVariant } = useVariants();
  
  // Form data - to'g'ri qiymatlar bilan
  const [formData, setFormData] = useState({
    name: '',
    bagType: '15G',
    color: '',
    warehouse: 'preform', // preform, krishka, ruchka
    unitsPerBag: '1000',
    pricePerBag: '25.00',
    pricePerPiece: '0.00',
    currentStock: '0',
    minStockLimit: '50',
    optimalStock: '200',
    maxCapacity: '1000',
    active: true,
    // Kategoriya tanlash uchun yangi maydonlar
    productTypeId: '',
    categoryId: '',
    sizeId: '',
    sizeName: '',
    sizeValue: 0,
    sizeUnit: '',
    subType: '', // Aksessuar o'lchami (28, 38, 48)
  });

  // Yangi mahsulot turlari state
  const [customTypes, setCustomTypes] = useState<{id: string, label: string, color: string}[]>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Modal states - kerak bo'lsa qayta qo'shiladi

  // Auto-generate product name based on selections
  useEffect(() => {
    // Set editing mode if editId is present
    if (editId) {
      setIsEditing(true);
      loadProductData(editId);
    }
  }, [editId]);

  // 1. bagType ga qarab kategoriyani va o'lchamni avtomatik aniqlash (Mapping)
  useEffect(() => {
    if (!isEditing && formData.bagType) {
      const bagType = formData.bagType.trim();
      const bagTypeLower = bagType.toLowerCase();
      
      const numericMatch = bagType.match(/(\d+)/);
      const sizeValue = numericMatch ? parseInt(numericMatch[1]) : 0;
      
      let updates: any = {};
      
      if (sizeValue > 0 && !bagTypeLower.includes('qop') && !bagTypeLower.includes('bag') && !bagTypeLower.includes('qopqoq') && !bagTypeLower.includes('cap')) {
        const sizeName = `${sizeValue}g`;
        const validSizes = [15, 21, 26, 30, 36, 52, 70, 75, 80, 85, 86, 135, 250];
        const isValidSize = validSizes.includes(sizeValue);

        updates = {
          productTypeId: isValidSize ? 'kapsula-type' : '',
          categoryId: isValidSize ? `kapsula-${sizeValue}gr` : '',
          sizeId: isValidSize ? `size-${sizeValue}gr` : '',
          sizeName: sizeName,
          sizeValue: sizeValue,
          sizeUnit: 'g',
          unitsPerBag: sizeValue === 15 ? '4000' : 
                       sizeValue === 21 ? '3000' :
                       sizeValue === 28 ? '2500' :
                       sizeValue === 40 ? '2000' : 
                       sizeValue >= 70 ? '500' : '1000'
        };
      }
      else if (bagTypeLower.includes('qop') || bagTypeLower.includes('bag') || bagTypeLower.includes('qopqoq') || bagTypeLower.includes('cap')) {
        updates = {
          productTypeId: '',
          categoryId: '',
          sizeId: '',
          sizeName: '',
          sizeValue: 0,
          sizeUnit: '',
          unitsPerBag: '1'
        };
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formData.bagType, isEditing]);

  // 2. Ismni avtomatik generatsiya qilish (Auto-name)
  useEffect(() => {
    if (!isEditing && !isNameManuallyEdited) {
      setFormData(prev => {
        const hasSizeInBagType = prev.bagType && prev.sizeName && 
          prev.bagType.toLowerCase().includes(prev.sizeName.toLowerCase().replace('g', ''));
          
        const sizePart = (prev.sizeName && !hasSizeInBagType) ? ` ${prev.sizeName}` : '';
        const subTypePart = prev.subType ? ` ${prev.subType}` : '';
        
        if (prev.bagType && prev.color) {
          const autoName = `${prev.bagType}${sizePart}${subTypePart} ${prev.color}`.trim();
          const finalName = (autoName + ' ' + manualSuffix).trim();
          if (prev.name !== finalName) {
            return { ...prev, name: finalName };
          }
        }
        return prev;
      });
    }
  }, [formData.bagType, formData.color, formData.sizeName, formData.subType, isEditing, isNameManuallyEdited, manualSuffix]);

  // Mahsulot ma'lumotlarini yuklash
  const loadProductData = async (productId: string) => {
    try {
      const response = await api.get(`/products/${productId}`);
      const product = response.data;
      
      // Form ma'lumotlarini to'ldirish
      setFormData({
        name: product.name || '',
        bagType: product.bagType || '',
        color: product.color || '',
        warehouse: product.warehouse || 'preform',
        unitsPerBag: product.unitsPerBag?.toString() || '1000',
        pricePerBag: product.pricePerBag?.toString() || '',
        pricePerPiece: product.pricePerPiece?.toString() || '',
        currentStock: product.currentStock?.toString() || '0',
        minStockLimit: product.minStockLimit?.toString() || '50',
        optimalStock: product.optimalStock?.toString() || '200',
        maxCapacity: product.maxCapacity?.toString() || '1000',
        active: product.active !== false,
        // Kategoriya maydonlari
        categoryId: product.categoryId || '',
        sizeId: product.sizeId || '',
        sizeName: product.size?.name || '',
        sizeValue: product.size?.value || 0,
        sizeUnit: product.size?.unit || '',
        subType: product.subType || '',
        productTypeId: product.productTypeId || ''
      });
      
    } catch (error) {
      console.error('Mahsulot ma\'lumotlarini yuklashda xatolik:', error);
      alert('Mahsulot ma\'lumotlarini yuklashda xatolik yuz berdi!');
      navigate(isCashier ? '/cashier/products' : '/products');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Track manual name edits
    if (name === 'name' && !isEditing) {
      const sizePart = formData.sizeName ? ` ${formData.sizeName}` : '';
      const subTypePart = formData.subType ? ` ${formData.subType}` : '';
      const auto = `${formData.bagType}${sizePart}${subTypePart} ${formData.color}`.trim();
      
      if (value.startsWith(auto)) {
        setManualSuffix(value.slice(auto.length).trim());
        setIsNameManuallyEdited(false);
      } else {
        setIsNameManuallyEdited(true);
      }
    }
    
    // Special validation for product name when editing
    if (name === 'name' && isEditing) {
      // Allow manual editing but keep the warning if format is unusual
      const pattern = /^(\d+)(G|g|GR|gr|KG|kg|Kg)\s+.+$/;
      if (value && !pattern.test(value)) {
        setMessage('âš ï¸ ' + latinToCyrillic("Mahsulot nomi '15G QORA' formatida bo'lishi tavsiya etiladi"));
        setTimeout(() => setMessage(''), 3000);
      }
    }

    // Sanitization for numeric fields
    let finalValue: any = type === 'checkbox' ? checked : value;
    if (['unitsPerBag', 'pricePerBag', 'pricePerPiece', 'currentStock', 'minStockLimit', 'optimalStock', 'maxCapacity'].includes(name)) {
      const sanitized = value.replace(',', '.');
      if (sanitized !== '' && isNaN(Number(sanitized)) && sanitized !== '.') return;
      finalValue = sanitized;
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ðŸš€ Form submit bosildi!');
    setLoading(true);
    setMessage('');

    try {
      // Validatsiya - faqat kerakli maydonlar
      console.log('Form ma\'lumotlari:', formData);
      if (!formData.name || !formData.bagType || !formData.color || !formData.unitsPerBag || !formData.pricePerBag) {
        console.log('Validatsiya xatosi:', { name: !!formData.name, bagType: !!formData.bagType, color: !!formData.color, unitsPerBag: !!formData.unitsPerBag, pricePerBag: !!formData.pricePerBag });
        setMessage('âŒ Iltimos, barcha majburiy maydonlarni to\'ldiring!');
        setLoading(false);
        return;
      }

      // Mahsulot ma'lumotlarini tayyorlash - to'g'ri qiymatlar
      const productData: any = {
        name: formData.name,
        bagType: formData.bagType,
        color: formData.color,
        warehouse: formData.warehouse,
        unitsPerBag: parseFloat(formData.unitsPerBag) || 0,
        currentStock: parseFloat(formData.currentStock) || 0,
        pricePerBag: parseFloat(formData.pricePerBag) || 0,
        pricePerPiece: parseFloat(formData.pricePerPiece) || 0,
        minStockLimit: parseInt(formData.minStockLimit) || 0,
        optimalStock: parseInt(formData.optimalStock) || 0,
        maxCapacity: parseInt(formData.maxCapacity) || 0,
        isParent: false,
        active: formData.active
      };

      // Faqat to'g'ri categoryId va sizeId bo'lsa qo'shamiz
      if (formData.productTypeId && formData.productTypeId.trim() !== '') {
        productData.productTypeId = formData.productTypeId;
      }
      if (formData.categoryId && formData.categoryId.trim() !== '') {
        productData.categoryId = formData.categoryId;
      }
      if (formData.sizeId && formData.sizeId.trim() !== '') {
        productData.sizeId = formData.sizeId;
      }
      if (formData.subType && formData.subType.trim() !== '') {
        productData.subType = formData.subType;
      }

      console.log('ðŸ“¤ Mahsulot yaratilmoqda:', productData);

      // Mahsulot yaratish yoki yangilash
      let response;
      if (isEditing) {
        response = await api.put(`/products/${editId}`, productData);
        setMessage(`âœ… "${response.data.name}" mahsuloti muvaffaqiyatli yangilandi!`);
        setTimeout(() => navigate(isCashier ? '/cashier/products' : '/products'), 2000);
      } else {
        response = await api.post('/products', productData);
        setMessage(`âœ… "${response.data.name}" mahsuloti muvaffaqiyatli yaratildi!`);
        setIsNameManuallyEdited(false);
        setManualSuffix('');
        
        // Formani tozalash
        setFormData({
          name: '',
          bagType: '15G',
          color: '',
          warehouse: 'preform',
          unitsPerBag: '1000',
          pricePerBag: '25.00',
          pricePerPiece: '0.00',
          currentStock: '0',
          minStockLimit: '50',
          optimalStock: '200',
          maxCapacity: '1000',
          active: true,
          productTypeId: '',
          categoryId: '',
          sizeId: '',
          sizeName: '',
          sizeValue: 0,
          sizeUnit: '',
          subType: ''
        });
      }

    } catch (error: any) {
      console.error('âŒ Mahsulot yaratish xatoligi:', error);
      const errorMsg = error.response?.data?.error || error.message;
      const details = error.response?.data?.details || '';
      setMessage(`âŒ Xatolik: ${errorMsg} ${details ? '(' + details + ')' : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-[3rem] p-10 sm:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white dark:border-gray-800">
        <div className="absolute top-0 -left-10 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-emerald-100 dark:bg-emerald-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
            <div className="space-y-4">
              <button 
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 text-[10px] font-semibold uppercase tracking-wide text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                {t("Orqaga qaytish")}
              </button>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-[0.9]">
                {isEditing ? t("Mahsulotni") : t("Yangi")}<br />
                <span className="text-blue-600">{isEditing ? t("Tahrirlash") : t("Mahsulot")}</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-bold max-w-md text-sm sm:text-base">
                {isEditing ? t("Mavjud mahsulot ma'lumotlarini yangilash va sozlash") : t("Yangi mahsulotni tizimga qo'shish va omborga joylashtirish")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-900 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden">
          {message && (
            <div className={`p-6 text-center font-semibold text-xs tracking-widest uppercase animate-in slide-in-from-top duration-500 ${
              message.includes('âœ…') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-10 sm:p-16 space-y-16">
            {/* 0. Ombor Turi */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-blue-500/30">0</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t("Ombor bo'limi")}</h3>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'preform', label: 'PREFORM', color: 'blue' },
                  { id: 'krishka', label: 'QOPQOQ', color: 'orange' },
                  { id: 'ruchka', label: 'RUCHKA', color: 'emerald' },
                  ...customTypes
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, warehouse: type.id }))}
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 text-center ${
                      formData.warehouse === type.id
                        ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20 shadow-lg shadow-${type.color}-500/10`
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className={`text-sm font-bold tracking-wide ${formData.warehouse === type.id ? `text-${type.color}-600` : 'text-gray-500'}`}>
                      {type.label}
                    </p>
                  </button>
                ))}
                {/* Yangi tur qo'shish tugmasi */}
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(true)}
                  className="group p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 text-center"
                >
                  <p className="text-sm font-bold tracking-wide text-gray-400 group-hover:text-purple-600">
                    + {latinToCyrillic("YANGI TUR")}
                  </p>
                </button>
              </div>

              {formData.warehouse === 'preform' && (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-500">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6 text-center">{t("Aksessuar O'lchami")}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: '28', label: '28 MM', desc: '15g - 30g' },
                      { id: '38', label: '38 MM', desc: '52g - 70g' },
                      { id: '48', label: '48 MM', desc: '75g+' }
                    ].map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, subType: size.id }))}
                        className={`p-6 rounded-2xl border-2 transition-all ${
                          formData.subType === size.id
                            ? 'border-blue-500 bg-white dark:bg-gray-900 shadow-lg'
                            : 'border-white dark:border-gray-800 text-gray-400'
                        }`}
                      >
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{size.label}</p>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">{size.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 1. Asosiy Ma'lumotlar */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30">1</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic(t("Asosiy ma'lumotlar"))}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Mahsulot Nomi"))}</label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm transition-all outline-none"
                      placeholder={latinToCyrillic("15G QORA...")}
                    />
                    {(isNameManuallyEdited || manualSuffix) && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNameManuallyEdited(false);
                          setManualSuffix('');
                        }}
                        aria-label="Reset name"
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm flex items-center justify-center text-blue-600 hover:scale-110 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Qop Turi"))}</label>
                  <CustomDropdown
                    value={formData.bagType}
                    onChange={(value) => setFormData(prev => ({ ...prev, bagType: value }))}
                    placeholder="15G, 21G, 5KG..."
                    variants={getVariants('bagTypeVariants')}
                    variantKey="bagType"
                    onDeleteVariant={(variant) => deleteVariant('bagTypeVariants', variant)}
                    onAddVariant={(variant) => addVariant('bagTypeVariants', variant)}
                    className="h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Rangi"))}</label>
                  <CustomDropdown
                    value={formData.color}
                    onChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                    placeholder={latinToCyrillic(t("Rangni tanlang yoki yozing..."))}
                    variants={getVariants('colorVariants')}
                    variantKey="color"
                    onDeleteVariant={(variant) => deleteVariant('colorVariants', variant)}
                    onAddVariant={(variant) => addVariant('colorVariants', variant)}
                    className="h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 2. Miqdor va Narx */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-amber-500/30">2</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic(t("Miqdor va narx"))}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Qopdagi Dona"))}</label>
                  <CustomDropdown
                    value={formData.unitsPerBag}
                    onChange={(value) => setFormData(prev => ({ ...prev, unitsPerBag: value }))}
                    placeholder="1000"
                    variants={getVariants('unitsPerBagVariants')}
                    variantKey="unitsPerBag"
                    type="number"
                    min="1"
                    onDeleteVariant={(variant) => deleteVariant('unitsPerBagVariants', variant)}
                    onAddVariant={(variant) => addVariant('unitsPerBagVariants', variant)}
                    className="h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-bold text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Joriy Zaxira"))}</label>
                  <CustomDropdown
                    value={formData.currentStock}
                    onChange={(value) => setFormData(prev => ({ ...prev, currentStock: value }))}
                    placeholder="0"
                    variants={getVariants('stockVariants')}
                    variantKey="stock"
                    type="number"
                    min="0"
                    onDeleteVariant={(variant) => deleteVariant('stockVariants', variant)}
                    onAddVariant={(variant) => addVariant('stockVariants', variant)}
                    className="h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-bold text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Narxi (USD)"))}</label>
                  <CustomDropdown
                    value={formData.pricePerBag}
                    onChange={(value) => setFormData(prev => ({ ...prev, pricePerBag: value }))}
                    placeholder="25.00"
                    variants={getVariants('priceVariants')}
                    variantKey="price"
                    type="number"
                    step="0.01"
                    min="0"
                    onDeleteVariant={(variant) => deleteVariant('priceVariants', variant)}
                    onAddVariant={(variant) => addVariant('priceVariants', variant)}
                    className="h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-none font-bold text-lg text-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* 3. Limitlar */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-rose-500/30">3</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic(t("Limitlar va nazorat"))}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <label htmlFor="minStockLimit" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Minimal Limit"))}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="minStockLimit"
                    name="minStockLimit"
                    value={formData.minStockLimit}
                    onChange={handleInputChange}
                    className="w-full h-14 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-rose-500 rounded-xl font-semibold transition-all outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="optimalStock" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Optimal Limit"))}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="optimalStock"
                    name="optimalStock"
                    value={formData.optimalStock}
                    onChange={handleInputChange}
                    className="w-full h-14 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-xl font-semibold transition-all outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="maxCapacity" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic(t("Maksimal Sig'im"))}</label>
                  <input
                    id="maxCapacity"
                    type="text"
                    inputMode="decimal"
                    name="maxCapacity"
                    value={formData.maxCapacity}
                    onChange={handleInputChange}
                    className="w-full h-14 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl font-semibold transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl w-fit">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-4 text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-widest">{t("Mahsulot Faol")}</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-50 dark:border-gray-800">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 font-semibold text-sm text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
              >
                {t("Bekor qilish")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-pulse" /> : <Save className="w-5 h-5" />}
                {loading 
                  ? (isEditing ? t("Yangilanmoqda...") : t("Saqlanmoqda..."))
                  : (isEditing ? t("Mahsulotni yangilash") : t("Mahsulotni saqlash"))
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Yangi tur qo'shish modal */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {latinToCyrillic("Yangi mahsulot turi")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddTypeModal(false);
                  setNewTypeName('');
                }}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 flex items-center justify-center transition-colors"
                aria-label={latinToCyrillic("Yopish")}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                  {latinToCyrillic("Tur nomi")}
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder={latinToCyrillic("Masalan: ETIKETKA")}
                  className="w-full h-14 px-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-xl font-bold text-sm transition-all outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setNewTypeName('');
                  }}
                  className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  {latinToCyrillic("Bekor qilish")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newTypeName.trim()) {
                      const newId = 'custom-' + Date.now();
                      const colors = ['purple', 'pink', 'indigo', 'cyan', 'teal', 'lime', 'amber', 'rose'];
                      const randomColor = colors[customTypes.length % colors.length];
                      setCustomTypes(prev => [...prev, { 
                        id: newId, 
                        label: newTypeName.trim().toUpperCase(), 
                        color: randomColor 
                      }]);
                      setFormData(prev => ({ ...prev, warehouse: newId }));
                      setNewTypeName('');
                      setShowAddTypeModal(false);
                    }
                  }}
                  disabled={!newTypeName.trim()}
                  className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl font-semibold transition-all"
                >
                  {latinToCyrillic("Qo'shish")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
