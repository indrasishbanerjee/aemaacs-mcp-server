/**
 * Tests for circuit breaker implementation
 */

import { CircuitBreaker, CircuitState, CircuitBreakerRegistry } from '../utils/circuit-breaker.js';
import { AEMException } from '../utils/errors.js';
import { ErrorType } from '../types/aem.js';
import { Logger } from '../utils/logger.js';

// Mock Logger
jest.mock('../utils/logger.js');

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any;
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    circuitBreaker = new CircuitBreaker('test-circuit', {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CLOSED state', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });

    it('should handle single failure without opening circuit', async () => {
      const error = new AEMException('Test error', ErrorType.NETWORK_ERROR, true);
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(error);
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(1);
    });

    it('should open circuit after reaching failure threshold', async () => {
      const error = new AEMException('Test error', ErrorType.NETWORK_ERROR, true);
      const operation = jest.fn().mockRejectedValue(error);
      
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(operation)).rejects.toThrow(error);
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.failureCount).toBe(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('opened due to 3 failures')
      );
    });

    it('should not count non-recoverable errors towards threshold', async () => {
      const error = new AEMException('Auth error', ErrorType.AUTHENTICATION_ERROR, false);
      const operation = jest.fn().mockRejectedValue(error);
      
      // Fail 5 times with non-recoverable error
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(operation)).rejects.toThrow(error);
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED); // Should remain closed
      expect(stats.failureCount).toBe(0); // Non-recoverable errors don't count
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Force circuit to open state
      const error = new AEMException('Test error', ErrorType.NETWORK_ERROR, true);
      const operation = jest.fn().mockRejectedValue(error);
      
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(operation)).rejects.toThrow(error);
      }
    });

    it('should reject requests immediately when circuit is open', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        expect.objectContaining({
          code: ErrorType.SERVER_ERROR,
          message: expect.stringContaining('Circuit breaker test-circuit is OPEN')
        })
      );
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED); // Should transition to closed after success
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Force circuit to open state
      const error = new AEMException('Test error', ErrorType.NETWORK_ERROR, true);
      const operation = jest.fn().mockRejectedValue(error);
      
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(operation)).rejects.toThrow(error);
      }
      
      // Wait for recovery timeout to transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    it('should transition to CLOSED on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('reset to CLOSED after successful call')
      );
    });

    it('should transition back to OPEN on failure', async () => {
      const error = new AEMException('Test error', ErrorType.NETWORK_ERROR, true);
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(error);
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed in HALF_OPEN, returning to OPEN')
      );
    });
  });

  describe('manual control', () => {
    it('should reset circuit breaker manually', () => {
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);
      
      circuitBreaker.reset();
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });

    it('should force circuit breaker to open', () => {
      circuitBreaker.forceOpen();
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.lastFailureTime).toBeDefined();
      expect(stats.nextAttemptTime).toBeDefined();
    });
  });

  describe('statistics', () => {
    it('should track operation statistics correctly', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new AEMException('Error', ErrorType.NETWORK_ERROR, true));
      
      // Execute some operations
      await circuitBreaker.execute(successOp);
      await circuitBreaker.execute(successOp);
      
      try {
        await circuitBreaker.execute(failOp);
      } catch (e) {
        // Expected
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = CircuitBreakerRegistry.getInstance();
    registry.clear(); // Clear any existing breakers
  });

  it('should create and retrieve circuit breakers', () => {
    const breaker1 = registry.getCircuitBreaker('test1');
    const breaker2 = registry.getCircuitBreaker('test2');
    const breaker1Again = registry.getCircuitBreaker('test1');
    
    expect(breaker1).toBeDefined();
    expect(breaker2).toBeDefined();
    expect(breaker1).toBe(breaker1Again); // Should return same instance
    expect(breaker1).not.toBe(breaker2); // Should be different instances
  });

  it('should create circuit breaker with custom config', () => {
    const config = {
      failureThreshold: 10,
      recoveryTimeout: 5000,
      monitoringPeriod: 10000
    };
    
    const breaker = registry.getCircuitBreaker('custom', config);
    expect(breaker).toBeDefined();
  });

  it('should get all statistics', async () => {
    const breaker1 = registry.getCircuitBreaker('test1');
    const breaker2 = registry.getCircuitBreaker('test2');
    
    // Execute some operations
    const op = jest.fn().mockResolvedValue('success');
    await breaker1.execute(op);
    await breaker2.execute(op);
    
    const allStats = registry.getAllStats();
    expect(allStats).toHaveProperty('test1');
    expect(allStats).toHaveProperty('test2');
    expect(allStats.test1?.successCount).toBe(1);
    expect(allStats.test2?.successCount).toBe(1);
  });

  it('should reset all circuit breakers', async () => {
    const breaker1 = registry.getCircuitBreaker('test1');
    const breaker2 = registry.getCircuitBreaker('test2');
    
    // Force both to open
    breaker1.forceOpen();
    breaker2.forceOpen();
    
    expect(breaker1.getStats().state).toBe(CircuitState.OPEN);
    expect(breaker2.getStats().state).toBe(CircuitState.OPEN);
    
    registry.resetAll();
    
    expect(breaker1.getStats().state).toBe(CircuitState.CLOSED);
    expect(breaker2.getStats().state).toBe(CircuitState.CLOSED);
  });

  it('should remove circuit breaker', () => {
    registry.getCircuitBreaker('test');
    expect(registry.getAllStats()).toHaveProperty('test');
    
    const removed = registry.remove('test');
    expect(removed).toBe(true);
    expect(registry.getAllStats()).not.toHaveProperty('test');
    
    const removedAgain = registry.remove('test');
    expect(removedAgain).toBe(false);
  });

  it('should clear all circuit breakers', () => {
    registry.getCircuitBreaker('test1');
    registry.getCircuitBreaker('test2');
    
    expect(Object.keys(registry.getAllStats())).toHaveLength(2);
    
    registry.clear();
    
    expect(Object.keys(registry.getAllStats())).toHaveLength(0);
  });
});