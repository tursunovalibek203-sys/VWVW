import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import CustomerSelector from '../components/CustomerSelector';
import ProductSelector from '../components/ProductSelector';
import DebugInfo from '../components/DebugInfo';
import api from '../lib/professionalApi';
import { generateDeliveryReceiptHTML } from '../lib/simpleReceiptPrinter';
import { formatDate } from '../lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { errorHandler } from '../lib/professionalErrorHandler';
import { 
  Package, 
  Plus, 
  Search,
  Brain,
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
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { exportToExcel } from '../lib/excelUtils';
import { cn } from '../lib/utils';


import type { Order, Customer, Product } from '../types';

export default function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isCashier = window.location.pathname.startsWith('/cashier');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
 
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
    minAmount: '',
    maxAmount: '',
    customerType: 'all' as 'all' | 'vip' | 'regular'
  });

  // Order sorting
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalAmount' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick actions
  const [bulkActions, setBulkActions] = useState({
    selectedOrders: [] as string[],
    showBulkActions: false
  });

  // Original filters for compatibility
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // To'lov formasi
  const [paymentForm, setPaymentForm] = useState({
    uzs: 0,
    usd: 0,
    click: 0,
    dueDate: ''
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
    const total = (paymentForm.uzs / exchangeRates.USD_TO_UZS) + paymentForm.usd + (paymentForm.click / exchangeRates.USD_TO_UZS);
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
    notes: ''
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

  // Real-time form state display
  console.log('ðŸ”„ Current form state:', {
    customerId: form.customerId,
    customerName: form.customerName,
    items: form.items,
    itemsCount: form.items.length,
    priority: form.priority
  });

  // Track form items changes
  useEffect(() => {
    console.log('ðŸ“‹ Form items changed:', form.items);
    form.items.forEach((item, index) => {
      console.log(`ðŸ“‹ Item ${index}:`, item);
    });
  }, [form.items]);
  
  // Qidiruv
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearches, setProductSearches] = useState<{[key: number]: string}>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('ðŸ”„ Loading data...');
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/customers'),
        api.get('/products')
      ]);
      
      console.log('ðŸ“Š Data loaded:');
      console.log('   Orders:', ordersRes.data.length);
      console.log('   Customers:', customersRes.data.length);
      console.log('   Products:', productsRes.data.length);
      
      if (productsRes.data.length > 0) {
        console.log('ðŸ“¦ First product sample:', productsRes.data[0]);
      }
      
      setOrders(ordersRes.data);
      // âœ… Handle new API response format
      setCustomers(customersRes.data?.data || customersRes.data || []);
      setProducts(productsRes.data?.data || productsRes.data || []);
      
      console.log('âœ… Data loaded and state updated');
    } catch (error) {
      console.error('âŒ Ma\'lumotlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredOrders.map(o => ({
      'Buyurtma #': o.orderNumber,
      'Mijoz': o.customer?.name || 'Noma\'lum',
      'Mahsulotlar': o.items?.map((i: any) => `${i.productName} (${i.quantityBags} qop)`).join(', '),
      'Jami summa': o.totalAmount,
      'Sana': formatDate(o.createdAt),
      'Status': statusConfig[o.status as keyof typeof statusConfig]?.label || o.status,
      'Prioritet': priorityConfig[o.priority as keyof typeof priorityConfig]?.label || o.priority
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
        notes: 'Buyurtmalar uchun avtomatik yaratildi'
      });
      
      alert(`âœ… Ishlab chiqarish buyurtmasi yaratildi!\n\nMahsulot: ${response.data.productName}\nMiqdor: ${quantity} qop`);
      loadData();
    } catch (error: any) {
      console.error('Ishlab chiqarish buyurtmasi xatolik:', error);
      alert('âŒ Ishlab chiqarish buyurtmasi yaratilmadi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('ðŸ“‹ handleSubmit called');
    console.log('ðŸ“‹ Form state:', form);
    console.log('ðŸ“‹ CustomerId:', form.customerId);
    console.log('ðŸ“‹ Items:', form.items);
    console.log('ðŸ“‹ Items length:', form.items.length);
    
    // Validate form
    if (!validateForm()) {
      console.log('âŒ Validation failed');
      return;
    }

    console.log('âœ… Validation passed');

    try {
      console.log('Submitting order:', form);
      

      // Calculate subtotals and total
      const itemsWithSubtotals = form.items.map(item => {
        const subtotal = item.priceType === 'BAG' 
          ? (item.quantityBags * item.price) 
          : (item.quantityUnits * item.price);
        return {
          ...item,
          unitPrice: item.price,
          subtotal
        };
      });

      const totalAmount = itemsWithSubtotals.reduce((sum, item) => sum + item.subtotal, 0);

      const response = await api.post('/orders', {
        ...form,
        items: itemsWithSubtotals,
        totalAmount,
        requestedDate: new Date(form.requestedDate).toISOString()
      });
      
      console.log('Order created successfully:', response.data);
      
      // Show inventory warnings if any
      if (response.data.inventoryCheck && response.data.inventoryCheck.some((item: any) => item.needProduction > 0)) {
        const warnings = response.data.inventoryCheck
          .filter((item: any) => item.needProduction > 0)
          .map((item: any) => `${item.productName}: ${item.needProduction} qop kerak`)
          .join('\n');
        
        alert(`âœ… Buyurtma yaratildi!\n\nâš ï¸ Omborda yetarli mahsulot yo'q:\n${warnings}\n\nIshlab chiqarish rejasiga qo'shildi.`);
      } else {
        alert('âœ… Buyurtma muvaffaqiyatli yaratildi!');
      }
      
      closeForm();
      loadData();
    } catch (error: any) {
      console.error('Buyurtma yaratish xatoliki:', error);
      
      let errorMessage = 'Noma\'lum xatolik';
      
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        errorMessage = error.response.data?.error || error.response.data?.message || `Server xatolik (${error.response.status})`;
      } else if (error.request) {
        errorMessage = 'Serverga ulanib bo\'lmadi. Internet aloqasini tekshiring.';
      } else {
        errorMessage = error.message || 'Xatolik yuz berdi';
      }
      
      alert(`âŒ Buyurtma yaratilmadi!\n\nXatolik: ${errorMessage}\n\nIltimos, administrator bilan bog'laning.`);
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
      notes: ''
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
      items: [...form.items, { 
        productId: '', 
        productName: '', 
        quantityBags: 0, 
        unitsPerBag: 0, 
        quantityUnits: 0,
        priceType: 'BAG',
        price: 0
      }]
    });
  };

  const initializeForm = () => {
    setForm({
      customerId: '',
      customerName: '',
      items: [{ 
        productId: '', 
        productName: '', 
        quantityBags: 0, 
        unitsPerBag: 0, 
        quantityUnits: 0,
        priceType: 'BAG',
        price: 0
      }], // Start with one item
      priority: 'NORMAL',
      requestedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setFormErrors({});
    setInventoryCheck([]);
    setShowInventoryWarning(false);
    setShowForm(true);
  };

  const removeItem = (index: number) => {
    const newSearches = {...productSearches};
    delete newSearches[index];
    setProductSearches(newSearches);
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    console.log('ðŸ”„ updateItem called:', { index, field, value });
    
    const newItems = [...form.items];
    const item = { ...newItems[index], [field]: value };
    
    // Auto-calculate logic: Bags * UnitsPerBag = TotalUnits
    if (field === 'quantityBags' || field === 'unitsPerBag') {
      const bags = field === 'quantityBags' ? (parseInt(value) || 0) : (item.quantityBags || 0);
      const perBag = field === 'unitsPerBag' ? (parseInt(value) || 0) : (item.unitsPerBag || 0);
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
      items: newItems
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
      
      const product = products.find(p => p.id === item.productId);
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
        status: shortage > 0 ? 'NEED_PRODUCTION' : 'IN_STOCK'
      });
    }
    
    setInventoryCheck(check);
    setShowInventoryWarning(check.some(item => item.status === 'NEED_PRODUCTION'));
  };

  // Form validation
  const validateForm = () => {
    const errors: typeof formErrors = {};
    
    if (!form.customerId) {
      errors.customerId = 'Mijozni tanlang';
    }
    
    if (!form.requestedDate) {
      errors.requestedDate = 'Sana ni tanlang';
    }
    
    // Check if there are any items
    if (form.items.length === 0) {
      errors.items = ['Kamida bitta mahsulot qo\'shishingiz kerak'];
    } else {
      const itemErrors: string[] = [];
      form.items.forEach((item, index) => {
        if (!item.productId) {
          itemErrors.push(`Mahsulot #${index + 1} ni tanlang`);
        }
        if (!item.quantityBags || item.quantityBags <= 0) {
          itemErrors.push(`Mahsulot #${index + 1} uchun miqdorni kiriting`);
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
      loadData();
    } catch (error) {
      console.error('Status change error:', error);
    }
  };



  const viewDetails = async (orderId: string) => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setSelectedOrder(data);
      setShowDetail(true);
    } catch (error) {
      alert('âŒ Ma\'lumotlarni yuklashda xatolik');
    }
  };

  const openPaymentModal = (order: any) => {
    setSelectedOrder(order);
    setPaymentForm({
      uzs: 0,
      usd: order.totalAmount, // Default USD
      click: 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 kun keyin
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
          orderData: selectedOrder
        }
      });
      
      setShowPaymentModal(false);
      setShowDetail(false);
      
      console.log('Buyurtma sotuv sahifasiga yo\'naltirildi:', selectedOrder);
      
      // Print receipt after successful sale
      try {
        const orderData = {
          orderNumber: selectedOrder.orderNumber,
          cashier: 'Admin',
          customer: selectedOrder.customer,
          items: selectedOrder.items,
          totalAmount: selectedOrder.totalAmount,
          paymentType: 'Naqd',
          paidAmount: paymentForm.uzs + (paymentForm.usd * 12500) + paymentForm.click
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
Ismi: ${orderData.customer?.name || 'Noma\'lum'}
Tel: ${orderData.customer?.phone || 'Mavjud emas'}
Manzil: ${orderData.customer?.address || 'Mavjud emas'}
----------------------------------------
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”
â”‚ Mahsulot nomi            â”‚ Qop â”‚ Donaâ”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”¤
${orderData.items?.map((item: any) => 
  `â”‚ ${(item.product?.name || item.productName || 'Noma\'lum').substring(0, 24).padEnd(24).replace(/[^\x00-\x7F]/g, "")} â”‚ ${item.quantityBags.toString().padStart(3)} â”‚ ${item.quantityUnits.toString().padStart(3)} â”‚`
).join('\nâ”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”¤\n') || 'â”‚ Mahsulotlar mavjud emas              â”‚'}
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”˜
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
          filename: `sales-receipt-${Date.now()}.txt`
        });
        
        console.log('âœ… Savdo cheki chop etish uchun serverga yuborildi');
        
      } catch (printError) {
        console.error('âŒ Chek chop etish xatolik:', printError);
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
    notes: ''
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
      notes: `Buyurtma #${order.orderNumber} to'lovi`
    });
    setShowDriverPaymentModal(true);
  };

  const handleDriverPayment = async () => {
    try {
      if (!selectedOrder) {
        alert('âŒ Buyurtma tanlanmagan!');
        return;
      }
      
      if (!driverPaymentForm.driverId) {
        alert('âŒ Haydovchini tanlang!');
        return;
      }
      
      if (driverPaymentForm.amount <= 0) {
        alert('âŒ To\'lov summasini kiriting!');
        return;
      }

      const { data } = await api.post(`/orders/${selectedOrder.id}/driver-payment`, driverPaymentForm);
      
      alert(data.message);
      setShowDriverPaymentModal(false);
      setShowDetail(false);
      loadData();
    } catch (error: any) {
      alert('âŒ Xatolik: ' + (error.response?.data?.error || 'Haydovchi to\'lovida xatolik'));
    }
  };

  // Bulk actions handlers
  const toggleOrderSelection = (orderId: string) => {
    setBulkActions(prev => ({
      ...prev,
      selectedOrders: prev.selectedOrders.includes(orderId)
        ? prev.selectedOrders.filter(id => id !== orderId)
        : [...prev.selectedOrders, orderId]
    }));
  };

  const selectAllOrders = () => {
    setBulkActions(prev => ({
      ...prev,
      selectedOrders: filteredOrders.map(order => order.id)
    }));
  };

  const clearSelection = () => {
    setBulkActions(prev => ({
      ...prev,
      selectedOrders: []
    }));
  };

  const bulkStatusChange = async (newStatus: string) => {
    try {
      await Promise.all(
        bulkActions.selectedOrders.map(orderId => 
          api.put(`/orders/${orderId}/status`, { status: newStatus })
        )
      );
      clearSelection();
      loadData();
    } catch (error) {
      console.error('Bulk status change error:', error);
    }
  };
  const filteredOrders = orders.filter(order => {
    // Basic filters
    if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && order.priority !== priorityFilter) return false;
    if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Advanced filters
    if (advancedFilters.dateRange !== 'all') {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (advancedFilters.dateRange) {
        case 'today':
          if (orderDate < today) return false;
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (orderDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (orderDate < monthAgo) return false;
          break;
      }
    }

    if (advancedFilters.minAmount && order.totalAmount < parseFloat(advancedFilters.minAmount)) return false;
    if (advancedFilters.maxAmount && order.totalAmount > parseFloat(advancedFilters.maxAmount)) return false;
    
    if (advancedFilters.customerType !== 'all') {
      if (advancedFilters.customerType === 'vip' && order.customer?.category !== 'VIP') return false;
      if (advancedFilters.customerType === 'regular' && order.customer?.category === 'VIP') return false;
    }

    return true;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'totalAmount':
        comparison = a.totalAmount - b.totalAmount;
        break;
      case 'priority':
        const priorityOrder = { LOW: 1, NORMAL: 2, HIGH: 3, URGENT: 4 };
        comparison = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Status bo'yicha guruhlash (Kanban) - PENDING va DELIVERED olib tashlandi
  const groupedOrders = {
    CONFIRMED: filteredOrders.filter(o => o.status === 'CONFIRMED'),
    IN_PRODUCTION: filteredOrders.filter(o => o.status === 'IN_PRODUCTION'),
    READY: filteredOrders.filter(o => o.status === 'READY'),
    SOLD: filteredOrders.filter(o => o.status === 'SOLD')
  };

  const statusConfig = {
    CONFIRMED: { label: 'Tasdiqlandi', icon: CheckCircle, color: 'blue' },
    IN_PRODUCTION: { label: 'Ishlab chiqarilmoqda', icon: Package, color: 'purple' },
    READY: { label: 'Tayyor', icon: CheckCircle, color: 'green' },
    SOLD: { label: 'Sotildi', icon: DollarSign, color: 'emerald' },
    CANCELLED: { label: 'Bekor qilindi', icon: XCircle, color: 'red' }
  };

  // Buyurtmalar statistikasi
  const orderStats = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    inProduction: orders.filter(o => o.status === 'IN_PRODUCTION').length,
    ready: orders.filter(o => o.status === 'READY').length,
    sold: orders.filter(o => o.status === 'SOLD').length,
    fromBot: orders.filter(o => o.orderNumber.startsWith('BOT-')).length,
  };

  // Mahsulotlar bo'yicha statistika
  const productStats: any = {};
  orders.forEach(order => {
    if (order.status !== 'CANCELLED' && order.status !== 'SOLD') {
      order.items?.forEach((item: any) => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            productName: item.product?.name || 'Noma\'lum',
            totalOrdered: 0,
            inStock: 0,
            needProduction: 0
          };
        }
        productStats[item.productId].totalOrdered += item.quantityBags;
      });
    }
  });

  // Ombordagi mahsulotlar bilan solishtirish
  products.forEach(product => {
    if (productStats[product.id]) {
      productStats[product.id].inStock = product.currentStock;
      productStats[product.id].needProduction = Math.max(
        0,
        productStats[product.id].totalOrdered - product.currentStock
      );
    }
  });

  const priorityConfig = {
    LOW: { label: 'Past', color: 'gray' },
    NORMAL: { label: 'Oddiy', color: 'blue' },
    HIGH: { label: 'Yuqori', color: 'orange' },
    URGENT: { label: 'Shoshilinch', color: 'red' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">{t('Yuklanmoqda...')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pb-12">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/30">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {t("Buyurtmalar")}
                </h1>
                <p className="text-sm text-blue-100/80">
                  {t("Buyurtmalar ro'yxati va nazorati")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 rounded-xl font-medium text-sm transition-all"
              >
                <FileText className="w-4 h-4" />
                Excel
              </button>
              <button 
                onClick={initializeForm} 
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                {t("Yangi buyurtma")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Modern Gradient Design */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 px-4">
        {[
          { label: t("Jami"), value: orderStats.total, icon: Clock, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
          { label: t("Tasdiqlandi"), value: orderStats.confirmed, icon: CheckCircle, color: 'cyan', gradient: 'from-cyan-500 to-blue-500' },
          { label: t("Ishlab chiqarish"), value: orderStats.inProduction, icon: Activity, color: 'purple', gradient: 'from-purple-500 to-violet-600' },
          { label: t("Tayyor"), value: orderStats.ready, icon: CheckCircle, color: 'green', gradient: 'from-green-500 to-emerald-600' },
          { label: t("Sotildi"), value: orderStats.sold, icon: DollarSign, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
          { label: t("Botdan"), value: orderStats.fromBot, icon: Bot, color: 'indigo', gradient: 'from-indigo-500 to-purple-600' }
        ].map((stat, i) => (
          <div key={i} className={`group bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 shadow-lg shadow-${stat.color}-500/25 hover:shadow-xl hover:shadow-${stat.color}-500/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer`}>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs font-medium text-white/80 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Filter Buttons */}
      <div className="px-4 flex flex-wrap gap-3">
        <button
          onClick={() => setStatusFilter('SOLD')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            statusFilter === 'SOLD'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Sotilgan buyurtmalar
          {statusFilter === 'SOLD' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStatusFilter('ALL');
              }}
              className="ml-1 p-0.5 hover:bg-emerald-500 rounded"
              aria-label="Clear sold filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('READY')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            statusFilter === 'READY'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Tayyor buyurtmalar
          {statusFilter === 'READY' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStatusFilter('ALL');
              }}
              className="ml-1 p-0.5 hover:bg-green-500 rounded"
              aria-label="Filtrni tozalash"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </button>

        {statusFilter !== 'ALL' && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Filtrlarni tozalash
          </button>
        )}
      </div>
      {Object.keys(productStats).length > 0 && (
        <div className="px-4">
          <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                  <Package className="w-5 h-5" />
                </div>
                {t("Mahsulotlar bo'yicha")} <span className="text-orange-600">{t("tahlil")}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(productStats).map((stat: any, index) => (
                <div key={index} className={`relative overflow-hidden group p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${
                  stat.needProduction > 0
                    ? 'border-rose-100 bg-rose-50/30 dark:bg-rose-900/10'
                    : 'border-emerald-100 bg-emerald-50/30 dark:bg-emerald-900/10'
                }`}>
                  {stat.needProduction > 0 && (
                    <div className="absolute top-0 right-0 p-6">
                      <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>
                    </div>
                  )}

                  <h4 className="text-base font-bold text-gray-900 dark:text-white tracking-tight mb-4">{stat.productName}</h4>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/50 dark:bg-gray-900/50">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("Buyurtma")}</span>
                      <span className="font-bold text-blue-600">{stat.totalOrdered} {t("QOP")}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/50 dark:bg-gray-900/50">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("Ombor")}</span>
                      <span className="font-bold text-emerald-600">{stat.inStock} {t("QOP")}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{stat.needProduction > 0 ? t("Kamchilik") : t("Holat")}</span>
                      <span className={`font-bold ${stat.needProduction > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {stat.needProduction > 0 ? `-${stat.needProduction} QOP` : t("YETARLI")}
                      </span>
                    </div>
                  </div>
                  
                  {stat.needProduction > 0 && (
                    <button
                      onClick={() => createProductionOrder(stat.productId, stat.needProduction)}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Factory className="w-4 h-4" />
                      {t("Ishlab chiqarish buyurtmasi")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="px-4">
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl p-8 rounded-[3rem] border border-white dark:border-gray-800 shadow-2xl space-y-8">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              placeholder={t("Buyurtma raqami yoki mijoz nomi orqali qidirish...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-16 pl-16 pr-8 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-[2rem] font-bold text-sm transition-all outline-none shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="status-filter" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-4">{t("Holati")}</label>
              <select
                id="status-filter"
                className="w-full h-14 px-6 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl font-semibold text-xs appearance-none shadow-sm outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">{t("Barcha holatlar")}</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="priority-filter" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-4">{t("Prioritet")}</label>
              <select
                id="priority-filter"
                className="w-full h-14 px-6 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl font-semibold text-xs appearance-none shadow-sm outline-none"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="ALL">{t("Barcha prioritetlar")}</option>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="date-range-filter" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-4">{t("Vaqt Oralig'i")}</label>
              <select
                id="date-range-filter"
                className="w-full h-14 px-6 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl font-semibold text-xs appearance-none shadow-sm outline-none"
                value={advancedFilters.dateRange}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateRange: e.target.value as any })}
              >
                <option value="all">{t("Barcha vaqt")}</option>
                <option value="today">{t("Bugun")}</option>
                <option value="week">{t("Oxirgi 7 kun")}</option>
                <option value="month">{t("Oxirgi 30 kun")}</option>
              </select>
            </div>
          </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Advanced Filters</h3>
              <button
                type="button"
                onClick={() => setBulkActions({ ...bulkActions, showBulkActions: !bulkActions.showBulkActions })}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {bulkActions.showBulkActions ? 'Hide' : 'Show'} Advanced
              </button>
            </div>

            {/* Advanced Filters Panel */}
            {bulkActions.showBulkActions && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label htmlFor="customerTypeFilter" className="block text-xs font-medium mb-1">Customer Type</label>
                  <select
                    id="customerTypeFilter"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    value={advancedFilters.customerType}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, customerType: e.target.value as any })}
                  >
                    <option value="all">All Customers</option>
                    <option value="vip">VIP Only</option>
                    <option value="regular">Regular Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Min Amount ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    value={advancedFilters.minAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setAdvancedFilters({ ...advancedFilters, minAmount: raw });
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Max Amount ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    value={advancedFilters.maxAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setAdvancedFilters({ ...advancedFilters, maxAmount: raw });
                    }}
                    placeholder="999999"
                  />
                </div>
              </div>
            )}

            {/* Sorting */}
            <div className="flex items-center gap-3">
              <label htmlFor="sortBy" className="text-sm font-medium">Sort by:</label>
              <select
                id="sortBy"
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="createdAt">Date</option>
                <option value="totalAmount">Amount</option>
                <option value="priority">Priority</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm hover:bg-gray-100"
              >
                {sortOrder === 'asc' ? 'â†‘' : 'â†“'} {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
              </button>
            </div>
          </div>
        </div>

      {/* Bulk Actions Toolbar */}
      {bulkActions.selectedOrders.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-blue-600">
                  {bulkActions.selectedOrders.length} orders selected
                </span>
                <Button
                  onClick={selectAllOrders}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Select All ({filteredOrders.length})
                </Button>
                <Button
                  onClick={clearSelection}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Bulk Actions:</span>
                <select
                  className="px-2 py-1 text-sm border rounded"
                  aria-label="Bulk actions"
                  onChange={(e) => {
                    if (e.target.value) {
                      bulkStatusChange(e.target.value);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Select Action...</option>
                  <option value="CONFIRMED">Mark as Confirmed</option>
                  <option value="IN_PRODUCTION">Start Production</option>
                  <option value="READY">Mark as Ready</option>
                  <option value="CANCELLED">Cancel Orders</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board - Premium Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 px-4">
        {Object.entries(groupedOrders).map(([status, ordersList]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;
          
          return (
            <div key={status} className="flex flex-col gap-6">
              {/* Column Header */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 bg-${config.color}-50 dark:bg-${config.color}-900/20 rounded-xl flex items-center justify-center text-${config.color}-600`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">{config.label}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{ordersList.length} {t("BUYURTMA")}</p>
                  </div>
                </div>
              </div>

              {/* Order Cards Container */}
              <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                {ordersList.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => viewDetails(order.id)}
                    className="group relative bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 cursor-pointer overflow-hidden"
                  >
                    {/* Status Accent Line */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full bg-${config.color}-500 transition-all duration-500 group-hover:w-2`}></div>

                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex justify-between items-start pl-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">#{order.orderNumber}</p>
                          <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[150px]">
                            {order.customer?.name}
                          </h4>
                        </div>
                        <div className="flex gap-1">
                          {order.customer?.category === 'VIP' && (
                            <div className="w-6 h-6 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600">
                              <span className="text-xs">ðŸ‘‘</span>
                            </div>
                          )}
                          {order.priority === 'URGENT' && (
                            <div className="w-6 h-6 bg-rose-50 dark:bg-rose-900/30 rounded-lg flex items-center justify-center text-rose-600 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-2 pl-2">
                        {order.items?.slice(0, 2).map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-50 dark:border-gray-800">
                            <span className="text-[10px] font-bold text-gray-500 truncate max-w-[100px] uppercase">{item.product?.name}</span>
                            <span className="text-[10px] font-bold text-blue-600">{item.quantityBags} {t("QOP")}</span>
                          </div>
                        ))}
                        {(order.items?.length || 0) > 2 && (
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest text-center">+{(order.items?.length || 0) - 2} {t("yana")}</p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center pl-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">{order.requestedDate ? formatDate(order.requestedDate) : '-'}</span>
                        </div>
                        <p className="text-base font-bold text-emerald-600 tracking-tight">${order.totalAmount?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {ordersList.length === 0 && (
                  <div className="py-24 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                      <Package className="w-12 h-12 text-slate-400" />
                    </div>
                    <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">{t("Buyurtmalar yo'q")}</p>
                    <p className="text-sm text-slate-400 mt-2">{t("Yangi buyurtma qo'shish uchun tugmani bosing")}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

      {/* New Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                  <Brain className="w-6 h-6" />
                </div>
                {t("YANGI")} <span className="text-blue-600">{t("BUYURTMA")}</span>
              </h3>
              <button type="button" onClick={closeForm} aria-label={t("Yopish")} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 sm:p-16 space-y-12 overflow-y-auto custom-scrollbar">
              {/* Form Errors Display */}
              {Object.keys(formErrors).length > 0 && (
                <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 rounded-[2rem] space-y-2">
                  <div className="flex items-center gap-3 text-rose-600">
                    <AlertCircle className="w-5 h-5" />
                    <h4 className="font-bold uppercase tracking-widest text-xs">{t("Xatoliklar bor")}</h4>
                  </div>
                  <ul className="list-disc list-inside text-xs font-bold text-rose-500/80">
                    {formErrors.customerId && <li>{formErrors.customerId}</li>}
                    {formErrors.requestedDate && <li>{formErrors.requestedDate}</li>}
                    {formErrors.items?.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Step 1: Customer */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center font-bold">1</div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t("Mijozni Tanlang")}</h4>
                  </div>
                  {form.customerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, customerId: '', customerName: '' }));
                        setCustomerSearch('');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-semibold text-xs tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all active:scale-95"
                    >
                      <X className="w-4 h-4" />
                      {t("Mijozni o'chirish")}
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
                  <CustomerSelector
                    customers={customers}
                    selectedId={form.customerId}
                    searchValue={customerSearch}
                    onSearchChange={setCustomerSearch}
                    onSelect={(id, name) => {
                      setForm(prev => ({ ...prev, customerId: id, customerName: name }));
                      if (formErrors.customerId) {
                        setFormErrors(prev => ({ ...prev, customerId: undefined }));
                      }
                    }}
                  />
                </div>
              </div>

              {/* Step 2: Products */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center font-bold">2</div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t("Mahsulotlar")}</h4>
                  </div>
                  <button 
                    type="button" 
                    onClick={addItem}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold text-xs tracking-widest hover:scale-105 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    {t("QO'SHISH")}
                  </button>
                </div>

                <div className="space-y-0 border-t border-gray-200 dark:border-gray-800">
                  {form.items.map((item, index) => (
                    <div key={index} className="py-6 border-b border-gray-200 dark:border-gray-800 relative group">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="absolute top-6 right-0 text-gray-300 hover:text-rose-500 transition-colors z-20"
                        aria-label="Remove item"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="space-y-4">
                        {/* 1. Mahsulot nomi (To'liq qator) */}
                        <div className="pr-10">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Mahsulot</label>
                          <ProductSelector
                            products={products}
                            selectedId={item.productId}
                            searchValue={productSearches[index] || ''}
                            onSearchChange={(value) => {
                              setProductSearches(prev => ({ ...prev, [index]: value }));
                            }}
                            onSelect={(id, name, pricePerBag, unitsPerBag, cardType, pricePerPiece) => {
                              const newItems = [...form.items];
                              newItems[index] = { 
                                ...newItems[index], 
                                productId: id, 
                                productName: name,
                                unitsPerBag: unitsPerBag || 0,
                                quantityUnits: (newItems[index].quantityBags || 0) * (unitsPerBag || 0),
                                priceType: 'BAG',
                                price: pricePerBag || 0
                              };
                              setForm({ ...form, items: newItems });
                              checkInventory(newItems);
                            }}
                          />
                        </div>

                        {/* 2. Qop | Qopdagi dona | Jami (Yonma-yon) */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Qop</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.quantityBags || ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                updateItem(index, 'quantityBags', raw === '' ? 0 : parseFloat(raw));
                              }}
                              className="w-full h-11 px-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-lg font-bold text-lg outline-none transition-colors"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Qopdagi dona</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.unitsPerBag || ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                updateItem(index, 'unitsPerBag', raw === '' ? 0 : parseFloat(raw));
                              }}
                              className="w-full h-11 px-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-lg font-bold text-lg outline-none transition-colors"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Jami</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.quantityUnits || ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                updateItem(index, 'quantityUnits', raw === '' ? 0 : parseFloat(raw));
                              }}
                              className="w-full h-11 px-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 rounded-lg font-bold text-lg outline-none"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* 3. Narx kiritish (Pastki qismda) */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'priceType', 'BAG')}
                              className={cn(
                                "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                                item.priceType === 'BAG' ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-400"
                              )}
                            >
                              QOPGA
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'priceType', 'UNIT')}
                              className={cn(
                                "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                                item.priceType === 'UNIT' ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-400"
                              )}
                            >
                              DONAGA
                            </button>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="relative w-36">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.price || ''}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(',', '.');
                                  if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                                  updateItem(index, 'price', raw === '' ? 0 : parseFloat(raw));
                                }}
                                className="w-full h-10 pl-8 pr-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-emerald-500 rounded-lg font-bold text-lg outline-none text-emerald-600 transition-colors"
                                placeholder="0.00"
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</div>
                            </div>
                            <div className="text-right min-w-[100px]">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">SUMMA</p>
                              <p className="text-base font-bold text-emerald-600">
                                ${(item.priceType === 'BAG' ? (item.quantityBags * item.price) : (item.quantityUnits * item.price)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inventory Check (Juda ixcham) */}
                      {item.productId && inventoryCheck.find(check => check.productId === item.productId && check.needProduction > 0) && (
                        <div className="mt-3 flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">
                            Zaxira yetishmaydi: {inventoryCheck.find(check => check.productId === item.productId)?.inStock} bor
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Details */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center font-bold">3</div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t("Tafsilotlar")}</h4>
                </div>
                
                {/* Overall Inventory Summary */}
                {showInventoryWarning && (
                  <div className="p-8 bg-orange-50 dark:bg-orange-900/20 rounded-[2.5rem] border border-orange-100 dark:border-orange-800 space-y-4">
                    <div className="flex items-center gap-3 text-orange-600">
                      <Factory className="w-5 h-5" />
                      <h4 className="font-bold uppercase tracking-widest text-xs">{t("Ishlab chiqarish rejasi kerak")}</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inventoryCheck.filter(c => c.needProduction > 0).map((c, i) => (
                        <div key={i} className="bg-white/50 dark:bg-gray-900/50 p-4 rounded-xl flex justify-between items-center">
                          <span className="text-xs font-semibold uppercase tracking-tight">{c.productName}</span>
                          <span className="text-xs font-bold text-rose-600">-{c.needProduction} {t("qop")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label htmlFor="requested-date" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Yetkazish Sanasi")}</label>
                    <input
                      id="requested-date"
                      type="date"
                      value={form.requestedDate}
                      onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl font-semibold transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="priority-select" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Prioritet")}</label>
                    <select
                      id="priority-select"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl font-semibold text-sm appearance-none outline-none"
                    >
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Izoh")}</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full p-8 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] font-bold text-sm min-h-[120px] transition-all outline-none resize-none"
                    placeholder={t("Buyurtma haqida qo'shimcha ma'lumot...")}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-50 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 h-16 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 font-semibold text-xs tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {t("BEKOR QILISH")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-semibold text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Brain className="w-5 h-5" />
                  {t("BUYURTMANI TASDIQLASH")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal - Premium */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/30 shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center font-bold text-xl shadow-xl shadow-blue-500/20">
                  #{selectedOrder.orderNumber.split('-').pop()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t("Buyurtma Tafsilotlari")}</h3>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">ID: {selectedOrder.id}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowDetail(false)} aria-label="Close details" className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-rose-500 shadow-sm transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 sm:p-16 overflow-y-auto custom-scrollbar space-y-12">
              {/* Order Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: t("MIJOZ"), value: selectedOrder.customer?.name, icon: User, color: 'blue' },
                  { label: t("STATUS"), value: statusConfig[selectedOrder.status as keyof typeof statusConfig].label, icon: Activity, color: statusConfig[selectedOrder.status as keyof typeof statusConfig].color },
                  { label: t("SANA"), value: selectedOrder.requestedDate ? formatDate(selectedOrder.requestedDate) : '-', icon: Calendar, color: 'orange' },
                  { label: t("SUMMA"), value: `$${selectedOrder.totalAmount?.toFixed(2)}`, icon: DollarSign, color: 'emerald' }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <div className={`w-10 h-10 bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-xl flex items-center justify-center text-${item.color}-600 mb-4`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Products Table */}
              <div className="space-y-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                  <Package className="w-6 h-6 text-blue-600" />
                  {t("MAHSULOTLAR RO'YXATI")}
                </h4>
                <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("MAHSULOT")}</th>
                        <th className="text-center py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("MIQDOR")}</th>
                        <th className="text-right py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("SUBTOTAL")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="group hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-5 px-8">
                            <p className="font-semibold text-gray-900 dark:text-white uppercase tracking-tight">{item.product?.name || t("MAHSULOT")}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{item.product?.bagType || '-'}</p>
                          </td>
                          <td className="py-5 px-8 text-center">
                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
                              <span className="text-xs font-bold text-blue-600">{item.quantityBags} {t("QOP")}</span>
                              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                              <span className="text-xs font-bold text-purple-600">{item.quantityUnits} {t("DONA")}</span>
                            </div>
                          </td>
                          <td className="py-5 px-8 text-right font-bold text-emerald-600 tracking-tight">
                            ${item.subtotal?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Actions Section */}
              <div className="pt-10 border-t border-gray-50 dark:border-gray-800">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em] mb-6 text-center">{t("AMALLAR")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedOrder.status === 'CONFIRMED' && (
                    <>
                      <button 
                        onClick={() => { changeStatus(selectedOrder.id, 'IN_PRODUCTION'); setShowDetail(false); }}
                        className="h-16 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold text-xs tracking-widest shadow-xl shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <Package className="w-5 h-5" />
                        {t("ISHLAB CHIQARISHNI BOSHLASH")}
                      </button>
                      <button 
                        onClick={() => { changeStatus(selectedOrder.id, 'CANCELLED'); setShowDetail(false); }}
                        className="h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl font-semibold text-xs tracking-widest transition-all hover:bg-rose-600 hover:text-white active:scale-95"
                      >
                        {t("BUYURTMANI BEKOR QILISH")}
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'IN_PRODUCTION' && (
                    <>
                      <button 
                        onClick={() => { changeStatus(selectedOrder.id, 'READY'); setShowDetail(false); }}
                        className="h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5" />
                        {t("TAYYOR DEB BELGILASH")}
                      </button>
                      <button 
                        onClick={() => { changeStatus(selectedOrder.id, 'CANCELLED'); setShowDetail(false); }}
                        className="h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl font-semibold text-xs tracking-widest transition-all hover:bg-rose-600 hover:text-white active:scale-95"
                      >
                        {t("BUYURTMANI BEKOR QILISH")}
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'READY' && (
                    <>
                      <button 
                        onClick={() => { setShowDetail(false); openPaymentModal(selectedOrder); }}
                        className="h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <DollarSign className="w-5 h-5" />
                        {t("SOTUV VA TO'LOV QABUL QILISH")}
                      </button>
                      <button 
                        onClick={() => { changeStatus(selectedOrder.id, 'CANCELLED'); setShowDetail(false); }}
                        className="h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl font-semibold text-xs tracking-widest transition-all hover:bg-rose-600 hover:text-white active:scale-95"
                      >
                        {t("BUYURTMANI BEKOR QILISH")}
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'SOLD' && (
                    <div className="col-span-2 bg-emerald-50 dark:bg-emerald-900/20 p-10 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800 text-center">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-6">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <h5 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 uppercase tracking-tight mb-2">{t("BUYURTMA SOTILDI")}</h5>
                      <p className="text-sm font-bold text-emerald-600/70 uppercase tracking-widest">
                        {t("TO'LANGAN")}: ${selectedOrder.paidAmount?.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* To'lov Modali - Premium */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/10 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-6 h-6" />
                </div>
                {t("SOTUV VA")} <span className="text-emerald-600">{t("TO'LOV")}</span>
              </h3>
              <button type="button" onClick={() => setShowPaymentModal(false)} aria-label="Close payment modal" className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSellOrder(); }} className="p-10 sm:p-16 overflow-y-auto custom-scrollbar space-y-10">
              {/* Order Summary Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-blue-700 rounded-[2.5rem] p-10 text-white shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="relative z-10 space-y-2">
                  <p className="text-xs font-semibold text-emerald-100 uppercase tracking-widest">{t("JAMI TO'LOV SUMMASI")}</p>
                  <h4 className="text-3xl font-bold tracking-tight leading-none">${selectedOrder.totalAmount?.toFixed(2)}</h4>
                  <p className="text-xs font-bold text-emerald-100/70 uppercase tracking-widest mt-4">
                    â‰ˆ {(selectedOrder.totalAmount * exchangeRates.USD_TO_UZS).toLocaleString()} UZS
                  </p>
                </div>
              </div>

              {/* Payment Grid */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("TO'LOV TURLARI")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest">UZS</span>
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
                      className="w-full bg-transparent font-semibold text-xl text-gray-900 dark:text-white outline-none"
                      placeholder="0"
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest">USD</span>
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
                      className="w-full bg-transparent font-semibold text-xl text-gray-900 dark:text-white outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-widest">CLICK</span>
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
                      className="w-full bg-transparent font-semibold text-xl text-gray-900 dark:text-white outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Debt Section */}
              {(selectedOrder.totalAmount - totalPaymentUSD) > 0.01 && (
                <div className="bg-rose-50 dark:bg-rose-900/20 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-800 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-[10px] font-semibold text-rose-600 uppercase tracking-widest">{t("QOLDIQ QARZ")}</h5>
                        <p className="text-2xl font-bold text-rose-900 dark:text-rose-100 tracking-tight">${(selectedOrder.totalAmount - totalPaymentUSD).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="payment-due-date" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("QARZNI QAYTARISH MUDDATI")}</label>
                    <input
                      id="payment-due-date"
                      type="date"
                      value={paymentForm.dueDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-14 px-6 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-rose-500 rounded-xl font-bold transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-50 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => openDriverPaymentModal(selectedOrder)}
                  className="flex-1 h-16 rounded-[2rem] border-2 border-blue-100 dark:border-blue-800 font-semibold text-[10px] tracking-[0.2em] text-blue-600 hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Truck className="w-4 h-4" />
                  {t("HAYDOVCHI TO'LOVI")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-semibold text-[10px] tracking-[0.2em] shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t("SOTUVNI YAKUNLASH")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Payment Modal - Premium */}
      {showDriverPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <Truck className="w-5 h-5" />
                </div>
                {t("Haydovchi")} <span className="text-blue-600">{t("to'lovi")}</span>
              </h3>
              <button type="button" onClick={() => setShowDriverPaymentModal(false)} aria-label={t("Yopish")} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleDriverPayment(); }} className="p-10 sm:p-16 overflow-y-auto custom-scrollbar space-y-10">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 space-y-8">
                <div className="space-y-3">
                  <label htmlFor="driver-payment-driver-select" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("HAYDOVCHINI TANLANG")}</label>
                  <select
                    id="driver-payment-driver-select"
                    value={driverPaymentForm.driverId}
                    onChange={(e) => setDriverPaymentForm({ ...driverPaymentForm, driverId: e.target.value })}
                    className="w-full h-16 px-6 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm appearance-none outline-none transition-all shadow-sm"
                  >
                    <option value="">{t("Haydovchini tanlang...")}</option>
                    {drivers.filter(d => d.active).map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} - {driver.vehicleNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("TO'LOV USULI")}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'CASH', label: t('NAQD'), icon: Banknote, color: 'emerald' },
                      { id: 'TRANSFER', label: t('BANK'), icon: Landmark, color: 'blue' },
                      { id: 'CLICK', label: t('CLICK'), icon: Smartphone, color: 'purple' }
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setDriverPaymentForm({ ...driverPaymentForm, paymentMethod: method.id })}
                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${
                          driverPaymentForm.paymentMethod === method.id 
                            ? `border-${method.color}-500 bg-${method.color}-50 dark:bg-${method.color}-900/20 shadow-lg shadow-${method.color}-500/10` 
                            : 'border-white dark:border-gray-900 hover:border-gray-100'
                        }`}
                      >
                        <method.icon className={`w-6 h-6 ${driverPaymentForm.paymentMethod === method.id ? `text-${method.color}-600` : 'text-gray-400'}`} />
                        <span className={`text-[9px] font-semibold uppercase tracking-widest ${driverPaymentForm.paymentMethod === method.id ? `text-${method.color}-700` : 'text-gray-400'}`}>
                          {method.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("TO'LOV SUMMASI (USD)")}</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={driverPaymentForm.amount || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.');
                        if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                        setDriverPaymentForm({ ...driverPaymentForm, amount: raw === '' ? 0 : parseFloat(raw) });
                      }}
                      className="w-full h-20 pl-16 pr-8 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] font-bold text-3xl transition-all outline-none shadow-sm text-blue-600"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("IZOH")}</label>
                  <textarea
                    value={driverPaymentForm.notes}
                    onChange={(e) => setDriverPaymentForm({ ...driverPaymentForm, notes: e.target.value })}
                    className="w-full p-8 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] font-bold text-sm min-h-[100px] transition-all outline-none resize-none shadow-sm"
                    placeholder={t("Haydovchi to'lovi haqida...")}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-50 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowDriverPaymentModal(false)}
                  className="flex-1 h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 font-semibold text-sm text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {t("Bekor qilish")}
                </button>
                <button
                  type="submit"
                  className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {t("To'lovni tasdiqlash")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
