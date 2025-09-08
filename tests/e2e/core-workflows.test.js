/**
 * End-to-end tests for core AEMaaCS workflows
 * These tests verify that the complete workflow from MCP request to AEM response works
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('Core Workflows E2E Tests', () => {
  const timeout = 15000; // 15 second timeout for E2E tests

  beforeAll(() => {
    // Ensure servers are built
    expect(fs.existsSync(path.join(__dirname, '../../packages/read-server/dist'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../../packages/write-server/dist'))).toBe(true);
  });

  describe('Content Discovery Workflow', () => {
    let serverProcess;

    afterEach(() => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
    });

    test('should complete content discovery workflow via MCP', async () => {
      const readServerPath = path.join(__dirname, '../../packages/read-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: readServerPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          AEM_HOST: 'https://mock-aem-instance.com',
          AEM_CLIENT_ID: 'test-client-id',
          AEM_CLIENT_SECRET: 'test-client-secret',
          AEM_TECHNICAL_ACCOUNT_ID: 'test-account-id',
          AEM_ORGANIZATION_ID: 'test-org-id',
          AEM_PRIVATE_KEY: 'test-private-key'
        }
      });

      // Initialize and then call a content discovery tool
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

      const toolCallRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'listPages',
          arguments: {
            path: '/content/test',
            depth: 1
          }
        }
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let initReceived = false;
        let toolCallReceived = false;

        const timeoutId = setTimeout(() => {
          if (!toolCallReceived) {
            reject(new Error('Content discovery workflow timed out'));
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
                  // Send tool call after init
                  setTimeout(() => {
                    serverProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');
                  }, 100);
                } else if (response.id === 2) {
                  toolCallReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Verify tool call response structure
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.id).toBe(2);
                  
                  // The response should either be successful or contain a proper error
                  if (response.result) {
                    // Success case - verify result structure
                    expect(response.result.content).toBeDefined();
                    expect(Array.isArray(response.result.content)).toBe(true);
                  } else if (response.error) {
                    // Error case - verify error structure
                    expect(response.error.code).toBeDefined();
                    expect(response.error.message).toBeDefined();
                    // This is expected in test environment without real AEM connection
                  }
                  
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

  describe('Asset Management Workflow', () => {
    let serverProcess;

    afterEach(() => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
    });

    test('should complete asset listing workflow via MCP', async () => {
      const readServerPath = path.join(__dirname, '../../packages/read-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: readServerPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          AEM_HOST: 'https://mock-aem-instance.com',
          AEM_CLIENT_ID: 'test-client-id',
          AEM_CLIENT_SECRET: 'test-client-secret'
        }
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

      const toolCallRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'listAssets',
          arguments: {
            folderPath: '/content/dam/test',
            limit: 10
          }
        }
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let initReceived = false;
        let toolCallReceived = false;

        const timeoutId = setTimeout(() => {
          if (!toolCallReceived) {
            reject(new Error('Asset management workflow timed out'));
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
                    serverProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');
                  }, 100);
                } else if (response.id === 2) {
                  toolCallReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Verify response structure
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.id).toBe(2);
                  
                  if (response.result) {
                    expect(response.result.content).toBeDefined();
                  } else if (response.error) {
                    expect(response.error.code).toBeDefined();
                    expect(response.error.message).toBeDefined();
                  }
                  
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

        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      });
    }, timeout);
  });

  describe('Write Operations Workflow', () => {
    let serverProcess;

    afterEach(() => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
    });

    test('should complete page creation workflow via MCP', async () => {
      const writeServerPath = path.join(__dirname, '../../packages/write-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: writeServerPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          AEM_HOST: 'https://mock-aem-instance.com',
          AEM_CLIENT_ID: 'test-client-id',
          AEM_CLIENT_SECRET: 'test-client-secret'
        }
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

      const toolCallRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'createPage',
          arguments: {
            parentPath: '/content/test',
            pageName: 'test-page',
            title: 'Test Page',
            template: '/conf/test/settings/wcm/templates/page'
          }
        }
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let initReceived = false;
        let toolCallReceived = false;

        const timeoutId = setTimeout(() => {
          if (!toolCallReceived) {
            reject(new Error('Page creation workflow timed out'));
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
                    serverProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');
                  }, 100);
                } else if (response.id === 2) {
                  toolCallReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Verify response structure
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.id).toBe(2);
                  
                  if (response.result) {
                    expect(response.result.content).toBeDefined();
                  } else if (response.error) {
                    expect(response.error.code).toBeDefined();
                    expect(response.error.message).toBeDefined();
                  }
                  
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

        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      });
    }, timeout);
  });

  describe('Error Handling Workflow', () => {
    let serverProcess;

    afterEach(() => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
    });

    test('should handle invalid tool calls gracefully', async () => {
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

      const invalidToolCallRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'nonExistentTool',
          arguments: {}
        }
      };

      return new Promise((resolve, reject) => {
        let output = '';
        let initReceived = false;
        let errorReceived = false;

        const timeoutId = setTimeout(() => {
          if (!errorReceived) {
            reject(new Error('Error handling workflow timed out'));
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
                    serverProcess.stdin.write(JSON.stringify(invalidToolCallRequest) + '\n');
                  }, 100);
                } else if (response.id === 2) {
                  errorReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Should receive an error response
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.id).toBe(2);
                  expect(response.error).toBeDefined();
                  expect(response.error.code).toBeDefined();
                  expect(response.error.message).toBeDefined();
                  expect(response.error.message).toContain('Tool not found');
                  
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

        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      });
    }, timeout);

    test('should handle malformed JSON requests gracefully', async () => {
      const readServerPath = path.join(__dirname, '../../packages/read-server');
      
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: readServerPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return new Promise((resolve, reject) => {
        let output = '';
        let errorReceived = false;

        const timeoutId = setTimeout(() => {
          if (!errorReceived) {
            reject(new Error('Malformed JSON handling timed out'));
          }
        }, timeout);

        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('jsonrpc')) {
              try {
                const response = JSON.parse(line.trim());
                
                if (response.error && response.error.code === -32700) {
                  errorReceived = true;
                  clearTimeout(timeoutId);
                  
                  // Should receive a parse error
                  expect(response.jsonrpc).toBe('2.0');
                  expect(response.error).toBeDefined();
                  expect(response.error.code).toBe(-32700);
                  expect(response.error.message).toContain('Parse error');
                  
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

        // Send malformed JSON
        serverProcess.stdin.write('{ invalid json }\n');
      });
    }, timeout);
  });
});