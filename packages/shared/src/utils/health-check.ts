/**
 * Comprehensive health check system for AEMaaCS MCP servers
 */

import { Logger } from './logger.js';
import { AEMHttpClient } from '../client/aem-http-client.js';
import { ConfigManager } from '../config/index.js';
import { CacheManager } from './cache.js';
import { MetricsCollector } from './metrics.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  components: {
    server: ComponentHealth;
    aem: ComponentHealth;
    cache: ComponentHealth;
    database?: ComponentHealth;
    external_services?: ComponentHealth;
    security: ComponentHealth;
    metrics: ComponentHealth;
  };
  dependencies: {
    aem_connectivity: DependencyHealth;
    redis_cache?: DependencyHealth;
    prometheus_metrics?: DependencyHealth;
  };
  performance: {
    memory_usage: PerformanceMetric;
    cpu_usage?: PerformanceMetric;
    response_time: PerformanceMetric;
    throughput: PerformanceMetric;
  };
  business_metrics: {
    active_connections: number;
    total_requests: number;
    error_rate: number;
    cache_hit_rate: number;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
  last_check: string;
  response_time_ms?: number;
}

export interface DependencyHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  response_time_ms?: number;
  version?: string;
  last_check: string;
}

export interface PerformanceMetric {
  current: number;
  average: number;
  peak: number;
  threshold: number;
  unit: string;
}

export interface HealthCheckConfig {
  enabled: boolean;
  check_interval: number;
  timeout: number;
  aem_endpoint: string;
  cache_endpoint?: string;
  metrics_endpoint?: string;
  performance_thresholds: {
    memory_usage_mb: number;
    response_time_ms: number;
    error_rate_percent: number;
    cache_hit_rate_percent: number;
  };
}

