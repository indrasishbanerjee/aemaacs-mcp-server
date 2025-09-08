/**
 * Tests for security middleware
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityMiddleware, createSecurityMiddlewares } from '../middleware/security.js';
import { Logger } from '../utils/logger.js';
import { ConfigManager } from '../config/index.js';

// Mock dependencies
jest.mock('../utils/logger.js');
jest.mock('../config/index.js');

describe('SecurityMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let securityMiddleware: SecurityMiddleware;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
      headers: {},
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn()
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn()
    };

    mockNext = jest.fn();

    // Mock ConfigManager
    const mockConfigManager = {
      getSecurityConfig: jest.fn().mockReturnValue({
        allowedFileTypes: ['.jpg', '.png', '.pdf'],
        maxFileSize: 10485760
      }),
      getServerConfig: jest.fn().mockReturnValue({
        rateLimit: {
          windowMs: 900000,
          maxRequests: 100
        }
      })
    };
    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    // Mock Logger
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      logOperationStart: jest.fn(),
      logOperationComplete: jest.fn(),
      logSecurityEvent: jest.fn()
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    securityMiddleware = new SecurityMiddleware();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateInput', () => {
    it('should pass valid input through', () => {
      const middleware = securityMiddleware.validateInput();
      mockReq.body = { name: 'test', value: 123 };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should sanitize input by removing script tags', () => {
      const middleware = securityMiddleware.validateInput();
      mockReq.body = { 
        content: '<script>alert("xss")</script>Hello World',
        description: 'Normal text'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.content).toBe('Hello World');
      expect(mockReq.body.description).toBe('Normal text');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate AEM paths in request body', () => {
      const middleware = securityMiddleware.validateInput();
      mockReq.body = { path: '/content/test/../admin' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle file upload validation', () => {
      const middleware = securityMiddleware.validateInput();
      mockReq.files = [{
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: 'test.jpg',
        path: ''
      }] as any;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid file types', () => {
      const middleware = securityMiddleware.validateInput();
      mockReq.files = [{
        buffer: Buffer.from('test'),
        originalname: 'malicious.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: 'malicious.exe',
        path: ''
      }] as any;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('preventPathTraversal', () => {
    it('should allow valid paths', () => {
      const middleware = securityMiddleware.preventPathTraversal();
      (mockReq as any).path = '/content/test';
      mockReq.query = { path: '/content/valid' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block path traversal in URL', () => {
      const middleware = securityMiddleware.preventPathTraversal();
      (mockReq as any).path = '/content/../admin';

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block path traversal in query parameters', () => {
      const middleware = securityMiddleware.preventPathTraversal();
      mockReq.query = { path: '/content/../../../etc/passwd' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block path traversal in request body', () => {
      const middleware = securityMiddleware.preventPathTraversal();
      mockReq.body = { 
        sourcePath: '/content/test',
        destPath: '/content/../admin'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block URL encoded path traversal', () => {
      const middleware = securityMiddleware.preventPathTraversal();
      mockReq.query = { path: '/content%2f%2e%2e%2fadmin' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('preventInjectionAttacks', () => {
    it('should allow safe content', () => {
      const middleware = securityMiddleware.preventInjectionAttacks();
      mockReq.body = { 
        title: 'Test Page',
        description: 'This is a normal description'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block SQL injection attempts', () => {
      const middleware = securityMiddleware.preventInjectionAttacks();
      mockReq.body = { 
        query: "SELECT * FROM users WHERE id = 1 OR 1=1"
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block XSS attempts', () => {
      const middleware = securityMiddleware.preventInjectionAttacks();
      mockReq.body = { 
        content: '<script>alert("xss")</script>'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block command injection attempts', () => {
      const middleware = securityMiddleware.preventInjectionAttacks();
      mockReq.body = { 
        filename: 'test.txt; rm -rf /'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block JavaScript protocol in URLs', () => {
      const middleware = securityMiddleware.preventInjectionAttacks();
      mockReq.body = { 
        url: 'javascript:alert("xss")'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('limitRequestSize', () => {
    it('should allow requests within size limit', () => {
      const middleware = securityMiddleware.limitRequestSize();
      mockReq.get = jest.fn().mockReturnValue('1024'); // 1KB

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding size limit', () => {
      const middleware = securityMiddleware.limitRequestSize();
      mockReq.get = jest.fn().mockReturnValue('20971520'); // 20MB (exceeds 10MB default)

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Request size exceeds maximum limit')
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass when no content-length header', () => {
      const middleware = securityMiddleware.limitRequestSize();
      mockReq.get = jest.fn().mockReturnValue(undefined);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('auditLogger', () => {
    it('should log request start and completion', () => {
      const middleware = securityMiddleware.auditLogger();
      const mockLogger = Logger.getInstance();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.logOperationStart).toHaveBeenCalledWith(
        'GET /test',
        expect.objectContaining({
          operation: '/test',
          resource: '/test'
        })
      );
      expect(mockNext).toHaveBeenCalled();

      // Simulate response end
      if (mockRes.end) {
        (mockRes.end as jest.Mock)();
      }
    });

    it('should skip logging when disabled', () => {
      const middleware = new SecurityMiddleware({ enableAuditLogging: false }).auditLogger();
      const mockLogger = Logger.getInstance();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.logOperationStart).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createSecurityMiddlewares factory', () => {
    it('should create all middleware functions', () => {
      const middlewares = createSecurityMiddlewares();

      expect(middlewares).toHaveProperty('rateLimit');
      expect(middlewares).toHaveProperty('validateInput');
      expect(middlewares).toHaveProperty('preventPathTraversal');
      expect(middlewares).toHaveProperty('auditLogger');
      expect(middlewares).toHaveProperty('limitRequestSize');
      expect(middlewares).toHaveProperty('preventInjectionAttacks');

      expect(typeof middlewares.rateLimit).toBe('function');
      expect(typeof middlewares.validateInput).toBe('function');
      expect(typeof middlewares.preventPathTraversal).toBe('function');
      expect(typeof middlewares.auditLogger).toBe('function');
      expect(typeof middlewares.limitRequestSize).toBe('function');
      expect(typeof middlewares.preventInjectionAttacks).toBe('function');
    });

    it('should accept custom options', () => {
      const middlewares = createSecurityMiddlewares({
        enableInputValidation: false,
        enableAuditLogging: false
      });

      expect(middlewares).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined request body', () => {
      const middleware = securityMiddleware.validateInput();
      mockReq.body = null;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty request body', () => {
      const middleware = securityMiddleware.validateInput();
      mockReq.body = {};

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested objects in path traversal check', () => {
      const middleware = securityMiddleware.preventPathTraversal();
      mockReq.body = {
        config: {
          paths: {
            source: '/content/../admin'
          }
        }
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle arrays in injection check', () => {
      const middleware = securityMiddleware.preventInjectionAttacks();
      mockReq.body = {
        items: ['normal text', 'SELECT * FROM users']
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});