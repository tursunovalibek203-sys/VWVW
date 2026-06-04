import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SaleFormData, NewItemForm, SaleItemForm, Product, Customer } from '../types';
import {
  DEFAULT_EXCHANGE_RATE,
  getDefaultUnitsPerBag,
  calculateTotal,
  calculatePaidAmount,
  calculateDebt,
  validateSaleForm,
} from '../lib/saleUtils';
import api from '../lib/professionalApi';
import { errorHandler } from '../lib/professionalErrorHandler';
import { extractData, extractArray } from '../lib/apiHelpers';
import { printReceipt, prepareSaleReceipt } from '../lib/receiptPrinter';

export interface UseSaleFormOptions {
  editSale?: any;
  orderData?: any;
}  
export const useSaleForm = (options: UseSaleFormOptions = {}) => {
  const navigate = useNavigate();
  const { editSale, orderData: initialOrderData } = options;
  const isEditMode = !!editSale;

  // Form state
  const [form, setForm] = useState<SaleFormData>({
    customerId: editSale?.customerId || '',
    customerName: editSale?.customerName || '',
    items: editSale?.items || [],
    paidUZS: editSale?.paidUZS || '',
    paidUSD: editSale?.paidUSD || '',
    paidCLICK: editSale?.paidCLICK || '',
    paymentType: editSale?.paymentType || 'cash',
    currency: editSale?.currency || 'USD',
    isKocha: editSale?.isKocha || false,
    manualCustomerName: '',
    manualCustomerPhone: '',
  });

  // New item form state
  const [newItem, setNewItem] = useState<NewItemForm>({
    productId: '',
    productName: '',
    quantity: '',
    pricePerBag: '',
    priceDisplayValue: '',
    unitsPerBag: '',
    saleType: 'bag',
  });

  // UI state
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'preform' | 'krishka' | 'ruchka' | 'other'>('all');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['15gr', '21gr']);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPrices, setCustomerPrices] = useState<Record<string, string>>({});

  // Derived values
  const selectedCustomer = useMemo(() => 
    customers.find((c) => c.id === form.customerId),
    [customers, form.customerId]
  );

  const exchangeRateNum = useMemo(() => parseFloat(exchangeRate) || DEFAULT_EXCHANGE_RATE, [exchangeRate]);

  const totalAmount = useMemo(() => calculateTotal(form.items), [form.items]);

  const paidAmount = useMemo(() => 
    calculatePaidAmount(form.paidUZS, form.paidUSD, form.paidCLICK, exchangeRateNum, form.currency),
    [form.paidUZS, form.paidUSD, form.paidCLICK, exchangeRateNum, form.currency]
  );

  const debtAmount = useMemo(() => calculateDebt(totalAmount, paidAmount), [totalAmount, paidAmount]);

  // Load customer prices when customer changes
  useEffect(() => {
    if (selectedCustomer?.productPrices) {
      try {
        const prices = JSON.parse(selectedCustomer.productPrices);
        setCustomerPrices(prices);
      } catch {
        setCustomerPrices({});
      }
    } else {
      setCustomerPrices({});
    }
  }, [selectedCustomer]);

  // Load order data if available
  useEffect(() => {
    if (initialOrderData && products.length > 0) {
      // Set customer
      if (initialOrderData.customer) {
        setForm((prev) => ({
          ...prev,
          customerId: initialOrderData.customer.id,
          customerName: initialOrderData.customer.name,
          isKocha: false,
        }));
      }

      // Set items
      if (initialOrderData.items?.length > 0) {
        const saleItems: SaleItemForm[] = initialOrderData.items.map((item: any) => {
          const product = products.find((p) => p.id === item.productId);
          const pricePerBag = parseFloat(item.price) || 0;
          const quantity = parseFloat(item.quantityBags) || 0;
          const unitsPerBag = product?.unitsPerBag || 2000;

          return {
            productId: item.productId,
            productName: item.productName || product?.name || 'Nomalum',
            quantity: quantity,
            bagDisplayValue: quantity.toString(),
            pricePerBag: pricePerBag,
            pricePerPiece: pricePerBag / unitsPerBag,
            unitsPerBag: unitsPerBag,
            subtotal: quantity * pricePerBag,
            warehouse: product?.warehouse,
            subType: product?.subType,
            saleType: 'bag',
          };
        });

        setForm((prev) => ({ ...prev, items: saleItems }));
      }
    }
  }, [initialOrderData, products]);

  // Update prices when currency changes only (not exchange rate)
  // Note: This approach has floating point precision issues. Better to store base price in USD always.
  useEffect(() => {
    if (exchangeRateNum <= 0) return; // Prevent division by zero
    
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        // Round to avoid floating point issues
        const newPricePerBag = form.currency === 'UZS'
          ? Math.round(item.pricePerBag * exchangeRateNum)
          : Math.round((item.pricePerBag / exchangeRateNum) * 100) / 100;
        const newSubtotal = typeof item.quantity === 'number'
          ? item.quantity * newPricePerBag
          : parseFloat(item.quantity as string || '0') * newPricePerBag;

        return {
          ...item,
          pricePerBag: newPricePerBag,
          pricePerPiece: newPricePerBag / item.unitsPerBag,
          subtotal: newSubtotal,
        };
      }),
    }));
  }, [form.currency, exchangeRateNum]);

  // Form actions
  const updateFormField = useCallback(<K extends keyof SaleFormData>(field: K, value: SaleFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateNewItemField = useCallback(<K extends keyof NewItemForm>(field: K, value: NewItemForm[K]) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  }, []);

  const selectProduct = useCallback((product: Product, _allProducts: Product[], selectedCustomer: Customer | undefined, customerPrices: Record<string, string>) => {
    // Stock tekshiruvi - mahalliy ma'lumotlardan (API chaqiruvini olib tashladik - tezlashtirish)
    const currentStock = product.currentStock || 0;
    if (currentStock <= 0) {
      alert(`⚠️ ${product.name} - omborda yetarli mahsulot yo'q! (Qoldiq: ${currentStock})`);
    }
    
    let updatedProduct = product;

    let basePrice = parseFloat(updatedProduct.pricePerBag?.toString() || '0') || 0;

    // Check for customer specific price
    const customerPrice = selectedCustomer && customerPrices[updatedProduct.id];
    if (customerPrice) {
      basePrice = parseFloat(customerPrice) || 0;
    } else if (selectedCustomer?.pricePerBag) {
      basePrice = parseFloat(selectedCustomer.pricePerBag.toString()) || 0;
    }

    // Mahsulot narxi (sozlamalardan yangilangan)
    const productPrice = updatedProduct.pricePerBag;
    if (productPrice) {
      basePrice = parseFloat(productPrice.toString()) || basePrice;
    }

    // Default unitsPerBag - agar mahsulotda yo'q bo'lsa
    const defaultUnits = getDefaultUnitsPerBag(updatedProduct.name);
    const unitsPerBag = updatedProduct.unitsPerBag || defaultUnits || 2000;

    // Narxni hisoblash - basePrice dan (sozlamalardan olingan)
    const displayPrice = basePrice;

    setNewItem({
      productId: updatedProduct.id,
      productName: updatedProduct.name,
      quantity: '1',
      pricePerBag: displayPrice.toString(),
      priceDisplayValue: displayPrice.toString(),
      unitsPerBag: unitsPerBag.toString(),
      saleType: 'bag',
      // Stock ma'lumotlarini saqlash
      maxQuantity: updatedProduct.currentStock || 0,
      product: updatedProduct, // To'liq mahsulot ma'lumotlari
    });
  }, [products, getDefaultUnitsPerBag]);

  const addItem = useCallback(async () => {
    if (!newItem.productId || !newItem.quantity) return;

    const product = products.find((p) => p.id === newItem.productId);
    if (!product) return;

    const quantity = parseFloat(newItem.quantity) || 0;
    if (quantity <= 0) return;

    // Stock tekshiruvi
    const availableStock = product.currentStock || 0;
    // Savatdagi mavjud miqdorni hisobga olish
    const existingItem = form.items.find(item => item.productId === newItem.productId);
    const existingQuantity = existingItem ? (typeof existingItem.quantity === 'number' ? existingItem.quantity : parseFloat(existingItem.quantity || '0')) : 0;
    const totalRequested = quantity + existingQuantity;

    if (totalRequested > availableStock) {
      alert(`⚠️ ${product.name} uchun yetarli mahsulot yo'q!\nMavjud: ${availableStock} qop\nSo'ralgan: ${totalRequested} qop`);
      return;
    }

    const existingIndex = form.items.findIndex((item) => item.productId === newItem.productId);

    const pricePerBag = parseFloat(newItem.pricePerBag || '0') || product.pricePerBag || 0;
    const unitsPerBag = parseFloat(newItem.unitsPerBag || '0') || product.unitsPerBag || 2000;
    const pricePerPiece = pricePerBag / unitsPerBag;
    const isPieceSale = newItem.saleType === 'piece';
    const subtotal = isPieceSale ? quantity * pricePerPiece : quantity * pricePerBag;

    if (existingIndex >= 0) {
      const existingItem = form.items[existingIndex];
      const newQuantity = (typeof existingItem.quantity === 'number' ? existingItem.quantity : parseFloat(existingItem.quantity || '0')) + quantity;

      const updatedItems = [...form.items];
      updatedItems[existingIndex] = {
        ...existingItem,
        quantity: newQuantity.toString(),
        bagDisplayValue: newQuantity.toString(),
        pricePerBag,
        pricePerPiece,
        subtotal: newQuantity * pricePerBag,
      };
      setForm((prev) => ({ ...prev, items: updatedItems }));
    } else {
      setForm((prev) => ({
        ...prev,
        items: [...prev.items, {
          productId: newItem.productId,
          productName: product.name,
          quantity: newItem.quantity,
          bagDisplayValue: newItem.quantity,
          pricePerBag,
          pricePerPiece,
          unitsPerBag,
          subtotal,
          warehouse: product.warehouse || 'other',
          saleType: newItem.saleType,
        }],
      }));
    }

    // Reset new item
    setNewItem({
      productId: '',
      productName: '',
      quantity: '',
      pricePerBag: '',
      priceDisplayValue: '',
      unitsPerBag: '',
      saleType: 'bag',
    });
  }, [newItem, products, form.items]);

  const updateItem = useCallback((index: number, updates: Partial<SaleItemForm>) => {
    setForm((prev) => {
      const newItems = prev.items.map((item, i) => (i === index ? { ...item, ...updates } : item));
      return { ...prev, items: newItems };
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const clearItems = useCallback(() => {
    setForm((prev) => ({ ...prev, items: [] }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      customerId: '',
      customerName: '',
      items: [],
      paidUZS: '',
      paidUSD: '',
      paidCLICK: '',
      paymentType: 'cash',
      currency: form.currency,
      isKocha: false,
      manualCustomerName: '',
      manualCustomerPhone: '',
    });
    setNewItem({
      productId: '',
      productName: '',
      quantity: '',
      pricePerBag: '',
      priceDisplayValue: '',
      unitsPerBag: '',
      saleType: 'bag',
    });
  }, [form.currency]);

  const submitSale = useCallback(async () => {
    const validationError = validateSaleForm(form.items, form.customerId, form.manualCustomerName, form.isKocha);
    if (validationError) {
      alert('Xatolik: ' + validationError);
      throw new Error(validationError);
    }

    setIsSubmitting(true);

    try {
      const saleData = {
        customerId: form.customerId || null,
        customerName: form.customerName || form.manualCustomerName,
        customerPhone: form.manualCustomerPhone,
        items: form.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity || '0'),
          pricePerBag: item.pricePerBag,
          pricePerPiece: item.pricePerPiece,
          unitsPerBag: item.unitsPerBag,
          subtotal: item.subtotal,
          warehouse: item.warehouse,
          saleType: item.saleType,
        })),
        paymentDetails: {
          uzs: parseFloat(form.paidUZS || '0'),
          usd: parseFloat(form.paidUSD || '0'),
          click: parseFloat(form.paidCLICK || '0'),
        },
        paymentMethod: form.paymentType?.toUpperCase() || 'CASH', // ✅ Backend nomiga mos
        currency: form.currency,
        isKocha: form.isKocha,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        debtAmount: debtAmount,
        exchangeRate: exchangeRateNum,
        createdAt: new Date(),
        status: debtAmount > 0 ? 'partial' : 'completed',
      };

      console.log('📤 Sending sale data:', JSON.stringify(saleData, null, 2));
      const response = await api.post('/sales', saleData);

      // Note: Stock update and customer balance/debt updates are handled server-side 
      // in the POST /sales endpoint to prevent race conditions

      // Create customer if manual
      if (form.manualCustomerName && form.manualCustomerPhone) {
        await api.post('/customers', {
          name: form.manualCustomerName,
          phone: form.manualCustomerPhone,
          createdAt: new Date(),
        });
      }

      // 🖨️ CHEK CHIQARISH
      try {
        // ✅ Extract data from standardized API response
        const saleResult = extractData<any>(response, null);
        const customerData = selectedCustomer || {
          name: form.manualCustomerName || "Ko'chaga",
          phone: form.manualCustomerPhone,
        };

        // Chek ma'lumotlarini tayyorlash va chiqarish
        const receiptData = prepareSaleReceipt(
          {
            ...saleResult,
            items: saleData.items,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            debtAmount: debtAmount,
            currency: form.currency,
            paymentDetails: saleData.paymentDetails,
            isKocha: form.isKocha,
            manualCustomerName: form.manualCustomerName,
            manualCustomerPhone: form.manualCustomerPhone,
          },
          customerData,
          { name: 'Kassir' }, // Hozircha kassir nomi sifatida
          undefined, // driver
          exchangeRateNum
        );

        console.log('🖨️ Chek chiqarilmoqda...', receiptData);
        printReceipt(receiptData);
      } catch (printError) {
        console.error('❌ Chek chiqarishda xatolik:', printError);
        // Chek chiqarish xatosi sotuvni to'xtatmasin
      }

      // Mahsulotlarni qayta yuklash (yangi stock bilan)
      try {
        const refreshResponse = await api.get('/products');
        // ✅ Handle standardized API response format
        const productsData = extractArray<Product>(refreshResponse, []);
        console.log('🔄 Products refresh data:', productsData);
        if (productsData.length > 0) {
          setProducts(productsData);
        } else {
          console.warn('⚠️ Products refresh returned empty data');
        }
      } catch (refreshError) {
        console.error('❌ Products refresh failed:', refreshError);
      }

      alert('✅ Sotuv muvaffaqiyatli saqlandi! Chek chiqarildi.');
      // Backend'da ma'lumot saqlanishini kutish (1 soniya)
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Navigate based on current route context
      const isCashierRoute = window.location.pathname.startsWith('/cashier');
      navigate(isCashierRoute ? '/cashier/sales' : '/sales');
    } catch (error) {
      errorHandler.handleError(error, { action: 'saveSale' });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, totalAmount, paidAmount, debtAmount, exchangeRateNum, navigate]);

  return {
    // State
    form,
    newItem,
    exchangeRate,
    isSubmitting,
    isEditMode,
    customerSearch,
    productSearch,
    activeCategory,
    expandedGroups,
    products,
    customers,
    selectedCustomer,
    customerPrices,

    // Derived values
    exchangeRateNum,
    totalAmount,
    paidAmount,
    debtAmount,

    // Setters
    setProducts,
    setCustomers,
    setExchangeRate,
    setCustomerSearch,
    setProductSearch,
    setActiveCategory,
    setExpandedGroups,

    // Actions
    updateFormField,
    updateNewItemField,
    selectProduct,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    resetForm,
    submitSale,
  };
};

export default useSaleForm;
