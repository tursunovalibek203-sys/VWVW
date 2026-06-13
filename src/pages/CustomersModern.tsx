import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  X,
  FileSpreadsheet,
  RefreshCw,
  ShieldAlert,
  Crown,
  Layers,
  Pencil,
  AlertCircle,
} from 'lucide-react';

interface ColorRule {
  id: string;
  name: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
  conditions: { field: 'debtUSD' | 'debtUZS' | 'monthlySales' | 'debtPeriod'; operator: '>' | '<' | '>=' | '<='; value: number }[];
  logic: 'AND' | 'OR';
}

const DEFAULT_RULES: ColorRule[] = [
  { id: 'r1', name: "Qarz to'lamagan", color: 'red', logic: 'AND', conditions: [{ field: 'debtUSD', operator: '>=', value: 10000 }, { field: 'debtPeriod', operator: '>=', value: 30 }] },
  { id: 'r2', name: "Kam savdo", color: 'red', logic: 'AND', conditions: [{ field: 'monthlySales', operator: '<', value: 5000 }] },
];

const STORAGE_KEY = 'customer_color_rules_v2';

const loadRules = (): ColorRule[] => {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_RULES; } catch { return DEFAULT_RULES; }
};
const saveRules = (rules: ColorRule[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); } catch {} };

