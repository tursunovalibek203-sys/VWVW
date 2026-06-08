import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, Banknote,
  Smartphone, ArrowLeftRight, Receipt, Users, Zap, Truck, Wrench,
  Building2, ShoppingCart, MoreHorizontal, RefreshCw, Plus, Loader2, X,
  History, UserCheck, ArrowUpRight, ArrowDownRight, Download, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { exportToExcel } from '../lib/excelUtils';

const t = latinToCyrillic;

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
];

const getCat = (id: string) =>
  EXPENSE_CATS.find(c => c.id === id) ?? EXPENSE_CATS[EXPENSE_CATS.length - 1];

const BUCKET_COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6'];
type TabType = 'overview' | 'history' | 'expenses' | 'loans' | 'advances';

// ─── Small shared components ────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 leading-tight">{title}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '20' }}>
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400 tabular-nums">{sub}</p>}
    </div>
  );
}

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
    { id: 'CLICK', label: 'Click',    Icon: Smartphone, clr: '#8b5cf6' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
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
  const [exchangeRate, setExchangeRate] = useState(() =>
    parseInt(localStorage.getItem('cashboxExchangeRate') || '12500', 10));
  const [rateInput, setRateInput] = useState(
    localStorage.getItem('cashboxExchangeRate') || '12500');

  const [showKirim,    setShowKirim]    = useState(false);
  const [showChiqim,   setShowChiqim]   = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [showExpense,  setShowExpense]  = useState(false);
  const [showLoan,     setShowLoan]     = useState(false);
  const [showAdvance,  setShowAdvance]  = useState(false);
  const [showRate,     setShowRate]     = useState(false);

  const INIT = { amount: '', currency: 'UZS', paymentMethod: 'CASH', description: '' };
  const [kirimForm,    setKirimForm]    = useState(INIT);
  const [chiqimForm,   setChiqimForm]   = useState({ ...INIT, currency: 'USD' });
  const [exchForm,     setExchForm]     = useState({
    fromCurrency: 'USD', toCurrency: 'UZS', fromType: 'CASH', toType: 'CASH', amount: '', description: '',
  });
  const [expForm,  setExpForm]  = useState({ amount: '', currency: 'UZS', category: 'SALARY', paymentMethod: 'CASH', description: '' });
  const [loanForm, setLoanForm] = useState({ employeeName: '', amount: '', currency: 'UZS', purpose: '', dueDate: '', notes: '' });
  const [advForm,  setAdvForm]  = useState({ employeeName: '', amount: '', currency: 'UZS', purpose: '', notes: '' });

  const [hf, setHf] = useState({ type: 'ALL', paymentMethod: 'ALL', startDate: '', endDate: '' });

  // ── Load ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const [sumR, txR, expR, loanR, rateR] = await Promise.allSettled([
        api.get('/cashbox/summary'),
        api.get('/cashbox/transactions?limit=300'),
        api.get('/expenses'),
        api.get('/cashbox/loans'),
        api.get('/exchange-rates'),
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
    } catch { addToast({ type: 'error', title: t('Malumot yuklashda xatolik') }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Computed ─────────────────────────────────────────────────────────────
  const cashUZS  = cashbox?.byCurrency?.cashUZS  || 0;
  const cashUSD  = cashbox?.byCurrency?.cashUSD  || 0;
  const cardUZS  = cashbox?.byCurrency?.cardUZS  || 0;
  const clickUZS = cashbox?.byCurrency?.clickUZS || 0;
  const totalUZS = cashUZS + cashUSD * exchangeRate + cardUZS + clickUZS;

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

  const expCatData = useMemo(() => {
    const map: Record<string,number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category]||0) + toUZS(e.amount, e.currency||'UZS'); });
    return Object.entries(map).map(([cat,val])=>({ cat, val: Math.round(val), label: t(getCat(cat).label) }))
      .sort((a,b)=>b.val-a.val).slice(0,8);
  }, [expenses, exchangeRate]);

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

  const handleExpense  = () => { if (!expForm.amount||+expForm.amount<=0) return;
    doPost('/expenses', { amount:+expForm.amount, currency:expForm.currency, category:expForm.category, paymentMethod:expForm.paymentMethod, description:expForm.description },
      'Xarajat qoshildi', ()=>{ setShowExpense(false); setExpForm({amount:'',currency:'UZS',category:'SALARY',paymentMethod:'CASH',description:''}); }); };

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

  const handleExport = () => {
    const rows = filteredTx.map(tx => ({
      [t('Sana')]:        new Date(tx.createdAt).toLocaleString('uz-UZ'),
      [t('Tur')]:         tx.type === 'INCOME' ? t('Kirim') : t('Chiqim'),
      [t('Summa')]:       tx.amount,
      [t('Valyuta')]:     tx.currency || 'UZS',
      [t('Tolov usuli')]: tx.paymentMethod || 'CASH',
      [t('Kategoriya')]:  tx.category || '',
      [t('Tavsif')]:      tx.description || '',
    }));
    exportToExcel(rows, { fileName: t('Kassa tarixi'), sheetName: t('Tarix') });
  };

  const inp = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all';

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id:'overview',  label: t('Umumiy'),     icon: Wallet },
    { id:'history',   label: t('Tarix'),      icon: History },
    { id:'expenses',  label: t('Xarajatlar'), icon: Receipt },
    { id:'loans',     label: t('Qarzlar'),    icon: DollarSign },
    { id:'advances',  label: t('Avanslar'),   icon: UserCheck },
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
            1 USD = {exchangeRate.toLocaleString('en-US')} UZS
            <button onClick={()=>setShowRate(true)} className="ml-2 text-indigo-500 hover:underline text-xs font-medium">{t('ozgartirish')}</button>
          </p>
        </div>
        <button onClick={()=>loadAll(true)} disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60 self-start">
          <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/> <span className="hidden sm:inline">{t('Yangilash')}</span>
        </button>
      </div>

      {/* Balance banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-indigo-500/20">
        <p className="text-indigo-200 text-sm font-medium">{t('Umumiy balans')}</p>
        <p className="text-4xl font-bold tabular-nums mt-1">
          {Math.round(totalUZS).toLocaleString('en-US')} <span className="text-2xl text-indigo-200">UZS</span>
        </p>
        <p className="text-indigo-200 text-sm mt-1">≈ {(totalUZS / exchangeRate).toFixed(2)} USD</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/20">
          {[
            { label: t('Naqd UZS'),  val: cashUZS.toLocaleString('en-US'),              sub: 'UZS' },
            { label: t('Naqd USD'),  val: cashUSD.toLocaleString('en-US'),               sub: 'USD' },
            { label: t('Karta UZS'), val: cardUZS.toLocaleString('en-US'),              sub: 'UZS' },
            { label: 'Click UZS',    val: clickUZS.toLocaleString('en-US'),             sub: 'UZS' },
          ].map(b => (
            <div key={b.label}>
              <p className="text-indigo-300 text-xs">{b.label}</p>
              <p className="text-white font-bold text-sm tabular-nums">{b.val} <span className="text-indigo-300 text-xs font-normal">{b.sub}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t('Naqd (UZS)')}  value={formatCurrency(cashUZS,'UZS')}  icon={Banknote}   color="#10b981"/>
        <KpiCard title={t('Naqd (USD)')}  value={formatCurrency(cashUSD,'USD')}  icon={DollarSign} color="#3b82f6"
          sub={cashUSD>0 ? '≈ '+Math.round(cashUSD*exchangeRate).toLocaleString()+' UZS' : undefined}/>
        <KpiCard title={t('Karta (UZS)')} value={formatCurrency(cardUZS,'UZS')}  icon={CreditCard} color="#6366f1"/>
        <KpiCard title="Click (UZS)"      value={formatCurrency(clickUZS,'UZS')} icon={Smartphone} color="#8b5cf6"/>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('Bugungi kirim'),   val: cashbox?.todayIncome   ||0, c:'text-emerald-600', Icon: TrendingUp },
          { label: t('Bugungi chiqim'),  val: cashbox?.todayExpense  ||0, c:'text-rose-600',    Icon: TrendingDown },
          { label: t('Oylik kirim'),     val: cashbox?.monthlyIncome ||0, c:'text-blue-600',    Icon: TrendingUp },
          { label: t('Oylik chiqim'),    val: cashbox?.monthlyExpense||0, c:'text-orange-600',  Icon: TrendingDown },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <s.Icon className={`w-3.5 h-3.5 ${s.c}`}/>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
            </div>
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {Math.round(s.val).toLocaleString()}
              <span className="text-xs font-medium text-slate-400 ml-1">UZS</span>
            </p>
          </div>
        ))}
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                      <Tooltip formatter={(v:any)=>[(v*1000).toLocaleString()+' UZS']}/>
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
                          <Tooltip formatter={(v:any)=>[Math.round(v).toLocaleString()+' UZS']}/>
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
                                {tx.description || (tx.type==='INCOME' ? t('Kirim') : t('Chiqim'))}
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
                    {[['ALL',t('Barchasi')],['CASH',t('Naqd')],['CARD',t('Karta')],['CLICK','Click']].map(([v,l])=>(
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
                      {Math.round(s.val).toLocaleString()} <span className="text-xs font-normal">UZS</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[t('Sana'),t('Tur'),t('Tavsif'),t('Usul'),t('Summa')].map((h,i)=>(
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide ${i===4?'text-right':'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTx.length === 0
                      ? <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">{t('Tranzaksiyalar yoq')}</td></tr>
                      : filteredTx.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap tabular-nums">
                            {new Date(tx.createdAt).toLocaleString('uz-UZ',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                              ${tx.type==='INCOME'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>
                              {tx.type==='INCOME'?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}
                              {tx.type==='INCOME'?t('Kirim'):t('Chiqim')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-xs truncate text-sm">{tx.description||tx.category||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {tx.paymentMethod==='CASH'  ? <span className="flex items-center gap-1"><Banknote  className="w-3.5 h-3.5 text-emerald-500"/>{t('Naqd')}</span>
                            :tx.paymentMethod==='CARD'  ? <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-blue-500"/>{t('Karta')}</span>
                            :tx.paymentMethod==='CLICK' ? <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-violet-500"/>Click</span>
                            : tx.paymentMethod||'—'}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${tx.type==='INCOME'?'text-emerald-600':'text-rose-600'}`}>
                            {tx.type==='INCOME'?'+':'-'}{tx.amount.toLocaleString('en-US')}
                            <span className="text-xs font-normal ml-0.5 text-slate-400">{tx.currency||'UZS'}</span>
                          </td>
                        </tr>
                      ))
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
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {t('Jami')}: {Math.round(expenses.reduce((s,e)=>s+toUZS(e.amount,e.currency||'UZS'),0)).toLocaleString()} UZS
                  <span className="text-slate-400 font-normal ml-1">({expenses.length} {t('ta')})</span>
                </p>
                <button onClick={()=>setShowExpense(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4"/> {t('Yangi xarajat')}
                </button>
              </div>

              {expCatData.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t('Kategoriyalar boyicha (UZS)')}</p>
                  <ResponsiveContainer width="100%" height={Math.max(120, expCatData.length * 30)}>
                    <BarChart data={expCatData} layout="vertical" margin={{left:0,right:10,top:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>(v/1000).toFixed(0)+'k'}/>
                      <YAxis dataKey="label" type="category" width={85} tick={{fontSize:11}}/>
                      <Tooltip formatter={(v:any)=>[Math.round(v).toLocaleString()+' UZS']}/>
                      <Bar dataKey="val" fill="#6366f1" radius={[0,6,6,0]} maxBarSize={18}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[t('Sana'),t('Kategoriya'),t('Tavsif'),t('Summa')].map((h,i)=>(
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide ${i===3?'text-right':'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.length === 0
                      ? <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">{t('Xarajatlar yoq')}</td></tr>
                      : expenses.map(e => {
                        const cat = getCat(e.category);
                        const Icon = cat.icon;
                        return (
                          <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap tabular-nums">
                              {new Date(e.createdAt).toLocaleDateString('uz-UZ')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:cat.color+'20'}}>
                                  <Icon className="w-3.5 h-3.5" style={{color:cat.color}}/>
                                </div>
                                <span className="text-sm font-medium text-slate-700">{t(cat.label)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-sm max-w-xs truncate">{e.description||'—'}</td>
                            <td className="px-4 py-3 text-right text-rose-600 font-bold tabular-nums">
                              -{e.amount.toLocaleString('en-US')}
                              <span className="text-xs font-normal ml-0.5 text-slate-400">{e.currency||'UZS'}</span>
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
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
                    ({Math.round(advanceList.reduce((s,a)=>s+toUZS(a.amount,a.currency||'UZS'),0)/1000)}k UZS)
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
                                <p className="text-xs text-slate-400">≈ {Math.round(adv.amount*exchangeRate).toLocaleString()} UZS</p>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 tabular-nums">
                              {new Date(adv.loanDate||adv.createdAt).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                          {adv.notes && (
                            <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{adv.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
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
            onChange={v=>setKirimForm({...kirimForm,paymentMethod:v,currency:v==='CARD'?'UZS':kirimForm.currency})}/>
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
            onChange={v=>setChiqimForm({...chiqimForm,paymentMethod:v,currency:v==='CARD'?'UZS':chiqimForm.currency})}/>
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
                ? (+exchForm.amount*exchangeRate).toLocaleString()+' UZS'
                : (+exchForm.amount/exchangeRate).toFixed(2)+' USD'}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Dan (tur)')}</Lbl>
            <select value={exchForm.fromType} onChange={e=>setExchForm({...exchForm,fromType:e.target.value})} className={inp}>
              <option value="CASH">{t('Naqd')}</option><option value="CARD">{t('Karta')}</option><option value="CLICK">Click</option>
            </select>
          </div>
          <div><Lbl>{t('Ga (tur)')}</Lbl>
            <select value={exchForm.toType} onChange={e=>setExchForm({...exchForm,toType:e.target.value})} className={inp}>
              <option value="CASH">{t('Naqd')}</option><option value="CARD">{t('Karta')}</option><option value="CLICK">Click</option>
            </select>
          </div>
        </div>
      </CModal>

      {/* Expense */}
      <CModal open={showExpense} onClose={()=>setShowExpense(false)} title={t('Yangi xarajat')}
        footer={<>
          <button onClick={()=>setShowExpense(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleExpense} disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Saqlash')}
          </button>
        </>}>
        <div>
          <Lbl>{t('Kategoriya')}</Lbl>
          <div className="grid grid-cols-4 gap-1.5">
            {EXPENSE_CATS.map(c => {
              const Icon = c.icon;
              const active = expForm.category === c.id;
              return (
                <button key={c.id} type="button" onClick={()=>setExpForm({...expForm,category:c.id})}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                    ${active?'border-indigo-500 bg-indigo-50':'border-slate-200 hover:border-slate-300'}`}>
                  <Icon className={`w-4 h-4 ${active?'text-indigo-600':'text-slate-400'}`}/>
                  <span className={`text-[9px] font-semibold text-center leading-tight ${active?'text-indigo-700':'text-slate-500'}`}>{t(c.label)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>{t('Summa')}</Lbl><input value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} type="number" min="0" placeholder="0.00" className={inp}/></div>
          <div><Lbl>{t('Valyuta')}</Lbl>
            <select value={expForm.currency} onChange={e=>setExpForm({...expForm,currency:e.target.value})} className={inp}>
              <option value="UZS">UZS</option><option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div><Lbl>{t('Tolov usuli')}</Lbl>
          <MethodPicker value={expForm.paymentMethod}
            onChange={v=>setExpForm({...expForm,paymentMethod:v,currency:v==='CARD'?'UZS':expForm.currency})}/>
        </div>
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
          <p className="text-xs text-slate-400 mt-1">{t('Hozirgi kurs')}: {exchangeRate.toLocaleString('en-US')} UZS</p>
        </div>
      </CModal>

    </div>
  );
}
