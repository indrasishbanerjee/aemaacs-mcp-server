"use strict";
/**
 * AEMaaCS HTTP client with authentication and advanced features
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AEMHttpClient = void 0;
exports.createAEMHttpClient = createAEMHttpClient;
const axios_1 = __importDefault(require("axios"));
const http_1 = require("http");
const https_1 = require("https");
const aem_js_1 = require("../types/aem.js");
const logger_js_1 = require("../utils/logger.js");
const errors_js_1 = require("../utils/errors.js");
const circuit_breaker_js_1 = require("../utils/circuit-breaker.js");
const cache_js_1 = require("../utils/cache.js");
const response_processor_js_1 = require("../utils/response-processor.js");
const index_js_1 = require("../config/index.js");
const crypto_1 = require("crypto");
class AEMHttpClient {
    constructor(options = {}) {
        this.config = options.config || index_js_1.ConfigManager.getInstance().getAEMConfig();
        this.logger = logger_js_1.Logger.getInstance();
        this.performanceMonitor = logger_js_1.PerformanceMonitor.getInstance();
        this.responseProcessor = new response_processor_js_1.ResponseProcessor();
        // Initialize cache if enabled
        if (options.enableCaching !== false) {
            this.cache = cache_js_1.CacheFactory.getInstance();
        }
        // Initialize circuit breaker if enabled
        if (options.enableCircuitBreaker !== false) {
            this.circuitBreaker = circuit_breaker_js_1.CircuitBreakerRegistry.getInstance().getCircuitBreaker(`aem-${this.config.host}:${this.config.port}`, {
                failureThreshold: 5,
                recoveryTimeout: 60000,
                monitoringPeriod: 300000
            });
        }
        // Initialize retry handler if enabled
        if (options.enableRetry !== false) {
            const retryConfig = {
                maxAttempts: this.config.retryAttempts,
                baseDelay: 1000,
                maxDelay: 30000,
                backoffMultiplier: 2,
                retryableErrors: [aem_js_1.ErrorType.NETWORK_ERROR, aem_js_1.ErrorType.TIMEOUT_ERROR, aem_js_1.ErrorType.SERVER_ERROR]
            };
            this.retryHandler = new errors_js_1.RetryHandler(retryConfig);
        }
        // Create axios instance
        this.axiosInstance = this.createAxiosInstance(options);
        // Set up interceptors
        this.setupRequestInterceptors();
        this.setupResponseInterceptors();
    }
    /**
     * Perform GET request
     */
    async get(path, params, options) {
        return this.request('GET', path, undefined, { ...options, params });
    }
    /**
     * Perform POST request
     */
    async post(path, data, options) {
        return this.request('POST', path, data, options);
    }
    /**
     * Perform PUT request
     */
    async put(path, data, options) {
        return this.request('PUT', path, data, options);
    }
    /**
     * Perform DELETE request
     */
    async delete(path, options) {
        return this.request('DELETE', path, undefined, options);
    }
    /**
     * Upload file
     */
    async upload(path, file, metadata, options) {
        const formData = new FormData();
        // Add file
        const blob = new Blob([file], { type: metadata?.mimeType || 'application/octet-stream' });
        formData.append('file', blob, metadata?.filename || 'upload');
        // Add metadata
        if (metadata) {
            for (const [key, value] of Object.entries(metadata)) {
                if (key !== 'filename' && key !== 'mimeType') {
                    formData.append(key, String(value));
                }
            }
        }
        return this.request('POST', path, formData, {
            ...options,
            headers: {
                'Content-Type': 'multipart/form-data',
                ...options?.headers
            }
        });
    }
    /**
     * Generic request method
     */
    async request(method, path, data, options = {}) {
        const context = {
            requestId: (0, crypto_1.randomUUID)(),
            operation: `${method} ${path}`,
            resource: path,
            timestamp: new Date(),
            ...options.context
        };
        const timer = this.performanceMonitor.startOperation(context.requestId, context.operation);
        try {
            // Check cache for GET requests
            if (method === 'GET' && options.cache !== false && this.cache) {
                const cacheKey = this.generateCacheKey(method, path, options.params);
                const cached = await this.cache.get(cacheKey);
                if (cached !== null) {
                    const duration = timer.end(true);
                    this.logger.debug('Cache hit', {
                        requestId: context.requestId,
                        cacheKey,
                        duration
                    });
                    return this.responseProcessor.processSuccess(cached, context.requestId, duration, true);
                }
            }
            // Execute request with circuit breaker and retry
            const executeRequest = async () => {
                await this.ensureAuthenticated();
                const requestConfig = {
                    method,
                    url: this.buildUrl(path),
                    data,
                    params: options.params,
                    timeout: options.timeout || this.config.timeout,
                    headers: {
                        ...this.getAuthHeaders(),
                        ...options.headers
                    }
                };
                return this.axiosInstance.request(requestConfig);
            };
            let response;
            // Use circuit breaker if enabled
            if (this.circuitBreaker && options.circuitBreaker !== false) {
                response = await this.circuitBreaker.execute(executeRequest);
            }
            else {
                response = await executeRequest();
            }
            // Use retry handler if enabled
            if (this.retryHandler && options.retries !== 0) {
                response = await this.retryHandler.executeWithRetry(() => this.circuitBreaker ? this.circuitBreaker.execute(executeRequest) : executeRequest(), context);
            }
            // Process AEM-specific response
            const processedData = this.responseProcessor.processAEMResponse(response.data, context.operation);
            // Cache successful GET responses
            if (method === 'GET' && options.cache !== false && this.cache) {
                const cacheKey = this.generateCacheKey(method, path, options.params);
                const ttl = options.cacheTtl || 300000; // 5 minutes default
                await this.cache.set(cacheKey, processedData, ttl);
            }
            const duration = timer.end(true);
            return this.responseProcessor.processSuccess(processedData, context.requestId, duration, false);
        }
        catch (error) {
            const duration = timer.end(false);
            this.logger.error('AEM request failed', error, {
                requestId: context.requestId,
                method,
                path,
                duration
            });
            return this.responseProcessor.processError(error, context.requestId, duration);
        }
    }
    /**
     * Create axios instance with configuration
     */
    createAxiosInstance(options) {
        const config = {
            baseURL: `${this.config.protocol}://${this.config.host}:${this.config.port}${this.config.basePath || ''}`,
            timeout: this.config.timeout,
            maxRedirects: 5,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        };
        // Configure connection pooling
        if (options.connectionPooling !== false) {
            const httpAgent = new http_1.Agent({
                keepAlive: true,
                maxSockets: 10,
                maxFreeSockets: 5,
                timeout: 60000
            });
            const httpsAgent = new https_1.Agent({
                keepAlive: true,
                maxSockets: 10,
                maxFreeSockets: 5,
                timeout: 60000,
                rejectUnauthorized: true
            });
            config.httpAgent = httpAgent;
            config.httpsAgent = httpsAgent;
        }
        return axios_1.default.create(config);
    }
    /**
     * Setup request interceptors
     */
    setupRequestInterceptors() {
        this.axiosInstance.interceptors.request.use((config) => {
            const requestId = (0, crypto_1.randomUUID)();
            config.headers['X-Request-ID'] = requestId;
            config.metadata = { requestId, startTime: Date.now() };
            this.logger.debug('AEM request started', {
                requestId,
                method: config.method?.toUpperCase(),
                url: config.url,
                params: config.params
            });
            return config;
        }, (error) => {
            this.logger.error('Request interceptor error', error);
            return Promise.reject(error);
        });
    }
    /**
     * Setup response interceptors
     */
    setupResponseInterceptors() {
        this.axiosInstance.interceptors.response.use((response) => {
            const requestId = response.config.metadata?.requestId;
            const startTime = response.config.metadata?.startTime;
            const duration = startTime ? Date.now() - startTime : 0;
            this.logger.debug('AEM request completed', {
                requestId,
                status: response.status,
                duration,
                url: response.config.url
            });
            return response;
        }, (error) => {
            const requestId = error.config?.metadata?.requestId;
            const startTime = error.config?.metadata?.startTime;
            const duration = startTime ? Date.now() - startTime : 0;
            this.logger.error('AEM request failed', error, {
                requestId,
                status: error.response?.status,
                duration,
                url: error.config?.url,
                message: error.message
            });
            return Promise.reject(error);
        });
    }
    /**
     * Ensure authentication is valid
     */
    async ensureAuthenticated() {
        if (this.config.authentication.type === 'basic') {
            // Basic auth is handled in headers
            return;
        }
        if (this.config.authentication.type === 'oauth' || this.config.authentication.type === 'service-account') {
            // Check if token is expired
            if (!this.authToken || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
                await this.refreshAuthToken();
            }
        }
    }
    /**
     * Refresh authentication token
     */
    async refreshAuthToken() {
        const auth = this.config.authentication;
        try {
            if (auth.type === 'oauth') {
                await this.refreshOAuthToken(auth);
            }
            else if (auth.type === 'service-account') {
                await this.refreshServiceAccountToken(auth);
            }
        }
        catch (error) {
            this.logger.error('Failed to refresh auth token', error);
            throw new errors_js_1.AEMException('Authentication failed', 'AUTHENTICATION_ERROR', false, undefined, { originalError: error });
        }
    }
    /**
     * Refresh OAuth token
     */
    async refreshOAuthToken(auth) {
        // Implementation depends on AEMaaCS OAuth flow
        // This is a placeholder for the actual OAuth implementation
        this.logger.warn('OAuth token refresh not yet implemented');
        // For now, use the provided access token if available
        if (auth.accessToken) {
            this.authToken = auth.accessToken;
            this.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        }
    }
    /**
     * Refresh service account token
     */
    async refreshServiceAccountToken(auth) {
        // Implementation depends on AEMaaCS service account flow
        // This is a placeholder for the actual service account implementation
        this.logger.warn('Service account token refresh not yet implemented');
        // For now, use the provided access token if available
        if (auth.accessToken) {
            this.authToken = auth.accessToken;
            this.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        }
    }
    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const auth = this.config.authentication;
        const headers = {};
        switch (auth.type) {
            case 'basic':
                if (auth.username && auth.password) {
                    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
            case 'oauth':
            case 'service-account':
                if (this.authToken) {
                    headers['Authorization'] = `Bearer ${this.authToken}`;
                }
                break;
        }
        return headers;
    }
    /**
     * Build full URL
     */
    buildUrl(path) {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return cleanPath;
    }
    /**
     * Generate cache key
     */
    generateCacheKey(method, path, params) {
        const paramsStr = params ? JSON.stringify(params) : '';
        return `aem:${method}:${path}:${Buffer.from(paramsStr).toString('base64')}`;
    }
    /**
     * Get client statistics
     */
    getStats() {
        const stats = {};
        if (this.circuitBreaker) {
            stats.circuitBreaker = this.circuitBreaker.getStats();
        }
        if (this.cache) {
            stats.cache = this.cache.getStats();
        }
        stats.performance = this.performanceMonitor.getMetrics();
        return stats;
    }
    /**
     * Clear cache
     */
    async clearCache(pattern) {
        if (this.cache) {
            if (pattern) {
                await this.cache.invalidatePattern(pattern);
            }
            else {
                await this.cache.clear();
            }
        }
    }
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker() {
        if (this.circuitBreaker) {
            this.circuitBreaker.reset();
        }
    }
    /**
     * Close client and cleanup resources
     */
    async close() {
        // Close any open connections
        if (this.axiosInstance.defaults.httpAgent) {
            this.axiosInstance.defaults.httpAgent.destroy();
        }
        if (this.axiosInstance.defaults.httpsAgent) {
            this.axiosInstance.defaults.httpsAgent.destroy();
        }
        this.logger.info('AEM HTTP client closed');
    }
}
exports.AEMHttpClient = AEMHttpClient;
/**
 * Factory function to create AEM HTTP client
 */
function createAEMHttpClient(options) {
    return new AEMHttpClient(options);
}
//# sourceMappingURL=aem-http-client.js.map