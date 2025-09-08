#!/usr/bin/env node

/**
 * Start both AEM MCP servers on different ports
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting AEMaaCS MCP Servers...\n');

// Start Read Server on port 3003
console.log('📖 Starting AEMaaCS Read Server on port 3003...');
const readServer = spawn('node', ['aemaacs-read-server.js'], {
  env: { ...process.env, SERVER_PORT: '3003' },
  stdio: 'inherit'
});

// Start Write Server on port 3004  
console.log('✏️  Starting AEMaaCS Write Server on port 3004...');
const writeServer = spawn('node', ['aemaacs-write-server.js'], {
  env: { ...process.env, SERVER_PORT: '3004', API_KEY: 'development-api-key-12345' },
  stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  readServer.kill();
  writeServer.kill();
  process.exit(0);
});

// Show configuration after delay
setTimeout(() => {
  console.log('\n🎉 Both AEMaaCS servers should be running!');
  console.log('\n📊 Server Status:');
  console.log('   AEMaaCS Read Server:  http://localhost:3003');
  console.log('   AEMaaCS Write Server: http://localhost:3004');
  console.log('\n🔧 Test Commands:');
  console.log('   curl http://localhost:3003/health');
  console.log('   curl http://localhost:3004/health');
  console.log('   curl -H "X-API-Key: development-api-key-12345" http://localhost:3004/api/tools');
  console.log('\nPress Ctrl+C to stop both servers');
}, 2000);