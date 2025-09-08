/**
 * Circuit breaker pattern implementation for AEMaaCS operations
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
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
export declare class CircuitBreaker {
    private name;
    private config;
    private state;
    private failureCount;
    private successCount;
    private totalRequests;
    private lastFailureTime?;
    private nextAttemptTime?;
    private logger;
    constructor(name: string, config: CircuitBreakerConfig);
    /**
     * Execute operation with circuit breaker protection
     */
    execute<T>(operation: () => Promise<T>): Promise<T>;
    /**
     * Get current circuit breaker statistics
     */
    getStats(): CircuitBreakerStats;
    /**
     * Reset circuit breaker to closed state
     */
    reset(): void;
    /**
     * Force circuit breaker to open state
     */
    forceOpen(): void;
    private onSuccess;
    private onFailure;
    private isExpectedError;
    private shouldAttemptReset;
    private getTimeUntilNextAttempt;
}
/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
export declare class CircuitBreakerRegistry {
    private static instance;
    private breakers;
    private constructor();
    static getInstance(): CircuitBreakerRegistry;
    /**
     * Get or create a circuit breaker
     */
    getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker;
    /**
     * Get all circuit breaker statistics
     */
    getAllStats(): Record<string, CircuitBreakerStats>;
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
    /**
     * Remove a circuit breaker
     */
    remove(name: string): boolean;
    /**
     * Clear all circuit breakers
     */
    clear(): void;
}
//# sourceMappingURL=circuit-breaker.d.ts.map