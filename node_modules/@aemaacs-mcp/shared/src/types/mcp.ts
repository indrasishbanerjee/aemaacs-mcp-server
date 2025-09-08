/**
 * Model Context Protocol (MCP) types and interfaces
 */

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolSchema;
}

export interface MCPToolSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  logging?: {};
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
}

export interface MCPInitializeRequest extends MCPRequest {
  method: 'initialize';
  params: {
    protocolVersion: string;
    capabilities: MCPServerCapabilities;
    clientInfo: {
      name: string;
      version: string;
    };
  };
}

export interface MCPInitializeResponse extends MCPResponse {
  result: {
    protocolVersion: string;
    capabilities: MCPServerCapabilities;
    serverInfo: {
      name: string;
      version: string;
    };
  };
}

export interface MCPToolsListRequest extends MCPRequest {
  method: 'tools/list';
}

export interface MCPToolsListResponse extends MCPResponse {
  result: {
    tools: MCPTool[];
  };
}

export interface MCPToolsCallRequest extends MCPRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
}

export interface MCPToolsCallResponse extends MCPResponse {
  result: {
    content: MCPContent[];
    isError?: boolean;
  };
}

export interface MCPContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  SERVER_ERROR_START = -32099,
  SERVER_ERROR_END = -32000
}