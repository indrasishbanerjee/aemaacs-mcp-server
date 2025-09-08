/**
 * STDIO Protocol Handler for MCP Communication
 * Handles MCP protocol over STDIO for read server
 */

import { Logger } from '../../../shared/src/utils/logger.js';
import { MCPHandler, MCPRequest, MCPResponse } from './mcp-handler.js';
import { AEMHttpClient } from '../../../shared/src/client/aem-http-client.js';

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class STDIOHandler {
  private logger: Logger;
  private mcpHandler: MCPHandler;
  private running: boolean = false;

  constructor(client: AEMHttpClient) {
    this.logger = Logger.getInstance();
    this.mcpHandler = new MCPHandler(client);
  }

  /**
   * Start STDIO handler
   */
  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.logger.info('Starting MCP STDIO handler');

    // Set up STDIO handling
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.handleInput.bind(this));
    process.stdin.on('end', this.handleEnd.bind(this));
    process.stdin.on('error', this.handleError.bind(this));

    // Send initialization message
    this.sendMessage({
      jsonrpc: '2.0',
      method: 'initialized',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: true
          }
        },
        serverInfo: {
          name: 'aem-read-server',
          version: '1.0.0'
        }
      }
    });
  }

  /**
   * Stop STDIO handler
   */
  public stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.logger.info('Stopping MCP STDIO handler');
    
    // Clean up STDIO listeners
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('end');
    process.stdin.removeAllListeners('error');
  }

  /**
   * Handle input from STDIN
   */
  private async handleInput(data: string): Promise<void> {
    try {
      const lines = data.toString().trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          await this.processMessage(line.trim());
        }
      }
    } catch (error) {
      this.logger.error('Error handling STDIO input', error as Error);
    }
  }

  /**
   * Process individual message
   */
  private async processMessage(messageStr: string): Promise<void> {
    try {
      const message: MCPMessage = JSON.parse(messageStr);
      
      this.logger.debug('Received MCP message', { method: message.method, id: message.id });

      // Handle different message types
      if (message.method) {
        await this.handleMethodCall(message);
      } else if (message.result !== undefined || message.error !== undefined) {
        // This is a response to a request we sent - log it
        this.logger.debug('Received response', { id: message.id, hasError: !!message.error });
      }
    } catch (error) {
      this.logger.error('Error processing MCP message', error as Error, { messageStr });
      
      // Send error response if we can parse the ID
      try {
        const partialMessage = JSON.parse(messageStr);
        if (partialMessage.id !== undefined) {
          this.sendErrorResponse(partialMessage.id, -32700, 'Parse error');
        }
      } catch {
        // Can't even parse for ID, send generic error
        this.sendErrorResponse(null, -32700, 'Parse error');
      }
    }
  }

  /**
   * Handle method calls
   */
  private async handleMethodCall(message: MCPMessage): Promise<void> {
    const { method, params, id } = message;

    try {
      switch (method) {
        case 'initialize':
          await this.handleInitialize(params, id);
          break;

        case 'tools/list':
          await this.handleToolsList(id);
          break;

        case 'tools/call':
          await this.handleToolsCall(params, id);
          break;

        case 'ping':
          this.sendResponse(id, { status: 'pong' });
          break;

        default:
          this.sendErrorResponse(id, -32601, `Method not found: ${method}`);
          break;
      }
    } catch (error) {
      this.logger.error('Error handling method call', error as Error, { method, id });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sendErrorResponse(id, -32603, `Internal error: ${errorMessage}`);
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(params: any, id?: string | number): Promise<void> {
    this.logger.info('Handling MCP initialize request', { params });

    const response = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: true
        }
      },
      serverInfo: {
        name: 'aem-read-server',
        version: '1.0.0',
        description: 'AEM as a Cloud Service Read Operations MCP Server'
      }
    };

    this.sendResponse(id, response);
  }

  /**
   * Handle tools/list request
   */
  private async handleToolsList(id?: string | number): Promise<void> {
    this.logger.debug('Handling tools/list request');

    const tools = this.mcpHandler.getTools();
    this.sendResponse(id, { tools });
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(params: any, id?: string | number): Promise<void> {
    this.logger.debug('Handling tools/call request', { toolName: params?.name });

    if (!params || !params.name) {
      this.sendErrorResponse(id, -32602, 'Invalid params: tool name is required');
      return;
    }

    const request: MCPRequest = {
      method: 'tools/call',
      params: {
        name: params.name,
        arguments: params.arguments || {}
      }
    };

    const response = await this.mcpHandler.executeTool(request);
    
    if (response.isError) {
      this.sendErrorResponse(id, -32603, response.content?.[0]?.text || 'Tool execution failed');
    } else {
      this.sendResponse(id, response);
    }
  }

  /**
   * Send response message
   */
  private sendResponse(id: string | number | undefined, result: any): void {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: id || null,
      result
    };

    this.sendMessage(message);
  }

  /**
   * Send error response
   */
  private sendErrorResponse(id: string | number | undefined | null, code: number, message: string, data?: any): void {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code,
        message,
        data
      }
    };

    this.sendMessage(response);
  }

  /**
   * Send message to STDOUT
   */
  private sendMessage(message: MCPMessage): void {
    try {
      const messageStr = JSON.stringify(message);
      process.stdout.write(messageStr + '\n');
      
      this.logger.debug('Sent MCP message', { 
        method: message.method, 
        id: message.id,
        hasError: !!message.error 
      });
    } catch (error) {
      this.logger.error('Error sending MCP message', error as Error);
    }
  }

  /**
   * Handle STDIN end
   */
  private handleEnd(): void {
    this.logger.info('STDIN ended, stopping MCP handler');
    this.stop();
    process.exit(0);
  }

  /**
   * Handle STDIN error
   */
  private handleError(error: Error): void {
    this.logger.error('STDIN error', error);
    this.stop();
    process.exit(1);
  }
}