/**
 * Unit tests for retry handler
 */

import { RetryHandler, RetryConfig, RetryOptions } from '../utils/retry-handler.js';
import { AEMException } from '../utils/errors.js';
import { ErrorType } from '../types/aem.js';

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;
  let mockOperation: jest.Mock;
  let mockFallback: jest.Mock;

  beforeEach(() => {
    retryHandler = new RetryHandler();
    mockOperation = jest.fn();
    mockFallback = jest.fn();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(retryHandler).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 60000
      };
      const handler = new RetryHandler(customConfig);
      expect(handler).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute operation successfully on first attempt', async () => {
      const expectedResult = 'success';
      mockOperation.mockResolvedValue(expectedResult);

      const result = await retryHandler.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(result.attempts).toBe(1);
      expect(result.fallbackUsed).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const expectedResult = 'success';
      mockOperation
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue(expectedResult);

      const result = await retryHandler.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(result.attempts).toBe(3);
      expect(result.fallbackUsed).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Non-retryable error');
      mockOperation.mockRejectedValue(error);

      const result = await retryHandler.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(1);
      expect(result.fallbackUsed).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use fallback when all attempts fail', async () => {
      const fallbackResult = 'fallback success';
      const error = new Error('ECONNRESET');
      
      mockOperation.mockRejectedValue(error);
      mockFallback.mockResolvedValue(fallbackResult);

      const options: RetryOptions = {
        fallback: mockFallback
      };

      const result = await retryHandler.execute(mockOperation, options);

      expect(result.success).toBe(true);
      expect(result.result).toBe(fallbackResult);
      expect(result.fallbackUsed).toBe(true);
      expect(mockFallback).toHaveBeenCalledTimes(1);
    });

    it('should call retry callback on each retry', async () => {
      const retryCallback = jest.fn();
      const error = new Error('ECONNRESET');
      
      mockOperation
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const options: RetryOptions = {
        onRetry: retryCallback
      };

      await retryHandler.execute(mockOperation, options);

      expect(retryCallback).toHaveBeenCalledTimes(2);
      expect(retryCallback).toHaveBeenCalledWith(1, error);
      expect(retryCallback).toHaveBeenCalledWith(2, error);
    });

    it('should call fallback callback when fallback is used', async () => {
      const fallbackCallback = jest.fn();
      const error = new Error('ECONNRESET');
      
      mockOperation.mockRejectedValue(error);
      mockFallback.mockResolvedValue('fallback success');

      const options: RetryOptions = {
        fallback: mockFallback,
        onFallback: fallbackCallback
      };

      await retryHandler.execute(mockOperation, options);

      expect(fallbackCallback).toHaveBeenCalledTimes(1);
      expect(fallbackCallback).toHaveBeenCalledWith(error);
    });

    it('should respect timeout configuration', async () => {
      const timeoutConfig: Partial<RetryConfig> = {
        timeout: 100
      };

      mockOperation.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      const result = await retryHandler.execute(mockOperation, { config: timeoutConfig });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Operation timeout');
    });

    it('should handle AEMException with retryable flag', async () => {
      const retryableError = new AEMException(
        'Retryable error',
        ErrorType.NETWORK_ERROR,
        true
      );
      const expectedResult = 'success';
      
      mockOperation
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue(expectedResult);

      const result = await retryHandler.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(result.attempts).toBe(2);
    });

    it('should not retry AEMException with non-retryable flag', async () => {
      const nonRetryableError = new AEMException(
        'Non-retryable error',
        ErrorType.VALIDATION_ERROR,
        false
      );
      
      mockOperation.mockRejectedValue(nonRetryableError);

      const result = await retryHandler.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe(nonRetryableError);
      expect(result.attempts).toBe(1);
    });
  });

  describe('executeHttpRequest', () => {
    it('should execute HTTP request with HTTP-specific configuration', async () => {
      const expectedResult = 'success';
      mockOperation.mockResolvedValue(expectedResult);

      const result = await retryHandler.executeHttpRequest(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on HTTP error status codes', async () => {
      const expectedResult = 'success';
      const httpError = new Error('HTTP 500');
      (httpError as any).status = 500;
      
      mockOperation
        .mockRejectedValueOnce(httpError)
        .mockRejectedValueOnce(httpError)
        .mockResolvedValue(expectedResult);

      const result = await retryHandler.executeHttpRequest(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(result.attempts).toBe(3);
    });
  });

  describe('executeAEMOperation', () => {
    it('should execute AEM operation with AEM-specific configuration', async () => {
      const expectedResult = 'success';
      mockOperation.mockResolvedValue(expectedResult);

      const result = await retryHandler.executeAEMOperation(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on AEM-specific errors', async () => {
      const expectedResult = 'success';
      const aemError = new Error('AEM_UNAVAILABLE');
      
      mockOperation
        .mockRejectedValueOnce(aemError)
        .mockRejectedValueOnce(aemError)
        .mockResolvedValue(expectedResult);

      const result = await retryHandler.executeAEMOperation(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(result.attempts).toBe(3);
    });
  });

  describe('executeCacheOperation', () => {
    it('should execute cache operation with cache-specific configuration', async () => {
      const expectedResult = 'success';
      mockOperation.mockResolvedValue(expectedResult);

      const result = await retryHandler.executeCacheOperation(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on cache-specific errors', async () => {
      const expectedResult = 'success';
      const cacheError = new Error('REDIS_CONNECTION_ERROR');
      
      mockOperation
        .mockRejectedValueOnce(cacheError)
        .mockResolvedValue(expectedResult);

      const result = await retryHandler.executeCacheOperation(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(result.attempts).toBe(2);
    });
  });

  describe('executeBulkOperation', () => {
    it('should execute bulk operation with bulk-specific configuration', async () => {
      const expectedResult = 'success';
      mockOperation.mockResolvedValue(expectedResult);

      const result = await retryHandler.executeBulkOperation(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on bulk operation errors', async () => {
      const expectedResult = 'success';
      const bulkError = new Error('BULK_OPERATION_FAILED');
      
      mockOperation
        .mockRejectedValueOnce(bulkError)
        .mockResolvedValue(expectedResult);

      const result = await retryHandler.executeBulkOperation(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(expectedResult);
      expect(result.attempts).toBe(2);
    });
  });

  describe('static factory methods', () => {
    it('should create retry handler for HTTP requests', () => {
      const handler = RetryHandler.createForHttp();
      expect(handler).toBeDefined();
    });

    it('should create retry handler for AEM operations', () => {
      const handler = RetryHandler.createForAEM();
      expect(handler).toBeDefined();
    });

    it('should create retry handler for cache operations', () => {
      const handler = RetryHandler.createForCache();
      expect(handler).toBeDefined();
    });

    it('should create retry handler for bulk operations', () => {
      const handler = RetryHandler.createForBulk();
      expect(handler).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      mockOperation.mockRejectedValue(error);

      const result = await retryHandler.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should handle fallback errors gracefully', async () => {
      const error = new Error('ECONNRESET');
      const fallbackError = new Error('Fallback failed');
      
      mockOperation.mockRejectedValue(error);
      mockFallback.mockRejectedValue(fallbackError);

      const options: RetryOptions = {
        fallback: mockFallback
      };

      const result = await retryHandler.execute(mockOperation, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe(fallbackError);
      expect(result.fallbackUsed).toBe(false);
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig: Partial<RetryConfig> = {
        maxAttempts: -1,
        baseDelay: -100,
        maxDelay: -1000
      };
      
      expect(() => {
        new RetryHandler(invalidConfig);
      }).not.toThrow();
    });
  });
});
