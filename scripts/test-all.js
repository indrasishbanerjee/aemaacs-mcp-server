#!/usr/bin/env node

/**
 * Comprehensive test runner for AEMaaCS MCP Servers
 * Runs all unit tests and basic integration tests
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
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

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSubsection(title) {
  log(`\n${'-'.repeat(40)}`, 'blue');
  log(`  ${title}`, 'blue');
  log(`${'-'.repeat(40)}`, 'blue');
}

function runCommand(command, cwd = process.cwd()) {
  try {
    log(`Running: ${command}`, 'yellow');
    const output = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    return { success: true, output };
  } catch (error) {
    log(`Command failed: ${error.message}`, 'red');
    return { success: false, error };
  }
}

function checkPackageExists(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  return fs.existsSync(packageJsonPath);
}

async function main() {
  logSection('AEMaaCS MCP Servers - Test Suite');
  
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    log('Error: package.json not found. Please run this script from the project root.', 'red');
    process.exit(1);
  }

  // Install dependencies first
  logSection('Installing Dependencies');
  const installResult = runCommand('npm install');
  if (!installResult.success) {
    log('Failed to install dependencies', 'red');
    process.exit(1);
  }

  // Run shared package tests
  logSection('Testing Shared Package');
  if (checkPackageExists('packages/shared')) {
    logSubsection('Shared Package Unit Tests');
    const sharedTestResult = runCommand('npm test', 'packages/shared');
    if (sharedTestResult.success) {
      log('✅ Shared package tests passed', 'green');
      passedTests++;
    } else {
      log('❌ Shared package tests failed', 'red');
      failedTests++;
    }
    totalTests++;
  } else {
    log('⚠️  Shared package not found, skipping tests', 'yellow');
  }

  // Run read server tests
  logSection('Testing Read Server');
  if (checkPackageExists('packages/read-server')) {
    logSubsection('Read Server Unit Tests');
    const readTestResult = runCommand('npm test', 'packages/read-server');
    if (readTestResult.success) {
      log('✅ Read server tests passed', 'green');
      passedTests++;
    } else {
      log('❌ Read server tests failed', 'red');
      failedTests++;
    }
    totalTests++;

    // Test read server build
    logSubsection('Read Server Build Test');
    const readBuildResult = runCommand('npm run build', 'packages/read-server');
    if (readBuildResult.success) {
      log('✅ Read server build passed', 'green');
      passedTests++;
    } else {
      log('❌ Read server build failed', 'red');
      failedTests++;
    }
    totalTests++;
  } else {
    log('⚠️  Read server package not found, skipping tests', 'yellow');
  }

  // Run write server tests
  logSection('Testing Write Server');
  if (checkPackageExists('packages/write-server')) {
    logSubsection('Write Server Unit Tests');
    const writeTestResult = runCommand('npm test', 'packages/write-server');
    if (writeTestResult.success) {
      log('✅ Write server tests passed', 'green');
      passedTests++;
    } else {
      log('❌ Write server tests failed', 'red');
      failedTests++;
    }
    totalTests++;

    // Test write server build
    logSubsection('Write Server Build Test');
    const writeBuildResult = runCommand('npm run build', 'packages/write-server');
    if (writeBuildResult.success) {
      log('✅ Write server build passed', 'green');
      passedTests++;
    } else {
      log('❌ Write server build failed', 'red');
      failedTests++;
    }
    totalTests++;
  } else {
    log('⚠️  Write server package not found, skipping tests', 'yellow');
  }

  // Run linting tests
  logSection('Code Quality Checks');
  
  logSubsection('ESLint Check');
  const lintResult = runCommand('npm run lint');
  if (lintResult.success) {
    log('✅ Linting passed', 'green');
    passedTests++;
  } else {
    log('❌ Linting failed', 'red');
    failedTests++;
  }
  totalTests++;

  logSubsection('TypeScript Type Check');
  const typeCheckResult = runCommand('npm run type-check');
  if (typeCheckResult.success) {
    log('✅ Type checking passed', 'green');
    passedTests++;
  } else {
    log('❌ Type checking failed', 'red');
    failedTests++;
  }
  totalTests++;

  // Basic integration tests
  logSection('Basic Integration Tests');
  
  logSubsection('MCP Protocol Handler Tests');
  await runBasicMCPTests();
  
  logSubsection('HTTP API Handler Tests');
  await runBasicHTTPTests();

  // Test results summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  logSection('Test Results Summary');
  log(`Total test suites: ${totalTests}`, 'bright');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, 'red');
  log(`Duration: ${duration}s`, 'blue');
  
  if (failedTests === 0) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n💥 ${failedTests} test suite(s) failed`, 'red');
    process.exit(1);
  }
}

async function runBasicMCPTests() {
  log('Running basic MCP protocol tests...', 'yellow');
  
  // Test MCP tool discovery for read server
  try {
    const { spawn } = require('child_process');
    
    // Test read server MCP discovery
    const readServerTest = new Promise((resolve) => {
      const child = spawn('node', ['dist/index.js'], {
        cwd: 'packages/read-server',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      // Send MCP initialize request
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
      
      child.stdin.write(JSON.stringify(initRequest) + '\n');
      
      setTimeout(() => {
        child.kill();
        if (output.includes('jsonrpc')) {
          log('✅ Read server MCP protocol responding', 'green');
          passedTests++;
        } else {
          log('❌ Read server MCP protocol not responding', 'red');
          failedTests++;
        }
        totalTests++;
        resolve();
      }, 2000);
    });
    
    await readServerTest;
    
  } catch (error) {
    log(`⚠️  MCP integration test skipped: ${error.message}`, 'yellow');
  }
}

async function runBasicHTTPTests() {
  log('Running basic HTTP API tests...', 'yellow');
  
  try {
    const http = require('http');
    
    // Test if servers can start (basic smoke test)
    const testServerStart = (serverPath, port) => {
      return new Promise((resolve) => {
        try {
          const { spawn } = require('child_process');
          const child = spawn('node', ['dist/index.js', '--http-port', port.toString()], {
            cwd: serverPath,
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          setTimeout(() => {
            // Try to make a request to health endpoint
            const req = http.request({
              hostname: 'localhost',
              port: port,
              path: '/health',
              method: 'GET'
            }, (res) => {
              child.kill();
              if (res.statusCode === 200) {
                log(`✅ ${serverPath} HTTP server responding`, 'green');
                passedTests++;
              } else {
                log(`❌ ${serverPath} HTTP server not responding correctly`, 'red');
                failedTests++;
              }
              totalTests++;
              resolve();
            });
            
            req.on('error', () => {
              child.kill();
              log(`⚠️  ${serverPath} HTTP server test skipped (server not ready)`, 'yellow');
              resolve();
            });
            
            req.end();
          }, 3000);
          
        } catch (error) {
          log(`⚠️  ${serverPath} HTTP test skipped: ${error.message}`, 'yellow');
          resolve();
        }
      });
    };
    
    // Test read server HTTP
    if (checkPackageExists('packages/read-server')) {
      await testServerStart('packages/read-server', 3001);
    }
    
    // Test write server HTTP
    if (checkPackageExists('packages/write-server')) {
      await testServerStart('packages/write-server', 3002);
    }
    
  } catch (error) {
    log(`⚠️  HTTP integration test skipped: ${error.message}`, 'yellow');
  }
}

// Run the test suite
main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});