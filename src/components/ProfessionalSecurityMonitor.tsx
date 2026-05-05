import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Database, 
  Lock, 
  Unlock,
  Activity,
  Clock,
  Users,
  FileText,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { 
  dlpManager, 
  DataClassification, 
  ThreatLevel, 
  SecurityEvent,
  getSecurityDashboard 
} from '../lib/professionalDataLossPrevention';

interface SecurityMonitorProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ProfessionalSecurityMonitor({
  refreshInterval = 10000,
  showCharts = true,
  showDetails = true,
  className = '',
}: SecurityMonitorProps) {
  const [dashboard, setDashboard] = useState(getSecurityDashboard());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadDashboardData = () => {
    try {
      setRefreshing(true);
      const data = getSecurityDashboard();
      setDashboard(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load security dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getThreatLevelColor = (level: ThreatLevel) => {
    switch (level) {
      case ThreatLevel.LOW: return 'text-green-600';
      case ThreatLevel.MEDIUM: return 'text-yellow-600';
      case ThreatLevel.HIGH: return 'text-red-600';
      case ThreatLevel.CRITICAL: return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getThreatLevelBgColor = (level: ThreatLevel) => {
    switch (level) {
      case ThreatLevel.LOW: return 'bg-green-100';
      case ThreatLevel.MEDIUM: return 'bg-yellow-100';
      case ThreatLevel.HIGH: return 'bg-red-100';
      case ThreatLevel.CRITICAL: return 'bg-red-200';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  const getClassificationColor = (classification: DataClassification) => {
    switch (classification) {
      case DataClassification.PUBLIC: return 'text-green-600';
      case DataClassification.INTERNAL: return 'text-blue-600';
      case DataClassification.CONFIDENTIAL: return 'text-yellow-600';
      case DataClassification.RESTRICTED: return 'text-orange-600';
      case DataClassification.CRITICAL: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const resolveEvent = (eventId: string) => {
    // In a real implementation, you'd call the DLP manager
    console.log(`Resolving event: ${eventId}`);
    loadDashboardData();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getThreatLevelBgColor(dashboard.threatLevel)}`}>
            <Shield className={`w-6 h-6 ${getThreatLevelColor(dashboard.threatLevel)}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Security Monitor</h2>
            <p className="text-sm text-gray-500">
              Threat Level: <span className={`font-medium ${getThreatLevelColor(dashboard.threatLevel)}`}>
                {dashboard.threatLevel.toUpperCase()}
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className={`text-2xl font-bold ${dashboard.activeEvents > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {dashboard.activeEvents}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Active Events</p>
          <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
        </div>

        {/* Backup Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {getStatusIcon(dashboard.backupStatus)}
            </div>
            <span className={`text-sm font-medium ${
              dashboard.backupStatus === 'healthy' ? 'text-green-600' :
              dashboard.backupStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {dashboard.backupStatus.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Backup Status</p>
          <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
        </div>

        {/* Integrity Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              {getStatusIcon(dashboard.integrityStatus)}
            </div>
            <span className={`text-sm font-medium ${
              dashboard.integrityStatus === 'healthy' ? 'text-green-600' :
              dashboard.integrityStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {dashboard.integrityStatus.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Data Integrity</p>
          <p className="text-xs text-gray-500 mt-1">System check</p>
        </div>

        {/* Total Access Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {dashboard.accessLogs.length.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Access Logs</p>
          <p className="text-xs text-gray-500 mt-1">Last 100 records</p>
        </div>
      </div>

      {/* Data Classification Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Classification Distribution</h3>
        <div className="space-y-3">
          {Object.entries(dashboard.dataClassification).map(([classification, count]) => (
            <div key={classification} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  classification === 'public' ? 'bg-green-500' :
                  classification === 'internal' ? 'bg-blue-500' :
                  classification === 'confidential' ? 'bg-yellow-500' :
                  classification === 'restricted' ? 'bg-orange-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium text-gray-900 capitalize">{classification}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      classification === 'public' ? 'bg-green-500' :
                      classification === 'internal' ? 'bg-blue-500' :
                      classification === 'confidential' ? 'bg-yellow-500' :
                      classification === 'restricted' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ 
                      width: `${dashboard.accessLogs.length > 0 ? (count / dashboard.accessLogs.length) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 w-12 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {dashboard.recentEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No security events detected</p>
            </div>
          ) : (
            dashboard.recentEvents.slice(0, 5).map((event) => (
              <div 
                key={event.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    event.severity === ThreatLevel.CRITICAL ? 'bg-red-100' :
                    event.severity === ThreatLevel.HIGH ? 'bg-red-50' :
                    event.severity === ThreatLevel.MEDIUM ? 'bg-yellow-50' : 'bg-green-50'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      event.severity === ThreatLevel.CRITICAL ? 'text-red-600' :
                      event.severity === ThreatLevel.HIGH ? 'text-red-500' :
                      event.severity === ThreatLevel.MEDIUM ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.description}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(event.timestamp)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    event.severity === ThreatLevel.CRITICAL ? 'bg-red-100 text-red-700' :
                    event.severity === ThreatLevel.HIGH ? 'bg-red-50 text-red-600' :
                    event.severity === ThreatLevel.MEDIUM ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {event.severity}
                  </span>
                  {!event.resolved && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveEvent(event.id);
                      }}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-1 rounded"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Access Logs */}
      {showDetails && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Access Logs</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Export Logs
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboard.accessLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {log.action === 'read' && <Eye className="w-4 h-4 text-blue-500" />}
                        {log.action === 'write' && <FileText className="w-4 h-4 text-green-500" />}
                        {log.action === 'delete' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {log.action === 'export' && <Download className="w-4 h-4 text-purple-500" />}
                        {log.action === 'import' && <Database className="w-4 h-4 text-orange-500" />}
                        <span className="capitalize">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getClassificationColor(log.classification)}`}>
                        {log.classification}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeAgo(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Security Event Details</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-500"
                  title="Close"
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Event Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedEvent.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Severity</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedEvent.severity === ThreatLevel.CRITICAL ? 'bg-red-100 text-red-700' :
                      selectedEvent.severity === ThreatLevel.HIGH ? 'bg-red-50 text-red-600' :
                      selectedEvent.severity === ThreatLevel.MEDIUM ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {selectedEvent.severity}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Timestamp</p>
                    <p className="font-medium text-gray-900">{selectedEvent.timestamp.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedEvent.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedEvent.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="font-medium text-gray-900">{selectedEvent.description}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Details</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
                
                {!selectedEvent.resolved && (
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        resolveEvent(selectedEvent.id);
                        setSelectedEvent(null);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Resolve Event
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Security Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <BarChart3 className="w-4 h-4" />
          Security Reports
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>
    </div>
  );
}
