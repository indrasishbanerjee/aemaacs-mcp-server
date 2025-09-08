"use strict";
/**
 * Caching utilities for AEMaaCS MCP servers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheFactory = exports.RedisCache = exports.MemoryCache = void 0;
exports.Cacheable = Cacheable;
exports.InvalidateCache = InvalidateCache;
const logger_js_1 = require("./logger.js");
const index_js_1 = require("../config/index.js");
/**
 * In-memory LRU cache implementation
 */
class MemoryCache {
    constructor(config) {
        this.cache = new Map();
        this.logger = logger_js_1.Logger.getInstance();
        const configManager = index_js_1.ConfigManager.getInstance();
        this.config = { ...configManager.getCacheConfig(), ...config };
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            size: 0,
            maxSize: this.config.maxSize,
            hitRate: 0
        };
        // Start cleanup interval
        this.startCleanupInterval();
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
        // Check if entry has expired
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.stats.size--;
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.stats.hits++;
        this.updateHitRate();
        return entry.value;
    }
    async set(key, value, ttl) {
        const now = Date.now();
        const entryTtl = ttl || this.config.ttl;
        // Check if we need to evict entries
        if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
            this.evictEntries();
        }
        const entry = {
            value,
            timestamp: now,
            ttl: entryTtl,
            accessCount: 1,
            lastAccessed: now
        };
        const isUpdate = this.cache.has(key);
        this.cache.set(key, entry);
        if (!isUpdate) {
            this.stats.size++;
        }
        this.stats.sets++;
        this.logger.debug(`Cache set: ${key}`, { ttl: entryTtl, size: this.stats.size });
    }
    async delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.size--;
            this.stats.deletes++;
            this.logger.debug(`Cache delete: ${key}`, { size: this.stats.size });
        }
        return deleted;
    }
    async clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.stats.size = 0;
        this.stats.deletes += size;
        this.logger.info(`Cache cleared: ${size} entries removed`);
    }
    async has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.stats.size--;
            return false;
        }
        return true;
    }
    async getStats() {
        return { ...this.stats };
    }
    async invalidatePattern(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        this.stats.size -= count;
        this.stats.deletes += count;
        this.logger.info(`Cache pattern invalidation: ${pattern}`, {
            keysRemoved: count,
            remainingSize: this.stats.size
        });
        return count;
    }
    isExpired(entry) {
        return Date.now() - entry.timestamp > entry.ttl;
    }
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }
    evictEntries() {
        const entriesToEvict = Math.max(1, Math.floor(this.config.maxSize * 0.1)); // Evict 10%
        switch (this.config.strategy) {
            case 'lru':
                this.evictLRU(entriesToEvict);
                break;
            case 'lfu':
                this.evictLFU(entriesToEvict);
                break;
            case 'ttl':
                this.evictByTTL(entriesToEvict);
                break;
            default:
                this.evictLRU(entriesToEvict);
        }
    }
    evictLRU(count) {
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
            .slice(0, count);
        for (const [key] of entries) {
            this.cache.delete(key);
            this.stats.size--;
        }
        this.logger.debug(`LRU eviction: ${entries.length} entries removed`);
    }
    evictLFU(count) {
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.accessCount - b.accessCount)
            .slice(0, count);
        for (const [key] of entries) {
            this.cache.delete(key);
            this.stats.size--;
        }
        this.logger.debug(`LFU eviction: ${entries.length} entries removed`);
    }
    evictByTTL(count) {
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => {
            const aExpiry = a.timestamp + a.ttl;
            const bExpiry = b.timestamp + b.ttl;
            return aExpiry - bExpiry;
        })
            .slice(0, count);
        for (const [key] of entries) {
            this.cache.delete(key);
            this.stats.size--;
        }
        this.logger.debug(`TTL eviction: ${entries.length} entries removed`);
    }
    startCleanupInterval() {
        // Clean up expired entries every 5 minutes
        setInterval(() => {
            this.cleanupExpired();
        }, 5 * 60 * 1000);
    }
    cleanupExpired() {
        const now = Date.now();
        let removed = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }
        if (removed > 0) {
            this.stats.size -= removed;
            this.stats.deletes += removed;
            this.logger.debug(`Expired entries cleanup: ${removed} entries removed`);
        }
    }
}
exports.MemoryCache = MemoryCache;
/**
 * Redis cache implementation (placeholder for future Redis support)
 */
class RedisCache {
    constructor(config) {
        this.logger = logger_js_1.Logger.getInstance();
        const configManager = index_js_1.ConfigManager.getInstance();
        this._config = { ...configManager.getCacheConfig(), ...config };
        // TODO: Initialize Redis connection
        this.logger.warn('Redis cache not yet implemented, falling back to memory cache');
    }
    async get(_key) {
        // TODO: Implement Redis get
        throw new Error('Redis cache not implemented');
    }
    async set(_key, _value, _ttl) {
        // TODO: Implement Redis set
        throw new Error('Redis cache not implemented');
    }
    async delete(_key) {
        // TODO: Implement Redis delete
        throw new Error('Redis cache not implemented');
    }
    async clear() {
        // TODO: Implement Redis clear
        throw new Error('Redis cache not implemented');
    }
    async has(_key) {
        // TODO: Implement Redis has
        throw new Error('Redis cache not implemented');
    }
    async getStats() {
        // TODO: Implement Redis stats
        throw new Error('Redis cache not implemented');
    }
    async invalidatePattern(_pattern) {
        // TODO: Implement Redis pattern invalidation
        throw new Error('Redis cache not implemented');
    }
}
exports.RedisCache = RedisCache;
/**
 * Cache factory
 */
class CacheFactory {
    static getInstance() {
        if (!CacheFactory.instance) {
            const config = index_js_1.ConfigManager.getInstance().getCacheConfig();
            if (config.redis && config.redis.host) {
                try {
                    CacheFactory.instance = new RedisCache(config);
                }
                catch (error) {
                    logger_js_1.Logger.getInstance().warn('Failed to initialize Redis cache, falling back to memory cache', error);
                    CacheFactory.instance = new MemoryCache(config);
                }
            }
            else {
                CacheFactory.instance = new MemoryCache(config);
            }
        }
        return CacheFactory.instance;
    }
    static setInstance(cache) {
        CacheFactory.instance = cache;
    }
}
exports.CacheFactory = CacheFactory;
/**
 * Cacheable decorator for methods
 */
function Cacheable(keyGenerator, ttl) {
    return function (_target, _propertyName, descriptor) {
        const method = descriptor.value;
        const cache = CacheFactory.getInstance();
        descriptor.value = async function (...args) {
            const cacheKey = keyGenerator ? keyGenerator(args) : `${this.constructor.name}.${_propertyName}:${JSON.stringify(args)}`;
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached !== null) {
                return cached;
            }
            // Execute original method
            const result = await method.apply(this, args);
            // Cache the result
            await cache.set(cacheKey, result, ttl);
            return result;
        };
        return descriptor;
    };
}
/**
 * Cache invalidation decorator
 */
function InvalidateCache(pattern) {
    return function (_target, _propertyName, descriptor) {
        const method = descriptor.value;
        const cache = CacheFactory.getInstance();
        descriptor.value = async function (...args) {
            const result = await method.apply(this, args);
            // Invalidate cache pattern after successful execution
            await cache.invalidatePattern(pattern);
            return result;
        };
        return descriptor;
    };
}
//# sourceMappingURL=cache.js.map