import { useEffect, useState } from 'react';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import { formatDateTime } from '../lib/dateUtils';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Users,
  Package,
  DollarSign,
  RefreshCw,
  BarChart3,
  Activity,
  Award,
  Clock,
  Lightbulb,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AIManager() {
  const t = latinToCyrillic;
  const { addToast } = useToast();

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/ai-insights?days=${timeRange}`);
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics yuklashda xatolik');
      setAnalytics(null);
      addToast({ type: 'error', title: t('Tahlilni yuklashda xatolik') });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAnalytics();
      addToast({ type: 'success', title: t('Malumotlar yangilandi') });
    } finally {
      setRefreshing(false);
    }
  };

  const periodLabel: Record<string, string> = {
    '7': t('Oxirgi 7 kun'),
    '30': t('Oxirgi 30 kun'),
    '90': t('Oxirgi 90 kun'),
    '365': t('Oxirgi 1 yil'),
  };

  const tabs = [
    { id: 'overview', label: t('Umumiy'), icon: BarChart3 },
    { id: 'performance', label: t('Natijalar'), icon: Target },
    { id: 'insights', label: t('Tahlil'), icon: Brain },
    { id: 'risks', label: t('Xavflar'), icon: AlertTriangle },
  ];

  // ── Header: clean title + period selector + refresh (reused in all states) ──
  const Header = () => (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t('AI Manager')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('Suniy intellekt asosida tahlil va tavsiyalar')} · {periodLabel[timeRange]}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 self-start">
        <select
          title={t('Vaqt oraligini tanlash')}
          aria-label={t('Vaqt oraligini tanlash')}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="7">{t('Oxirgi 7 kun')}</option>
          <option value="30">{t('Oxirgi 30 kun')}</option>
          <option value="90">{t('Oxirgi 90 kun')}</option>
          <option value="365">{t('Oxirgi 1 yil')}</option>
        </select>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('Yangilash')}
        </button>
      </div>
    </div>
  );

  // ── Loading: clean header + dark hero + KPI skeletons matching house style ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <Header />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-slate-900 p-6 h-[200px] animate-pulse" />
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[200px] animate-pulse" />
            ))}
          </div>
        </div>
        <CardSkeleton count={4} />
      </div>
    );
  }

  // ── Error / no data ─────────────────────────────────────────────────────
  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <Header />
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
          <EmptyState
            icon={XCircle}
            title={t('Malumotlarni yuklashda xatolik')}
            description={t('AI Manager malumotlarini olishda muammo yuz berdi. Iltimos qaytadan urinib koring.')}
            action={
              <button
                onClick={loadAnalytics}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                {t('Qayta urinish')}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const m = analytics.metrics || {};
  const adv = analytics.advancedMetrics || {};
  const revenueUp = (m.revenueGrowth || 0) >= 0;
  const profitUp = (m.profitGrowth || 0) >= 0;
  const confidence = typeof analytics.aiConfidence === 'number' ? analytics.aiConfidence : null;

  const confidenceMeta =
    confidence === null
      ? { label: t('Malumot yetarli emas'), tone: 'bg-white/10 text-slate-300' }
      : confidence > 80
        ? { label: t('Yuqori aniqlik'), tone: 'bg-emerald-500/20 text-emerald-300' }
        : confidence > 60
          ? { label: t('Ortacha aniqlik'), tone: 'bg-amber-500/20 text-amber-300' }
          : { label: t('Past aniqlik'), tone: 'bg-rose-500/20 text-rose-300' };

  const insightStyle = (type: string) => {
    switch (type) {
      case 'success':
        return { wrap: 'bg-emerald-50 border-emerald-500', icon: <CheckCircle className="w-5 h-5 text-emerald-600" /> };
      case 'warning':
        return { wrap: 'bg-amber-50 border-amber-500', icon: <AlertTriangle className="w-5 h-5 text-amber-600" /> };
      case 'danger':
        return { wrap: 'bg-rose-50 border-rose-500', icon: <XCircle className="w-5 h-5 text-rose-600" /> };
      default:
        return { wrap: 'bg-indigo-50 border-indigo-500', icon: <Brain className="w-5 h-5 text-indigo-600" /> };
    }
  };

  const severityMeta = (level: string) => {
    switch (level) {
      case 'high':
        return { text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', border: 'border-rose-500', icon: 'text-rose-600' };
      case 'medium':
        return { text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-500', icon: 'text-amber-600' };
      default:
        return { text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-500', icon: 'text-emerald-600' };
    }
  };

  // Secondary KPI metric cards (overview) — white tiles with soft tinted icon
  const kpiCards = [
    {
      title: t('Daromad'),
      value: formatCurrency(m.totalRevenue || 0, 'USD'),
      icon: DollarSign,
      tint: 'bg-emerald-50 text-emerald-600',
      delta: m.revenueGrowth,
      deltaUp: revenueUp,
    },
    {
      title: t('Sof Foyda'),
      value: formatCurrency(m.netProfit || 0, 'USD'),
      icon: Target,
      tint: 'bg-indigo-50 text-indigo-600',
      delta: m.profitGrowth,
      deltaUp: profitUp,
    },
    {
      title: t('Sotuvlar'),
      value: (m.totalQuantity || 0).toLocaleString('en-US'),
      icon: Package,
      tint: 'bg-sky-50 text-sky-600',
      sub: `${(m.totalSales || 0).toLocaleString('en-US')} ${t('ta savdo')}`,
    },
    {
      title: t('Mijozlar'),
      value: (m.totalCustomers || 0).toLocaleString('en-US'),
      icon: Users,
      tint: 'bg-amber-50 text-amber-600',
      sub: `${(m.activeCustomers || 0).toLocaleString('en-US')} ${t('faol')}`,
    },
  ];

  // Advanced metric tiles (performance)
  const advancedTiles: { key: string; label: string; value?: number; format: string }[] = [
    { key: 'clv', label: t('Mijoz qiymati (CLV)'), value: adv.customerLifetimeValue, format: 'currency' },
    { key: 'retention', label: t('Ushlab qolish'), value: adv.customerRetentionRate, format: 'percent' },
    { key: 'roi', label: t('Investitsiya rentabelligi'), value: adv.returnOnInvestment, format: 'percent' },
    { key: 'turnover', label: t('Aylanma koeffitsienti'), value: adv.inventoryTurnoverRatio, format: 'number' },
    { key: 'cash', label: t('Pul aylanish sikli'), value: adv.cashConversionCycle, format: 'days' },
    { key: 'profitability', label: t('Foydalilik indeksi'), value: adv.profitabilityIndex, format: 'number' },
  ];

  const formatTile = (value: number | undefined, format: string) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    if (format === 'currency') return formatCurrency(value, 'USD');
    if (format === 'percent') return `${value.toFixed(1)}%`;
    if (format === 'days') return `${value.toFixed(0)} ${t('kun')}`;
    return value.toFixed(2);
  };

  const risk = analytics.riskAssessment;
  const riskMeta = risk ? severityMeta(risk.riskLevel) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Header />

      {/* Pill tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200/70 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Top: dark AI-confidence hero + KPI grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Premium dark hero: AI confidence (headline metric) */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('AI ishonch darajasi')}
                  </p>
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Brain className="w-[18px] h-[18px] text-indigo-300" />
                  </div>
                </div>
                <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">
                  {confidence === null ? '—' : `${confidence.toFixed(1)}%`}
                </p>
                <span className={`mt-3 inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${confidenceMeta.tone}`}>
                  {confidenceMeta.label}
                </span>
                <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xl font-bold tabular-nums">
                        {typeof adv.growthPotential === 'number' ? adv.growthPotential.toFixed(0) : '—'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{t('Osish salohiyati')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xl font-bold tabular-nums">
                        {typeof adv.riskScore === 'number' ? adv.riskScore.toFixed(0) : '—'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{t('Xavf bali')}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {t('Oxirgi yangilanish')}: {formatDateTime(new Date())}
                </p>
              </div>
            </div>

            {/* Secondary KPI cards */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-5">
              {kpiCards.map((kpi, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                      {kpi.title}
                    </p>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.tint}`}>
                      <kpi.icon className="w-[18px] h-[18px]" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums truncate">{kpi.value}</p>
                  {typeof kpi.delta === 'number' ? (
                    <p
                      className={`mt-1 text-xs flex items-center gap-1 font-medium ${
                        kpi.deltaUp ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {kpi.deltaUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span className="tabular-nums">{Math.abs(kpi.delta).toFixed(1)}%</span>
                    </p>
                  ) : (
                    kpi.sub && <p className="mt-1 text-xs text-slate-400 tabular-nums">{kpi.sub}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <TrendingUp className="w-[18px] h-[18px]" />
                </div>
                <h2 className="font-semibold text-slate-900 tracking-tight">{t('Daromad trendi')}</h2>
              </div>
              {analytics.trends?.daily && analytics.trends.daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics.trends.daily}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title={t('Malumot yoq')}
                  description={t('Tanlangan davr uchun daromad trendi topilmadi')}
                />
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Package className="w-[18px] h-[18px]" />
                </div>
                <h2 className="font-semibold text-slate-900 tracking-tight">{t('Eng kop sotilgan mahsulotlar')}</h2>
              </div>
              {analytics.topProducts && analytics.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.topProducts.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Package}
                  title={t('Malumot yoq')}
                  description={t('Tanlangan davr uchun mahsulot malumotlari topilmadi')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Performance ───────────────────────────────────────────────── */}
      {activeTab === 'performance' && (
        <div className="animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Target className="w-[18px] h-[18px]" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 tracking-tight">{t('Kengaytirilgan metrikalar')}</h2>
                <p className="text-sm text-slate-500">{t('Biznes samaradorligini chuqur korsatkichlari')}</p>
              </div>
            </div>
            {analytics.advancedMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {advancedTiles.map((tile) => (
                  <div
                    key={tile.key}
                    className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 transition-all hover:bg-white hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{tile.label}</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{formatTile(tile.value, tile.format)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title={t('Metrikalar topilmadi')}
                description={t('Tanlangan davr uchun kengaytirilgan metrikalar mavjud emas')}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Insights ──────────────────────────────────────────────────── */}
      {activeTab === 'insights' && (
        <div className="animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Brain className="w-[18px] h-[18px]" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 tracking-tight">{t('AI xulosalari va tavsiyalar')}</h2>
                <p className="text-sm text-slate-500">{t('Malumotlar asosida aqlli tahlil')}</p>
              </div>
            </div>
            {analytics.insights && analytics.insights.length > 0 ? (
              <div className="space-y-3">
                {analytics.insights.map((insight: any, index: number) => {
                  const s = insightStyle(insight.type);
                  return (
                    <div key={index} className={`p-4 rounded-xl border-l-4 ${s.wrap}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">{s.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900">{insight.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                          {insight.action && (
                            <p className="inline-flex items-center gap-1.5 text-sm font-medium mt-2 text-indigo-600">
                              <Lightbulb className="w-4 h-4" />
                              {insight.action}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Brain}
                title={t('Hozircha xulosa yoq')}
                description={t('Tanlangan davr uchun AI tavsiyalari topilmadi')}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Risks ─────────────────────────────────────────────────────── */}
      {activeTab === 'risks' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {risk && riskMeta ? (
            <>
              {/* Risk summary card */}
              <div className={`bg-white rounded-2xl border-l-4 ${riskMeta.border} border-y border-r border-slate-200/70 p-5 sm:p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${riskMeta.badge}`}>
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('Umumiy xavf darajasi')}</p>
                      <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${riskMeta.text}`}>
                        {String(risk.riskLevel || '').toUpperCase()}
                      </p>
                      {typeof risk.riskScore === 'number' && (
                        <p className="mt-0.5 text-sm text-slate-500 tabular-nums">{t('Ball')}: {risk.riskScore}/100</p>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight tabular-nums">{risk.totalRisks ?? 0}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('Aniqlangan xavflar')}</p>
                  </div>
                </div>
              </div>

              {/* Risk list */}
              {risk.risks && risk.risks.length > 0 ? (
                <div className="space-y-4">
                  {risk.risks.map((r: any, index: number) => {
                    const rm = severityMeta(r.severity);
                    return (
                      <div
                        key={index}
                        className={`bg-white rounded-2xl border-l-4 ${rm.border} border-y border-r border-slate-200/70 p-5`}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${rm.icon}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${rm.badge}`}>
                                {String(r.severity || '').toUpperCase()}
                              </span>
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                                {String(r.category || '').toUpperCase()}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-900">{r.title}</h4>
                            <p className="text-sm text-slate-600 mt-1 mb-3">{r.description}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                                <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-1">{t('Tasir')}</p>
                                <p className="text-sm text-slate-600">{r.impact}</p>
                              </div>
                              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">{t('Yechim')}</p>
                                <p className="text-sm text-slate-600">{r.mitigation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
                  <EmptyState
                    icon={CheckCircle}
                    title={t('Xavflar aniqlanmadi')}
                    description={t('Tanlangan davr uchun jiddiy xavflar topilmadi')}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <EmptyState
                icon={ShieldAlert}
                title={t('Xavf tahlili mavjud emas')}
                description={t('Tanlangan davr uchun xavf baholash malumotlari topilmadi')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
