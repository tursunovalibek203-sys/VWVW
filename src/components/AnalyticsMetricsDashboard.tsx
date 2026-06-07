import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, AlertTriangle, Activity, BarChart3, Target, Zap } from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import api from '../lib/professionalApi';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from 'recharts';

const t = latinToCyrillic;

const COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#8b5cf6','#0ea5e9','#14b8a6','#fb923c'];

const fmt = (v: number, type: 'usd'|'pct'|'num'|'day') => {
  if (!v && v !== 0) return '—';
  if (type === 'usd') return v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v.toFixed(0)}`;
  if (type === 'pct') return `${v.toFixed(1)}%`;
  if (type === 'day') return `${Math.round(v)} kun`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const zone = (v: number|null, g: number, y: number, invert = false): 'green'|'yellow'|'red' => {
  if (v === null || v === undefined) return 'yellow';
  if (!invert) return v >= g ? 'green' : v >= y ? 'yellow' : 'red';
  return v <= g ? 'green' : v <= y ? 'yellow' : 'red';
};

const zClr: Record<string,{bg:string;text:string;border:string;bar:string}> = {
  green:  { bg:'bg-emerald-50', text:'text-emerald-700', border:'border-emerald-200', bar:'#10b981' },
  yellow: { bg:'bg-amber-50',   text:'text-amber-700',   border:'border-amber-200',   bar:'#f59e0b' },
  red:    { bg:'bg-rose-50',    text:'text-rose-700',    border:'border-rose-200',    bar:'#f43f5e' },
};

/* ── Gauge card ── */
function Gauge({ label, value, max = 100, unit = '%', z = 'green', formula }: {
  label: string; value: number; max?: number; unit?: string; z?: string; formula?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const c = zClr[z] ?? zClr.green;
  return (
    <div className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t(label)}</p>
      <div className="flex items-end gap-2 mt-2">
        <span className={`text-2xl font-black tabular-nums ${c.text}`}>{value.toFixed(1)}{unit}</span>
      </div>
      <div className="mt-2 h-2 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.bar }} />
      </div>
      {formula && <p className="mt-1.5 text-[10px] text-slate-400 font-mono">{formula}</p>}
    </div>
  );
}

/* ── KPI card with trend ── */
function Kpi({ label, value, trend, z = 'green', sub }: {
  label: string; value: string; trend?: number; z?: string; sub?: string;
}) {
  const c = zClr[z] ?? zClr.green;
  const up = (trend ?? 0) >= 0;
  return (
    <div className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t(label)}</p>
      <p className={`mt-2 text-2xl font-black tabular-nums ${c.text}`}>{value}</p>
      {trend !== undefined && (
        <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}{trend?.toFixed(1)}% {t("o'tgan davr")}
        </p>
      )}
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <h3 className="font-bold text-slate-900">{t(title)}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const ChartTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

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

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {Array.from({length:8}).map((_,i) => (
        <div key={i} className="rounded-2xl bg-white border border-slate-200/70 h-64 animate-pulse" />
      ))}
    </div>
  );

  /* ── Data ── */
  const s  = bm?.sales          ?? {};
  const pr = bm?.profitability   ?? {};
  const pd = bm?.product         ?? {};
  const db = bm?.debt            ?? {};
  const cf = bm?.cashFlow        ?? {};
  const gr = bm?.growth          ?? {};
  const m  = ai?.metrics         ?? {};
  const daily: any[]   = ai?.trends?.daily       ?? [];
  const topProd: any[] = ai?.topProducts          ?? ai?.productAnalysis ?? [];
  const topCust: any[] = ai?.topCustomers         ?? [];
  const segs: any[]    = ai?.customerSegments     ?? [];
  const forecast: any[]= ai?.forecast             ?? [];

  const burnRate = m.totalRevenue > 0 ? (m.totalRevenue - (pr.netProfit ?? 0)) / Math.max(1, parseInt(timeRange)) : 0;
  const runwayDays = burnRate > 0 && (cf.operatingCashFlow ?? 0) > 0 ? Math.round((cf.operatingCashFlow ?? 0) / burnRate) : null;

  /* ── CEO Scores ── */
  const ceoScores = [
    { name: t("Biznes sog'ligi"), score: Math.min(100, Math.max(0,
      (pr.netProfitMargin >= 15 ? 30 : pr.netProfitMargin >= 5 ? 15 : 0) +
      ((cf.operatingCashFlow ?? 0) > 0 ? 25 : 0) +
      (s.repeatPurchaseRate >= 40 ? 25 : s.repeatPurchaseRate >= 20 ? 12 : 0) +
      (pd.grossMargin >= 30 ? 20 : pd.grossMargin >= 15 ? 10 : 0)
    )), fill: '#6366f1' },
    { name: t('Kassa xavfsizligi'), score: Math.min(100, Math.max(0,
      ((cf.operatingCashFlow ?? 0) > 0 ? 40 : 0) +
      (db.debtRatio <= 20 ? 35 : db.debtRatio <= 40 ? 17 : 0) +
      ((cf.freeCashFlow ?? 0) > 0 ? 25 : 0)
    )), fill: '#10b981' },
    { name: t('Qarz xavfi'), score: Math.min(100, Math.max(0,
      ((db.totalDebt ?? 0) === 0 ? 40 : (db.totalDebt ?? 0) < 50000 ? 20 : 0) +
      ((db.daysSalesOutstanding ?? 999) <= 30 ? 35 : (db.daysSalesOutstanding ?? 999) <= 60 ? 17 : 0) +
      ((db.badDebtRatio ?? 100) <= 5 ? 25 : (db.badDebtRatio ?? 100) <= 15 ? 12 : 0)
    )), fill: '#f59e0b' },
    { name: t("Mijoz salomatligi"), score: Math.min(100, Math.max(0,
      (s.conversionRate >= 50 ? 35 : s.conversionRate >= 30 ? 17 : 0) +
      (s.repeatPurchaseRate >= 40 ? 35 : s.repeatPurchaseRate >= 20 ? 17 : 0) +
      ((m.newCustomers ?? 0) >= 5 ? 30 : (m.newCustomers ?? 0) >= 1 ? 15 : 0)
    )), fill: '#0ea5e9' },
    { name: t("O'sish sur'ati"), score: Math.min(100, Math.max(0, 50 + Math.min(50, Math.max(-50, s.salesGrowthRate ?? 0)))), fill: '#8b5cf6' },
  ];

  /* ── Margin comparison ── */
  const marginData = [
    { name: t('Yalpi margin'), value: pd.grossMargin ?? 0 },
    { name: t('Sof margin'),   value: pr.netProfitMargin ?? 0 },
    { name: t('Operatsion'),   value: pr.operatingMargin ?? 0 },
  ];

  /* ── Active vs Passive ── */
  const activePie = m.totalCustomers > 0 ? [
    { name: t('Aktiv'), value: m.activeCustomers ?? 0 },
    { name: t('Passiv'), value: Math.max(0, (m.totalCustomers ?? 0) - (m.activeCustomers ?? 0)) },
  ] : [];

  /* ── Yangi vs Qaytgan ── */
  const newReturnData = gr.newVsReturningCustomers ? [
    { name: t('Yangi'), value: gr.newVsReturningCustomers.new ?? 0 },
    { name: t('Qaytgan'), value: gr.newVsReturningCustomers.returning ?? 0 },
  ] : [];

  /* ── Debt zones ── */
  const debtZonePie = m.totalCustomers > 0 ? [
    { name: t('Qarzsi'), value: Math.max(0, m.totalCustomers - Math.round((db.badDebtRatio ?? 0) / 100 * m.totalCustomers)) },
    { name: t('Xavfli qarz'), value: Math.round((db.badDebtRatio ?? 0) / 100 * m.totalCustomers) },
  ] : [];

  return (
    <div className="space-y-6">

      {/* ── 1. CEO SCORES ─────────────────────────────────────────────── */}
      <Section title="CEO Ko'rsatkichlari (0–100 ball)" icon={Target} color="bg-indigo-50 text-indigo-600">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {ceoScores.map(sc => {
            const z2 = sc.score >= 70 ? 'green' : sc.score >= 40 ? 'yellow' : 'red';
            const c2 = zClr[z2];
            return (
              <div key={sc.name} className={`rounded-xl border p-3 ${c2.bg} ${c2.border}`}>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{sc.name}</p>
                <p className={`mt-1 text-3xl font-black tabular-nums ${c2.text}`}>{sc.score}</p>
                <div className="mt-1.5 h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${sc.score}%`, backgroundColor: sc.fill }} />
                </div>
              </div>
            );
          })}
        </div>
        {/* CEO scores bar chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ceoScores} layout="vertical" margin={{ left: 8, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} width={110} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={70} stroke="#10b981" strokeDasharray="4 2" label={{ value: t('Yaxshi'), position: 'top', fontSize: 10, fill: '#10b981' }} />
            <ReferenceLine x={40} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: t('Diqqat'), position: 'top', fontSize: 10, fill: '#f59e0b' }} />
            <Bar dataKey="score" radius={[0,6,6,0]} maxBarSize={22}>
              {ceoScores.map((sc) => <Cell key={sc.name} fill={sc.score >= 70 ? '#10b981' : sc.score >= 40 ? '#f59e0b' : '#f43f5e'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* ── 2. MOLIYA — KPI cards row ───────────────────────────────── */}
      <Section title="Moliya Ko'rsatkichlari" icon={DollarSign} color="bg-violet-50 text-violet-600">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          <Kpi label="Kirim"         value={fmt(m.totalRevenue ?? 0, 'usd')} trend={s.salesGrowthRate} z={zone(s.salesGrowthRate, 10, 0)} />
          <Kpi label="Sof foyda"     value={fmt(pr.netProfit ?? 0, 'usd')}    z={(pr.netProfit ?? 0) > 0 ? 'green' : 'red'} />
          <Kpi label="Xarajat"       value={fmt(((m.totalRevenue ?? 0) - (pr.netProfit ?? 0)), 'usd')} z="yellow" />
          <Kpi label="Yalpi foyda"   value={fmt(pd.grossProfit ?? 0, 'usd')}  z={(pd.grossProfit ?? 0) > 0 ? 'green' : 'red'} />
          <Kpi label="Operatsion foyda" value={fmt(pr.operatingProfit ?? 0, 'usd')} z={(pr.operatingProfit ?? 0) > 0 ? 'green' : 'red'} sub="Yalpi − Xarajat" />
          <Kpi label="Kunlik kirim"  value={fmt(m.avgDailyRevenue ?? 0, 'usd')} z="green" sub={`${t("Har")} ${timeRange} ${t("kun")}`} />
          <Kpi label="Burn rate"     value={fmt(burnRate, 'usd')} z={zone(burnRate, 0, 50000, true)} sub={t("Kunlik xarajat")} />
          {runwayDays !== null && <Kpi label="Runway" value={`${runwayDays} ${t('kun')}`} z={zone(runwayDays, 180, 60)} sub={t("Pul tugamasdan davr")} />}
        </div>

        {/* Chart 1: Kirim va Chiqim trend */}
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Kirim / Chiqim / Foyda trendi')}</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="revenue"  stroke="#6366f1" strokeWidth={2.5} dot={false} name={t('Kirim')} />
            <Line type="monotone" dataKey="profit"   stroke="#10b981" strokeWidth={2.5} dot={false} name={t('Sof foyda')} />
            <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2}   dot={false} name={t('Xarajat')} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* ── 3. MARGIN TAHLILI ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 2: Margin gauges */}
        <Section title="Margin Tahlili" icon={Activity} color="bg-emerald-50 text-emerald-600">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Gauge label="Yalpi margin"   value={pd.grossMargin ?? 0}        z={zone(pd.grossMargin, 30, 15)}       formula="(Kirim−COGS)/Kirim×100" />
            <Gauge label="Sof margin"     value={pr.netProfitMargin ?? 0}    z={zone(pr.netProfitMargin, 15, 5)}    formula="Sof foyda/Kirim×100" />
            <Gauge label="ROI"            value={pr.roi ?? 0}                z={zone(pr.roi, 20, 10)}               formula="Foyda/Xarajat×100" />
          </div>
          {/* Chart 3: margin comparison bar */}
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={marginData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={15} stroke="#10b981" strokeDasharray="4 2" />
              <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={40}>
                {marginData.map((d) => <Cell key={d.name} fill={d.value >= 15 ? '#10b981' : d.value >= 5 ? '#f59e0b' : '#f43f5e'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Chart 4: Pul oqimi area */}
        <Section title="Pul Oqimi" icon={Activity} color="bg-sky-50 text-sky-600">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Kpi label="Operatsion CF" value={fmt(cf.operatingCashFlow ?? 0, 'usd')} z={(cf.operatingCashFlow ?? 0) > 0 ? 'green' : 'red'} sub="Kassa kirimi − chiqimi" />
            <Kpi label="Erkin CF"      value={fmt(cf.freeCashFlow ?? 0, 'usd')}      z={(cf.freeCashFlow ?? 0) > 0 ? 'green' : 'red'}      sub="CF − Xarajat" />
          </div>
          <ResponsiveContainer width="100%" height={185}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="cgProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cgExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="profit"   stroke="#10b981" fill="url(#cgProfit)" strokeWidth={2} name={t('Foyda')} />
              <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="url(#cgExp)"    strokeWidth={2} name={t('Xarajat')} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ── 4. SAVDO TAHLILI ────────────────────────────────────────── */}
      <Section title="Savdo Tahlili" icon={BarChart3} color="bg-indigo-50 text-indigo-600">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Kpi label="O'rtacha xarid (AOV)" value={fmt(s.averageOrderValue ?? 0, 'usd')} z={zone(s.averageOrderValue, 1000, 300)} sub="Kirim / Savdo soni" />
          <Kpi label="Kunlik savdo"          value={fmt(s.salesPerDay ?? 0, 'usd')}       z={zone(s.salesPerDay, 100000, 30000)} />
          <Kpi label="Savdo o'sishi"         value={fmt(s.salesGrowthRate ?? 0, 'pct')}   z={zone(s.salesGrowthRate, 10, 0)}     sub={t("Oldingi davr")} />
          <Kpi label="Break-even"            value={fmt(pr.breakEvenPoint ?? 0, 'usd')}   z="yellow" sub="Doimiy xarajat / Margin" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 5: Kunlik savdo bar */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Oxirgi 14 kunlik savdo')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={daily.slice(-14)} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4,4,0,0]} name={t('Kirim')} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 6: Top mahsulotlar horizontal bar */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Top mahsulotlar (daromad)')}</p>
            {topProd.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProd.slice(0,5)} layout="vertical" margin={{ left: 8, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" radius={[0,6,6,0]} maxBarSize={20}>
                    {topProd.slice(0,5).map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-8">{t("Ma'lumot yo'q")}</p>}
          </div>
        </div>
      </Section>

      {/* ── 5. MIJOZ TAHLILI ─────────────────────────────────────────── */}
      <Section title="Mijoz Tahlili" icon={Users} color="bg-sky-50 text-sky-600">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Kpi label="Jami mijozlar"  value={fmt(m.totalCustomers ?? 0, 'num')} z="green" />
          <Kpi label="Aktiv %"        value={fmt(s.conversionRate ?? 0, 'pct')} z={zone(s.conversionRate, 50, 30)} sub="Faol/Jami×100" />
          <Kpi label="Qayta xarid %"  value={fmt(s.repeatPurchaseRate ?? 0, 'pct')} z={zone(s.repeatPurchaseRate, 40, 20)} sub="Retention" />
          <Kpi label="Mijoz daromadi" value={fmt(s.salesPerCustomer ?? 0, 'usd')} z={zone(s.salesPerCustomer, 2000, 500)} sub="LTV proxy" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart 7: Aktiv vs Passiv donut */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Aktiv vs Passiv')}</p>
            {activePie.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={activePie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {activePie.map((_:any, i:number) => <Cell key={i} fill={i === 0 ? '#10b981' : '#e2e8f0'} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-8">{t("Ma'lumot yo'q")}</p>}
          </div>

          {/* Chart 8: Yangi vs Qaytgan */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Yangi vs Qaytgan')}</p>
            {newReturnData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={newReturnData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={50}>
                    <Cell fill="#6366f1" />
                    <Cell fill="#10b981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-8">{t("Ma'lumot yo'q")}</p>}
          </div>

          {/* Chart 9: Mijoz segmentlari */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Segmentlar')}</p>
            {segs.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={segs} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="segment" paddingAngle={2}>
                    {segs.map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-8">{t("Ma'lumot yo'q")}</p>}
          </div>
        </div>

        {/* Chart 10: Top 5 mijoz */}
        {topCust.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Top 5 mijoz (xarid summasi)')}</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topCust.slice(0,5)} layout="vertical" margin={{ left: 8, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="totalSpent" radius={[0,6,6,0]} maxBarSize={20}>
                  {topCust.slice(0,5).map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* ── 6. QARZ TAHLILI ──────────────────────────────────────────── */}
      <Section title="Qarz Tahlili" icon={AlertTriangle} color="bg-rose-50 text-rose-600">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Kpi label="Umumiy qarz"  value={fmt(db.totalDebt ?? 0, 'usd')}             z={(db.totalDebt ?? 0) < 10000 ? 'green' : (db.totalDebt ?? 0) < 50000 ? 'yellow' : 'red'} sub="Σ Customer.debt" />
          <Kpi label="Qarz nisbati" value={fmt(db.debtRatio ?? 0, 'pct')}              z={zone(db.debtRatio, 0, 20, true)} sub="Qarz/Kirim×100" />
          <Kpi label="DSO (kun)"    value={fmt(db.daysSalesOutstanding ?? 0, 'day')}   z={zone(db.daysSalesOutstanding, 0, 30, true)} sub="Debitor/Kunlik savdo" />
          <Kpi label="Muammo qarz %" value={fmt(db.badDebtRatio ?? 0, 'pct')}         z={zone(db.badDebtRatio, 0, 5, true)} sub="Qarz>10K / Jami" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 11: Qarz tarkibi donut */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Qarz tarkibi')}</p>
            {debtZonePie.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={debtZonePie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-8">{t("Ma'lumot yo'q")}</p>}
          </div>

          {/* Chart 12: Qarz metrikalar radial */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Qarz xavfi indikatorlari')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={90}
                data={[
                  { name: t('DSO xavfi'),      value: Math.min(100, ((db.daysSalesOutstanding ?? 0) / 90) * 100), fill: '#f43f5e' },
                  { name: t('Qarz nisbati'),    value: Math.min(100, ((db.debtRatio ?? 0) / 50) * 100),           fill: '#f59e0b' },
                  { name: t('Muammo qarz'),     value: Math.min(100, ((db.badDebtRatio ?? 0) / 20) * 100),        fill: '#6366f1' },
                ]}
                startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={4} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* ── 7. OPERATSION ───────────────────────────────────────────── */}
      <Section title="Operatsion Samaradorlik" icon={Package} color="bg-amber-50 text-amber-600">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Gauge label="Ombor aylanmasi" value={pd.inventoryTurnover ?? 0} max={12} unit="x" z={zone(pd.inventoryTurnover, 6, 3)} formula="COGS / Avg ombor" />
          <Gauge label="Ombor kunlari"   value={pd.stockDays ?? 0}          max={120} unit=" kun" z={zone(pd.stockDays, 0, 60, true)} formula="Avg ombor / Kunlik" />
          <Gauge label="Qayta xarid %"   value={s.repeatPurchaseRate ?? 0}  max={100} unit="%" z={zone(s.repeatPurchaseRate, 40, 20)} formula="Qaytgan/Faol×100" />
          <Gauge label="Aktiv nisbat"    value={s.conversionRate ?? 0}      max={100} unit="%" z={zone(s.conversionRate, 50, 30)} formula="Faol/Jami×100" />
        </div>

        {/* Chart 13: Forecast trend */}
        {forecast.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('Forecast (keyingi 30 kun)')}</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={[...daily.slice(-14), ...forecast.slice(0,16)]} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue"          stroke="#6366f1" fill="url(#gForecast)" strokeWidth={2.5} name={t('Haqiqiy')} />
                <Area type="monotone" dataKey="forecastRevenue"  stroke="#8b5cf6" fill="none"             strokeWidth={2}   name={t('Forecast')} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </Section>

      {/* ── 8. EBITDA / Break-even ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 14: EBITDA proxy */}
        <Section title="EBITDA va Break-even" icon={Zap} color="bg-purple-50 text-purple-600">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Kpi label="EBITDA (taxm.)"  value={fmt((pr.operatingProfit ?? 0) * 1.15, 'usd')} z={(pr.operatingProfit ?? 0) > 0 ? 'green' : 'red'} sub="Operatsion foyda + amortizatsiya" />
            <Kpi label="Break-even"      value={fmt(pr.breakEvenPoint ?? 0, 'usd')}            z="yellow" sub="Doimiy xarajat / Gross margin %" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { name: t('Kirim'),    value: m.totalRevenue ?? 0 },
              { name: 'COGS',        value: pd.costOfGoodsSold ?? 0 },
              { name: t('Xarajat'), value: (m.totalRevenue ?? 0) - (pr.netProfit ?? 0) - (pd.costOfGoodsSold ?? 0) },
              { name: t('Foyda'),   value: Math.max(0, pr.netProfit ?? 0) },
            ]} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={50}>
                {['#6366f1','#f59e0b','#f43f5e','#10b981'].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Chart 15: O'sish taqqoslama */}
        <Section title="O'sish Taqqoslamasi" icon={TrendingUp} color="bg-emerald-50 text-emerald-600">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Kpi label="Savdo o'sishi"  value={fmt(s.salesGrowthRate ?? 0, 'pct')} trend={s.salesGrowthRate} z={zone(s.salesGrowthRate, 10, 0)} />
            <Kpi label="Yangi mijozlar" value={fmt(m.newCustomers ?? 0, 'num')}     z={zone(m.newCustomers, 5, 1)} />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { period: t("Oldingi"), revenue: (m.totalRevenue ?? 0) / (1 + (s.salesGrowthRate ?? 0) / 100) },
              { period: t("Joriy"),   revenue: m.totalRevenue ?? 0 },
            ]} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" stroke="#94a3b8" fontSize={13} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={60}>
                <Cell fill="#94a3b8" />
                <Cell fill="#6366f1" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

    </div>
  );
}
