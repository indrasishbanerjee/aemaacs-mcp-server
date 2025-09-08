"use strict";
/**
 * Configuration management system for AEMaaCS MCP servers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const dotenv_1 = require("dotenv");
const joi_1 = __importDefault(require("joi"));
const validation_js_1 = require("../utils/validation.js");
// Load environment variables
(0, dotenv_1.config)();
const configSchema = joi_1.default.object({
    aem: joi_1.default.object({
        host: joi_1.default.string().hostname().required(),
        port: joi_1.default.number().port().default(443),
        protocol: joi_1.default.string().valid('http', 'https').default('https'),
        basePath: joi_1.default.string().optional(),
        timeout: joi_1.default.number().positive().default(30000),
        retryAttempts: joi_1.default.number().integer().min(0).max(10).default(3),
        authentication: joi_1.default.object({
            type: joi_1.default.string().valid('basic', 'oauth', 'service-account').required(),
            username: joi_1.default.string().when('type', { is: 'basic', then: joi_1.default.required() }),
            password: joi_1.default.string().when('type', { is: 'basic', then: joi_1.default.required() }),
            clientId: joi_1.default.string().when('type', { is: joi_1.default.valid('oauth', 'service-account'), then: joi_1.default.required() }),
            clientSecret: joi_1.default.string().when('type', { is: joi_1.default.valid('oauth', 'service-account'), then: joi_1.default.required() }),
            privateKey: joi_1.default.string().when('type', { is: 'service-account', then: joi_1.default.optional() }),
            accessToken: joi_1.default.string().optional()
        }).required()
    }).required(),
    server: joi_1.default.object({
        port: joi_1.default.number().port().default(8080),
        host: joi_1.default.string().default('0.0.0.0'),
        cors: joi_1.default.object({
            enabled: joi_1.default.boolean().default(true),
            origins: joi_1.default.array().items(joi_1.default.string()).default(['*'])
        }).default(),
        rateLimit: joi_1.default.object({
            windowMs: joi_1.default.number().positive().default(900000), // 15 minutes
            maxRequests: joi_1.default.number().positive().default(100)
        }).default(),
        timeout: joi_1.default.number().positive().default(30000)
    }).default(),
    security: joi_1.default.object({
        enableInputValidation: joi_1.default.boolean().default(true),
        enableAuditLogging: joi_1.default.boolean().default(true),
        maxRequestSize: joi_1.default.string().default('10mb'),
        allowedFileTypes: joi_1.default.array().items(joi_1.default.string()).default([
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.txt', '.csv', '.json', '.xml', '.html', '.css', '.js',
            '.zip', '.tar', '.gz'
        ]),
        maxFileSize: joi_1.default.number().positive().default(104857600) // 100MB
    }).default(),
    logging: joi_1.default.object({
        level: joi_1.default.string().valid('error', 'warn', 'info', 'debug').default('info'),
        format: joi_1.default.string().valid('json', 'simple').default('json'),
        file: joi_1.default.object({
            enabled: joi_1.default.boolean().default(false),
            path: joi_1.default.string().default('./logs/app.log'),
            maxSize: joi_1.default.string().default('10m'),
            maxFiles: joi_1.default.number().positive().default(5)
        }).optional(),
        console: joi_1.default.object({
            enabled: joi_1.default.boolean().default(true),
            colorize: joi_1.default.boolean().default(true)
        }).default()
    }).default(),
    cache: joi_1.default.object({
        enabled: joi_1.default.boolean().default(true),
        ttl: joi_1.default.number().positive().default(300000), // 5 minutes
        maxSize: joi_1.default.number().positive().default(1000),
        strategy: joi_1.default.string().valid('lru', 'lfu', 'ttl').default('lru'),
        redis: joi_1.default.object({
            host: joi_1.default.string().hostname().default('localhost'),
            port: joi_1.default.number().port().default(6379),
            password: joi_1.default.string().optional(),
            db: joi_1.default.number().integer().min(0).default(0)
        }).optional()
    }).default(),
    retry: joi_1.default.object({
        maxAttempts: joi_1.default.number().integer().min(1).max(10).default(3),
        baseDelay: joi_1.default.number().positive().default(1000),
        maxDelay: joi_1.default.number().positive().default(30000),
        backoffMultiplier: joi_1.default.number().positive().default(2)
    }).default()
});
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    getConfig() {
        return this.config;
    }
    getAEMConfig() {
        return this.config.aem;
    }
    getServerConfig() {
        return this.config.server;
    }
    getSecurityConfig() {
        return this.config.security;
    }
    getLoggingConfig() {
        return this.config.logging;
    }
    getCacheConfig() {
        return this.config.cache;
    }
    getRetryConfig() {
        return this.config.retry;
    }
    loadConfig() {
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
        return validation_js_1.ValidationUtils.validateWithSchema(rawConfig, configSchema);
    }
    loadAuthConfig() {
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
    reloadConfig() {
        this.config = this.loadConfig();
    }
    /**
     * Validate configuration
     */
    validateConfig() {
        try {
            validation_js_1.ValidationUtils.validateWithSchema(this.config, configSchema);
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=index.js.map