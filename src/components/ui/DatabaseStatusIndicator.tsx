import React from 'react';
import { useHealthCheck } from '../../hooks/useHealthCheck';

export const DatabaseStatusIndicator: React.FC<{ showDetails?: boolean }> = ({ 
  showDetails = false 
}) => {
  const { health, isDatabaseConnected, isHealthy } = useHealthCheck();

  if (!health) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span>Tekshirilmoqda...</span>
      </div>
    );
  }

  const statusConfig = {
    connected: {
      bg: 'bg-green-100',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: '✅',
      label: 'Ulanish OK'
    },
    disconnected: {
      bg: 'bg-red-100',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: '❌',
      label: 'Ulanish yoq'
    },
    degraded: {
      bg: 'bg-yellow-100',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: '⚠️',
      label: 'Sekin'
    }
  };

  let config = statusConfig.disconnected;
  if (isDatabaseConnected && isHealthy) {
    config = statusConfig.connected;
  } else if (health.status === 'degraded') {
    config = statusConfig.degraded;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${config.bg} ${config.text} text-xs rounded-lg border ${config.border}`}>
      <span className="text-sm">{config.icon}</span>
      <span className="font-medium">Database: {config.label}</span>
      
      {showDetails && isDatabaseConnected && (
        <span className="ml-1 text-xs opacity-75">
          ({health.checks.database.latency}ms)
        </span>
      )}
    </div>
  );
};

export const SystemHealthDashboard: React.FC = () => {
  const { health, isDatabaseConnected, isHealthy } = useHealthCheck();

  if (!health) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Tizim holati</h3>
        <p className="text-gray-600">Tekshirilmoqda...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'degraded':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'degraded':
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Tizim holati</h3>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          health.status === 'healthy' 
            ? 'bg-green-100 text-green-700' 
            : health.status === 'degraded'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {health.status === 'healthy' ? '✅ Sog\'lom' : health.status === 'degraded' ? '⚠️ Sekin' : '❌ Muammo'}
        </span>
      </div>

      {/* Database Status */}
      <div className={`p-3 rounded-lg ${getStatusBg(health.checks.database.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Ma'lumotlar bazasi</p>
            <p className="text-xs text-gray-600">PostgreSQL ulanish</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${getStatusColor(health.checks.database.status)}`}>
              {health.checks.database.status === 'ok' ? '✅ OK' : '❌ Xato'}
            </p>
            <p className="text-xs text-gray-600">{health.checks.database.latency}ms</p>
          </div>
        </div>
      </div>

      {/* Redis Status */}
      <div className={`p-3 rounded-lg ${getStatusBg(health.checks.redis.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Cache (Redis)</p>
            <p className="text-xs text-gray-600">Redis ulanish</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${getStatusColor(health.checks.redis.status)}`}>
              {health.checks.redis.status === 'ok' ? '✅ OK' : '⚠️ Yo\'q'}
            </p>
            <p className="text-xs text-gray-600">{health.checks.redis.latency}ms</p>
          </div>
        </div>
      </div>

      {/* Memory Status */}
      <div className={`p-3 rounded-lg ${getStatusBg(health.checks.memory.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Xotira</p>
            <p className="text-xs text-gray-600">RAM foydalanish</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${getStatusColor(health.checks.memory.status)}`}>
              {health.checks.memory.percentage.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">
              {(health.checks.memory.used / 1024 / 1024).toFixed(0)}MB / {(health.checks.memory.total / 1024 / 1024).toFixed(0)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Overall Info */}
      <div className="pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
        <p>🕐 Vaqt: {new Date(health.timestamp).toLocaleTimeString('uz-UZ')}</p>
        <p>⏱️ Ishlash vaqti: {Math.floor(health.uptime / 1000)}s</p>
        <p>📦 Versiya: {health.version}</p>
      </div>
    </div>
  );
};
