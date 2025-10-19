/**
 * Unit tests for validation utilities
 */

import { ValidationUtils, CommonSchemas } from '../utils/validation.js';
import { AEMException } from '../utils/errors.js';

describe('ValidationUtils', () => {
  describe('validatePath', () => {
    it('should validate correct AEM paths', () => {
      const validPaths = [
        '/content/we-retail',
        '/content/we-retail/us/en',
        '/content/we-retail/us/en/products',
        '/content/we-retail/us/en/products/product-1',
        '/content/we-retail/us/en/products/product-1/jcr:content'
      ];

      for (const path of validPaths) {
        const result = ValidationUtils.validatePath(path);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(path);
      }
    });

    it('should reject paths with path traversal attempts', () => {
      const invalidPaths = [
        '/content/we-retail/../etc',
        '/content/we-retail/../../etc',
        '/content/we-retail//products',
        '/content/we-retail/./products'
      ];

      for (const path of invalidPaths) {
        const result = ValidationUtils.validatePath(path);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Path contains invalid characters (path traversal detected)');
      }
    });

    it('should reject paths with invalid characters', () => {
      const invalidPaths = [
        '/content/we-retail/products?param=value',
        '/content/we-retail/products#fragment',
        '/content/we-retail/products|filter',
        '/content/we-retail/products<tag>',
        '/content/we-retail/products"quote"',
        '/content/we-retail/products:colon'
      ];

      for (const path of invalidPaths) {
        const result = ValidationUtils.validatePath(path);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Path contains invalid characters');
      }
    });

    it('should normalize paths by adding leading slash', () => {
      const result = ValidationUtils.validatePath('content/we-retail');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('/content/we-retail');
    });

    it('should reject null or undefined paths', () => {
      const result = ValidationUtils.validatePath(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path is required and must be a string');
    });
  });

  describe('validateContentPath', () => {
    it('should validate correct content paths', () => {
      const validPaths = [
        '/content/we-retail',
        '/content/we-retail/us/en',
        '/content/we-retail/us/en/products',
        '/content/we-retail/us/en/products/product-1'
      ];

      for (const path of validPaths) {
        const result = ValidationUtils.validateContentPath(path);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(path);
      }
    });

    it('should reject system paths', () => {
      const systemPaths = [
        '/etc',
        '/system',
        '/var',
        '/tmp',
        '/libs',
        '/apps'
      ];

      for (const path of systemPaths) {
        const result = ValidationUtils.validateContentPath(path);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Access to system path ${path} is not allowed`);
      }
    });

    it('should reject paths with trailing slashes', () => {
      const result = ValidationUtils.validateContentPath('/content/we-retail/');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path contains invalid characters or patterns');
    });

    it('should reject paths with reserved names', () => {
      const reservedPaths = [
        '/content/CON',
        '/content/PRN',
        '/content/AUX',
        '/content/NUL',
        '/content/COM1',
        '/content/LPT1'
      ];

      for (const path of reservedPaths) {
        const result = ValidationUtils.validateContentPath(path);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Reserved name '${path.split('/').pop()}' is not allowed`);
      }
    });

    it('should reject paths that are too long', () => {
      const longPath = '/content/' + 'a'.repeat(1000);
      const result = ValidationUtils.validateContentPath(longPath);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path exceeds maximum length (1000 characters)');
    });
  });

  describe('validateJCRPropertyName', () => {
    it('should validate correct JCR property names', () => {
      const validNames = [
        'title',
        'description',
        'jcr:title',
        'jcr:description',
        'sling:resourceType',
        'cq:template',
        'custom_property',
        'custom-property',
        'custom.property'
      ];

      for (const name of validNames) {
        const result = ValidationUtils.validateJCRPropertyName(name);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(name);
      }
    });

    it('should reject reserved JCR property names', () => {
      const reservedNames = [
        'jcr:primaryType',
        'jcr:mixinTypes',
        'jcr:uuid',
        'jcr:created',
        'jcr:createdBy'
      ];

      for (const name of reservedNames) {
        const result = ValidationUtils.validateJCRPropertyName(name);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Reserved JCR property name '${name}' is not allowed`);
      }
    });

    it('should reject custom namespace prefixes', () => {
      const result = ValidationUtils.validateJCRPropertyName('custom:property');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Custom namespace prefixes are not allowed');
    });

    it('should reject empty property names', () => {
      const result = ValidationUtils.validateJCRPropertyName('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property name cannot be empty');
    });

    it('should reject property names that are too long', () => {
      const longName = 'a'.repeat(256);
      const result = ValidationUtils.validateJCRPropertyName(longName);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property name exceeds maximum length (255 characters)');
    });
  });

  describe('validateJCRPropertyValue', () => {
    it('should validate correct JCR property values', () => {
      const validValues = [
        'string value',
        123,
        true,
        false,
        null,
        ['array', 'of', 'strings'],
        { object: 'value' }
      ];

      for (const value of validValues) {
        const result = ValidationUtils.validateJCRPropertyValue(value, 'testProperty');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(value);
      }
    });

    it('should reject function values', () => {
      const result = ValidationUtils.validateJCRPropertyValue(() => {}, 'testProperty');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Function values are not allowed');
    });

    it('should reject complex object types', () => {
      const result = ValidationUtils.validateJCRPropertyValue(new Date(), 'testProperty');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Complex object types are not allowed');
    });

    it('should reject values with circular references', () => {
      const circular: any = {};
      circular.self = circular;

      const result = ValidationUtils.validateJCRPropertyValue(circular, 'testProperty');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property value contains circular references');
    });

    it('should reject values that are too large', () => {
      const largeValue = 'a'.repeat(1024 * 1024 + 1);
      const result = ValidationUtils.validateJCRPropertyValue(largeValue, 'testProperty');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property value exceeds maximum size (1MB)');
    });

    it('should reject strings with dangerous content', () => {
      const dangerousValues = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onclick="alert(\'xss\')"',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:alert("xss")'
      ];

      for (const value of dangerousValues) {
        const result = ValidationUtils.validateJCRPropertyValue(value, 'testProperty');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Property value contains potentially dangerous content');
      }
    });
  });

  describe('validateJCRQuery', () => {
    it('should validate correct JCR queries', () => {
      const validQueries = [
        'SELECT * FROM [cq:Page] WHERE ISDESCENDANTNODE("/content")',
        'SELECT * FROM [dam:Asset] WHERE CONTAINS(*, "test")',
        'SELECT * FROM [nt:unstructured] WHERE [property] = "value"'
      ];

      for (const query of validQueries) {
        const result = ValidationUtils.validateJCRQuery(query);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(query);
      }
    });

    it('should reject queries with dangerous SQL patterns', () => {
      const dangerousQueries = [
        'SELECT * FROM [cq:Page]; DROP TABLE users',
        'SELECT * FROM [cq:Page] UNION SELECT * FROM users',
        'SELECT * FROM [cq:Page]; EXEC xp_cmdshell("rm -rf /")',
        'SELECT * FROM [cq:Page]; <script>alert("xss")</script>'
      ];

      for (const query of dangerousQueries) {
        const result = ValidationUtils.validateJCRQuery(query);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Query contains potentially dangerous patterns');
      }
    });

    it('should reject null or undefined queries', () => {
      const result = ValidationUtils.validateJCRQuery(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query is required and must be a string');
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct file uploads', () => {
      const validFile = Buffer.from('test content');
      const metadata = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: 1024
      };

      const result = ValidationUtils.validateFileUpload(validFile, metadata);
      expect(result.valid).toBe(true);
    });

    it('should reject non-Buffer file content', () => {
      const result = ValidationUtils.validateFileUpload('not a buffer' as any, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File content must be a Buffer');
    });

    it('should reject files that are too large', () => {
      const validFile = Buffer.from('test content');
      const metadata = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: 101 * 1024 * 1024 // 101MB
      };

      const result = ValidationUtils.validateFileUpload(validFile, metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum limit (100MB)');
    });

    it('should reject files with dangerous filenames', () => {
      const validFile = Buffer.from('test content');
      const metadata = {
        filename: '../../../etc/passwd',
        mimeType: 'text/plain',
        size: 1024
      };

      const result = ValidationUtils.validateFileUpload(validFile, metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Filename contains invalid characters');
    });

    it('should reject files with disallowed extensions', () => {
      const validFile = Buffer.from('test content');
      const metadata = {
        filename: 'test.exe',
        mimeType: 'application/octet-stream',
        size: 1024
      };

      const result = ValidationUtils.validateFileUpload(validFile, metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File type not allowed: .exe');
    });

    it('should reject files with disallowed MIME types', () => {
      const validFile = Buffer.from('test content');
      const metadata = {
        filename: 'test.txt',
        mimeType: 'application/octet-stream',
        size: 1024
      };

      const result = ValidationUtils.validateFileUpload(validFile, metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MIME type not allowed: application/octet-stream');
    });
  });

  describe('validateFileContent', () => {
    it('should validate correct file content', () => {
      const validFile = Buffer.from('test content');
      const result = ValidationUtils.validateFileContent(validFile, 'text/plain');
      expect(result.valid).toBe(true);
    });

    it('should reject empty files', () => {
      const emptyFile = Buffer.alloc(0);
      const result = ValidationUtils.validateFileContent(emptyFile, 'text/plain');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject archive files', () => {
      const zipFile = Buffer.from('PK\x03\x04test content');
      const result = ValidationUtils.validateFileContent(zipFile, 'application/zip');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Archive files are not allowed');
    });

    it('should reject executable files', () => {
      const exeFile = Buffer.from('MZtest content');
      const result = ValidationUtils.validateFileContent(exeFile, 'application/octet-stream');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Executable files are not allowed');
    });

    it('should reject text files with script content', () => {
      const scriptFile = Buffer.from('<script>alert("xss")</script>');
      const result = ValidationUtils.validateFileContent(scriptFile, 'text/html');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File contains potentially dangerous script content');
    });

    it('should reject Office documents with macros', () => {
      const macroFile = Buffer.from('Microsoft Office VBA Macro content');
      const result = ValidationUtils.validateFileContent(macroFile, 'application/vnd.ms-word');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Files with macros are not allowed');
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate correct search queries', () => {
      const validQueries = [
        'test query',
        'product search',
        'user:admin',
        'status:active'
      ];

      for (const query of validQueries) {
        const result = ValidationUtils.validateSearchQuery(query);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(query);
      }
    });

    it('should reject queries with dangerous content', () => {
      const dangerousQueries = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onclick="alert(\'xss\')"',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:alert("xss")',
        'eval("alert(\'xss\')")',
        'Function("alert(\'xss\')")',
        'setTimeout("alert(\'xss\')", 1000)',
        'setInterval("alert(\'xss\')", 1000)',
        'document.cookie',
        'document.location',
        'window.location',
        'XMLHttpRequest',
        'fetch("http://evil.com")'
      ];

      for (const query of dangerousQueries) {
        const result = ValidationUtils.validateSearchQuery(query);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Query contains potentially dangerous content');
      }
    });

    it('should reject queries with SQL injection patterns', () => {
      const sqlQueries = [
        'test; DROP TABLE users',
        'test UNION SELECT * FROM users',
        'test; EXEC sp_executesql',
        'test; EXEC xp_cmdshell'
      ];

      for (const query of sqlQueries) {
        const result = ValidationUtils.validateSearchQuery(query);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Query contains potentially dangerous SQL patterns');
      }
    });

    it('should reject empty queries', () => {
      const result = ValidationUtils.validateSearchQuery('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query cannot be empty');
    });

    it('should reject queries that are too long', () => {
      const longQuery = 'a'.repeat(1001);
      const result = ValidationUtils.validateSearchQuery(longQuery);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query exceeds maximum length (1000 characters)');
    });
  });

  describe('validateUserInput', () => {
    it('should validate correct user input', () => {
      const validInputs = [
        'test input',
        'user@example.com',
        'https://example.com',
        'normal text with numbers 123',
        { key: 'value' },
        ['array', 'of', 'strings'],
        null,
        undefined
      ];

      for (const input of validInputs) {
        const result = ValidationUtils.validateUserInput(input);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(input);
      }
    });

    it('should reject strings with XSS patterns', () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onclick="alert(\'xss\')"',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:alert("xss")',
        '<iframe src="http://evil.com"></iframe>',
        '<object data="http://evil.com"></object>',
        '<embed src="http://evil.com"></embed>',
        '<applet code="evil.class"></applet>',
        '<form action="http://evil.com"></form>',
        '<input type="text" onfocus="alert(\'xss\')">',
        '<textarea onfocus="alert(\'xss\')"></textarea>',
        '<select onchange="alert(\'xss\')"></select>',
        '<button onclick="alert(\'xss\')"></button>',
        '<link rel="stylesheet" href="http://evil.com">',
        '<meta http-equiv="refresh" content="0;url=http://evil.com">',
        '<style>body{background:url("javascript:alert(\'xss\')")}</style>'
      ];

      for (const input of xssInputs) {
        const result = ValidationUtils.validateUserInput(input);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Input contains potentially dangerous content');
      }
    });

    it('should reject strings with dangerous URL schemes', () => {
      const dangerousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:alert("xss")',
        'file:///etc/passwd',
        'ftp://evil.com',
        'gopher://evil.com',
        'news://evil.com',
        'telnet://evil.com',
        'wais://evil.com'
      ];

      for (const url of dangerousUrls) {
        const result = ValidationUtils.validateUserInput(url);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Input contains potentially dangerous URL schemes');
      }
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize strings by removing dangerous content', () => {
      const dangerousInput = '<script>alert("xss")</script>normal text';
      const result = ValidationUtils.sanitizeInput(dangerousInput);
      expect(result).toBe('normal text');
    });

    it('should sanitize arrays recursively', () => {
      const dangerousArray = ['<script>alert("xss")</script>', 'normal text'];
      const result = ValidationUtils.sanitizeInput(dangerousArray);
      expect(result).toEqual(['normal text']);
    });

    it('should sanitize objects recursively', () => {
      const dangerousObject = {
        title: 'Normal title',
        content: '<script>alert("xss")</script>normal content',
        nested: {
          value: 'javascript:alert("xss")'
        }
      };
      const result = ValidationUtils.sanitizeInput(dangerousObject);
      expect(result).toEqual({
        title: 'Normal title',
        content: 'normal content',
        nested: {
          value: ''
        }
      });
    });

    it('should skip dangerous property names', () => {
      const dangerousObject = {
        title: 'Normal title',
        __proto__: 'dangerous',
        constructor: 'dangerous',
        prototype: 'dangerous'
      };
      const result = ValidationUtils.sanitizeInput(dangerousObject);
      expect(result).toEqual({
        title: 'Normal title'
      });
    });

    it('should handle null and undefined', () => {
      expect(ValidationUtils.sanitizeInput(null)).toBe(null);
      expect(ValidationUtils.sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('validateWithSchema', () => {
    it('should validate data against Joi schema', () => {
      const schema = CommonSchemas.aemPath;
      const result = ValidationUtils.validateWithSchema('/content/we-retail', schema);
      expect(result).toBe('/content/we-retail');
    });

    it('should throw AEMException for invalid data', () => {
      const schema = CommonSchemas.aemPath;
      expect(() => {
        ValidationUtils.validateWithSchema('invalid path', schema);
      }).toThrow(AEMException);
    });

    it('should strip unknown properties', () => {
      const schema = CommonSchemas.aemPath;
      const data = {
        path: '/content/we-retail',
        unknown: 'property'
      };
      const result = ValidationUtils.validateWithSchema(data, schema);
      expect(result).toBe('/content/we-retail');
    });

    it('should convert types when possible', () => {
      const schema = CommonSchemas.pageSize;
      const result = ValidationUtils.validateWithSchema('50', schema);
      expect(result).toBe(50);
    });
  });
});