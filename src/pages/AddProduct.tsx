import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, RefreshCw, X, Loader2, DollarSign, Warehouse, Boxes, Plus } from 'lucide-react';
import CustomDropdown from '../components/CustomDropdown';
import { useVariants } from '../hooks/useVariants';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { useToast, toast } from '../components/ui/Toast';

export default function AddProduct() {
  const navigate = useNavigate();
  const isCashier = window.location.pathname.startsWith('/cashier');
  const isWarehouse = window.location.pathname.startsWith('/warehouse');
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
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
        // subType'ni faqat bagType tarkibida yo'q bo'lsa qo'shish (takrorlanishni oldini olish)
        const subTypeAlreadyInBagType = prev.subType && prev.bagType && prev.bagType.includes(prev.subType);
        const subTypePart = (prev.subType && !subTypeAlreadyInBagType) ? ` ${prev.subType}` : '';

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
    setLoadingProduct(true);
    try {
      const response = await api.get(`/products/${productId}`);
      const product = response.data;
      
      // Form ma'lumotlarini to'ldirish
      setFormData({
        name: product.name || '',
        bagType: product.bagType || '',
        color: (product as any).color || '',
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
      addToast(toast.error(
        latinToCyrillic("Xatolik"),
        latinToCyrillic("Mahsulot ma'lumotlarini yuklashda xatolik yuz berdi!")
      ));
      navigate(isCashier ? '/cashier/products' : isWarehouse ? '/warehouse/products' : '/products');
    } finally {
      setLoadingProduct(false);
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
        addToast(toast.warning(
          latinToCyrillic("Format tavsiyasi"),
          latinToCyrillic("Mahsulot nomi '15G QORA' formatida bo'lishi tavsiya etiladi")
        ));
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

    try {
      // Validatsiya - faqat kerakli maydonlar
      console.log('Form ma\'lumotlari:', formData);
      if (!formData.name || !formData.bagType || !formData.color || !formData.unitsPerBag || !formData.pricePerBag) {
        console.log('Validatsiya xatosi:', { name: !!formData.name, bagType: !!formData.bagType, color: !!formData.color, unitsPerBag: !!formData.unitsPerBag, pricePerBag: !!formData.pricePerBag });
        addToast(toast.warning(
          latinToCyrillic("Majburiy maydonlar"),
          latinToCyrillic("Iltimos, barcha majburiy maydonlarni to'ldiring!")
        ));
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
        addToast(toast.success(
          latinToCyrillic("Saqlandi"),
          `"${response.data.name}" ` + latinToCyrillic("mahsuloti muvaffaqiyatli yangilandi!")
        ));
        setTimeout(() => navigate(isCashier ? '/cashier/products' : '/products'), 1200);
      } else {
        response = await api.post('/products', productData);
        addToast(toast.success(
          latinToCyrillic("Saqlandi"),
          `"${response.data.name}" ` + latinToCyrillic("mahsuloti muvaffaqiyatli yaratildi!")
        ));
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
      addToast(toast.error(
        latinToCyrillic("Xatolik"),
        `${errorMsg}${details ? ' (' + details + ')' : ''}`
      ));
    } finally {
      setLoading(false);
    }
  };


  // Edit rejimida mahsulot yuklanayotganda to'liq sahifa loader
  if (loadingProduct) {
    return <PageLoading text={latinToCyrillic("Mahsulot yuklanmoqda...")} />;
  }

  const inputBase =
    "w-full h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 tabular-nums";

  // CustomDropdown ichidagi inputni premium uslubga moslash (className keyin qo'shilib, asosiy stilni qoplaydi)
  const dropdownClass =
    "h-12 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 tabular-nums";

  const labelClass = "block text-sm font-semibold text-slate-700";

  const warehouseOptions = [
    { id: 'preform', label: latinToCyrillic('PREFORM'), color: 'blue' },
    { id: 'krishka', label: latinToCyrillic('QOPQOQ'), color: 'orange' },
    { id: 'ruchka', label: latinToCyrillic('RUCHKA'), color: 'emerald' },
    ...customTypes,
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: back + title + subtitle */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(isCashier ? '/cashier/products' : '/products')}
          aria-label={latinToCyrillic('Orqaga')}
          className="w-10 h-10 flex-shrink-0 bg-white hover:bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isEditing ? latinToCyrillic('Mahsulotni tahrirlash') : latinToCyrillic('Yangi mahsulot')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEditing
              ? latinToCyrillic("Mavjud mahsulot ma'lumotlarini yangilang")
              : latinToCyrillic("Yangi mahsulotni tizimga qo'shing")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Card: Ombor bo'limi */}
        <div className="rounded-2xl bg-white border border-slate-200/70 p-6">
          <div className="flex items-start gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Warehouse className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 tracking-tight">{latinToCyrillic("Ombor bo'limi")}</h3>
              <p className="text-sm text-slate-400 mt-0.5">{latinToCyrillic("Mahsulot qaysi omborga tegishli")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {warehouseOptions.map((type) => {
              const isActive = formData.warehouse === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    warehouse: type.id,
                    subType: '',
                    bagType: type.id === 'preform' ? '15G' : ''
                  }))}
                  className={`p-4 rounded-xl border transition-all duration-200 text-center active:scale-[0.98] ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-sm font-semibold tracking-wide ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {type.label}
                  </p>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAddTypeModal(true)}
              className="p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 text-center active:scale-[0.98] flex items-center justify-center gap-1.5 text-slate-400 hover:text-indigo-600"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-wide">{latinToCyrillic("Yangi tur")}</span>
            </button>
          </div>

          {(formData.warehouse === 'preform' || formData.warehouse === 'krishka' || formData.warehouse === 'ruchka') && (
            <div className="mt-5 bg-slate-50 p-5 rounded-xl border border-slate-200/70">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {latinToCyrillic(formData.warehouse === 'preform' ? "Aksessuar o'lchami" : "Razmer (o'lcham)")}
              </h4>
              <div className={`grid gap-3 ${formData.warehouse === 'preform' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {(formData.warehouse === 'preform'
                  ? [
                      { id: '28', label: '28 MM', desc: '15g - 30g' },
                      { id: '38', label: '38 MM', desc: '52g - 70g' },
                      { id: '48', label: '48 MM', desc: '75g+' },
                    ]
                  : [
                      { id: '28', label: '28 MM', desc: '' },
                      { id: '38', label: '38 MM', desc: '' },
                      { id: '48', label: '48 MM', desc: '' },
                      { id: '55', label: '55 MM', desc: '' },
                    ]
                ).map((size) => {
                  const isActive = formData.subType === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setFormData(prev => {
                        // krishka/ruchka uchun bagType ni avtomatik "{razmer}{ombor}" formatida o'rnatish
                        const newBagType = (prev.warehouse === 'krishka' || prev.warehouse === 'ruchka')
                          ? `${size.id}${prev.warehouse}`
                          : prev.bagType;
                        return { ...prev, subType: size.id, bagType: newBagType };
                      })}
                      className={`p-4 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isActive
                          ? 'border-indigo-500 bg-white shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className={`font-bold text-lg tabular-nums ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{size.label}</p>
                      {size.desc && <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">{size.desc}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Card: Asosiy ma'lumotlar */}
        <div className="rounded-2xl bg-white border border-slate-200/70 p-6">
          <div className="flex items-start gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Boxes className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 tracking-tight">{latinToCyrillic("Asosiy ma'lumotlar")}</h3>
              <p className="text-sm text-slate-400 mt-0.5">{latinToCyrillic("Nom, qop turi va rang")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <label htmlFor="name" className={labelClass}>
                {latinToCyrillic("Mahsulot nomi")} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`${inputBase} pr-12`}
                  placeholder={latinToCyrillic("15G QORA...")}
                />
                {(isNameManuallyEdited || manualSuffix) && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNameManuallyEdited(false);
                      setManualSuffix('');
                    }}
                    aria-label={latinToCyrillic("Nomni tiklash")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>
                {latinToCyrillic("Qop turi")} <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={formData.bagType}
                onChange={(value) => setFormData(prev => ({ ...prev, bagType: value }))}
                placeholder="15G, 21G, 5KG..."
                variants={getVariants('bagTypeVariants')}
                variantKey="bagType"
                onDeleteVariant={(variant) => deleteVariant('bagTypeVariants', variant)}
                onAddVariant={(variant) => addVariant('bagTypeVariants', variant)}
                className={dropdownClass}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className={labelClass}>
                {latinToCyrillic("Rangi")} <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={formData.color}
                onChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                placeholder={latinToCyrillic("Rangni tanlang yoki yozing...")}
                variants={getVariants('colorVariants')}
                variantKey="color"
                onDeleteVariant={(variant) => deleteVariant('colorVariants', variant)}
                onAddVariant={(variant) => addVariant('colorVariants', variant)}
                className={dropdownClass}
              />
            </div>
          </div>
        </div>

        {/* Card: Narxlar va miqdor */}
        <div className="rounded-2xl bg-white border border-slate-200/70 p-6">
          <div className="flex items-start gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 tracking-tight">{latinToCyrillic("Narxlar va miqdor")}</h3>
              <p className="text-sm text-slate-400 mt-0.5">{latinToCyrillic("Qopdagi dona, zaxira va narx")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <label className={labelClass}>
                {latinToCyrillic("Qopdagi dona")} <span className="text-rose-500">*</span>
              </label>
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
                className={dropdownClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>
                {latinToCyrillic("Joriy zaxira")}
              </label>
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
                className={dropdownClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>
                {latinToCyrillic("Narxi (USD)")} <span className="text-rose-500">*</span>
              </label>
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
                className="h-12 bg-emerald-50 border border-emerald-200 rounded-xl font-semibold text-sm text-emerald-700 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Card: Stok limitlari */}
        <div className="rounded-2xl bg-white border border-slate-200/70 p-6">
          <div className="flex items-start gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <Warehouse className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 tracking-tight">{latinToCyrillic("Stok limitlari")}</h3>
              <p className="text-sm text-slate-400 mt-0.5">{latinToCyrillic("Minimal, optimal va maksimal nazorat")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <label htmlFor="minStockLimit" className={labelClass}>
                {latinToCyrillic("Minimal limit")}
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="minStockLimit"
                name="minStockLimit"
                value={formData.minStockLimit}
                onChange={handleInputChange}
                className={inputBase}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="optimalStock" className={labelClass}>
                {latinToCyrillic("Optimal limit")}
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="optimalStock"
                name="optimalStock"
                value={formData.optimalStock}
                onChange={handleInputChange}
                className={inputBase}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="maxCapacity" className={labelClass}>
                {latinToCyrillic("Maksimal sig'im")}
              </label>
              <input
                id="maxCapacity"
                type="text"
                inputMode="decimal"
                name="maxCapacity"
                value={formData.maxCapacity}
                onChange={handleInputChange}
                className={inputBase}
              />
            </div>
          </div>

          <label className="mt-5 flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 w-full sm:w-fit cursor-pointer">
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <span className="w-14 h-7 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 peer-focus:ring-4 peer-focus:ring-indigo-500/20 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </span>
            <span className="text-sm font-semibold text-slate-900">{latinToCyrillic("Mahsulot faol")}</span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(isCashier ? '/cashier/products' : '/products')}
            className="sm:flex-1 rounded-xl border border-slate-200 bg-white py-3 text-base font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors active:scale-[0.98]"
          >
            {latinToCyrillic("Bekor qilish")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="sm:flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-base font-semibold transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEditing ? latinToCyrillic("Yangilanmoqda...") : latinToCyrillic("Saqlanmoqda...")}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? latinToCyrillic("Mahsulotni yangilash") : latinToCyrillic("Mahsulotni saqlash")}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Yangi tur qo'shish modal */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {latinToCyrillic("Yangi mahsulot turi")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddTypeModal(false);
                  setNewTypeName('');
                }}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-95"
                aria-label={latinToCyrillic("Yopish")}
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  {latinToCyrillic("Tur nomi")}
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder={latinToCyrillic("Masalan: ETIKETKA")}
                  className={inputBase}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setNewTypeName('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors active:scale-[0.98]"
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
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors active:scale-[0.98]"
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
