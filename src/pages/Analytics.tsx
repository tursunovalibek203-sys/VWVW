import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import Button from '../components/Button';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import BusinessMetricsCard from '../components/BusinessMetricsCard';
import MetricsCharts from '../components/MetricsCharts';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import AdvancedMetricsCard from '../components/AdvancedMetricsCard';
import CustomerSegmentsChart from '../components/CustomerSegmentsChart';
import StrategicRecommendations from '../components/StrategicRecommendations';
import RiskAssessment from '../components/RiskAssessment';
import AnomaliesDetection from '../components/AnomaliesDetection';
import ProfessionalCEOAnalytics from '../components/ProfessionalCEOAnalytics';
import { Crown } from 'lucide-react';

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [businessMetrics, setBusinessMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [activeView, setActiveView] = useState<'ai' | 'business' | 'charts' | 'ceo'>('ceo');

  useEffect(() => {
    loadAnalytics();
    loadBusinessMetrics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/ai-insights?days=${timeRange}`);
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics yuklashda xatolik');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-semibold">AI Tahlil qilinmoqda...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Ma'lumotlarni yuklashda xatolik</p>
          <Button onClick={loadAnalytics} className="mt-4">
            Qayta urinish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            AI Tahlil va Biznes Metrikalar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sun'iy intellekt va professional biznes tahlili
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            title="Vaqt oralig'ini tanlash"
            aria-label="Vaqt oralig'ini tanlash"
            className="px-4 py-2 bg-background border border-border rounded-lg"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7">Oxirgi 7 kun</option>
            <option value="30">Oxirgi 30 kun</option>
            <option value="90">Oxirgi 90 kun</option>
            <option value="365">Oxirgi 1 yil</option>
          </select>
          <Button onClick={() => { loadAnalytics(); loadBusinessMetrics(); }}>
            <Zap className="w-4 h-4 mr-2" />
            Yangilash
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveView('ai')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'ai'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain className="w-4 h-4" />
          AI Tahlil
        </button>
        <button
          onClick={() => setActiveView('business')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'business'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Biznes Metrikalar
        </button>
        <button
          onClick={() => setActiveView('charts')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'charts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Chartlar
        </button>
        <button
          onClick={() => setActiveView('ceo')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'ceo'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Crown className="w-4 h-4" />
          CEO Analytics
        </button>
      </div>

      {/* AI Tahlil View */}
      {activeView === 'ai' && (
        <div className="space-y-6">{/* AI Xulosalar */}
      <Card className="border-2 border-primary bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Xulosalari va Tavsiyalar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.insights?.map((insight: any, index: number) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-950 border-green-500'
                    : insight.type === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500'
                    : insight.type === 'danger'
                    ? 'bg-red-50 dark:bg-red-950 border-red-500'
                    : 'bg-blue-50 dark:bg-blue-950 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  {insight.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : insight.type === 'warning' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  ) : insight.type === 'danger' ? (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : (
                    <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    {insight.action && (
                      <p className="text-sm font-medium mt-2 text-primary">
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asosiy Metrikalar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 text-green-500" />
                <div className={`flex items-center gap-1 text-sm ${
                  analytics.metrics?.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.metrics?.revenueGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(analytics.metrics?.revenueGrowth || 0).toFixed(1)}%
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Jami Daromad</p>
              <p className="text-2xl font-bold">
                {formatCurrency(analytics.metrics?.totalRevenue || 0, 'USD')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 text-purple-500" />
                <div className={`flex items-center gap-1 text-sm ${
                  analytics.metrics?.profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.metrics?.profitGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(analytics.metrics?.profitGrowth || 0).toFixed(1)}%
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Sof Foyda</p>
              <p className="text-2xl font-bold">
                {formatCurrency(analytics.metrics?.netProfit || 0, 'USD')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-6 h-6 text-blue-500" />
                <span className="text-sm text-blue-600">
                  {analytics.metrics?.totalSales || 0}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Sotuvlar</p>
              <p className="text-2xl font-bold">
                {analytics.metrics?.totalQuantity || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 text-orange-500" />
                <span className="text-sm text-orange-600">
                  {analytics.metrics?.activeCustomers || 0}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Mijozlar</p>
              <p className="text-2xl font-bold">
                {analytics.metrics?.totalCustomers || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kengaytirilgan Metrikalar */}
      {analytics.advancedMetrics && (
        <div>
          <h2 className="text-xl font-bold mb-4">Kengaytirilgan Metrikalar</h2>
          <AdvancedMetricsCard metrics={analytics.advancedMetrics} />
        </div>
      )}

      {/* Daromad Trendi */}
      <Card>
        <CardHeader>
          <CardTitle>Daromad Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.trends?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Daromad"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Foyda"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Mijoz Segmentlari */}
      {analytics.customerSegments && analytics.customerSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mijoz Segmentlari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4">
              <CustomerSegmentsChart segments={analytics.customerSegments} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomaliyalar */}
      {analytics.anomalies && (
        <AnomaliesDetection anomalies={analytics.anomalies} />
      )}

      {/* Strategik Tavsiyalar */}
      {analytics.strategicRecommendations && analytics.strategicRecommendations.length > 0 && (
        <StrategicRecommendations recommendations={analytics.strategicRecommendations} />
      )}

      {/* Xavf Baholash */}
      {analytics.riskAssessment && (
        <RiskAssessment assessment={analytics.riskAssessment} />
      )}
        </div>
      )}

      {/* Biznes Metrikalar View */}
      {activeView === 'business' && (
        <div className="space-y-6">
          {businessMetrics ? (
            <BusinessMetricsCard metrics={businessMetrics} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <p className="text-lg font-semibold">Biznes metrikalari yuklanmoqda...</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Chartlar View */}
      {activeView === 'charts' && (
        <div className="space-y-6">
          {businessMetrics ? (
            <MetricsCharts metrics={businessMetrics} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <PieChart className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <p className="text-lg font-semibold">Chartlar yuklanmoqda...</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* CEO Analytics View */}
      {activeView === 'ceo' && (
        <ProfessionalCEOAnalytics />
      )}
    </div>
  );
}
