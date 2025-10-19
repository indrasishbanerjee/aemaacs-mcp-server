/**
 * Unit tests for health check service
 */

import { HealthCheckService, HealthCheckConfig } from '../utils/health-check.js';
import { AEMHttpClient } from '../client/aem-http-client.js';
import { CacheManager } from '../utils/cache.js';
import { MetricsCollector } from '../utils/metrics.js';

// Mock dependencies
jest.mock('../client/aem-http-client.js');
jest.mock('../utils/cache.js');
jest.mock('../utils/metrics.js');

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;
  let mockConfig: HealthCheckConfig;
  let mockClient: jest.Mocked<AEMHttpClient>;
  let mockCacheManager: jest.Mocked<CacheManager>;
  let mockMetricsCollector: jest.Mocked<MetricsCollector>;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      check_interval: 30000,
      timeout: 5000,
      aem_endpoint: 'https://example.aem.com',
      cache_endpoint: 'redis://localhost:6379',
      metrics_endpoint: 'http://localhost:9090',
      performance_thresholds: {
        memory_usage_mb: 512,
        response_time_ms: 1000,
        error_rate_percent: 5,
        cache_hit_rate_percent: 80
      }
    };

    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    } as any;

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      getStats: jest.fn(),
      invalidatePattern: jest.fn(),
      disconnect: jest.fn()
    } as any;

    mockMetricsCollector = {
      getMetrics: jest.fn()
    } as any;

    healthCheckService = new HealthCheckService(
      mockConfig,
      mockClient,
      mockCacheManager,
      mockMetricsCollector
    );
  });

  describe('constructor', () => {
    it('should initialize with required parameters', () => {
      expect(healthCheckService).toBeDefined();
    });

    it('should initialize without optional parameters', () => {
      const service = new HealthCheckService(mockConfig, mockClient);
      expect(service).toBeDefined();
    });
  });

  describe('performHealthCheck', () => {
    it('should perform comprehensive health check', async () => {
      // Mock successful responses
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      const result = await healthCheckService.performHealthCheck();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.components).toBeDefined();
      expect(result.dependencies).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.business_metrics).toBeDefined();
    });

    it('should handle AEM connectivity failure', async () => {
      // Mock AEM failure
      mockClient.get.mockRejectedValue(new Error('Connection failed'));

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      const result = await healthCheckService.performHealthCheck();

      expect(result).toBeDefined();
      expect(result.components.aem.status).toBe('unhealthy');
      expect(result.dependencies.aem_connectivity.status).toBe('unhealthy');
    });

    it('should handle cache failure', async () => {
      // Mock successful AEM response
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      // Mock cache failure
      mockCacheManager.set.mockRejectedValue(new Error('Cache connection failed'));

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      const result = await healthCheckService.performHealthCheck();

      expect(result).toBeDefined();
      expect(result.components.cache.status).toBe('unhealthy');
      expect(result.dependencies.redis_cache?.status).toBe('unhealthy');
    });

    it('should handle metrics failure', async () => {
      // Mock successful AEM response
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      // Mock successful cache response
      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      // Mock metrics failure
      mockMetricsCollector.getMetrics.mockRejectedValue(new Error('Metrics collection failed'));

      const result = await healthCheckService.performHealthCheck();

      expect(result).toBeDefined();
      expect(result.components.metrics.status).toBe('unhealthy');
      expect(result.dependencies.prometheus_metrics?.status).toBe('unhealthy');
    });

    it('should determine overall status correctly', async () => {
      // Mock all successful responses
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      const result = await healthCheckService.performHealthCheck();

      expect(result.status).toBe('healthy');
    });

    it('should determine degraded status when some components fail', async () => {
      // Mock AEM failure but successful cache and metrics
      mockClient.get.mockRejectedValue(new Error('Connection failed'));

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      const result = await healthCheckService.performHealthCheck();

      expect(result.status).toBe('degraded');
    });
  });

  describe('getLastHealthCheck', () => {
    it('should return undefined when no health check performed', () => {
      const result = healthCheckService.getLastHealthCheck();
      expect(result).toBeUndefined();
    });

    it('should return last health check result', async () => {
      // Mock successful responses
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      await healthCheckService.performHealthCheck();
      const result = healthCheckService.getLastHealthCheck();

      expect(result).toBeDefined();
      expect(result?.status).toBeDefined();
      expect(result?.timestamp).toBeDefined();
    });
  });

  describe('getHealthSummary', () => {
    it('should return unknown status when no health check performed', () => {
      const result = healthCheckService.getHealthSummary();
      expect(result.status).toBe('unknown');
      expect(result.message).toBe('No health check performed yet');
    });

    it('should return health summary after health check', async () => {
      // Mock successful responses
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      await healthCheckService.performHealthCheck();
      const result = healthCheckService.getHealthSummary();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('All systems operational');
    });
  });

  describe('performance metrics', () => {
    it('should calculate performance metrics correctly', async () => {
      // Mock successful responses
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      const result = await healthCheckService.performHealthCheck();

      expect(result.performance).toBeDefined();
      expect(result.performance.memory_usage).toBeDefined();
      expect(result.performance.response_time).toBeDefined();
      expect(result.performance.throughput).toBeDefined();
      expect(result.performance.memory_usage.current).toBeGreaterThanOrEqual(0);
      expect(result.performance.response_time.current).toBeGreaterThanOrEqual(0);
      expect(result.performance.throughput.current).toBeGreaterThanOrEqual(0);
    });
  });

  describe('business metrics', () => {
    it('should calculate business metrics correctly', async () => {
      // Mock successful responses
      mockClient.get.mockResolvedValue({
        success: true,
        data: {},
        metadata: { statusCode: 200, responseTime: 100 }
      });

      mockCacheManager.set.mockResolvedValue();
      mockCacheManager.get.mockResolvedValue({ test: true, timestamp: expect.any(String) });
      mockCacheManager.delete.mockResolvedValue(true);

      mockMetricsCollector.getMetrics.mockResolvedValue('test metrics');

      const result = await healthCheckService.performHealthCheck();

      expect(result.business_metrics).toBeDefined();
      expect(result.business_metrics.active_connections).toBeDefined();
      expect(result.business_metrics.total_requests).toBeDefined();
      expect(result.business_metrics.error_rate).toBeDefined();
      expect(result.business_metrics.cache_hit_rate).toBeDefined();
      expect(result.business_metrics.total_requests).toBeGreaterThanOrEqual(0);
      expect(result.business_metrics.error_rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully during health check', async () => {
      // Mock all failures
      mockClient.get.mockRejectedValue(new Error('AEM connection failed'));
      mockCacheManager.set.mockRejectedValue(new Error('Cache connection failed'));
      mockMetricsCollector.getMetrics.mockRejectedValue(new Error('Metrics collection failed'));

      const result = await healthCheckService.performHealthCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('unhealthy');
      expect(result.components).toBeDefined();
      expect(result.dependencies).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      // Mock timeout
      mockClient.get.mockRejectedValue(new Error('Request timeout'));

      const result = await healthCheckService.performHealthCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('unhealthy');
    });
  });

  describe('configuration', () => {
    it('should work with minimal configuration', () => {
      const minimalConfig: HealthCheckConfig = {
        enabled: true,
        check_interval: 30000,
        timeout: 5000,
        aem_endpoint: 'https://example.aem.com',
        performance_thresholds: {
          memory_usage_mb: 512,
          response_time_ms: 1000,
          error_rate_percent: 5,
          cache_hit_rate_percent: 80
        }
      };

      const service = new HealthCheckService(minimalConfig, mockClient);
      expect(service).toBeDefined();
    });
  });
});
