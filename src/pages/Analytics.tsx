import { useEffect, useState } from 'react';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import BusinessMetricsCard from '../components/BusinessMetricsCard';
import MetricsCharts from '../components/MetricsCharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon,
  Lightbulb,
  Crown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import AdvancedMetricsCard from '../components/AdvancedMetricsCard';
import CustomerSegmentsChart from '../components/CustomerSegmentsChart';
import StrategicRecommendations from '../components/StrategicRecommendations';
import RiskAssessment from '../components/RiskAssessment';
import AnomaliesDetection from '../components/AnomaliesDetection';
import ProfessionalCEOAnalytics from '../components/ProfessionalCEOAnalytics';
import AnalyticsMetricsDashboard from '../components/AnalyticsMetricsDashboard';

export default function Analytics() {
  const t = latinToCyrillic;
  const { addToast } = useToast();

  const [analytics, setAnalytics] = useState<any>(null);
  const [businessMetrics, setBusinessMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [activeView, setActiveView] = useState<'metrics' | 'ai' | 'business' | 'charts' | 'ceo'>('metrics');

  useEffect(() => {
    loadAnalytics();
    loadBusinessMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/ai-insights?days=${timeRange}`);
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics yuklashda xatolik');
      addToast({ type: 'error', title: t('Tahlilni yuklashda xatolik') });
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessMetrics = async () => {
    try {
      const { data } = await api.get(`/analytics/business-metrics?days=${timeRange}`);
      setBusinessMetrics(data.metrics);
    } catch (error) {
      console.error('Business metrics yuklashda xatolik');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAnalytics(), loadBusinessMetrics()]);
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
    { id: 'metrics' as const, name: t('Ko\'rsatkichlar'), icon: BarChart3 },
    { id: 'ceo' as const, name: t('CEO Tahlil'), icon: Crown },
    { id: 'ai' as const, name: t('AI Tahlil'), icon: Brain },
    { id: 'business' as const, name: t('Biznes Metrikalar'), icon: BarChart3 },
    { id: 'charts' as const, name: t('Chartlar'), icon: PieChart },
  ];

  // ── Header: clean title + period selector + refresh (reused in all states) ──
  const Header = () => (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t('Suniy intellekt tahlili')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('Professional biznes tahlili va aqlli tavsiyalar')} · {periodLabel[timeRange]}
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

  // ── Loading: clean header + KPI skeletons matching house style ──────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <Header />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-slate-900 p-6 h-[140px] animate-pulse" />
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[140px] animate-pulse" />
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
            description={t('Tahlil malumotlarini olishda muammo yuz berdi. Iltimos qaytadan urinib koring.')}
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
  const revenueUp = (m.revenueGrowth || 0) >= 0;
  const profitUp = (m.profitGrowth || 0) >= 0;

  const insightStyle = (type: string) => {
    switch (type) {
      case 'success':
        return { wrap: 'bg-emerald-50 border-emerald-500', icon: <CheckCircle className="w-5 h-5 text-emerald-600" /> };
      case 'warning':
        return { wrap: 'bg-amber-50 border-amber-500', icon: <AlertCircle className="w-5 h-5 text-amber-600" /> };
      case 'danger':
        return { wrap: 'bg-rose-50 border-rose-500', icon: <XCircle className="w-5 h-5 text-rose-600" /> };
      default:
        return { wrap: 'bg-indigo-50 border-indigo-500', icon: <Brain className="w-5 h-5 text-indigo-600" /> };
    }
  };

  // Secondary KPI cards (white tiles with soft tinted icon tiles)
  const kpiCards = [
    {
      title: t('Sof Foyda'),
      value: formatCurrency(m.netProfit || 0, 'USD'),
      icon: TrendingUp,
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

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Header />

      {/* View tabs — pill tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200/70 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* AI Tahlil View */}
      {activeView === 'ai' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* KPI metric grid: dark revenue hero + secondary white cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Premium dark KPI: total revenue */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t('Jami Daromad')}</p>
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <DollarSign className="w-[18px] h-[18px] text-indigo-300" />
                  </div>
                </div>
                <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">
                  {formatCurrency(m.totalRevenue || 0, 'USD')}
                </p>
                <div
                  className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg ${
                    revenueUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {revenueUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="tabular-nums">{Math.abs(m.revenueGrowth || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Secondary KPI cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                  <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{kpi.value}</p>
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

          {/* AI Insights card */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Brain className="w-[18px] h-[18px]" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 tracking-tight">{t('AI Xulosalari va Tavsiyalar')}</h2>
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

          {/* Advanced metrics */}
          {analytics.advancedMetrics && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <h2 className="font-semibold text-slate-900 tracking-tight mb-4">{t('Kengaytirilgan Metrikalar')}</h2>
              <AdvancedMetricsCard metrics={analytics.advancedMetrics} />
            </div>
          )}

          {/* Revenue trend chart */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <LineChartIcon className="w-[18px] h-[18px]" />
              </div>
              <h2 className="font-semibold text-slate-900 tracking-tight">{t('Daromad Trendi')}</h2>
            </div>
            {analytics.trends?.daily && analytics.trends.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trends.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={false} name={t('Daromad')} />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={false} name={t('Foyda')} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={LineChartIcon}
                title={t('Malumot yoq')}
                description={t('Tanlangan davr uchun daromad trendi topilmadi')}
              />
            )}
          </div>

          {/* Customer segments */}
          {analytics.customerSegments && analytics.customerSegments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users className="w-[18px] h-[18px]" />
                </div>
                <h2 className="font-semibold text-slate-900 tracking-tight">{t('Mijoz Segmentlari')}</h2>
              </div>
              <CustomerSegmentsChart segments={analytics.customerSegments} />
            </div>
          )}

          {/* Anomalies */}
          {analytics.anomalies && <AnomaliesDetection anomalies={analytics.anomalies} />}

          {/* Strategic recommendations */}
          {analytics.strategicRecommendations && analytics.strategicRecommendations.length > 0 && (
            <StrategicRecommendations recommendations={analytics.strategicRecommendations} />
          )}

          {/* Risk assessment */}
          {analytics.riskAssessment && <RiskAssessment assessment={analytics.riskAssessment} />}
        </div>
      )}

      {/* Biznes Metrikalar View */}
      {activeView === 'business' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {businessMetrics ? (
            <BusinessMetricsCard metrics={businessMetrics} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <EmptyState
                icon={BarChart3}
                title={t('Biznes metrikalari yuklanmoqda')}
                description={t('Iltimos kuting, malumotlar tayyorlanmoqda')}
              />
            </div>
          )}
        </div>
      )}

      {/* Chartlar View */}
      {activeView === 'charts' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {businessMetrics ? (
            <MetricsCharts metrics={businessMetrics} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6">
              <EmptyState
                icon={PieChart}
                title={t('Chartlar yuklanmoqda')}
                description={t('Iltimos kuting, malumotlar tayyorlanmoqda')}
              />
            </div>
          )}
        </div>
      )}

      {/* Ko'rsatkichlar View */}
      {activeView === 'metrics' && (
        <div className="animate-in fade-in duration-500">
          <AnalyticsMetricsDashboard timeRange={timeRange} />
        </div>
      )}

      {/* CEO Analytics View */}
      {activeView === 'ceo' && (
        <div className="animate-in fade-in duration-500">
          <ProfessionalCEOAnalytics />
        </div>
      )}
    </div>
  );
}
