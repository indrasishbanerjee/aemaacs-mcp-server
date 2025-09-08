#!/usr/bin/env node

// Simple test runner for AEM MCP Server
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const AUTH = { username: 'admin', password: 'admin' };

class SimpleTestRunner {
  constructor() {
    this.results = [];
    this.issues = [];
  }

  async runQuickTests() {
    console.log('🚀 AEM MCP Quick Test Runner Starting...\n');
    console.log(`📡 Server: ${BASE_URL}`);
    console.log(`👤 User: ${AUTH.username}\n`);

    // Check server health first
    console.log('🏥 Checking server health...');
    const isHealthy = await this.checkHealth();
    
    if (!isHealthy) {
      console.error('❌ Server is not healthy. Please check your AEM MCP server.');
      process.exit(1);
    }
    
    console.log('✅ Server is healthy\n');

    // Run essential tests
    const tests = [
      { name: 'listMethods', description: 'List all available methods', params: {} },
      { name: 'listPages', description: 'List pages with default parameters', params: { siteRoot: '/content', depth: 1, limit: 5 } },
      { name: 'fetchSites', description: 'Fetch all available sites', params: {} },
      { name: 'getTemplates', description: 'Get available templates', params: {} },
      { name: 'searchContent', description: 'Search for pages', params: { type: 'cq:Page', limit: 5 } }
    ];

    console.log(`📋 Running ${tests.length} essential tests:\n`);

    for (const test of tests) {
      await this.runTest(test);
    }

    // Generate summary
    this.generateSummary();
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      return response.data.status === 'healthy' || response.data.status === 'degraded';
    } catch (error) {
      console.error('Health check failed:', error.message);
      return false;
    }
  }

  async runTest(test) {
    console.log(`🔍 Testing: ${test.name} - ${test.description}`);
    const startTime = Date.now();

    try {
      // Try REST API first
      const response = await axios.post(`${BASE_URL}/api/methods/${test.name}`, test.params, {
        auth: AUTH,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      this.results.push({
        test: test.name,
        success,
        duration,
        response: response.data
      });

      if (success) {
        console.log(`✅ ${test.name} passed (${duration}ms)`);
      } else {
        console.log(`❌ ${test.name} failed (${duration}ms)`);
        this.createIssue(test, `HTTP ${response.status}`, response.data);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: test.name,
        success: false,
        duration,
        error: error.message
      });

      console.log(`❌ ${test.name} failed with error (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      
      this.createIssue(test, error.message, { 
        status: error.response?.status,
        data: error.response?.data 
      });
    }
  }

  createIssue(test, error, details) {
    this.issues.push({
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      method: test.name,
      description: `Test "${test.description}" failed`,
      error,
      details,
      severity: this.determineSeverity(test.name),
      timestamp: new Date().toISOString()
    });
  }

  determineSeverity(methodName) {
    if (['listMethods', 'fetchSites'].includes(methodName)) return 'high';
    if (['listPages', 'searchContent'].includes(methodName)) return 'medium';
    return 'low';
  }

  generateSummary() {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

    console.log('\n' + '='.repeat(60));
    console.log('📊 QUICK TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n📈 Results:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Pass Rate: ${passRate}%`);

    if (this.issues.length > 0) {
      console.log(`\n🐛 Issues Found (${this.issues.length}):`);
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.method}: ${issue.error}`);
      });

      // Save issues to file
      const issueLog = {
        timestamp: new Date().toISOString(),
        summary: { total, passed, failed, passRate },
        issues: this.issues,
        results: this.results
      };

      try {
        if (!fs.existsSync('logs')) {
          fs.mkdirSync('logs');
        }
        fs.writeFileSync('logs/quick-test-issues.json', JSON.stringify(issueLog, null, 2));
        console.log(`\n💾 Issues saved to: logs/quick-test-issues.json`);
      } catch (error) {
        console.error(`❌ Failed to save issues: ${error.message}`);
      }
    } else {
      console.log(`\n✨ No issues found!`);
    }

    console.log('\n' + '='.repeat(60));

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Run tests
const runner = new SimpleTestRunner();
runner.runQuickTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});