import React, { useEffect, useRef, useState } from 'react';
import CustomerSelector from '../components/CustomerSelector';
import ProductSelector from '../components/ProductSelector';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast, toast as toastFactory } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import api from '../lib/professionalApi';
import { formatDate } from '../lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { latinToCyrillic } from '../lib/transliterator';
import {
  Package,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  DollarSign,
  AlertTriangle,
  Clock,
  Activity,
  Bot,
  X,
  AlertCircle,
  FileText,
  Factory,
  Truck,
  Banknote,
  Landmark,
  Smartphone,
  RefreshCw,
  Eye,
  Filter,
  Hash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { exportToExcel } from '../lib/excelUtils';
import { cn } from '../lib/utils';

import type { Order, Customer, Product } from '../types';

const L = latinToCyrillic;

export default function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const loadedRef = useRef(false); // prevents React 18 StrictMode double-invocation
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Confirm dialog (replaces window.confirm / inline cancel)
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Original filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // To'lov formasi
  const [paymentForm, setPaymentForm] = useState({
    uzs: 0,
    usd: 0,
    click: 0,
    dueDate: '',
  });

  // Exchange rates for payment calculation
  const [exchangeRates, setExchangeRates] = useState({ USD_TO_UZS: 12500 });
  const [totalPaymentUSD, setTotalPaymentUSD] = useState(0);

  // Load exchange rates
  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        // Mock exchange rates - in real app, get from API
        setExchangeRates({ USD_TO_UZS: 12500 });
      } catch (error) {
        console.error('Exchange rates load error:', error);
      }
    };
    loadExchangeRates();
  }, []);

  // Calculate total payment in USD when payment form changes
  useEffect(() => {
    const total =
      paymentForm.uzs / exchangeRates.USD_TO_UZS +
      paymentForm.usd +
      paymentForm.click / exchangeRates.USD_TO_UZS;
    setTotalPaymentUSD(total);
  }, [paymentForm, exchangeRates]);

  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    items: [] as Array<{
      productId: string;
      productName: string;
      quantityBags: number;
      unitsPerBag: number;
      quantityUnits: number;
      priceType: 'BAG' | 'UNIT';
      price: number;
    }>,
    priority: 'NORMAL',
    requestedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ertaga
    notes: '',
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    customerId?: string;
    items?: string[];
    requestedDate?: string;
  }>({});

  // Inventory check state
  const [inventoryCheck, setInventoryCheck] = useState<any[]>([]);
  const [showInventoryWarning, setShowInventoryWarning] = useState(false);

  // Qidiruv
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearches, setProductSearches] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/customers'),
        api.get('/products'),
      ]);

      setOrders(ordersRes.data);
      // Handle new API response format
      setCustomers(customersRes.data?.data || customersRes.data || []);
      setProducts(productsRes.data?.data || productsRes.data || []);
    } catch (error) {
      console.error("Ma'lumotlarni yuklashda xatolik:", error);
      addToast(toastFactory.error(L('Xatolik'), L("Ma'lumotlarni yuklashda xatolik yuz berdi")));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExport = () => {
    const dataToExport = filteredOrders.map((o) => ({
      'Buyurtma #': o.orderNumber,
      Mijoz: o.customer?.name || "Noma'lum",
      Mahsulotlar: o.items?.map((i: any) => `${i.productName} (${i.quantityBags} qop)`).join(', '),
      'Jami summa': o.totalAmount,
      Sana: formatDate(o.createdAt),
      Status: statusConfig[o.status as keyof typeof statusConfig]?.label || o.status,
      Prioritet: priorityConfig[o.priority as keyof typeof priorityConfig]?.label || o.priority,
    }));
    exportToExcel(dataToExport, { fileName: 'Buyurtmalar', sheetName: 'Buyurtmalar' });
  };

  // Ishlab chiqarish buyurtmasi yaratish
  const createProductionOrder = async (productId: string, quantity: number) => {
    try {
      const response = await api.post('/production/orders', {
        productId,
        quantity,
        priority: 'HIGH',
        notes: 'Buyurtmalar uchun avtomatik yaratildi',
      });

      addToast(
        toastFactory.success(
          L('Ishlab chiqarish buyurtmasi yaratildi'),
          `${response.data.productName} - ${quantity} ${L('qop')}`
        )
      );
      loadData();
    } catch (error: any) {
      console.error('Ishlab chiqarish buyurtmasi xatolik:', error);
      addToast(
        toastFactory.error(
          L('Ishlab chiqarish buyurtmasi yaratilmadi'),
          error.response?.data?.error || error.message
        )
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Calculate subtotals and total
      const itemsWithSubtotals = form.items.map((item) => {
        const subtotal =
          item.priceType === 'BAG'
            ? item.quantityBags * item.price
            : item.quantityUnits * item.price;
        return {
          ...item,
          unitPrice: item.price,
          subtotal,
        };
      });

      const totalAmount = itemsWithSubtotals.reduce((sum, item) => sum + item.subtotal, 0);

      const response = await api.post('/orders', {
        ...form,
        items: itemsWithSubtotals,
        totalAmount,
        requestedDate: new Date(form.requestedDate).toISOString(),
      });

      // Show inventory warnings if any
      if (
        response.data.inventoryCheck &&
        response.data.inventoryCheck.some((item: any) => item.needProduction > 0)
      ) {
        const warnings = response.data.inventoryCheck
          .filter((item: any) => item.needProduction > 0)
          .map((item: any) => `${item.productName}: ${item.needProduction} ${L('qop')}`)
          .join(', ');

        addToast(
          toastFactory.warning(
            L('Buyurtma yaratildi'),
            `${L("Omborda yetarli mahsulot yo'q")}: ${warnings}. ${L("Ishlab chiqarish rejasiga qo'shildi")}`
          )
        );
      } else {
        addToast(toastFactory.success(L('Buyurtma muvaffaqiyatli yaratildi')));
      }

      closeForm();
      loadData();
    } catch (error: any) {
      console.error('Buyurtma yaratish xatoligi:', error);

      let errorMessage = "Noma'lum xatolik";

      if (error.response) {
        errorMessage =
          error.response.data?.error ||
          error.response.data?.message ||
          `Server xatolik (${error.response.status})`;
      } else if (error.request) {
        errorMessage = "Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.";
      } else {
        errorMessage = error.message || 'Xatolik yuz berdi';
      }

      addToast(toastFactory.error(L('Buyurtma yaratilmadi'), L(errorMessage)));
    } finally {
      setSubmitting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setForm({
      customerId: '',
      customerName: '',
      items: [],
      priority: 'NORMAL',
      requestedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
    });
    setCustomerSearch('');
    setProductSearches({});
    setFormErrors({});
    setInventoryCheck([]);
    setShowInventoryWarning(false);
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          productId: '',
          productName: '',
          quantityBags: 0,
          unitsPerBag: 0,
          quantityUnits: 0,
          priceType: 'BAG',
          price: 0,
        },
      ],
    });
  };

  const initializeForm = () => {
    setForm({
      customerId: '',
      customerName: '',
      items: [
        {
          productId: '',
          productName: '',
          quantityBags: 0,
          unitsPerBag: 0,
          quantityUnits: 0,
          priceType: 'BAG',
          price: 0,
        },
      ], // Start with one item
      priority: 'NORMAL',
      requestedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
    });
    setFormErrors({});
    setInventoryCheck([]);
    setShowInventoryWarning(false);
    setShowForm(true);
  };

  const removeItem = (index: number) => {
    const newSearches = { ...productSearches };
    delete newSearches[index];
    setProductSearches(newSearches);
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...form.items];
    const item = { ...newItems[index], [field]: value };

    // Auto-calculate logic: Bags * UnitsPerBag = TotalUnits
    if (field === 'quantityBags' || field === 'unitsPerBag') {
      const bags = field === 'quantityBags' ? parseInt(value) || 0 : item.quantityBags || 0;
      const perBag = field === 'unitsPerBag' ? parseInt(value) || 0 : item.unitsPerBag || 0;
      item.quantityUnits = bags * perBag;
    } else if (field === 'quantityUnits') {
      const total = parseInt(value) || 0;
      const perBag = item.unitsPerBag || 0;
      if (perBag > 0) {
        item.quantityBags = Math.floor(total / perBag);
      }
    }

    newItems[index] = item;

    setForm({
      ...form,
      items: newItems,
    });

    // Real-time inventory check
    if ((field === 'productId' || field === 'quantityBags') && value) {
      checkInventory(newItems);
    }
  };

  // Real-time inventory checking
  const checkInventory = async (items: typeof form.items) => {
    const check = [];

    for (const item of items) {
      if (!item.productId) continue;

      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      const inStock = product.currentStock;
      const needed = item.quantityBags || 0;
      const shortage = Math.max(0, needed - inStock);

      check.push({
        productId: product.id,
        productName: product.name,
        ordered: needed,
        inStock: inStock,
        needProduction: shortage,
        status: shortage > 0 ? 'NEED_PRODUCTION' : 'IN_STOCK',
      });
    }

    setInventoryCheck(check);
    setShowInventoryWarning(check.some((item) => item.status === 'NEED_PRODUCTION'));
  };

  // Form validation
  const validateForm = () => {
    const errors: typeof formErrors = {};

    if (!form.customerId) {
      errors.customerId = L('Mijozni tanlang');
    }

    if (!form.requestedDate) {
      errors.requestedDate = L('Sanani tanlang');
    }

    // Check if there are any items
    if (form.items.length === 0) {
      errors.items = [L("Kamida bitta mahsulot qo'shishingiz kerak")];
    } else {
      const itemErrors: string[] = [];
      form.items.forEach((item, index) => {
        if (!item.productId) {
          itemErrors.push(`${L('Mahsulot')} #${index + 1} ${L('ni tanlang')}`);
        }
        if (!item.quantityBags || item.quantityBags <= 0) {
          itemErrors.push(`${L('Mahsulot')} #${index + 1} ${L('uchun miqdorni kiriting')}`);
        }
      });

      if (itemErrors.length > 0) {
        errors.items = itemErrors;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const changeStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      addToast(toastFactory.success(L('Holat yangilandi')));
      loadData();
    } catch (error) {
      console.error('Status change error:', error);
      addToast(toastFactory.error(L('Xatolik'), L('Holatni yangilab bolmadi')));
    }
  };

  // Confirm helper for cancel/destructive actions
  const requestCancel = (orderId: string) => {
    setConfirmState({
      open: true,
      title: L('Buyurtmani bekor qilish'),
      message: L('Buyurtmani bekor qilmoqchimisiz? Bu amalni qaytarib bolmaydi.'),
      onConfirm: () => {
        changeStatus(orderId, 'CANCELLED');
        setShowDetail(false);
      },
    });
  };

  const viewDetails = async (orderId: string) => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setSelectedOrder(data);
      setShowDetail(true);
    } catch (error) {
      addToast(toastFactory.error(L('Xatolik'), L("Ma'lumotlarni yuklashda xatolik")));
    }
  };

  const openPaymentModal = (order: any) => {
    setSelectedOrder(order);
    setPaymentForm({
      uzs: 0,
      usd: order.totalAmount, // Default USD
      click: 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 kun keyin
    });
    setShowPaymentModal(true);
  };

  const handleSellOrder = async () => {
    try {
      if (!selectedOrder) {
        console.warn(' selectedOrder null, savdo amalga oshirilmaydi');
        return;
      }

      // To'g'ridan-to'g'ri sotuv sahifasiga yo'naltirish
      navigate('/cashier/sales/add', {
        state: {
          orderData: selectedOrder,
        },
      });

      setShowPaymentModal(false);
      setShowDetail(false);

      // Print receipt after successful sale
      try {
        const orderData = {
          orderNumber: selectedOrder.orderNumber,
          cashier: 'Admin',
          customer: selectedOrder.customer,
          items: selectedOrder.items,
          totalAmount: selectedOrder.totalAmount,
          paymentType: 'Naqd',
          paidAmount: paymentForm.uzs + paymentForm.usd * 12500 + paymentForm.click,
        };

        const receiptContent = `
        LUX PET PLAST ERP TIZIMI
****************************************
            YUK XATI (CHEK)
****************************************
Sana: ${new Date().toLocaleDateString('uz-UZ')}
Vaqt: ${new Date().toLocaleTimeString('uz-UZ')}
Buyurtma: ${orderData.orderNumber}
Kassir: ${orderData.cashier}
----------------------------------------
MIJOZ MA'LUMOTLARI:
----------------------------------------
Ismi: ${orderData.customer?.name || "Noma'lum"}
Tel: ${orderData.customer?.phone || 'Mavjud emas'}
Manzil: ${orderData.customer?.address || 'Mavjud emas'}
----------------------------------------
${
  orderData.items
    ?.map(
      (item: any) =>
        `${(item.product?.name || item.productName || "Noma'lum")
          .substring(0, 24)
          .padEnd(24)
          .replace(/[^\x00-\x7F]/g, '')} | ${item.quantityBags
          .toString()
          .padStart(3)} qop | ${item.quantityUnits.toString().padStart(3)} dona`
    )
    .join('\n') || 'Mahsulotlar mavjud emas'
}
----------------------------------------
Umumiy summa: ${orderData.totalAmount.toLocaleString()} UZS
To'lov turi: ${orderData.paymentType}
To'langan: ${orderData.paidAmount.toLocaleString()} UZS
Qaytim: ${(orderData.paidAmount - orderData.totalAmount).toLocaleString()} UZS
----------------------------------------
MIJOZ BALANSI:
----------------------------------------
Joriy qarz: ${orderData.customer?.debt || 0} UZS
Oxirgi balans: ${orderData.customer?.balance || 0} UZS
----------------------------------------
     XARIDINGIZ UCHUN RAHMAT!
    Zavod: +998 90 000 00 00
****************************************
ID: SLS-${selectedOrder.id}
`.trim();

        await api.post('/print/receipt', {
          content: receiptContent,
          filename: `sales-receipt-${Date.now()}.txt`,
        });
      } catch (printError) {
        console.error('Chek chop etish xatolik:', printError);
      }

      setShowPaymentModal(false);
      setShowDetail(false);
      loadData();
    } catch (error: any) {
      console.error('Sell order error:', error);
    }
  };

  // Haydovchi bilan to'lovni olish
  const [showDriverPaymentModal, setShowDriverPaymentModal] = useState(false);
  const [driverPaymentForm, setDriverPaymentForm] = useState({
    driverId: '',
    paymentMethod: 'CASH', // CASH, TRANSFER, CLICK
    amount: 0,
    notes: '',
  });
  const [drivers, setDrivers] = useState<any[]>([]);

  // Haydovchilarni yuklash
  const loadDrivers = async () => {
    try {
      const { data } = await api.get('/drivers');
      setDrivers(data);
    } catch (error) {
      console.error('Haydovchilarni yuklashda xatolik:', error);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const openDriverPaymentModal = (order: any) => {
    setSelectedOrder(order);
    setDriverPaymentForm({
      driverId: '',
      paymentMethod: 'CASH',
      amount: order.totalAmount - (order.paidAmount || 0),
      notes: `Buyurtma #${order.orderNumber} to'lovi`,
    });
    setShowDriverPaymentModal(true);
  };

  const handleDriverPayment = async () => {
    try {
      if (!selectedOrder) {
        addToast(toastFactory.error(L('Buyurtma tanlanmagan')));
        return;
      }

      if (!driverPaymentForm.driverId) {
        addToast(toastFactory.warning(L('Haydovchini tanlang')));
        return;
      }

      if (driverPaymentForm.amount <= 0) {
        addToast(toastFactory.warning(L("To'lov summasini kiriting")));
        return;
      }

      const { data } = await api.post(
        `/orders/${selectedOrder.id}/driver-payment`,
        driverPaymentForm
      );

      addToast(toastFactory.success(L("Haydovchi to'lovi qabul qilindi"), data.message));
      setShowDriverPaymentModal(false);
      setShowDetail(false);
      loadData();
    } catch (error: any) {
      addToast(
        toastFactory.error(
          L('Xatolik'),
          error.response?.data?.error || L("Haydovchi to'lovida xatolik")
        )
      );
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && order.priority !== priorityFilter) return false;
      if (
        searchQuery &&
        !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statusConfig = {
    PENDING: { label: L('Kutilmoqda'), icon: Clock, variant: 'warning' as const },
    CONFIRMED: { label: L('Tasdiqlandi'), icon: CheckCircle, variant: 'info' as const },
    IN_PRODUCTION: { label: L('Ishlab chiqarilmoqda'), icon: Package, variant: 'info' as const },
    READY: { label: L('Tayyor'), icon: CheckCircle, variant: 'success' as const },
    READY_FOR_DELIVERY: { label: L('Yetkazishga tayyor'), icon: Truck, variant: 'success' as const },
    DELIVERED: { label: L('Yetkazildi'), icon: CheckCircle, variant: 'success' as const },
    SOLD: { label: L('Sotildi'), icon: DollarSign, variant: 'success' as const },
    CANCELLED: { label: L('Bekor qilindi'), icon: XCircle, variant: 'error' as const },
  };

  const getStatusMeta = (status: string) =>
    statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      icon: Activity,
      variant: 'neutral' as const,
    };

  // Buyurtmalar statistikasi
  const orderStats = {
    total: orders.length,
    confirmed: orders.filter((o) => o.status === 'CONFIRMED').length,
    inProduction: orders.filter((o) => o.status === 'IN_PRODUCTION').length,
    ready: orders.filter((o) => o.status === 'READY').length,
    sold: orders.filter((o) => o.status === 'SOLD').length,
    fromBot: orders.filter((o) => o.orderNumber.startsWith('BOT-')).length,
  };

  // Mahsulotlar bo'yicha statistika
  const productStats: any = {};
  orders.forEach((order) => {
    if (order.status !== 'CANCELLED' && order.status !== 'SOLD') {
      order.items?.forEach((item: any) => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            productName: item.product?.name || "Noma'lum",
            totalOrdered: 0,
            inStock: 0,
            needProduction: 0,
          };
        }
        productStats[item.productId].totalOrdered += item.quantityBags;
      });
    }
  });

  // Ombordagi mahsulotlar bilan solishtirish
  products.forEach((product) => {
    if (productStats[product.id]) {
      productStats[product.id].inStock = product.currentStock;
      productStats[product.id].needProduction = Math.max(
        0,
        productStats[product.id].totalOrdered - product.currentStock
      );
    }
  });

  const priorityConfig = {
    LOW: { label: L('Past'), variant: 'neutral' as const },
    NORMAL: { label: L('Oddiy'), variant: 'info' as const },
    MEDIUM: { label: L("O'rta"), variant: 'info' as const },
    HIGH: { label: L('Yuqori'), variant: 'warning' as const },
    URGENT: { label: L('Shoshilinch'), variant: 'error' as const },
  };

  const getPriorityMeta = (priority?: string) =>
    priorityConfig[priority as keyof typeof priorityConfig] || {
      label: priority || '-',
      variant: 'neutral' as const,
    };

  const hasActiveFilters = statusFilter !== 'ALL' || priorityFilter !== 'ALL' || !!searchQuery;

  // 4 key metrics — most actionable for operations staff
  const stats = [
    { label: L('Jami'), value: orderStats.total, icon: Clock, tint: 'bg-indigo-50 text-indigo-600' },
    { label: L('Tasdiqlandi'), value: orderStats.confirmed, icon: CheckCircle, tint: 'bg-sky-50 text-sky-600' },
    { label: L('Ishlab chiqarish'), value: orderStats.inProduction, icon: Activity, tint: 'bg-violet-50 text-violet-600' },
    { label: L('Tayyor'), value: orderStats.ready, icon: CheckCircle, tint: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('Buyurtmalar')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? L('Yuklanmoqda...')
                : `${filteredOrders.length} ${L('ta buyurtma')}`}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{L('Yangilash')}</span>
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={initializeForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {t('Yangi buyurtma')}
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[116px] animate-pulse" />
              ))
            : stats.map((stat) => {
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
                    <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                  </div>
                );
              })}
        </div>

        {/* Production analysis */}
        {!loading && Object.keys(productStats).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2.5 mb-5">
              <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Package className="w-[18px] h-[18px]" />
              </span>
              {L("Mahsulotlar bo'yicha tahlil")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(productStats).map((stat: any, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-2xl border p-5 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)]',
                    stat.needProduction > 0
                      ? 'border-amber-200/70 bg-amber-50/40'
                      : 'border-slate-200/70 bg-white'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <h4 className="text-sm font-semibold text-slate-900">{stat.productName}</h4>
                    <Badge variant={stat.needProduction > 0 ? 'warning' : 'success'}>
                      {stat.needProduction > 0 ? `-${stat.needProduction} ${L('qop')}` : L('Yetarli')}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{L('Buyurtma')}</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {stat.totalOrdered} {L('qop')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{L('Ombor')}</span>
                      <span className="font-semibold text-emerald-600 tabular-nums">
                        {stat.inStock} {L('qop')}
                      </span>
                    </div>
                  </div>
                  {stat.needProduction > 0 && (
                    <button
                      type="button"
                      onClick={() => createProductionOrder(stat.productId, stat.needProduction)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                    >
                      <Factory className="w-4 h-4" />
                      {L('Ishlab chiqarish buyurtmasi')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters bar */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                id="orders-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={L('Buyurtma raqami yoki mijoz nomi...')}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex gap-3">
              <div className="relative">
                <label htmlFor="orders-status-filter" className="sr-only">
                  Status Filter
                </label>
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="orders-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option value="ALL">{L('Barcha holatlar')}</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label htmlFor="orders-priority-filter" className="sr-only">
                  Priority Filter
                </label>
                <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="orders-priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option value="ALL">{L('Barcha prioritetlar')}</option>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPriorityFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">{L('Tozalash')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70">
            <EmptyState
              icon={Package}
              title={
                hasActiveFilters
                  ? L('Buyurtmalar topilmadi')
                  : L("Hali buyurtmalar yo'q")
              }
              description={
                hasActiveFilters
                  ? L("Qidiruv shartlarini o'zgartirib qayta urinib ko'ring")
                  : L("Birinchi buyurtmani yarating va u shu yerda ko'rinadi")
              }
              action={
                <button
                  onClick={initializeForm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {L('Yangi buyurtma')}
                </button>
              }
            />
          </div>
        )}

        {/* Orders table (desktop) */}
        {!loading && filteredOrders.length > 0 && (
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/60">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Buyurtma')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Mijoz')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Mahsulotlar')}
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Summa')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Sana')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Prioritet')}
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Holat')}
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                      {L('Amallar')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const meta = getStatusMeta(order.status);
                    const priorityMeta = getPriorityMeta(order.priority);
                    return (
                      <tr
                        key={order.id}
                        className="group hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => viewDetails(order.id)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm tabular-nums">
                            <Hash className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900">{order.orderNumber}</span>
                            {order.orderNumber.startsWith('BOT-') && (
                              <Bot className="w-3.5 h-3.5 text-indigo-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(order.customer?.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-900">
                              {order.customer?.name || L("Noma'lum")}
                              {order.customer?.category === 'VIP' && (
                                <span className="ml-1.5 text-amber-500" title="VIP">
                                  &#9733;
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="info">{order.items?.length || 0}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">
                            ${order.totalAmount?.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 tabular-nums">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {order.requestedDate ? formatDate(order.requestedDate) : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={priorityMeta.variant}>{priorityMeta.label}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewDetails(order.id);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              aria-label={L("Buyurtmani ko'rish")}
                              title={L("Ko'rish")}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {order.status !== 'CANCELLED' && order.status !== 'SOLD' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestCancel(order.id);
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                aria-label={L('Bekor qilish')}
                                title={L('Bekor qilish')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders cards (mobile) */}
        {!loading && filteredOrders.length > 0 && (
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => {
              const meta = getStatusMeta(order.status);
              const priorityMeta = getPriorityMeta(order.priority);
              return (
                <div
                  key={order.id}
                  onClick={() => viewDetails(order.id)}
                  className="bg-white rounded-2xl border border-slate-200/70 p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {(order.customer?.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {order.customer?.name || L("Noma'lum")}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                          <Hash className="w-3 h-3" />
                          {order.orderNumber}
                        </p>
                      </div>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      ${order.totalAmount?.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Package className="w-3.5 h-3.5" />
                        {order.items?.length || 0}
                      </span>
                      <Badge variant={priorityMeta.variant}>{priorityMeta.label}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {order.requestedDate ? formatDate(order.requestedDate) : '-'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600">
                      <Eye className="w-4 h-4" />
                      {L("Ko'rish")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Plus className="w-5 h-5" />
                </span>
                {t('Yangi buyurtma')}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                aria-label={L('Yopish')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto">
              {/* Form Errors Display */}
              {Object.keys(formErrors).length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-600">
                    <AlertCircle className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">{L('Xatoliklar bor')}</h4>
                  </div>
                  <ul className="list-disc list-inside text-sm text-rose-500 space-y-0.5">
                    {formErrors.customerId && <li>{formErrors.customerId}</li>}
                    {formErrors.requestedDate && <li>{formErrors.requestedDate}</li>}
                    {formErrors.items?.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step 1: Customer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    {L('Mijozni tanlang')}
                  </h4>
                  {form.customerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, customerId: '', customerName: '' }));
                        setCustomerSearch('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      {L("O'chirish")}
                    </button>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <CustomerSelector
                    customers={customers}
                    selectedId={form.customerId}
                    searchValue={customerSearch}
                    onSearchChange={setCustomerSearch}
                    onSelect={(id, name) => {
                      setForm((prev) => ({ ...prev, customerId: id, customerName: name }));
                      if (formErrors.customerId) {
                        setFormErrors((prev) => ({ ...prev, customerId: undefined }));
                      }
                    }}
                  />
                </div>
              </div>

              {/* Step 2: Products */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    {L('Mahsulotlar')}
                  </h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {L("Qo'shish")}
                  </button>
                </div>

                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="relative p-4 rounded-xl border border-slate-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="absolute top-3 right-3 p-1 text-slate-300 hover:text-rose-500 transition-colors z-10"
                        aria-label={L('Mahsulotni olib tashlash')}
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="space-y-3">
                        <div className="pr-8">
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                            {L('Mahsulot')}
                          </label>
                          <ProductSelector
                            products={products}
                            selectedId={item.productId}
                            searchValue={productSearches[index] || ''}
                            onSearchChange={(value) => {
                              setProductSearches((prev) => ({ ...prev, [index]: value }));
                            }}
                            onSelect={(id, name, pricePerBag, unitsPerBag) => {
                              const newItems = [...form.items];
                              newItems[index] = {
                                ...newItems[index],
                                productId: id,
                                productName: name,
                                unitsPerBag: unitsPerBag || 0,
                                quantityUnits:
                                  (newItems[index].quantityBags || 0) * (unitsPerBag || 0),
                                priceType: 'BAG',
                                price: pricePerBag || 0,
                              };
                              setForm({ ...form, items: newItems });
                              checkInventory(newItems);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                              {L('Qop')}
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.quantityBags || ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                updateItem(index, 'quantityBags', raw === '' ? 0 : parseFloat(raw));
                              }}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg font-semibold tabular-nums outline-none transition-all"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                              {L('Qopdagi dona')}
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.unitsPerBag || ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                updateItem(index, 'unitsPerBag', raw === '' ? 0 : parseFloat(raw));
                              }}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg font-semibold tabular-nums outline-none transition-all"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                              {L('Jami')}
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.quantityUnits || ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                updateItem(index, 'quantityUnits', raw === '' ? 0 : parseFloat(raw));
                              }}
                              className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-semibold tabular-nums outline-none"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'priceType', 'BAG')}
                              className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                                item.priceType === 'BAG'
                                  ? 'bg-white text-indigo-600 shadow-sm'
                                  : 'text-slate-400'
                              )}
                            >
                              {L('Qopga')}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'priceType', 'UNIT')}
                              className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                                item.priceType === 'UNIT'
                                  ? 'bg-white text-indigo-600 shadow-sm'
                                  : 'text-slate-400'
                              )}
                            >
                              {L('Donaga')}
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">
                                $
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.price || ''}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(',', '.');
                                  if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                  updateItem(index, 'price', raw === '' ? 0 : parseFloat(raw));
                                }}
                                className="w-full pl-7 pr-2 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg font-semibold text-emerald-700 tabular-nums outline-none transition-all"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="text-right min-w-[88px]">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">
                                {L('Summa')}
                              </p>
                              <p className="text-sm font-bold text-emerald-700 tabular-nums">
                                $
                                {(item.priceType === 'BAG'
                                  ? item.quantityBags * item.price
                                  : item.quantityUnits * item.price
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inventory Check */}
                      {item.productId &&
                        inventoryCheck.find(
                          (check) => check.productId === item.productId && check.needProduction > 0
                        ) && (
                          <div className="mt-3 flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">
                              {L('Zaxira yetishmaydi')}:{' '}
                              {
                                inventoryCheck.find((check) => check.productId === item.productId)
                                  ?.inStock
                              }{' '}
                              {L('bor')}
                            </span>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  {L('Tafsilotlar')}
                </h4>

                {showInventoryWarning && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/70 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Factory className="w-4 h-4" />
                      <h4 className="font-semibold text-sm">{L('Ishlab chiqarish rejasi kerak')}</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {inventoryCheck
                        .filter((c) => c.needProduction > 0)
                        .map((c, i) => (
                          <div
                            key={i}
                            className="bg-white p-3 rounded-lg flex justify-between items-center border border-amber-200/70"
                          >
                            <span className="text-sm font-medium text-slate-700">{c.productName}</span>
                            <span className="text-sm font-bold text-amber-700 tabular-nums">
                              -{c.needProduction} {L('qop')}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="requested-date"
                      className="text-xs font-semibold text-slate-500 mb-1.5 block"
                    >
                      {L('Yetkazish sanasi')}
                    </label>
                    <input
                      id="requested-date"
                      type="date"
                      value={form.requestedDate}
                      onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded-lg font-medium transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="priority-select"
                      className="text-xs font-semibold text-slate-500 mb-1.5 block"
                    >
                      {L('Prioritet')}
                    </label>
                    <select
                      id="priority-select"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded-lg font-medium text-sm appearance-none transition-all outline-none"
                    >
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                    {L('Izoh')}
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded-lg text-sm min-h-[96px] transition-all outline-none resize-none"
                    placeholder={L("Buyurtma haqida qo'shimcha ma'lumot...")}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
                >
                  {L('Bekor qilish')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {L('Saqlanmoqda...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {L('Buyurtmani tasdiqlash')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold tabular-nums">
                  #{selectedOrder.orderNumber.split('-').pop()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{L('Buyurtma tafsilotlari')}</h3>
                  <p className="text-xs text-slate-400 tabular-nums">{selectedOrder.orderNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                aria-label={L('Yopish')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: L('Mijoz'), value: selectedOrder.customer?.name || '-', icon: User },
                  { label: L('Holat'), value: getStatusMeta(selectedOrder.status).label, icon: Activity },
                  {
                    label: L('Sana'),
                    value: selectedOrder.requestedDate ? formatDate(selectedOrder.requestedDate) : '-',
                    icon: Calendar,
                  },
                  {
                    label: L('Summa'),
                    value: `$${selectedOrder.totalAmount?.toFixed(2)}`,
                    icon: DollarSign,
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <item.icon className="w-3.5 h-3.5" />
                      <p className="text-xs font-medium uppercase tracking-wide">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Products Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  {L("Mahsulotlar ro'yxati")}
                </h4>
                <div className="rounded-xl border border-slate-200/70 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {L('Mahsulot')}
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {L('Miqdor')}
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {L('Summa')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.product?.name || L('Mahsulot')}
                            </p>
                            {item.product?.bagType && (
                              <p className="text-xs text-slate-400">{item.product.bagType}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-2 text-sm tabular-nums">
                              <span className="font-semibold text-indigo-600">
                                {item.quantityBags} {L('qop')}
                              </span>
                              <span className="text-slate-300">&middot;</span>
                              <span className="font-semibold text-violet-600">
                                {item.quantityUnits} {L('dona')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">
                            ${item.subtotal?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Actions Section */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  {L('Amallar')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedOrder.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          changeStatus(selectedOrder.id, 'IN_PRODUCTION');
                          setShowDetail(false);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                      >
                        <Package className="w-[18px] h-[18px]" />
                        {L('Ishlab chiqarishni boshlash')}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestCancel(selectedOrder.id)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                      >
                        {L('Buyurtmani bekor qilish')}
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'IN_PRODUCTION' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          changeStatus(selectedOrder.id, 'READY');
                          setShowDetail(false);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                      >
                        <CheckCircle className="w-[18px] h-[18px]" />
                        {L('Tayyor deb belgilash')}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestCancel(selectedOrder.id)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                      >
                        {L('Buyurtmani bekor qilish')}
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'READY' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetail(false);
                          openPaymentModal(selectedOrder);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                      >
                        <DollarSign className="w-[18px] h-[18px]" />
                        {L("Sotuv va to'lov qabul qilish")}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestCancel(selectedOrder.id)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                      >
                        {L('Buyurtmani bekor qilish')}
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'SOLD' && (
                    <div className="col-span-1 sm:col-span-2 bg-emerald-50 p-6 rounded-xl border border-emerald-200/70 text-center">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mx-auto mb-3">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h5 className="text-base font-semibold text-emerald-900 mb-1">
                        {L('Buyurtma sotildi')}
                      </h5>
                      <p className="text-sm font-semibold text-emerald-700 tabular-nums">
                        {L("To'langan")}: ${selectedOrder.paidAmount?.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                <span className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </span>
                {L("Sotuv va to'lov")}
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                aria-label={L('Yopish')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSellOrder();
              }}
              className="p-6 overflow-y-auto space-y-6"
            >
              {/* Order Summary Card */}
              <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="relative space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{L("Jami to'lov summasi")}</p>
                  <h4 className="text-3xl font-bold tracking-tight tabular-nums">
                    ${selectedOrder.totalAmount?.toFixed(2)}
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 tabular-nums">
                    &asymp; {(selectedOrder.totalAmount * exchangeRates.USD_TO_UZS).toLocaleString()} UZS
                  </p>
                </div>
              </div>

              {/* Payment Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {L("To'lov turlari")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                        <Banknote className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-600">UZS</span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={paymentForm.uzs || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.');
                        if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                        setPaymentForm({ ...paymentForm, uzs: raw === '' ? 0 : parseFloat(raw) });
                      }}
                      className="w-full bg-transparent font-bold text-lg text-slate-900 tabular-nums outline-none"
                      placeholder="0"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <DollarSign className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-600">USD</span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={paymentForm.usd || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.');
                        if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                        setPaymentForm({ ...paymentForm, usd: raw === '' ? 0 : parseFloat(raw) });
                      }}
                      className="w-full bg-transparent font-bold text-lg text-slate-900 tabular-nums outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600">
                        <Smartphone className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-600">CLICK</span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={paymentForm.click || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.');
                        if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                        setPaymentForm({ ...paymentForm, click: raw === '' ? 0 : parseFloat(raw) });
                      }}
                      className="w-full bg-transparent font-bold text-lg text-slate-900 tabular-nums outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Debt Section */}
              {selectedOrder.totalAmount - totalPaymentUSD > 0.01 && (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200/70 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <div>
                      <h5 className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                        {L('Qoldiq qarz')}
                      </h5>
                      <p className="text-xl font-bold text-rose-900 tabular-nums">
                        ${(selectedOrder.totalAmount - totalPaymentUSD).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="payment-due-date"
                      className="text-xs font-semibold text-slate-500 mb-1.5 block"
                    >
                      {L('Qarzni qaytarish muddati')}
                    </label>
                    <input
                      id="payment-due-date"
                      type="date"
                      value={paymentForm.dueDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-lg font-medium transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openDriverPaymentModal(selectedOrder)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Truck className="w-4 h-4" />
                  {L("Haydovchi to'lovi")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <CheckCircle className="w-4 h-4" />
                  {L('Sotuvni yakunlash')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Payment Modal */}
      {showDriverPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Truck className="w-5 h-5" />
                </span>
                {L("Haydovchi to'lovi")}
              </h3>
              <button
                type="button"
                onClick={() => setShowDriverPaymentModal(false)}
                aria-label={L('Yopish')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDriverPayment();
              }}
              className="p-6 overflow-y-auto space-y-5"
            >
              <div>
                <label
                  htmlFor="driver-payment-driver-select"
                  className="text-xs font-semibold text-slate-500 mb-1.5 block"
                >
                  {L('Haydovchini tanlang')}
                </label>
                <select
                  id="driver-payment-driver-select"
                  value={driverPaymentForm.driverId}
                  onChange={(e) =>
                    setDriverPaymentForm({ ...driverPaymentForm, driverId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded-lg font-medium text-sm appearance-none transition-all outline-none"
                >
                  <option value="">{L('Haydovchini tanlang...')}</option>
                  {drivers
                    .filter((d) => d.active)
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} - {driver.vehicleNumber}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  {L("To'lov usuli")}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'CASH', label: L('Naqd'), icon: Banknote, active: 'border-emerald-500 bg-emerald-50 text-emerald-600' },
                    { id: 'TRANSFER', label: L('Bank'), icon: Landmark, active: 'border-indigo-500 bg-indigo-50 text-indigo-600' },
                    { id: 'CLICK', label: L('Click'), icon: Smartphone, active: 'border-violet-500 bg-violet-50 text-violet-600' },
                  ].map((method) => {
                    const selected = driverPaymentForm.paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() =>
                          setDriverPaymentForm({ ...driverPaymentForm, paymentMethod: method.id })
                        }
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all',
                          selected
                            ? method.active
                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        )}
                      >
                        <method.icon className="w-5 h-5" />
                        <span className="text-xs font-semibold">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  {L("To'lov summasi (USD)")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={driverPaymentForm.amount || ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setDriverPaymentForm({
                        ...driverPaymentForm,
                        amount: raw === '' ? 0 : parseFloat(raw),
                      });
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded-lg font-bold text-xl text-slate-900 tabular-nums transition-all outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{L('Izoh')}</label>
                <textarea
                  value={driverPaymentForm.notes}
                  onChange={(e) =>
                    setDriverPaymentForm({ ...driverPaymentForm, notes: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded-lg text-sm min-h-[80px] transition-all outline-none resize-none"
                  placeholder={L("Haydovchi to'lovi haqida...")}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDriverPaymentModal(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  {L('Bekor qilish')}
                </button>
                <button
                  type="submit"
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <CheckCircle className="w-4 h-4" />
                  {L("To'lovni tasdiqlash")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm dialog for cancel/destructive actions */}
      <ConfirmDialog
        isOpen={confirmState.open}
        onClose={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={L('Bekor qilish')}
        cancelText={L('Yopish')}
        variant="danger"
      />
    </>
  );
}
