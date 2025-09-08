/**
 * Configuration management system for AEMaaCS MCP servers
 */

import { config as dotenvConfig } from 'dotenv';
import Joi from 'joi';
import { AEMConfig, AEMCredentials } from '../types/aem.js';
import { ValidationUtils } from '../utils/validation.js';

// Load environment variables
dotenvConfig();

export interface ServerConfig {
  aem: AEMConfig;
  server: ServerSettings;
  security: SecurityConfig;
  logging: LoggingConfig;
  cache: CacheConfig;
  retry: RetryConfig;
}

export interface ServerSettings {
  port: number;
  host: string;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  timeout: number;
}

export interface SecurityConfig {
  enableInputValidation: boolean;
  enableAuditLogging: boolean;
  maxRequestSize: string;
  allowedFileTypes: string[];
  maxFileSize: number;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  file?: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
  console: {
    enabled: boolean;
    colorize: boolean;
  };
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'ttl';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const configSchema = Joi.object({
  aem: Joi.object({
    host: Joi.string().hostname().required(),
    port: Joi.number().port().default(443),
    protocol: Joi.string().valid('http', 'https').default('https'),
    basePath: Joi.string().optional(),
    timeout: Joi.number().positive().default(30000),
    retryAttempts: Joi.number().integer().min(0).max(10).default(3),
    authentication: Joi.object({
      type: Joi.string().valid('basic', 'oauth', 'service-account').required(),
      username: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
      password: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
      clientId: Joi.string().when('type', { is: Joi.valid('oauth', 'service-account'), then: Joi.required() }),
      clientSecret: Joi.string().when('type', { is: Joi.valid('oauth', 'service-account'), then: Joi.required() }),
      privateKey: Joi.string().when('type', { is: 'service-account', then: Joi.optional() }),
      accessToken: Joi.string().optional()
    }).required()
  }).required(),
  
  server: Joi.object({
    port: Joi.number().port().default(8080),
    host: Joi.string().default('0.0.0.0'),
    cors: Joi.object({
      enabled: Joi.boolean().default(true),
      origins: Joi.array().items(Joi.string()).default(['*'])
    }).default(),
    rateLimit: Joi.object({
      windowMs: Joi.number().positive().default(900000), // 15 minutes
      maxRequests: Joi.number().positive().default(100)
    }).default(),
    timeout: Joi.number().positive().default(30000)
  }).default(),
  
  security: Joi.object({
    enableInputValidation: Joi.boolean().default(true),
    enableAuditLogging: Joi.boolean().default(true),
    maxRequestSize: Joi.string().default('10mb'),
    allowedFileTypes: Joi.array().items(Joi.string()).default([
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv', '.json', '.xml', '.html', '.css', '.js',
      '.zip', '.tar', '.gz'
    ]),
    maxFileSize: Joi.number().positive().default(104857600) // 100MB
  }).default(),
  
  logging: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    format: Joi.string().valid('json', 'simple').default('json'),
    file: Joi.object({
      enabled: Joi.boolean().default(false),
      path: Joi.string().default('./logs/app.log'),
      maxSize: Joi.string().default('10m'),
      maxFiles: Joi.number().positive().default(5)
    }).optional(),
    console: Joi.object({
      enabled: Joi.boolean().default(true),
      colorize: Joi.boolean().default(true)
    }).default()
  }).default(),
  
  cache: Joi.object({
    enabled: Joi.boolean().default(true),
    ttl: Joi.number().positive().default(300000), // 5 minutes
    maxSize: Joi.number().positive().default(1000),
    strategy: Joi.string().valid('lru', 'lfu', 'ttl').default('lru'),
    redis: Joi.object({
      host: Joi.string().hostname().default('localhost'),
      port: Joi.number().port().default(6379),
      password: Joi.string().optional(),
      db: Joi.number().integer().min(0).default(0)
    }).optional()
  }).default(),
  
  retry: Joi.object({
    maxAttempts: Joi.number().integer().min(1).max(10).default(3),
    baseDelay: Joi.number().positive().default(1000),
    maxDelay: Joi.number().positive().default(30000),
    backoffMultiplier: Joi.number().positive().default(2)
  }).default()
});

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ServerConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(): ServerConfig {
    return this.config;
  }

  getAEMConfig(): AEMConfig {
    return this.config.aem;
  }

  getServerConfig(): ServerSettings {
    return this.config.server;
  }

  getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  getLoggingConfig(): LoggingConfig {
    return this.config.logging;
  }

  getCacheConfig(): CacheConfig {
    return this.config.cache;
  }

  getRetryConfig(): RetryConfig {
    return this.config.retry;
  }

  private loadConfig(): ServerConfig {
    const rawConfig = {
      aem: {
        host: process.env.AEM_HOST || 'localhost',
        port: parseInt(process.env.AEM_PORT || '4502'),
        protocol: process.env.AEM_PROTOCOL || 'http',
        basePath: process.env.AEM_BASE_PATH,
        timeout: parseInt(process.env.AEM_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.AEM_RETRY_ATTEMPTS || '3'),
        authentication: this.loadAuthConfig()
      },
      server: {
        port: parseInt(process.env.SERVER_PORT || '8080'),
        host: process.env.SERVER_HOST || '0.0.0.0',
        cors: {
          enabled: process.env.CORS_ENABLED !== 'false',
          origins: process.env.CORS_ORIGINS?.split(',') || ['*']
        },
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
        },
        timeout: parseInt(process.env.SERVER_TIMEOUT || '30000')
      },
      security: {
        enableInputValidation: process.env.ENABLE_INPUT_VALIDATION !== 'false',
        enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
        allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
          '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.txt', '.csv', '.json', '.xml', '.html', '.css', '.js',
          '.zip', '.tar', '.gz'
        ],
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600')
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
        file: process.env.LOG_FILE_ENABLED === 'true' ? {
          enabled: true,
          path: process.env.LOG_FILE_PATH || './logs/app.log',
          maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
          maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '5')
        } : undefined,
        console: {
          enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
          colorize: process.env.LOG_CONSOLE_COLORIZE !== 'false'
        }
      },
      cache: {
        enabled: process.env.CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.CACHE_TTL || '300000'),
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
        strategy: process.env.CACHE_STRATEGY || 'lru',
        redis: process.env.REDIS_HOST ? {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0')
        } : undefined
      },
      retry: {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000'),
        maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '30000'),
        backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2')
      }
    };

    return ValidationUtils.validateWithSchema<ServerConfig>(rawConfig, configSchema);
  }

  private loadAuthConfig(): AEMCredentials {
    const authType = process.env.AEM_AUTH_TYPE || 'basic';
    
    switch (authType) {
      case 'basic':
        return {
          type: 'basic',
          username: process.env.AEM_USERNAME || '',
          password: process.env.AEM_PASSWORD || ''
        };
      case 'oauth':
        return {
          type: 'oauth',
          clientId: process.env.AEM_CLIENT_ID || '',
          clientSecret: process.env.AEM_CLIENT_SECRET || '',
          accessToken: process.env.AEM_ACCESS_TOKEN
        };
      case 'service-account':
        return {
          type: 'service-account',
          clientId: process.env.AEM_CLIENT_ID || '',
          clientSecret: process.env.AEM_CLIENT_SECRET || '',
          privateKey: process.env.AEM_PRIVATE_KEY
        };
      default:
        throw new Error(`Unsupported authentication type: ${authType}`);
    }
  }

  /**
   * Reload configuration (useful for hot-reloading in development)
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors?: string[] } {
    try {
      ValidationUtils.validateWithSchema(this.config, configSchema);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }
}