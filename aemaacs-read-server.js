#!/usr/bin/env node

/**
 * AEMaaCS Read Server for MCP
 * Minimal implementation for testing and development
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock AEM tools for demonstration
const mockTools = [
  {
    name: 'listPages',
    description: 'List pages in AEM with optional depth and filtering',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '/content' },
        depth: { type: 'number', default: 1 },
        limit: { type: 'number', default: 100 }
      }
    }
  },
  {
    name: 'getPageContent',
    description: 'Get complete content of a specific page',
    inputSchema: {
      type: 'object',
      properties: {
        pagePath: { type: 'string' },
        depth: { type: 'number', default: 2 }
      },
      required: ['pagePath']
    }
  },
  {
    name: 'searchContent',
    description: 'Search for content using QueryBuilder API',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        path: { type: 'string', default: '/content' },
        limit: { type: 'number', default: 20 }
      },
      required: ['query']
    }
  },
  {
    name: 'listAssets',
    description: 'List assets in DAM with filtering options',
    inputSchema: {
      type: 'object',
      properties: {
        folderPath: { type: 'string', default: '/content/dam' },
        mimeType: { type: 'string' },
        limit: { type: 'number', default: 50 }
      }
    }
  },
  {
    name: 'getSystemHealth',
    description: 'Get AEM system health information',
    inputSchema: { type: 'object', properties: {} }
  }
];

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'aemaacs-read-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/tools', (req, res) => {
  res.json({
    tools: mockTools
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'AEMaaCS Read Server',
    version: '1.0.0',
    description: 'Read-only operations for AEMaaCS',
    toolCount: mockTools.length
  });
});

// Mock tool execution
app.post('/api/tools/:toolName', (req, res) => {
  const { toolName } = req.params;
  const args = req.body || {};
  
  console.log(`Executing tool: ${toolName} with args:`, args);
  
  // Mock responses based on tool name
  let mockResponse;
  
  switch (toolName) {
    case 'listPages':
      mockResponse = {
        content: [
          { path: '/content/mysite/en', title: 'English Home', template: '/conf/mysite/templates/page' },
          { path: '/content/mysite/en/about', title: 'About Us', template: '/conf/mysite/templates/page' },
          { path: '/content/mysite/en/products', title: 'Products', template: '/conf/mysite/templates/page' }
        ],
        total: 3
      };
      break;
      
    case 'getPageContent':
      mockResponse = {
        content: {
          path: args.pagePath || '/content/mysite/en',
          title: 'Sample Page',
          template: '/conf/mysite/templates/page',
          properties: {
            'jcr:title': 'Sample Page',
            'jcr:description': 'This is a sample page',
            'cq:template': '/conf/mysite/templates/page'
          },
          components: [
            { path: 'root/responsivegrid', resourceType: 'wcm/foundation/components/responsivegrid' },
            { path: 'root/responsivegrid/text', resourceType: 'core/wcm/components/text/v2/text' }
          ]
        }
      };
      break;
      
    case 'searchContent':
      mockResponse = {
        content: [
          { path: '/content/mysite/en/search-result-1', title: 'Search Result 1', score: 0.95 },
          { path: '/content/mysite/en/search-result-2', title: 'Search Result 2', score: 0.87 }
        ],
        total: 2,
        query: args.query
      };
      break;
      
    case 'listAssets':
      mockResponse = {
        content: [
          { path: '/content/dam/mysite/images/hero.jpg', title: 'Hero Image', mimeType: 'image/jpeg', size: 1024000 },
          { path: '/content/dam/mysite/documents/brochure.pdf', title: 'Product Brochure', mimeType: 'application/pdf', size: 2048000 }
        ],
        total: 2
      };
      break;
      
    case 'getSystemHealth':
      mockResponse = {
        content: {
          status: 'healthy',
          uptime: '5 days, 3 hours',
          memory: { used: '2.1 GB', total: '8 GB' },
          bundles: { active: 450, total: 452 },
          lastCheck: new Date().toISOString()
        }
      };
      break;
      
    default:
      return res.status(404).json({
        error: {
          code: -32601,
          message: `Tool not found: ${toolName}`,
          data: { availableTools: mockTools.map(t => t.name) }
        }
      });
  }
  
  res.json({
    success: true,
    data: mockResponse,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substr(2, 9),
      duration: Math.floor(Math.random() * 500) + 50
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
              name: 'aemaacs-read-server',
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
            tools: mockTools
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
            content: `Mock result for ${name} with args: ${JSON.stringify(args)}`,
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
    console.log(`🚀 AEMaaCS Read Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API tools: http://localhost:${PORT}/api/tools`);
  });
}