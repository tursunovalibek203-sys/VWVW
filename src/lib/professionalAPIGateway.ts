// Professional API Gateway and Microservices Architecture

// HTTP Methods
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

// Request/Response Types
export interface APIRequest {
  id: string;
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  timestamp: Date;
  userId?: string;
  clientIP: string;
  userAgent: string;
  service?: string;
}

export interface APIResponse {
  id: string;
  requestId: string;
  status: number;
  headers: Record<string, string>;
  body?: any;
  timestamp: Date;
  duration: number;
  service: string;
  cached: boolean;
  error?: string;
}

// Service Configuration
export interface ServiceConfig {
  name: string;
  version: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  circuitBreakerThreshold: number;
  rateLimitPerSecond: number;
  healthCheckPath: string;
  healthCheckInterval: number;
  enabled: boolean;
  endpoints: {
    [path: string]: {
      method: HttpMethod;
      path: string;
      timeout?: number;
      cacheable?: boolean;
      cacheTTL?: number;
      authRequired?: boolean;
      rateLimitOverride?: number;
    };
  };
}

// Circuit Breaker State
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

// Circuit Breaker
export interface CircuitBreaker {
  service: string;
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime?: Date;
  successCount: number;
  lastSuccessTime?: Date;
  threshold: number;
  timeout: number;
}

// Rate Limiter
export interface RateLimiter {
  service: string;
  requests: number;
  windowStart: Date;
  limit: number;
  windowSize: number;
}

// Cache Entry
export interface CacheEntry {
  key: string;
  value: any;
  timestamp: Date;
  ttl: number;
  service: string;
  endpoint: string;
}

// API Gateway Configuration
export interface APIGatewayConfig {
  port: number;
  timeout: number;
  enableCaching: boolean;
  enableRateLimiting: boolean;
  enableCircuitBreaker: true;
  enableLogging: boolean;
  enableMetrics: boolean;
  cors: {
    enabled: boolean;
    origins: string[];
    methods: HttpMethod[];
    headers: string[];
  };
  authentication: {
    enabled: boolean;
  jwtSecret: string;
  tokenExpiry: number;
  refreshThreshold: number;
  };
  services: ServiceConfig[];
}

