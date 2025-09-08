"use strict";
/**
 * Security middleware for AEMaaCS MCP servers
 * Implements request validation, rate limiting, and audit logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMiddleware = void 0;
exports.createSecurityMiddleware = createSecurityMiddleware;
exports.createSecurityMiddlewares = createSecurityMiddlewares;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const validation_js_1 = require("../utils/validation.js");
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = require("../config/index.js");
const errors_js_1 = require("../utils/errors.js");
const aem_js_1 = require("../types/aem.js");
const crypto_1 = require("crypto");
class SecurityMiddleware {
    constructor(options) {
        this.logger = logger_js_1.Logger.getInstance();
        const configManager = index_js_1.ConfigManager.getInstance();
        const securityConfig = configManager.getSecurityConfig();
        this.config = {
            enableInputValidation: true,
            enableAuditLogging: true,
            enableRateLimit: true,
            maxRequestSize: '10mb',
            allowedFileTypes: securityConfig.allowedFileTypes,
            maxFileSize: securityConfig.maxFileSize,
            ...options
        };
    }
    /**
     * Create rate limiting middleware
     */
    createRateLimitMiddleware() {
        if (!this.config.enableRateLimit) {
            return (_req, _res, next) => next();
        }
        const configManager = index_js_1.ConfigManager.getInstance();
        const serverConfig = configManager.getServerConfig();
        return (0, express_rate_limit_1.default)({
            windowMs: serverConfig.rateLimit.windowMs,
            max: serverConfig.rateLimit.maxRequests,
            message: {
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests from this IP, please try again later.',
                    recoverable: true,
                    retryAfter: Math.ceil(serverConfig.rateLimit.windowMs / 1000)
                }
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                const context = this.createOperationContext(req, 'rate_limit_exceeded');
                this.logger.logSecurityEvent('Rate limit exceeded', context, {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path
                });
                res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many requests from this IP, please try again later.',
                        recoverable: true,
                        retryAfter: Math.ceil(serverConfig.rateLimit.windowMs / 1000)
                    }
                });
            }
        });
    }
    /**
     * Input validation middleware
     */
    validateInput() {
        return (req, res, next) => {
            if (!this.config.enableInputValidation) {
                return next();
            }
            try {
                const context = this.createOperationContext(req, 'input_validation');
                // Validate and sanitize request body
                if (req.body) {
                    req.body = validation_js_1.ValidationUtils.sanitizeInput(req.body);
                }
                // Validate and sanitize query parameters
                if (req.query) {
                    req.query = validation_js_1.ValidationUtils.sanitizeInput(req.query);
                }
                // Validate paths in request
                this.validateRequestPaths(req);
                // Validate file uploads if present
                if (req.files || req.file) {
                    this.validateFileUploads(req);
                }
                // Log successful validation
                if (this.config.enableAuditLogging) {
                    this.logger.debug('Input validation passed', {
                        requestId: context.requestId,
                        path: req.path,
                        method: req.method
                    });
                }
                next();
            }
            catch (error) {
                const context = this.createOperationContext(req, 'input_validation_failed');
                this.logger.logSecurityEvent('Input validation failed', context, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    path: req.path,
                    method: req.method
                });
                if (error instanceof errors_js_1.AEMException) {
                    res.status(400).json({
                        success: false,
                        error: error.toAEMError()
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: aem_js_1.ErrorType.VALIDATION_ERROR,
                            message: 'Input validation failed',
                            recoverable: false
                        }
                    });
                }
            }
        };
    }
    /**
     * Path traversal protection middleware
     */
    preventPathTraversal() {
        return (req, res, next) => {
            const context = this.createOperationContext(req, 'path_traversal_check');
            try {
                // Check URL path
                if (this.containsPathTraversal(req.path)) {
                    throw new errors_js_1.AEMException('Path traversal attempt detected in URL', aem_js_1.ErrorType.VALIDATION_ERROR, false);
                }
                // Check query parameters
                for (const [key, value] of Object.entries(req.query)) {
                    if (typeof value === 'string' && this.containsPathTraversal(value)) {
                        throw new errors_js_1.AEMException(`Path traversal attempt detected in query parameter: ${key}`, aem_js_1.ErrorType.VALIDATION_ERROR, false);
                    }
                }
                // Check request body paths
                if (req.body && typeof req.body === 'object') {
                    this.checkObjectForPathTraversal(req.body);
                }
                next();
            }
            catch (error) {
                this.logger.logSecurityEvent('Path traversal attempt detected', context, {
                    path: req.path,
                    query: req.query,
                    body: req.body,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
                if (error instanceof errors_js_1.AEMException) {
                    res.status(400).json({
                        success: false,
                        error: error.toAEMError()
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: aem_js_1.ErrorType.VALIDATION_ERROR,
                            message: 'Invalid request detected',
                            recoverable: false
                        }
                    });
                }
            }
        };
    }
    /**
     * Audit logging middleware
     */
    auditLogger() {
        return (req, res, next) => {
            if (!this.config.enableAuditLogging) {
                return next();
            }
            const context = this.createOperationContext(req, req.path);
            const startTime = Date.now();
            // Log request start
            this.logger.logOperationStart(req.method + ' ' + req.path, context);
            // Override res.end to capture response
            const originalEnd = res.end.bind(res);
            res.end = function (chunk, encoding, cb) {
                const duration = Date.now() - startTime;
                const success = res.statusCode < 400;
                // Log operation completion
                logger_js_1.Logger.getInstance().logOperationComplete(req.method + ' ' + req.path, context, duration, success);
                // Call original end method
                return originalEnd(chunk, encoding, cb);
            };
            next();
        };
    }
    /**
     * Request size limiting middleware
     */
    limitRequestSize() {
        return (req, res, next) => {
            const contentLength = req.get('content-length');
            if (contentLength) {
                const size = parseInt(contentLength);
                const maxSize = this.parseSize(this.config.maxRequestSize || '10mb');
                if (size > maxSize) {
                    const context = this.createOperationContext(req, 'request_size_exceeded');
                    this.logger.logSecurityEvent('Request size exceeded', context, {
                        contentLength: size,
                        maxSize,
                        path: req.path
                    });
                    res.status(413).json({
                        success: false,
                        error: {
                            code: aem_js_1.ErrorType.VALIDATION_ERROR,
                            message: `Request size exceeds maximum limit (${this.config.maxRequestSize})`,
                            recoverable: false
                        }
                    });
                    return;
                }
            }
            next();
        };
    }
    /**
     * Injection attack prevention middleware
     */
    preventInjectionAttacks() {
        return (req, res, next) => {
            const context = this.createOperationContext(req, 'injection_check');
            try {
                // Check for SQL injection patterns
                this.checkForSQLInjection(req);
                // Check for XSS patterns
                this.checkForXSS(req);
                // Check for command injection patterns
                this.checkForCommandInjection(req);
                next();
            }
            catch (error) {
                this.logger.logSecurityEvent('Injection attack detected', context, {
                    path: req.path,
                    query: req.query,
                    body: req.body,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                if (error instanceof errors_js_1.AEMException) {
                    res.status(400).json({
                        success: false,
                        error: error.toAEMError()
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: aem_js_1.ErrorType.VALIDATION_ERROR,
                            message: 'Potentially malicious request detected',
                            recoverable: false
                        }
                    });
                }
            }
        };
    }
    /**
     * Create operation context for logging
     */
    createOperationContext(req, operation) {
        return {
            requestId: req.headers['x-request-id'] || (0, crypto_1.randomUUID)(),
            userId: req.headers['x-user-id'],
            operation,
            resource: req.path,
            timestamp: new Date()
        };
    }
    /**
     * Validate request paths
     */
    validateRequestPaths(req) {
        // Check common path parameters
        const pathParams = ['path', 'pagePath', 'contentPath', 'assetPath', 'packagePath'];
        for (const param of pathParams) {
            const value = req.body?.[param] || req.query?.[param];
            if (value && typeof value === 'string') {
                const result = validation_js_1.ValidationUtils.validatePath(value);
                if (!result.valid) {
                    throw new errors_js_1.AEMException(`Invalid ${param}: ${result.errors?.join(', ')}`, aem_js_1.ErrorType.VALIDATION_ERROR, false);
                }
            }
        }
    }
    /**
     * Validate file uploads
     */
    validateFileUploads(req) {
        const reqWithFiles = req;
        const files = reqWithFiles.files || (reqWithFiles.file ? [reqWithFiles.file] : []);
        for (const file of Array.isArray(files) ? files : Object.values(files).flat()) {
            if (file && typeof file === 'object' && 'buffer' in file) {
                const result = validation_js_1.ValidationUtils.validateFileUpload(file.buffer, {
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size
                });
                if (!result.valid) {
                    throw new errors_js_1.AEMException(`File validation failed: ${result.errors?.join(', ')}`, aem_js_1.ErrorType.VALIDATION_ERROR, false);
                }
            }
        }
    }
    /**
     * Check if string contains path traversal patterns
     */
    containsPathTraversal(str) {
        const patterns = [
            /\.\./,
            /\/\.\./,
            /\.\.\//,
            /\/\/+/,
            /%2e%2e/i,
            /%2f%2e%2e/i,
            /%2e%2e%2f/i
        ];
        return patterns.some(pattern => pattern.test(str));
    }
    /**
     * Recursively check object for path traversal
     */
    checkObjectForPathTraversal(obj, path = '') {
        if (typeof obj === 'string') {
            if (this.containsPathTraversal(obj)) {
                throw new errors_js_1.AEMException(`Path traversal attempt detected in ${path}`, aem_js_1.ErrorType.VALIDATION_ERROR, false);
            }
        }
        else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                this.checkObjectForPathTraversal(value, path ? `${path}.${key}` : key);
            }
        }
    }
    /**
     * Check for SQL injection patterns
     */
    checkForSQLInjection(req) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
            /(;|\|\||&&)/,
            /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i
        ];
        this.checkPatternsInRequest(req, sqlPatterns, 'SQL injection');
    }
    /**
     * Check for XSS patterns
     */
    checkForXSS(req) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe\b/i,
            /<object\b/i,
            /<embed\b/i
        ];
        this.checkPatternsInRequest(req, xssPatterns, 'XSS');
    }
    /**
     * Check for command injection patterns
     */
    checkForCommandInjection(req) {
        const cmdPatterns = [
            /(\||&|;|\$\(|\`)/,
            /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig)\b/i,
            /\b(rm|mv|cp|chmod|chown|kill)\b/i
        ];
        this.checkPatternsInRequest(req, cmdPatterns, 'Command injection');
    }
    /**
     * Check patterns in request data
     */
    checkPatternsInRequest(req, patterns, attackType) {
        const checkString = (str, location) => {
            for (const pattern of patterns) {
                if (pattern.test(str)) {
                    throw new errors_js_1.AEMException(`${attackType} pattern detected in ${location}`, aem_js_1.ErrorType.VALIDATION_ERROR, false);
                }
            }
        };
        // Check query parameters
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
                checkString(value, `query parameter ${key}`);
            }
        }
        // Check request body
        if (req.body && typeof req.body === 'object') {
            this.checkObjectForPatterns(req.body, patterns, attackType);
        }
    }
    /**
     * Recursively check object for malicious patterns
     */
    checkObjectForPatterns(obj, patterns, attackType, path = '') {
        if (typeof obj === 'string') {
            for (const pattern of patterns) {
                if (pattern.test(obj)) {
                    throw new errors_js_1.AEMException(`${attackType} pattern detected in ${path}`, aem_js_1.ErrorType.VALIDATION_ERROR, false);
                }
            }
        }
        else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                this.checkObjectForPatterns(value, patterns, attackType, path ? `${path}.${key}` : key);
            }
        }
    }
    /**
     * Parse size string to bytes
     */
    parseSize(size) {
        const units = {
            'b': 1,
            'k': 1024,
            'm': 1024 * 1024,
            'g': 1024 * 1024 * 1024
        };
        const match = size.toLowerCase().match(/^(\d+)([bkmg]?)$/);
        if (!match) {
            return 10 * 1024 * 1024; // Default 10MB
        }
        const [, num, unit] = match;
        const numValue = parseInt(num || '10');
        const unitMultiplier = units[unit || 'b'] || 1;
        return numValue * unitMultiplier;
    }
}
exports.SecurityMiddleware = SecurityMiddleware;
/**
 * Factory function to create security middleware with default configuration
 */
function createSecurityMiddleware(options) {
    return new SecurityMiddleware(options);
}
/**
 * Express middleware factory functions
 */
function createSecurityMiddlewares(options) {
    const security = new SecurityMiddleware(options);
    return {
        rateLimit: security.createRateLimitMiddleware(),
        validateInput: security.validateInput(),
        preventPathTraversal: security.preventPathTraversal(),
        auditLogger: security.auditLogger(),
        limitRequestSize: security.limitRequestSize(),
        preventInjectionAttacks: security.preventInjectionAttacks()
    };
}
//# sourceMappingURL=security.js.map