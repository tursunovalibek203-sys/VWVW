import api from './professionalApi';

interface HealthCheckResult {
  isHealthy: boolean;
  status?: string;
  version?: string;
  timestamp: number;
}

let cachedResult: HealthCheckResult | null = null;
let cacheExpiry: number | null = null;
const CACHE_DURATION = 10000; // 10 seconds

export async function checkServerHealth(): Promise<HealthCheckResult> {
  const now = Date.now();

  // Return cached result if still valid
  if (cachedResult && cacheExpiry && now < cacheExpiry) {
    return cachedResult;
  }

  try {
    const response = await api.get('/health');

    const result: HealthCheckResult = {
      isHealthy: true,
      status: response.data?.status || 'ok',
      version: response.data?.version,
      timestamp: now,
    };

    // Cache the result
    cachedResult = result;
    cacheExpiry = now + CACHE_DURATION;

    return result;
  } catch (error) {
    const result: HealthCheckResult = {
      isHealthy: false,
      timestamp: now,
    };

    // Cache the failure for a shorter duration
    cachedResult = result;
    cacheExpiry = now + (CACHE_DURATION / 2); // 5 seconds for failures

    return result;
  }
}

export function clearHealthCheckCache(): void {
  cachedResult = null;
  cacheExpiry = null;
}
