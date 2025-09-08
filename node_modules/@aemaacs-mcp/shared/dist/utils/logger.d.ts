/**
 * Logging and monitoring utilities for AEMaaCS MCP servers
 */
import { OperationContext } from '../types/aem.js';
export interface LogContext {
    requestId?: string;
    userId?: string;
    operation?: string;
    resource?: string;
    duration?: number;
    [key: string]: any;
}
export interface AuditEvent {
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    type: 'operation' | 'security' | 'error';
    user?: string;
    operation: string;
    resource?: string;
    result: 'success' | 'failure';
    details?: Record<string, any>;
    context?: OperationContext;
}
export declare class Logger {
    private static instance;
    private winston;
    private auditLogger;
    private constructor();
    static getInstance(): Logger;
    private createLogger;
    private createAuditLogger;
    private parseSize;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, error?: Error, context?: LogContext): void;
    audit(event: AuditEvent): void;
    /**
     * Create a child logger with default context
     */
    child(defaultContext: LogContext): ChildLogger;
    /**
     * Log operation start
     */
    logOperationStart(operation: string, context: OperationContext): void;
    /**
     * Log operation completion
     */
    logOperationComplete(operation: string, context: OperationContext, duration: number, success?: boolean): void;
    /**
     * Log security event
     */
    logSecurityEvent(event: string, context: OperationContext, details?: Record<string, any>): void;
}
export declare class ChildLogger {
    private parent;
    private defaultContext;
    constructor(parent: Logger, defaultContext: LogContext);
    private mergeContext;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, error?: Error, context?: LogContext): void;
}
export declare class PerformanceMonitor {
    private static instance;
    private metrics;
    private logger;
    private constructor();
    static getInstance(): PerformanceMonitor;
    startOperation(operationId: string, operation: string): OperationTimer;
    recordOperation(operationId: string, operation: string, duration: number, success: boolean): void;
    getMetrics(): OperationMetrics[];
    getMetricsForOperation(operation: string): OperationMetrics | undefined;
    resetMetrics(): void;
}
export interface OperationMetrics {
    operation: string;
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successCount: number;
    errorCount: number;
    successRate: number;
}
export declare class OperationTimer {
    private operationId;
    private operation;
    private monitor;
    private startTime;
    constructor(operationId: string, operation: string, monitor: PerformanceMonitor);
    end(success?: boolean): number;
}
//# sourceMappingURL=logger.d.ts.map