/**
 * Circuit breaker pattern implementation for AEMaaCS operations
 */

import { Logger } from './logger.js';
import { AEMException } from './errors.js';
import { ErrorType } from '../types/aem.js';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private logger: Logger;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {
    this.logger = Logger.getInstance();
    const defaultConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      expectedErrors: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.SERVER_ERROR]
    };
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        const error = new AEMException(
          `Circuit breaker ${this.name} is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`,
          ErrorType.SERVER_ERROR,
          true,
          this.getTimeUntilNextAttempt()
        );
        this.logger.warn(`Circuit breaker ${this.name} rejected request - circuit is OPEN`);
        throw error;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.logger.info(`Circuit breaker ${this.name} manually reset to CLOSED`);
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = new Date();
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    this.logger.warn(`Circuit breaker ${this.name} manually forced to OPEN`);
  }

  private onSuccess(): void {
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Successful call in half-open state - reset to closed
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.lastFailureTime = undefined;
      this.nextAttemptTime = undefined;
      this.logger.info(`Circuit breaker ${this.name} reset to CLOSED after successful call`);
    }
  }

  private onFailure(error: Error): void {
    // Only count expected errors towards circuit breaker
    if (this.isExpectedError(error)) {
      this.failureCount++;
      this.lastFailureTime = new Date();

      if (this.state === CircuitState.HALF_OPEN) {
        // Failure in half-open state - back to open
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
        this.logger.warn(`Circuit breaker ${this.name} failed in HALF_OPEN, returning to OPEN`);
      } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
        // Too many failures - open the circuit
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
        this.logger.warn(`Circuit breaker ${this.name} opened due to ${this.failureCount} failures`);
      }
    }
  }

  private isExpectedError(error: Error): boolean {
    if (error instanceof AEMException) {
      return this.config.expectedErrors?.includes(error.code) || false;
    }

    // Check for common network errors
    const networkErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNABORTED'];
    return networkErrors.some(code => error.message.includes(code));
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return true;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  private getTimeUntilNextAttempt(): number {
    if (!this.nextAttemptTime) {
      return 0;
    }
    return Math.max(0, this.nextAttemptTime.getTime() - Date.now());
  }
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000
      };
      this.breakers.set(name, new CircuitBreaker(name, { ...defaultConfig, ...config }));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}