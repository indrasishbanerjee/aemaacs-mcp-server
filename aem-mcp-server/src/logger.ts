import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  method?: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  error?: any;
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  enableStructuredLogging: boolean;
  enableCorrelation: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logFilePath: string;
  private errorFilePath: string;
  private correlationMap = new Map<string, string>();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      logDirectory: join(process.cwd(), 'logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableStructuredLogging: true,
      enableCorrelation: true,
      ...config
    };

    // Ensure log directory exists
    if (this.config.enableFile && !existsSync(this.config.logDirectory)) {
      mkdirSync(this.config.logDirectory, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    this.logFilePath = join(this.config.logDirectory, `aem-mcp-${timestamp}.log`);
    this.errorFilePath = join(this.config.logDirectory, `aem-mcp-errors-${timestamp}.log`);
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    if (this.config.enableStructuredLogging) {
      return JSON.stringify(entry);
    } else {
      const levelName = LogLevel[entry.level];
      let message = `[${entry.timestamp}] ${levelName}`;
      
      if (entry.context) {
        message += ` [${entry.context}]`;
      }
      
      if (entry.method) {
        message += ` [${entry.method}]`;
      }
      
      if (entry.requestId) {
        message += ` [${entry.requestId}]`;
      }
      
      message += `: ${entry.message}`;
      
      if (entry.duration !== undefined) {
        message += ` (${entry.duration}ms)`;
      }
      
      if (entry.error) {
        message += `\n  Error: ${entry.error.message || entry.error}`;
        if (entry.error.stack) {
          message += `\n  Stack: ${entry.error.stack}`;
        }
      }
      
      if (entry.metadata) {
        message += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
      }
      
      return message;
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile) return;

    try {
      const message = this.formatMessage(entry) + '\n';
      appendFileSync(this.logFilePath, message, 'utf8');
      
      // Also write errors to separate error log
      if (entry.level === LogLevel.ERROR) {
        appendFileSync(this.errorFilePath, message, 'utf8');
      }
      
      // TODO: Implement log rotation based on file size
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const message = this.formatMessage(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  private log(level: LogLevel, message: string, context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message'>>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };

    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  error(message: string, context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message'>>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message'>>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message'>>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message'>>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  trace(message: string, context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message'>>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  // Method-specific logging helpers
  methodStart(method: string, parameters: any, requestId?: string): void {
    this.info(`Method started: ${method}`, {
      method,
      requestId,
      metadata: { parameters }
    });
  }

  methodEnd(method: string, duration: number, success: boolean, requestId?: string, result?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Method ${success ? 'completed' : 'failed'}: ${method}`;
    
    this.log(level, message, {
      method,
      requestId,
      duration,
      metadata: success ? { resultSize: JSON.stringify(result || {}).length } : undefined
    });
  }

  methodError(method: string, error: any, duration: number, requestId?: string, parameters?: any): void {
    this.error(`Method error: ${method}`, {
      method,
      requestId,
      duration,
      error,
      metadata: { parameters }
    });
  }

  // HTTP request logging
  httpRequest(method: string, url: string, statusCode: number, duration: number, requestId?: string): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `HTTP ${method} ${url} - ${statusCode}`, {
      context: 'HTTP',
      requestId,
      duration,
      metadata: { method, url, statusCode }
    });
  }

  // AEM-specific logging
  aemOperation(operation: string, path: string, success: boolean, duration: number, requestId?: string, details?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, `AEM ${operation}: ${path} - ${success ? 'SUCCESS' : 'FAILED'}`, {
      context: 'AEM',
      requestId,
      duration,
      metadata: { operation, path, details }
    });
  }

  // Correlation ID management
  setCorrelation(requestId: string, userId?: string): void {
    if (this.config.enableCorrelation && userId) {
      this.correlationMap.set(requestId, userId);
    }
  }

  getCorrelation(requestId: string): string | undefined {
    return this.correlationMap.get(requestId);
  }

  clearCorrelation(requestId: string): void {
    this.correlationMap.delete(requestId);
  }

  // Performance monitoring
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO; // Warn if operation takes > 5s
    this.log(level, `Performance: ${operation} took ${duration}ms`, {
      context: 'PERFORMANCE',
      duration,
      metadata
    });
  }

  // Security logging
  security(event: string, details: Record<string, any>, requestId?: string): void {
    this.warn(`Security event: ${event}`, {
      context: 'SECURITY',
      requestId,
      metadata: details
    });
  }

  // System health logging
  health(component: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: Record<string, any>): void {
    const level = status === 'healthy' ? LogLevel.INFO : 
                 status === 'degraded' ? LogLevel.WARN : LogLevel.ERROR;
    
    this.log(level, `Health check: ${component} is ${status}`, {
      context: 'HEALTH',
      metadata: { component, status, ...details }
    });
  }

  // Configuration and utility methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`Log level changed to ${LogLevel[level]}`);
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  flush(): void {
    // In a real implementation, this would flush any buffered logs
    this.info('Log flush requested');
  }

  // Create child logger with context
  child(context: string): Logger {
    const childLogger = new Logger(this.config);
    
    // Override log method to include context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, logContext?: any) => {
      originalLog(level, message, { ...logContext, context });
    };
    
    return childLogger;
  }
}

// Global logger instance
export const logger = new Logger({
  level: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO,
  enableConsole: process.env.NODE_ENV !== 'test',
  enableFile: true,
  enableStructuredLogging: process.env.STRUCTURED_LOGGING === 'true'
});

// Request ID generator
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Logging middleware for Express
export function loggingMiddleware(req: any, res: any, next: any): void {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  req.requestId = requestId;
  req.logger = logger.child(`HTTP-${req.method}`);
  
  // Log request start
  logger.httpRequest(req.method, req.url, 0, 0, requestId);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;
    logger.httpRequest(req.method, req.url, res.statusCode, duration, requestId);
    originalEnd.apply(res, args);
  };
  
  next();
}

export default logger;