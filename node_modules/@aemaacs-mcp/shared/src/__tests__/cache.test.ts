/**
 * Tests for cache utilities
 */

import { MemoryCache, CacheFactory } from '../utils/cache.js';
import { Logger } from '../utils/logger.js';
import { ConfigManager } from '../config/index.js';

// Mock dependencies
jest.mock('../utils/logger.js');
jest.mock('../config/index.js');

describe('MemoryCache', () => {
  let cache: MemoryCache;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    const mockConfigManager = {
      getCacheConfig: jest.fn().mockReturnValue({
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 100,
        strategy: 'lru'
      })
    };
    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    cache = new MemoryCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      
      expect(value).toBe('value1');
      
      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('nonexistent');
      
      expect(value).toBeNull();
      
      const stats = await cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it('should check if key exists', async () => {
      await cache.set('key1', 'value1');
      
      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('nonexistent')).toBe(false);
    });

    it('should delete values', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
      
      const deleted = await cache.delete('key1');
      expect(deleted).toBe(true);
      expect(await cache.has('key1')).toBe(false);
      
      const deletedAgain = await cache.delete('key1');
      expect(deletedAgain).toBe(false);
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('key2')).toBe(true);
      
      await cache.clear();
      
      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
      
      const stats = await cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('key1', 'value1', 100); // 100ms TTL
      
      expect(await cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.has('key1')).toBe(false);
    });

    it('should use default TTL when not specified', async () => {
      await cache.set('key1', 'value1'); // Uses default TTL
      
      expect(await cache.get('key1')).toBe('value1');
    });

    it('should handle custom TTL per entry', async () => {
      await cache.set('short', 'value1', 50);
      await cache.set('long', 'value2', 200);
      
      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await cache.get('short')).toBeNull();
      expect(await cache.get('long')).toBe('value2');
    });
  });

  describe('eviction strategies', () => {
    beforeEach(() => {
      // Create cache with small max size for testing eviction
      cache = new MemoryCache({ maxSize: 3 });
    });

    it('should evict LRU entries when cache is full', async () => {
      // Fill cache to capacity
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      // Access key1 to make it recently used
      await cache.get('key1');
      
      // Add new entry, should evict key2 (least recently used)
      await cache.set('key4', 'value4');
      
      expect(await cache.has('key1')).toBe(true); // Recently accessed
      expect(await cache.has('key2')).toBe(false); // Should be evicted
      expect(await cache.has('key3')).toBe(true);
      expect(await cache.has('key4')).toBe(true);
    });

    it('should evict LFU entries when strategy is LFU', async () => {
      cache = new MemoryCache({ maxSize: 3, strategy: 'lfu' });
      
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      // Access key1 multiple times
      await cache.get('key1');
      await cache.get('key1');
      await cache.get('key2'); // Access once
      
      // Add new entry, should evict key3 (least frequently used)
      await cache.set('key4', 'value4');
      
      expect(await cache.has('key1')).toBe(true); // Most frequently used
      expect(await cache.has('key2')).toBe(true); // Used once
      expect(await cache.has('key3')).toBe(false); // Should be evicted (never accessed after set)
      expect(await cache.has('key4')).toBe(true);
    });
  });

  describe('pattern invalidation', () => {
    it('should invalidate keys matching pattern', async () => {
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('page:1', 'page1');
      await cache.set('page:2', 'page2');
      
      const invalidated = await cache.invalidatePattern('user:*');
      
      expect(invalidated).toBe(2);
      expect(await cache.has('user:1')).toBe(false);
      expect(await cache.has('user:2')).toBe(false);
      expect(await cache.has('page:1')).toBe(true);
      expect(await cache.has('page:2')).toBe(true);
    });

    it('should handle complex patterns', async () => {
      await cache.set('api/v1/users', 'users');
      await cache.set('api/v1/pages', 'pages');
      await cache.set('api/v2/users', 'users_v2');
      await cache.set('static/css/main.css', 'css');
      
      const invalidated = await cache.invalidatePattern('api/v1/*');
      
      expect(invalidated).toBe(2);
      expect(await cache.has('api/v1/users')).toBe(false);
      expect(await cache.has('api/v1/pages')).toBe(false);
      expect(await cache.has('api/v2/users')).toBe(true);
      expect(await cache.has('static/css/main.css')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.get('key1'); // Hit
      await cache.get('key1'); // Hit
      await cache.get('nonexistent'); // Miss
      
      await cache.delete('key2');
      
      const stats = await cache.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBe(2/3); // 2 hits out of 3 total requests
    });

    it('should calculate hit rate correctly', async () => {
      await cache.set('key1', 'value1');
      
      // 3 hits, 2 misses
      await cache.get('key1');
      await cache.get('key1');
      await cache.get('key1');
      await cache.get('nonexistent1');
      await cache.get('nonexistent2');
      
      const stats = await cache.getStats();
      expect(stats.hitRate).toBe(0.6); // 3/5
    });
  });

  describe('data types', () => {
    it('should handle different data types', async () => {
      const testData = {
        string: 'test',
        number: 42,
        boolean: true,
        object: { nested: 'value' },
        array: [1, 2, 3],
        null: null,
        undefined: undefined
      };
      
      for (const [key, value] of Object.entries(testData)) {
        await cache.set(key, value);
        const retrieved = await cache.get(key);
        expect(retrieved).toEqual(value);
      }
    });
  });
});

describe('CacheFactory', () => {
  beforeEach(() => {
    // Reset singleton
    CacheFactory.setInstance(null as any);
  });

  it('should create memory cache by default', () => {
    const mockConfigManager = {
      getCacheConfig: jest.fn().mockReturnValue({
        enabled: true,
        ttl: 300000,
        maxSize: 100,
        strategy: 'lru'
      })
    };
    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    const cache = CacheFactory.getInstance();
    expect(cache).toBeInstanceOf(MemoryCache);
  });

  it('should return same instance on subsequent calls', () => {
    const mockConfigManager = {
      getCacheConfig: jest.fn().mockReturnValue({
        enabled: true,
        ttl: 300000,
        maxSize: 100,
        strategy: 'lru'
      })
    };
    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    const cache1 = CacheFactory.getInstance();
    const cache2 = CacheFactory.getInstance();
    
    expect(cache1).toBe(cache2);
  });
});

// Decorator tests commented out due to TypeScript complexity
// TODO: Implement proper decorator testing with experimental decorators enabled

/*
describe('Cacheable decorator', () => {
  // Tests would go here when decorator support is properly configured
});

describe('InvalidateCache decorator', () => {
  // Tests would go here when decorator support is properly configured
});
*/