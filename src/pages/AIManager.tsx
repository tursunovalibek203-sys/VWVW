import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import Button from '../components/Button';
import api from '../lib/professionalApi';
import { formatCurrency } from '../lib/utils';
import { formatDateTime } from '../lib/dateUtils';
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
  Zap,
  BarChart3,
  Activity,
  Award,
  Clock
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
  ResponsiveContainer
} from 'recharts';

export default function AIManager() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-semibold">AI Manager Tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2 sm:gap-3">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              AI Manager Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Professional Business Intelligence & Analytics
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              title="Vaqt oralig'ini tanlash"
              aria-label="Vaqt oralig'ini tanlash"
              className="flex-1 sm:flex-none px-3 py-2 text-sm bg-background border border-border rounded-lg"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7">7 kun</option>
              <option value="30">30 kun</option>
              <option value="90">90 kun</option>
              <option value="365">1 yil</option>
            </select>
            <Button onClick={loadAnalytics} className="flex-1 sm:flex-none">
              <Zap className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Yangilash</span>
              <span className="sm:hidden">↻</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'overview', label: 'Umumiy', icon: BarChart3 },
            { id: 'performance', label: 'Natijalar', icon: Target },
            { id: 'insights', label: 'Tahlil', icon: Brain },
            { id: 'risks', label: 'Xavflar', icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Score Card */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm opacity-90 mb-1">AI Ishonch Darajasi</p>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold">
                {analytics?.aiConfidence?.toFixed(1)}%
              </p>
              <p className="text-xs sm:text-sm opacity-75 mt-1">
                {analytics?.aiConfidence > 80 ? '✅ Yuqori aniqlik' :
                 analytics?.aiConfidence > 60 ? '⚠️ O\'rtacha aniqlik' :
                 '❌ Past aniqlik'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-bold">
                  {analytics?.advancedMetrics?.growthPotential?.toFixed(0)}
                </p>
                <p className="text-[10px] sm:text-xs opacity-75">O'sish</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-bold">
                  {analytics?.advancedMetrics?.riskScore?.toFixed(0)}
                </p>
                <p className="text-[10px] sm:text-xs opacity-75">Xavf</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center col-span-2 sm:col-span-1">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1" />
                <p className="text-xs sm:text-sm font-semibold">
                  {formatDateTime(new Date())}
                </p>
                <p className="text-[10px] sm:text-xs opacity-75">Oxirgi yangilanish</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  <div className={`flex items-center gap-1 text-xs ${
                    analytics?.metrics?.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analytics?.metrics?.revenueGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(analytics?.metrics?.revenueGrowth || 0).toFixed(1)}%
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Daromad</p>
                <p className="text-base sm:text-lg md:text-xl font-bold truncate">
                  {formatCurrency(analytics?.metrics?.totalRevenue || 0, 'USD')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                  <div className={`flex items-center gap-1 text-xs ${
                    analytics?.metrics?.profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analytics?.metrics?.profitGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(analytics?.metrics?.profitGrowth || 0).toFixed(1)}%
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Foyda</p>
                <p className="text-base sm:text-lg md:text-xl font-bold truncate">
                  {formatCurrency(analytics?.metrics?.netProfit || 0, 'USD')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                  <span className="text-xs text-blue-600">
                    {analytics?.metrics?.totalSales || 0}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Sotuvlar</p>
                <p className="text-base sm:text-lg md:text-xl font-bold">
                  {analytics?.metrics?.totalQuantity || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                  <span className="text-xs text-orange-600">
                    {analytics?.metrics?.activeCustomers || 0}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Mijozlar</p>
                <p className="text-base sm:text-lg md:text-xl font-bold">
                  {analytics?.metrics?.totalCustomers || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-sm sm:text-base">Daromad Trendi</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics?.trends?.daily || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-sm sm:text-base">Top Mahsulotlar</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics?.topProducts?.slice(0, 5) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {analytics?.advancedMetrics && Object.entries({
            'CLV': { value: analytics.advancedMetrics.customerLifetimeValue, format: 'currency' },
            'Retention': { value: analytics.advancedMetrics.customerRetentionRate, format: 'percent' },
            'ROI': { value: analytics.advancedMetrics.returnOnInvestment, format: 'percent' },
            'Turnover': { value: analytics.advancedMetrics.inventoryTurnoverRatio, format: 'number' },
            'Cash Cycle': { value: analytics.advancedMetrics.cashConversionCycle, format: 'days' },
            'Profitability': { value: analytics.advancedMetrics.profitabilityIndex, format: 'number' },
          }).map(([key, data]: [string, any]) => (
            <Card key={key} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">{key}</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {data.format === 'currency' ? formatCurrency(data.value, 'USD') :
                   data.format === 'percent' ? `${data.value.toFixed(1)}%` :
                   data.format === 'days' ? `${data.value.toFixed(0)} kun` :
                   data.value.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-3 sm:space-y-4">
          {analytics?.insights?.map((insight: any, index: number) => (
            <Card 
              key={index}
              className={`border-l-4 ${
                insight.type === 'success' ? 'border-green-500' :
                insight.type === 'warning' ? 'border-yellow-500' :
                insight.type === 'danger' ? 'border-red-500' :
                'border-blue-500'
              }`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  {insight.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base mb-1">{insight.title}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{insight.description}</p>
                    {insight.action && (
                      <p className="text-xs sm:text-sm font-medium mt-2 text-primary">
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'risks' && analytics?.riskAssessment && (
        <div className="space-y-4 sm:space-y-6">
          <Card className={`border-2 ${
            analytics.riskAssessment.riskLevel === 'high' ? 'border-red-500' :
            analytics.riskAssessment.riskLevel === 'medium' ? 'border-yellow-500' :
            'border-green-500'
          }`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Umumiy Xavf Darajasi</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${
                    analytics.riskAssessment.riskLevel === 'high' ? 'text-red-600' :
                    analytics.riskAssessment.riskLevel === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {analytics.riskAssessment.riskLevel.toUpperCase()}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Ball: {analytics.riskAssessment.riskScore}/100
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl sm:text-4xl font-bold">{analytics.riskAssessment.totalRisks}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Aniqlangan xavflar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 sm:space-y-4">
            {analytics.riskAssessment.risks.map((risk: any, index: number) => (
              <Card key={index} className={`border-l-4 ${
                risk.severity === 'high' ? 'border-red-500' :
                risk.severity === 'medium' ? 'border-yellow-500' :
                'border-green-500'
              }`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 ${
                      risk.severity === 'high' ? 'text-red-600' :
                      risk.severity === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-[10px] sm:text-xs font-bold text-white ${
                          risk.severity === 'high' ? 'bg-red-600' :
                          risk.severity === 'medium' ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}>
                          {risk.severity.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 rounded text-[10px] sm:text-xs font-bold bg-muted">
                          {risk.category.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base mb-1">{risk.title}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">{risk.description}</p>
                      <div className="space-y-2">
                        <div className="p-2 bg-muted rounded text-xs sm:text-sm">
                          <p className="font-semibold mb-1">⚠️ Ta'sir:</p>
                          <p className="text-muted-foreground">{risk.impact}</p>
                        </div>
                        <div className="p-2 bg-muted rounded text-xs sm:text-sm">
                          <p className="font-semibold mb-1">💡 Yechim:</p>
                          <p className="text-muted-foreground">{risk.mitigation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
