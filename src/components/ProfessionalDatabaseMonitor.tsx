import { useState, useEffect } from 'react';
import { 
  Database, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
  Zap
} from 'lucide-react';
import { databaseManager, DatabaseMetrics } from '../lib/professionalDatabase';

interface DatabaseMonitorProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  cpu: number;
  memory: number;
  disk: number;
  connections: number;
  queries: number;
}

export default function ProfessionalDatabaseMonitor({
  refreshInterval = 5000,
  showCharts = true,
  showDetails = true,
  className = '',
}: DatabaseMonitorProps) {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    loadMetrics();
    
    const interval = setInterval(() => {
      loadMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadMetrics = async () => {
    try {
      setRefreshing(true);
      
      // Get database metrics
      const dbMetrics = databaseManager().getMetrics();
      setMetrics(dbMetrics);

      // Simulate system health metrics
      const health: SystemHealth = {
        status: dbMetrics.averageQueryTime < 500 ? 'healthy' : 
                dbMetrics.averageQueryTime < 1000 ? 'warning' : 'critical',
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        connections: dbMetrics.connectionCount,
        queries: dbMetrics.queryCount,
      };
      setSystemHealth(health);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load database metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadMetrics();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const getProgressBarColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'bg-red-500';
    if (value >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!metrics || !systemHealth) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Unable to load database metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            systemHealth.status === 'healthy' ? 'bg-green-100 text-green-600' :
            systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-600'
          }`}>
            {getStatusIcon(systemHealth.status)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Database Monitor</h2>
            <p className="text-sm text-gray-500">
              Status: <span className={`font-medium ${getStatusColor(systemHealth.status)}`}>
                {systemHealth.status.toUpperCase()}
              </span>
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
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Connections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.connectionCount > 50 ? 'text-red-600' :
              metrics.connectionCount > 30 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.connectionCount}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Active Connections</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (metrics.connectionCount / 100) * 100)}%` }}
            />
          </div>
        </div>

        {/* Query Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.averageQueryTime > 1000 ? 'text-red-600' :
              metrics.averageQueryTime > 500 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {formatTime(metrics.averageQueryTime)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Avg Query Time</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(metrics.averageQueryTime, { warning: 500, critical: 1000 })}`}
              style={{ width: `${Math.min(100, (metrics.averageQueryTime / 2000) * 100)}%` }}
            />
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.cacheHitRate < 0.8 ? 'text-red-600' :
              metrics.cacheHitRate < 0.9 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {(metrics.cacheHitRate * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(metrics.cacheHitRate * 100, { warning: 80, critical: 70 })}`}
              style={{ width: `${metrics.cacheHitRate * 100}%` }}
            />
          </div>
        </div>

        {/* Slow Queries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.slowQueries > 10 ? 'text-red-600' :
              metrics.slowQueries > 5 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.slowQueries}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Slow Queries</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
             7 7 7 7 7N7N8N8N8N8N8N8M9MM9M9M9M9M90,0,0,0,0,M8M8N76BV5C43XZ2 9YYYYYYYTTTRRRREEEWWQ
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CPU */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">CPU Usage</span>
              <span className="text-sm font-bold text-gray-900">{systemHealth.cpu.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(systemHealth.cpu, { warning: 70, critical: 90 })}`}
                style={{ width: `${systemHealth.cpu}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Memory Usage</span>
              <span className="text-sm font-bold text-gray-900">{systemHealth.memory.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(systemHealth.memory, { warning: 70, critical: 90 })}`}
                style={{ width: `${systemHealth.memory}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Disk Usage</span>
              <span className="text-sm font-bold text-gray-900">{systemHealth.disk.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(systemHealth.disk, { warning: 80, critical: 95 })}`}
                style={{ width: `${systemHealth.disk}%` }}
              />
            </div>
          </div>

          {/* Queries/sec */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Queries/sec</span>
              <span className="text-sm font-bold text-gray-900">{systemHealth.queries}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (systemHealth.queries / 1000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Storage Usage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Memory Usage</span>
                <span className="text-sm font-medium text-gray-900">{formatBytes(metrics.memoryUsage)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Disk Usage</span>
                <span className="text-sm font-medium text-gray-900">{formatBytes(metrics.diskUsage)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Queries</span>
                <span className="text-sm font-medium text-gray-900">{metrics.queryCount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Index Usage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Index Usage</h3>
            <div className="space-y-3">
              {Object.entries(metrics.indexUsage).slice(0, 5).map(([index, usage]) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{index}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(100, usage * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {(usage * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <BarChart3 className="w-4 h-4" />
          View Reports
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Metrics
        </button>
      </div>
    </div>
  );
}
