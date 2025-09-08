/**
 * Tests for validation utilities
 */

import { ValidationUtils } from '../utils/validation.js';

describe('ValidationUtils', () => {
  describe('validatePath', () => {
    it('should validate correct AEM paths', () => {
      const result = ValidationUtils.validatePath('/content/mysite/en');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('/content/mysite/en');
    });

    it('should add leading slash if missing', () => {
      const result = ValidationUtils.validatePath('content/mysite/en');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('/content/mysite/en');
    });

    it('should reject paths with path traversal', () => {
      const result = ValidationUtils.validatePath('/content/../admin');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path contains invalid characters (path traversal detected)');
    });

    it('should reject empty paths', () => {
      const result = ValidationUtils.validatePath('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path is required and must be a string');
    });
  });

  describe('validateJCRQuery', () => {
    it('should validate safe JCR queries', () => {
      const result = ValidationUtils.validateJCRQuery('SELECT * FROM [nt:base] WHERE ISDESCENDANTNODE("/content")');
      expect(result.valid).toBe(true);
    });

    it('should reject dangerous SQL injection patterns', () => {
      const result = ValidationUtils.validateJCRQuery('SELECT * FROM [nt:base]; DROP TABLE users;');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query contains potentially dangerous patterns');
    });

    it('should reject script injection attempts', () => {
      const result = ValidationUtils.validateJCRQuery('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query contains potentially dangerous patterns');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags from strings', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = ValidationUtils.sanitizeInput(input);
      expect(result).toBe('Hello  World');
    });

    it('should handle nested objects', () => {
      const input = {
        title: 'Test <script>alert("xss")</script>',
        nested: {
          value: 'Safe content'
        }
      };
      const result = ValidationUtils.sanitizeInput(input);
      expect(result.title).toBe('Test ');
      expect(result.nested.value).toBe('Safe content');
    });

    it('should skip dangerous property names', () => {
      const input = {
        title: 'Safe',
        __proto__: 'dangerous',
        constructor: 'dangerous'
      };
      const result = ValidationUtils.sanitizeInput(input);
      expect(result.title).toBe('Safe');
      expect(result.hasOwnProperty('__proto__')).toBe(false);
      expect(result.hasOwnProperty('constructor')).toBe(false);
    });
  });
});