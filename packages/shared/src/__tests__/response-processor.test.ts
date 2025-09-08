/**
 * Tests for response processor
 */

import { ResponseProcessor, responseProcessor } from '../utils/response-processor.js';
import { AEMException } from '../utils/errors.js';
import { ErrorType } from '../types/aem.js';
import { Logger } from '../utils/logger.js';

// Mock Logger
jest.mock('../utils/logger.js');

describe('ResponseProcessor', () => {
  let processor: ResponseProcessor;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    } as any;
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    processor = new ResponseProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processSuccess', () => {
    it('should process successful response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = processor.processSuccess(data, 'req-123', 100, false);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata).toEqual({
        timestamp: expect.any(Date),
        requestId: 'req-123',
        duration: 100,
        cached: false
      });
    });

    it('should sanitize sensitive data in output', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        clientSecret: 'supersecret',
        normalField: 'normal value'
      };

      const response = processor.processSuccess(data, 'req-123');

      expect(response.data).toEqual({
        username: 'testuser',
        password: '***',
        token: '***',
        clientSecret: '***',
        normalField: 'normal value'
      });
    });

    it('should handle nested objects with sensitive data', () => {
      const data = {
        user: {
          name: 'test',
          credentials: {
            password: 'secret',
            apiKey: 'key123'
          }
        },
        config: {
          database: {
            host: 'localhost',
            password: 'dbpass'
          }
        }
      };

      const response = processor.processSuccess(data, 'req-123');

      expect(response.data?.user.credentials.password).toBe('***');
      expect(response.data?.user.credentials.apiKey).toBe('***');
      expect(response.data?.config.database.password).toBe('***');
      expect(response.data?.user.name).toBe('test');
      expect(response.data?.config.database.host).toBe('localhost');
    });

    it('should handle arrays with sensitive data', () => {
      const data = [
        { name: 'user1', password: 'pass1' },
        { name: 'user2', token: 'token2' }
      ];

      const response = processor.processSuccess(data, 'req-123');

      expect(response.data?.[0]?.password).toBe('***');
      expect(response.data?.[1]?.token).toBe('***');
      expect(response.data?.[0]?.name).toBe('user1');
      expect(response.data?.[1]?.name).toBe('user2');
    });

    it('should skip metadata when disabled', () => {
      const data = { test: 'value' };
      const response = processor.processSuccess(data, 'req-123', 100, false, {
        includeMetadata: false
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata).toBeUndefined();
    });

    it('should skip sanitization when disabled', () => {
      const data = { password: 'secret' };
      const response = processor.processSuccess(data, 'req-123', 100, false, {
        sanitizeOutput: false
      });

      expect(response.data?.password).toBe('secret');
    });
  });

  describe('processError', () => {
    it('should process AEMException error', () => {
      const error = new AEMException(
        'Test error',
        ErrorType.VALIDATION_ERROR,
        false,
        undefined,
        { field: 'test' }
      );

      const response = processor.processError(error, 'req-123', 100);

      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code: ErrorType.VALIDATION_ERROR,
        message: 'Test error',
        recoverable: false,
        details: { field: 'test' }
      });
      expect(response.metadata).toEqual({
        timestamp: expect.any(Date),
        requestId: 'req-123',
        duration: 100
      });
    });

    it('should process generic Error', () => {
      const error = new Error('Generic error');
      error.stack = 'Error stack trace';

      const response = processor.processError(error, 'req-123', 100);

      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code: ErrorType.UNKNOWN_ERROR,
        message: 'Generic error',
        recoverable: false,
        details: undefined // Sanitized by default
      });
    });

    it('should sanitize error details when enabled', () => {
      const error = new Error('Generic error');
      error.stack = 'Error stack trace';

      const response = processor.processError(error, 'req-123', 100, {
        sanitizeOutput: true
      });

      expect(response.error?.details).toBeUndefined();
    });

    it('should log error', () => {
      const error = new AEMException('Test error', ErrorType.NETWORK_ERROR);
      
      processor.processError(error, 'req-123', 100);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'AEM operation failed',
        error,
        expect.objectContaining({
          requestId: 'req-123',
          errorCode: ErrorType.NETWORK_ERROR,
          recoverable: false // AEMException constructor sets this
        })
      );
    });
  });

  describe('toMCPResponse', () => {
    it('should convert successful AEM response to MCP response', () => {
      const aemResponse = {
        success: true,
        data: { message: 'Hello World' },
        metadata: {
          timestamp: new Date(),
          requestId: 'req-123',
          duration: 100
        }
      };

      const mcpResponse = processor.toMCPResponse(aemResponse, 'mcp-123');

      expect(mcpResponse).toEqual({
        jsonrpc: '2.0',
        id: 'mcp-123',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({ message: 'Hello World' }, null, 2)
          }],
          isError: false
        }
      });
    });

    it('should convert error AEM response to MCP error response', () => {
      const aemResponse = {
        success: false,
        error: {
          code: ErrorType.VALIDATION_ERROR,
          message: 'Validation failed',
          recoverable: false,
          details: { field: 'name' }
        }
      };

      const mcpResponse = processor.toMCPResponse(aemResponse, 'mcp-123');

      expect(mcpResponse).toEqual({
        jsonrpc: '2.0',
        id: 'mcp-123',
        error: {
          code: -32602, // Invalid params
          message: 'Validation failed',
          data: {
            aemCode: ErrorType.VALIDATION_ERROR,
            recoverable: false,
            retryAfter: undefined,
            details: { field: 'name' }
          }
        }
      });
    });

    it('should use custom content formatter', () => {
      const aemResponse = {
        success: true,
        data: { items: ['item1', 'item2'] }
      };

      const customFormatter = (data: any) => [
        { type: 'text' as const, text: `Found ${data.items.length} items` },
        { type: 'text' as const, text: data.items.join(', ') }
      ];

      const mcpResponse = processor.toMCPResponse(aemResponse, 'mcp-123', customFormatter);

      expect(mcpResponse.result?.content).toEqual([
        { type: 'text', text: 'Found 2 items' },
        { type: 'text', text: 'item1, item2' }
      ]);
    });

    it('should handle string data directly', () => {
      const aemResponse = {
        success: true,
        data: 'Simple string response'
      };

      const mcpResponse = processor.toMCPResponse(aemResponse, 'mcp-123');

      expect(mcpResponse.result?.content).toEqual([{
        type: 'text',
        text: 'Simple string response'
      }]);
    });
  });

  describe('processAEMResponse', () => {
    it('should handle AEM error responses', () => {
      const errorResponse = {
        success: false,
        error: {
          message: 'Access denied',
          code: 'javax.jcr.AccessDeniedException'
        }
      };

      expect(() => {
        processor.processAEMResponse(errorResponse, 'test-operation');
      }).toThrow(AEMException);
    });

    it('should process package manager responses', () => {
      const packageResponse = {
        results: [
          {
            name: 'test-package',
            group: 'test-group',
            version: '1.0.0',
            path: '/etc/packages/test-group/test-package-1.0.0.zip',
            size: 1024,
            created: '2023-01-01T00:00:00.000Z',
            lastModified: '2023-01-01T00:00:00.000Z',
            installed: 'true',
            builtWith: 'Adobe Experience Manager-6.5.0'
          }
        ]
      };

      const processed = processor.processAEMResponse(packageResponse, 'package-list');

      expect(processed.packages).toHaveLength(1);
      expect(processed.packages[0]).toEqual({
        name: 'test-package',
        group: 'test-group',
        version: '1.0.0',
        path: '/etc/packages/test-group/test-package-1.0.0.zip',
        size: 1024,
        created: new Date('2023-01-01T00:00:00.000Z'),
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        installed: true,
        builtWith: 'Adobe Experience Manager-6.5.0'
      });
    });

    it('should process query builder responses', () => {
      const queryResponse = {
        success: true,
        total: 2,
        offset: 0,
        hits: [
          {
            path: '/content/page1',
            title: 'Page 1',
            excerpt: 'First page',
            lastModified: '2023-01-01T00:00:00.000Z',
            score: 1.0
          },
          {
            path: '/content/page2',
            title: 'Page 2',
            excerpt: 'Second page',
            score: 0.8
          }
        ]
      };

      const processed = processor.processAEMResponse(queryResponse, 'query-search');

      expect(processed).toEqual({
        success: true,
        total: 2,
        offset: 0,
        hits: [
          {
            path: '/content/page1',
            title: 'Page 1',
            excerpt: 'First page',
            lastModified: new Date('2023-01-01T00:00:00.000Z'),
            score: 1.0
          },
          {
            path: '/content/page2',
            title: 'Page 2',
            excerpt: 'Second page',
            lastModified: undefined,
            score: 0.8
          }
        ]
      });
    });

    it('should process workflow responses', () => {
      const workflowResponse = {
        workflowInstances: [
          {
            id: 'workflow-1',
            model: '/etc/workflow/models/publish',
            payload: '/content/page1',
            state: 'RUNNING',
            startTime: '2023-01-01T00:00:00.000Z',
            initiator: 'admin'
          }
        ]
      };

      const processed = processor.processAEMResponse(workflowResponse, 'workflow-list');

      expect(processed.instances).toHaveLength(1);
      expect(processed.instances[0]).toEqual({
        id: 'workflow-1',
        modelPath: '/etc/workflow/models/publish',
        payloadPath: '/content/page1',
        state: 'RUNNING',
        startTime: new Date('2023-01-01T00:00:00.000Z'),
        endTime: undefined,
        initiator: 'admin'
      });
    });

    it('should process replication responses', () => {
      const replicationResponse = {
        distributionAgents: [
          {
            name: 'publish-agent',
            title: 'Publish Agent',
            description: 'Agent for publishing content',
            enabled: true,
            valid: true,
            queue: { size: 0 }
          }
        ]
      };

      const processed = processor.processAEMResponse(replicationResponse, 'replication-agents');

      expect(processed.agents).toHaveLength(1);
      expect(processed.agents[0]).toEqual({
        name: 'publish-agent',
        title: 'Publish Agent',
        description: 'Agent for publishing content',
        enabled: true,
        valid: true,
        queue: { size: 0 }
      });
    });

    it('should return raw response for unknown formats', () => {
      const unknownResponse = {
        customField: 'customValue',
        data: [1, 2, 3]
      };

      const processed = processor.processAEMResponse(unknownResponse, 'unknown-operation');

      expect(processed).toEqual(unknownResponse);
    });
  });

  describe('error mapping', () => {
    it('should map JCR exceptions correctly', () => {
      const testCases = [
        {
          aemCode: 'javax.jcr.AccessDeniedException',
          expectedType: ErrorType.AUTHORIZATION_ERROR
        },
        {
          aemCode: 'javax.jcr.PathNotFoundException',
          expectedType: ErrorType.NOT_FOUND_ERROR
        },
        {
          aemCode: 'javax.jcr.InvalidItemStateException',
          expectedType: ErrorType.VALIDATION_ERROR
        },
        {
          aemCode: 'java.net.SocketTimeoutException',
          expectedType: ErrorType.TIMEOUT_ERROR
        },
        {
          aemCode: 'java.net.ConnectException',
          expectedType: ErrorType.NETWORK_ERROR
        }
      ];

      testCases.forEach(({ aemCode, expectedType }) => {
        const errorResponse = {
          success: false,
          error: { code: aemCode, message: 'Test error' }
        };

        expect(() => {
          processor.processAEMResponse(errorResponse, 'test-operation');
        }).toThrow(expect.objectContaining({
          code: expectedType
        }));
      });
    });

    it('should determine error recoverability correctly', () => {
      const recoverableResponse = {
        success: false,
        status: 500,
        error: { message: 'Internal server error' }
      };

      const nonRecoverableResponse = {
        success: false,
        status: 403,
        error: { message: 'Access denied' }
      };

      expect(() => {
        processor.processAEMResponse(recoverableResponse, 'test-operation');
      }).toThrow(expect.objectContaining({
        recoverable: true
      }));

      expect(() => {
        processor.processAEMResponse(nonRecoverableResponse, 'test-operation');
      }).toThrow(AEMException);
    });
  });
});

describe('responseProcessor singleton', () => {
  it('should export a singleton instance', () => {
    expect(responseProcessor).toBeInstanceOf(ResponseProcessor);
  });
});