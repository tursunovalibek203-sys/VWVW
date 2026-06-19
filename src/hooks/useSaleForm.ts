import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { prepareSaleReceipt, type ReceiptData } from '../lib/receiptPrinter';

export interface UseSaleFormOptions {
  editSale?: any;
  orderData?: any;
}  
// Preform qo'shilganda avtomatik qo'shiladigan krishka/ruchkalarni qaytaradi
function getKomplektAdditions(
  product: Product,
  quantity: number,
  allProducts: Product[],
  currency: string,
  exchangeRate: number
): SaleItemForm[] {
  const warehouse = (product.warehouse || '').toLowerCase();
  if (warehouse !== 'kapsula' && warehouse !== 'preform') return [];

  const name = (product.name || '').toLowerCase();
  const gramMatch = name.match(/(\d+)\s*(?:гр|г|gr|g)/i);
  if (!gramMatch) return [];
  const gram = parseInt(gramMatch[1]);

  let toAdd: { size: number; type: 'krishka' | 'ruchka' }[] = [];
  if ([52, 70].includes(gram)) {
    toAdd = [{ size: 38, type: 'krishka' }, { size: 38, type: 'ruchka' }];
  } else if ([75, 80, 85, 86, 135].includes(gram)) {
    toAdd = [{ size: 48, type: 'krishka' }, { size: 48, type: 'ruchka' }];
  }
  // 15гр, 21гр, 26гр, 30гр, 36gr va boshqalar: avtomatik qo'shilmaydi

  // Preform qancha dona beradi
  const preformUnitsPerBag = product.unitsPerBag || 1;
  const totalUnits = quantity * preformUnitsPerBag;

  const result: SaleItemForm[] = [];
  for (const rule of toAdd) {
    const match = allProducts.find((p) => {
      const pName = (p.name || '').toLowerCase();
      const pWH = (p.warehouse || '').toLowerCase();
      return pWH === rule.type && pName.includes(String(rule.size));
    });
    if (match) {
      const upb = match.unitsPerBag || 1;
      const rawPpb = parseFloat(match.pricePerBag?.toString() || '0') || 0;
      const ppb = currency === 'UZS' ? Math.round(rawPpb * exchangeRate) : rawPpb;
      // Aniq kasr qiymat: 4500 preform / 2000 krishka-per-bag = 2.25 qop
      const kQty = Math.round((totalUnits / upb) * 10000) / 10000;
      result.push({
        productId: match.id,
        productName: match.name,
        quantity: kQty.toString(),
        bagDisplayValue: kQty.toString(),
        pricePerBag: ppb,
        pricePerPiece: ppb / upb,
        unitsPerBag: upb,
        subtotal: kQty * ppb,
        warehouse: match.warehouse || rule.type,
        saleType: 'bag',
      });
    }
  }
  return result;
}

