import { useState, useEffect } from 'react';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: string; latency: number };
    redis: { status: string; latency: number };
    queues?: Record<string, { status: string; waiting: number; failed: number }>;
    memory: { status: string; used: number; total: number; percentage: number };
  };
}

export const useHealthCheck = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Dastlabki check
    checkHealth();

    // Har 30 soniyada qayta tekshirish
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const isDatabaseConnected = health?.checks?.database?.status === 'ok';
  const isHealthy = health?.status === 'healthy';
  const isDegraded = health?.status === 'degraded';

  return {
    health,
    loading,
    error,
    isDatabaseConnected,
    isHealthy,
    isDegraded,
    refetch: checkHealth,
  };
};
