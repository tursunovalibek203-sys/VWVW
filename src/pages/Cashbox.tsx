import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, Banknote,
  Smartphone, ArrowLeftRight, Receipt, Users, Zap, Truck, Wrench,
  Building2, ShoppingCart, MoreHorizontal, RefreshCw, Plus, Loader2, X,
  History, UserCheck, ArrowUpRight, ArrowDownRight, Download, Clock,
  AlertTriangle, CheckCircle2, BarChart2, Scale, ChevronLeft,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { exportToExcel } from '../lib/excelUtils';

const t = latinToCyrillic;

// Windows-1252 special chars (0x80-0x9F) → Unicode code point → back to byte
const CP1252: Record<number, number> = {
  0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85,
  0x2020:0x86, 0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A,
  0x2039:0x8B, 0x0152:0x8C, 0x017D:0x8E, 0x2018:0x91, 0x2019:0x92,
  0x201C:0x93, 0x201D:0x94, 0x2022:0x95, 0x2013:0x96, 0x2014:0x97,
  0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A, 0x203A:0x9B, 0x0153:0x9C,
  0x017E:0x9E, 0x0178:0x9F,
};

// Fix mojibake: UTF-8 Cyrillic bytes read as Windows-1252
function fixDesc(str: string): string {
  if (!str || !/[ÐÑÒ]/.test(str)) return str;
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytes[i] = CP1252[code] ?? (code < 256 ? code : 0x3F);
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded;
  } catch {
    return str;
  }
}

const EXPENSE_CATS = [
  { id: 'SALARY',        label: 'Ish haqi',    icon: Users,          color: '#3b82f6' },
  { id: 'ADVANCE',       label: 'Avans',        icon: Users,          color: '#6366f1' },
  { id: 'LOAN',          label: 'Qarz',         icon: Users,          color: '#8b5cf6' },
  { id: 'ELECTRICITY',   label: 'Elektr',       icon: Zap,            color: '#f59e0b' },
  { id: 'RAW_MATERIALS', label: 'Xom ashyo',    icon: Truck,          color: '#10b981' },
  { id: 'MAINTENANCE',   label: 'Tamirlash',    icon: Wrench,         color: '#f97316' },
  { id: 'RENT',          label: 'Ijara',        icon: Building2,      color: '#8b5cf6' },
  { id: 'MARKETING',     label: 'Marketing',    icon: ShoppingCart,   color: '#ec4899' },
  { id: 'TAX',           label: 'Soliq',        icon: Receipt,        color: '#ef4444' },
  { id: 'TRANSPORT',     label: 'Transport',    icon: Truck,          color: '#06b6d4' },
  { id: 'UTILITIES',     label: 'Kommunal',     icon: Zap,            color: '#84cc16' },
  { id: 'SUPPLIES',      label: 'Taminot',      icon: ShoppingCart,   color: '#14b8a6' },
  { id: 'OTHER',         label: 'Boshqa',       icon: MoreHorizontal, color: '#6b7280' },
  { id: 'LOAN_REPAYMENT', label: 'Qarz qaytarish', icon: CheckCircle2, color: '#10b981' },
  { id: 'ADJUSTMENT',    label: 'Tekshiruv',    icon: Scale,          color: '#64748b' },
  { id: 'REVERSAL',      label: 'Bekor qilindi', icon: AlertTriangle, color: '#ef4444' },
];

const OTHER_CAT = EXPENSE_CATS.find(c => c.id === 'OTHER')!;
const getCat = (id: string) => EXPENSE_CATS.find(c => c.id === id) ?? OTHER_CAT;

const ICON_MAP: Record<string, any> = {
  Users, Zap, Truck, Wrench, Building2, ShoppingCart, MoreHorizontal,
  Receipt, DollarSign, CreditCard, Banknote, BarChart2, Scale, UserCheck,
  Smartphone, Clock, CheckCircle2,
};
const CAT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#14b8a6','#6b7280','#6366f1'];

const BUCKET_COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6'];
type TabType = 'overview' | 'history' | 'expenses' | 'loans' | 'advances' | 'budget';

// ─── Small shared components ────────────────────────────────────────────────
function CModal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{children}</p>;
}

function MethodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const M = [
    { id: 'CASH',  label: t('Naqd'),  Icon: Banknote,   clr: '#10b981' },
    { id: 'CARD',  label: t('Karta'), Icon: CreditCard, clr: '#3b82f6' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {M.map(m => {
        const active = value === m.id;
        return (
          <button key={m.id} type="button" onClick={() => onChange(m.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
              ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <m.Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className={`text-xs font-semibold ${active ? 'text-indigo-700' : 'text-slate-500'}`}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
        ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
      {label}
    </button>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Cashbox() {
  const { addToast } = useToast();

  const [activeTab,    setActiveTab]    = useState<TabType>('overview');
  const [cashbox,      setCashbox]      = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses,     setExpenses]     = useState<any[]>([]);
  const [loans,        setLoans]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [exchangeRate, setExchangeRate] = useState(() => {
    const v = parseInt(localStorage.getItem('cashboxExchangeRate') || '12500', 10);
    return Number.isFinite(v) && v > 0 ? v : 12500;
  });
  const [rateInput, setRateInput] = useState(
    localStorage.getItem('cashboxExchangeRate') || '12500');

  const [showKirim,    setShowKirim]    = useState(false);
  const [showChiqim,   setShowChiqim]   = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [showExpense,  setShowExpense]  = useState(false);
  const [showLoan,     setShowLoan]     = useState(false);
  const [showAdvance,  setShowAdvance]  = useState(false);
  const [showRate,     setShowRate]     = useState(false);

  const [budgets,      setBudgets]      = useState<any[]>([]);
  const [showRepay,    setShowRepay]    = useState(false);
  const [repayTarget,  setRepayTarget]  = useState<any>(null);
  const [repayForm,    setRepayForm]    = useState({ amount: '', currency: 'UZS', paymentMethod: 'CASH', notes: '' });
  const [showCancel,   setShowCancel]   = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showReconcile, setShowReconcile] = useState(false);
  const [reconcileForm, setReconcileForm] = useState({ physicalUZS: '', physicalUSD: '', reason: '' });
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [budgetForm,   setBudgetForm]   = useState({ category: 'SALARY', amount: '', currency: 'UZS', alertThreshold: '80' });
  const [budgetMonth,  setBudgetMonth]  = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const INIT = { amount: '', currency: 'UZS', paymentMethod: 'CASH', description: '' };
  const [kirimForm,    setKirimForm]    = useState(INIT);
  const [chiqimForm,   setChiqimForm]   = useState({ ...INIT, currency: 'USD' });
  const [exchForm,     setExchForm]     = useState({
    fromCurrency: 'USD', toCurrency: 'UZS', fromType: 'CASH', toType: 'CASH', amount: '', description: '',
  });
  const [expForm,  setExpForm]  = useState({ amountUZS: '', amountUSD: '', amountKarta: '', category: 'SALARY', description: '' });
  const [loanForm, setLoanForm] = useState({ employeeName: '', amount: '', currency: 'UZS', purpose: '', dueDate: '', notes: '' });
  const [advForm,  setAdvForm]  = useState({ employeeName: '', amount: '', currency: 'UZS', purpose: '', notes: '' });

  const [customCats, setCustomCats] = useState<{id:string;label:string;icon:string;color:string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('customExpenseCats') || '[]'); } catch { return []; }
  });
  const [selectedCat, setSelectedCat] = useState<string|null>(null);
  const [showAddCat,  setShowAddCat]  = useState(false);
  const [addCatForm,  setAddCatForm]  = useState({ label:'', icon:'ShoppingCart', color:'#3b82f6' });

  const [hf, setHf] = useState({ type: 'ALL', paymentMethod: 'ALL', startDate: '', endDate: '' });

  // ── Load ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const [sumR, txR, expR, loanR, rateR, budgetR] = await Promise.allSettled([
        api.get('/cashbox/summary'),
        api.get('/cashbox/transactions?limit=300'),
        api.get('/expenses'),
        api.get('/cashbox/loans'),
        api.get('/exchange-rates'),
        api.get('/cashbox/budgets'),
      ]);
      if (sumR.status  === 'fulfilled') setCashbox(sumR.value.data);
      if (txR.status   === 'fulfilled') setTransactions(Array.isArray(txR.value.data) ? txR.value.data : []);
      if (expR.status  === 'fulfilled') setExpenses(Array.isArray(expR.value.data) ? expR.value.data : []);
      if (loanR.status === 'fulfilled') setLoans(Array.isArray(loanR.value.data) ? loanR.value.data : []);
      if (rateR.status === 'fulfilled') {
        const arr = rateR.value.data;
        const r = Array.isArray(arr) && arr[0]
          ? parseInt(arr[0].rate || arr[0].rateToUZS || '12500', 10) : 0;
        if (r > 0) { setExchangeRate(r); setRateInput(String(r)); localStorage.setItem('cashboxExchangeRate', String(r)); }
      }
      if (budgetR.status === 'fulfilled') setBudgets(Array.isArray(budgetR.value.data) ? budgetR.value.data : []);
    } catch { addToast({ type: 'error', title: t('Malumot yuklashda xatolik') }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Sahifa focus yoki ko'rinib qolganda avtomatik yangilash
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadAll]);

  // ── Computed ─────────────────────────────────────────────────────────────
  // 1. Naqt qo'ldagi pul (NET balans: jami kirim - jami chiqim)
  const cashUZS  = cashbox?.byCurrency?.cashUZS  || 0;
  const cashUSD  = cashbox?.byCurrency?.cashUSD  || 0;
  const cardUZS  = cashbox?.byCurrency?.cardUZS  || 0;
  const clickUZS = cashbox?.byCurrency?.clickUZS || 0;
  const totalUZS = cashUZS + cashUSD * exchangeRate + cardUZS + clickUZS;
  const totalUSD = cashUSD + (cashUZS + cardUZS + clickUZS) / exchangeRate;

  // 2. Jami kirim (barcha manbalar: sotuv, mijoz to'lovi, haydovchi, manual)
  const totalIncUZS  = cashbox?.totalIncomeBy?.cashUZS  || 0;
  const totalIncUSD  = cashbox?.totalIncomeBy?.cashUSD  || 0;
  const totalIncCard = (cashbox?.totalIncomeBy?.cardUZS  || 0) + (cashbox?.totalIncomeBy?.clickUZS || 0);

  // 3. Jami chiqim
  const totalExpUZS  = cashbox?.totalExpenseBy?.cashUZS  || 0;
  const totalExpUSD  = cashbox?.totalExpenseBy?.cashUSD  || 0;
  const totalExpCard = (cashbox?.totalExpenseBy?.cardUZS  || 0) + (cashbox?.totalExpenseBy?.clickUZS || 0);

  // Bugungi kirim breakdown
  const todayIncomeCashUZS  = cashbox?.todayIncomeBy?.cashUZS  || 0;
  const todayIncomeCardUZS  = cashbox?.todayIncomeBy?.cardUZS  || 0;
  const todayIncomeClickUZS = cashbox?.todayIncomeBy?.clickUZS || 0;
  const todayIncomeCashUSD  = cashbox?.todayIncomeBy?.cashUSD  || 0;

  // Bugungi chiqim breakdown
  const todayExpenseCashUZS  = cashbox?.todayExpenseBy?.cashUZS  || 0;
  const todayExpenseCardUZS  = cashbox?.todayExpenseBy?.cardUZS  || 0;
  const todayExpenseClickUZS = cashbox?.todayExpenseBy?.clickUZS || 0;
  const todayExpenseCashUSD  = cashbox?.todayExpenseBy?.cashUSD  || 0;

  // Oylik kirim breakdown
  const monthIncomeCashUZS  = cashbox?.monthIncomeBy?.cashUZS  || 0;
  const monthIncomeCardUZS  = cashbox?.monthIncomeBy?.cardUZS  || 0;
  const monthIncomeClickUZS = cashbox?.monthIncomeBy?.clickUZS || 0;
  const monthIncomeCashUSD  = cashbox?.monthIncomeBy?.cashUSD  || 0;

  // Oylik chiqim breakdown
  const monthExpenseCashUZS  = cashbox?.monthExpenseBy?.cashUZS  || 0;
  const monthExpenseCardUZS  = cashbox?.monthExpenseBy?.cardUZS  || 0;
  const monthExpenseClickUZS = cashbox?.monthExpenseBy?.clickUZS || 0;
  const monthExpenseCashUSD  = cashbox?.monthExpenseBy?.cashUSD  || 0;

  const toUZS = (amount: number, currency: string) =>
    currency === 'USD' ? amount * exchangeRate : amount;

  const filteredTx = useMemo(() => transactions.filter(tx => {
    if (hf.type !== 'ALL' && tx.type !== hf.type) return false;
    if (hf.paymentMethod !== 'ALL' && tx.paymentMethod !== hf.paymentMethod) return false;
    if (hf.startDate && new Date(tx.createdAt) < new Date(hf.startDate)) return false;
    if (hf.endDate) { const e = new Date(hf.endDate); e.setHours(23,59,59,999); if (new Date(tx.createdAt) > e) return false; }
    return true;
  }), [transactions, hf]);

  const histIncome  = useMemo(() => filteredTx.filter(t => t.type === 'INCOME' ).reduce((s,t)=>s+toUZS(t.amount,t.currency||'UZS'),0), [filteredTx, exchangeRate]);
  const histExpense = useMemo(() => filteredTx.filter(t => t.type === 'EXPENSE').reduce((s,t)=>s+toUZS(t.amount,t.currency||'UZS'),0), [filteredTx, exchangeRate]);

  const allCats = useMemo(() => [
    ...EXPENSE_CATS,
    ...customCats.map(c => ({ ...c, icon: ICON_MAP[c.icon] || MoreHorizontal })),
  ], [customCats]);

  const expCatData = useMemo(() => {
    const map: Record<string,number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category]||0) + toUZS(e.amount, e.currency||'UZS'); });
    return Object.entries(map).map(([cat,val])=>({ cat, val: Math.round(val), label: t((allCats.find(c=>c.id===cat)??OTHER_CAT).label) }))
      .sort((a,b)=>b.val-a.val).slice(0,8);
  }, [expenses, exchangeRate, allCats]);

  const dailyFlow = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return Array.from({length:7}).map((_,i) => {
      const d = new Date(today); d.setDate(d.getDate()-(6-i));
      const nxt = new Date(d); nxt.setDate(nxt.getDate()+1);
      const day = transactions.filter(tx => { const dt=new Date(tx.createdAt); return dt>=d && dt<nxt; });
      const inc = day.filter(t=>t.type==='INCOME' ).reduce((s,t)=>s+toUZS(t.amount,t.currency||'UZS'),0);
      const exp = day.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+toUZS(t.amount,t.currency||'UZS'),0);
      return { name: d.toLocaleDateString('uz-UZ',{weekday:'short'}), kirim:Math.round(inc/1000), chiqim:Math.round(exp/1000) };
    });
  }, [transactions, exchangeRate]);

  const pieData = [
    { name: t('Naqd UZS'), value: cashUZS },
    { name: t('Naqd USD'), value: cashUSD * exchangeRate },
    { name: t('Karta'),    value: cardUZS },
    { name: 'Click',       value: clickUZS },
  ].filter(d => d.value > 0);

  const loanList    = loans.filter(l => l.repaymentType !== 'ADVANCE');
  const advanceList = loans.filter(l => l.repaymentType === 'ADVANCE');

  const catDetailExpenses = useMemo(() =>
    selectedCat ? expenses.filter(e => e.category === selectedCat)
      .sort((a,b) => new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()) : [],
    [selectedCat, expenses]
  );
  const catDetailTotal = catDetailExpenses.reduce((s,e) => s + toUZS(e.amount, e.currency||'UZS'), 0);
  const catDetailUSD   = catDetailExpenses.filter(e=>(e.currency||'UZS')==='USD').reduce((s,e)=>s+e.amount,0);
  const catDetailUZS   = catDetailExpenses.filter(e=>(e.currency||'UZS')==='UZS').reduce((s,e)=>s+e.amount,0);
  const selectedCatObj = selectedCat ? (allCats.find(c => c.id === selectedCat) ?? OTHER_CAT) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const doPost = async (url: string, body: any, msg: string, onDone: ()=>void) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post(url, body);
      onDone();
      loadAll(true);
      addToast({ type: 'success', title: t(msg) });
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || t('Xatolik') });
    } finally { setSubmitting(false); }
  };

  const handleKirim    = () => { if (!kirimForm.amount||+kirimForm.amount<=0) return;
    doPost('/cashbox/add', { amount:+kirimForm.amount, currency:kirimForm.currency, paymentMethod:kirimForm.paymentMethod, description:kirimForm.description||t('Kirim') },
      'Kirim amalga oshirildi', ()=>{ setShowKirim(false); setKirimForm(INIT); }); };

  const handleChiqim   = () => { if (!chiqimForm.amount||+chiqimForm.amount<=0) return;
    doPost('/cashbox/withdraw', { amount:+chiqimForm.amount, currency:chiqimForm.currency, paymentMethod:chiqimForm.paymentMethod, description:chiqimForm.description||t('Chiqim') },
      'Chiqim amalga oshirildi', ()=>{ setShowChiqim(false); setChiqimForm({...INIT,currency:'USD'}); }); };

  const handleExchange = () => { if (!exchForm.amount||+exchForm.amount<=0) return;
    doPost('/cashbox/exchange', { fromCurrency:exchForm.fromCurrency, toCurrency:exchForm.toCurrency, fromType:exchForm.fromType, toType:exchForm.toType, amount:+exchForm.amount, exchangeRate, description:exchForm.description||t('Ayirboshlash') },
      'Ayirboshlash amalga oshirildi', ()=>{ setShowExchange(false); setExchForm({fromCurrency:'USD',toCurrency:'UZS',fromType:'CASH',toType:'CASH',amount:'',description:''}); }); };

  const handleExpense  = async () => {
    const uzs   = parseFloat(expForm.amountUZS)   || 0;
    const usd   = parseFloat(expForm.amountUSD)   || 0;
    const karta = parseFloat(expForm.amountKarta) || 0;
    if ((uzs <= 0 && usd <= 0 && karta <= 0) || submitting) return;
    setSubmitting(true);
    try {
      const reqs: Promise<any>[] = [];
      const desc = expForm.description;
      const cat  = expForm.category;
      if (uzs   > 0) reqs.push(api.post('/expenses', { amount: uzs,   currency: 'UZS', category: cat, paymentMethod: 'CASH', description: desc }));
      if (usd   > 0) reqs.push(api.post('/expenses', { amount: usd,   currency: 'USD', category: cat, paymentMethod: 'CASH', description: desc }));
      if (karta > 0) reqs.push(api.post('/expenses', { amount: karta, currency: 'UZS', category: cat, paymentMethod: 'CARD', description: desc }));
      const results = await Promise.all(reqs);
      setShowExpense(false);
      setExpForm({ amountUZS: '', amountUSD: '', amountKarta: '', category: 'SALARY', description: '' });
      loadAll(true);
      addToast({ type: 'success', title: t('Xarajat qoshildi') });
      const warn = results.find(r => r.data?.budgetWarning);
      if (warn) {
        const info = warn.data.budgetInfo;
        addToast({ type: 'warning', title: t('Budjet oshdi'), message: `${getCat(info?.category).label}: ${Math.round(info?.newTotal||0).toLocaleString()} / ${Math.round(info?.allocated||0).toLocaleString()} ${info?.currency}` });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || t('Xatolik') });
    } finally { setSubmitting(false); }
  };

  const handleLoan     = () => { if (!loanForm.employeeName||!loanForm.amount) return;
    doPost('/cashbox/loans', { ...loanForm, amount:+loanForm.amount, repaymentType:'SALARY_DEDUCTION', loanDate:new Date().toISOString() },
      'Qarz qoshildi', ()=>{ setShowLoan(false); setLoanForm({employeeName:'',amount:'',currency:'UZS',purpose:'',dueDate:'',notes:''}); }); };

  const handleAdvance  = () => { if (!advForm.employeeName||!advForm.amount) return;
    doPost('/cashbox/loans', { ...advForm, amount:+advForm.amount, repaymentType:'ADVANCE', loanDate:new Date().toISOString() },
      'Avans berildi', ()=>{ setShowAdvance(false); setAdvForm({employeeName:'',amount:'',currency:'UZS',purpose:'',notes:''}); }); };

  const saveRate = () => {
    const r = parseInt(rateInput, 10);
    if (r > 0) {
      setExchangeRate(r); localStorage.setItem('cashboxExchangeRate', String(r));
      api.post('/exchange-rates', { currency:'USD', rate:r, rateToUZS:r }).catch(()=>{});
      setShowRate(false); loadAll(true);
      addToast({ type:'success', title: t('Kurs yangilandi') });
    }
  };

  const handleRepay = async () => {
    if (!repayTarget || !repayForm.amount || +repayForm.amount <= 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/cashbox/loans/${repayTarget.id}/repay`, {
        amount: +repayForm.amount, currency: repayForm.currency,
        paymentMethod: repayForm.paymentMethod, notes: repayForm.notes,
        exchangeRate,
      });
      setShowRepay(false); setRepayTarget(null);
      setRepayForm({ amount: '', currency: 'UZS', paymentMethod: 'CASH', notes: '' });
      loadAll(true);
      addToast({ type: 'success', title: res.data?.message || t('Tolash amalga oshirildi') });
      if (res.data?.capped) addToast({ type: 'info', title: t('Summa qirqildi'), message: t('Qoldig dan oshmas miqdorda tolandi') });
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || t('Tolashda xatolik') });
    } finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!cancelTarget || !cancelReason.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/cashbox/transactions/${cancelTarget.id}/cancel`, { reason: cancelReason });
      setShowCancel(false); setCancelTarget(null); setCancelReason('');
      loadAll(true);
      addToast({ type: 'success', title: t('Tranzaksiya bekor qilindi') });
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || t('Bekor qilishda xatolik') });
    } finally { setSubmitting(false); }
  };

  const handleReconcile = async () => {
    if (!reconcileForm.reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post('/cashbox/reconcile', {
        physicalUZS: +reconcileForm.physicalUZS || 0,
        physicalUSD: +reconcileForm.physicalUSD || 0,
        reason: reconcileForm.reason,
      });
      setShowReconcile(false);
      setReconcileForm({ physicalUZS: '', physicalUSD: '', reason: '' });
      loadAll(true);
      addToast({ type: 'success', title: res.data?.message || t('Tekshiruv amalga oshirildi') });
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || t('Tekshiruvda xatolik') });
    } finally { setSubmitting(false); }
  };

  const handleNewBudget = async () => {
    if (!budgetForm.amount || +budgetForm.amount <= 0 || submitting) return;
    setSubmitting(true);
    const [year, month] = budgetMonth.split('-').map(Number);
    try {
      await api.post('/cashbox/budgets', {
        category: budgetForm.category, amount: +budgetForm.amount,
        currency: budgetForm.currency, alertThreshold: +budgetForm.alertThreshold || 80,
        year, month,
      });
      setShowNewBudget(false);
      setBudgetForm({ category: 'SALARY', amount: '', currency: 'UZS', alertThreshold: '80' });
      loadAll(true);
      addToast({ type: 'success', title: t('Budjet saqlandi') });
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || t('Budjet saqlashda xatolik') });
    } finally { setSubmitting(false); }
  };

  const handleAddCat = () => {
    if (!addCatForm.label.trim()) return;
    const newCat = { id:'CUSTOM_'+Date.now(), label:addCatForm.label.trim(), icon:addCatForm.icon, color:addCatForm.color };
    const updated = [...customCats, newCat];
    setCustomCats(updated);
    localStorage.setItem('customExpenseCats', JSON.stringify(updated));
    setShowAddCat(false);
    setAddCatForm({ label:'', icon:'ShoppingCart', color:'#3b82f6' });
    addToast({ type:'success', title: t('Kategoriya qoshildi') });
  };
  const handleDeleteCat = (id: string) => {
    const updated = customCats.filter(c => c.id !== id);
    setCustomCats(updated);
    localStorage.setItem('customExpenseCats', JSON.stringify(updated));
    if (selectedCat === id) setSelectedCat(null);
  };

  const handleExport = () => {
    // Barcha tranzaksiyalarni sanaga qarab tartiblash (eskidan yangi)
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Har bir tranzaksiya uchun balansni hisoblash
    const balanceMap = new Map<string, { before: number; after: number }>();
    let runningUZS = 0;
    for (const tx of sorted) {
      const sign   = tx.type === 'INCOME' ? 1 : -1;
      const method = (tx.paymentMethod || 'CASH').toUpperCase();
      const curr   = (tx.currency || 'UZS').toUpperCase();
      const amtUZS = curr === 'USD' ? tx.amount * exchangeRate : tx.amount;
      // Faqat kassa hisobi (naqd + karta) uchun balans
      const before = runningUZS;
      runningUZS  += sign * amtUZS;
      balanceMap.set(tx.id, { before, after: runningUZS });
    }

    const categoryLabel = (cat: string) => {
      const map: Record<string, string> = {
        SALE: t('Sotuv'), PURCHASE: t('Xarid'), SALARY: t('Maosh'),
        EXPENSE: t('Xarajat'), INCOME: t('Kirim'), TRANSFER: t('Transfer'),
        EXCHANGE: t('Almashtirish'), REVERSAL: t('Bekor'), DEBT: t('Qarz'),
        DEBT_PAYMENT: t('Qarz tolov'), LOAN: t('Qarz berish'),
      };
      return map[cat] || cat || '—';
    };

    const methodLabel = (m: string) => {
      if (m === 'CARD') return t('Karta');
      if (m === 'CASH') return t('Naqd');
      return m || t('Naqd');
    };

    const rows = filteredTx.map(tx => {
      const dt      = new Date(tx.createdAt);
      const curr    = (tx.currency || 'UZS').toUpperCase();
      const method  = (tx.paymentMethod || 'CASH').toUpperCase();
      const amt     = tx.amount || 0;
      const bal     = balanceMap.get(tx.id) || { before: 0, after: 0 };
      const sign    = tx.type === 'INCOME' ? 1 : -1;

      return {
        [t('Turi')]:              tx.type === 'INCOME' ? t('Kirim') : t('Chiqim'),
        [t('Sababi')]:            categoryLabel(tx.category || ''),
        [t('Qayerdan / Tavsif')]: tx.description || '—',
        [t('Sana')]:              dt.toLocaleDateString('uz-UZ'),
        [t('Vaqt')]:              dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        [t('UZS (naqd)')]:        curr === 'UZS' && method === 'CASH' ? sign * amt : 0,
        [t('USD ($)')]:           curr === 'USD'                       ? sign * amt : 0,
        [t('Karta (UZS)')]:       method === 'CARD'                    ? sign * amt : 0,
        [t('Oldin kassada (UZS)')]:  Math.round(bal.before),
        [t('Keyin kassada (UZS)')]:  Math.round(bal.after),
      };
    });

    exportToExcel(rows, { fileName: t('Kassa hisoboti'), sheetName: t('Tranzaksiyalar') });
  };

  const inp = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all';

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id:'overview',  label: t('Umumiy'),     icon: Wallet },
    { id:'history',   label: t('Tarix'),      icon: History },
    { id:'expenses',  label: t('Xarajatlar'), icon: Receipt },
    { id:'loans',     label: t('Qarzlar'),    icon: DollarSign },
    { id:'advances',  label: t('Avanslar'),   icon: UserCheck },
    { id:'budget',    label: t('Budjet'),     icon: BarChart2 },
  ];

  if (loading) return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i=><div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse"/>)}
      </div>
      <div className="h-60 bg-white rounded-2xl border border-slate-200 animate-pulse"/>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('Kassa')}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            1 USD = {exchangeRate.toLocaleString('en-US')} so'm
            <button onClick={()=>setShowRate(true)} className="ml-2 text-indigo-500 hover:underline text-xs font-medium">{t('ozgartirish')}</button>
          </p>
        </div>
        <button onClick={()=>loadAll(true)} disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60 self-start">
          <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/> <span className="hidden sm:inline">{t('Yangilash')}</span>
        </button>
      </div>

      {/* ── 4 TA ASOSIY DIV ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ── DIV 1: NAQD PUL (balans = kirim − chiqim) ── */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg shadow-indigo-500/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white"/>
            </div>
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-wide">{t('Naqd pul')}</p>
            {totalUZS < 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-300 ml-auto"/>}
          </div>
          <div className="space-y-2">
            {/* Naqd USD */}
            <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-300"/>
                <span className="text-xs text-indigo-200">{t('Naqd USD')}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${cashUSD < 0 ? 'text-rose-300' : 'text-white'}`}>
                {cashUSD % 1 === 0 ? cashUSD.toLocaleString('en-US') : cashUSD.toFixed(2)}
                <span className="text-xs font-normal text-indigo-300 ml-1">$</span>
              </span>
            </div>
            {/* Naqd UZS */}
            <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-300"/>
                <span className="text-xs text-indigo-200">{t('Naqd UZS')}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${cashUZS < 0 ? 'text-rose-300' : 'text-white'}`}>
                {Math.round(cashUZS).toLocaleString('en-US')}
                <span className="text-xs font-normal text-indigo-300 ml-1">so'm</span>
              </span>
            </div>
            {/* Karta */}
            <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-300"/>
                <span className="text-xs text-indigo-200">{t('Karta')}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${cardUZS < 0 ? 'text-rose-300' : 'text-white'}`}>
                {Math.round(cardUZS + clickUZS).toLocaleString('en-US')}
                <span className="text-xs font-normal text-indigo-300 ml-1">so'm</span>
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
            <span className="text-xs text-indigo-300">{t('Jami')}</span>
            <span className={`text-base font-bold tabular-nums ${totalUSD < 0 ? 'text-rose-300' : 'text-white'}`}>
              {totalUSD % 1 === 0 ? Math.round(totalUSD).toLocaleString('en-US') : totalUSD.toFixed(2)}{' '}
              <span className="text-indigo-300 font-normal">$</span>
            </span>
          </div>
        </div>

        {/* ── DIV 2: JAMI KIRIM ── */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600"/>
            </div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t('Jami kirim')}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-500"/>
                <span className="text-xs text-slate-500">{t('Kirim USD')}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {totalIncUSD % 1 === 0 ? totalIncUSD.toLocaleString('en-US') : totalIncUSD.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">$</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <div className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-500"/>
                <span className="text-xs text-slate-500">{t('Kirim UZS')}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {Math.round(totalIncUZS).toLocaleString('en-US')}
                <span className="text-xs font-normal text-slate-400 ml-1">so'm</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-500"/>
                <span className="text-xs text-slate-500">{t('Karta kirim')}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {Math.round(totalIncCard).toLocaleString('en-US')}
                <span className="text-xs font-normal text-slate-400 ml-1">so'm</span>
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100 flex justify-between items-center">
            <span className="text-xs text-slate-400">{t('Jami')}</span>
            <span className="text-base font-bold text-emerald-600 tabular-nums">
              +{Math.round(totalIncUZS + totalIncCard + totalIncUSD * exchangeRate).toLocaleString('en-US')}
              <span className="text-xs font-normal ml-1">so'm</span>
            </span>
          </div>
        </div>

        {/* ── DIV 3: JAMI CHIQIM ── */}
        <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-600"/>
            </div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t('Jami chiqim')}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <div className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-500"/>
                <span className="text-xs text-slate-500">{t('Chiqim UZS')}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {Math.round(totalExpUZS).toLocaleString('en-US')}
                <span className="text-xs font-normal text-slate-400 ml-1">so'm</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-500"/>
                <span className="text-xs text-slate-500">{t('Chiqim USD')}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {totalExpUSD % 1 === 0 ? totalExpUSD.toLocaleString('en-US') : totalExpUSD.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">$</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-500"/>
                <span className="text-xs text-slate-500">{t('Karta chiqim')}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {Math.round(totalExpCard).toLocaleString('en-US')}
                <span className="text-xs font-normal text-slate-400 ml-1">so'm</span>
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-100 flex justify-between items-center">
            <span className="text-xs text-slate-400">{t('Jami')}</span>
            <span className="text-base font-bold text-rose-600 tabular-nums">
              -{Math.round(totalExpUZS + totalExpCard + totalExpUSD * exchangeRate).toLocaleString('en-US')}
              <span className="text-xs font-normal ml-1">so'm</span>
            </span>
          </div>
        </div>

        {/* ── DIV 4: NET BALANS (jami) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
              <Scale className="w-4 h-4 text-slate-600"/>
            </div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t('Net balans')}</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">{t('Dollar hisobida')}</p>
              <p className={`text-2xl font-bold tabular-nums ${totalUSD < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {totalUSD % 1 === 0 ? Math.round(totalUSD).toLocaleString('en-US') : totalUSD.toFixed(2)}{' '}
                <span className="text-lg text-slate-400 font-normal">$</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">{t('So mda')}</p>
              <p className={`text-lg font-bold tabular-nums ${totalUZS < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {Math.round(totalUZS).toLocaleString('en-US')}
                <span className="text-sm text-slate-400 font-normal ml-1">so'm</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{t('Bugun kirim')}</span>
              <span className="text-emerald-600 font-semibold">
                +{Math.round(cashbox?.todayIncome || 0).toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{t('Bugun chiqim')}</span>
              <span className="text-rose-600 font-semibold">
                -{Math.round(cashbox?.todayExpense || 0).toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. OYLIK STATISTIKA ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-500"/>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('Oylik kirim')}</p>
          </div>
          <div className="space-y-2">
            {[
              { label: t('Naqt som'), icon: Banknote, clr: 'text-emerald-500', val: monthIncomeCashUZS, unit: "so'm" },
              { label: t('Karta som'), icon: CreditCard, clr: 'text-blue-500', val: monthIncomeCardUZS, unit: "so'm" },
              { label: t('Dollar'), icon: DollarSign, clr: 'text-amber-500', val: monthIncomeCashUSD, unit: '$', isUSD: true },
            ].map(({ label, icon: Icon, clr, val, unit, isUSD }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${clr}`}/>
                  <span className="text-slate-500">{label}</span>
                </div>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {isUSD ? (val % 1 === 0 ? Math.round(val).toLocaleString('en-US') : val.toFixed(2)) : Math.round(val).toLocaleString('en-US')}
                  <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-orange-500"/>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('Oylik chiqim')}</p>
          </div>
          <div className="space-y-2">
            {[
              { label: t('Naqt som'), icon: Banknote, clr: 'text-emerald-500', val: monthExpenseCashUZS, unit: "so'm" },
              { label: t('Karta som'), icon: CreditCard, clr: 'text-blue-500', val: monthExpenseCardUZS, unit: "so'm" },
              { label: t('Dollar'), icon: DollarSign, clr: 'text-amber-500', val: monthExpenseCashUSD, unit: '$', isUSD: true },
            ].map(({ label, icon: Icon, clr, val, unit, isUSD }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${clr}`}/>
                  <span className="text-slate-500">{label}</span>
                </div>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {isUSD ? (val % 1 === 0 ? Math.round(val).toLocaleString('en-US') : val.toFixed(2)) : Math.round(val).toLocaleString('en-US')}
                  <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setShowKirim(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20">
          <ArrowUpRight className="w-4 h-4"/> {t('Kirim')}
        </button>
        <button onClick={()=>setShowChiqim(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-rose-500/20">
          <ArrowDownRight className="w-4 h-4"/> {t('Chiqim')}
        </button>
        <button onClick={()=>setShowExchange(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <ArrowLeftRight className="w-4 h-4"/> {t('Ayirboshlash')}
        </button>
        <button onClick={()=>{setShowExpense(true);setActiveTab('expenses');}}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
          <Receipt className="w-4 h-4 text-rose-500"/> {t('Xarajat')}
        </button>
        <button onClick={()=>{setShowLoan(true);setActiveTab('loans');}}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
          <DollarSign className="w-4 h-4 text-blue-500"/> {t('Qarz')}
        </button>
        <button onClick={()=>{setShowAdvance(true);setActiveTab('advances');}}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
          <UserCheck className="w-4 h-4 text-violet-500"/> {t('Avans')}
        </button>
      </div>

      {/* Tab panel */}
      <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-slate-100" style={{scrollbarWidth:'none'}}>
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0
                  ${active ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <tab.icon className="w-4 h-4"/> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">

          {/* ══ OVERVIEW ══ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t('Haftalik pul oqimi (ming UZS)')}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dailyFlow} margin={{top:5,right:5,bottom:0,left:0}}>
                      <defs>
                        <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="name" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip formatter={(v:any)=>[(v*1000).toLocaleString()+" so'm"]}/>
                      <Area type="monotone" dataKey="kirim"  stroke="#10b981" fill="url(#gInc)" strokeWidth={2} name={t('Kirim')}/>
                      <Area type="monotone" dataKey="chiqim" stroke="#ef4444" fill="url(#gExp)" strokeWidth={2} name={t('Chiqim')}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t('Valyuta taqsimoti')}</p>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                            {pieData.map((_,i)=><Cell key={i} fill={BUCKET_COLORS[i%4]}/>)}
                          </Pie>
                          <Tooltip formatter={(v:any)=>[Math.round(v).toLocaleString()+" so'm"]}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-1">
                        {pieData.map((d,i)=>(
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{background:BUCKET_COLORS[i%4]}}/>
                              <span className="text-slate-600">{d.name}</span>
                            </div>
                            <span className="font-semibold text-slate-700 tabular-nums">{(d.value/1000).toFixed(0)}k</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-300 text-sm">{t('Malumot yoq')}</div>
                  )}
                </div>
              </div>

              {/* Reconciliation widget */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-4 h-4 text-amber-600"/>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t('Kassa tekshiruvi')}</p>
                    <p className="text-xs text-slate-400">{t('Fizik naqd va tizim balansini solishtirish')}</p>
                  </div>
                </div>
                <button onClick={()=>setShowReconcile(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors flex-shrink-0">
                  {t('Tekshirish')}
                </button>
              </div>

              {/* Recent */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('Songi tranzaksiyalar')}</p>
                  <button onClick={()=>setActiveTab('history')} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
                    {t('Barchasi')} →
                  </button>
                </div>
                {transactions.length === 0
                  ? <p className="text-center text-slate-400 text-sm py-8">{t('Tranzaksiyalar yoq')}</p>
                  : (
                    <div className="divide-y divide-slate-100">
                      {transactions.slice(0,10).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between py-3 hover:bg-slate-50/50 -mx-1 px-1 rounded-lg transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type==='INCOME'?'bg-emerald-50':'bg-rose-50'}`}>
                              {tx.type==='INCOME' ? <ArrowUpRight className="w-4 h-4 text-emerald-600"/> : <ArrowDownRight className="w-4 h-4 text-rose-600"/>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {fixDesc(tx.description) || (tx.type==='INCOME' ? t('Kirim') : t('Chiqim'))}
                              </p>
                              <p className="text-xs text-slate-400 tabular-nums">
                                {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}
                                {tx.paymentMethod && <span className="ml-1 opacity-70">· {tx.paymentMethod}</span>}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold tabular-nums flex-shrink-0 ml-3 ${tx.type==='INCOME'?'text-emerald-600':'text-rose-600'}`}>
                            {tx.type==='INCOME'?'+':'-'}{tx.amount.toLocaleString('en-US')}
                            <span className="text-xs font-normal ml-0.5 text-slate-400">{tx.currency||'UZS'}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <Lbl>{t('Tur')}</Lbl>
                  <div className="flex gap-1">
                    {[['ALL',t('Barchasi')],['INCOME',t('Kirim')],['EXPENSE',t('Chiqim')]].map(([v,l])=>(
                      <Pill key={v} active={hf.type===v} onClick={()=>setHf({...hf,type:v})} label={l}/>
                    ))}
                  </div>
                </div>
                <div>
                  <Lbl>{t('Usul')}</Lbl>
                  <div className="flex gap-1">
                    {[['ALL',t('Barchasi')],['CASH',t('Naqd')],['CARD',t('Karta')]].map(([v,l])=>(
                      <Pill key={v} active={hf.paymentMethod===v} onClick={()=>setHf({...hf,paymentMethod:v})} label={l}/>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 items-end ml-auto">
                  <div>
                    <Lbl>{t('Dan')}</Lbl>
                    <input type="date" value={hf.startDate} onChange={e=>setHf({...hf,startDate:e.target.value})}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div>
                    <Lbl>{t('Gacha')}</Lbl>
                    <input type="date" value={hf.endDate} onChange={e=>setHf({...hf,endDate:e.target.value})}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <button onClick={handleExport}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors">
                    <Download className="w-3.5 h-3.5"/> Excel
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:t('Jami kirim'),   val:histIncome,              c:'text-emerald-600' },
                  { label:t('Jami chiqim'),  val:histExpense,             c:'text-rose-600' },
                  { label:t('Balans'),       val:histIncome-histExpense,  c:histIncome>=histExpense?'text-indigo-600':'text-rose-600' },
                ].map(s=>(
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                    <p className={`text-base font-bold tabular-nums mt-0.5 ${s.c}`}>
                      {Math.round(s.val).toLocaleString()} <span className="text-xs font-normal">so'm</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[t('Sana'),t('Tur'),t('Tavsif'),t('Usul'),t('Summa'),''].map((h,i)=>(
                        <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide ${i===4?'text-right':i===5?'w-8':''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTx.length === 0
                      ? <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">{t('Tranzaksiyalar yoq')}</td></tr>
                      : filteredTx.map(tx => {
                        const isReversal = tx.category === 'REVERSAL';
                        const canCancel = ['INCOME','EXPENSE'].includes(tx.type) && !isReversal
                          && !['EXCHANGE','TRANSFER'].includes(tx.category||'')
                          && !transactions.some(r => r.category==='REVERSAL' && r.reference===tx.id);
                        return (
                          <tr key={tx.id} className={`transition-colors ${isReversal?'bg-slate-50/80 opacity-60':'hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap tabular-nums">
                              {new Date(tx.createdAt).toLocaleString('uz-UZ',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}
                            </td>
                            <td className="px-4 py-3">
                              {isReversal ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                  <AlertTriangle className="w-3 h-3"/>{t('Bekor')}
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                                  ${tx.type==='INCOME'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>
                                  {tx.type==='INCOME'?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}
                                  {tx.type==='INCOME'?t('Kirim'):t('Chiqim')}
                                </span>
                              )}
                            </td>
                            <td className={`px-4 py-3 text-slate-700 max-w-xs truncate text-sm ${isReversal?'line-through text-slate-400':''}`}>{fixDesc(tx.description)||tx.category||'—'}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {tx.paymentMethod==='CASH'  ? <span className="flex items-center gap-1"><Banknote  className="w-3.5 h-3.5 text-emerald-500"/>{t('Naqd')}</span>
                              :tx.paymentMethod==='CARD'  ? <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-blue-500"/>{t('Karta')}</span>
                              :tx.paymentMethod==='CLICK' ? <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-blue-500"/>{t('Karta')}</span>
                              : tx.paymentMethod||'—'}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold tabular-nums ${isReversal?'text-slate-400 line-through':tx.type==='INCOME'?'text-emerald-600':'text-rose-600'}`}>
                              {tx.type==='INCOME'?'+':'-'}{tx.amount.toLocaleString('en-US')}
                              <span className="text-xs font-normal ml-0.5 text-slate-400">{tx.currency||'UZS'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {canCancel && (
                                <button onClick={()=>{setCancelTarget(tx);setShowCancel(true);}}
                                  className="p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title={t('Bekor qilish')}>
                                  <X className="w-3.5 h-3.5"/>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
              {filteredTx.length > 0 &&
                <p className="text-xs text-slate-400 text-right">{filteredTx.length} {t('ta yozuv')}</p>}
            </div>
          )}

          {/* ══ EXPENSES ══ */}
          {activeTab === 'expenses' && (
            <div className="space-y-5">

              {/* ── Kategoriya grid ko'rinishi ── */}
              {selectedCat === null ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {t('Jami')}: {Math.round(expenses.reduce((s,e)=>s+toUZS(e.amount,e.currency||'UZS'),0)).toLocaleString()} so'm
                      <span className="text-slate-400 font-normal ml-1">({expenses.length} {t('ta')})</span>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>setShowAddCat(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
                        <Plus className="w-4 h-4 text-indigo-500"/> {t('Kategoriya')}
                      </button>
                      <button onClick={()=>setShowExpense(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Plus className="w-4 h-4"/> {t('Yangi xarajat')}
                      </button>
                    </div>
                  </div>

                  {expCatData.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t('Kategoriyalar boyicha (UZS)')}</p>
                      <ResponsiveContainer width="100%" height={Math.max(120, expCatData.length * 30)}>
                        <BarChart data={expCatData} layout="vertical" margin={{left:0,right:10,top:0,bottom:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false}/>
                          <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>(v/1000).toFixed(0)+'k'}/>
                          <YAxis dataKey="label" type="category" width={90} tick={{fontSize:11}}/>
                          <Tooltip formatter={(v:any)=>[Math.round(v).toLocaleString()+" so'm"]}/>
                          <Bar dataKey="val" fill="#6366f1" radius={[0,6,6,0]} maxBarSize={18}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t('Kategoriyalar')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {allCats
                        .filter(cat => !['LOAN_REPAYMENT','ADJUSTMENT','REVERSAL'].includes(cat.id))
                        .map(cat => {
                          const Icon = cat.icon;
                          const catExpenses = expenses.filter(e => e.category === cat.id);
                          const catUSD = catExpenses.filter(e=>(e.currency||'UZS')==='USD').reduce((s,e)=>s+e.amount,0);
                          const catUZS = catExpenses.filter(e=>(e.currency||'UZS')==='UZS').reduce((s,e)=>s+e.amount,0);
                          const isCustom = customCats.some(c => c.id === cat.id);
                          if (catExpenses.length === 0 && !isCustom) return null;
                          return (
                            <button key={cat.id} onClick={()=>setSelectedCat(cat.id)}
                              className="bg-white rounded-2xl border border-slate-200/70 p-4 text-left hover:shadow-md hover:border-slate-300 transition-all group relative">
                              {isCustom && (
                                <button
                                  onClick={e=>{ e.stopPropagation(); handleDeleteCat(cat.id); }}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all">
                                  <X className="w-3.5 h-3.5"/>
                                </button>
                              )}
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{backgroundColor:cat.color+'20'}}>
                                <Icon className="w-5 h-5" style={{color:cat.color}}/>
                              </div>
                              <p className="text-sm font-semibold text-slate-700 truncate">{t(cat.label)}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{catExpenses.length} {t('ta yozuv')}</p>
                              <div className="mt-2 space-y-0.5">
                                {catUSD > 0 && (
                                  <p className="text-base font-bold text-slate-900 tabular-nums">
                                    {catUSD.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})}
                                    <span className="text-xs font-normal text-emerald-500 ml-1">USD</span>
                                  </p>
                                )}
                                {catUZS > 0 && (
                                  <p className={`font-bold tabular-nums ${catUSD > 0 ? 'text-sm text-slate-600' : 'text-base text-slate-900'}`}>
                                    {Math.round(catUZS).toLocaleString()}
                                    <span className="text-xs font-normal text-slate-400 ml-1">so'm</span>
                                  </p>
                                )}
                                {catUSD === 0 && catUZS === 0 && (
                                  <p className="text-base font-bold text-slate-900">0 <span className="text-xs font-normal text-slate-400">so'm</span></p>
                                )}
                              </div>
                            </button>
                          );
                        })
                        .filter(Boolean)
                      }
                    </div>
                  </div>
                </>
              ) : (
                /* ── Kategoriya detail ko'rinishi ── */
                (() => {
                  const cat = selectedCatObj!;
                  const Icon = cat.icon;
                  return (
                    <>
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <button onClick={()=>setSelectedCat(null)}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0">
                          <ChevronLeft className="w-5 h-5"/>
                        </button>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:cat.color+'20'}}>
                          <Icon className="w-5 h-5" style={{color:cat.color}}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900">{t(cat.label)}</h3>
                          <p className="text-xs text-slate-400">{catDetailExpenses.length} {t('ta yozuv')}</p>
                        </div>
                        <button onClick={()=>{ setExpForm(f=>({...f,category:selectedCat!})); setShowExpense(true); }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0">
                          <Plus className="w-4 h-4"/> {t('Xarajat qoshish')}
                        </button>
                      </div>

                      {/* Jami karta */}
                      <div className="rounded-2xl p-5 text-white" style={{background:`linear-gradient(135deg, ${cat.color}ee, ${cat.color}99)`}}>
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">{t('Jami xarajat')}</p>
                        {catDetailUSD > 0 && (
                          <p className="text-3xl font-bold tabular-nums">
                            {catDetailUSD.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})}
                            <span className="text-xl font-normal text-white/70 ml-2">USD</span>
                          </p>
                        )}
                        {catDetailUZS > 0 && (
                          <p className={`font-bold tabular-nums ${catDetailUSD > 0 ? 'text-xl mt-1' : 'text-3xl'}`}>
                            {Math.round(catDetailUZS).toLocaleString()}
                            <span className={`font-normal text-white/70 ml-2 ${catDetailUSD > 0 ? 'text-base' : 'text-xl'}`}>so'm</span>
                          </p>
                        )}
                        {catDetailUSD === 0 && catDetailUZS === 0 && (
                          <p className="text-3xl font-bold tabular-nums">0 <span className="text-xl font-normal text-white/70">so'm</span></p>
                        )}
                        <p className="text-white/60 text-xs mt-2">{catDetailExpenses.length} {t('ta tranzaksiya')}</p>
                      </div>

                      {/* Yozuvlar jadvali */}
                      {catDetailExpenses.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                          <p className="text-sm font-medium">{t('Bu kategoriyada xarajatlar yoq')}</p>
                          <p className="text-xs mt-1">{t('Yuqoridagi tugmani bosib xarajat qoshing')}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">{t('Sana')}</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">{t('Tavsif')}</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">{t('Usul')}</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">{t('Summa')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {catDetailExpenses.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap tabular-nums">
                                    {new Date(e.createdAt).toLocaleDateString('uz-UZ',{day:'2-digit',month:'2-digit',year:'numeric'})}
                                    <span className="text-slate-300 ml-1.5">
                                      {new Date(e.createdAt).toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{fixDesc(e.description)||'—'}</td>
                                  <td className="px-4 py-3 text-xs text-slate-500">
                                    {e.paymentMethod==='CASH'  ? <span className="flex items-center gap-1"><Banknote  className="w-3 h-3 text-emerald-500"/>{t('Naqd')}</span>
                                    :e.paymentMethod==='CARD'  ? <span className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-blue-500"/>{t('Karta')}</span>
                                    :e.paymentMethod==='CLICK' ? <span className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-blue-500"/>{t('Karta')}</span>
                                    : e.paymentMethod||'—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold tabular-nums text-rose-600">
                                    -{e.amount.toLocaleString('en-US')}
                                    <span className="text-xs font-normal ml-0.5 text-slate-400">{e.currency||'UZS'}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-rose-50 border-t-2 border-rose-100">
                                <td colSpan={3} className="px-4 py-3 text-sm font-bold text-slate-700">{t('Jami')}</td>
                                <td className="px-4 py-3 text-right font-bold text-rose-600 tabular-nums text-base">
                                  -{Math.round(catDetailTotal).toLocaleString()}
                                  <span className="text-xs font-normal ml-0.5 text-slate-400">so'm</span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          )}

          {/* ══ LOANS ══ */}
          {activeTab === 'loans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {t('Faol qarzlar')}: {loanList.filter(l=>l.status==='ACTIVE').length}
                  <span className="text-slate-400 font-normal ml-1">/ {loanList.length} {t('jami')}</span>
                </p>
                <button onClick={()=>setShowLoan(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4"/> {t('Yangi qarz')}
                </button>
              </div>
              {loanList.length === 0
                ? (
                  <div className="text-center py-16 text-slate-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                    <p className="text-sm font-medium">{t('Hozircha qarzlar yoq')}</p>
                    <p className="text-xs mt-1">{t('Yangi qarz qoshish uchun yuqoridagi tugmani bosing')}</p>
                  </div>
                )
                : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loanList.map(loan => {
                      const paid = loan.amount - (loan.remainingAmount ?? loan.amount);
                      const pct = loan.amount > 0 ? Math.round(paid/loan.amount*100) : 0;
                      const active = loan.status === 'ACTIVE';
                      const overdue = loan.dueDate && new Date(loan.dueDate) < new Date() && active;
                      return (
                        <div key={loan.id} className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow ${overdue?'border-rose-200':'border-slate-200/70'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-bold text-slate-900">{loan.employeeName}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{loan.purpose||t('Maqsad korsatilmagan')}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                              ${overdue?'bg-rose-50 text-rose-700':active?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}>
                              {overdue?t('Muddati otgan'):active?t('Faol'):t('Tugallangan')}
                            </span>
                          </div>
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                              <span>{t('Qoplangan')}: {pct}%</span>
                              <span className="font-semibold">{(loan.remainingAmount??loan.amount).toLocaleString()} {loan.currency} {t('qoldi')}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{width:`${pct}%`}}/>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                            <span>{t('Jami')}: <b className="text-slate-700">{loan.amount.toLocaleString()} {loan.currency}</b></span>
                            {loan.dueDate && (
                              <span className={`flex items-center gap-1 ${overdue?'text-rose-500':''}`}>
                                <Clock className="w-3 h-3"/>
                                {new Date(loan.dueDate).toLocaleDateString('uz-UZ')}
                              </span>
                            )}
                          </div>
                          {active && (
                            <button onClick={()=>{setRepayTarget(loan);setRepayForm({amount:String(loan.remainingAmount??loan.amount),currency:loan.currency||'UZS',paymentMethod:'CASH',notes:''});setShowRepay(true);}}
                              className="mt-3 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5"/> {t('Tolash')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ══ ADVANCES ══ */}
          {activeTab === 'advances' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {t('Avanslar')}: {advanceList.length}
                  <span className="text-slate-400 font-normal ml-1">
                    ({Math.round(advanceList.reduce((s,a)=>s+toUZS(a.amount,a.currency||'UZS'),0)/1000)}k so'm)
                  </span>
                </p>
                <button onClick={()=>setShowAdvance(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4"/> {t('Avans berish')}
                </button>
              </div>
              {advanceList.length === 0
                ? (
                  <div className="text-center py-16 text-slate-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                    <p className="text-sm font-medium">{t('Hozircha avanslar yoq')}</p>
                    <p className="text-xs mt-1">{t('Hodimga avans berish uchun yuqoridagi tugmani bosing')}</p>
                  </div>
                )
                : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {advanceList.map(adv => {
                      const active = adv.status === 'ACTIVE';
                      return (
                        <div key={adv.id} className="bg-white rounded-2xl border border-slate-200/70 p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-violet-600"/>
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{adv.employeeName}</p>
                                <p className="text-xs text-slate-400">{adv.purpose||t('Avans')}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                              ${active?'bg-violet-50 text-violet-700':'bg-emerald-50 text-emerald-700'}`}>
                              {active?t('Qaytarilmagan'):t('Qaytarilgan')}
                            </span>
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                {adv.amount.toLocaleString()} <span className="text-base font-medium text-slate-400">{adv.currency}</span>
                              </p>
                              {adv.currency === 'USD' && (
                                <p className="text-xs text-slate-400">≈ {Math.round(adv.amount*exchangeRate).toLocaleString()} so'm</p>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 tabular-nums">
                              {new Date(adv.loanDate||adv.createdAt).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                          {adv.notes && (
                            <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{adv.notes}</p>
                          )}
                          {active && (
                            <button onClick={()=>{setRepayTarget(adv);setRepayForm({amount:String(adv.remainingAmount??adv.amount),currency:adv.currency||'UZS',paymentMethod:'CASH',notes:''});setShowRepay(true);}}
                              className="mt-3 w-full py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5"/> {t('Qaytarish')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ══ BUDGET ══ */}
          {activeTab === 'budget' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input type="month" value={budgetMonth} onChange={e=>setBudgetMonth(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <p className="text-sm text-slate-400">{budgets.length} {t('ta budjet')}</p>
                </div>
                <button onClick={()=>setShowNewBudget(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors self-start">
                  <Plus className="w-4 h-4"/> {t('Yangi budjet')}
                </button>
              </div>

              {budgets.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                  <p className="text-sm font-medium">{t('Budjet belgilanmagan')}</p>
                  <p className="text-xs mt-1">{t('Yangi budjet qoshish uchun yuqoridagi tugmani bosing')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets.map(b => {
                    const pct = b.amount > 0 ? Math.min(100, Math.round((b.spent||0)/b.amount*100)) : 0;
                    const barColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981';
                    const cat = getCat(b.category);
                    const Icon = cat.icon;
                    const over = (b.spent||0) > b.amount;
                    return (
                      <div key={b.id} className={`bg-white rounded-xl border p-4 ${over?'border-rose-200':'border-slate-200/70'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor:cat.color+'20'}}>
                              <Icon className="w-4 h-4" style={{color:cat.color}}/>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{t(cat.label)}</p>
                              <p className="text-xs text-slate-400">{b.year}/{String(b.month).padStart(2,'0')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold tabular-nums ${over?'text-rose-600':'text-slate-800'}`}>
                              {Math.round(b.spent||0).toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {Math.round(b.amount).toLocaleString()} {b.currency}</span>
                            </p>
                            {over && <p className="text-xs text-rose-500 font-medium">{t('Oshdi')}: +{Math.round((b.spent||0)-b.amount).toLocaleString()}</p>}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>{pct}% {t('sarflangan')}</span>
                            <span className={`font-semibold ${over?'text-rose-500':''}`}>
                              {Math.max(0,Math.round(b.amount-(b.spent||0))).toLocaleString()} {b.currency} {t('qoldi')}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:barColor}}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Kirim */}
      <CModal open={showKirim} onClose={()=>setShowKirim(false)} title={t('Kassa kirim')}
        footer={<>
          <button onClick={()=>setShowKirim(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleKirim} disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Tasdiqlash')}
          </button>
        </>}>
        <div><Lbl>{t('Summa')}</Lbl><input value={kirimForm.amount} onChange={e=>setKirimForm({...kirimForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/></div>
        <div><Lbl>{t('Valyuta')}</Lbl>
          <select value={kirimForm.currency} onChange={e=>setKirimForm({...kirimForm,currency:e.target.value})} className={inp}>
            <option value="UZS">UZS (so'm)</option><option value="USD">USD ($)</option>
          </select>
        </div>
        <div><Lbl>{t('Tolov usuli')}</Lbl>
          <MethodPicker value={kirimForm.paymentMethod}
            onChange={v=>setKirimForm(prev=>({...prev,paymentMethod:v,currency:v==='CARD'?'UZS':prev.currency}))}/>
        </div>
        <div><Lbl>{t('Izoh')}</Lbl><input value={kirimForm.description} onChange={e=>setKirimForm({...kirimForm,description:e.target.value})} placeholder={t('Ixtiyoriy...')} className={inp}/></div>
      </CModal>

      {/* Chiqim */}
      <CModal open={showChiqim} onClose={()=>setShowChiqim(false)} title={t('Kassa chiqim')}
        footer={<>
          <button onClick={()=>setShowChiqim(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleChiqim} disabled={submitting} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Tasdiqlash')}
          </button>
        </>}>
        <div><Lbl>{t('Summa')}</Lbl><input value={chiqimForm.amount} onChange={e=>setChiqimForm({...chiqimForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/></div>
        <div><Lbl>{t('Valyuta')}</Lbl>
          <select value={chiqimForm.currency} onChange={e=>setChiqimForm({...chiqimForm,currency:e.target.value})} className={inp}>
            <option value="USD">USD ($)</option><option value="UZS">UZS (so'm)</option>
          </select>
        </div>
        <div><Lbl>{t('Tolov usuli')}</Lbl>
          <MethodPicker value={chiqimForm.paymentMethod}
            onChange={v=>setChiqimForm(prev=>({...prev,paymentMethod:v,currency:v==='CARD'?'UZS':prev.currency}))}/>
        </div>
        <div><Lbl>{t('Izoh')}</Lbl><input value={chiqimForm.description} onChange={e=>setChiqimForm({...chiqimForm,description:e.target.value})} placeholder={t('Ixtiyoriy...')} className={inp}/></div>
      </CModal>

      {/* Exchange */}
      <CModal open={showExchange} onClose={()=>setShowExchange(false)} title={t('Valyuta ayirboshlash')}
        footer={<>
          <button onClick={()=>setShowExchange(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleExchange} disabled={submitting} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Ayirboshlash')}
          </button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Dan (valyuta)')}</Lbl>
            <select value={exchForm.fromCurrency} onChange={e=>setExchForm({...exchForm,fromCurrency:e.target.value})} className={inp}>
              <option value="USD">USD</option><option value="UZS">UZS</option>
            </select>
          </div>
          <div><Lbl>{t('Ga (valyuta)')}</Lbl>
            <select value={exchForm.toCurrency} onChange={e=>setExchForm({...exchForm,toCurrency:e.target.value})} className={inp}>
              <option value="UZS">UZS</option><option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div>
          <Lbl>{t('Summa')} ({exchForm.fromCurrency})</Lbl>
          <input value={exchForm.amount} onChange={e=>setExchForm({...exchForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/>
          {exchForm.amount && +exchForm.amount > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              ≈ {exchForm.fromCurrency==='USD'
                ? (+exchForm.amount*exchangeRate).toLocaleString()+" so'm"
                : (+exchForm.amount/exchangeRate).toFixed(2)+' USD'}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Dan (tur)')}</Lbl>
            <select value={exchForm.fromType} onChange={e=>setExchForm({...exchForm,fromType:e.target.value})} className={inp}>
              <option value="CASH">{t('Naqd')}</option><option value="CARD">{t('Karta')}</option>
            </select>
          </div>
          <div><Lbl>{t('Ga (tur)')}</Lbl>
            <select value={exchForm.toType} onChange={e=>setExchForm({...exchForm,toType:e.target.value})} className={inp}>
              <option value="CASH">{t('Naqd')}</option><option value="CARD">{t('Karta')}</option>
            </select>
          </div>
        </div>
      </CModal>

      {/* Expense */}
      <CModal open={showExpense} onClose={()=>setShowExpense(false)} title={t('Yangi xarajat')}
        footer={<>
          <button onClick={()=>setShowExpense(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleExpense} disabled={submitting || ((parseFloat(expForm.amountUZS)||0) <= 0 && (parseFloat(expForm.amountUSD)||0) <= 0 && (parseFloat(expForm.amountKarta)||0) <= 0)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Saqlash')}
          </button>
        </>}>
        <div>
          <Lbl>{t('Kategoriya')}</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {allCats
              .filter(c => !['LOAN_REPAYMENT','ADJUSTMENT','REVERSAL'].includes(c.id))
              .map(c => {
                const active = expForm.category === c.id;
                return (
                  <button key={c.id} type="button" onClick={()=>setExpForm({...expForm,category:c.id})}
                    className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all
                      ${active?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                    {t(c.label)}
                  </button>
                );
              })
            }
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Lbl>{t('UZS (naqd)')}</Lbl>
            <input value={expForm.amountUZS} onChange={e=>setExpForm({...expForm,amountUZS:e.target.value})}
              type="number" min="0" placeholder="0" className={inp}/>
          </div>
          <div>
            <Lbl>{t('Dollar ($)')}</Lbl>
            <input value={expForm.amountUSD} onChange={e=>setExpForm({...expForm,amountUSD:e.target.value})}
              type="number" min="0" step="0.01" placeholder="0.00" className={inp}/>
          </div>
          <div>
            <Lbl>{t('Karta (UZS)')}</Lbl>
            <input value={expForm.amountKarta} onChange={e=>setExpForm({...expForm,amountKarta:e.target.value})}
              type="number" min="0" placeholder="0" className={inp}/>
          </div>
        </div>
        {/* Jami ko'rsatish */}
        {((parseFloat(expForm.amountUZS)||0) > 0 || (parseFloat(expForm.amountUSD)||0) > 0 || (parseFloat(expForm.amountKarta)||0) > 0) && (
          <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700 font-semibold flex flex-wrap gap-3">
            <span>{t('Jami')}:</span>
            {(parseFloat(expForm.amountUZS)||0) > 0 && <span>{Math.round(parseFloat(expForm.amountUZS)).toLocaleString()} UZS</span>}
            {(parseFloat(expForm.amountUSD)||0) > 0 && <span>${parseFloat(expForm.amountUSD).toLocaleString()}</span>}
            {(parseFloat(expForm.amountKarta)||0) > 0 && <span>{Math.round(parseFloat(expForm.amountKarta)).toLocaleString()} UZS ({t('Karta')})</span>}
          </div>
        )}
        <div><Lbl>{t('Tavsif')}</Lbl><input value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} placeholder={t('Ixtiyoriy...')} className={inp}/></div>
      </CModal>

      {/* Loan */}
      <CModal open={showLoan} onClose={()=>setShowLoan(false)} title={t('Yangi qarz')}
        footer={<>
          <button onClick={()=>setShowLoan(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleLoan} disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Saqlash')}
          </button>
        </>}>
        <div><Lbl>{t('Xodim ismi')}</Lbl><input value={loanForm.employeeName} onChange={e=>setLoanForm({...loanForm,employeeName:e.target.value})} placeholder="F.I.O." className={inp}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Summa')}</Lbl><input value={loanForm.amount} onChange={e=>setLoanForm({...loanForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/></div>
          <div><Lbl>{t('Valyuta')}</Lbl>
            <select value={loanForm.currency} onChange={e=>setLoanForm({...loanForm,currency:e.target.value})} className={inp}>
              <option value="UZS">UZS</option><option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div><Lbl>{t('Maqsad')}</Lbl><input value={loanForm.purpose} onChange={e=>setLoanForm({...loanForm,purpose:e.target.value})} placeholder={t('Qarz maqsadi...')} className={inp}/></div>
        <div><Lbl>{t('Qaytarish sanasi')}</Lbl><input type="date" value={loanForm.dueDate} onChange={e=>setLoanForm({...loanForm,dueDate:e.target.value})} className={inp}/></div>
        <div><Lbl>{t('Izoh')}</Lbl><input value={loanForm.notes} onChange={e=>setLoanForm({...loanForm,notes:e.target.value})} placeholder={t('Ixtiyoriy...')} className={inp}/></div>
      </CModal>

      {/* Advance */}
      <CModal open={showAdvance} onClose={()=>setShowAdvance(false)} title={t('Avans berish')}
        footer={<>
          <button onClick={()=>setShowAdvance(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleAdvance} disabled={submitting} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Berish')}
          </button>
        </>}>
        <div><Lbl>{t('Xodim ismi')}</Lbl><input value={advForm.employeeName} onChange={e=>setAdvForm({...advForm,employeeName:e.target.value})} placeholder="F.I.O." className={inp}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Summa')}</Lbl><input value={advForm.amount} onChange={e=>setAdvForm({...advForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/></div>
          <div><Lbl>{t('Valyuta')}</Lbl>
            <select value={advForm.currency} onChange={e=>setAdvForm({...advForm,currency:e.target.value})} className={inp}>
              <option value="UZS">UZS</option><option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div><Lbl>{t('Maqsad')}</Lbl><input value={advForm.purpose} onChange={e=>setAdvForm({...advForm,purpose:e.target.value})} placeholder={t('Avans maqsadi...')} className={inp}/></div>
        <div><Lbl>{t('Izoh')}</Lbl><input value={advForm.notes} onChange={e=>setAdvForm({...advForm,notes:e.target.value})} placeholder={t('Ixtiyoriy...')} className={inp}/></div>
      </CModal>

      {/* Exchange rate */}
      <CModal open={showRate} onClose={()=>setShowRate(false)} title={t('Valyuta kursini ozgartirish')}
        footer={<>
          <button onClick={()=>setShowRate(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={saveRate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold">{t('Saqlash')}</button>
        </>}>
        <div>
          <Lbl>1 USD = ? UZS</Lbl>
          <input value={rateInput} onChange={e=>setRateInput(e.target.value)} type="number" min="1" className={inp}/>
          <p className="text-xs text-slate-400 mt-1">{t('Hozirgi kurs')}: {exchangeRate.toLocaleString('en-US')} so'm</p>
        </div>
      </CModal>

      {/* Repay Loan / Advance */}
      <CModal open={showRepay} onClose={()=>{setShowRepay(false);setRepayTarget(null);}} title={repayTarget?.repaymentType==='ADVANCE'?t('Avansni qaytarish'):t('Qarzni tolash')}
        footer={<>
          <button onClick={()=>{setShowRepay(false);setRepayTarget(null);}} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleRepay} disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Tasdiqlash')}
          </button>
        </>}>
        {repayTarget && (
          <>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-800">{repayTarget.employeeName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Qolgan qarz')}: <b className="text-slate-700">{(repayTarget.remainingAmount??repayTarget.amount).toLocaleString()} {repayTarget.currency}</b>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Lbl>{t('Summa')}</Lbl>
                <input value={repayForm.amount} onChange={e=>setRepayForm({...repayForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/>
              </div>
              <div><Lbl>{t('Valyuta')}</Lbl>
                <select value={repayForm.currency} onChange={e=>setRepayForm({...repayForm,currency:e.target.value})} className={inp}>
                  <option value="UZS">UZS</option><option value="USD">USD</option>
                </select>
              </div>
            </div>
            {repayForm.currency !== (repayTarget.currency||'UZS') && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5"/>
                {t('Valyuta farqi bor. Tizim avtomatik joriy kursdan foydalanadi')}: 1 USD = {exchangeRate.toLocaleString()} so'm
              </div>
            )}
            <div><Lbl>{t('Tolov usuli')}</Lbl>
              <MethodPicker value={repayForm.paymentMethod} onChange={v=>setRepayForm({...repayForm,paymentMethod:v})}/>
            </div>
            <div><Lbl>{t('Izoh')}</Lbl>
              <input value={repayForm.notes} onChange={e=>setRepayForm({...repayForm,notes:e.target.value})} placeholder={t('Ixtiyoriy...')} className={inp}/>
            </div>
          </>
        )}
      </CModal>

      {/* Cancel Transaction */}
      <CModal open={showCancel} onClose={()=>{setShowCancel(false);setCancelTarget(null);setCancelReason('');}} title={t('Tranzaksiyani bekor qilish')}
        footer={<>
          <button onClick={()=>{setShowCancel(false);setCancelTarget(null);setCancelReason('');}} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Yopish')}</button>
          <button onClick={handleCancel} disabled={submitting||!cancelReason.trim()} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Bekor qilish')}
          </button>
        </>}>
        {cancelTarget && (
          <>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-medium text-slate-700">{fixDesc(cancelTarget.description)||cancelTarget.category}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {cancelTarget.type==='INCOME'?'+':'-'}{cancelTarget.amount?.toLocaleString()} {cancelTarget.currency} · {new Date(cancelTarget.createdAt).toLocaleDateString('uz-UZ')}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
              <span>{t('Tranzaksiya uchrilmaydi — teskari yozuv (reversal) yaratiladi. Bu buxgalteriya talabi')}</span>
            </div>
            <div>
              <Lbl>{t('Bekor qilish sababi')} *</Lbl>
              <input value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder={t('Masalan: xato kiritildi...')} className={inp}/>
            </div>
          </>
        )}
      </CModal>

      {/* Reconcile */}
      <CModal open={showReconcile} onClose={()=>setShowReconcile(false)} title={t('Kassa tekshiruvi')}
        footer={<>
          <button onClick={()=>setShowReconcile(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleReconcile} disabled={submitting||!reconcileForm.reason.trim()} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Tasdiqlash')}
          </button>
        </>}>
        <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{t('Tizim hisoblagan')}</p>
          <div className="flex justify-between"><span className="text-slate-500">Naqd UZS:</span><b className={`tabular-nums ${cashUZS<0?'text-rose-600':''}`}>{Math.round(cashUZS).toLocaleString()}</b></div>
          <div className="flex justify-between"><span className="text-slate-500">Naqd USD:</span><b className={`tabular-nums ${cashUSD<0?'text-rose-600':''}`}>{cashUSD.toFixed(2)}</b></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Fizik UZS')}</Lbl>
            <input value={reconcileForm.physicalUZS} onChange={e=>setReconcileForm({...reconcileForm,physicalUZS:e.target.value})} type="number" min="0" placeholder="0" className={inp}/>
          </div>
          <div><Lbl>{t('Fizik USD')}</Lbl>
            <input value={reconcileForm.physicalUSD} onChange={e=>setReconcileForm({...reconcileForm,physicalUSD:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/>
          </div>
        </div>
        {(reconcileForm.physicalUZS || reconcileForm.physicalUSD) && (
          <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1">
            <p className="font-semibold text-blue-700">{t('Farq')}</p>
            {reconcileForm.physicalUZS && (
              <p className="text-slate-600">UZS: {((+reconcileForm.physicalUZS||0)-cashUZS>0?'+':'')+Math.round((+reconcileForm.physicalUZS||0)-cashUZS).toLocaleString()}</p>
            )}
            {reconcileForm.physicalUSD && (
              <p className="text-slate-600">USD: {((+reconcileForm.physicalUSD||0)-cashUSD>0?'+':'')+((+reconcileForm.physicalUSD||0)-cashUSD).toFixed(2)}</p>
            )}
          </div>
        )}
        <div>
          <Lbl>{t('Sabab')} *</Lbl>
          <input value={reconcileForm.reason} onChange={e=>setReconcileForm({...reconcileForm,reason:e.target.value})} placeholder={t('Kunlik tekshiruv, xato tuzatish...')} className={inp}/>
        </div>
      </CModal>

      {/* Add Category */}
      <CModal open={showAddCat} onClose={()=>setShowAddCat(false)} title={t('Yangi kategoriya')}
        footer={<>
          <button onClick={()=>setShowAddCat(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleAddCat} disabled={!addCatForm.label.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold">
            {t('Qoshish')}
          </button>
        </>}>
        <div>
          <Lbl>{t('Kategoriya nomi')}</Lbl>
          <input value={addCatForm.label} onChange={e=>setAddCatForm({...addCatForm,label:e.target.value})}
            placeholder={t('Masalan: Ozoq-ovqat...')} className={inp}/>
        </div>
        <div>
          <Lbl>{t('Rang tanlash')}</Lbl>
          <div className="flex flex-wrap gap-2 mt-1">
            {CAT_COLORS.map(color=>(
              <button key={color} type="button" onClick={()=>setAddCatForm({...addCatForm,color})}
                className={`w-8 h-8 rounded-full transition-all ${addCatForm.color===color?'ring-2 ring-offset-2 ring-slate-400 scale-110':''}`}
                style={{backgroundColor:color}}/>
            ))}
          </div>
        </div>
        <div>
          <Lbl>{t('Belgi (icon)')}</Lbl>
          <div className="grid grid-cols-6 gap-2 mt-1">
            {Object.entries(ICON_MAP).map(([name, Icon])=>(
              <button key={name} type="button" onClick={()=>setAddCatForm({...addCatForm,icon:name})}
                className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all
                  ${addCatForm.icon===name?'border-indigo-500 bg-indigo-50':'border-slate-200 hover:border-slate-300'}`}>
                <Icon className={`w-5 h-5 ${addCatForm.icon===name?'text-indigo-600':'text-slate-400'}`}/>
              </button>
            ))}
          </div>
        </div>
        {addCatForm.label.trim() && (
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:addCatForm.color+'20'}}>
              {(() => { const Icon = ICON_MAP[addCatForm.icon]; return <Icon className="w-5 h-5" style={{color:addCatForm.color}}/>; })()}
            </div>
            <span className="text-sm font-semibold text-slate-700">{addCatForm.label}</span>
          </div>
        )}
      </CModal>

      {/* New Budget */}
      <CModal open={showNewBudget} onClose={()=>setShowNewBudget(false)} title={t('Yangi budjet')}
        footer={<>
          <button onClick={()=>setShowNewBudget(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleNewBudget} disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Saqlash')}
          </button>
        </>}>
        <div>
          <Lbl>{t('Kategoriya')}</Lbl>
          <select value={budgetForm.category} onChange={e=>setBudgetForm({...budgetForm,category:e.target.value})} className={inp}>
            {allCats.filter(c=>!['LOAN_REPAYMENT','ADJUSTMENT','REVERSAL'].includes(c.id)).map(c=>(
              <option key={c.id} value={c.id}>{t(c.label)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Summa')}</Lbl>
            <input value={budgetForm.amount} onChange={e=>setBudgetForm({...budgetForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/>
          </div>
          <div><Lbl>{t('Valyuta')}</Lbl>
            <select value={budgetForm.currency} onChange={e=>setBudgetForm({...budgetForm,currency:e.target.value})} className={inp}>
              <option value="UZS">UZS</option><option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div>
          <Lbl>{t('Ogohlantirish chegara')} %</Lbl>
          <input value={budgetForm.alertThreshold} onChange={e=>setBudgetForm({...budgetForm,alertThreshold:e.target.value})} type="number" min="1" max="100" placeholder="80" className={inp}/>
          <p className="text-xs text-slate-400 mt-1">{t('Budjet shuncha foizga yetganda ogohlantirish beradi')}</p>
        </div>
        <div>
          <Lbl>{t('Oy')}</Lbl>
          <input type="month" value={budgetMonth} onChange={e=>setBudgetMonth(e.target.value)} className={inp}/>
        </div>
      </CModal>

    </div>
  );
}
