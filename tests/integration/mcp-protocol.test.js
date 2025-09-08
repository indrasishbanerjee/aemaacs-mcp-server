/**
 * Basic integration tests for MCP protocol handlers
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('MCP Protocol Integration Tests', () => {
  const timeout = 10000; // 10 second timeout for integration tests

  beforeAll(() => {
    // Ensure servers are built
    expect(fs.existsSync(path.join(__dirname, '../../packages/read-server/dist'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../../packages/write-server/dist'))).toBe(true);
  });

  describe('Read Server MCP Protocol', () => {
    let serverProcess;

    afterEach(() => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
    });

    test('should respond to MCP initialize request', async () => {
      const readServerPath = path.join(__dirname, '../../packages/read-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: readServerPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let responseReceived = false;

        const timeoutId = setTimeout(() => {
          if (!responseReceived) {
            reject(new Error('MCP initialize request timed out'));
          }
        }, timeout);

        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          
          // Look for JSON-RPC response
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('jsonrpc')) {
              try {
                const response = JSON.parse(line.trim());
                if (response.id === 1 && response.result) {
                  responseReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Verify response structure
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.id).toBe(1);
                  expect(response.result).toBeDefined();
                  expect(response.result.protocolVersion).toBeDefined();
                  expect(response.result.capabilities).toBeDefined();
                  expect(response.result.serverInfo).toBeDefined();
                  
                  resolve();
                  return;
                }
              } catch (parseError) {
                // Continue looking for valid JSON
              }
            }
          }
        });

        serverProcess.stderr.on('data', (data) => {
          console.error('Server stderr:', data.toString());
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });

        // Send initialize request
        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      });
    }, timeout);

    test('should respond to tools/list request', async () => {
      const readServerPath = path.join(__dirname, '../../packages/read-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: readServerPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // First initialize
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      // Then list tools
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let initReceived = false;
        let toolsReceived = false;

        const timeoutId = setTimeout(() => {
          if (!toolsReceived) {
            reject(new Error('Tools list request timed out'));
          }
        }, timeout);

        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('jsonrpc')) {
              try {
                const response = JSON.parse(line.trim());
                
                if (response.id === 1 && !initReceived) {
                  initReceived = true;
                  // Send tools list request after init
                  setTimeout(() => {
                    serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
                  }, 100);
                } else if (response.id === 2 && response.result) {
                  toolsReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Verify tools list response
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.id).toBe(2);
                  expect(response.result).toBeDefined();
                  expect(response.result.tools).toBeDefined();
                  expect(Array.isArray(response.result.tools)).toBe(true);
                  expect(response.result.tools.length).toBeGreaterThan(0);
                  
                  // Verify tool structure
                  const firstTool = response.result.tools[0];
                  expect(firstTool.name).toBeDefined();
                  expect(firstTool.description).toBeDefined();
                  expect(firstTool.inputSchema).toBeDefined();
                  
                  resolve();
                  return;
                }
              } catch (parseError) {
                // Continue looking for valid JSON
              }
            }
          }
        });

        serverProcess.stderr.on('data', (data) => {
          console.error('Server stderr:', data.toString());
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });

        // Send initialize request first
        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      });
    }, timeout);
  });

  describe('Write Server MCP Protocol', () => {
    let serverProcess;

    afterEach(() => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
    });

    test('should respond to MCP initialize request', async () => {
      const writeServerPath = path.join(__dirname, '../../packages/write-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: writeServerPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let responseReceived = false;

        const timeoutId = setTimeout(() => {
          if (!responseReceived) {
            reject(new Error('MCP initialize request timed out'));
          }
        }, timeout);

        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('jsonrpc')) {
              try {
                const response = JSON.parse(line.trim());
                if (response.id === 1 && response.result) {
                  responseReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Verify response structure
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.id).toBe(1);
                  expect(response.result).toBeDefined();
                  expect(response.result.protocolVersion).toBeDefined();
                  expect(response.result.capabilities).toBeDefined();
                  expect(response.result.serverInfo).toBeDefined();
                  
                  resolve();
                  return;
                }
              } catch (parseError) {
                // Continue looking for valid JSON
              }
            }
          }
        });

        serverProcess.stderr.on('data', (data) => {
          console.error('Server stderr:', data.toString());
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });

        // Send initialize request
        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      });
    }, timeout);

    test('should have write-specific tools available', async () => {
      const writeServerPath = path.join(__dirname, '../../packages/write-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: writeServerPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let initReceived = false;
        let toolsReceived = false;

        const timeoutId = setTimeout(() => {
          if (!toolsReceived) {
            reject(new Error('Tools list request timed out'));
          }
        }, timeout);

        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('jsonrpc')) {
              try {
                const response = JSON.parse(line.trim());
                
                if (response.id === 1 && !initReceived) {
                  initReceived = true;
                  setTimeout(() => {
                    serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
                  }, 100);
                } else if (response.id === 2 && response.result) {
                  toolsReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Verify tools list response
                  expect(response.result.tools).toBeDefined();
                  expect(Array.isArray(response.result.tools)).toBe(true);
                  
                  // Check for write-specific tools
                  const toolNames = response.result.tools.map(tool => tool.name);
                  const writeTools = toolNames.filter(name => 
                    name.includes('create') || 
                    name.includes('update') || 
                    name.includes('delete') ||
                    name.includes('upload') ||
                    name.includes('publish')
                  );
                  
                  expect(writeTools.length).toBeGreaterThan(0);
                  
                  resolve();
                  return;
                }
              } catch (parseError) {
                // Continue looking for valid JSON
              }
            }
          }
        });

        serverProcess.stderr.on('data', (data) => {
          console.error('Server stderr:', data.toString());
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });

        // Send initialize request first
        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      });
    }, timeout);
  });
});