import { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Download,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import api from '../../lib/professionalApi';
import { cn } from '../../lib/utils';

type Period = 'weekly' | 'monthly';

interface ReportItem {
  productName: string;
  addedBags: number;
  soldBags: number;
  netChange: number;
}

interface ReportData {
  period: Period;
  from: string;
  to: string;
  totalAdded: number;
  totalSold: number;
  items: ReportItem[];
}

export default function WarehouseReports() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async (p: Period) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/warehouse/reports?period=${p}`);
      if (data.success) setReport(data.data);
    } catch {
      setError('Hisobot yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(period); }, [period]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/warehouse/export?period=${period}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      const lbl = period === 'weekly' ? 'haftalik' : 'oylik';
      a.href = url;
      a.download = `ombor_hisobot_${lbl}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Fayl yuklab bo'lmadi");
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });

  const netTotal = (report?.totalAdded ?? 0) - (report?.totalSold ?? 0);
  const maxBags = Math.max(...(report?.items.map(i => Math.max(i.addedBags, i.soldBags)) ?? [1]), 1);

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ─── HERO ─── */}
      <div className="relative overflow-hidden px-5 pt-6 pb-6"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #1d4ed8 100%)' }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Analitika</p>
            <h1 className="text-white text-2xl font-black mt-1 leading-tight">Hisobotlar</h1>
            <p className="text-blue-300 text-xs mt-1">Ishlab chiqarish va sotuv tahlili</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchReport(period)}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {downloading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              Excel
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {report && (
          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Ishlab chiq'd", value: report.totalAdded, color: '#6ee7b7', icon: TrendingUp },
              { label: 'Sotildi', value: report.totalSold, color: '#93c5fd', icon: TrendingDown },
              {
                label: 'Balans',
                value: Math.abs(netTotal),
                color: netTotal >= 0 ? '#6ee7b7' : '#fca5a5',
                icon: netTotal > 0 ? ArrowUp : netTotal < 0 ? ArrowDown : Minus,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl px-3 py-3"
                  style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color: s.color }} />
                    <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: s.color }}>
                      {s.label}
                    </p>
                  </div>
                  <p className="text-2xl font-black text-white leading-tight">{s.value}</p>
                  <p className="text-[9px] text-white/40 mt-0.5">qop</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 space-y-4">

        {/* Period tabs */}
        <div className="flex gap-3 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
          {(['weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200',
                period === p
                  ? 'text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              )}
              style={period === p
                ? { background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', boxShadow: '0 4px 12px rgba(30,64,175,0.3)' }
                : {}}
            >
              <Calendar className="w-4 h-4" />
              {p === 'weekly' ? 'Haftalik' : 'Oylik'}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {loading && !report ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Yuklanmoqda...</p>
          </div>
        ) : report ? (
          <>
            {/* Sana */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-600">
                {formatDate(report.from)} — {formatDate(report.to)}
              </span>
            </div>

            {/* Mahsulotlar */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-50">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-none">Mahsulotlar bo'yicha</p>
                  <p className="text-xs text-slate-400 mt-0.5">{report.items.length} xil mahsulot</p>
                </div>
              </div>

              {!report.items.length ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">Bu davrda ma'lumot yo'q</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 px-1 pb-2">
                  {report.items.map((item, i) => {
                    const addPct = Math.round((item.addedBags / maxBags) * 100);
                    const soldPct = Math.round((item.soldBags / maxBags) * 100);
                    return (
                      <div key={i} className="px-4 py-4 hover:bg-slate-50 rounded-2xl transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-black text-blue-600">{i + 1}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 truncate">{item.productName}</p>
                          </div>
                          <span className={cn(
                            'text-xs font-black px-2 py-1 rounded-full flex-shrink-0 ml-2',
                            item.netChange > 0 ? 'bg-emerald-100 text-emerald-700' :
                            item.netChange < 0 ? 'bg-rose-100 text-rose-700' :
                            'bg-slate-100 text-slate-600'
                          )}>
                            {item.netChange > 0 ? '+' : ''}{item.netChange} balans
                          </span>
                        </div>

                        {/* Bar chart rows */}
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-emerald-600">Qo'shildi</span>
                              <span className="text-[10px] font-black text-emerald-700">{item.addedBags} qop</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${addPct}%`, background: 'linear-gradient(90deg,#059669,#0d9488)' }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-blue-600">Sotildi</span>
                              <span className="text-[10px] font-black text-blue-700">{item.soldBags} qop</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${soldPct}%`, background: 'linear-gradient(90deg,#3b82f6,#0ea5e9)' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Download CTA */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-3 py-4 text-white font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}
            >
              {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Excel formatida yuklab olish
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
