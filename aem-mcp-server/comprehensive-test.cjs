#!/usr/bin/env node

// Comprehensive test runner for AEM MCP Server
const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';
const AUTH = { username: 'admin', password: 'admin' };

class ComprehensiveTestRunner {
  constructor() {
    this.results = [];
    this.issues = [];
  }

  async runAllTests() {
    console.log('🚀 AEM MCP Comprehensive Test Runner Starting...\n');
    
    // Check server health
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      console.error('❌ Server is not healthy.');
      process.exit(1);
    }
    console.log('✅ Server is healthy\n');

    // Define comprehensive test suites
    const testSuites = [
      {
        name: 'Page Operations',
        tests: [
          { name: 'listPages', params: { siteRoot: '/content', depth: 2, limit: 10 } },
          { name: 'getPageProperties', params: { pagePath: '/content' } },
          { name: 'getPageContent', params: { pagePath: '/content' } },
          { name: 'getAllTextContent', params: { pagePath: '/content' } },
          { name: 'getPageImages', params: { pagePath: '/content' } },
          { name: 'createPage', params: { parentPath: '/content/test', title: 'MCP Test Page', template: '/apps/geometrixx/templates/contentpage' } },
        ]
      },
      {
        name: 'Component Operations',
        tests: [
          { name: 'scanPageComponents', params: { pagePath: '/content' } },
          { name: 'validateComponent', params: { locale: 'en', pagePath: '/content', component: 'text', props: { text: 'test' } } },
          { name: 'updateComponent', params: { componentPath: '/content/test/jcr:content/text', properties: { text: 'updated' } } },
          { name: 'bulkUpdateComponents', params: { updates: [{ componentPath: '/content/test', properties: { title: 'bulk test' } }] } },
        ]
      },
      {
        name: 'Asset Operations',
        tests: [
          { name: 'getAssetMetadata', params: { assetPath: '/content/dam' } },
          { name: 'uploadAsset', params: { parentPath: '/content/dam/test', fileName: 'test.txt', fileContent: 'dGVzdCBjb250ZW50' } },
        ]
      },
      {
        name: 'Search Operations',
        tests: [
          { name: 'searchContent', params: { type: 'cq:Page', limit: 5 } },
          { name: 'executeJCRQuery', params: { query: 'content', limit: 5 } },
          { name: 'enhancedPageSearch', params: { searchTerm: 'test', basePath: '/content' } },
        ]
      },
      {
        name: 'Template Operations',
        tests: [
          { name: 'getTemplates', params: {} },
          { name: 'getTemplateStructure', params: { templatePath: '/apps/geometrixx/templates/contentpage' } },
        ]
      },
      {
        name: 'Site Operations',
        tests: [
          { name: 'fetchSites', params: {} },
          { name: 'fetchLanguageMasters', params: { site: 'geometrixx' } },
          { name: 'fetchAvailableLocales', params: { site: 'geometrixx', languageMasterPath: '/content/geometrixx' } },
        ]
      },
      {
        name: 'Replication Operations',
        tests: [
          { name: 'replicateAndPublish', params: { selectedLocales: ['en'], componentData: { text: 'test' } } },
          { name: 'activatePage', params: { pagePath: '/content/test' } },
          { name: 'deactivatePage', params: { pagePath: '/content/test' } },
          { name: 'unpublishContent', params: { contentPaths: ['/content/test'] } },
        ]
      },
      {
        name: 'Legacy Operations',
        tests: [
          { name: 'getNodeContent', params: { path: '/content', depth: 1 } },
          { name: 'listChildren', params: { path: '/content' } },
        ]
      },
      {
        name: 'Utility Operations',
        tests: [
          { name: 'listMethods', params: {} },
          { name: 'getStatus', params: { workflowId: 'test-123' } },
          { name: 'undoChanges', params: { jobId: 'test-job' } },
        ]
      },
      {
        name: 'Error Scenarios',
        tests: [
          { name: 'createPage', params: { parentPath: '/invalid/path', title: 'Test', template: 'invalid' }, shouldFail: true },
          { name: 'updateComponent', params: { componentPath: '/invalid/component', properties: {} }, shouldFail: true },
          { name: 'getAssetMetadata', params: { assetPath: '/invalid/asset' }, shouldFail: true },
        ]
      }
    ];

