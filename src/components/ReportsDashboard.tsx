import { useState, useEffect, useCallback } from 'react';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import {
  TrendingUp, TrendingDown, RefreshCw, Info,
  ShoppingCart, Package, Users,
  XCircle, BarChart3,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals });

const pct = (n: number | null | undefined) =>
  n == null ? null : `${n >= 0 ? '+' : ''}${fmt(n)}%`;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ─── sub-components ──────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="text-slate-400 hover:text-slate-600 ml-1"
        aria-label="Ma'lumot"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 rounded-lg bg-slate-900 text-white text-xs p-2 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

function MetricCard({
  title, value, sub, delta, tip, unavailable, anomaly, currency,
}: {
  title: string; value?: string | number | null; sub?: string; delta?: number | null;
  tip?: string; unavailable?: string; anomaly?: boolean; currency?: string;
}) {
  const isUp = (delta ?? 0) >= 0;
  const base = anomaly
    ? 'bg-rose-50 border-rose-300'
    : 'bg-white border-slate-200/70';

  if (unavailable) {
    return (
      <div className={`rounded-2xl border p-4 ${base} flex flex-col gap-1`}>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}{tip && <Tip text={tip} />}</p>
        <p className="text-sm text-slate-400 italic mt-1">{unavailable}</p>
      </div>
    );
  }

  const displayValue = value == null ? '–'
    : currency ? formatCurrency(Number(value), currency)
    : String(value);

  return (
    <div className={`rounded-2xl border p-4 hover:shadow-md transition-all ${base}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}{tip && <Tip text={tip} />}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{displayValue}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      {delta != null && (
        <p className={`flex items-center gap-1 text-xs font-semibold mt-1 ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {pct(delta)}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

function NoData({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
      <XCircle className="w-8 h-8" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

// ─── Period filter ────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'custom';

function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period, s?: string, e?: string) => void }) {
  const [custom, setCustom] = useState({ start: '', end: '' });
  const opts: { id: Period; label: string }[] = [
    { id: 'today', label: 'Bugun' },
    { id: 'week',  label: '7 kun' },
    { id: 'month', label: 'Oy' },
    { id: 'custom', label: 'Davr' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {opts.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${value === o.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
        >
          {o.label}
        </button>
      ))}
      {value === 'custom' && (
        <>
          <input type="date" value={custom.start} onChange={e => setCustom(p => ({ ...p, start: e.target.value }))}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700" />
          <span className="text-slate-400 text-sm">–</span>
          <input type="date" value={custom.end} onChange={e => setCustom(p => ({ ...p, end: e.target.value }))}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700" />
          <button
            onClick={() => onChange('custom', custom.start, custom.end)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
          >Qo'llash</button>
        </>
      )}
    </div>
  );
}

// ─── Tab: Umumiy ──────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: any }) {
  if (!data) return <NoData msg="Ma'lumot yuklanmadi" />;
  const d = data;
  return (
    <div className="space-y-6">
      <SectionTitle>Asosiy Ko'rsatkichlar</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Jami Daromad" value={d.revenue} currency="USD"
          delta={d.growthRate} tip="Tanlangan davrda jami sotuvlar summasi. Jadval: Sale.totalAmount"
        />
        <MetricCard
          title="Sof Foyda" value={d.netProfit} currency="USD"
          tip="Daromad – Xarajatlar. Sale.totalAmount – Expense.amount"
        />
        <MetricCard
          title="Xarajatlar" value={d.totalExpenses} currency="USD"
          tip="Expense jadvalidagi jami xarajatlar summasi"
        />
        <MetricCard
          title="Run Rate (oylik)" value={d.runRate} currency="USD"
          tip="Joriy oy tushumi × 12 (yillik prognoz). Hisoblash: (daromad/kun) × 30"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Sotuvlar soni" value={d.saleCount} sub="ta chek" tip="Sale jadvali yozuvlari soni" />
        <MetricCard title="Sotilgan miqdor" value={fmt(d.totalQty, 0)} sub="qop" tip="Sale.quantity yig'indisi" />
        <MetricCard title="Jami Mijozlar" value={d.totalCustomers} tip="Customer jadvali" />
        <MetricCard title="Jami Qarz (UZS)" value={d.totalDebtUZS} currency="UZS"
          tip="Customer.debtUZS jami" anomaly={(d.totalDebtUZS || 0) > (d.revenue || 1) * 0.3}
        />
      </div>

      {d.dailyTrend && d.dailyTrend.length > 0 && (
        <>
          <SectionTitle>Kunlik Daromad Trendi</SectionTitle>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={d.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip formatter={(v: any) => ['$' + Number(v).toLocaleString(), 'Daromad']} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Daromad" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Sotuv ───────────────────────────────────────────────────────────────

function SalesTab({ data }: { data: any }) {
  if (!data) return <NoData msg="Ma'lumot yuklanmadi" />;
  const d = data;

  return (
    <div className="space-y-6">
      {/* Core revenue metrics */}
      <SectionTitle>Daromad Ko'rsatkichlari</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard title="Daromad" value={d.revenue} currency="USD"
          tip="Jami sotuv summasi. Jadval: Sale.totalAmount" />
        <MetricCard title="O'sish Rate" value={d.growthRate != null ? `${pct(d.growthRate)}` : null}
          delta={d.growthRate}
          tip="(Joriy – Oldingi) / Oldingi × 100%. Sale.totalAmount ikki davrda taqqoslash"
          unavailable={d.growthRate == null ? 'Avvalgi davr ma\'lumoti yo\'q' : undefined}
        />
        <MetricCard title="YoY O'sish" value={d.yoyGrowth != null ? pct(d.yoyGrowth) : null}
          delta={d.yoyGrowth}
          tip="Joriy yil vs o'tgan yilning xuddi shu davri"
          unavailable={d.yoyGrowth == null ? 'O\'tgan yil ma\'lumoti yo\'q' : undefined}
        />
        <MetricCard title="Run Rate" value={d.runRate} currency="USD"
          tip="(Daromad / kunlar) × 30 — oylik prognoz" />
      </div>

      {/* Transaction metrics */}
      <SectionTitle>Tranzaksiya Ko'rsatkichlari</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard title="AOV (o'rtacha chek)" value={d.aov} currency="USD"
          tip="Jami tushum / cheklar soni. Sale.totalAmount / Sale COUNT" />
        <MetricCard title="Savat Trendi"
          value={d.basketTrend != null ? pct(d.basketTrend) : null}
          delta={d.basketTrend}
          tip="Joriy AOV / Oldingi davr AOV. AOV o'zgarishi trendi" />
        <MetricCard title="Units/Tranzaksiya" value={fmt(d.unitsPerTx)}
          sub="qop/chek" tip="Sotilgan qop / cheklar soni" />
        <MetricCard title="O'rtacha Narx/Birlik" value={d.pricePerUnit} currency="USD"
          sub="qopga" tip="Jami tushum / sotilgan qop soni" />
      </div>

      {/* Margin metrics */}
      <SectionTitle>Marja Ko'rsatkichlari</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard title="Yalpi Marja %" value={d.grossMargin != null ? `${fmt(d.grossMargin)}%` : null}
          tip="(Tushum – Tannarx) / Tushum × 100%. Product.productionCost ishlatiladi"
          unavailable={d.grossMarginNote}
          anomaly={d.grossMargin != null && d.grossMargin < 15}
        />
        <MetricCard title="Sotuv Rejasi"
          unavailable="Sotuv rejasi tizimga kiritilmagan"
          tip="Fakt / Reja × 100%. Budget/Target jadval mavjud emas" />
        <MetricCard title="Kanal Ulushi"
          unavailable="Offline/Online kanal ajratish mavjud emas"
          tip="Har bir kanal tushum ulushi. Kanal ma'lumoti yo'q" />
      </div>

      {/* Category margin table */}
      {d.marginByCategory && d.marginByCategory.length > 0 && (
        <>
          <SectionTitle>Ombor/Kategoriya Bo'yicha Marja
            <Tip text="SaleItem.subtotal va Product.productionCost asosida hisoblanadi" />
          </SectionTitle>
          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Kategoriya', 'Daromad', 'Marja %'].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.marginByCategory.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{r.category}</td>
                    <td className="py-2.5 px-4 tabular-nums">${fmt(r.revenue)}</td>
                    <td className="py-2.5 px-4 tabular-nums">
                      <span className={`font-semibold ${r.margin >= 20 ? 'text-emerald-600' : r.margin >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {fmt(r.margin)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Hourly heatmap */}
      {d.hourlySales && (
        <>
          <SectionTitle>Soat Bo'yicha Sotuv Tarqalishi
            <Tip text="Sale.createdAt soati bo'yicha guruhlanadi. Qaysi soatda ko'proq sotuv?" />
          </SectionTitle>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.hourlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tickFormatter={(h: number) => `${h}:00`} fontSize={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip labelFormatter={(h: number) => `${h}:00 – ${h + 1}:00`}
                  formatter={(v: any) => ['$' + Number(v).toLocaleString(), 'Daromad']} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Daromad" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Salesperson revenue */}
      {d.revenuePerSalesperson && d.revenuePerSalesperson.length > 0 && (
        <>
          <SectionTitle>Sotuvchi Bo'yicha Daromad
            <Tip text="Sale.userId bo'yicha guruhlangan jami tushum. User.role='SELLER'" />
          </SectionTitle>
          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Sotuvchi', 'Cheklar', 'Daromad'].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.revenuePerSalesperson.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{r.name}</td>
                    <td className="py-2.5 px-4 tabular-nums text-slate-600">{r.count}</td>
                    <td className="py-2.5 px-4 tabular-nums font-semibold">${fmt(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SKU Pareto */}
      {d.skuPareto && d.skuPareto.length > 0 && (
        <>
          <SectionTitle>SKU Pareto (Top mahsulotlar)
            <Tip text="Top 20% mahsulot → 80% tushum qoidasi. SaleItem.subtotal bo'yicha saralangan." />
          </SectionTitle>
          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Mahsulot', 'Miqdor', 'Daromad', 'Jami %', 'ABC'].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.skuPareto.slice(0, 20).map((r: any, i: number) => (
                  <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${r.cumPct <= 80 ? 'bg-indigo-50/30' : ''}`}>
                    <td className="py-2 px-4 font-medium text-slate-800">{r.name}</td>
                    <td className="py-2 px-4 tabular-nums text-slate-600">{fmt(r.qty, 0)}</td>
                    <td className="py-2 px-4 tabular-nums">${fmt(r.revenue)}</td>
                    <td className="py-2 px-4 tabular-nums text-slate-500">{fmt(r.cumPct)}%</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.cumPct <= 80 ? 'bg-indigo-100 text-indigo-700' : r.cumPct <= 95 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.cumPct <= 80 ? 'A' : r.cumPct <= 95 ? 'B' : 'C'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Daily trend chart */}
      {d.dailyTrend && d.dailyTrend.length > 0 && (
        <>
          <SectionTitle>Kunlik Sotuv Trendi</SectionTitle>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={d.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip formatter={(v: any) => ['$' + Number(v).toLocaleString(), 'Daromad']} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Ombor ───────────────────────────────────────────────────────────────

function InventoryTab({ data }: { data: any }) {
  if (!data) return <NoData msg="Ma'lumot yuklanmadi" />;
  const { summary, metrics, abcProducts, top10BySpeed, bottom10BySpeed, warehouseDist } = data;

  return (
    <div className="space-y-6">
      <SectionTitle>Ombor Holati</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Jami Inventar Qiymati" value={summary.totalInvValue} currency="USD"
          tip="Product.currentStock × Product.pricePerBag jami" />
        <MetricCard title="Tugagan SKU" value={`${fmt(summary.stockoutRate, 1)}%`}
          sub={`${summary.stockoutCount} ta mahsulot`}
          tip="currentStock=0 bo'lgan mahsulotlar / jami mahsulotlar × 100%"
          anomaly={summary.stockoutRate > 10} />
        <MetricCard title="O'lik Zaxira %" value={`${fmt(summary.deadStockRatio, 1)}%`}
          sub={`${summary.deadStockCount} ta mahsulot`}
          tip="Davrda 0 sotuv bo'lgan mahsulotlar qiymati / jami inventar qiymati"
          anomaly={summary.deadStockRatio > 20} />
        <MetricCard title="Kam Zaxira" value={summary.lowStockCount} sub="ta mahsulot"
          tip="currentStock < minStockLimit bo'lgan mahsulotlar soni"
          anomaly={summary.lowStockCount > 0} />
      </div>

      <SectionTitle>Aylanma Ko'rsatkichlari</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Inventar Aylanmasi" value={metrics.inventoryTurnover != null ? fmt(metrics.inventoryTurnover) : null}
          sub="marta/yil" tip="COGS / O'rtacha inventar qiymati × (365/kunlar)"
          unavailable={metrics.turnoverNote} />
        <MetricCard title="DIO (zaxira kunlari)" value={metrics.dio != null ? `${fmt(metrics.dio, 0)} kun` : null}
          tip="365 / Inventar Aylanmasi — inventar necha kunda tugaydi"
          unavailable={metrics.turnoverNote} />
        <MetricCard title="Zaxira/Sotuv Nisbati" value={metrics.stockToSales != null ? fmt(metrics.stockToSales) : null}
          tip="Joriy inventar qiymati / Davr sotuv tushumi"
          unavailable={metrics.stockToSales == null ? 'Sotuv ma\'lumoti yo\'q' : undefined} />
        <MetricCard title="Sell-through Rate" value={metrics.sellThrough != null ? `${fmt(metrics.sellThrough)}%` : null}
          tip="Sotilgan / (Sotilgan + Qolgan) × 100%"
          unavailable={metrics.sellThrough == null ? 'Hisoblash imkonsiz' : undefined} />
      </div>

      {/* Warehouse distribution */}
      {warehouseDist && warehouseDist.length > 0 && (
        <>
          <SectionTitle>Ombor Bo'yicha Taqsimot
            <Tip text="Product.warehouse maydoni bo'yicha guruhlangan" />
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={warehouseDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {warehouseDist.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => ['$' + Number(v).toLocaleString(), 'Qiymat']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Ombor', 'Mahsulotlar', 'Qiymat', 'Sotilgan'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {warehouseDist.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{r.name}</td>
                      <td className="py-2.5 px-3 tabular-nums">{r.count}</td>
                      <td className="py-2.5 px-3 tabular-nums">${fmt(r.value)}</td>
                      <td className="py-2.5 px-3 tabular-nums">{fmt(r.sold, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ABC table */}
      {abcProducts && abcProducts.length > 0 && (
        <>
          <SectionTitle>ABC Klassifikatsiya
            <Tip text="A: top 80% daromad, B: 80-95%, C: 95-100%. SaleItem.subtotal bo'yicha" />
          </SectionTitle>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(['A', 'B', 'C'] as const).map(abc => {
              const group = abcProducts.filter((p: any) => p.abc === abc);
              const colors: Record<string, string> = { A: 'bg-indigo-50 border-indigo-200 text-indigo-700', B: 'bg-amber-50 border-amber-200 text-amber-700', C: 'bg-slate-50 border-slate-200 text-slate-600' };
              return (
                <div key={abc} className={`rounded-xl border p-3 ${colors[abc]}`}>
                  <p className="text-2xl font-bold">{abc}</p>
                  <p className="text-sm font-medium">{group.length} ta mahsulot</p>
                  <p className="text-xs mt-1">{abc === 'A' ? 'Eng muhim (80%)' : abc === 'B' ? 'O\'rtacha (15%)' : 'Past prioritet (5%)'}</p>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Mahsulot', 'Ombor', 'Qoldiq', 'Sotilgan', 'Cover (kun)', 'ABC'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abcProducts.slice(0, 30).map((p: any, i: number) => (
                  <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${p.isStockout ? 'bg-rose-50' : p.isDeadStock ? 'bg-amber-50' : ''}`}>
                    <td className="py-2 px-3 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2 px-3 text-slate-500 text-xs">{p.warehouse}</td>
                    <td className="py-2 px-3 tabular-nums">
                      <span className={p.isStockout ? 'text-rose-600 font-bold' : p.isLowStock ? 'text-amber-600 font-semibold' : ''}>
                        {fmt(p.currentStock, 0)}
                      </span>
                    </td>
                    <td className="py-2 px-3 tabular-nums">{fmt(p.periodSold, 0)}</td>
                    <td className="py-2 px-3 tabular-nums">
                      {p.stockCover != null ? `${fmt(p.stockCover, 0)} kun` : <span className="text-slate-400">–</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.abc === 'A' ? 'bg-indigo-100 text-indigo-700' : p.abc === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.abc}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Speed tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {top10BySpeed && top10BySpeed.length > 0 && (
          <div>
            <SectionTitle>Eng Tez Aylanadigan 10 Mahsulot
              <Tip text="Kunlik o'rtacha sotuv (periodSold/kunlar) bo'yicha saralangan" />
            </SectionTitle>
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Mahsulot', 'Kunlik avg', 'Cover'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top10BySpeed.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{p.name}</td>
                      <td className="py-2 px-3 tabular-nums text-emerald-600">{fmt(p.dailySales, 2)}</td>
                      <td className="py-2 px-3 tabular-nums">{p.stockCover != null ? `${fmt(p.stockCover, 0)}k` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {bottom10BySpeed && bottom10BySpeed.length > 0 && (
          <div>
            <SectionTitle>Eng Sekin Aylanadigan 10 Mahsulot
              <Tip text="Kunlik sotuv eng past bo'lgan (sekin harakatlanadigan) mahsulotlar" />
            </SectionTitle>
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Mahsulot', 'Kunlik avg', 'Qoldiq'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bottom10BySpeed.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{p.name}</td>
                      <td className="py-2 px-3 tabular-nums text-amber-600">{fmt(p.dailySales, 2)}</td>
                      <td className="py-2 px-3 tabular-nums">{fmt(p.currentStock, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Mijozlar ────────────────────────────────────────────────────────────

function CustomersTab({ data }: { data: any }) {
  if (!data) return <NoData msg="Ma'lumot yuklanmadi" />;
  const { summary, metrics, aging, agingValue, top10Best, top10Risky } = data;

  const agingData = [
    { range: '0-30 kun', count: aging['0-30'], value: agingValue['0-30'] },
    { range: '31-60 kun', count: aging['31-60'], value: agingValue['31-60'] },
    { range: '61-90 kun', count: aging['61-90'], value: agingValue['61-90'] },
    { range: '90+ kun', count: aging['90+'], value: agingValue['90+'] },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle>Mijoz Ko'rsatkichlari</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Jami Mijozlar" value={summary.totalCustomers} tip="Customer jadvalidagi barcha mijozlar" />
        <MetricCard title="Faol Mijozlar" value={summary.activeCustomers}
          sub={`${summary.newCustomers} ta yangi`} tip="Tanlangan davrda sotuv bo'lgan mijozlar" />
        <MetricCard title="Churn Rate" value={metrics.churnRate != null ? `${fmt(metrics.churnRate)}%` : null}
          tip="Oldingi davrda bor, bu davrda yo'q mijozlar / oldingi davr mijozlari × 100%"
          unavailable={metrics.churnRate == null ? 'Avvalgi davr ma\'lumoti yo\'q' : undefined}
          anomaly={metrics.churnRate != null && metrics.churnRate > 30} />
        <MetricCard title="Retention Rate" value={metrics.retentionRate != null ? `${fmt(metrics.retentionRate)}%` : null}
          tip="Qaytgan mijozlar / oldingi davr mijozlari × 100%"
          unavailable={metrics.retentionRate == null ? 'Avvalgi davr ma\'lumoti yo\'q' : undefined} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Yangi Mijoz Daromadi" value={metrics.newRevenue} currency="USD"
          tip="Birinchi marta xarid qilgan mijozlar tushumi" />
        <MetricCard title="Qaytuvchi Daromad" value={metrics.returningRevenue} currency="USD"
          tip="Oldingi davrda ham xarid qilgan mijozlardan tushum" />
        <MetricCard title="Qayta Xarid Rate" value={`${fmt(metrics.repeatPurchRate)}%`}
          tip="Davrda 2+ marta xarid qilganlar / faol mijozlar × 100%" />
        <MetricCard title="Konsentratsiya Riski" value={`${fmt(metrics.concentrationRisk)}%`}
          tip="Top 5 mijoz tushumi / jami tushum × 100%. Yuqori = xavfli"
          anomaly={metrics.concentrationRisk > 50} />
      </div>

      <SectionTitle>Qarz Ko'rsatkichlari</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Jami Qarz (UZS)" value={summary.totalDebtUZS} currency="UZS"
          tip="Customer.debtUZS jami yig'indisi"
          anomaly={(summary.totalDebtUZS || 0) > 0} />
        <MetricCard title="Qarzdorlar ulushi" value={`${fmt(metrics.overdueRatio)}%`}
          sub={`${summary.debtorsCount} ta mijoz`}
          tip="Qarzdor mijozlar / jami mijozlar × 100%"
          anomaly={metrics.overdueRatio > 40} />
        <MetricCard title="DSO (qarz kunlari)" value={metrics.dso != null ? `${fmt(metrics.dso, 0)} kun` : null}
          tip="Jami qarz UZS / Kunlik o'rtacha daromad. To'lov kechikishi darajasi"
          unavailable={metrics.dso == null ? 'Sotuv ma\'lumoti yo\'q' : undefined}
          anomaly={metrics.dso != null && metrics.dso > 60} />
        <MetricCard title="Bad Debt Ratio" value={`${fmt(metrics.badDebtRatio)}%`}
          tip="90+ kun eskirgan qarz / jami qarz × 100%"
          anomaly={metrics.badDebtRatio > 10} />
      </div>

      {/* Aging report */}
      <SectionTitle>Qarz Eskirish Hisoboti (Aging Report)
        <Tip text="Mijozning so'nggi xarid sanasidan hozirgi kungacha o'tgan kunlar bo'yicha tasnif. Customer.lastPurchase asosida" />
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" />
              <Tooltip formatter={(v: any) => [Number(v).toLocaleString() + " so'm", 'Qarz']} />
              <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} name="Qarz (UZS)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Davr', 'Mijozlar', 'Qarz (UZS)'].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agingData.map((r, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i === 3 ? 'bg-rose-50' : ''}`}>
                  <td className="py-2.5 px-4 font-medium text-slate-800">{r.range}</td>
                  <td className="py-2.5 px-4 tabular-nums">{r.count}</td>
                  <td className="py-2.5 px-4 tabular-nums">{formatCurrency(r.value, 'UZS')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {top10Best && top10Best.length > 0 && (
          <div>
            <SectionTitle>Top 10 Mijoz (daromad bo'yicha)
              <Tip text="Tanlangan davrda eng ko'p xarid qilgan mijozlar. Sale.totalAmount bo'yicha" />
            </SectionTitle>
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Mijoz', 'Daromad', 'Kategoriya'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top10Best.map((c: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{c.name}</td>
                      <td className="py-2 px-3 tabular-nums font-semibold">${fmt(c.periodRevenue)}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.category === 'VIP' ? 'bg-amber-100 text-amber-700' : c.category === 'RISK' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {c.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {top10Risky && top10Risky.length > 0 && (
          <div>
            <SectionTitle>Top 10 Xavfli Mijoz (qarz bo'yicha)
              <Tip text="Eng ko'p qarz bo'lgan mijozlar. Customer.debtUZS bo'yicha saralangan" />
            </SectionTitle>
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Mijoz', 'Qarz (UZS)', 'Xavf'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top10Risky.map((c: any, i: number) => (
                    <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${c.riskLevel === 'HIGH' ? 'bg-rose-50/40' : ''}`}>
                      <td className="py-2 px-3 font-medium text-slate-800">{c.name}</td>
                      <td className="py-2 px-3 tabular-nums font-semibold text-rose-700">{formatCurrency(c.debtUZS, 'UZS')}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700' : c.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.riskLevel}
                        </span>
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
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = 'overview' | 'sales' | 'inventory' | 'customers';

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview',   label: 'Umumiy',   icon: BarChart3 },
  { id: 'sales',      label: 'Sotuv',    icon: ShoppingCart },
  { id: 'inventory',  label: 'Ombor',    icon: Package },
  { id: 'customers',  label: 'Mijozlar', icon: Users },
];

export default function ReportsDashboard() {
  const [activeTab, setActiveTab]     = useState<TabId>('overview');
  const [period, setPeriod]           = useState<Period>('month');
  const [customStart, setCustomStart] = useState<string>();
  const [customEnd, setCustomEnd]     = useState<string>();
  const [loading, setLoading]         = useState(false);
  const [data, setData]               = useState<Record<TabId, any>>({ overview: null, sales: null, inventory: null, customers: null });

  const ENDPOINTS: Record<TabId, string> = {
    overview:  '/reports/analytics/overview',
    sales:     '/reports/analytics/sales',
    inventory: '/reports/analytics/inventory',
    customers: '/reports/analytics/customers',
  };

  const fetchTab = useCallback(async (tab: TabId, p: Period, s?: string, e?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { period: p };
      if (p === 'custom' && s && e) { params.startDate = s; params.endDate = e; }
      const { data: resp } = await api.get(ENDPOINTS[tab], { params });
      setData(prev => ({ ...prev, [tab]: resp }));
    } catch (err) {
      console.error(`${tab} tahlilini yuklashda xatolik:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTab(activeTab, period, customStart, customEnd);
  }, [activeTab, period, customStart, customEnd, fetchTab]);

  const handlePeriod = (p: Period, s?: string, e?: string) => {
    setPeriod(p);
    if (p === 'custom') { setCustomStart(s); setCustomEnd(e); }
  };

  const handleRefresh = () => fetchTab(activeTab, period, customStart, customEnd);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real ma'lumotlarga asoslangan professional tahlil</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodFilter value={period} onChange={handlePeriod} />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200/70 flex gap-1 overflow-x-auto">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center gap-3 text-sm text-slate-500 bg-white rounded-2xl border border-slate-200/70 p-4">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          Ma'lumotlar yuklanmoqda…
        </div>
      )}

      {/* Tab content */}
      {!loading && (
        <div className="animate-in fade-in duration-300">
          {activeTab === 'overview'  && <OverviewTab   data={data.overview}   />}
          {activeTab === 'sales'     && <SalesTab      data={data.sales}      />}
          {activeTab === 'inventory' && <InventoryTab  data={data.inventory}  />}
          {activeTab === 'customers' && <CustomersTab  data={data.customers}  />}
        </div>
      )}
    </div>
  );
}
