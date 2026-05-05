import { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  Zap,
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Database, 
  Globe, 
  BarChart3,
  RefreshCw,
  Settings,
  Eye,
  Router,
  Cpu,
  HardDrive
} from 'lucide-react';
import { apiGateway, CircuitBreakerState } from '../lib/professionalAPIGateway';

interface MicroservicesMonitorProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  uptime: number;
  requests: number;
  errors: number;
  cpu: number;
  memory: number;
  circuitBreaker: {
    state: CircuitBreakerState;
    failures: number;
    successCount: number;
    threshold: number;
  };
  rateLimiter: {
    requests: number;
    limit: number;
    utilization: number;
  };
}

export default function ProfessionalMicroservicesMonitor({
  refreshInterval = 15000,
  showCharts = true,
  showDetails = true,
  className = '',
}: MicroservicesMonitorProps) {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);

  useEffect(() => {
    loadMicroservicesData();
    
    const interval = setInterval(() => {
      loadMicroservicesData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadMicroservicesData = async () => {
    try {
      setRefreshing(true);
      
      // Get service status from API Gateway
      const serviceStatus = apiGateway().getServiceStatus();
      const gatewayMetrics = apiGateway().getMetrics();
      
      // Transform to ServiceHealth format
      const servicesHealth: ServiceHealth[] = serviceStatus.map((service) => ({
        name: service.name,
        status: service.circuitBreaker.state === CircuitBreakerState.OPEN ? 'unhealthy' :
                service.circuitBreaker.failures > 0 ? 'degraded' : 'healthy',
        responseTime: Math.random() * 100 + 50, // Mock response time
        uptime: Math.random() * 5 + 95, // Mock uptime percentage
        requests: Math.floor(Math.random() * 10000) + 1000,
        errors: Math.floor(Math.random() * 100) + 10,
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 20,
        circuitBreaker: service.circuitBreaker,
        rateLimiter: service.rateLimiter,
      }));

      setServices(servicesHealth);
      setMetrics(gatewayMetrics);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load microservices data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadMicroservicesData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100';
      case 'degraded': return 'bg-yellow-100';
      case 'unhealthy': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5" />;
      case 'unhealthy': return <AlertTriangle className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const getCircuitBreakerColor = (state: CircuitBreakerState) => {
    switch (state) {
      case CircuitBreakerState.CLOSED: return 'text-green-600';
      case CircuitBreakerState.HALF_OPEN: return 'text-yellow-600';
      case CircuitBreakerState.OPEN: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'user-service': return <Users className="w-5 h-5" />;
      case 'product-service': return <Database className="w-5 h-5" />;
      case 'sales-service': return <BarChart3 className="w-5 h-5" />;
      case 'customer-service': return <Users className="w-5 h-5" />;
      case 'analytics-service': return <BarChart3 className="w-5 h-5" />;
      case 'notification-service': return <Globe className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const resetCircuitBreaker = (serviceName: string) => {
    apiGateway().resetCircuitBreaker(serviceName);
    loadMicroservicesData();
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Router className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Microservices Monitor</h2>
            <p className="text-sm text-gray-500">
              {services.length} services running
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

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {metrics?.totalRequests?.toLocaleString() || '0'}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Requests</p>
          <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {metrics ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1) : '0'}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Success Rate</p>
          <p className="text-xs text-gray-500 mt-1">Request success</p>
        </div>

        {/* Average Response Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {metrics?.averageResponseTime?.toFixed(0) || '0'}ms
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
          <p className="text-xs text-gray-500 mt-1">All services</p>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {(metrics?.cacheHitRate * 100 || 0).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
          <p className="text-xs text-gray-500 mt-1">Response cache</p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {services.map((service) => (
          <div 
            key={service.name}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedService(service)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusBgColor(service.status)}`}>
                  <div className={getStatusColor(service.status)}>
                    {getServiceIcon(service.name)}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{service.status}</p>
                </div>
              </div>
              <div className={getStatusColor(service.status)}>
                {getStatusIcon(service.status)}
              </div>
            </div>

            {/* Service Metrics */}
            <div className="space-y-3">
              {/* Response Time */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="text-sm font-medium text-gray-900">{service.responseTime.toFixed(0)}ms</span>
              </div>

              {/* Uptime */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium text-gray-900">{service.uptime.toFixed(1)}%</span>
              </div>

              {/* Requests */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Requests</span>
                <span className="text-sm font-medium text-gray-900">{service.requests.toLocaleString()}</span>
              </div>

              {/* Circuit Breaker */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Circuit Breaker</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${getCircuitBreakerColor(service.circuitBreaker.state)}`}>
                    {service.circuitBreaker.state}
                  </span>
                  {service.circuitBreaker.state === CircuitBreakerState.OPEN && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetCircuitBreaker(service.name);
                      }}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-1 rounded"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Rate Limiter */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rate Limit</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUtilizationColor(service.rateLimiter.utilization)}`}
                      style={{ width: `${Math.min(100, service.rateLimiter.utilization)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {service.rateLimiter.requests}/{service.rateLimiter.limit}
                  </span>
                </div>
              </div>

              {/* Resource Usage */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">CPU</span>
                    <span className={`text-xs font-medium ${getUtilizationColor(service.cpu)}`}>
                      {service.cpu.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${getUtilizationColor(service.cpu)}`}
                      style={{ width: `${service.cpu}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Memory</span>
                    <span className={`text-xs font-medium ${getUtilizationColor(service.memory)}`}>
                      {service.memory.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${getUtilizationColor(service.memory)}`}
                      style={{ width: `${service.memory}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Service Details Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusBgColor(selectedService.status)}`}>
                    <div className={getStatusColor(selectedService.status)}>
                      {getServiceIcon(selectedService.name)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedService.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{selectedService.status}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-gray-400 hover:text-gray-500"
                  title="Close"
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Performance Metrics</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Response Time</span>
                      <span className="text-sm font-medium text-gray-900">{selectedService.responseTime.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="text-sm font-medium text-gray-900">{selectedService.uptime.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Requests</span>
                      <span className="text-sm font-medium text-gray-900">{selectedService.requests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Error Rate</span>
                      <span className="text-sm font-medium text-red-600">
                        {((selectedService.errors / selectedService.requests) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resource Usage */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Resource Usage</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                          <Cpu className="w-4 h-4" /> CPU
                        </span>
                        <span className={`text-sm font-medium ${getUtilizationColor(selectedService.cpu)}`}>
                          {selectedService.cpu.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getUtilizationColor(selectedService.cpu)}`}
                          style={{ width: `${selectedService.cpu}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                          <HardDrive className="w-4 h-4" /> Memory
                        </span>
                        <span className={`text-sm font-medium ${getUtilizationColor(selectedService.memory)}`}>
                          {selectedService.memory.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getUtilizationColor(selectedService.memory)}`}
                          style={{ width: `${selectedService.memory}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Circuit Breaker Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Circuit Breaker</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">State</span>
                      <span className={`text-sm font-medium ${getCircuitBreakerColor(selectedService.circuitBreaker.state)}`}>
                        {selectedService.circuitBreaker.state}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Failures</span>
                      <span className="text-sm font-medium text-gray-900">{selectedService.circuitBreaker.failures}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Success Count</span>
                      <span className="text-sm font-medium text-green-600">{selectedService.circuitBreaker.successCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Threshold</span>
                      <span className="text-sm font-medium text-gray-900">{selectedService.circuitBreaker.threshold}</span>
                    </div>
                  </div>
                </div>

                {/* Rate Limiter Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Rate Limiter</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Requests</span>
                      <span className="text-sm font-medium text-gray-900">{selectedService.rateLimiter.requests}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Limit</span>
                      <span className="text-sm font-medium text-gray-900">{selectedService.rateLimiter.limit}/sec</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Utilization</span>
                      <span className={`text-sm font-medium ${getUtilizationColor(selectedService.rateLimiter.utilization)}`}>
                        {selectedService.rateLimiter.utilization.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    resetCircuitBreaker(selectedService.name);
                    setSelectedService(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Reset Circuit Breaker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Service Configuration
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <BarChart3 className="w-4 h-4" />
          Performance Reports
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Eye className="w-4 h-4" />
          View Logs
        </button>
      </div>
    </div>
  );
}
