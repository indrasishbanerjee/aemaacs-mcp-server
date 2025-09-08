#!/usr/bin/env node

/**
 * Simple script to run both AEM MCP servers for development/testing
 * This bypasses TypeScript compilation issues and runs the servers directly
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if .env file exists
if (!fs.existsSync('.env')) {
  log('⚠️  .env file not found. Creating from .env.example...', 'yellow');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    log('✅ Created .env file. Please edit it with your AEM credentials.', 'green');
    log('📝 Edit the following in .env:', 'cyan');
    log('   - AEM_HOST: Your AEMaaCS instance URL', 'cyan');
    log('   - AEM_CLIENT_ID: Your service account client ID', 'cyan');
    log('   - AEM_CLIENT_SECRET: Your service account secret', 'cyan');
    log('   - API_KEY: A secure API key for write operations', 'cyan');
    log('', 'reset');
    log('Press Enter to continue with default/mock values, or Ctrl+C to exit and configure...', 'yellow');
    
    // Wait for user input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      startServers();
    });
  } else {
    log('❌ .env.example file not found. Cannot create configuration.', 'red');
    process.exit(1);
  }
} else {
  startServers();
}

function startServers() {
  log('🚀 Starting AEMaaCS MCP Servers...', 'bright');
  log('', 'reset');

  // Environment variables for the servers
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    AEM_HOST: process.env.AEM_HOST || 'https://mock-aem-instance.com',
    AEM_CLIENT_ID: process.env.AEM_CLIENT_ID || 'mock-client-id',
    AEM_CLIENT_SECRET: process.env.AEM_CLIENT_SECRET || 'mock-client-secret',
    API_KEY: process.env.API_KEY || 'development-api-key-12345',
    LOG_LEVEL: 'info',
    MOCK_AEM: 'true' // Enable mock mode for development
  };

  // Start Read Server
  log('📖 Starting Read Server on port 3001...', 'blue');
  const readServer = spawn('node', ['-r', 'ts-node/register', 'packages/read-server/src/index.ts'], {
    env: { ...env, SERVER_PORT: '3001' },
    stdio: 'pipe'
  });

  readServer.stdout.on('data', (data) => {
    log(`[READ] ${data.toString().trim()}`, 'blue');
  });

  readServer.stderr.on('data', (data) => {
    log(`[READ ERROR] ${data.toString().trim()}`, 'red');
  });

  // Start Write Server
  log('✏️  Starting Write Server on port 3002...', 'magenta');
  const writeServer = spawn('node', ['-r', 'ts-node/register', 'packages/write-server/src/index.ts'], {
    env: { ...env, SERVER_PORT: '3002' },
    stdio: 'pipe'
  });

  writeServer.stdout.on('data', (data) => {
    log(`[WRITE] ${data.toString().trim()}`, 'magenta');
  });

  writeServer.stderr.on('data', (data) => {
    log(`[WRITE ERROR] ${data.toString().trim()}`, 'red');
  });

  // Handle process termination
  process.on('SIGINT', () => {
    log('', 'reset');
    log('🛑 Shutting down servers...', 'yellow');
    readServer.kill();
    writeServer.kill();
    process.exit(0);
  });

  // Show status after a delay
  setTimeout(() => {
    log('', 'reset');
    log('🎉 Servers should be running!', 'green');
    log('', 'reset');
    log('📊 Server Status:', 'bright');
    log('   Read Server:  http://localhost:3001', 'blue');
    log('   Write Server: http://localhost:3002', 'magenta');
    log('', 'reset');
    log('🔧 Test Commands:', 'bright');
    log('   curl http://localhost:3001/health', 'cyan');
    log('   curl http://localhost:3002/health', 'cyan');
    log('   curl http://localhost:3001/api/tools', 'cyan');
    log('', 'reset');
    log('📋 Cursor MCP Configuration:', 'bright');
    log('   Add the following to your Cursor MCP settings:', 'cyan');
    log('', 'reset');
    
    const mcpConfig = {
      "mcpServers": {
        "aem-read-server": {
          "command": "node",
          "args": ["-r", "ts-node/register", path.resolve("packages/read-server/src/index.ts"), "--stdio"],
          "cwd": process.cwd(),
          "env": {
            "AEM_HOST": env.AEM_HOST,
            "AEM_CLIENT_ID": env.AEM_CLIENT_ID,
            "AEM_CLIENT_SECRET": env.AEM_CLIENT_SECRET,
            "LOG_LEVEL": "info",
            "MOCK_AEM": "true"
          }
        },
        "aem-write-server": {
          "command": "node",
          "args": ["-r", "ts-node/register", path.resolve("packages/write-server/src/index.ts"), "--stdio"],
          "cwd": process.cwd(),
          "env": {
            "AEM_HOST": env.AEM_HOST,
            "AEM_CLIENT_ID": env.AEM_CLIENT_ID,
            "AEM_CLIENT_SECRET": env.AEM_CLIENT_SECRET,
            "API_KEY": env.API_KEY,
            "LOG_LEVEL": "info",
            "MOCK_AEM": "true"
          }
        }
      }
    };
    
    log(JSON.stringify(mcpConfig, null, 2), 'cyan');
    log('', 'reset');
    log('Press Ctrl+C to stop the servers', 'yellow');
  }, 3000);
}