export const useSaleForm = (options: UseSaleFormOptions = {}) => {
  const { editSale, orderData: initialOrderData } = options;
  const isEditMode = !!editSale;

  // Form state
  const [form, setForm] = useState<SaleFormData>({
    customerId: editSale?.customerId || '',
    customerName: editSale?.customerName || '',
    items: editSale?.items || [],
    paidUZS: editSale?.paidUZS || '',
    paidUSD: editSale?.paidUSD || '',
    paidKARTA: editSale?.paidKARTA || '',
    paymentType: editSale?.paymentType || 'cash',
    currency: editSale?.currency || 'UZS',
    isKocha: editSale?.isKocha || false,
    manualCustomerName: '',
    manualCustomerPhone: '',
    driverId: '',
    driverCollectsAll: true,
    driverCollectsAmount: '',
    deliveryFee: '',
    deliveryFeePaidBy: 'COMPANY' as const,
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

  // Ref so the currency-change effect always reads the latest rate without being triggered by rate changes
  const exchangeRateRef = useRef(exchangeRateNum);
  useEffect(() => { exchangeRateRef.current = exchangeRateNum; }, [exchangeRateNum]);
  // Track previous currency to skip the initial mount run
  const prevCurrencyRef = useRef(form.currency);

  const totalAmount = useMemo(() => calculateTotal(form.items), [form.items]);

  const paidAmount = useMemo(() =>
    calculatePaidAmount(form.paidUZS, form.paidUSD, exchangeRateNum, form.currency, form.paidKARTA),
    [form.paidUZS, form.paidUSD, form.paidKARTA, exchangeRateNum, form.currency]
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

  // Convert item prices when the user toggles currency (UZS ↔ USD).
  // Uses a ref for the exchange rate so a rate change alone does NOT re-trigger conversion.
  // prevCurrencyRef guards against the initial mount run.
  useEffect(() => {
    if (prevCurrencyRef.current === form.currency) return;
    prevCurrencyRef.current = form.currency;

    const rate = exchangeRateRef.current;
    if (rate <= 0) return;

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        const newPricePerBag = form.currency === 'UZS'
          ? Math.round(item.pricePerBag * rate)
          : Math.round((item.pricePerBag / rate) * 100) / 100;
        const qty = typeof item.quantity === 'number'
          ? item.quantity
          : parseFloat(item.quantity as string || '0');
        return {
          ...item,
          pricePerBag: newPricePerBag,
          pricePerPiece: newPricePerBag / item.unitsPerBag,
          subtotal: qty * newPricePerBag,
        };
      }),
    }));
  }, [form.currency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Form actions
  const updateFormField = useCallback(<K extends keyof SaleFormData>(field: K, value: SaleFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateNewItemField = useCallback(<K extends keyof NewItemForm>(field: K, value: NewItemForm[K]) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  }, []);

  const selectProduct = useCallback((product: Product, _allProducts: Product[], selectedCustomer: Customer | undefined, customerPrices: Record<string, string>) => {
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

    // Narxni hisoblash — basePrice USD da saqlangan, joriy valyutaga aylantirish
    const displayPrice = form.currency === 'UZS'
      ? Math.round(basePrice * exchangeRateRef.current)
      : basePrice;

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

  // Mahsulotni bir bosishda tanlash VA savatga qo'shish — selectProduct + addItem
  // orasidagi React state round-trip (stale newItem) muammosini oldini olish uchun
  // hisob-kitob to'liq sinxron, mahalliy o'zgaruvchilarda bajariladi.
  const selectAndAddProduct = useCallback((
    product: Product,
    selectedCustomer: Customer | undefined,
    customerPrices: Record<string, string>
  ) => {
    let basePrice = parseFloat(product.pricePerBag?.toString() || '0') || 0;

    const customerPrice = selectedCustomer && customerPrices[product.id];
    if (customerPrice) {
      basePrice = parseFloat(customerPrice) || 0;
    } else if (selectedCustomer?.pricePerBag) {
      basePrice = parseFloat(selectedCustomer.pricePerBag.toString()) || 0;
    }

    const productPrice = product.pricePerBag;
    if (productPrice) {
      basePrice = parseFloat(productPrice.toString()) || basePrice;
    }

    const defaultUnits = getDefaultUnitsPerBag(product.name);
    const unitsPerBag = product.unitsPerBag || defaultUnits || 2000;

    const rate = exchangeRateRef.current;
    const pricePerBag = form.currency === 'UZS' ? Math.round(basePrice * rate) : basePrice;
    const quantity = 1;
    const pricePerPiece = pricePerBag / unitsPerBag;
    const subtotal = quantity * pricePerBag;

    const komplektItems = getKomplektAdditions(product, quantity, products, form.currency, rate);

    // Komplekt bo'lsa — barcha mahsulotlarga bir xil groupId beramiz
    const groupId = komplektItems.length > 0
      ? `kg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      : undefined;

    setForm((prev) => {
      const items = [...prev.items];

      const existingIndex = items.findIndex((item) => item.productId === product.id && !item.komplektGroupId);
      if (existingIndex >= 0 && !groupId) {
        // Komplektsiz mahsulot: sonini oshir
        const existing = items[existingIndex];
        const newQty = (typeof existing.quantity === 'number' ? existing.quantity : parseFloat(existing.quantity || '0')) + quantity;
        items[existingIndex] = {
          ...existing,
          quantity: newQty.toString(),
          bagDisplayValue: newQty.toString(),
          pricePerBag,
          pricePerPiece,
          subtotal: newQty * pricePerBag,
        };
      } else {
        // Yangi card (komplektli yoki komplektsiz yangi qator)
        items.push({
          productId: product.id,
          productName: product.name,
          quantity: quantity.toString(),
          bagDisplayValue: quantity.toString(),
          pricePerBag,
          pricePerPiece,
          unitsPerBag,
          subtotal,
          warehouse: product.warehouse || 'other',
          saleType: 'bag',
          komplektGroupId: groupId,
          isKomplektMain: !!groupId,
        });
      }

      for (const kItem of komplektItems) {
        items.push({
          ...kItem,
          komplektGroupId: groupId,
          isKomplektMain: false,
        });
      }

      return { ...prev, items };
    });
  }, [products, form.currency, getDefaultUnitsPerBag]);

  const addItem = useCallback(async () => {
    if (!newItem.productId || !newItem.quantity) return;

    const product = products.find((p) => p.id === newItem.productId);
    if (!product) return;

    const quantity = parseFloat(newItem.quantity) || 0;
    if (quantity <= 0) return;

    const pricePerBag = parseFloat(newItem.pricePerBag || '0') || product.pricePerBag || 0;
    const unitsPerBag = parseFloat(newItem.unitsPerBag || '0') || product.unitsPerBag || 2000;
    const pricePerPiece = pricePerBag / unitsPerBag;
    const isPieceSale = newItem.saleType === 'piece';
    const subtotal = isPieceSale ? quantity * pricePerPiece : quantity * pricePerBag;

    const komplektItems = getKomplektAdditions(product, quantity, products, form.currency, exchangeRateRef.current);

    setForm((prev) => {
      const items = [...prev.items];

      // Asosiy mahsulot
      const existingIndex = items.findIndex((item) => item.productId === newItem.productId);
      if (existingIndex >= 0) {
        const existing = items[existingIndex];
        const newQty = (typeof existing.quantity === 'number' ? existing.quantity : parseFloat(existing.quantity || '0')) + quantity;
        items[existingIndex] = {
          ...existing,
          quantity: newQty.toString(),
          bagDisplayValue: newQty.toString(),
          pricePerBag,
          pricePerPiece,
          subtotal: newQty * pricePerBag,
        };
      } else {
        items.push({
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
        });
      }

      // Komplekt: krishka va ruchka avtomatik
      for (const kItem of komplektItems) {
        const kIdx = items.findIndex((i) => i.productId === kItem.productId);
        if (kIdx >= 0) {
          const existing = items[kIdx];
          const kQty = parseFloat(kItem.quantity?.toString() || '0');
          const newQty = (typeof existing.quantity === 'number' ? existing.quantity : parseFloat(existing.quantity || '0')) + kQty;
          items[kIdx] = {
            ...existing,
            quantity: newQty.toString(),
            bagDisplayValue: newQty.toString(),
            subtotal: newQty * existing.pricePerBag,
          };
        } else {
          items.push(kItem);
        }
      }

      return { ...prev, items };
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
  }, [newItem, products]);

  const updateItem = useCallback((index: number, updates: Partial<SaleItemForm>) => {
    setForm((prev) => {
      const newItems = prev.items.map((item, i) => (i === index ? { ...item, ...updates } : item));
      return { ...prev, items: newItems };
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setForm((prev) => {
      const target = prev.items[index];
      if (target?.komplektGroupId) {
        // Komplekt guruhidagi barcha mahsulotlarni birga o'chirish
        return { ...prev, items: prev.items.filter((item) => item.komplektGroupId !== target.komplektGroupId) };
      }
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
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
      paidKARTA: '',
      paymentType: 'cash',
      currency: form.currency,
      isKocha: false,
      manualCustomerName: '',
      manualCustomerPhone: '',
      driverId: '',
      driverCollectsAll: true,
      driverCollectsAmount: '',
      deliveryFee: '',
      deliveryFeePaidBy: 'COMPANY' as const,
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

  const submitSale = useCallback(async (): Promise<ReceiptData> => {
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
          karta: parseFloat(form.paidKARTA || '0'),
        },
        paymentMethod: form.paymentType?.toUpperCase() || 'CASH',
        currency: form.currency,
        isKocha: form.isKocha,
        driverId: form.driverId || undefined,
        driverCollectedAmount: form.driverId && form.driverCollectsAll
          ? (form.driverCollectsAmount?.trim() && parseFloat(form.driverCollectsAmount) > 0
              ? parseFloat(form.driverCollectsAmount)
              : totalAmount)
          : 0,
        deliveryFee: parseFloat(form.deliveryFee || '0'),
        deliveryFeePaidBy: form.deliveryFeePaidBy || 'COMPANY',
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        debtAmount: debtAmount,
        exchangeRate: exchangeRateNum,
        createdAt: new Date(),
        status: debtAmount > 0 ? 'partial' : 'completed',
      };

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

      // Chek ma'lumotlarini tayyorlash
      const saleResult = extractData<any>(response, null);
      const customerData = selectedCustomer || {
        name: form.manualCustomerName || "Ko'chaga",
        phone: form.manualCustomerPhone,
      };
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
        { name: 'Kassir' },
        undefined,
        exchangeRateNum
      );

      // Mahsulotlarni qayta yuklash (yangi stock bilan)
      try {
        const refreshResponse = await api.get('/products');
        const productsData = extractArray<Product>(refreshResponse, []);
        if (productsData.length > 0) {
          setProducts(productsData);
        }
      } catch {
        // silent — non-critical
      }

      return receiptData;
    } catch (error) {
      errorHandler.handleError(error, { action: 'saveSale' });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, totalAmount, paidAmount, debtAmount, exchangeRateNum]);

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
    selectAndAddProduct,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    resetForm,
    submitSale,
  };
};

export default useSaleForm;
