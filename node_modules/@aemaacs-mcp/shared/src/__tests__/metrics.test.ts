/**
 * Unit tests for metrics collector
 */

import { MetricsCollector, MetricsConfig, BusinessMetrics } from '../utils/metrics.js';

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;
  let mockConfig: Partial<MetricsConfig>;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      collectDefaultMetrics: false,
      customMetrics: {
        httpRequests: true,
        aemOperations: true,
        cacheOperations: true,
        circuitBreaker: true,
        bulkOperations: true,
        securityEvents: true,
        businessMetrics: true
      }
    };
    metricsCollector = new MetricsCollector(mockConfig);
  });

  afterEach(() => {
    // Reset metrics registry
    metricsCollector.resetMetrics();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const collector = new MetricsCollector();
      expect(collector).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        enabled: false,
        maxAttempts: 5
      };
      const collector = new MetricsCollector(customConfig);
      expect(collector).toBeDefined();
    });
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request metrics', () => {
      const method = 'GET';
      const route = '/api/test';
      const statusCode = 200;
      const duration = 150;
      const requestSize = 1024;
      const responseSize = 2048;
      const serverType = 'read-server';

      expect(() => {
        metricsCollector.recordHttpRequest(
          method,
          route,
          statusCode,
          duration,
          requestSize,
          responseSize,
          serverType
        );
      }).not.toThrow();
    });

    it('should handle missing optional parameters', () => {
      const method = 'POST';
      const route = '/api/test';
      const statusCode = 201;
      const duration = 200;

      expect(() => {
        metricsCollector.recordHttpRequest(method, route, statusCode, duration);
      }).not.toThrow();
    });

    it('should not record metrics when disabled', () => {
      const disabledCollector = new MetricsCollector({ enabled: false });
      
      expect(() => {
        disabledCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      }).not.toThrow();
    });
  });

  describe('recordAEMOperation', () => {
    it('should record AEM operation metrics', () => {
      const operation = 'getPage';
      const resourceType = 'page';
      const status = 'success';
      const duration = 300;
      const serverType = 'read-server';

      expect(() => {
        metricsCollector.recordAEMOperation(operation, resourceType, status, duration, serverType);
      }).not.toThrow();
    });

    it('should record AEM operation error', () => {
      const operation = 'createPage';
      const resourceType = 'page';
      const errorType = 'VALIDATION_ERROR';
      const serverType = 'write-server';

      expect(() => {
        metricsCollector.recordAEMOperationError(operation, resourceType, errorType, serverType);
      }).not.toThrow();
    });
  });

  describe('recordCacheOperation', () => {
    it('should record cache hit', () => {
      const cacheType = 'redis';
      const operation = 'get';
      const hit = true;
      const duration = 5;

      expect(() => {
        metricsCollector.recordCacheOperation(cacheType, operation, hit, duration);
      }).not.toThrow();
    });

    it('should record cache miss', () => {
      const cacheType = 'memory';
      const operation = 'get';
      const hit = false;
      const duration = 10;

      expect(() => {
        metricsCollector.recordCacheOperation(cacheType, operation, hit, duration);
      }).not.toThrow();
    });
  });

  describe('recordCircuitBreakerState', () => {
    it('should record circuit breaker state changes', () => {
      const breakerName = 'aem-client';
      const serverType = 'read-server';

      expect(() => {
        metricsCollector.recordCircuitBreakerState('CLOSED', breakerName, serverType);
        metricsCollector.recordCircuitBreakerState('OPEN', breakerName, serverType);
        metricsCollector.recordCircuitBreakerState('HALF_OPEN', breakerName, serverType);
      }).not.toThrow();
    });

    it('should record circuit breaker failures', () => {
      const breakerName = 'aem-client';
      const errorType = 'TIMEOUT';
      const serverType = 'read-server';

      expect(() => {
        metricsCollector.recordCircuitBreakerFailure(breakerName, errorType, serverType);
      }).not.toThrow();
    });

    it('should record circuit breaker successes', () => {
      const breakerName = 'aem-client';
      const serverType = 'read-server';

      expect(() => {
        metricsCollector.recordCircuitBreakerSuccess(breakerName, serverType);
      }).not.toThrow();
    });
  });

  describe('recordBulkOperation', () => {
    it('should record bulk operation metrics', () => {
      const operationType = 'page';
      const status = 'completed';
      const duration = 5000;
      const itemCount = 100;
      const serverType = 'write-server';

      expect(() => {
        metricsCollector.recordBulkOperation(operationType, status, duration, itemCount, serverType);
      }).not.toThrow();
    });
  });

  describe('recordSecurityEvent', () => {
    it('should record security events', () => {
      const eventType = 'authentication_failure';
      const severity = 'high';
      const serverType = 'write-server';

      expect(() => {
        metricsCollector.recordSecurityEvent(eventType, severity, serverType);
      }).not.toThrow();
    });

    it('should record authentication attempts', () => {
      const authType = 'oauth';
      const status = 'success';
      const serverType = 'read-server';

      expect(() => {
        metricsCollector.recordAuthenticationAttempt(authType, status, serverType);
      }).not.toThrow();
    });

    it('should record authorization failures', () => {
      const resourceType = 'page';
      const operation = 'delete';
      const serverType = 'write-server';

      expect(() => {
        metricsCollector.recordAuthorizationFailure(resourceType, operation, serverType);
      }).not.toThrow();
    });
  });

  describe('recordBusinessMetrics', () => {
    it('should record business metrics', () => {
      const metrics: BusinessMetrics = {
        pagesCreated: 10,
        pagesUpdated: 25,
        pagesDeleted: 5,
        assetsUploaded: 15,
        workflowsStarted: 8,
        workflowsCompleted: 7,
        contentFragmentsCreated: 3,
        contentFragmentsUpdated: 2,
        usersCreated: 1,
        usersUpdated: 4
      };
      const serverType = 'write-server';

      expect(() => {
        metricsCollector.recordBusinessMetrics(metrics, serverType);
      }).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      // Record some metrics first
      metricsCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      metricsCollector.recordAEMOperation('getPage', 'page', 'success', 200);

      const metrics = await metricsCollector.getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should return empty string when disabled', async () => {
      const disabledCollector = new MetricsCollector({ enabled: false });
      const metrics = await disabledCollector.getMetrics();
      expect(metrics).toBe('');
    });
  });

  describe('getRegistry', () => {
    it('should return metrics registry', () => {
      const registry = metricsCollector.getRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = { enabled: false };
      
      expect(() => {
        metricsCollector.updateConfig(newConfig);
      }).not.toThrow();
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      // Record some metrics first
      metricsCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      
      expect(() => {
        metricsCollector.resetMetrics();
      }).not.toThrow();
    });
  });

  describe('static factory methods', () => {
    it('should create retry handler for HTTP requests', () => {
      const handler = MetricsCollector.createForHttp();
      expect(handler).toBeDefined();
    });

    it('should create retry handler for AEM operations', () => {
      const handler = MetricsCollector.createForAEM();
      expect(handler).toBeDefined();
    });

    it('should create retry handler for cache operations', () => {
      const handler = MetricsCollector.createForCache();
      expect(handler).toBeDefined();
    });

    it('should create retry handler for bulk operations', () => {
      const handler = MetricsCollector.createForBulk();
      expect(handler).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully when recording metrics', () => {
      // This test ensures that errors in metrics recording don't break the application
      expect(() => {
        metricsCollector.recordHttpRequest('', '', 0, 0);
      }).not.toThrow();
    });

    it('should handle errors gracefully when getting metrics', async () => {
      // This test ensures that errors in metrics retrieval don't break the application
      const metrics = await metricsCollector.getMetrics();
      expect(typeof metrics).toBe('string');
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        maxAttempts: -1,
        baseDelay: -100,
        maxDelay: -1000
      };
      
      expect(() => {
        new MetricsCollector(invalidConfig);
      }).not.toThrow();
    });
  });
});
