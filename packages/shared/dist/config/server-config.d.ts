/**
 * Server Configuration Management
 * Handles configuration loading, validation, and environment variable support
 */
export interface AEMConnectionConfig {
    host: string;
    port?: number;
    protocol: 'http' | 'https';
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}
export interface ServerConfig {
    server: {
        port: number;
        host: string;
        cors: {
            enabled: boolean;
            origins: string[];
        };
        rateLimit: {
            enabled: boolean;
            windowMs: number;
            maxRequests: number;
        };
    };
    aem: AEMConnectionConfig;
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        format: 'json' | 'text';
        file?: string;
    };
    security: {
        apiKeys?: string[];
        allowedIPs?: string[];
        requireAuth: boolean;
    };
}
export interface ReadServerConfig extends ServerConfig {
    cache: {
        enabled: boolean;
        ttl: number;
        maxSize: number;
    };
}
export interface WriteServerConfig extends ServerConfig {
    validation: {
        strict: boolean;
        allowDangerousOperations: boolean;
    };
    backup: {
        enabled: boolean;
        retentionDays: number;
    };
}
export declare class ConfigManager {
    private static instance;
    private logger;
    private constructor();
    static getInstance(): ConfigManager;
    /**
     * Load configuration for read server
     */
    loadReadServerConfig(): ReadServerConfig;
    /**
     * Load configuration for write server
     */
    loadWriteServerConfig(): WriteServerConfig;
    /**
     * Load AEM connection configuration
     */
    private loadAEMConfig;
    /**
     * Load logging configuration
     */
    private loadLoggingConfig;
    /**
     * Load security configuration
     */
    private loadSecurityConfig;
    /**
     * Validate configuration
     */
    private validateConfig;
    /**
     * Get environment variable as string
     */
    private getEnvString;
    /**
     * Get environment variable as number
     */
    private getEnvNumber;
    /**
     * Get environment variable as boolean
     */
    private getEnvBoolean;
    /**
     * Get environment variable as array
     */
    private getEnvArray;
}
//# sourceMappingURL=server-config.d.ts.map