"use strict";
/**
 * Circuit breaker pattern implementation for AEMaaCS operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerRegistry = exports.CircuitBreaker = exports.CircuitState = void 0;
const logger_js_1 = require("./logger.js");
const errors_js_1 = require("./errors.js");
const aem_js_1 = require("../types/aem.js");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
        this.logger = logger_js_1.Logger.getInstance();
        const defaultConfig = {
            failureThreshold: 5,
            recoveryTimeout: 60000, // 1 minute
            monitoringPeriod: 300000, // 5 minutes
            expectedErrors: [aem_js_1.ErrorType.NETWORK_ERROR, aem_js_1.ErrorType.TIMEOUT_ERROR, aem_js_1.ErrorType.SERVER_ERROR]
        };
        this.config = { ...defaultConfig, ...config };
    }
    /**
     * Execute operation with circuit breaker protection
     */
    async execute(operation) {
        this.totalRequests++;
        // Check if circuit is open
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
                this.logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
            }
            else {
                const error = new errors_js_1.AEMException(`Circuit breaker ${this.name} is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`, aem_js_1.ErrorType.SERVER_ERROR, true, this.getTimeUntilNextAttempt());
                this.logger.warn(`Circuit breaker ${this.name} rejected request - circuit is OPEN`);
                throw error;
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    /**
     * Get current circuit breaker statistics
     */
    getStats() {
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
    reset() {
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
    forceOpen() {
        this.state = CircuitState.OPEN;
        this.lastFailureTime = new Date();
        this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
        this.logger.warn(`Circuit breaker ${this.name} manually forced to OPEN`);
    }
    onSuccess() {
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
    onFailure(error) {
        // Only count expected errors towards circuit breaker
        if (this.isExpectedError(error)) {
            this.failureCount++;
            this.lastFailureTime = new Date();
            if (this.state === CircuitState.HALF_OPEN) {
                // Failure in half-open state - back to open
                this.state = CircuitState.OPEN;
                this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
                this.logger.warn(`Circuit breaker ${this.name} failed in HALF_OPEN, returning to OPEN`);
            }
            else if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
                // Too many failures - open the circuit
                this.state = CircuitState.OPEN;
                this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
                this.logger.warn(`Circuit breaker ${this.name} opened due to ${this.failureCount} failures`);
            }
        }
    }
    isExpectedError(error) {
        if (error instanceof errors_js_1.AEMException) {
            return this.config.expectedErrors?.includes(error.code) || false;
        }
        // Check for common network errors
        const networkErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNABORTED'];
        return networkErrors.some(code => error.message.includes(code));
    }
    shouldAttemptReset() {
        if (!this.nextAttemptTime) {
            return true;
        }
        return Date.now() >= this.nextAttemptTime.getTime();
    }
    getTimeUntilNextAttempt() {
        if (!this.nextAttemptTime) {
            return 0;
        }
        return Math.max(0, this.nextAttemptTime.getTime() - Date.now());
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
class CircuitBreakerRegistry {
    constructor() {
        this.breakers = new Map();
    }
    static getInstance() {
        if (!CircuitBreakerRegistry.instance) {
            CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
        }
        return CircuitBreakerRegistry.instance;
    }
    /**
     * Get or create a circuit breaker
     */
    getCircuitBreaker(name, config) {
        if (!this.breakers.has(name)) {
            const defaultConfig = {
                failureThreshold: 5,
                recoveryTimeout: 60000,
                monitoringPeriod: 300000
            };
            this.breakers.set(name, new CircuitBreaker(name, { ...defaultConfig, ...config }));
        }
        return this.breakers.get(name);
    }
    /**
     * Get all circuit breaker statistics
     */
    getAllStats() {
        const stats = {};
        for (const [name, breaker] of this.breakers) {
            stats[name] = breaker.getStats();
        }
        return stats;
    }
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
    /**
     * Remove a circuit breaker
     */
    remove(name) {
        return this.breakers.delete(name);
    }
    /**
     * Clear all circuit breakers
     */
    clear() {
        this.breakers.clear();
    }
}
exports.CircuitBreakerRegistry = CircuitBreakerRegistry;
//# sourceMappingURL=circuit-breaker.js.map