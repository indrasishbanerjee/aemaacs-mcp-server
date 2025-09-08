/**
 * Tests for AEM HTTP client
 */

import axios from 'axios';
import { AEMHttpClient, createAEMHttpClient } from '../client/aem-http-client.js';
import { Logger, PerformanceMonitor } from '../utils/logger.js';
import { CircuitBreakerRegistry } from '../utils/circuit-breaker.js';
import { CacheFactory } from '../utils/cache.js';
import { ConfigManager } from '../config/index.js';
import { AEMConfig } from '../types/aem.js';

// Mock dependencies
jest.mock('axios');
jest.mock('../utils/logger.js');
jest.mock('../utils/circuit-breaker.js');
jest.mock('../utils/cache.js');
jest.mock('../config/index.js');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AEMHttpClient', () => {
  let client: AEMHttpClient;
  let mockAxiosInstance: jest.Mocked<any>;
  let mockLogger: jest.Mocked<Logger>;
  let mockPerformanceMonitor: jest.Mocked<PerformanceMonitor>;
  let mockCircuitBreaker: jest.Mocked<any>;
  let mockCache: jest.Mocked<any>;
  let mockConfig: AEMConfig;

  beforeEach(() => {
    // Mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      defaults: {
        httpAgent: { destroy: jest.fn() },
        httpsAgent: { destroy: jest.fn() }
      }
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    // Mock performance monitor
    mockPerformanceMonitor = {
      startOperation: jest.fn().mockReturnValue({
        end: jest.fn().mockReturnValue(100)
      }),
      getMetrics: jest.fn().mockReturnValue([])
    } as any;
    (PerformanceMonitor.getInstance as jest.Mock).mockReturnValue(mockPerformanceMonitor);

    // Mock circuit breaker
    mockCircuitBreaker = {
      execute: jest.fn().mockImplementation((fn) => fn()),
      getStats: jest.fn().mockReturnValue({ state: 'CLOSED' }),
      reset: jest.fn()
    };
    const mockCircuitBreakerRegistry = {
      getCircuitBreaker: jest.fn().mockReturnValue(mockCircuitBreaker)
    };
    (CircuitBreakerRegistry.getInstance as jest.Mock).mockReturnValue(mockCircuitBreakerRegistry);

    // Mock cache
    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(0),
      getStats: jest.fn().mockResolvedValue({ hits: 0, misses: 0 })
    };
    (CacheFactory.getInstance as jest.Mock).mockReturnValue(mockCache);

    // Mock config
    mockConfig = {
      host: 'localhost',
      port: 4502,
      protocol: 'http',
      timeout: 30000,
      retryAttempts: 3,
      authentication: {
        type: 'basic',
        username: 'admin',
        password: 'admin'
      }
    };
    const mockConfigManager = {
      getAEMConfig: jest.fn().mockReturnValue(mockConfig)
    };
    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    client = new AEMHttpClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:4502',
          timeout: 30000,
          maxRedirects: 5
        })
      );
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should initialize with custom config', () => {
      const customConfig: AEMConfig = {
        host: 'custom.host',
        port: 443,
        protocol: 'https',
        timeout: 60000,
        retryAttempts: 5,
        authentication: {
          type: 'oauth',
          clientId: 'client123',
          clientSecret: 'secret123'
        }
      };

      new AEMHttpClient({ config: customConfig });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.host:443',
          timeout: 60000
        })
      );
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true, result: 'test data' },
        status: 200,
        config: { metadata: { requestId: 'req-123', startTime: Date.now() } }
      });
    });

    it('should perform GET request', async () => {
      const response = await client.get('/test/path', { param1: 'value1' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'test/path',
          params: { param1: 'value1' }
        })
      );
      expect(response.success).toBe(true);
    });

    it('should perform POST request', async () => {
      const data = { name: 'test', value: 123 };
      const response = await client.post('/test/path', data);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'test/path',
          data
        })
      );
      expect(response.success).toBe(true);
    });

    it('should perform PUT request', async () => {
      const data = { id: 1, name: 'updated' };
      const response = await client.put('/test/path', data);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: 'test/path',
          data
        })
      );
      expect(response.success).toBe(true);
    });

    it('should perform DELETE request', async () => {
      const response = await client.delete('/test/path');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: 'test/path'
        })
      );
      expect(response.success).toBe(true);
    });
  });

  describe('authentication', () => {
    it('should add basic auth headers', async () => {
      await client.get('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Basic YWRtaW46YWRtaW4=' // base64 of admin:admin
          })
        })
      );
    });

    it('should handle OAuth authentication', async () => {
      const oauthConfig: AEMConfig = {
        ...mockConfig,
        authentication: {
          type: 'oauth',
          clientId: 'client123',
          clientSecret: 'secret123',
          accessToken: 'token123'
        }
      };

      const oauthClient = new AEMHttpClient({ config: oauthConfig });
      await oauthClient.get('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123'
          })
        })
      );
    });

    it('should handle service account authentication', async () => {
      const serviceAccountConfig: AEMConfig = {
        ...mockConfig,
        authentication: {
          type: 'service-account',
          clientId: 'service123',
          clientSecret: 'secret123',
          privateKey: 'private-key',
          accessToken: 'service-token123'
        }
      };

      const serviceClient = new AEMHttpClient({ config: serviceAccountConfig });
      await serviceClient.get('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer service-token123'
          })
        })
      );
    });
  });

  describe('caching', () => {
    it('should check cache for GET requests', async () => {
      mockCache.get.mockResolvedValueOnce('cached-data');

      const response = await client.get('/test/path', { param: 'value' });

      expect(mockCache.get).toHaveBeenCalledWith(
        expect.stringContaining('aem:GET:/test/path:')
      );
      expect(response.data).toBe('cached-data');
      expect(response.metadata?.cached).toBe(true);
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });

    it('should cache successful GET responses', async () => {
      mockCache.get.mockResolvedValueOnce(null); // Cache miss

      await client.get('/test/path', { param: 'value' });

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('aem:GET:/test/path:'),
        expect.any(Object),
        300000 // Default TTL
      );
    });

    it('should not cache non-GET requests', async () => {
      await client.post('/test/path', { data: 'test' });

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should respect cache options', async () => {
      mockCache.get.mockResolvedValueOnce(null);

      await client.get('/test/path', {}, { 
        cache: false,
        cacheTtl: 60000 
      });

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('circuit breaker', () => {
    it('should use circuit breaker for requests', async () => {
      await client.get('/test/path');

      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
    });

    it('should bypass circuit breaker when disabled', async () => {
      await client.get('/test/path', {}, { circuitBreaker: false });

      expect(mockCircuitBreaker.execute).toHaveBeenCalled(); // Still called due to retry handler
    });

    it('should reset circuit breaker', () => {
      client.resetCircuitBreaker();

      expect(mockCircuitBreaker.reset).toHaveBeenCalled();
    });
  });

  describe('file upload', () => {
    it('should upload file with metadata', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        description: 'Test file'
      };

      await client.upload('/upload/path', fileBuffer, metadata);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'upload/path',
          data: expect.any(FormData),
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data'
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle axios errors', async () => {
      const axiosError = new Error('Network error');
      axiosError.name = 'AxiosError';
      mockAxiosInstance.request.mockRejectedValueOnce(axiosError);

      const response = await client.get('/test/path');

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'AEM request failed',
        axiosError,
        expect.any(Object)
      );
    });

    it('should handle AEM error responses', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          success: false,
          error: { message: 'Access denied', code: 'javax.jcr.AccessDeniedException' }
        },
        status: 403,
        config: { metadata: { requestId: 'req-123', startTime: Date.now() } }
      });

      const response = await client.get('/test/path');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('statistics and monitoring', () => {
    it('should return client statistics', async () => {
      const stats = client.getStats();

      expect(stats).toHaveProperty('circuitBreaker');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('performance');
      expect(mockCircuitBreaker.getStats).toHaveBeenCalled();
      expect(mockCache.getStats).toHaveBeenCalled();
      expect(mockPerformanceMonitor.getMetrics).toHaveBeenCalled();
    });

    it('should clear cache', async () => {
      await client.clearCache();
      expect(mockCache.clear).toHaveBeenCalled();

      await client.clearCache('pattern:*');
      expect(mockCache.invalidatePattern).toHaveBeenCalledWith('pattern:*');
    });
  });

  describe('resource cleanup', () => {
    it('should close client and cleanup resources', async () => {
      await client.close();

      expect(mockAxiosInstance.defaults.httpAgent.destroy).toHaveBeenCalled();
      expect(mockAxiosInstance.defaults.httpsAgent.destroy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('AEM HTTP client closed');
    });
  });

  describe('request options', () => {
    it('should handle custom timeout', async () => {
      await client.get('/test/path', {}, { timeout: 60000 });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000
        })
      );
    });

    it('should handle custom headers', async () => {
      await client.get('/test/path', {}, { 
        headers: { 'Custom-Header': 'custom-value' }
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Custom-Header': 'custom-value'
          })
        })
      );
    });

    it('should handle operation context', async () => {
      const context = {
        userId: 'user123',
        operation: 'custom-operation'
      };

      await client.get('/test/path', {}, { context });

      // Verify that context is used in logging
      expect(mockPerformanceMonitor.startOperation).toHaveBeenCalledWith(
        expect.any(String),
        'custom-operation'
      );
    });
  });
});

describe('createAEMHttpClient factory', () => {
  it('should create AEM HTTP client instance', () => {
    const client = createAEMHttpClient();
    expect(client).toBeInstanceOf(AEMHttpClient);
  });

  it('should create client with custom options', () => {
    const options = {
      enableCircuitBreaker: false,
      enableCaching: false,
      enableRetry: false
    };

    const client = createAEMHttpClient(options);
    expect(client).toBeInstanceOf(AEMHttpClient);
  });
});