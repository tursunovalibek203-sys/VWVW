import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown,
  DollarSign, Users, Package,
  AlertTriangle, BarChart3, Activity,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import api from '../lib/professionalApi';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const t = latinToCyrillic;

type Zone = 'green' | 'yellow' | 'red' | 'neutral';

interface Metric {
  id: string;
  label: string;
  value: number | null;
  format: 'currency' | 'percent' | 'number' | 'days' | 'usd';
  trend?: number;
  zone?: Zone;
  formula?: string;
}

interface Section {
  title: string;
  icon: React.ElementType;
  color: string;
  metrics: Metric[];
}

const zoneClasses: Record<Zone, { bg: string; text: string; dot: string; badge: string }> = {
  green:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'Yaxshi' },
  yellow:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   badge: 'Diqqat' },
  red:     { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    badge: 'Xavfli' },
  neutral: { bg: 'bg-slate-50',   text: 'text-slate-600',   dot: 'bg-slate-400',   badge: '' },
};

function fmt(value: number | null, format: Metric['format']): string {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    case 'usd':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${Math.round(value)} kun`;
    case 'number':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    default:
      return String(value);
  }
}

function MetricCard({ metric }: { metric: Metric }) {
  const zone = metric.zone ?? 'neutral';
  const z = zoneClasses[zone];
  const hasTrend = metric.trend !== undefined && metric.trend !== null;
  const trendUp = (metric.trend ?? 0) >= 0;

  return (
    <div className={`rounded-2xl border p-4 transition-all hover:shadow-md ${
      zone === 'red' ? 'border-rose-200 bg-rose-50/40' :
      zone === 'yellow' ? 'border-amber-200 bg-amber-50/30' :
      zone === 'green' ? 'border-emerald-200 bg-emerald-50/20' :
      'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">
          {t(metric.label)}
        </p>
        {zone !== 'neutral' && (
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${z.bg} ${z.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${z.dot}`} />
            {t(z.badge)}
          </span>
        )}
      </div>

      <p className={`text-2xl font-bold tracking-tight tabular-nums ${
        zone === 'red' ? 'text-rose-700' :
        zone === 'green' ? 'text-emerald-700' :
        zone === 'yellow' ? 'text-amber-700' :
        'text-slate-900'
      }`}>
        {fmt(metric.value, metric.format)}
      </p>

      {hasTrend && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="tabular-nums">{trendUp ? '+' : ''}{metric.trend?.toFixed(1)}%</span>
          <span className="text-slate-400 font-normal">{t("o'tgan davr")}</span>
        </div>
      )}

      {metric.formula && (
        <p className="mt-1.5 text-[10px] text-slate-400 font-mono leading-tight truncate" title={metric.formula}>
          {metric.formula}
        </p>
      )}
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const Icon = section.icon;
  const redCount = section.metrics.filter(m => m.zone === 'red').length;
  const yellowCount = section.metrics.filter(m => m.zone === 'yellow').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${section.color}`}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
          <h3 className="font-bold text-slate-900 tracking-tight">{t(section.title)}</h3>
        </div>
        <div className="flex items-center gap-2">
          {redCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {redCount} {t('xavfli')}
            </span>
          )}
          {yellowCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {yellowCount} {t('diqqat')}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {section.metrics.map(m => <MetricCard key={m.id} metric={m} />)}
      </div>
    </div>
  );
}

export default function AnalyticsMetricsDashboard({ timeRange }: { timeRange: string }) {
  const [bm, setBm] = useState<any>(null);
  const [ai, setAi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/business-metrics?days=${timeRange}`).then(r => setBm(r.data.metrics)).catch(() => {}),
      api.get(`/analytics/ai-insights?days=${timeRange}`).then(r => setAi(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [timeRange]);

  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  const s = bm?.sales ?? {};
  const pr = bm?.profitability ?? {};
  const pd = bm?.product ?? {};
  const db = bm?.debt ?? {};
  const cf = bm?.cashFlow ?? {};
  const gr = bm?.growth ?? {};
  const m = ai?.metrics ?? {};
  const trends = ai?.trends?.daily ?? [];

  // ── Zone helpers ──────────────────────────────────────────────────────────
  const pctZone = (v: number | null, good: number, warn: number): Zone =>
    v === null ? 'neutral' : v >= good ? 'green' : v >= warn ? 'yellow' : 'red';
  const numZone = (v: number | null, good: number, warn: number): Zone =>
    v === null ? 'neutral' : v >= good ? 'green' : v >= warn ? 'yellow' : 'red';
  const lowZone = (v: number | null, good: number, warn: number): Zone =>
    v === null ? 'neutral' : v <= good ? 'green' : v <= warn ? 'yellow' : 'red';
  const posZone = (v: number | null): Zone =>
    v === null ? 'neutral' : v > 0 ? 'green' : v === 0 ? 'yellow' : 'red';

  // ── Sections ──────────────────────────────────────────────────────────────
  const sections: Section[] = [
    {
      title: 'Moliya', icon: DollarSign, color: 'bg-indigo-50 text-indigo-600',
      metrics: [
        { id: 'revenue',   label: 'Kirim',           value: s.revenue ?? m.totalRevenue,   format: 'usd',     trend: s.salesGrowthRate,       zone: numZone(s.revenue ?? 0, 5000000, 1000000), formula: 'Σ Sales.totalAmount' },
        { id: 'netprofit', label: 'Sof foyda',       value: pr.netProfit ?? m.netProfit,   format: 'usd',     trend: m.profitGrowth,           zone: posZone(pr.netProfit), formula: 'Kirim − COGS − Xarajat' },
        { id: 'gmargin',   label: 'Yalpi margin',    value: pd.grossMargin,                format: 'percent', zone: pctZone(pd.grossMargin, 30, 15),    formula: '(Kirim−COGS)/Kirim×100' },
        { id: 'nmargin',   label: 'Foyda marjasi',   value: pr.netProfitMargin,            format: 'percent', zone: pctZone(pr.netProfitMargin, 15, 5),  formula: 'Sof foyda/Kirim×100' },
        { id: 'opprofit',  label: 'Operatsion foyda',value: pr.operatingProfit,            format: 'usd',     zone: posZone(pr.operatingProfit), formula: 'Yalpi foyda − Xarajat' },
        { id: 'roi',       label: 'ROI',             value: pr.roi,                        format: 'percent', zone: pctZone(pr.roi, 20, 10),            formula: 'Foyda/Xarajat×100' },
        { id: 'breakeven', label: "Break-even",      value: pr.breakEvenPoint,             format: 'usd',     zone: 'neutral',                          formula: 'Doimiy xarajat / Margin' },
        { id: 'cashflow',  label: 'Pul oqimi',       value: cf.operatingCashFlow,          format: 'usd',     zone: posZone(cf.operatingCashFlow), formula: 'Kassa kirimi − chiqimi' },
      ],
    },
    {
      title: 'Qarz', icon: AlertTriangle, color: 'bg-rose-50 text-rose-600',
      metrics: [
        { id: 'totaldebt',  label: 'Umumiy qarz',     value: db.totalDebt,            format: 'usd',     zone: lowZone(db.totalDebt, 0, 50000), formula: 'Σ Customer.debt' },
        { id: 'debtratio',  label: 'Qarz nisbati',    value: db.debtRatio,            format: 'percent', zone: lowZone(db.debtRatio, 20, 40),   formula: 'Qarz/Kirim×100' },
        { id: 'dso',        label: 'DSO (kun)',        value: db.daysSalesOutstanding, format: 'days',    zone: lowZone(db.daysSalesOutstanding, 30, 60), formula: 'Debitor/Kunlik savdo' },
        { id: 'baddebt',    label: 'Muammo qarz %',   value: db.badDebtRatio,         format: 'percent', zone: lowZone(db.badDebtRatio, 5, 15), formula: 'Qarz>10K / Jami×100' },
      ],
    },
    {
      title: 'Mijoz', icon: Users, color: 'bg-sky-50 text-sky-600',
      metrics: [
        { id: 'customers',   label: 'Jami mijozlar',    value: m.totalCustomers,        format: 'number', zone: 'neutral' },
        { id: 'active',      label: 'Aktiv %',          value: s.conversionRate,        format: 'percent', zone: pctZone(s.conversionRate, 50, 30),     formula: 'Faol/Jami×100' },
        { id: 'newcust',     label: 'Yangi mijozlar',   value: m.newCustomers ?? gr.newVsReturningCustomers?.new, format: 'number', zone: numZone(m.newCustomers ?? 0, 5, 1) },
        { id: 'aov',         label: "O'rtacha xarid",   value: s.averageOrderValue,     format: 'usd',    zone: numZone(s.averageOrderValue ?? 0, 1000, 300), formula: 'Kirim/Savdo soni' },
        { id: 'repeat',      label: 'Qayta xarid %',    value: s.repeatPurchaseRate,    format: 'percent', zone: pctZone(s.repeatPurchaseRate, 40, 20),  formula: 'Qayta xaridchilar/Faol' },
        { id: 'salespercust',label: 'Mijoz daromadi',   value: s.salesPerCustomer,      format: 'usd',    zone: numZone(s.salesPerCustomer ?? 0, 2000, 500) },
      ],
    },
    {
      title: 'Operatsion', icon: Package, color: 'bg-amber-50 text-amber-600',
      metrics: [
        { id: 'invturn',   label: 'Ombor aylanmasi',  value: pd.inventoryTurnover,  format: 'number', zone: numZone(pd.inventoryTurnover ?? 0, 6, 3), formula: 'COGS / Avg ombor' },
        { id: 'stockdays', label: 'Ombor kunlari',    value: pd.stockDays,          format: 'days',   zone: lowZone(pd.stockDays ?? 999, 60, 90),    formula: 'Avg ombor / Kunlik sotiw' },
        { id: 'salesperday',label: 'Kunlik savdo',    value: s.salesPerDay,         format: 'usd',    zone: numZone(s.salesPerDay ?? 0, 100000, 30000) },
        { id: 'freecash',  label: 'Erkin pul oqimi', value: cf.freeCashFlow,       format: 'usd',    zone: posZone(cf.freeCashFlow), formula: 'Operatsion CF − Xarajat' },
      ],
    },
  ];

  // ── CEO Health Scores ─────────────────────────────────────────────────────
  const scores: { label: string; score: number; max: number; zone: Zone; desc: string }[] = [
    {
      label: 'Biznes sog\'ligi',
      score: Math.min(100, Math.max(0,
        (pctZone(pr.netProfitMargin, 15, 5) === 'green' ? 30 : pctZone(pr.netProfitMargin, 15, 5) === 'yellow' ? 15 : 0) +
        (posZone(cf.operatingCashFlow) === 'green' ? 25 : 0) +
        (pctZone(s.repeatPurchaseRate, 40, 20) === 'green' ? 25 : pctZone(s.repeatPurchaseRate, 40, 20) === 'yellow' ? 12 : 0) +
        (pctZone(pd.grossMargin, 30, 15) === 'green' ? 20 : pctZone(pd.grossMargin, 30, 15) === 'yellow' ? 10 : 0)
      )),
      max: 100, zone: 'green', desc: 'Margin, pul oqimi, qayta xarid',
    },
    {
      label: 'Kassa xavfsizligi',
      score: Math.min(100, Math.max(0,
        (posZone(cf.operatingCashFlow) === 'green' ? 50 : 0) +
        (lowZone(db.debtRatio, 20, 40) === 'green' ? 30 : lowZone(db.debtRatio, 20, 40) === 'yellow' ? 15 : 0) +
        (posZone(cf.freeCashFlow) === 'green' ? 20 : 0)
      )),
      max: 100, zone: 'neutral', desc: 'Pul oqimi, qarz nisbati',
    },
    {
      label: 'Qarz xavfi',
      score: Math.min(100, Math.max(0,
        (lowZone(db.totalDebt, 0, 50000) === 'green' ? 40 : lowZone(db.totalDebt, 0, 50000) === 'yellow' ? 20 : 0) +
        (lowZone(db.dso, 30, 60) === 'green' ? 30 : lowZone(db.dso, 30, 60) === 'yellow' ? 15 : 0) +
        (lowZone(db.badDebtRatio, 5, 15) === 'green' ? 30 : lowZone(db.badDebtRatio, 5, 15) === 'yellow' ? 15 : 0)
      )),
      max: 100, zone: 'neutral', desc: 'Umumiy qarz, DSO, muammo %',
    },
    {
      label: 'Mijoz salomatligi',
      score: Math.min(100, Math.max(0,
        (pctZone(s.conversionRate, 50, 30) === 'green' ? 35 : pctZone(s.conversionRate, 50, 30) === 'yellow' ? 17 : 0) +
        (pctZone(s.repeatPurchaseRate, 40, 20) === 'green' ? 35 : pctZone(s.repeatPurchaseRate, 40, 20) === 'yellow' ? 17 : 0) +
        (numZone(m.newCustomers ?? 0, 5, 1) === 'green' ? 30 : numZone(m.newCustomers ?? 0, 5, 1) === 'yellow' ? 15 : 0)
      )),
      max: 100, zone: 'neutral', desc: 'Aktiv %, qayta xarid, yangi',
    },
    {
      label: "O'sish sur'ati",
      score: Math.min(100, Math.max(0, 50 + Math.min(50, Math.max(-50, (s.salesGrowthRate ?? 0))))),
      max: 100, zone: 'neutral', desc: "Savdo o'sishi, yangi mijozlar",
    },
  ].map(sc => ({
    ...sc,
    zone: sc.score >= 70 ? 'green' as Zone : sc.score >= 40 ? 'yellow' as Zone : 'red' as Zone,
  }));

  return (
    <div className="space-y-6">
      {/* CEO Scores strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {scores.map((sc) => {
          const z = zoneClasses[sc.zone];
          return (
            <div key={sc.label} className={`rounded-2xl border p-4 ${z.bg} ${
              sc.zone === 'red' ? 'border-rose-200' : sc.zone === 'yellow' ? 'border-amber-200' : 'border-emerald-200'
            }`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t(sc.label)}</p>
              <div className="mt-2 flex items-end gap-2">
                <span className={`text-3xl font-black tabular-nums ${z.text}`}>{sc.score}</span>
                <span className="text-sm text-slate-400 mb-0.5">/ 100</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sc.zone === 'green' ? 'bg-emerald-500' : sc.zone === 'yellow' ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${sc.score}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">{t(sc.desc)}</p>
            </div>
          );
        })}
      </div>

      {/* Metric sections */}
      {sections.map(section => <SectionBlock key={section.title} section={section} />)}

      {/* Trend chart */}
      {trends.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{t('Moliyaviy trend')}</h3>
              <p className="text-xs text-slate-400">{t('Kunlik kirim, foyda va xarajat')}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue"  stroke="#6366f1" strokeWidth={2.5} dot={false} name={t('Kirim')} />
              <Line type="monotone" dataKey="profit"   stroke="#10b981" strokeWidth={2.5} dot={false} name={t('Foyda')} />
              <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2}   dot={false} name={t('Xarajat')} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bar chart: daily sales vol */}
      {trends.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <BarChart3 className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{t('Kirim va xarajat')}</h3>
              <p className="text-xs text-slate-400">{t('Kunlik taqqoslama')}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trends.slice(-14)} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']}
              />
              <Legend />
              <Bar dataKey="revenue"  fill="#6366f1" radius={[4, 4, 0, 0]} name={t('Kirim')} maxBarSize={32} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name={t('Xarajat')} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
