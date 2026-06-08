import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import {
  BookOpen, Plus, X, Loader2, RefreshCw, ChevronDown, ChevronRight,
  Truck, Users, Building2, Receipt, DollarSign, Clock, CheckCircle,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Trash2, Edit2,
  CreditCard, Banknote, FileText, Calendar,
} from 'lucide-react';

const t = latinToCyrillic;

// ─── Constants ──────────────────────────────────────────────────────────────
const LEDGER_TYPES = [
  { id: 'SUPPLIER', label: 'Yetkazib beruvchilar (SRO)', icon: Truck,    color: '#3b82f6' },
  { id: 'DRIVER',   label: 'Haydovchilar',               icon: Truck,    color: '#10b981' },
  { id: 'EMPLOYEE', label: 'Hodimlar',                   icon: Users,    color: '#8b5cf6' },
  { id: 'EXPENSE',  label: 'Xarajat kategoriyalari',     icon: Receipt,  color: '#f97316' },
];

const getType = (id: string) => LEDGER_TYPES.find(t => t.id === id) ?? LEDGER_TYPES[0];

// ─── Small components ────────────────────────────────────────────────────────
function CModal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{children}</p>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:   { label: t('Faol'),          cls: 'bg-amber-50 text-amber-700' },
    PAID:     { label: t('Tolangan'),       cls: 'bg-emerald-50 text-emerald-700' },
    OVERDUE:  { label: t('Muddati otgan'),  cls: 'bg-rose-50 text-rose-700' },
    OVERPAID: { label: t('Ortiqcha tolangan'), cls: 'bg-purple-50 text-purple-700' },
  };
  const s = map[status] ?? map.ACTIVE;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Daftar() {
  const { addToast } = useToast();

  const [ledgers,     setLedgers]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  // Filter
  const [activeType, setActiveType] = useState<string>('ALL');

  // Selected ledger for detail view
  const [selected,   setSelected]    = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Exchange rate
  const [exchangeRate] = useState(() =>
    parseInt(localStorage.getItem('cashboxExchangeRate') || '12500', 10));

  // Modals
  const [showCreate,     setShowCreate]     = useState(false);
  const [showEntry,      setShowEntry]      = useState(false);
  const [showDelete,     setShowDelete]     = useState<string | null>(null);
  const [showDelEntry,   setShowDelEntry]   = useState<string | null>(null);
  const [entryType,      setEntryType]      = useState<'DEBIT'|'CREDIT'>('DEBIT');

  // Forms
  const [createForm, setCreateForm] = useState({
    type: 'SUPPLIER', name: '', description: '', currency: 'UZS', dueDate: '', notes: '',
  });
  const [entryForm, setEntryForm] = useState({
    amount: '', currency: 'UZS', dueDate: '', notes: '',
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadLedgers = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/ledger');
      setLedgers(Array.isArray(res.data) ? res.data : []);
    } catch { addToast({ type: 'error', title: t('Yuklashda xatolik') }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/ledger/${id}`);
      setSelected(res.data);
    } catch { addToast({ type: 'error', title: t('Yuklashda xatolik') }); }
    finally { setLoadingDetail(false); }
  };

  useEffect(() => { loadLedgers(); }, [loadLedgers]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const toUZS = (amount: number, currency: string) =>
    currency === 'USD' ? amount * exchangeRate : amount;

  const filtered = useMemo(() =>
    activeType === 'ALL' ? ledgers : ledgers.filter(l => l.type === activeType),
    [ledgers, activeType]);

  const summaryByType = useMemo(() => {
    const map: Record<string, { count: number; balance: number; overdue: number }> = {};
    LEDGER_TYPES.forEach(t => { map[t.id] = { count: 0, balance: 0, overdue: 0 }; });
    ledgers.forEach(l => {
      if (!map[l.type]) map[l.type] = { count: 0, balance: 0, overdue: 0 };
      map[l.type].count++;
      map[l.type].balance += toUZS(l.balance, l.currency);
      if (l.status === 'OVERDUE') map[l.type].overdue++;
    });
    return map;
  }, [ledgers, exchangeRate]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/ledger', createForm);
      setShowCreate(false);
      setCreateForm({ type:'SUPPLIER', name:'', description:'', currency:'UZS', dueDate:'', notes:'' });
      loadLedgers(true);
      addToast({ type: 'success', title: t('Daftar yaratildi') });
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || '' });
    } finally { setSubmitting(false); }
  };

  const handleAddEntry = async () => {
    if (submitting || !selected || !entryForm.amount || +entryForm.amount <= 0) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/ledger/${selected.id}/entries`, {
        entryType,
        amount: +entryForm.amount,
        currency: entryForm.currency,
        dueDate: entryForm.dueDate || null,
        notes: entryForm.notes,
      });
      setSelected(res.data);
      setShowEntry(false);
      setEntryForm({ amount:'', currency:'UZS', dueDate:'', notes:'' });
      loadLedgers(true);
      addToast({ type: 'success', title: entryType === 'DEBIT' ? t('Qarzdorlik qoshildi') : t('Tolov qoshildi') });
    } catch (err: any) {
      addToast({ type: 'error', title: t('Xatolik'), message: err?.response?.data?.error || '' });
    } finally { setSubmitting(false); }
  };

  const handleDeleteLedger = async (id: string) => {
    setSubmitting(true);
    try {
      await api.delete(`/ledger/${id}`);
      setShowDelete(null);
      if (selected?.id === id) setSelected(null);
      loadLedgers(true);
      addToast({ type: 'success', title: t("Daftar o'chirildi") });
    } catch { addToast({ type: 'error', title: t('Xatolik') }); }
    finally { setSubmitting(false); }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.delete(`/ledger/${selected.id}/entries/${entryId}`);
      setShowDelEntry(null);
      await loadDetail(selected.id);
      loadLedgers(true);
      addToast({ type: 'success', title: t("Yozuv o'chirildi") });
    } catch { addToast({ type: 'error', title: t('Xatolik') }); }
    finally { setSubmitting(false); }
  };

  const inp = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all';

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-7xl mx-auto p-4 space-y-5">
      {[0,1,2,3].map(i=><div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse"/>)}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600"/>
            {t('Daftar')}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{t('Haydovchilar, hodimlar, yetkazib beruvchilar bilan oldi-berdi')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>loadLedgers(true)} disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/> <span className="hidden sm:inline">{t('Yangilash')}</span>
          </button>
          <button onClick={()=>setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4"/> {t('Yangi daftar')}
          </button>
        </div>
      </div>

      {/* Type summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {LEDGER_TYPES.map(lt => {
          const Icon = lt.icon;
          const s = summaryByType[lt.id] || { count:0, balance:0, overdue:0 };
          return (
            <button key={lt.id} onClick={()=>setActiveType(activeType===lt.id?'ALL':lt.id)}
              className={`text-left bg-white rounded-2xl border p-4 hover:shadow-md transition-all
                ${activeType===lt.id?'border-indigo-500 ring-1 ring-indigo-500':'border-slate-200/70'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{backgroundColor:lt.color+'20'}}>
                  <Icon className="w-4 h-4" style={{color:lt.color}}/>
                </div>
                {s.overdue > 0 && (
                  <span className="bg-rose-50 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {s.overdue} {t('muddati otgan')}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t(lt.label)}</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                {Math.round(s.balance/1000).toLocaleString()}k UZS
              </p>
              <p className="text-xs text-slate-400">{s.count} {t('ta daftar')}</p>
            </button>
          );
        })}
      </div>

      {/* Main layout: list + detail */}
      <div className="flex gap-5 min-h-[500px]">

        {/* Ledger list */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-8 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20"/>
              <p className="text-sm">{t('Daftarlar yoq')}</p>
              <button onClick={()=>setShowCreate(true)}
                className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-semibold underline">
                {t('Yangi yaratish')}
              </button>
            </div>
          ) : filtered.map(l => {
            const lt = getType(l.type);
            const Icon = lt.icon;
            const isSelected = selected?.id === l.id;
            return (
              <div key={l.id}
                onClick={()=>{ if(isSelected){setSelected(null);}else{loadDetail(l.id);} }}
                className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all
                  ${isSelected?'border-indigo-500 ring-1 ring-indigo-500 shadow-md':'border-slate-200/70'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{backgroundColor:lt.color+'20'}}>
                      <Icon className="w-4 h-4" style={{color:lt.color}}/>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{l.name}</p>
                      <p className="text-xs text-slate-400">{t(lt.label)}</p>
                    </div>
                  </div>
                  <StatusBadge status={l.status}/>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{t('Berish kerak')}</p>
                    <p className="text-xs font-bold text-rose-600 tabular-nums">
                      {l.totalDebit.toLocaleString()} <span className="font-normal text-[9px]">{l.currency}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{t('Berildi')}</p>
                    <p className="text-xs font-bold text-emerald-600 tabular-nums">
                      {l.totalCredit.toLocaleString()} <span className="font-normal text-[9px]">{l.currency}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{t('Qoldi')}</p>
                    <p className="text-xs font-bold text-indigo-600 tabular-nums">
                      {l.balance.toLocaleString()} <span className="font-normal text-[9px]">{l.currency}</span>
                    </p>
                    {l.currency === 'USD' && l.balance > 0 && (
                      <p className="text-[9px] text-slate-400">≈{Math.round(l.balance * exchangeRate).toLocaleString()} UZS</p>
                    )}
                  </div>
                </div>
                {l.dueDate && (
                  <div className={`mt-2 flex items-center gap-1 text-xs
                    ${l.status==='OVERDUE'?'text-rose-500':'text-slate-400'}`}>
                    <Clock className="w-3 h-3"/>
                    {t('Muddat')}: {new Date(l.dueDate).toLocaleDateString('uz-UZ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                <p className="text-sm font-medium">{t('Daftarni tanlang')}</p>
                <p className="text-xs mt-1">{t('Chap tomondagi daftarga bosing')}</p>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400"/>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">

              {/* Detail header */}
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                    <p className="text-sm text-slate-400 mt-0.5">{t(getType(selected.type).label)}</p>
                    {selected.description && (
                      <p className="text-sm text-slate-600 mt-1">{selected.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selected.status}/>
                    <button onClick={()=>setShowDelete(selected.id)}
                      className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-rose-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-rose-400 font-medium uppercase">{t('Jami qarzdorlik')}</p>
                    <p className="text-xl font-bold text-rose-700 tabular-nums mt-0.5">
                      {selected.totalDebit.toLocaleString()}
                      <span className="text-xs font-normal ml-1">{selected.currency}</span>
                    </p>
                    <p className="text-[10px] text-rose-400">{t('Berish kerak edi')}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-emerald-400 font-medium uppercase">{t('Jami tolandi')}</p>
                    <p className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">
                      {selected.totalCredit.toLocaleString()}
                      <span className="text-xs font-normal ml-1">{selected.currency}</span>
                    </p>
                    <p className="text-[10px] text-emerald-400">{t('Berildi')}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-indigo-400 font-medium uppercase">{t('Qolgan qarzdorlik')}</p>
                    <p className="text-xl font-bold text-indigo-700 tabular-nums mt-0.5">
                      {selected.balance.toLocaleString()}
                      <span className="text-xs font-normal ml-1">{selected.currency}</span>
                    </p>
                    <p className="text-[10px] text-indigo-400">{t('Hali berilmadi')}</p>
                  </div>
                </div>

                {/* Progress bar */}
                {selected.totalDebit > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{t('Qoplanish')}: {selected.totalDebit > 0 ? Math.round(selected.totalCredit/selected.totalDebit*100) : 0}%</span>
                      {selected.dueDate && (
                        <span className={`flex items-center gap-1 ${selected.status==='OVERDUE'?'text-rose-500':''}`}>
                          <Clock className="w-3 h-3"/>
                          {new Date(selected.dueDate).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{width: `${Math.min(100,selected.totalDebit>0?Math.round(selected.totalCredit/selected.totalDebit*100):0)}%`}}/>
                    </div>
                  </div>
                )}

                {selected.notes && (
                  <div className="mt-3 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-600">
                    <span className="font-semibold text-slate-500">{t('Izoh')}: </span>{selected.notes}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  <button onClick={()=>{setEntryType('DEBIT');setShowEntry(true);}}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    <ArrowUpRight className="w-4 h-4"/> {t('Qarzdorlik qosh')}
                  </button>
                  <button onClick={()=>{setEntryType('CREDIT');setShowEntry(true);}}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    <ArrowDownRight className="w-4 h-4"/> {t('Tolov qosh')}
                  </button>
                </div>
              </div>

              {/* Entries table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('Sana')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('Tur')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('Muddat')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('Izoh')}</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('Summa')}</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!selected.entries || selected.entries.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                          {t('Hali yozuvlar yoq. Yuqoridagi tugmalardan birini bosing.')}
                        </td>
                      </tr>
                    ) : selected.entries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap tabular-nums">
                          {new Date(entry.createdAt).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                            ${entry.entryType==='DEBIT'?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>
                            {entry.entryType==='DEBIT'
                              ? <><ArrowUpRight className="w-3 h-3"/>{t('Berish kerak')}</>
                              : <><ArrowDownRight className="w-3 h-3"/>{t('Berildi')}</>}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {entry.dueDate ? (
                            <span className={`flex items-center gap-1 ${new Date(entry.dueDate)<new Date()&&entry.entryType==='DEBIT'?'text-rose-500':''}`}>
                              <Clock className="w-3 h-3"/>
                              {new Date(entry.dueDate).toLocaleDateString('uz-UZ')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-sm max-w-xs">
                          {entry.notes || <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-bold tabular-nums
                          ${entry.entryType==='DEBIT'?'text-rose-600':'text-emerald-600'}`}>
                          {entry.entryType==='DEBIT'?'+':'-'}{entry.amount.toLocaleString()}
                          <span className="text-xs font-normal ml-0.5 text-slate-400">{entry.currency}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={()=>setShowDelEntry(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Create ledger */}
      <CModal open={showCreate} onClose={()=>setShowCreate(false)} title={t('Yangi daftar yaratish')}
        footer={<>
          <button onClick={()=>setShowCreate(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleCreate} disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Yaratish')}
          </button>
        </>}>
        <div>
          <Lbl>{t('Tur')}</Lbl>
          <div className="grid grid-cols-2 gap-2">
            {LEDGER_TYPES.map(lt => {
              const Icon = lt.icon;
              const active = createForm.type === lt.id;
              return (
                <button key={lt.id} type="button" onClick={()=>setCreateForm({...createForm,type:lt.id})}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all
                    ${active?'border-indigo-500 bg-indigo-50':'border-slate-200 hover:border-slate-300'}`}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{backgroundColor:lt.color+'20'}}>
                    <Icon className="w-3.5 h-3.5" style={{color:lt.color}}/>
                  </div>
                  <span className={`text-xs font-semibold text-left ${active?'text-indigo-700':'text-slate-600'}`}>{t(lt.label)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Lbl>{t('Ism / Nomi')}</Lbl>
          <input value={createForm.name} onChange={e=>setCreateForm({...createForm,name:e.target.value})}
            placeholder={t('Masalan: Alisher, SRO-Toshkent, Yoqilgi...')} className={inp}/>
        </div>
        <div>
          <Lbl>{t('Tavsif')}</Lbl>
          <input value={createForm.description} onChange={e=>setCreateForm({...createForm,description:e.target.value})}
            placeholder={t('Ixtiyoriy...')} className={inp}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Lbl>{t('Valyuta')}</Lbl>
            <select value={createForm.currency} onChange={e=>setCreateForm({...createForm,currency:e.target.value})} className={inp}>
              <option value="UZS">UZS (so'm)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <Lbl>{t('Umumiy muddat sanasi')}</Lbl>
            <input type="date" value={createForm.dueDate} onChange={e=>setCreateForm({...createForm,dueDate:e.target.value})} className={inp}/>
          </div>
        </div>
        <div>
          <Lbl>{t('Izoh')}</Lbl>
          <textarea value={createForm.notes} onChange={e=>setCreateForm({...createForm,notes:e.target.value})}
            placeholder={t('Ixtiyoriy izoh...')} rows={2}
            className={`${inp} resize-none`}/>
        </div>
      </CModal>

      {/* Add entry */}
      <CModal open={showEntry} onClose={()=>setShowEntry(false)}
        title={entryType==='DEBIT' ? t('Qarzdorlik qoshish') : t('Tolov qoshish')}
        footer={<>
          <button onClick={()=>setShowEntry(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={handleAddEntry} disabled={submitting}
            className={`px-4 py-2 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2
              ${entryType==='DEBIT'?'bg-rose-600 hover:bg-rose-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t('Qoshish')}
          </button>
        </>}>
        {/* Entry type switcher */}
        <div className="grid grid-cols-2 gap-2">
          {(['DEBIT','CREDIT'] as const).map(et => (
            <button key={et} type="button" onClick={()=>setEntryType(et)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all
                ${entryType===et
                  ? et==='DEBIT' ? 'border-rose-500 bg-rose-50' : 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'}`}>
              {et==='DEBIT'
                ? <><ArrowUpRight className={`w-4 h-4 ${entryType===et?'text-rose-600':'text-slate-400'}`}/><span className={`text-sm font-semibold ${entryType===et?'text-rose-700':'text-slate-600'}`}>{t('Berish kerak')}</span></>
                : <><ArrowDownRight className={`w-4 h-4 ${entryType===et?'text-emerald-600':'text-slate-400'}`}/><span className={`text-sm font-semibold ${entryType===et?'text-emerald-700':'text-slate-600'}`}>{t('Berildi')}</span></>}
            </button>
          ))}
        </div>
        <div>
          <Lbl>{t('Summa')}</Lbl>
          <input value={entryForm.amount} onChange={e=>setEntryForm({...entryForm,amount:e.target.value})}
            type="number" min="0" placeholder="0.00" className={inp}/>
        </div>
        <div>
          <Lbl>{t('Valyuta')}</Lbl>
          <select value={entryForm.currency} onChange={e=>setEntryForm({...entryForm,currency:e.target.value})} className={inp}>
            <option value="UZS">UZS (so'm)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div>
          <Lbl>{t(entryType==='DEBIT' ? 'Tolov muddati' : 'Tolov sanasi')}</Lbl>
          <input type="date" value={entryForm.dueDate} onChange={e=>setEntryForm({...entryForm,dueDate:e.target.value})} className={inp}/>
        </div>
        <div>
          <Lbl>{t('Izoh')}</Lbl>
          <textarea value={entryForm.notes} onChange={e=>setEntryForm({...entryForm,notes:e.target.value})}
            placeholder={t('Masalan: 1-oylik ish haqi, tovar No.45, yoqilgi...')} rows={3}
            className={`${inp} resize-none`}/>
        </div>
        {selected && (
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
            <span className="font-semibold">{t('Hozirgi holat')}: </span>
            {t('Qolgan')} — <b className="text-rose-600">{selected.balance.toLocaleString()} {selected.currency}</b>
          </div>
        )}
      </CModal>

      {/* Confirm delete ledger */}
      <CModal open={!!showDelete} onClose={()=>setShowDelete(null)} title={t('Daftarni ochirish')}
        footer={<>
          <button onClick={()=>setShowDelete(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={()=>showDelete&&handleDeleteLedger(showDelete)} disabled={submitting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t("O'chirish")}
          </button>
        </>}>
        <p className="text-slate-700">{t("Bu daftarni va barcha yozuvlarni o'chirasizmi? Bu amalni qaytarib bolmaydi.")}</p>
      </CModal>

      {/* Confirm delete entry */}
      <CModal open={!!showDelEntry} onClose={()=>setShowDelEntry(null)} title={t('Yozuvni ochirish')}
        footer={<>
          <button onClick={()=>setShowDelEntry(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">{t('Bekor')}</button>
          <button onClick={()=>showDelEntry&&handleDeleteEntry(showDelEntry)} disabled={submitting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {submitting&&<Loader2 className="w-4 h-4 animate-spin"/>}{t("O'chirish")}
          </button>
        </>}>
        <p className="text-slate-700">{t("Bu yozuvni o'chirasizmi? Daftar balansi qayta hisoblanadi.")}</p>
      </CModal>

    </div>
  );
}