export class HealthCheckService {
  private logger: Logger;
  private config: HealthCheckConfig;
  private client: AEMHttpClient;
  private cacheManager?: CacheManager;
  private metricsCollector?: MetricsCollector;
  private startTime: Date;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];
  private lastHealthCheck?: HealthCheckResult;

  constructor(
    config: HealthCheckConfig,
    client: AEMHttpClient,
    cacheManager?: CacheManager,
    metricsCollector?: MetricsCollector
  ) {
    this.logger = Logger.getInstance();
    this.config = config;
    this.client = client;
    this.cacheManager = cacheManager;
    this.metricsCollector = metricsCollector;
    this.startTime = new Date();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    this.requestCount++;

    try {
      // Run all health checks in parallel
      const [
        serverHealth,
        aemHealth,
        cacheHealth,
        securityHealth,
        metricsHealth,
        aemDependency,
        cacheDependency,
        metricsDependency
      ] = await Promise.allSettled([
        this.checkServerHealth(),
        this.checkAEMHealth(),
        this.checkCacheHealth(),
        this.checkSecurityHealth(),
        this.checkMetricsHealth(),
        this.checkAEMDependency(),
        this.checkCacheDependency(),
        this.checkMetricsDependency()
      ]);

      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      
      // Keep only last 100 response times for average calculation
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-100);
      }

      // Build health check result
      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Date.now() - this.startTime.getTime(),
        components: {
          server: this.getSettledResult(serverHealth),
          aem: this.getSettledResult(aemHealth),
          cache: this.getSettledResult(cacheHealth),
          security: this.getSettledResult(securityHealth),
          metrics: this.getSettledResult(metricsHealth)
        },
        dependencies: {
          aem_connectivity: this.getSettledResult(aemDependency),
          redis_cache: this.getSettledResult(cacheDependency),
          prometheus_metrics: this.getSettledResult(metricsDependency)
        },
        performance: this.getPerformanceMetrics(),
        business_metrics: this.getBusinessMetrics()
      };

      // Determine overall status
      result.status = this.determineOverallStatus(result);

      this.lastHealthCheck = result;
      return result;

    } catch (error) {
      this.errorCount++;
      this.logger.error('Health check failed', error as Error);
      
      const result: HealthCheckResult = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Date.now() - this.startTime.getTime(),
        components: {
          server: { status: 'unhealthy', message: 'Health check failed', last_check: new Date().toISOString() },
          aem: { status: 'unhealthy', message: 'Health check failed', last_check: new Date().toISOString() },
          cache: { listeners: 'unhealthy', message: 'Health check failed', last_check: new Date().toISOString() },
          security: { status: 'unhealthy', message: 'Health check failed', last_check: new Date().toISOString() },
          metrics: { status: 'unhealthy', message: 'Health check failed', last_check: new Date().toISOString() }
        },
        dependencies: {
          aem_connectivity: { status: 'unhealthy', message: 'Health check failed', last_check: new Date().toISOString() }
        },
        performance: this.getPerformanceMetrics(),
        business_metrics: this.getBusinessMetrics()
      };

      this.lastHealthCheck = result;
      return result;
    }
  }

  /**
   * Check server health
   */
  private async checkServerHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
      
      const status = memoryUsageMB < this.config.performance_thresholds.memory_usage_mb ? 'healthy' : 'degraded';
      
      return {
        status,
        message: status === 'healthy' ? 'Server is running normally' : 'High memory usage detected',
        details: {
          memory_usage_mb: memoryUsageMB,
          memory_limit_mb: this.config.performance_thresholds.memory_usage_mb,
          heap_total_mb: memoryUsage.heapTotal / 1024 / 1024,
          heap_used_mb: memoryUsage.heapUsed / 1024 / 1024,
          external_mb: memoryUsage.external / 1024 / 1024,
          rss_mb: memoryUsage.rss / 1024 / 1024
        },
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to check server health',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check AEM health
   */
  private async checkAEMHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic AEM connectivity
      const response = await this.client.get('/system/console/bundles.json', {
        timeout: 5000,
        context: {
          operation: 'healthCheck',
          resource: '/system/console/bundles.json'
        }
      });

      if (response.success) {
        return {
          status: 'healthy',
          message: 'AEM is accessible and responding',
          details: {
            status_code: response.metadata?.statusCode,
            response_time_ms: response.metadata?.responseTime
          },
          last_check: new Date().toISOString(),
          response_time_ms: Date.now() - startTime
        };
      } else {
        return {
          status: 'degraded',
          message: 'AEM responded with error',
          details: {
            status_code: response.metadata?.statusCode,
            error: response.error?.message
          },
          last_check: new Date().toISOString(),
          response_time_ms: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'AEM is not accessible',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    if (!this.cacheManager) {
      return {
        status: 'healthy',
        message: 'Cache not configured',
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }

    try {
      // Test cache operations
      const testKey = 'health_check_' + Date.now();
      const testValue = { test: true, timestamp: new Date().toISOString() };
      
      await this.cacheManager.set(testKey, testValue, 10);
      const retrieved = await this.cacheManager.get(testKey);
      await this.cacheManager.delete(testKey);
      
      if (retrieved && JSON.stringify(retrieved) === JSON.stringify(testValue)) {
        return {
          status: 'healthy',
          message: 'Cache is working correctly',
          details: {
            type: this.cacheManager.constructor.name,
            test_passed: true
          },
          last_check: new Date().toISOString(),
          response_time_ms: Date.now() - startTime
        };
      } else {
        return {
          status: 'degraded',
          message: 'Cache test failed',
          details: {
            type: this.cacheManager.constructor.name,
            test_passed: false
          },
          last_check: new Date().toISOString(),
          response_time_ms: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Cache is not working',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          type: this.cacheManager.constructor.name
        },
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check security health
   */
  private async checkSecurityHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const config = ConfigManager.getInstance();
      const securityConfig = config.getConfig().security;
      
      const securityFeatures = {
        input_validation: securityConfig.enableInputValidation,
        audit_logging: securityConfig.enableAuditLogging,
        api_key_auth: securityConfig.enableApiKeyAuth,
        ip_allowlist: securityConfig.enableIPAllowlist
      };

      const enabledFeatures = Object.values(securityFeatures).filter(Boolean).length;
      const totalFeatures = Object.keys(securityFeatures).length;
      
      const status = enabledFeatures >= totalFeatures * 0.5 ? 'healthy' : 'degraded';
      
      return {
        status,
        message: `${enabledFeatures}/${totalFeatures} security features enabled`,
        details: securityFeatures,
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to check security configuration',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check metrics health
   */
  private async checkMetricsHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    if (!this.metricsCollector) {
      return {
        status: 'healthy',
        message: 'Metrics not configured',
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }

    try {
      // Test metrics collection
      const metrics = await this.metricsCollector.getMetrics();
      
      if (metrics && metrics.length > 0) {
        return {
          status: 'healthy',
          message: 'Metrics collection is working',
          details: {
            metrics_length: metrics.length,
            registry_available: true
          },
          last_check: new Date().toISOString(),
          response_time_ms: Date.now() - startTime
        };
      } else {
        return {
          status: 'degraded',
          message: 'Metrics collection returned empty result',
          details: {
            metrics_length: 0,
            registry_available: true
          },
          last_check: new Date().toISOString(),
          response_time_ms: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Metrics collection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check AEM dependency
   */
  private async checkAEMDependency(): Promise<DependencyHealth> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.get('/system/console/bundles.json', {
        timeout: 5000,
        context: {
          operation: 'dependencyCheck',
          resource: '/system/console/bundles.json'
        }
      });

      if (response.success) {
        return {
          status: 'healthy',
          message: 'AEM dependency is available',
          response_time_ms: Date.now() - startTime,
          last_check: new Date().toISOString()
        };
      } else {
        return {
          status: 'degraded',
          message: 'AEM dependency responded with error',
          response_time_ms: Date.now() - startTime,
          last_check: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'AEM dependency is not available',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString()
      };
    }
  }

  /**
   * Check cache dependency
   */
  private async checkCacheDependency(): Promise<DependencyHealth | undefined> {
    if (!this.cacheManager) {
      return undefined;
    }

    const startTime = Date.now();
    
    try {
      // Test cache connection
      const testKey = 'dependency_check_' + Date.now();
      await this.cacheManager.set(testKey, 'test', 5);
      await this.cacheManager.delete(testKey);
      
      return {
        status: 'healthy',
        message: 'Cache dependency is available',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Cache dependency is not available',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString()
      };
    }
  }

  /**
   * Check metrics dependency
   */
  private async checkMetricsDependency(): Promise<DependencyHealth | undefined> {
    if (!this.metricsCollector) {
      return undefined;
    }

    const startTime = Date.now();
    
    try {
      const metrics = await this.metricsCollector.getMetrics();
      
      return {
        status: 'healthy',
        message: 'Metrics dependency is available',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Metrics dependency is not available',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString()
      };
    }
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): HealthCheckResult['performance'] {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    const peakResponseTime = this.responseTimes.length > 0 
      ? Math.max(...this.responseTimes) 
      : 0;

    return {
      memory_usage: {
        current: memoryUsageMB,
        average: memoryUsageMB,
        peak: memoryUsageMB,
        threshold: this.config.performance_thresholds.memory_usage_mb,
        unit: 'MB'
      },
      response_time: {
        current: averageResponseTime,
        average: averageResponseTime,
        peak: peakResponseTime,
        threshold: this.config.performance_thresholds.response_time_ms,
        unit: 'ms'
      },
      throughput: {
        current: this.requestCount,
        average: this.requestCount,
        peak: this.requestCount,
        threshold: 1000,
        unit: 'requests'
      }
    };
  }

  /**
   * Get business metrics
   */
  private getBusinessMetrics(): HealthCheckResult['business_metrics'] {
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    return {
      active_connections: 1, // Single instance
      total_requests: this.requestCount,
      error_rate: errorRate,
      cache_hit_rate: 0 // Would need cache stats
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(result: HealthCheckResult): 'healthy' | 'degraded' | 'unhealthy' {
    const componentStatuses = Object.values(result.components).map(c => c.status);
    const dependencyStatuses = Object.values(result.dependencies).map(d => d?.status).filter(Boolean);
    
    const allStatuses = [...componentStatuses, ...dependencyStatuses];
    
    if (allStatuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (allStatuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Get settled result from Promise.allSettled
   */
  private getSettledResult<T>(result: PromiseSettledResult<T>): T {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        last_check: new Date().toISOString()
      } as T;
    }
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Get health check summary
   */
  getHealthSummary(): { status: string; message: string; timestamp: string } {
    if (!this.lastHealthCheck) {
      return {
        status: 'unknown',
        message: 'No health check performed yet',
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: this.lastHealthCheck.status,
      message: this.getStatusMessage(this.lastHealthCheck.status),
      timestamp: this.lastHealthCheck.timestamp
    };
  }

  /**
   * Get status message
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'healthy':
        return 'All systems operational';
      case 'degraded':
        return 'Some components are experiencing issues';
      case 'unhealthy':
        return 'Critical components are not functioning properly';
      default:
        return 'Unknown status';
    }
  }
}
