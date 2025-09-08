#!/usr/bin/env node

/**
 * AEMaaCS Write Server for MCP
 * Minimal implementation for testing and development
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.SERVER_PORT || 3002;
const API_KEY = process.env.API_KEY || 'development-api-key-12345';

// Middleware
app.use(cors());
app.use(express.json());

// API Key authentication middleware
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/api/info') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      error: {
        code: -32001,
        message: 'Authentication required',
        data: { hint: 'Provide API key via X-API-Key header or Authorization: Bearer <key>' }
      }
    });
  }
  
  next();
});

// Mock AEM write tools
const mockWriteTools = [
  {
    name: 'createPage',
    description: 'Create a new page in AEM',
    inputSchema: {
      type: 'object',
      properties: {
        parentPath: { type: 'string' },
        pageName: { type: 'string' },
        title: { type: 'string' },
        template: { type: 'string' },
        properties: { type: 'object' }
      },
      required: ['parentPath', 'pageName', 'title', 'template']
    }
  },
  {
    name: 'deletePage',
    description: 'Delete a page from AEM (dangerous operation)',
    inputSchema: {
      type: 'object',
      properties: {
        pagePath: { type: 'string' },
        force: { type: 'boolean', default: false },
        confirm: { type: 'boolean', default: false }
      },
      required: ['pagePath', 'confirm']
    }
  },
  {
    name: 'uploadAsset',
    description: 'Upload an asset to DAM',
    inputSchema: {
      type: 'object',
      properties: {
        folderPath: { type: 'string' },
        fileName: { type: 'string' },
        fileContent: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['folderPath', 'fileName', 'fileContent']
    }
  },
  {
    name: 'publishContent',
    description: 'Publish content to publish tier',
    inputSchema: {
      type: 'object',
      properties: {
        contentPath: { type: 'string' },
        deep: { type: 'boolean', default: false }
      },
      required: ['contentPath']
    }
  },
  {
    name: 'createPackage',
    description: 'Create a new package in AEM',
    inputSchema: {
      type: 'object',
      properties: {
        groupName: { type: 'string' },
        packageName: { type: 'string' },
        version: { type: 'string', default: '1.0.0' },
        description: { type: 'string' }
      },
      required: ['groupName', 'packageName']
    }
  }
];

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'aemaacs-write-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    security: 'API key required'
  });
});

app.get('/api/tools', (req, res) => {
  res.json({
    tools: mockWriteTools,
    security: {
      authentication: 'required',
      dangerousOperations: ['deletePage', 'deleteAsset', 'deletePackage']
    }
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'AEMaaCS Write Server',
    version: '1.0.0',
    description: 'Write operations for AEMaaCS',
    toolCount: mockWriteTools.length,
    security: 'Enhanced security with API key authentication'
  });
});

// Mock tool execution
app.post('/api/tools/:toolName', (req, res) => {
  const { toolName } = req.params;
  const args = req.body || {};
  
  console.log(`Executing write tool: ${toolName} with args:`, args);
  
  // Check for dangerous operations
  const dangerousOps = ['deletePage', 'deleteAsset', 'deletePackage'];
  if (dangerousOps.includes(toolName) && !args.confirm) {
    return res.status(400).json({
      error: {
        code: -32003,
        message: 'Dangerous operation confirmation required',
        data: { 
          hint: 'Set confirm: true to proceed with this dangerous operation',
          operation: toolName
        }
      }
    });
  }
  
  // Mock responses based on tool name
  let mockResponse;
  
  switch (toolName) {
    case 'createPage':
      mockResponse = {
        content: {
          success: true,
          path: `${args.parentPath}/${args.pageName}`,
          message: `Page '${args.title}' created successfully`,
          properties: {
            'jcr:title': args.title,
            'cq:template': args.template,
            'jcr:created': new Date().toISOString()
          }
        }
      };
      break;
      
    case 'deletePage':
      mockResponse = {
        content: {
          success: true,
          path: args.pagePath,
          message: `Page deleted successfully`,
          operation: 'delete',
          confirmed: args.confirm
        }
      };
      break;
      
    case 'uploadAsset':
      mockResponse = {
        content: {
          success: true,
          path: `${args.folderPath}/${args.fileName}`,
          message: `Asset '${args.fileName}' uploaded successfully`,
          size: args.fileContent ? args.fileContent.length : 0,
          metadata: args.metadata || {}
        }
      };
      break;
      
    case 'publishContent':
      mockResponse = {
        content: {
          success: true,
          path: args.contentPath,
          message: `Content published successfully`,
          operation: 'publish',
          deep: args.deep || false,
          timestamp: new Date().toISOString()
        }
      };
      break;
      
    case 'createPackage':
      mockResponse = {
        content: {
          success: true,
          path: `/etc/packages/${args.groupName}/${args.packageName}-${args.version || '1.0.0'}.zip`,
          message: `Package '${args.packageName}' created successfully`,
          group: args.groupName,
          name: args.packageName,
          version: args.version || '1.0.0',
          description: args.description
        }
      };
      break;
      
    default:
      return res.status(404).json({
        error: {
          code: -32601,
          message: `Tool not found: ${toolName}`,
          data: { availableTools: mockWriteTools.map(t => t.name) }
        }
      });
  }
  
  res.json({
    success: true,
    data: mockResponse,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substr(2, 9),
      duration: Math.floor(Math.random() * 1000) + 100,
      operation: toolName,
      authenticated: true
    }
  });
});

// JSON-RPC endpoint
app.post('/api/jsonrpc', (req, res) => {
  const { method, params, id } = req.body;
  
  if (method === 'tools.call') {
    const { name, arguments: args } = params;
    
    // Forward to tool execution
    req.params = { toolName: name };
    req.body = args;
    
    // Call the tool handler
    const mockReq = { params: { toolName: name }, body: args };
    const mockRes = {
      json: (data) => res.json({ jsonrpc: '2.0', result: data, id }),
      status: (code) => ({ json: (data) => res.json({ jsonrpc: '2.0', error: data, id }) })
    };
    
    // Execute the same logic as the tool endpoint
    app._router.stack.find(layer => 
      layer.route && layer.route.path === '/api/tools/:toolName' && layer.route.methods.post
    ).route.stack[0].handle(mockReq, mockRes);
  } else {
    res.json({
      jsonrpc: '2.0',
      error: { code: -32601, message: 'Method not found' },
      id
    });
  }
});

// MCP STDIO handler
if (process.argv.includes('--stdio')) {
  console.log('Starting MCP STDIO mode...');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.on('line', (line) => {
    try {
      const request = JSON.parse(line);
      
      if (request.method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'aemaacs-write-server',
              version: '1.0.0'
            }
          }
        };
        console.log(JSON.stringify(response));
      } else if (request.method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: mockWriteTools
          }
        };
        console.log(JSON.stringify(response));
      } else if (request.method === 'tools/call') {
        // Mock tool execution
        const { name, arguments: args } = request.params;
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: `Mock write result for ${name} with args: ${JSON.stringify(args)}`,
            isText: true
          }
        };
        console.log(JSON.stringify(response));
      } else {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Method not found'
          }
        };
        console.log(JSON.stringify(response));
      }
    } catch (error) {
      const response = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error'
        }
      };
      console.log(JSON.stringify(response));
    }
  });
  
} else {
  // HTTP server mode
  app.listen(PORT, () => {
    console.log(`🚀 AEMaaCS Write Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API tools: http://localhost:${PORT}/api/tools`);
    console.log(`🔐 API Key required: ${API_KEY}`);
  });
}