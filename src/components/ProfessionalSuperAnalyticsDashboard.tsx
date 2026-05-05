import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Eye,
  Settings,
  Zap,
  Activity,
  DollarSign,
  Users,
  Package,
  CreditCard,
  TrendingUp as TrendingUpIcon,
  Award,
  Shield,
  Clock,
  Calendar,
  FileText,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { 
  superAnalytics, 
  BusinessData,
  AnalyticsResult,
  MetricCategory,
  MetricType,
  TimePeriod,
  generateBusinessReport,
  calculateMetric
} from '../lib/professionalSuperAnalytics';

interface SuperAnalyticsDashboardProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ProfessionalSuperAnalyticsDashboard({
  refreshInterval = 30000,
  showCharts = true,
  showDetails = true,
  className = '',
}: SuperAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [metrics, setMetrics] = useState<AnalyticsResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TimePeriod.MONTHLY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    
    const interval = setInterval(() => {
      loadAnalyticsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadAnalyticsData = () => {
    try {
      setRefreshing(true);
      
      const analyticsManager = superAnalytics.getInstance();
      
      // Sample business data (in real implementation, this would come from your database)
      const sampleData: BusinessData = {
        sales: {
          totalRevenue: 500000000,
          totalOrders: 1000,
          totalCustomers: 500,
          totalVisitors: 5000,
          repeatCustomers: 300,
          newCustomers: 200,
          averageOrderValue: 500000,
          conversionRate: 20,
          salesGrowthRate: 15,
          salesPerCustomer: 1000000,
          salesPerDay: 16666667,
          salesPerEmployee: 25000000,
          repeatPurchaseRate: 60,
          revenuePerVisitor: 100000,
        },
        products: {
          totalProducts: 50,
          costOfGoodsSold: 300000000,
          unitCost: 3000,
          unitPrice: 5000,
          unitProfit: 2000,
          grossProfit: 200000000,
          grossMargin: 40,
          contributionMargin: 35,
          sellThroughRate: 85,
          inventoryTurnover: 6,
          stockDays: 60,
          stockoutRate: 3,
          totalInventory: 10000000,
          averageInventory: 8000000,
        },
        profitability: {
          netProfit: 100000000,
          netProfitMargin: 20,
          operatingProfit: 150000000,
          operatingMargin: 30,
          ebitda: 180000000,
          roi: 25,
          roa: 15,
          roe: 20,
          breakEvenPoint: 200000000,
          contributionPerUnit: 2000,
          totalExpenses: 400000000,
          operatingExpenses: 50000000,
        },
        marketing: {
          customerAcquisitionCost: 50000,
          customerLifetimeValue: 500000,
          ltvToCacRatio: 10,
          customerRetentionRate: 85,
          churnRate: 15,
          customerSatisfactionScore: 85,
          netPromoterScore: 45,
          costPerLead: 5000,
          leadConversionRate: 10,
          marketingRoi: 400,
          totalMarketingSpend: 10000000,
          totalLeads: 2000,
        },
        debt: {
          totalDebt: 100000000,
          totalEquity: 200000000,
          debtRatio: 33,
          debtToEquityRatio: 0.5,
          interestCoverageRatio: 5,
          defaultRate: 2,
          accountsReceivable: 50000000,
          receivableTurnover: 8,
          daysSalesOutstanding: 45,
          badDebtRatio: 1,
          interestExpense: 10000000,
          ebit: 50000000,
        },
        cashFlow: {
          operatingCashFlow: 120000000,
          freeCashFlow: 100000000,
          cashBurnRate: 0,
          cashRunway: 365,
          cashConversionCycle: 45,
          beginningCash: 200000000,
          endingCash: 300000000,
          capitalExpenditures: 20000000,
          workingCapital: 150000000,
        },
        operational: {
          employeeProductivity: 100,
          revenuePerEmployee: 25000000,
          costPerEmployee: 5000000,
          orderFulfillmentTime: 24,
          returnRate: 2,
          defectRate: 1,
          onTimeDeliveryRate: 95,
          totalEmployees: 20,
          totalOrders: 1000,
          totalReturns: 20,
          defectiveProducts: 10,
          onTimeDeliveries: 950,
        },
        strategic: {
          marketShare: 15,
          customerGrowthRate: 20,
          productGrowthRate: 18,
          expansionRevenue: 50000000,
          newVsReturningCustomers: { new: 200, returning: 300 },
          totalMarketSize: 3333333333,
          competitorRevenue: 2833333333,
          newProductRevenue: 10000000,
          existingProductRevenue: 490000000,
        },
      };
      
      const report = analyticsManager.generateReport(sampleData);
      const allMetrics = analyticsManager.calculateAllMetrics(sampleData);
      
      setAnalytics(report);
      setMetrics(allMetrics);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAnalyticsData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatValue = (value: number, type: MetricType) => {
    switch (type) {
      case MetricType.CURRENCY:
        return formatCurrency(value);
      case MetricType.PERCENTAGE:
        return `${value.toFixed(1)}%`;
      case MetricType.RATIO:
        return value.toFixed(2);
      case MetricType.DAYS:
        return `${value.toFixed(0)} days`;
      case MetricType.TIME:
        return `${value.toFixed(1)} hours`;
      case MetricType.SCORE:
        return value.toFixed(0);
      case MetricType.COUNT:
        return value.toLocaleString();
      default:
        return value.toLocaleString();
    }
  };

  const getStatusColor = (result: AnalyticsResult) => {
    const { metric, value } = result;
    
    if (value >= metric.interpretation.good.min && value <= metric.interpretation.good.max) {
      return 'text-green-600';
    } else if (value >= metric.interpretation.warning.min && value <= metric.interpretation.warning.max) {
      return 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  };

  const getStatusIcon = (result: AnalyticsResult) => {
    const { metric, value } = result;
    
    if (value >= metric.interpretation.good.min && value <= metric.interpretation.good.max) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (value >= metric.interpretation.warning.min && value <= metric.interpretation.warning.max) {
      return <AlertTriangle className="w-4 h-4" />;
    } else {
      return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusBg = (result: AnalyticsResult) => {
    const { metric, value } = result;
    
    if (value >= metric.interpretation.good.min && value <= metric.interpretation.good.max) {
      return 'bg-green-50 border-green-200';
    } else if (value >= metric.interpretation.warning.min && value <= metric.interpretation.warning.max) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getCategoryIcon = (category: MetricCategory) => {
    switch (category) {
      case MetricCategory.SALES:
        return <DollarSign className="w-5 h-5" />;
      case MetricCategory.PRODUCT:
        return <Package className="w-5 h-5" />;
      case MetricCategory.PROFITABILITY:
        return <TrendingUpIcon className="w-5 h-5" />;
      case MetricCategory.MARKETING:
        return <Users className="w-5 h-5" />;
      case MetricCategory.DEBT:
        return <CreditCard className="w-5 h-5" />;
      case MetricCategory.CASH_FLOW:
        return <Activity className="w-5 h-5" />;
      case MetricCategory.OPERATIONAL:
        return <Zap className="w-5 h-5" />;
      case MetricCategory.STRATEGIC:
        return <Target className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  const getCategoryName = (category: MetricCategory) => {
    switch (category) {
      case MetricCategory.SALES:
        return 'Sales Metrics';
      case MetricCategory.PRODUCT:
        return 'Product Metrics';
      case MetricCategory.PROFITABILITY:
        return 'Profitability';
      case MetricCategory.MARKETING:
        return 'Marketing & Customers';
      case MetricCategory.DEBT:
        return 'Debt & Credit';
      case MetricCategory.CASH_FLOW:
        return 'Cash Flow';
      case MetricCategory.OPERATIONAL:
        return 'Operational Efficiency';
      case MetricCategory.STRATEGIC:
        return 'Strategic Growth';
      default:
        return 'All Metrics';
    }
  };

  const filteredMetrics = metrics.filter(metric => {
    const matchesSearch = searchQuery === '' || 
      metric.metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metric.metric.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || metric.metric.category === selectedCategory;
    
    const matchesStatus = !showCriticalOnly || 
      (metric.value < metric.metric.interpretation.warning.min);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Super Analytics Dashboard</h2>
            <p className="text-sm text-gray-500">
              65 Business Formulas - Overall Score: {analytics.overallScore.toFixed(1)}/100
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Business Performance Score</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">
                {analytics.overallScore.toFixed(1)}
              </div>
              <div className="text-sm opacity-90">
                <div>Excellent: {analytics.categorySummaries.filter(cat => cat.averageScore >= 80).length} categories</div>
                <div>Good: {analytics.categorySummaries.filter(cat => cat.averageScore >= 60 && cat.averageScore < 80).length} categories</div>
                <div>Needs Attention: {analytics.categorySummaries.filter(cat => cat.averageScore < 60).length} categories</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90 mb-2">Generated at</div>
            <div className="text-lg font-semibold">
              {analytics.generatedAt.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.categorySummaries.map((summary) => (
          <div key={summary.category} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  summary.averageScore >= 80 ? 'bg-green-100' :
                  summary.averageScore >= 60 ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  {getCategoryIcon(summary.category)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{getCategoryName(summary.category)}</h4>
                  <p className="text-sm text-gray-500">{summary.metricsCount} metrics</p>
                </div>
              </div>
              <div className={`text-2xl font-bold ${
                summary.averageScore >= 80 ? 'text-green-600' :
                summary.averageScore >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {summary.averageScore.toFixed(1)}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Good:</span>
                <span className="text-green-600 font-medium">{summary.goodPerformance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Warning:</span>
                <span className="text-yellow-600 font-medium">{summary.warnings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Critical:</span>
                <span className="text-red-600 font-medium">{summary.criticalIssues}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value={MetricCategory.SALES}>Sales</option>
              <option value={MetricCategory.PRODUCT}>Product</option>
              <option value={MetricCategory.PROFITABILITY}>Profitability</option>
              <option value={MetricCategory.MARKETING}>Marketing</option>
              <option value={MetricCategory.DEBT}>Debt & Credit</option>
              <option value={MetricCategory.CASH_FLOW}>Cash Flow</option>
              <option value={MetricCategory.OPERATIONAL}>Operational</option>
              <option value={MetricCategory.STRATEGIC}>Strategic</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Critical Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCriticalOnly}
              onChange={(e) => setShowCriticalOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Critical Issues Only</span>
          </label>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredMetrics.length} of {metrics.length} metrics
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMetrics.map((result) => (
          <div key={result.metric.id} className={`border rounded-xl p-6 ${getStatusBg(result)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(result)}`}>
                  {getStatusIcon(result)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{result.metric.name}</h4>
                  <p className="text-xs text-gray-500">{result.metric.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(result.trend)}
                <button className="text-gray-400 hover:text-gray-600" title="More options">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {formatValue(result.value, result.metric.type)}
                </span>
                <span className={`text-sm font-medium ${getStatusColor(result)}`}>
                  {result.changePercentage > 0 ? '+' : ''}{result.changePercentage.toFixed(1)}%
                </span>
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-1">{result.metric.description}</p>
                <p className="text-xs">Formula: {result.metric.formula}</p>
              </div>

              {/* Insights */}
              {result.insights.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Insights</span>
                  </div>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {result.insights.slice(0, 2).map((insight, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-600 mt-0.5">·</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Recommendations</span>
                  </div>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {result.recommendations.slice(0, 2).map((rec, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-600 mt-0.5">·</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Quality */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Data Quality: {result.dataQuality}</span>
                <span>Confidence: {result.confidence}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Issues and Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Issues */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Issues</h3>
          <div className="space-y-3">
            {analytics.topIssues.slice(0, 5).map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{issue.metric.name}</p>
                    <p className="text-xs text-gray-500">{formatValue(issue.value, issue.metric.type)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">Critical</p>
                  <p className="text-xs text-gray-500">{issue.metric.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {analytics.topPerformers.slice(0, 5).map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{performer.metric.name}</p>
                    <p className="text-xs text-gray-500">{formatValue(performer.value, performer.metric.type)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">Excellent</p>
                  <p className="text-xs text-gray-500">{performer.metric.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Recommendations</h3>
        <div className="space-y-2">
          {analytics.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">{index + 1}</span>
              </div>
              <p className="text-sm text-gray-700">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Analytics Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>
    </div>
  );
}
