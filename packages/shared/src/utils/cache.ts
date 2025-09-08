/**
 * Caching utilities for AEMaaCS MCP servers
 */

import { Logger } from './logger.js';
import { ConfigManager } from '../config/index.js';
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
export class MemoryCache implements CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats;
  private logger: Logger;
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.logger = Logger.getInstance();
    const configManager = ConfigManager.getInstance();
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

  async get<T>(key: string): Promise<T | null> {
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

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const entryTtl = ttl || this.config.ttl;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictEntries();
    }

    const entry: CacheEntry<T> = {
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

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size--;
      this.stats.deletes++;
      this.logger.debug(`Cache delete: ${key}`, { size: this.stats.size });
    }
    return deleted;
  }

  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.stats.deletes += size;
    this.logger.info(`Cache cleared: ${size} entries removed`);
  }

  async has(key: string): Promise<boolean> {
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

  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  async invalidatePattern(pattern: string): Promise<number> {
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

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private evictEntries(): void {
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

  private evictLRU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);

    for (const [key] of entries) {
      this.cache.delete(key);
      this.stats.size--;
    }

    this.logger.debug(`LRU eviction: ${entries.length} entries removed`);
  }

  private evictLFU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)
      .slice(0, count);

    for (const [key] of entries) {
      this.cache.delete(key);
      this.stats.size--;
    }

    this.logger.debug(`LFU eviction: ${entries.length} entries removed`);
  }

  private evictByTTL(count: number): void {
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

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private cleanupExpired(): void {
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

/**
 * Redis cache implementation (placeholder for future Redis support)
 */
export class RedisCache implements CacheManager {
  private logger: Logger;
  private _config: CacheConfig; // eslint-disable-line @typescript-eslint/no-unused-vars

  constructor(config?: Partial<CacheConfig>) {
    this.logger = Logger.getInstance();
    const configManager = ConfigManager.getInstance();
    this._config = { ...configManager.getCacheConfig(), ...config };
    
    // TODO: Initialize Redis connection
    this.logger.warn('Redis cache not yet implemented, falling back to memory cache');
  }

  async get<T>(_key: string): Promise<T | null> {
    // TODO: Implement Redis get
    throw new Error('Redis cache not implemented');
  }

  async set<T>(_key: string, _value: T, _ttl?: number): Promise<void> {
    // TODO: Implement Redis set
    throw new Error('Redis cache not implemented');
  }

  async delete(_key: string): Promise<boolean> {
    // TODO: Implement Redis delete
    throw new Error('Redis cache not implemented');
  }

  async clear(): Promise<void> {
    // TODO: Implement Redis clear
    throw new Error('Redis cache not implemented');
  }

  async has(_key: string): Promise<boolean> {
    // TODO: Implement Redis has
    throw new Error('Redis cache not implemented');
  }

  async getStats(): Promise<CacheStats> {
    // TODO: Implement Redis stats
    throw new Error('Redis cache not implemented');
  }

  async invalidatePattern(_pattern: string): Promise<number> {
    // TODO: Implement Redis pattern invalidation
    throw new Error('Redis cache not implemented');
  }
}

/**
 * Cache factory
 */
export class CacheFactory {
  private static instance: CacheManager;

  static getInstance(): CacheManager {
    if (!CacheFactory.instance) {
      const config = ConfigManager.getInstance().getCacheConfig();
      
      if (config.redis && config.redis.host) {
        try {
          CacheFactory.instance = new RedisCache(config);
        } catch (error) {
          Logger.getInstance().warn('Failed to initialize Redis cache, falling back to memory cache', error as Error);
          CacheFactory.instance = new MemoryCache(config);
        }
      } else {
        CacheFactory.instance = new MemoryCache(config);
      }
    }
    
    return CacheFactory.instance;
  }

  static setInstance(cache: CacheManager): void {
    CacheFactory.instance = cache;
  }
}

/**
 * Cacheable decorator for methods
 */
export function Cacheable(keyGenerator?: (args: any[]) => string, ttl?: number) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = CacheFactory.getInstance();

    descriptor.value = async function (...args: any[]) {
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
export function InvalidateCache(pattern: string) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = CacheFactory.getInstance();

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // Invalidate cache pattern after successful execution
      await cache.invalidatePattern(pattern);
      
      return result;
    };

    return descriptor;
  };
}