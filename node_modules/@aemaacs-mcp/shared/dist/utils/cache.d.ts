/**
 * Caching utilities for AEMaaCS MCP servers
 */
import { CacheConfig } from '../config/index.js';
export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
}
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    size: number;
    maxSize: number;
    hitRate: number;
}
export interface CacheManager {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    getStats(): Promise<CacheStats>;
    invalidatePattern(pattern: string): Promise<number>;
}
/**
 * In-memory LRU cache implementation
 */
export declare class MemoryCache implements CacheManager {
    private cache;
    private stats;
    private logger;
    private config;
    constructor(config?: Partial<CacheConfig>);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    getStats(): Promise<CacheStats>;
    invalidatePattern(pattern: string): Promise<number>;
    private isExpired;
    private updateHitRate;
    private evictEntries;
    private evictLRU;
    private evictLFU;
    private evictByTTL;
    private startCleanupInterval;
    private cleanupExpired;
}
/**
 * Redis cache implementation (placeholder for future Redis support)
 */
export declare class RedisCache implements CacheManager {
    private logger;
    private _config;
    constructor(config?: Partial<CacheConfig>);
    get<T>(_key: string): Promise<T | null>;
    set<T>(_key: string, _value: T, _ttl?: number): Promise<void>;
    delete(_key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(_key: string): Promise<boolean>;
    getStats(): Promise<CacheStats>;
    invalidatePattern(_pattern: string): Promise<number>;
}
/**
 * Cache factory
 */
export declare class CacheFactory {
    private static instance;
    static getInstance(): CacheManager;
    static setInstance(cache: CacheManager): void;
}
/**
 * Cacheable decorator for methods
 */
export declare function Cacheable(keyGenerator?: (args: any[]) => string, ttl?: number): (_target: any, _propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Cache invalidation decorator
 */
export declare function InvalidateCache(pattern: string): (_target: any, _propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=cache.d.ts.map