    // Run all test suites
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate comprehensive report
    this.generateReport();
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      return response.data.status === 'healthy' || response.data.status === 'degraded';
    } catch (error) {
      return false;
    }
  }

  async runTestSuite(suite) {
    console.log(`\n📋 Running ${suite.name} (${suite.tests.length} tests)`);
    console.log('─'.repeat(50));

    for (const test of suite.tests) {
      await this.runTest(test, suite.name);
    }
  }

  async runTest(test, suiteName) {
    console.log(`🔍 ${test.name}`);
    const startTime = Date.now();

    try {
      const response = await axios.post(`${BASE_URL}/api/methods/${test.name}`, test.params, {
        auth: AUTH,
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true // Accept all status codes
      });

      const duration = Date.now() - startTime;
      const success = test.shouldFail ? 
        (response.data.success === false) :
        (response.status >= 200 && response.status < 300 && response.data.success !== false);

      this.results.push({
        suite: suiteName,
        test: test.name,
        success,
        duration,
        status: response.status,
        shouldFail: test.shouldFail || false,
        response: response.data
      });

      if (success) {
        console.log(`   ✅ Passed (${duration}ms)`);
      } else {
        console.log(`   ❌ Failed (${duration}ms) - Status: ${response.status}`);
        this.createIssue(test, suiteName, response);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const success = test.shouldFail; // If we expected failure and got an error, that's success

      this.results.push({
        suite: suiteName,
        test: test.name,
        success,
        duration,
        error: error.message,
        shouldFail: test.shouldFail || false
      });

      if (success) {
        console.log(`   ✅ Passed (expected failure) (${duration}ms)`);
      } else {
        console.log(`   ❌ Failed with error (${duration}ms)`);
        console.log(`      ${error.message}`);
        this.createIssue(test, suiteName, null, error);
      }
    }
  }

  createIssue(test, suiteName, response, error) {
    const issue = {
      id: `AEM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      severity: this.determineSeverity(test.name, suiteName),
      category: suiteName.toLowerCase().replace(' ', '_'),
      method: test.name,
      description: `Method "${test.name}" failed in ${suiteName}`,
      reproductionSteps: [
        `Execute method: ${test.name}`,
        `With parameters: ${JSON.stringify(test.params)}`,
        `Expected: ${test.shouldFail ? 'Failure' : 'Success'}`
      ],
      expectedBehavior: test.shouldFail ? 'Method should fail appropriately' : 'Method should succeed',
      actualBehavior: error ? error.message : `HTTP ${response?.status}: ${response?.data?.error?.message || 'Unexpected response'}`,
      errorDetails: {
        httpStatus: response?.status,
        response: response?.data,
        error: error?.message,
        parameters: test.params
      },
      status: 'open',
      createdAt: new Date().toISOString(),
      testCaseId: `${suiteName}-${test.name}`
    };

    this.issues.push(issue);
  }

  determineSeverity(methodName, suiteName) {
    // Critical: Core page and component operations (only if not error scenarios)
    if (['createPage', 'updateComponent', 'uploadAsset'].includes(methodName) && suiteName !== 'Error Scenarios') {
      return 'critical';
    }
    
    // High: Important operations
    if (['deletePage', 'activatePage', 'searchContent', 'listPages'].includes(methodName)) {
      return 'high';
    }
    
    // Medium: Standard operations
    if (suiteName.includes('Page') || suiteName.includes('Component')) {
      return 'medium';
    }
    
    // Low: Utility and legacy operations
    return 'low';
  }

  generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80));

    // Overall summary
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Pass Rate: ${passRate}%`);

    // Suite breakdown
    const suiteStats = {};
    this.results.forEach(result => {
      if (!suiteStats[result.suite]) {
        suiteStats[result.suite] = { total: 0, passed: 0, failed: 0 };
      }
      suiteStats[result.suite].total++;
      if (result.success) {
        suiteStats[result.suite].passed++;
      } else {
        suiteStats[result.suite].failed++;
      }
    });

    console.log(`\n📋 Suite Breakdown:`);
    Object.entries(suiteStats).forEach(([suite, stats]) => {
      const suitePassRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${suite}: ${stats.passed}/${stats.total} (${suitePassRate}%)`);
    });

    // Issues summary
    if (this.issues.length > 0) {
      console.log(`\n🐛 Issues Found (${this.issues.length}):`);
      
      const issuesBySeverity = {};
      this.issues.forEach(issue => {
        issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
      });

      Object.entries(issuesBySeverity).forEach(([severity, count]) => {
        const emoji = severity === 'critical' ? '🔴' : 
                     severity === 'high' ? '🟠' : 
                     severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${emoji} ${severity.toUpperCase()}: ${count}`);
      });

      console.log(`\n🔍 Top Issues:`);
      this.issues
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 10)
        .forEach((issue, index) => {
          console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.method}: ${issue.actualBehavior}`);
        });

      // Save comprehensive report
      const report = {
        timestamp: new Date().toISOString(),
        summary: { total, passed, failed, passRate },
        suiteStats,
        issues: this.issues,
        results: this.results
      };

      try {
        if (!fs.existsSync('logs')) {
          fs.mkdirSync('logs');
        }
        fs.writeFileSync('logs/comprehensive-test-report.json', JSON.stringify(report, null, 2));
        console.log(`\n💾 Full report saved to: logs/comprehensive-test-report.json`);
      } catch (error) {
        console.error(`❌ Failed to save report: ${error.message}`);
      }
    } else {
      console.log(`\n✨ No issues found!`);
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Run comprehensive tests
const runner = new ComprehensiveTestRunner();
runner.runAllTests().catch((error) => {
  console.error('❌ Comprehensive test runner failed:', error);
  process.exit(1);
});