const RULE_COLORS: { value: ColorRule['color']; label: string; cls: string; dot: string }[] = [
  { value: 'red',    label: 'Qizil',   cls: 'bg-rose-50 text-rose-700 border-rose-200',     dot: 'bg-rose-500' },
  { value: 'orange', label: "To'q sariq", cls: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { value: 'yellow', label: 'Sariq',   cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  { value: 'green',  label: 'Yashil',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'blue',   label: "Ko'k",    cls: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  { value: 'purple', label: 'Binafsha',cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
];

const FIELDS = [
  { value: 'debtUSD',      label: 'Qarz ($)' },
  { value: 'debtUZS',      label: "Qarz (so'm)" },
  { value: 'monthlySales', label: 'Oylik savdo ($)' },
  { value: 'debtPeriod',   label: 'Qarz muddati (kun)' },
] as const;

const OPERATORS = ['>', '<', '>=', '<='] as const;
import { latinToCyrillic } from '../lib/transliterator';
import { getExchangeRates } from '../lib/settings';
import api from '../lib/professionalApi';
import { extractArray, extractData } from '../lib/apiHelpers';
import { customerSchema, CustomerFormData } from '../lib/validation';
import { ValidatedForm } from '../components/forms/ValidatedForm';
import { FormField, FormActions } from '../components/forms/FormField';
import { useToast, toast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string;
  balance: number;  // UZS (backward compatibility)
  balanceUZS: number;
  balanceUSD: number;
  debt: number;  // UZS (backward compatibility)
  debtUZS: number;
  debtUSD: number;
  createdAt: string;
  // Qo'shimcha maydonlar
  monthlySales?: number; // Oylik savdo ($)
  totalSales?: number; // Jami savdo
  lastSaleDate?: string; // Oxirgi sana
  debtPeriod?: number; // Qarz necha kundan beri (kun)
  statusColor?: 'green' | 'yellow' | 'red'; // Rang indikatori
}

export default function CustomersModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCashier = location.pathname.startsWith('/cashier');
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [usdRate, setUsdRate] = useState(12700);
  const [rules, setRules] = useState<ColorRule[]>(loadRules);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ColorRule | null>(null);
  const [ruleForm, setRuleForm] = useState<Omit<ColorRule, 'id'>>({ name: '', color: 'red', logic: 'AND', conditions: [{ field: 'debtUSD', operator: '>=', value: 0 }] });
  // UI-only: delete confirmation target (replaces window.confirm)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Form validation states
  const [customerFormLoading, setCustomerFormLoading] = useState(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  const [customerFormSuccess, setCustomerFormSuccess] = useState<string | null>(null);

  // Rang sozlamalari - faqat memory da (localStorage o'chirildi)
  const [colorSettings, setColorSettings] = useState({
    greenThreshold: 600,    // Yashil uchun minimum
    yellowThreshold: 100,   // Sariq uchun minimum, undan kam = qizil
    debtPeriodThreshold: 30 // Qarz muddati kunlarda
  });
  const [showSettings, setShowSettings] = useState(false);

  // Sozlamalarni saqlash - faqat memory da
  const saveSettings = () => {
    setShowSettings(false);
    // Mijozlarni qayta yuklash
    loadCustomers();
  };

  const categories = ['all', 'NORMAL', 'VIP', 'WHOLESALE'];

  const matchRule = (c: Customer, rule: ColorRule): boolean => {
    const get = (field: ColorRule['conditions'][0]['field']): number => {
      if (field === 'debtUSD') return c.debtUSD || 0;
      if (field === 'debtUZS') return c.debtUZS || 0;
      if (field === 'monthlySales') return c.monthlySales || 0;
      if (field === 'debtPeriod') return c.debtPeriod || 0;
      return 0;
    };
    const results = rule.conditions.map(({ field, operator, value }) => {
      const v = get(field);
      if (operator === '>') return v > value;
      if (operator === '<') return v < value;
      if (operator === '>=') return v >= value;
      return v <= value;
    });
    return rule.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  };

  const getCustomerRule = (c: Customer): ColorRule | null =>
    rules.find(r => matchRule(c, r)) ?? null;

  const saveAndUpdateRules = (newRules: ColorRule[]) => { setRules(newRules); saveRules(newRules); };

  const openAddRule = () => {
    setEditingRule(null);
    setRuleForm({ name: '', color: 'red', logic: 'AND', conditions: [{ field: 'debtUSD', operator: '>=', value: 0 }] });
  };

  const openEditRule = (rule: ColorRule) => {
    setEditingRule(rule);
    setRuleForm({ name: rule.name, color: rule.color, logic: rule.logic, conditions: rule.conditions.map(c => ({ ...c })) });
  };

  const deleteRule = (id: string) => saveAndUpdateRules(rules.filter(r => r.id !== id));

  const submitRuleForm = () => {
    if (!ruleForm.name.trim() || ruleForm.conditions.length === 0) return;
    if (editingRule) {
      saveAndUpdateRules(rules.map(r => r.id === editingRule.id ? { ...ruleForm, id: editingRule.id } : r));
    } else {
      saveAndUpdateRules([...rules, { ...ruleForm, id: `r${Date.now()}` }]);
    }
    setEditingRule(null);
    setRuleForm({ name: '', color: 'red', logic: 'AND', conditions: [{ field: 'debtUSD', operator: '>=', value: 0 }] });
  };

  const addCondition = () => setRuleForm(f => ({ ...f, conditions: [...f.conditions, { field: 'debtUSD', operator: '>=', value: 0 }] }));
  const removeCondition = (i: number) => setRuleForm(f => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }));
  const updateCondition = (i: number, patch: Partial<ColorRule['conditions'][0]>) =>
    setRuleForm(f => ({ ...f, conditions: f.conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c) }));

  // Mijozlarni yuklash funksiyasi
  const loadCustomers = async () => {
    try {
      setLoading(true);

      // Parallel: mijozlar + oylik savdo statistikasi
      const [customersResponse, statsResponse] = await Promise.allSettled([
        api.get('/customers'),
        api.get('/customers/stats/monthly'),
      ]);

      const customersData = customersResponse.status === 'fulfilled'
        ? extractArray(customersResponse.value, []) : [];

      const statsMap: Record<string, { monthlySales: number; lastSaleDate: string | null }> =
        statsResponse.status === 'fulfilled' ? (statsResponse.value.data ?? {}) : {};

      const now = new Date().getTime();

      const enrichedCustomers = customersData.map((c: any) => {
        const stat = statsMap[c.id];
        const monthlySales = stat?.monthlySales ?? 0;
        const lastSaleDateValue = stat?.lastSaleDate
          ?? (c.lastPurchase ? c.lastPurchase : undefined);

        const balanceUZS = c.balanceUZS || c.balance || 0;
        const balanceUSD = c.balanceUSD || 0;
        const debtUZS    = c.debtUZS || 0;
        const debtUSD    = c.debtUSD || 0;

        let debtPeriod = 0;
        const totalDebt = debtUZS + debtUSD * 12500;
        if (totalDebt > 0 && lastSaleDateValue) {
          debtPeriod = Math.floor((now - new Date(lastSaleDateValue).getTime()) / 86_400_000);
        }

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          category: c.category,
          balance: balanceUZS,
          balanceUZS,
          balanceUSD,
          debt: debtUZS,
          debtUZS,
          debtUSD,
          createdAt: c.createdAt,
          monthlySales,
          totalSales: 0,
          lastSaleDate: lastSaleDateValue,
          debtPeriod,
          statusColor: 'green' as const,
        };
      });

      setCustomers(enrichedCustomers);
      setLastUpdated(new Date());
    } catch {
      // Error handled by empty customers state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getExchangeRates().then(r => setUsdRate(r.USD_TO_UZS || 12700)).catch(() => {});
    loadCustomers();

    // Avto-yangilash har 30 soniyada
    const intervalId = setInterval(() => {
      loadCustomers();
    }, 30000);

    // Oyna fokusga kelganda yangilash
    const handleFocus = () => {
      loadCustomers();
    };
    window.addEventListener('focus', handleFocus);

    // Tozalash
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    let filtered = customers;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(customer => customer.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, selectedCategory, searchTerm]);

  const handleAddCustomer = async (data: CustomerFormData) => {
    setCustomerFormLoading(true);
    setCustomerFormError(null);
    setCustomerFormSuccess(null);

    try {
      const response = await api.post('/customers', data);
      const createdCustomer = extractData<any>(response, null);

      if (createdCustomer) {
        const customer: Customer = {
          id: createdCustomer.id,
          name: createdCustomer.name,
          email: createdCustomer.email,
          phone: createdCustomer.phone,
          address: createdCustomer.address,
          category: createdCustomer.category,
          balance: createdCustomer.balanceUZS || createdCustomer.balance || 0,
          balanceUZS: createdCustomer.balanceUZS || createdCustomer.balance || 0,
          balanceUSD: createdCustomer.balanceUSD || 0,
          debt: createdCustomer.debtUZS || 0,
          debtUZS: createdCustomer.debtUZS || 0,
          debtUSD: createdCustomer.debtUSD || 0,
          createdAt: createdCustomer.createdAt
        };

        setCustomers([...customers, customer]);
        setShowAddForm(false);

        // Show success message
        addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Mijoz muvaffaqiyatli qo\'shildi!')));
      }
    } catch (error: any) {
      console.error('Customer creation error:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), error.response?.data?.error || latinToCyrillic('Mijoz qo\'shishda xatolik yuz berdi')));
    } finally {
      setCustomerFormLoading(false);
    }
  };

  // Mijozni o'chirish (ConfirmDialog tasdiqlagandan keyin)
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    const id = customerToDelete.id;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(customers.filter(c => c.id !== id));
      addToast(toast.success(latinToCyrillic('Muvaffaqiyatli'), latinToCyrillic('Mijoz muvaffaqiyatli o\'chirildi!')));
    } catch (error) {
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Mijozni o\'chirishda xatolik yuz berdi!')));
    } finally {
      setCustomerToDelete(null);
    }
  };

  // Kategoriya Badge varianti: VIP=info, WHOLESALE=success, NORMAL=neutral, RISK/PROBLEMATIC=error
  const getCategoryVariant = (category: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (category) {
      case 'VIP': return 'info';
      case 'WHOLESALE': return 'success';
      case 'PROBLEMATIC':
      case 'RISK': return 'error';
      case 'NORMAL': return 'neutral';
      default: return 'neutral';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'VIP': return 'VIP';
      case 'WHOLESALE': return latinToCyrillic('Optom');
      case 'NORMAL': return latinToCyrillic('Oddiy');
      case 'PROBLEMATIC':
      case 'RISK': return latinToCyrillic('Xavfli');
      case 'NEW': return latinToCyrillic('Yangi');
      default: return category;
    }
  };

  const avatarTint = (rule: ColorRule | null) => {
    if (!rule) return 'bg-indigo-50 text-indigo-600';
    return RULE_COLORS.find(c => c.value === rule.color)?.cls ?? 'bg-indigo-50 text-indigo-600';
  };

  const ruleBadge = (rule: ColorRule | null) => {
    if (!rule) return null;
    const rc = RULE_COLORS.find(c => c.value === rule.color);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${rc?.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${rc?.dot}`} />
        {rule.name}
      </span>
    );
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const hasActiveFilters = !!searchTerm || selectedCategory !== 'all';
  const totalDebtUZS = customers.reduce((sum, c) => sum + (c.debtUZS || 0), 0);
  const totalDebtUSD = customers.reduce((sum, c) => sum + (c.debtUSD || 0), 0);
  const totalDebtInUSD = totalDebtUSD + (usdRate > 0 ? totalDebtUZS / usdRate : 0);
  const vipCount = customers.filter(c => c.category === 'VIP').length;

  const stats = [
    {
      label: latinToCyrillic('Jami mijozlar'),
      value: customers.length.toLocaleString('en-US'),
      icon: Users,
      tint: 'bg-sky-50 text-sky-600',
      sub: null,
    },
    {
      label: latinToCyrillic('VIP mijozlar'),
      value: vipCount.toLocaleString('en-US'),
      icon: Crown,
      tint: 'bg-emerald-50 text-emerald-600',
      sub: null,
    },
    {
      label: latinToCyrillic("Qarz (so'm)"),
      value: `${totalDebtUZS.toLocaleString('en-US')} so'm`,
      icon: TrendingUp,
      tint: 'bg-amber-50 text-amber-600',
      sub: usdRate > 0 ? `≈ $${(totalDebtUZS / usdRate).toFixed(0)}` : null,
    },
    {
      label: latinToCyrillic('Qarz ($)'),
      value: `$${totalDebtUSD.toLocaleString('en-US')}`,
      icon: DollarSign,
      tint: 'bg-rose-50 text-rose-600',
      sub: latinToCyrillic(`Jami: ~$${Math.round(totalDebtInUSD).toLocaleString('en-US')}`),
    },
  ];

  // Barcha mijozlarni Excel formatida eksport qilish
  const handleExportAllCustomers = () => {
    try {
      if (customers.length === 0) {
        addToast(toast.warning(latinToCyrillic('Diqqat'), latinToCyrillic('Mijozlar ro\'yxati bo\'sh!')));
        return;
      }

      // CSV sarlavhalari
      const headers = [
        latinToCyrillic('No'),
        latinToCyrillic('Mijoz nomi'),
        latinToCyrillic('Telefon'),
        latinToCyrillic('Kategoriya'),
        latinToCyrillic('Balans (UZS)'),
        latinToCyrillic('Balans (USD)'),
        latinToCyrillic('Qarz (UZS)'),
        latinToCyrillic('Qarz (USD)'),
        latinToCyrillic('Oylik savdo ($)'),
        latinToCyrillic('Jami savdo ($)'),
        latinToCyrillic('Manzil')
      ];

      // Ma'lumotlarni qatorlarga aylantirish
      const rows = customers.map((customer, index) => {
        return [
          (index + 1).toString(),
          customer.name,
          customer.phone || '-',
          customer.category,
          (customer.balance || 0).toLocaleString(),
          ((customer.balance || 0) / 12500).toFixed(2), // USD da taxminiy konvertatsiya
          (customer.debt || 0).toLocaleString(),
          ((customer.debt || 0) / 12500).toFixed(2),
          (customer.monthlySales || 0).toFixed(2),
          (customer.totalSales || 0).toFixed(2),
          customer.address || '-'
        ];
      });

      // CSV yaratish
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        )
      ].join('\n');

      // BOM (Byte Order Mark) qo'shish
      const BOM = '﻿';
      const fullContent = BOM + csvContent;

      // Faylni yuklab olish
      const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `${latinToCyrillic('Mijozlar_Royxati')}_${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast(toast.success(
        latinToCyrillic('Muvaffaqiyatli'),
        latinToCyrillic(`${customers.length} ta mijoz eksport qilindi!`)
      ));
    } catch (error) {
      console.error('Export xatolik:', error);
      addToast(toast.error(latinToCyrillic('Xatolik'), latinToCyrillic('Eksport qilishda xatolik yuz berdi')));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: clean title + count + actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Mijozlar')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 tabular-nums">
            {loading
              ? latinToCyrillic('Yuklanmoqda...')
              : `${filteredCustomers.length.toLocaleString('en-US')} ${latinToCyrillic('ta mijoz')}`}
            {!loading && lastUpdated && (
              <span className="text-slate-400 ml-2">
                &middot; {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{latinToCyrillic('Yangilash')}</span>
          </button>
          <button
            onClick={() => { setShowRulesModal(true); openAddRule(); }}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">{latinToCyrillic('Guruhlash')}</span>
          </button>
          {isCashier && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {latinToCyrillic('Yangi mijoz')}
            </button>
          )}
        </div>
      </div>

      {/* Stat cards: premium white */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[104px] animate-pulse" />
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
                  <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                    {stat.value}
                  </p>
                  {stat.sub && (
                    <p className="mt-1 text-xs font-semibold text-slate-500">{stat.sub}</p>
                  )}
                </div>
              );
            })}
      </div>

      {/* Search / filter card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
            <input
              id="customers-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={latinToCyrillic('Ism, telefon, email yoki manzil...')}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Category Filter */}
            <div className="relative flex-1 sm:flex-none">
              <label htmlFor="category-filter" className="sr-only">Kategoriya filtri</label>
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 focus:bg-white transition-all"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? latinToCyrillic('Barcha kategoriya') : getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* Export */}
            <button
              onClick={handleExportAllCustomers}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-colors active:scale-[0.98]"
              title={latinToCyrillic('Barcha mijozlarni eksport qilish')}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{latinToCyrillic('Excel')}</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center justify-center w-11 px-0 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 transition-colors active:scale-[0.98]"
              title={latinToCyrillic('Rang sozlamalari')}
              aria-label={latinToCyrillic('Rang sozlamalari')}
            >
              <Settings className="w-4 h-4" />
            </button>
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
      {!loading && filteredCustomers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={Users}
            title={
              hasActiveFilters
                ? latinToCyrillic('Mijozlar topilmadi')
                : latinToCyrillic("Hali mijozlar yo'q")
            }
            description={
              hasActiveFilters
                ? latinToCyrillic("Qidiruv shartlarini o'zgartirib qayta urinib ko'ring")
                : latinToCyrillic("Birinchi mijozni qo'shing va u shu yerda ko'rinadi")
            }
            action={isCashier ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {latinToCyrillic('Yangi mijoz')}
              </button>
            ) : undefined}
          />
        </div>
      )}

      {/* Customers table (desktop) */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Mijoz')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Aloqa')}</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Kategoriya')}</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Balans')}</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Qarz')}</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3.5">{latinToCyrillic('Amallar')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarTint(getCustomerRule(customer))}`}>
                          {getInitials(customer.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                          {ruleBadge(getCustomerRule(customer))}
                          {!getCustomerRule(customer) && customer.address && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{customer.address}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {customer.phone && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5 tabular-nums">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {customer.phone}
                          </p>
                        )}
                        {customer.email && (
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </p>
                        )}
                        {!customer.phone && !customer.email && (
                          <span className="text-sm text-slate-300">&mdash;</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getCategoryVariant(customer.category)}>
                        <span className="inline-flex items-center gap-1">
                          {customer.category === 'VIP' && <Crown className="w-3 h-3" />}
                          {(customer.category === 'RISK' || customer.category === 'PROBLEMATIC') && <ShieldAlert className="w-3 h-3" />}
                          {getCategoryLabel(customer.category)}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{customer.balance.toLocaleString('en-US')} so'm</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {customer.debtUSD > 0 || customer.debtUZS > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {customer.debtUSD > 0 && (
                            <Badge variant="error"><span className="tabular-nums">${customer.debtUSD.toFixed(2)}</span></Badge>
                          )}
                          {customer.debtUZS > 0 && (
                            <Badge variant="error"><span className="tabular-nums">{customer.debtUZS.toLocaleString('en-US')} so'm</span></Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 tabular-nums">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(isCashier ? `/cashier/customers/${customer.id}` : `/customers/${customer.id}`)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          aria-label={latinToCyrillic("Mijozni ko'rish")}
                          title={latinToCyrillic("Ko'rish")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerToDelete(customer)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          aria-label={latinToCyrillic("Mijozni o'chirish")}
                          title={latinToCyrillic("O'chirish")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers cards (mobile) */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200/70 p-4 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarTint(getCustomerRule(customer))}`}>
                    {getInitials(customer.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={getCategoryVariant(customer.category)}>
                  <span className="inline-flex items-center gap-1">
                    {customer.category === 'VIP' && <Crown className="w-3 h-3" />}
                    {(customer.category === 'RISK' || customer.category === 'PROBLEMATIC') && <ShieldAlert className="w-3 h-3" />}
                    {getCategoryLabel(customer.category)}
                  </span>
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Balans')}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">{customer.balance.toLocaleString('en-US')} so'm</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{latinToCyrillic('Qarz')}</p>
                  <p className={`mt-0.5 text-sm font-bold tabular-nums ${customer.debtUZS > 0 || customer.debtUSD > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {customer.debtUSD > 0 && <span>${customer.debtUSD.toFixed(2)} </span>}
                    {customer.debtUZS > 0
                      ? `${customer.debtUZS.toLocaleString('en-US')} so'm`
                      : !customer.debtUSD && '0'}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                {customer.address ? (
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </span>
                ) : <span />}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(isCashier ? `/cashier/customers/${customer.id}` : `/customers/${customer.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {latinToCyrillic("Ko'rish")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerToDelete(customer)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label={latinToCyrillic("Mijozni o'chirish")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation (replaces window.confirm) */}
      <ConfirmDialog
        isOpen={customerToDelete !== null}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={latinToCyrillic("Mijozni o'chirish")}
        message={
          customerToDelete
            ? latinToCyrillic(`"${customerToDelete.name}" mijozini rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`)
            : ''
        }
        confirmText={latinToCyrillic("O'chirish")}
        cancelText={latinToCyrillic('Bekor qilish')}
      />

      {/* Color Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">{latinToCyrillic('Rang sozlamalari')}</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title={latinToCyrillic('Yopish')}
                aria-label={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <label className="block text-sm font-medium text-emerald-700 mb-1">
                  {latinToCyrillic('Yashil rang uchun minimum ($)')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(colorSettings.greenThreshold)}
                  onChange={(e) => setColorSettings({ ...colorSettings, greenThreshold: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="600"
                />
                <p className="text-xs text-emerald-600 mt-1">
                  {latinToCyrillic('Shunchadan yuqori savdo = Yashil')}
                </p>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <label className="block text-sm font-medium text-yellow-700 mb-1">
                  {latinToCyrillic('Sariq rang uchun minimum ($)')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(colorSettings.yellowThreshold)}
                  onChange={(e) => setColorSettings({ ...colorSettings, yellowThreshold: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="100"
                />
                <p className="text-xs text-yellow-600 mt-1">
                  {colorSettings.yellowThreshold}$ - {colorSettings.greenThreshold}$ {latinToCyrillic('= Sariq')}
                </p>
              </div>

              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <label className="block text-sm font-medium text-rose-700 mb-1">
                  {latinToCyrillic('Qarz muddati ogohlantirish (kun)')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(colorSettings.debtPeriodThreshold)}
                  onChange={(e) => setColorSettings({ ...colorSettings, debtPeriodThreshold: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                  className="w-full px-3 py-2 border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="30"
                />
                <p className="text-xs text-rose-600 mt-1">
                  {latinToCyrillic('Shunchadan oshiq qarz = Qizil')}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">{latinToCyrillic('Natija:')}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>{colorSettings.greenThreshold}$+ = {latinToCyrillic('Yashil')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span>{colorSettings.yellowThreshold}$ - {colorSettings.greenThreshold}$ = {latinToCyrillic('Sariq')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span>{colorSettings.yellowThreshold}$ {latinToCyrillic('dan kam = Qizil')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span>{latinToCyrillic('Qarz')} {colorSettings.debtPeriodThreshold}+ {latinToCyrillic('kun = Qizil')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                {latinToCyrillic('Bekor qilish')}
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                {latinToCyrillic('Saqlash')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">{latinToCyrillic("Yangi mijoz qo'shish")}</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setCustomerFormError(null);
                  setCustomerFormSuccess(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title={latinToCyrillic('Yopish')}
                aria-label={latinToCyrillic('Yopish')}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <ValidatedForm
              schema={customerSchema}
              defaultValues={{
                name: '',
                phone: '',
                email: '',
                address: '',
                category: 'NORMAL'
              }}
              onSubmit={handleAddCustomer}
              loading={customerFormLoading}
              error={customerFormError}
              success={customerFormSuccess}
            >
              <FormField
                name="name"
                label={latinToCyrillic('Ism')}
                placeholder={latinToCyrillic('Mijoz ismi')}
                required
              />

              <FormField
                name="phone"
                label={latinToCyrillic('Telefon')}
                type="tel"
                placeholder="+998901234567"
                required
              />

              <FormField
                name="email"
                label={latinToCyrillic('Email')}
                type="email"
                placeholder={latinToCyrillic('Email (ixtiyoriy)')}
              />

              <FormField
                name="address"
                label={latinToCyrillic('Manzil')}
                placeholder={latinToCyrillic('Manzil (ixtiyoriy)')}
              />

              <FormField
                name="category"
                label={latinToCyrillic('Kategoriya')}
                type="select"
                options={[
                  { value: 'NORMAL', label: latinToCyrillic('Oddiy') },
                  { value: 'VIP', label: 'VIP' },
                  { value: 'PROBLEMATIC', label: latinToCyrillic('Muammodor') },
                  { value: 'NEW', label: latinToCyrillic('Yangi') }
                ]}
              />

              <FormActions
                onCancel={() => {
                  setShowAddForm(false);
                  setCustomerFormError(null);
                  setCustomerFormSuccess(null);
                }}
                submitText={latinToCyrillic("Qo'shish")}
                cancelText={latinToCyrillic('Bekor qilish')}
                loading={customerFormLoading}
              />
            </ValidatedForm>
          </div>
        </div>
      )}
      {/* Guruhlash (Rang qoidalari) modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">{latinToCyrillic('Mijoz guruhlash qoidalari')}</h3>
              </div>
              <button onClick={() => setShowRulesModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Mavjud qoidalar */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{latinToCyrillic('Mavjud qoidalar')} ({rules.length})</p>
                {rules.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">{latinToCyrillic("Hali qoida yo'q")}</p>
                )}
                <div className="space-y-2">
                  {rules.map((rule) => {
                    const rc = RULE_COLORS.find(c => c.value === rule.color);
                    return (
                      <div key={rule.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${rc?.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {rule.conditions.map((cond, i) => {
                              const f = FIELDS.find(f => f.value === cond.field)?.label ?? cond.field;
                              return (
                                <span key={i}>{i > 0 && <span className="mx-1 font-bold">{rule.logic}</span>}{f} {cond.operator} {cond.value}</span>
                              );
                            })}
                          </p>
                        </div>
                        <button onClick={() => openEditRule(rule)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Qoida qo'shish/tahrirlash formasi */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  {editingRule ? latinToCyrillic('Qoidani tahrirlash') : latinToCyrillic("Yangi qoida qo'shish")}
                </p>
                <div className="space-y-3">
                  {/* Nom */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{latinToCyrillic('Nomi (badge matn)')} *</label>
                      <input
                        type="text"
                        value={ruleForm.name}
                        onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={latinToCyrillic("Qarz to'lamagan")}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{latinToCyrillic('Rang')}</label>
                      <select
                        value={ruleForm.color}
                        onChange={e => setRuleForm(f => ({ ...f, color: e.target.value as ColorRule['color'] }))}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      >
                        {RULE_COLORS.map(rc => <option key={rc.value} value={rc.value}>{rc.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Shartlar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-600">{latinToCyrillic('Shartlar')} *</label>
                      {ruleForm.conditions.length > 1 && (
                        <div className="flex gap-1">
                          {(['AND', 'OR'] as const).map(l => (
                            <button key={l} onClick={() => setRuleForm(f => ({ ...f, logic: l }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${ruleForm.logic === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {ruleForm.conditions.map((cond, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <select value={cond.field} onChange={e => updateCondition(i, { field: e.target.value as any })}
                            className="flex-1 h-10 px-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                          <select value={cond.operator} onChange={e => updateCondition(i, { operator: e.target.value as any })}
                            className="w-16 h-10 px-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                          </select>
                          <input type="number" value={cond.value} onChange={e => updateCondition(i, { value: parseFloat(e.target.value) || 0 })}
                            className="w-24 h-10 px-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center" />
                          <button onClick={() => removeCondition(i)} disabled={ruleForm.conditions.length === 1}
                            className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={addCondition} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      {latinToCyrillic("Shart qo'shish")}
                    </button>
                  </div>

                  {/* Preview + Save */}
                  {ruleForm.name && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <p className="text-xs text-slate-500">{latinToCyrillic('Korespondensiya')}:</p>
                      {ruleBadge({ id: 'preview', ...ruleForm })}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {editingRule && (
                      <button onClick={() => { setEditingRule(null); setRuleForm({ name: '', color: 'red', logic: 'AND', conditions: [{ field: 'debtUSD', operator: '>=', value: 0 }] }); }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
                        {latinToCyrillic('Bekor qilish')}
                      </button>
                    )}
                    <button onClick={submitRuleForm} disabled={!ruleForm.name.trim()}
                      className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors">
                      {editingRule ? latinToCyrillic('Saqlash') : latinToCyrillic("Qo'shish")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
