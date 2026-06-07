import { useEffect, useState } from 'react';
import CashboxHistory from '../components/CashboxHistory';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  PieChart as PieChartIcon,
  Filter,
  ArrowLeftRight,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  History,
  Settings,
  BookOpen,
  Receipt,
  Users,
  Zap,
  Truck,
  Wrench,
  Building2,
  ShoppingCart,
  MoreHorizontal,
  RefreshCw,
  Plus,
  Loader2,
  X
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  } from 'recharts';
import { exportToExcel } from '../lib/excelUtils';
import { Input } from '../components/Input';
import { extractData, extractArray } from '../lib/apiHelpers';
import '../styles/ultra-modern-design.css';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

export default function Cashbox() {
  // Translation function
  const t = latinToCyrillic;
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'expenses' | 'budget' | 'loans'>('overview');
  const [cashbox, setCashbox] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Per-action in-button spinner flag
  const [submitting, setSubmitting] = useState(false);
  // Destructive category delete confirmation
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
    fromCurrency: 'USD',
    toCurrency: 'UZS',
    amount: '',
    fromType: 'CARD',
    toType: 'CASH',
    description: 'Valyuta ayirboshlash'
  });
  const [form, setForm] = useState({
    amount: '',
    currency: 'USD',
    description: '',
    type: 'CASH' // CASH, CARD, CLICK
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'ALL', // ALL, INCOME, EXPENSE
    paymentMethod: 'ALL' // ALL, CASH, CARD, CLICK
  });
  const [transferForm, setTransferForm] = useState({
    from: 'CASH',
    to: 'CARD',
    amount: '',
    description: ''
  });
  const [exchangeRate, setExchangeRate] = useState(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('cashboxExchangeRate');
    return saved ? parseInt(saved, 10) : 12500;
  });
  const [exchangeRateInput, setExchangeRateInput] = useState(() => {
    const saved = localStorage.getItem('cashboxExchangeRate');
    return saved || '12500';
  });
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    currency: 'UZS',
    category: '',
    paymentMethod: 'CASH',
    description: '',
    receiptNumber: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Xarajat kategoriyalari (default + custom) - with localStorage
  const [customCategories, setCustomCategories] = useState<{id: string, name: string, icon: any, color: string}[]>(() => {
    const saved = localStorage.getItem('cashboxCustomCategories');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('bg-blue-500');

  const categoryColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    'bg-rose-500', 'bg-slate-500', 'bg-gray-500', 'bg-zinc-500'
  ];

  const defaultCategories = [
    { id: 'SALARY', name: 'Ð˜Ñˆ Ò³Ð°Ò›Ð¸', icon: 'Users', color: 'bg-blue-500' },
    { id: 'UTILITIES', name: 'ÐšÐ¾Ð¼Ð¼ÑƒÐ½Ð°Ð»', icon: 'Zap', color: 'bg-yellow-500' },
    { id: 'SUPPLIES', name: 'Ð¢Ð°ÑŠÐ¼Ð¸Ð½Ð¾Ñ‚', icon: 'Truck', color: 'bg-green-500' },
    { id: 'MAINTENANCE', name: 'Ð¢Ð°ÑŠÐ¼Ð¸Ñ€Ð»Ð°Ñˆ', icon: 'Wrench', color: 'bg-orange-500' },
    { id: 'RENT', name: 'Ð˜Ð¶Ð°Ñ€Ð°', icon: 'Building2', color: 'bg-purple-500' },
    { id: 'MARKETING', name: 'ÐœÐ°Ñ€ÐºÐµÑ‚Ð¸Ð½Ð³', icon: 'ShoppingCart', color: 'bg-pink-500' },
    { id: 'OTHER', name: 'Ð‘Ð¾ÑˆÒ›Ð°', icon: 'MoreHorizontal', color: 'bg-gray-500' }
  ];

  const iconMap: Record<string, any> = { Users, Zap, Truck, Wrench, Building2, ShoppingCart, MoreHorizontal };

  // Barcha kategoriyalar (default + custom)
  const expenseCategories = [
    ...defaultCategories.map(c => ({ ...c, icon: iconMap[c.icon] || MoreHorizontal })),
    ...customCategories.map(c => ({ ...c, icon: iconMap[c.icon] || MoreHorizontal }))
  ];
  // Open confirmation dialog for category deletion (destructive)
  const handleDeleteCategory = (categoryId: string) => {
    // Faqat custom kategoriyalarni o'chirish mumkin
    if (defaultCategories.find(c => c.id === categoryId)) {
      addToast({ type: 'warning', title: t('Standart kategoriyalarni ochirib bolmaydi!') });
      return;
    }
    setDeleteCategoryId(categoryId);
  };

  // Confirmed category deletion
  const confirmDeleteCategory = () => {
    if (!deleteCategoryId) return;
    const updated = customCategories.filter(c => c.id !== deleteCategoryId);
    setCustomCategories(updated);
    // Save to localStorage
    localStorage.setItem('cashboxCustomCategories', JSON.stringify(updated));
    addToast({ type: 'success', title: t('Kategoriya ochirildi') });
    setDeleteCategoryId(null);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      addToast({ type: 'warning', title: t('Kategoriya nomini kiriting!') });
      return;
    }

    const newCategory = {
      id: `CUSTOM_${Date.now()}`,
      name: newCategoryName.trim(),
      icon: 'MoreHorizontal',
      color: newCategoryColor
    };

    const updated = [...customCategories, newCategory];
    setCustomCategories(updated);
    // Save to localStorage
    localStorage.setItem('cashboxCustomCategories', JSON.stringify(updated));
    setNewCategoryName('');
    setShowCategoryModal(false);
    addToast({ type: 'success', title: t('Kategoriya qoshildi') });
  };

  // Byudjet state
  const [, setBudgets] = useState<any[]>([]);
  const [, setBudgetLoading] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    amount: '',
    currency: 'UZS',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    alertThreshold: '80'
  });

  // Qarzlar state
  const [, setLoans] = useState<any[]>([]);
  const [, setLoansLoading] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState({
    employeeName: '',
    employeeId: '',
    amount: '',
    currency: 'UZS',
    purpose: '',
    loanDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    repaymentType: 'SALARY_DEDUCTION',
    monthlyDeduction: '',
    notes: ''
  });

  const [limits, setLimits] = useState(() => {
    const saved = localStorage.getItem('cashboxLimits');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      cashLimit: 50000,
      cardLimit: 100000,
      clickLimit: 100000,
      alertEnabled: true
    };
  });
  const [showLimits, setShowLimits] = useState(false);

  useEffect(() => {
    loadCashbox();
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    try {
      const { data } = await api.get('/exchange-rates/pair?from=USD&to=UZS');
      if (data?.data?.rate) {
        setExchangeRate(data.data.rate);
        setExchangeRateInput(data.data.rate.toString());
        localStorage.setItem('cashboxExchangeRate', data.data.rate.toString());
      }
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
    }
  };

  // Byudjet tab ochilganda yuklash
  useEffect(() => {
    if (activeTab === 'budget') {
      loadBudgets();
    }
  }, [activeTab]);

  // Qarzlar tab ochilganda yuklash
  useEffect(() => {
    if (activeTab === 'loans') {
      loadLoans();
    }
  }, [activeTab]);

  const saveExchangeRate = async () => {
    const rate = parseFloat(exchangeRateInput) || 12500;
    try {
      await api.post('/exchange-rates', {
        fromCurrency: 'USD',
        toCurrency: 'UZS',
        rate: rate
      });
      setExchangeRate(rate);
      localStorage.setItem('cashboxExchangeRate', rate.toString());
      setShowExchangeRateModal(false);
      addToast({ type: 'success', title: t('Valyuta kursi muvaffaqiyatli saqlandi!') });
    } catch (error) {
      console.error('Failed to save exchange rate:', error);
      addToast({ type: 'error', title: t('Valyuta kursini saqlashda xatolik yuz berdi!') });
    }
  };

  const loadCashbox = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type !== 'ALL') params.append('type', filters.type);
      if (filters.paymentMethod !== 'ALL') params.append('paymentMethod', filters.paymentMethod);

      console.log('Fetching transactions with params:', params.toString());
      
      const [cashboxRes, transactionsRes, expensesRes] = await Promise.all([
        api.get(`/cashbox/summary?${params.toString()}`),
        api.get(`/cashbox/transactions?limit=50&${params.toString()}`),
        api.get('/expenses?limit=100')
      ]);
      
      // âœ… Handle standardized API response format
      const cashboxData = extractData<any>(cashboxRes, null);
      const transactionsData = extractArray<any>(transactionsRes, []);
      const expensesData = extractArray<any>(expensesRes, []);
      
      console.log('Transactions received:', transactionsData);
      console.log('Transactions count:', transactionsData.length);
      console.log('Income transactions:', transactionsData.filter((t: any) => t.type === 'INCOME').length);
      
      setCashbox(cashboxData);
      setTransactions(transactionsData);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Kassa ma\'lumotlarini yuklashda xatolik', error);
      addToast({ type: 'error', title: t('Malumotlarni yuklashda xatolik') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Byudjetlarni yuklash
  const loadBudgets = async () => {
    setBudgetLoading(true);
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const budgetsResponse = await api.get(`/budgets?month=${currentMonth}&year=${currentYear}`);
      const budgetsData = extractArray<any>(budgetsResponse, []);
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Byudjetlarni yuklashda xatolik:', error);
      setBudgets([]);
    } finally {
      setBudgetLoading(false);
    }
  };

  // Qarzlarni yuklash
  const loadLoans = async () => {
    setLoansLoading(true);
    try {
      // Loans API hali yo'q, mock data ishlatamiz
      setLoans([]);
    } catch (error) {
      console.error('Qarzlarni yuklashda xatolik:', error);
      setLoans([]);
    } finally {
      setLoansLoading(false);
    }
  };

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cashbox/add', {
        amount: parseFloat(form.amount),
        currency: form.currency,
        paymentMethod: form.type,
        description: form.description || 'ÐšÐ°ÑÑÐ° Ñ‚ÑžÐ»Ð´Ð¸Ñ€Ð¸Ñˆ'
      });
      setShowAddMoney(false);
      setForm({ amount: '', currency: 'USD', description: '', type: 'CASH' });
      loadCashbox();
      addToast({ type: 'success', title: t('Kassa muvaffaqiyatli toldirildi!') });
    } catch (error: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: error.response?.data?.error || t('Xatolik yuz berdi') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cashbox/withdraw', {
        amount: parseFloat(form.amount),
        currency: form.currency,
        paymentMethod: form.type,
        description: form.description || 'ÐšÐ°ÑÑÐ° Ñ‡Ð¸Ò›Ð¸Ð¼'
      });
      setShowWithdraw(false);
      setForm({ amount: '', currency: 'USD', description: '', type: 'CASH' });
      loadCashbox();
      addToast({ type: 'success', title: t('Chiqim muvaffaqiyatli amalga oshirildi!') });
    } catch (error: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: error.response?.data?.error || t('Xatolik yuz berdi') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(exchangeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      addToast({ type: 'warning', title: t('Iltimos, togri summa kiriting!') });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/cashbox/exchange', {
        fromCurrency: exchangeForm.fromCurrency,
        toCurrency: exchangeForm.toCurrency,
        amount: amount,
        fromType: exchangeForm.fromType,
        toType: exchangeForm.toType,
        exchangeRate: exchangeRate,
        description: exchangeForm.description || 'Valyuta ayirboshlash'
      });

      setShowExchange(false);
      setExchangeForm({
        fromCurrency: 'USD',
        toCurrency: 'UZS',
        amount: '',
        fromType: 'CARD',
        toType: 'CASH',
        description: 'Valyuta ayirboshlash'
      });
      loadCashbox();
      addToast({ type: 'success', title: t('Valyuta ayirboshlash muvaffaqiyatli amalga oshirildi!') });
    } catch (error: any) {
      console.error('Valyuta ayirboshlashda xatolik:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Valyuta ayirboshlashda xatolik yuz berdi';
      addToast({ type: 'error', title: t('Xatolik'), message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };
  // Xarajat qo'shish - avtomatik kassadan kamayadi
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      addToast({ type: 'warning', title: t('Iltimos, togri summa kiriting!') });
      return;
    }
    if (!expenseForm.category) {
      addToast({ type: 'warning', title: t('Iltimos, kategoriya tanlang!') });
      return;
    }
    setSubmitting(true);
    try {
      // Xarajatni saqlash - kassadan avtomatik kamayadi
      await api.post('/expenses', {
        amount: amount,
        currency: expenseForm.currency,
        category: expenseForm.category,
        paymentMethod: expenseForm.paymentMethod,
        description: expenseForm.description,
        receiptNumber: expenseForm.receiptNumber,
        date: expenseForm.date,
        deductFromCashbox: true // Kassadan avtomatik kamaytirish
      });

      setShowExpenseModal(false);
      setExpenseForm({
        amount: '',
        currency: 'UZS',
        category: '',
        paymentMethod: 'CASH',
        description: '',
        receiptNumber: '',
        date: new Date().toISOString().split('T')[0]
      });
      loadCashbox();
      addToast({ type: 'success', title: t('Xarajat muvaffaqiyatli qoshildi va kassadan kamaytirildi!') });
    } catch (error: any) {
      console.error('Xarajat qo\'shishda xatolik:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Xarajat qo\'shishda xatolik yuz berdi';
      addToast({ type: 'error', title: t('Xatolik'), message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cashbox/transfer', {
        from: transferForm.from,
        to: transferForm.to,
        amount: parseFloat(transferForm.amount),
        description: transferForm.description || 'Ð¢ÑžÐ»Ð¾Ð² ÑƒÑÑƒÐ»Ð»Ð°Ñ€Ð¸ Ð¾Ò›ÑÐ¸Ð´Ð° Ñ‚Ñ€Ð°Ð½ÑÑ„ÐµÑ€',
        exchangeRate: exchangeRate
      });
      setShowTransfer(false);
      setTransferForm({ from: 'CASH', to: 'CARD', amount: '', description: '' });
      loadCashbox();
      addToast({ type: 'success', title: t('Kassa otkazmasi muvaffaqiyatli amalga oshirildi!') });
    } catch (error: any) {
      console.error('Kassa o\'tkazmasida xatolik:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Kassa o\'tkazmasida xatolik yuz berdi';
      addToast({ type: 'error', title: t('Xatolik'), message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/cashbox/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ÐºÐ°ÑÑÐ°-Ò³Ð¸ÑÐ¾Ð±Ð¾Ñ‚-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      addToast({ type: 'error', title: t('PDF eksport qilishda xatolik') });
    }
  };

  const handleExportExcel = () => {
    const dataToExport = transactions.map(tx => ({
      'Sana': new Date(tx.createdAt).toLocaleString('uz-UZ'),
      'Turi': tx.type === 'INCOME' ? 'Kirim' : 'Chiqim',
      'To\'lov usuli': tx.paymentMethod === 'CASH' ? 'Naqd' : tx.paymentMethod === 'CARD' ? 'Karta' : 'Click',
      'Tavsif': tx.description,
      'Summa': tx.amount,
      'Valyuta': tx.currency
    }));
    
    exportToExcel(dataToExport, { fileName: 'Kassa_Tranzaksiyalar', sheetName: 'Tranzaksiyalar' });
  };

  const handleExportExpensesExcel = () => {
    const dataToExport = expenses.map(e => {
      const category = expenseCategories.find(c => c.id === e.category);
      return {
        'Sana': new Date(e.date).toLocaleDateString('uz-UZ'),
        'Kategoriya': category?.name || e.category,
        'To\'lov usuli': e.paymentMethod === 'CASH' ? 'Naqd' : e.paymentMethod === 'CARD' ? 'Karta' : 'Click',
        'Tavsif': e.description,
        'Chek â„–': e.receiptNumber || '-',
        'Summa': e.amount,
        'Valyuta': e.currency
      };
    });
    
    exportToExcel(dataToExport, { fileName: 'Kassa_Xarajatlar', sheetName: 'Xarajatlar' });
  };

  const applyFilters = () => {
    loadCashbox();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: 'ALL',
      paymentMethod: 'ALL'
    });
  };

  // Byudjet yaratish
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/budgets', {
        category: budgetForm.category,
        amount: parseFloat(budgetForm.amount),
        currency: budgetForm.currency,
        month: budgetForm.month,
        year: budgetForm.year,
        alertThreshold: parseFloat(budgetForm.alertThreshold)
      });
      setShowBudgetModal(false);
      setBudgetForm({
        category: '',
        amount: '',
        currency: 'UZS',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        alertThreshold: '80'
      });
      loadBudgets();
      addToast({ type: 'success', title: t('Byudjet muvaffaqiyatli yaratildi!') });
    } catch (error: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: error.response?.data?.error || t('Byudjet yaratishda xatolik') });
    } finally {
      setSubmitting(false);
    }
  };

  // Qarz yaratish
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cashbox/loans', {
        employeeName: loanForm.employeeName,
        employeeId: loanForm.employeeId || null,
        amount: parseFloat(loanForm.amount),
        currency: loanForm.currency,
        purpose: loanForm.purpose,
        loanDate: loanForm.loanDate,
        dueDate: loanForm.dueDate || null,
        repaymentType: loanForm.repaymentType,
        monthlyDeduction: loanForm.monthlyDeduction ? parseFloat(loanForm.monthlyDeduction) : null,
        notes: loanForm.notes
      });
      setShowLoanModal(false);
      setLoanForm({
        employeeName: '',
        employeeId: '',
        amount: '',
        currency: 'UZS',
        purpose: '',
        loanDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        repaymentType: 'SALARY_DEDUCTION',
        monthlyDeduction: '',
        notes: ''
      });
      loadLoans();
      addToast({ type: 'success', title: t('Qarz muvaffaqiyatli yaratildi!') });
    } catch (error: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: error.response?.data?.error || t('Qarz yaratishda xatolik') });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="h-7 w-32 bg-slate-200 rounded-lg animate-pulse" />
            <div className="mt-2 h-4 w-48 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        {/* Dark hero + KPI grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-slate-900 p-6 h-[200px] animate-pulse" />
          <div className="lg:col-span-2 grid grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[120px] animate-pulse" />
            ))}
          </div>
        </div>
        {/* Action buttons skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-white border border-slate-200/70 rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/70">
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    );
  }

  const paymentMethodsData = [
    { name: t('Naqd (UZS)'),   value: cashbox?.byCurrency?.cashUZS  || 0, color: COLORS[0] },
    { name: t('Dollar (USD)'), value: (cashbox?.byCurrency?.cashUSD || 0) * exchangeRate, color: COLORS[1] },
    { name: t('Karta (UZS)'),  value: cashbox?.byCurrency?.cardUZS  || 0, color: COLORS[2] },
    { name: 'Click (UZS)',     value: cashbox?.byCurrency?.clickUZS || 0, color: '#8b5cf6' },
  ];

  // Limit ogohlantirishlari
  const cashWarning  = limits.alertEnabled && (cashbox?.byCurrency?.cashUZS  || 0) > limits.cashLimit;
  const cardWarning  = limits.alertEnabled && (cashbox?.byCurrency?.cardUZS  || 0) > limits.cardLimit;
  const clickWarning = limits.alertEnabled && (cashbox?.byCurrency?.clickUZS || 0) > limits.clickLimit;

  // Active filter count for the period/filter badge
  const activeFilterCount =
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0) +
    (filters.type !== 'ALL' ? 1 : 0) +
    (filters.paymentMethod !== 'ALL' ? 1 : 0);

  const kpiCards = [
    { title: t('Naqd Som'),    value: formatCurrency(cashbox?.byCurrency?.cashUZS  || 0, 'UZS'), icon: Banknote,   tint: 'bg-emerald-50 text-emerald-600' },
    { title: t('Naqd Dollar'), value: formatCurrency(cashbox?.byCurrency?.cashUSD  || 0, 'USD'), icon: DollarSign, tint: 'bg-blue-50 text-blue-600' },
    { title: t('Karta (UZS)'), value: formatCurrency(cashbox?.byCurrency?.cardUZS  || 0, 'UZS'), icon: CreditCard, tint: 'bg-indigo-50 text-indigo-600' },
    { title: 'Click (UZS)',    value: formatCurrency(cashbox?.byCurrency?.clickUZS || 0, 'UZS'), icon: Smartphone, tint: 'bg-purple-50 text-purple-600' },
  ];

  // Period label: from active date filter or "Bugungi holat"
  const periodLabel = filters.startDate || filters.endDate
    ? `${filters.startDate || '...'} — ${filters.endDate || '...'}`
    : t('Bugungi holat');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">{t("Kassa")}</h1>
          <p className="mt-1 text-sm text-slate-500">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            onClick={() => setShowFilters(true)}
            className="relative inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <Filter className="w-4 h-4" />
            {t("Davr")}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => loadCashbox(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t("Yangilash")}
          </button>
        </div>
      </div>

      {/* Top: dark balance hero + KPI grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Premium dark hero: cash balance (primary metric) */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t("Kassa balansi")}</p>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Wallet className="w-[18px] h-[18px] text-indigo-300" />
              </div>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">
              {formatCurrency(cashbox?.totalUSD || 0, 'USD')}
            </p>
            <p className="mt-1.5 text-sm text-slate-400 tabular-nums">{t("Jami (USD ekvivalent)")}</p>
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-8">
              <div>
                <p className="text-xl font-bold tabular-nums text-emerald-400">
                  +{formatCurrency(cashbox?.todayIncome || 0, 'USD')}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{t("Bugungi kirim")}</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-rose-400">
                  -{formatCurrency(cashbox?.todayExpense || 0, 'USD')}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{t("Bugungi chiqim")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-5">
          {kpiCards.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">{kpi.title}</p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.tint}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{kpi.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons: Kirim / Chiqim / Ayirboshlash */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Button variant="success" size="lg" fullWidth leftIcon={<ArrowDownRight className="w-5 h-5" />} onClick={() => setShowAddMoney(true)}>
          {t("Kirim")}
        </Button>
        <Button variant="danger" size="lg" fullWidth leftIcon={<ArrowUpRight className="w-5 h-5" />} onClick={() => setShowWithdraw(true)}>
          {t("Chiqim")}
        </Button>
        <Button variant="secondary" size="lg" fullWidth leftIcon={<ArrowLeftRight className="w-5 h-5" />} onClick={() => setShowExchange(true)}>
          {t("Ayirboshlash")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/70 flex gap-1 overflow-x-auto">
        {[
          { id: 'overview', name: t('Umumiy'), icon: PieChartIcon },
          { id: 'history', name: t('Tarix'), icon: History },
          { id: 'expenses', name: t('Xarajatlar'), icon: Receipt },
          { id: 'budget', name: t('Byudjet'), icon: Wallet },
          { id: 'loans', name: t('Qarzlar'), icon: Users }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'history' ? (
        <div className="animate-in slide-in-from-bottom-10 duration-700">
          <CashboxHistory />
        </div>
      ) : activeTab === 'expenses' ? (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
          {/* Xarajatlar Daftari Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white tracking-tight">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                {t("Xarajatlar")} <span className="text-rose-600">{t("Daftari")}</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold text-sm">
                {t("Barcha xarajatlar ro'yxati va kategoriyalar bo'yicha tahlil")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <button 
                onClick={handleExportExpensesExcel}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-semibold text-xs border border-emerald-100 dark:border-emerald-800 transition-all hover:scale-105"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button 
                onClick={() => setShowCategoryModal(true)} 
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-xs border border-gray-200 dark:border-gray-700 transition-all hover:scale-105"
              >
                <Settings className="w-4 h-4" />
                {t("Sozlamalar")}
              </button>
              <button 
                onClick={() => setShowExpenseModal(true)} 
                className="flex-[2] lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-rose-500/20 transition-all active:scale-95"
              >
                <Receipt className="w-4 h-4" />
                {t("Yangi xarajat")}
              </button>
            </div>
          </div>

          {/* Xarajat Kategoriyalari */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            {expenseCategories.map((category) => {
              const Icon = category.icon;
              const categoryExpenses = expenses.filter(e => e.category === category.id);
              const totalAmount = categoryExpenses.reduce((sum, e) => {
                const amount = e.currency === 'USD' ? e.amount * exchangeRate : e.amount;
                return sum + amount;
              }, 0);
              return (
                <div 
                  key={category.id} 
                  className="group bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className={`${category.color} text-white rounded-2xl p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-current/20 group-hover:rotate-12 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-center text-gray-900 dark:text-white uppercase tracking-wider">{category.name}</p>
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                      {totalAmount.toLocaleString()} UZS
                    </p>
                    <p className="text-[9px] font-bold text-gray-400 text-center uppercase mt-1">
                      {categoryExpenses.length} {t("TA")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Xarajatlar Jadvali */}
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t("Oxirgi Xarajatlar")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("Sana")}</th>
                    <th className="text-left py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("Kategoriya")}</th>
                    <th className="text-left py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("To'lov Usuli")}</th>
                    <th className="text-left py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("Tavsif")}</th>
                    <th className="text-left py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("Chek raqami")}</th>
                    <th className="text-right py-5 px-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("Summa")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {expenses.slice(0, 20).map((expense) => {
                    const category = expenseCategories.find(c => c.id === expense.category);
                    const CategoryIcon = category?.icon || MoreHorizontal;
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="py-5 px-8">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {new Date(expense.date).toLocaleDateString('uz-UZ')}
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-3">
                            {category && (
                              <div className={`${category.color} text-white rounded-xl p-2 shadow-lg shadow-current/10`}>
                                <CategoryIcon className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{category?.name || expense.category}</span>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl w-fit">
                            {expense.paymentMethod === 'CASH' && <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                            {expense.paymentMethod === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                            {expense.paymentMethod === 'CLICK' && <Smartphone className="w-3.5 h-3.5 text-purple-500" />}
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                              {expense.paymentMethod === 'CASH' ? t('Naqd') : 
                               expense.paymentMethod === 'CARD' ? t('Karta') : t('Click')}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                            {expense.description}
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="text-[10px] font-semibold text-gray-400 font-mono tracking-tighter">
                            {expense.receiptNumber || '-'}
                          </div>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            -{formatCurrency(expense.amount, expense.currency)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={Receipt}
                          title={t("Xarajatlar yoq")}
                          description={t("Hozircha xarajatlar mavjud emas. Yangi xarajat qoshish uchun tugmani bosing.")}
                          action={
                            <button
                              onClick={() => setShowExpenseModal(true)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
                            >
                              <Plus className="w-4 h-4" />
                              {t("Yangi xarajat")}
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'budget' ? (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
          {/* Budget Section Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white tracking-tight">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <Wallet className="w-5 h-5" />
                </div>
                {t("Byudjet")} <span className="text-blue-600">{t("Nazorati")}</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold text-sm">
                {t("Har kategoriya uchun oylik byudjet va xarajat nazorati")}
              </p>
            </div>
            <button 
              onClick={() => setShowBudgetModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              {t("Yangi byudjet")}
            </button>
          </div>

          {/* Budget Placeholder */}
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-20 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t("Byudjet boshqaruvi")}</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto text-sm">
              {t("Bu bo'limda har bir xarajat kategoriyasi uchun oylik byudjet belgilash va nazorat qilish mumkin. API integratsiyasi tez orada qo'shiladi.")}
            </p>
          </div>
        </div>
      ) : activeTab === 'loans' ? (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
          {/* Loans Section Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white tracking-tight">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                  <Users className="w-5 h-5" />
                </div>
                {t("Xodim")} <span className="text-purple-600">{t("Qarzlari")}</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold text-sm">
                {t("Xodimlarga berilgan avans va qarzlarni boshqarish")}
              </p>
            </div>
            <button 
              onClick={() => setShowLoanModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 transition-all active:scale-95"
            >
              <Users className="w-4 h-4" />
              {t("Yangi qarz")}
            </button>
          </div>

          {/* Loans Placeholder */}
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-20 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
            <div className="w-24 h-24 bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t("Xodim qarzlari")}</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto text-sm">
              {t("Bu bo'limda xodimlarga berilgan avans va qarzlarni kuzatish, qaytarish jadvalini boshqarish mumkin. API integratsiyasi tez orada qo'shiladi.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Quick utility row: exchange rate + limits */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setShowExchangeRateModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <Settings className="w-4 h-4" />
              {t("Kurs")}: 1$ = <span className="tabular-nums">{exchangeRate.toLocaleString()}</span>
            </button>
            <button
              onClick={() => setShowLimits(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
            >
              <AlertTriangle className="w-4 h-4" />
              {t("Limitlar")}
            </button>
          </div>

          {/* Limit Alerts */}
          {(cashWarning || cardWarning || clickWarning) && (
            <div className="bg-amber-50 border border-amber-200 p-5 sm:p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900 mb-3">{t("Kassa limiti oshdi!")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {cashWarning && (
                      <div className="bg-white/70 p-3.5 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">{t("Naqd UZS")}</p>
                        <p className="text-base font-bold text-amber-900 tabular-nums">{(cashbox?.byCurrency?.cashUZS || 0).toLocaleString()} so'm</p>
                      </div>
                    )}
                    {cardWarning && (
                      <div className="bg-white/70 p-3.5 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">{t("Naqd USD")}</p>
                        <p className="text-base font-bold text-amber-900 tabular-nums">${(cashbox?.byCurrency?.cashUSD || 0).toFixed(2)}</p>
                      </div>
                    )}
                    {clickWarning && (
                      <div className="bg-white/70 p-3.5 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">{t("Click UZS")}</p>
                        <p className="text-base font-bold text-amber-900 tabular-nums">{(cashbox?.byCurrency?.clickUZS || 0).toLocaleString()} so'm</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowLimits(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-colors active:scale-[0.98]"
                  >
                    {t("Limitlarni sozlash")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                  <PieChartIcon className="w-[18px] h-[18px]" />
                </div>
                <h3 className="font-semibold text-slate-900">{t("Taqsimot")}</h3>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        padding: '15px'
                      }}
                      itemStyle={{ fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-6">
                {paymentMethodsData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-medium text-slate-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Calendar className="w-[18px] h-[18px]" />
                </div>
                <h3 className="font-semibold text-slate-900">{t("Haftalik oqim")}</h3>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashbox?.dailyFlow || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        padding: '15px'
                      }}
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[10, 10, 0, 0]} barSize={20} />
                    <Bar dataKey="expense" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Mini Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: t("Bugungi kirim"), value: cashbox?.todayIncome, color: 'text-emerald-600', icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-600' },
              { label: t("Bugungi chiqim"), value: cashbox?.todayExpense, color: 'text-rose-600', icon: TrendingDown, tint: 'bg-rose-50 text-rose-600' },
              { label: t("Oylik kirim"), value: cashbox?.monthlyIncome, color: 'text-emerald-600', icon: Zap, tint: 'bg-emerald-50 text-emerald-600' },
              { label: t("Oylik chiqim"), value: cashbox?.monthlyExpense, color: 'text-rose-600', icon: ShoppingCart, tint: 'bg-rose-50 text-rose-600' }
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">{stat.label}</p>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.tint}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                  </div>
                  <p className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${stat.color}`}>
                    {formatCurrency(stat.value || 0, 'USD')}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">{t("Oxirgi tranzaksiyalar")}</h3>
              <div className="flex gap-2">
                <button onClick={handleExportPDF} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors" aria-label="PDF export" title="PDF">
                  <FileText className="w-4 h-4" />
                </button>
                <button onClick={handleExportExcel} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors" aria-label="Excel export" title="Excel">
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={t("Tranzaksiyalar yoq")}
                description={t("Hozircha kassa tranzaksiyalari mavjud emas. Kirim yoki chiqim qoshganingizdan keyin shu yerda korinadi.")}
                action={
                  <button
                    onClick={() => setShowAddMoney(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    {t("Kirim qoshish")}
                  </button>
                }
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="text-left py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t("Sana")}</th>
                        <th className="text-left py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t("Turi")}</th>
                        <th className="text-left py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t("Usul")}</th>
                        <th className="text-left py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t("Tavsif")}</th>
                        <th className="text-right py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t("Summa")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <div className="text-sm font-semibold text-slate-900 tabular-nums">
                              {new Date(tx.createdAt).toLocaleString('uz-UZ')}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <Badge variant={tx.type === 'INCOME' ? 'success' : 'error'}>
                              {tx.type === 'INCOME' ? t('Kirim') : t('Chiqim')}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                {tx.paymentMethod === 'CASH' && <Banknote className="w-4 h-4" />}
                                {tx.paymentMethod === 'CARD' && <CreditCard className="w-4 h-4" />}
                                {tx.paymentMethod === 'CLICK' && <Smartphone className="w-4 h-4" />}
                              </div>
                              <span className="text-xs font-medium text-slate-600">
                                {tx.paymentMethod === 'CASH' ? t('Naqd') :
                                 tx.paymentMethod === 'CARD' ? t('Karta') : t('Click')}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm text-slate-600 max-w-[300px] truncate">
                              {tx.description}
                            </div>
                          </td>
                          <td className={`py-4 px-6 text-right font-bold text-base tracking-tight tabular-nums ${
                            tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {tx.type === 'INCOME' ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-slate-50">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {tx.type === 'INCOME' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={tx.type === 'INCOME' ? 'success' : 'error'}>
                            {tx.type === 'INCOME' ? t('Kirim') : t('Chiqim')}
                          </Badge>
                          <span className="text-[11px] font-medium text-slate-500">
                            {tx.paymentMethod === 'CASH' ? t('Naqd') :
                             tx.paymentMethod === 'CARD' ? t('Karta') : t('Click')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 truncate">{tx.description || '-'}</p>
                        <p className="text-[11px] text-slate-400 tabular-nums">{new Date(tx.createdAt).toLocaleString('uz-UZ')}</p>
                      </div>
                      <div className={`text-right font-bold text-sm shrink-0 tabular-nums ${
                        tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Kirim Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                {t("Kirim")}
              </h3>
              <button onClick={() => setShowAddMoney(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMoney} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Summa")}</label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 focus:border-emerald-500 transition-all font-bold text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Valyuta")}</label>
                  <select
                    aria-label="Valyuta tanlash"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-lg focus:border-emerald-500 outline-none transition-all appearance-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="UZS">UZS (so'm)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("To'lov Usuli")}</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'CASH', name: t('Naqd'), icon: Banknote, color: 'emerald' },
                    { id: 'CARD', name: t('Karta'), icon: CreditCard, color: 'blue' },
                    { id: 'CLICK', name: t('Click'), icon: Smartphone, color: 'purple' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setForm({ ...form, type: method.id })}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 transition-all ${
                        form.type === method.id 
                          ? `border-${method.color}-500 bg-${method.color}-50 dark:bg-${method.color}-900/20 shadow-lg shadow-${method.color}-500/10` 
                          : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                      }`}
                    >
                      <method.icon className={`w-6 h-6 ${form.type === method.id ? `text-${method.color}-600` : 'text-gray-400'}`} />
                      <span className={`text-xs font-bold uppercase tracking-widest ${form.type === method.id ? `text-${method.color}-700` : 'text-gray-400'}`}>
                        {method.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Tavsif")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-6 rounded-3xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 focus:border-emerald-500 outline-none transition-all font-bold text-sm min-h-[120px] resize-none"
                  placeholder={t("Izoh qoldiring...")}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-16 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-3xl font-bold text-sm tracking-[0.2em] shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {t("TASDIQLASH")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Chiqim Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-rose-50/30 dark:bg-rose-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                {t("Chiqim")}
              </h3>
              <button onClick={() => setShowWithdraw(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleWithdraw} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Summa")}</label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 focus:border-rose-500 transition-all font-bold text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Valyuta")}</label>
                  <select
                    aria-label="Valyuta tanlash"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-lg focus:border-rose-500 outline-none transition-all appearance-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="UZS">UZS (so'm)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("To'lov Usuli")}</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'CASH', name: t('Naqd'), icon: Banknote, color: 'emerald' },
                    { id: 'CARD', name: t('Karta'), icon: CreditCard, color: 'blue' },
                    { id: 'CLICK', name: t('Click'), icon: Smartphone, color: 'purple' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setForm({ ...form, type: method.id })}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 transition-all ${
                        form.type === method.id 
                          ? `border-${method.color}-500 bg-${method.color}-50 dark:bg-${method.color}-900/20 shadow-lg shadow-${method.color}-500/10` 
                          : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                      }`}
                    >
                      <method.icon className={`w-6 h-6 ${form.type === method.id ? `text-${method.color}-600` : 'text-gray-400'}`} />
                      <span className={`text-xs font-bold uppercase tracking-widest ${form.type === method.id ? `text-${method.color}-700` : 'text-gray-400'}`}>
                        {method.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Tavsif")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-6 rounded-3xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 focus:border-rose-500 outline-none transition-all font-bold text-sm min-h-[120px] resize-none"
                  placeholder={t("Izoh qoldiring...")}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-16 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-3xl font-bold text-sm tracking-[0.2em] shadow-2xl shadow-rose-500/30 transition-all active:scale-95"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {t("TASDIQLASH")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                {t("Transfer")}
              </h3>
              <button onClick={() => setShowTransfer(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Qayerdan")}</label>
                  <select
                    aria-label="Qayerdan o'tkazish"
                    value={transferForm.from}
                    onChange={(e) => setTransferForm({ ...transferForm, from: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-sm focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="CASH">{t("Naqd")}</option>
                    <option value="CARD">{t("Karta")}</option>
                    <option value="CLICK">{t("Click")}</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Qayerga")}</label>
                  <select
                    aria-label="Qayerga o'tkazish"
                    value={transferForm.to}
                    onChange={(e) => setTransferForm({ ...transferForm, to: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-sm focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="CASH">{t("Naqd")}</option>
                    <option value="CARD">{t("Karta")}</option>
                    <option value="CLICK">{t("Click")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Summa (USD)")}</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={transferForm.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.');
                    if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                    setTransferForm({ ...transferForm, amount: raw });
                  }}
                  className="h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 focus:border-blue-500 transition-all font-bold text-lg"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Tavsif")}</label>
                <textarea
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  className="w-full p-6 rounded-3xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 focus:border-blue-500 outline-none transition-all font-bold text-sm min-h-[100px] resize-none"
                  placeholder={t("Transfer sababi...")}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-16 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-3xl font-bold text-sm tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {t("TRANSFER QILISH")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Filtrlar Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <Filter className="w-5 h-5 text-emerald-600" />
                {t("FILTRLAR")}
              </h3>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400" aria-label="Yopish">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Boshlanish")}</label>
                  <input
                    type="date"
                    aria-label="Boshlanish sanasi"
                    placeholder="YYYY-MM-DD"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Tugash")}</label>
                  <input
                    type="date"
                    aria-label="Tugash sanasi"
                    placeholder="YYYY-MM-DD"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Turi")}</label>
                <select
                  aria-label="Turi tanlash"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full h-12 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-xs appearance-none"
                >
                  <option value="ALL">{t("Barchasi")}</option>
                  <option value="INCOME">{t("Kirim")}</option>
                  <option value="EXPENSE">{t("Chiqim")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Usul")}</label>
                <select
                  aria-label="To'lov usuli tanlash"
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                  className="w-full h-12 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-xs appearance-none"
                >
                  <option value="ALL">{t("Barchasi")}</option>
                  <option value="CASH">{t("Naqd")}</option>
                  <option value="CARD">{t("Karta")}</option>
                  <option value="CLICK">{t("Click")}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetFilters}
                  className="flex-1 h-12 rounded-xl border-2 border-gray-100 dark:border-gray-800 font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                >
                  {t("TOZALASH")}
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-[2] h-12 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                  {t("QO'LLASH")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Valyuta Ayirboshlash Modal */}
      {showExchange && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-purple-50/30 dark:bg-purple-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                {t("VALYUTA")} <span className="text-purple-600">{t("AYIRBOSHLASH")}</span>
              </h3>
              <button onClick={() => setShowExchange(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleExchange} className="p-10 space-y-8 overflow-y-auto flex-1">
              {/* Kurs inputi */}
              <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-800">
                <label className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest block text-center mb-3">
                  {t("AYIRBOSHLASH KURSI")}: 1 USD =
                </label>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={exchangeRateInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setExchangeRateInput(value);
                      const rate = parseInt(value) || 12500;
                      setExchangeRate(rate);
                    }}
                    className="w-32 h-12 rounded-xl border-2 border-amber-200 dark:border-amber-700 px-4 font-bold text-lg text-center focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                    placeholder="12500"
                  />
                  <span className="font-bold text-amber-800 dark:text-amber-400">so'm</span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500 text-center mt-2">
                  {t("Kursni o'zgartirish mumkin")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("QAYSI VALYUTADAN")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['USD', 'UZS'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setExchangeForm({...exchangeForm, fromCurrency: curr})}
                        className={`py-3 rounded-xl font-bold text-xs transition-all ${
                          exchangeForm.fromCurrency === curr 
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                  <select
                    aria-label="Qaysi hisobdan valyuta almashinuvi"
                    value={exchangeForm.fromType}
                    onChange={(e) => setExchangeForm({...exchangeForm, fromType: e.target.value})}
                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-xs appearance-none"
                  >
                    <option value="CASH">{t("Naqd")}</option>
                    <option value="CARD">{t("Karta")}</option>
                    <option value="CLICK">{t("Click")}</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("QAYSI VALYUTAGA")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['USD', 'UZS'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setExchangeForm({...exchangeForm, toCurrency: curr})}
                        className={`py-3 rounded-xl font-bold text-xs transition-all ${
                          exchangeForm.toCurrency === curr 
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                  <select
                    aria-label="Qaysi hisobga valyuta almashinuvi"
                    value={exchangeForm.toType}
                    onChange={(e) => setExchangeForm({...exchangeForm, toType: e.target.value})}
                    className="w-full h-12 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-xs appearance-none"
                  >
                    <option value="CASH">{t("Naqd")}</option>
                    <option value="CARD">{t("Karta")}</option>
                    <option value="CLICK">{t("Click")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Summa")}</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={exchangeForm.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.');
                    if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                    setExchangeForm({...exchangeForm, amount: raw});
                  }}
                  className="h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 focus:border-purple-500 transition-all font-bold text-lg"
                  placeholder="0.00"
                  required
                />
              </div>

              {exchangeForm.amount && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{t("HISOBLANGAN NATIJA")}</p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 tracking-tight">
                    {parseFloat(exchangeForm.amount).toLocaleString()} {exchangeForm.fromCurrency}
                    <ArrowLeftRight className="inline-block mx-3 w-5 h-5 opacity-30" />
                    <span className="text-emerald-600">
                      {exchangeForm.fromCurrency === 'USD' 
                        ? (parseFloat(exchangeForm.amount) * exchangeRate).toLocaleString()
                        : (parseFloat(exchangeForm.amount) / exchangeRate).toFixed(2)
                      } {exchangeForm.toCurrency}
                    </span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-16 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-3xl font-bold text-sm tracking-[0.2em] shadow-2xl shadow-purple-500/30 transition-all active:scale-95"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeftRight className="w-5 h-5" />}
                {t("ALMASHISHNI TASDIQLASH")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Valyuta kursini sozlash Modal */}
      {showExchangeRateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <Settings className="w-5 h-5 text-amber-500" />
                {t("KURS SOZLAMALARI")}
              </h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">1 USD = ? UZS</label>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Ayirboshlash kursi"
                  placeholder="12500"
                  value={exchangeRateInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.');
                    if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                    setExchangeRateInput(raw);
                  }}
                  className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-2xl text-center focus:border-amber-500 transition-all outline-none"
                />
              </div>
              <button
                onClick={saveExchangeRate}
                className="w-full h-14 bg-gray-900 dark:bg-white dark:text-black text-white rounded-2xl font-bold text-xs tracking-widest transition-all active:scale-95 shadow-xl"
              >
                {t("SAQLASH")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limitlar Modal */}
      {showLimits && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-amber-50/30 dark:bg-amber-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                {t("KASSA LIMITLARI")}
              </h3>
            </div>
            <div className="p-10 space-y-8">
              <button 
                onClick={() => setLimits({ ...limits, alertEnabled: !limits.alertEnabled })}
                className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                  limits.alertEnabled ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${limits.alertEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-xs font-bold uppercase tracking-widest">{t("OGOHLANTIRISHLAR")}</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all relative ${limits.alertEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${limits.alertEnabled ? 'right-1' : 'left-1'}`}></div>
                </div>
              </button>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("NAQD PUL LIMITI (USD)")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={limits.cashLimit}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setLimits({ ...limits, cashLimit: raw === '' ? 0 : parseFloat(raw) });
                    }}
                    className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 font-bold"
                    disabled={!limits.alertEnabled}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("KARTA LIMITI (USD)")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={limits.cardLimit}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setLimits({ ...limits, cardLimit: raw === '' ? 0 : parseFloat(raw) });
                    }}
                    className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 font-bold"
                    disabled={!limits.alertEnabled}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("CLICK LIMITI (USD)")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={limits.clickLimit}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setLimits({ ...limits, clickLimit: raw === '' ? 0 : parseFloat(raw) });
                    }}
                    className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 font-bold"
                    disabled={!limits.alertEnabled}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.setItem('cashboxLimits', JSON.stringify(limits));
                  setShowLimits(false);
                }}
                className="w-full h-16 bg-gray-900 dark:bg-white dark:text-black text-white rounded-[2rem] font-bold text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95"
              >
                {t("SOZLAMALARNI SAQLASH")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xarajatlar Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-rose-50/30 dark:bg-rose-900/10 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
                  <Receipt className="w-6 h-6" />
                </div>
                {t("YANGI")} <span className="text-rose-600">{t("XARAJAT")}</span>
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-10 space-y-8 overflow-y-auto">
              <div className="space-y-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("KATEGORIYA TANLANG")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {expenseCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setExpenseForm({ ...expenseForm, category: category.id })}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          expenseForm.category === category.id
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                            : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                        }`}
                      >
                        <div className={`${category.color} text-white rounded-xl p-2 shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-tight text-left leading-tight">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Summa")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={expenseForm.amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setExpenseForm({ ...expenseForm, amount: raw });
                    }}
                    className="h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 focus:border-rose-500 transition-all font-bold text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Valyuta")}</label>
                  <select
                    aria-label="Valyuta tanlash"
                    value={expenseForm.currency}
                    onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-lg focus:border-rose-500 outline-none transition-all appearance-none"
                  >
                    <option value="UZS">UZS (so'm)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("To'lov Usuli")}</label>
                  <select
                    aria-label="To'lov usuli tanlash"
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-sm focus:border-rose-500 outline-none transition-all appearance-none"
                  >
                    <option value="CASH">{t("Naqd")}</option>
                    <option value="CARD">{t("Karta")}</option>
                    <option value="CLICK">{t("Click")}</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Sana")}</label>
                  <input
                    type="date"
                    aria-label="Sana tanlash"
                    placeholder="YYYY-MM-DD"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-semibold text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("Tavsif")}</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full p-6 rounded-3xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 focus:border-rose-500 outline-none transition-all font-bold text-sm min-h-[100px] resize-none"
                  placeholder={t("Xarajat haqida batafsil...")}
                />
              </div>

              <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-3xl border border-rose-100 dark:border-rose-800 flex items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
                <p className="text-xs font-semibold text-rose-900 dark:text-rose-100 uppercase tracking-tight leading-tight">
                  {t("DIQQAT! BU XARAJAT AVTOMATIK RAVISHDA KASSADAN KAMAYTIRILADI")}
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-16 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-3xl font-bold text-sm tracking-[0.2em] shadow-2xl shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-60"
                disabled={!expenseForm.category || !expenseForm.amount || submitting}
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {t("XARAJATNI TASDIQLASH")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Kategoriya boshqaruvi Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300">
                  <Settings className="w-6 h-6" />
                </div>
                {t("KATEGORIYALAR")}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-10 space-y-10 overflow-y-auto">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] space-y-6">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t("YANGI QO'SHISH")}</h4>
                <div className="space-y-6">
                  <Input
                    label={t("Kategoriya Nomi")}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-14 rounded-xl font-bold"
                    placeholder={t("Masalan: Transport...")}
                  />
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("RANG TANLANG")}</label>
                    <div className="flex flex-wrap gap-2">
                      {categoryColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategoryColor(color)}
                          title={`Rang: ${color}`}
                          aria-label={`Rang: ${color}`}
                          className={`w-8 h-8 rounded-full ${color} transition-all ${
                            newCategoryColor === color ? 'ring-4 ring-offset-4 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-110'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={handleAddCategory}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs tracking-widest shadow-xl shadow-emerald-500/20"
                    disabled={!newCategoryName.trim()}
                  >
                    {t("QO'SHISH")}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("MAVJUD KATEGORIYALAR")}</h4>
                <div className="grid grid-cols-1 gap-3">
                  {expenseCategories.map((category) => {
                    const Icon = category.icon;
                    const isDefault = defaultCategories.some(d => d.id === category.id);
                    return (
                      <div key={category.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl group transition-all hover:border-gray-200">
                        <div className="flex items-center gap-4">
                          <div className={`${category.color} text-white rounded-xl p-2 shadow-lg shadow-current/10`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-tight">{category.name}</p>
                            {isDefault && <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{t("STANDART")}</p>}
                          </div>
                        </div>
                        {!isDefault && (
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            title="O'chirish"
                            aria-label="O'chirish"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Byudjet Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                  <Wallet className="w-6 h-6" />
                </div>
                {t("YANGI")} <span className="text-blue-600">{t("BYUDJET")}</span>
              </h3>
              <button onClick={() => setShowBudgetModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBudget} className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("KATEGORIYA")}</label>
                <select
                  aria-label="Kategoriya tanlash"
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-sm focus:border-blue-500 outline-none transition-all appearance-none"
                  required
                >
                  <option value="">{t("Kategoriya tanlang...")}</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("SUMMA")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={budgetForm.amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setBudgetForm({ ...budgetForm, amount: raw });
                    }}
                    className="h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 focus:border-blue-500 transition-all font-bold text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("VALYUTA")}</label>
                  <select
                    aria-label="Valyuta tanlash"
                    value={budgetForm.currency}
                    onChange={(e) => setBudgetForm({ ...budgetForm, currency: e.target.value })}
                    className="w-full h-16 rounded-2xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-6 font-bold text-lg focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="UZS">UZS (so'm)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("OY")}</label>
                  <select
                    aria-label="Oy tanlash"
                    value={budgetForm.month}
                    onChange={(e) => setBudgetForm({ ...budgetForm, month: parseInt(e.target.value) })}
                    className="w-full h-14 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-sm focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("YIL")}</label>
                  <select
                    aria-label="Yil tanlash"
                    value={budgetForm.year}
                    onChange={(e) => setBudgetForm({ ...budgetForm, year: parseInt(e.target.value) })}
                    className="w-full h-14 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-sm focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("OGohlantirish %")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={budgetForm.alertThreshold}
                    onChange={(e) => setBudgetForm({ ...budgetForm, alertThreshold: e.target.value })}
                    className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus:border-blue-500 transition-all font-bold text-sm"
                    placeholder="80"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-16 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-bold text-sm tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-60"
                disabled={!budgetForm.category || !budgetForm.amount || submitting}
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {t("BYUDJETNI SAQLASH")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Qarz Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-purple-50/30 dark:bg-purple-900/10 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                {t("YANGI")} <span className="text-purple-600">{t("QARZ")}</span>
              </h3>
              <button onClick={() => setShowLoanModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLoan} className="p-10 space-y-6 overflow-y-auto">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("XODIM ISMI")}</label>
                <Input
                  type="text"
                  value={loanForm.employeeName}
                  onChange={(e) => setLoanForm({ ...loanForm, employeeName: e.target.value })}
                  className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus:border-purple-500 transition-all font-bold"
                  placeholder={t("FIO kiriting...")}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("SUMMA")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={loanForm.amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setLoanForm({ ...loanForm, amount: raw });
                    }}
                    className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus:border-purple-500 transition-all font-bold"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("VALYUTA")}</label>
                  <select
                    aria-label="Valyuta tanlash"
                    value={loanForm.currency}
                    onChange={(e) => setLoanForm({ ...loanForm, currency: e.target.value })}
                    className="w-full h-14 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-sm focus:border-purple-500 outline-none transition-all appearance-none"
                  >
                    <option value="UZS">UZS (so'm)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("MAQSAD")}</label>
                <Input
                  type="text"
                  value={loanForm.purpose}
                  onChange={(e) => setLoanForm({ ...loanForm, purpose: e.target.value })}
                  className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus:border-purple-500 transition-all font-bold"
                  placeholder={t("Qarz maqsadi...")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("BERILGAN SANA")}</label>
                  <input
                    type="date"
                    aria-label="Berilgan sana"
                    placeholder="YYYY-MM-DD"
                    value={loanForm.loanDate}
                    onChange={(e) => setLoanForm({ ...loanForm, loanDate: e.target.value })}
                    className="w-full h-14 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-sm outline-none"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("QAYTARISH SANASI")}</label>
                  <input
                    type="date"
                    aria-label="Qaytarish sanasi"
                    placeholder="YYYY-MM-DD"
                    value={loanForm.dueDate}
                    onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                    className="w-full h-14 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("QAYTARISH TURI")}</label>
                  <select
                    aria-label="Qaytarish turi tanlash"
                    value={loanForm.repaymentType}
                    onChange={(e) => setLoanForm({ ...loanForm, repaymentType: e.target.value })}
                    className="w-full h-14 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 px-4 font-bold text-sm focus:border-purple-500 outline-none transition-all appearance-none"
                  >
                    <option value="SALARY_DEDUCTION">{t("Ish haqidan ushlab qolish")}</option>
                    <option value="MANUAL">{t("Qo'lda to'lash")}</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("OYLIK USHLAB QOLISH")}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={loanForm.monthlyDeduction}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw !== '' && isNaN(Number(raw)) && raw !== '.') return;
                      setLoanForm({ ...loanForm, monthlyDeduction: raw });
                    }}
                    className="h-14 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus:border-purple-500 transition-all font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">{t("IZOH")}</label>
                <textarea
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                  className="w-full p-4 rounded-xl border-2 border-gray-100 dark:bg-gray-800 dark:border-gray-800 focus:border-purple-500 outline-none transition-all font-bold text-sm min-h-[80px] resize-none"
                  placeholder={t("Qo'shimcha ma'lumot...")}
                />
              </div>

              <button
                type="submit"
                className="w-full h-16 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-3xl font-bold text-sm tracking-[0.2em] shadow-2xl shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-60"
                disabled={!loanForm.employeeName || !loanForm.amount || submitting}
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {t("QARZNI SAQLASH")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Kategoriya o'chirish tasdig'i */}
      <ConfirmDialog
        isOpen={deleteCategoryId !== null}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={confirmDeleteCategory}
        title={t("Kategoriyani ochirish")}
        message={t("Bu kategoriyani ochirmoqchimisiz? Bu amalni qaytarib bolmaydi.")}
        confirmText={t("Ochirish")}
        cancelText={t("Bekor qilish")}
        variant="danger"
      />
    </div>
  );
}