// Professional API Gateway Class
export class ProfessionalAPIGateway {
  private static instance: ProfessionalAPIGateway;
  private config: APIGatewayConfig;
  private services: Map<string, ServiceConfig> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private requests: APIRequest[] = [];
  private responses: APIResponse[] = [];
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    cacheHitRate: number;
    rateLimitHits: number;
    circuitBreakerTrips: number;
  };

  constructor(config: APIGatewayConfig) {
    this.config = config;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
    };
    this.initializeServices();
    this.initializeCircuitBreakers();
    this.initializeRateLimiters();
  }

  static getInstance(config?: APIGatewayConfig): ProfessionalAPIGateway {
    if (!ProfessionalAPIGateway.instance) {
      if (!config) {
        throw new Error('API Gateway config required for first initialization');
      }
      ProfessionalAPIGateway.instance = new ProfessionalAPIGateway(config);
    }
    return ProfessionalAPIGateway.instance;
  }

  // Initialize services
  private initializeServices(): void {
    this.config.services.forEach(service => {
      this.services.set(service.name, service);
    });
  }

  // Initialize circuit breakers
  private initializeCircuitBreakers(): void {
    this.config.services.forEach(service => {
      const circuitBreaker: CircuitBreaker = {
        service: service.name,
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        successCount: 0,
        threshold: service.circuitBreakerThreshold,
        timeout: service.timeout,
      };
      this.circuitBreakers.set(service.name, circuitBreaker);
    });
  }

  // Initialize rate limiters
  private initializeRateLimiters(): void {
    this.config.services.forEach(service => {
      const rateLimiter: RateLimiter = {
        service: service.name,
        requests: 0,
        windowStart: new Date(),
        limit: service.rateLimitPerSecond,
        windowSize: 1000, // 1 second window
      };
      this.rateLimiters.set(service.name, rateLimiter);
    });
  }

  // Process request
  async processRequest(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Determine target service
      const service = this.resolveService(request.path);
      if (!service) {
        return this.createErrorResponse(request.id, 404, 'Service not found');
      }

      // Check if service is enabled
      if (!service.enabled) {
        return this.createErrorResponse(request.id, 503, 'Service unavailable');
      }

      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(service.name)!;
      if (circuitBreaker.state === CircuitBreakerState.OPEN) {
        return this.createErrorResponse(request.id, 503, 'Circuit breaker is open');
      }

      // Check rate limiting
      if (this.config.enableRateLimiting && !this.checkRateLimit(service.name)) {
        this.metrics.rateLimitHits++;
        return this.createErrorResponse(request.id, 429, 'Rate limit exceeded');
      }

      // Check cache
      if (this.config.enableCaching) {
        const cachedResponse = this.getFromCache(request);
        if (cachedResponse) {
          return cachedResponse;
        }
      }

      // Check authentication
      if (this.config.authentication.enabled) {
        const authResult = this.authenticate(request);
        if (!authResult.valid) {
          return this.createErrorResponse(request.id, 401, authResult.error || 'Unauthorized');
        }
      }

      // Validate request
      const validationResult = this.validateRequest(request, service);
      if (!validationResult.valid) {
        return this.createErrorResponse(request.id, 400, validationResult.error || 'Bad request');
      }

      // Forward request to service
      const response = await this.forwardRequest(request, service);

      // Update circuit breaker
      this.updateCircuitBreaker(service.name, response.status < 500);

      // Cache response if applicable
      if (this.config.enableCaching && this.isCacheable(request, service)) {
        this.setCache(request, response);
      }

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, response.status < 500, response.cached);

      return response;

    } catch (error) {
      this.metrics.failedRequests++;
      return this.createErrorResponse(
        request.id, 
        500, 
        error instanceof Error ? error.message : 'Internal server error'
      );
    }
  }

  // Resolve service from path
  private resolveService(path: string): ServiceConfig | undefined | null {
    // Simple path-based routing
    if (path.startsWith('/api/users')) return this.services.get('user-service');
    if (path.startsWith('/api/products')) return this.services.get('product-service');
    if (path.startsWith('/api/sales')) return this.services.get('sales-service');
    if (path.startsWith('/api/customers')) return this.services.get('customer-service');
    if (path.startsWith('/api/analytics')) return this.services.get('analytics-service');
    if (path.startsWith('/api/notifications')) return this.services.get('notification-service');
    
    return null;
  }

  // Check rate limit
  private checkRateLimit(serviceName: string): boolean {
    const rateLimiter = this.rateLimiters.get(serviceName)!;
    const now = new Date();

    // Reset window if expired
    if (now.getTime() - rateLimiter.windowStart.getTime() > rateLimiter.windowSize) {
      rateLimiter.requests = 0;
      rateLimiter.windowStart = now;
    }

    // Check limit
    if (rateLimiter.requests >= rateLimiter.limit) {
      return false;
    }

    rateLimiter.requests++;
    return true;
  }

  // Get from cache
  private getFromCache(request: APIRequest): APIResponse | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return {
      ...entry.value,
      cached: true,
    };
  }

  // Set cache
  private setCache(request: APIRequest, response: APIResponse): void {
    const key = this.generateCacheKey(request);
    const service = this.resolveService(request.path);
    
    if (!service) return;

    const endpoint = service.endpoints[request.path];
    const ttl = endpoint?.cacheTTL || 300000; // 5 minutes default

    const entry: CacheEntry = {
      key,
      value: response,
      timestamp: new Date(),
      ttl,
      service: service.name,
      endpoint: request.path,
    };

    this.cache.set(key, entry);

    // Clean up old cache entries
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  // Generate cache key
  private generateCacheKey(request: APIRequest): string {
    const query = new URLSearchParams(request.query).toString();
    return `${request.method}:${request.path}:${query}:${JSON.stringify(request.body || {})}`;
  }

  // Check if request is cacheable
  private isCacheable(request: APIRequest, service: ServiceConfig): boolean {
    if (request.method !== HttpMethod.GET) return false;
    
    const endpoint = service.endpoints[request.path];
    return endpoint?.cacheable === true;
  }

  // Clean up cache
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Authenticate request
  private authenticate(request: APIRequest): { valid: boolean; error?: string } {
    // Simplified authentication - in reality, you'd validate JWT tokens
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      return { valid: false, error: 'No authorization header' };
    }

    // Mock JWT validation
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // In reality, you'd verify the JWT signature and expiration
      return { valid: token.length > 10 };
    }

    return { valid: false, error: 'Invalid authorization format' };
  }

  // Validate request
  private validateRequest(request: APIRequest, service: ServiceConfig): { valid: boolean; error?: string } {
    const endpoint = service.endpoints[request.path];
    
    if (!endpoint) {
      return { valid: false, error: 'Endpoint not found' };
    }

    if (endpoint.method !== request.method) {
      return { valid: false, error: 'Method not allowed' };
    }

    if (endpoint.authRequired && !request.headers['authorization']) {
      return { valid: false, error: 'Authentication required' };
    }

    return { valid: true };
  }

  // Forward request to service
  private async forwardRequest(request: APIRequest, service: ServiceConfig): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      // Simulate service call
      await this.simulateServiceCall(service);
      
      // Mock response based on path
      const mockData = this.generateMockResponse(request);
      
      const response: APIResponse = {
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: request.id,
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-service': service.name,
          'x-response-time': `${Date.now() - startTime}ms`,
        },
        body: mockData,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        service: service.name,
        cached: false,
      };

      return response;

    } catch (error) {
      return this.createErrorResponse(
        request.id,
        500,
        error instanceof Error ? error.message : 'Service error'
      );
    }
  }

  // Simulate service call
  private async simulateServiceCall(service: ServiceConfig): Promise<void> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error('Service temporarily unavailable');
    }
  }

  // Generate mock response
  private generateMockResponse(request: APIRequest): any {
    const path = request.path;
    const method = request.method;

    if (path.startsWith('/api/users')) {
      if (method === HttpMethod.GET) {
        return {
          users: [
            { id: '1', name: 'John Doe', email: 'john@example.com' },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
          ],
          total: 2,
          page: 1,
        };
      } else if (method === HttpMethod.POST) {
        return { id: 'new-user-id', created: true };
      }
    }

    if (path.startsWith('/api/products')) {
      if (method === HttpMethod.GET) {
        return {
          products: [
            { id: '1', name: '15G PREFORMA', price: 12500, warehouse: 'preform' },
            { id: '2', name: 'QOPQOQ 28MM', price: 8500, warehouse: 'krishka' },
          ],
          total: 2,
        };
      }
    }

    if (path.startsWith('/api/sales')) {
      if (method === HttpMethod.GET) {
        return {
          sales: [
            { id: '1', customer_id: '1', total: 12500000, status: 'completed' },
            { id: '2', customer_id: '2', total: 8500000, status: 'pending' },
          ],
          total: 2,
        };
      }
    }

    if (path.startsWith('/api/customers')) {
      if (method === HttpMethod.GET) {
        return {
          customers: [
            { id: '1', name: 'Ali Valiyev', phone: '+998901234567', debt: 500000 },
            { id: '2', name: 'Bekzod Karimov', phone: '+998907654321', debt: 250000 },
          ],
          total: 2,
        };
      }
    }

    if (path.startsWith('/api/analytics')) {
      return {
        revenue: 25000000,
        expenses: 15000000,
        profit: 10000000,
        growth: 12.5,
      };
    }

    return { message: 'Request processed successfully' };
  }

  // Create error response
  private createErrorResponse(requestId: string, status: number, message: string): APIResponse {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId,
      status,
      headers: {
        'content-type': 'application/json',
        'x-error': 'true',
      },
      body: {
        error: true,
        message,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      duration: 0,
      service: 'gateway',
      cached: false,
      error: message,
    };
  }

  // Update circuit breaker
  private updateCircuitBreaker(serviceName: string, success: boolean): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName)!;
    const now = new Date();

    if (success) {
      circuitBreaker.successCount++;
      circuitBreaker.lastSuccessTime = now;
      
      // Reset failures on success
      if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
        circuitBreaker.state = CircuitBreakerState.CLOSED;
        circuitBreaker.failures = 0;
      }
    } else {
      circuitBreaker.failures++;
      circuitBreaker.lastFailureTime = now;

      // Trip circuit breaker if threshold reached
      if (circuitBreaker.failures >= circuitBreaker.threshold) {
        circuitBreaker.state = CircuitBreakerState.OPEN;
        this.metrics.circuitBreakerTrips++;
      }
    }

    // Reset to half-open after timeout
    if (circuitBreaker.state === CircuitBreakerState.OPEN && 
        circuitBreaker.lastFailureTime &&
        now.getTime() - circuitBreaker.lastFailureTime.getTime() > circuitBreaker.timeout) {
      circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
      circuitBreaker.successCount = 0;
    }
  }

  // Update metrics
  private updateMetrics(duration: number, success: boolean, cached: boolean): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) / this.metrics.totalRequests;

    // Update cache hit rate
    const cacheHits = Array.from(this.cache.values()).length;
    this.metrics.cacheHitRate = this.metrics.totalRequests > 0 ? cacheHits / this.metrics.totalRequests : 0;
  }

  // Get metrics
  getMetrics() {
    return { ...this.metrics };
  }

  // Get service status
  getServiceStatus() {
    return Array.from(this.services.values()).map(service => {
      const circuitBreaker = this.circuitBreakers.get(service.name)!;
      const rateLimiter = this.rateLimiters.get(service.name)!;
      
      return {
        name: service.name,
        version: service.version,
        enabled: service.enabled,
        baseUrl: service.baseUrl,
        circuitBreaker: {
          state: circuitBreaker.state,
          failures: circuitBreaker.failures,
          successCount: circuitBreaker.successCount,
          threshold: circuitBreaker.threshold,
        },
        rateLimiter: {
          requests: rateLimiter.requests,
          limit: rateLimiter.limit,
          utilization: (rateLimiter.requests / rateLimiter.limit) * 100,
        },
      };
    });
  }

  // Get cache statistics
  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + JSON.stringify(entry.value).length, 0);
    
    return {
      entries: entries.length,
      totalSize,
      averageTTL: entries.reduce((sum, entry) => sum + entry.ttl, 0) / entries.length,
      hitRate: this.metrics.cacheHitRate,
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Reset circuit breaker
  resetCircuitBreaker(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.state = CircuitBreakerState.CLOSED;
      circuitBreaker.failures = 0;
      circuitBreaker.successCount = 0;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    gateway: 'healthy' | 'unhealthy';
    services: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    }>;
  }> {
    const serviceStatuses: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    }> = [];
    
    for (const service of this.services.values()) {
      try {
        const startTime = Date.now();
        await this.simulateServiceCall(service);
        const responseTime = Date.now() - startTime;
        
        serviceStatuses.push({
          name: service.name,
          status: 'healthy',
          responseTime,
        });
      } catch (error) {
        serviceStatuses.push({
          name: service.name,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const gatewayHealthy = serviceStatuses.some(s => s.status === 'healthy');

    return {
      gateway: gatewayHealthy ? 'healthy' : 'unhealthy',
      services: serviceStatuses,
    };
  }
}

// Create singleton instance
export const apiGateway = ProfessionalAPIGateway.getInstance;

// Convenience functions
export const processAPIRequest = async (request: APIRequest) => {
  const gateway = ProfessionalAPIGateway.getInstance();
  return await gateway.processRequest(request);
};

export const getGatewayMetrics = () => {
  const gateway = ProfessionalAPIGateway.getInstance();
  return gateway.getMetrics();
};

export default ProfessionalAPIGateway;
