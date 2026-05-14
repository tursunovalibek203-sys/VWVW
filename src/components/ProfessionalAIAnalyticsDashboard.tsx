import { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  Target, 
  RefreshCw,
  Play,
  Settings,
  Download,
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Activity
} from 'lucide-react';
import { 
  ProfessionalAIAnalyticsManager,
  PredictionType
} from '../lib/professionalAIAnalytics';

interface AIAnalyticsDashboardProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ProfessionalAIAnalyticsDashboard({
  refreshInterval = 30000,
  className = '',
}: AIAnalyticsDashboardProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedModel, setSelectedModel] = useState<PredictionType | null>(null);
  const [isTraining, setIsTraining] = useState(false);

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
      const manager = ProfessionalAIAnalyticsManager.getInstance();
      const data = manager.getAnalyticsDashboard();
      setDashboard(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load AI analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAnalyticsData();
  };

  const handleTrainModel = async (type: PredictionType) => {
    setIsTraining(true);
    try {
      const manager = ProfessionalAIAnalyticsManager.getInstance();
      await manager.trainModel(type);
      loadAnalyticsData();
    } catch (error) {
      console.error('Failed to train model:', error);
    } finally {
      setIsTraining(false);
    }
  };


  const getPredictionIcon = (type: PredictionType) => {
    switch (type) {
      case PredictionType.SALES_FORECAST: return <TrendingUp className="w-5 h-5" />;
      case PredictionType.CUSTOMER_CHURN: return <Users className="w-5 h-5" />;
      case PredictionType.PRICE_OPTIMIZATION: return <Target className="w-5 h-5" />;
      case PredictionType.INVENTORY_OPTIMIZATION: return <BarChart3 className="w-5 h-5" />;
      case PredictionType.DEMAND_PLANNING: return <Activity className="w-5 h-5" />;
      case PredictionType.ANOMALY_DETECTION: return <AlertTriangle className="w-5 h-5" />;
      case PredictionType.SENTIMENT_ANALYSIS: return <MessageSquare className="w-5 h-5" />;
      case PredictionType.RECOMMENDATION_ENGINE: return <Star className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="w-5 h-5 text-green-600" />;
      case 'negative': return <ThumbsDown className="w-5 h-5 text-red-600" />;
      default: return <MessageSquare className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Unable to load AI analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Analytics Dashboard</h2>
            <p className="text-sm text-gray-500">
              {Object.values(dashboard.models).filter((m: any) => m.trained).length} models trained
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
            title="Ma'lumotlarni yangilash"
            aria-label="Ma'lumotlarni yangilash"
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Predictions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {dashboard.predictions.total.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Predictions</p>
          <p className="text-xs text-gray-500 mt-1">
            Avg confidence: {formatConfidence(dashboard.predictions.averageConfidence)}
          </p>
        </div>

        {/* Model Accuracy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {formatConfidence(dashboard.predictions.averageAccuracy)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Model Accuracy</p>
          <p className="text-xs text-gray-500 mt-1">Across all models</p>
        </div>

        {/* Anomalies Detected */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {dashboard.anomalies.total.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Anomalies Detected</p>
          <p className="text-xs text-gray-500 mt-1">
            {dashboard.anomalies.bySeverity.critical} critical
          </p>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {dashboard.sentiments.total.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Sentiment Analysis</p>
          <p className="text-xs text-gray-500 mt-1">
            {dashboard.sentiments.distribution.positive} positive
          </p>
        </div>
      </div>

      {/* AI Models */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">AI Models</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Models
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {Object.entries(dashboard.models).map(([type, model]: [string, any]) => (
            <div 
              key={type}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedModel(type as PredictionType)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getPredictionIcon(type as PredictionType)}
                  <span className="font-medium text-gray-900 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {model.trained ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <span className="text-sm font-medium text-gray-900">
                    {model.trained ? formatConfidence(model.accuracy) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Predictions</span>
                  <span className="text-sm font-medium text-gray-900">
                    {model.predictions.toLocaleString()}
                  </span>
                </div>
                {model.lastTrained && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Trained</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(model.lastTrained).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrainModel(type as PredictionType);
                }}
                disabled={isTraining}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isTraining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-pulse" />
                    Training...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Train Model
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Anomalies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Anomalies</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Anomalies
          </button>
        </div>
        
        <div className="space-y-3">
          {dashboard.anomalies.recent.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No anomalies detected</p>
            </div>
          ) : (
            dashboard.anomalies.recent.slice(0, 5).map((anomaly: any) => (
              <div key={anomaly.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    anomaly.severity === 'critical' ? 'bg-red-100' :
                    anomaly.severity === 'high' ? 'bg-orange-100' :
                    anomaly.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      anomaly.severity === 'critical' ? 'text-red-600' :
                      anomaly.severity === 'high' ? 'text-orange-600' :
                      anomaly.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {anomaly.type} detected
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    anomaly.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    anomaly.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {anomaly.severity}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatConfidence(anomaly.confidence)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sentiment Analysis</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Sentiments
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sentiment Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Sentiment Distribution</h4>
            <div className="space-y-3">
              {Object.entries(dashboard.sentiments.distribution).map(([sentiment, count]) => (
                <div key={sentiment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(sentiment)}
                    <span className="text-sm font-medium text-gray-900 capitalize">{sentiment}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          sentiment === 'positive' ? 'bg-green-500' :
                          sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                        }`}
                        style={{ 
                          width: `${dashboard.sentiments.total > 0 ? ((count as number) / dashboard.sentiments.total) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sentiments */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Analysis</h4>
            <div className="space-y-3">
              {dashboard.sentiments.recent.slice(0, 5).map((sentiment: any) => (
                <div key={sentiment.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(sentiment.sentiment)}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {sentiment.sentiment}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatConfidence(sentiment.confidence)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {sentiment.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Recommendations
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {dashboard.recommendations.recent.slice(0, 6).map((rec: any) => (
            <div key={rec.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {rec.type} Recommendations
                </span>
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              
              <div className="space-y-2">
                {rec.items.slice(0, 3).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatConfidence(item.score)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Algorithm</span>
                  <span className="text-xs font-medium text-gray-900">{rec.algorithm}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          AI Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <BarChart3 className="w-4 h-4" />
          Analytics Reports
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>
    </div>
  );
}
