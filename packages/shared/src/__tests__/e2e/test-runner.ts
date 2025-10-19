/**
 * Comprehensive End-to-End Test Runner
 * Executes all E2E tests systematically with detailed reporting
 */

import { AEMHttpClient } from '../../client/aem-http-client.js';
import { ConfigManager } from '../../config/index.js';
import { Logger } from '../../utils/logger.js';
import { STDIOHandler } from '../../mcp/stdio-handler.js';
import { HealthCheckService } from '../../utils/health-check.js';
import { MetricsCollector } from '../../utils/metrics.js';
import { AuditLogger } from '../../utils/audit-logger.js';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  status: 'passed' | 'failed' | 'partial';
}

interface TestReport {
  timestamp: Date;
  duration: number;
  suites: TestSuite[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  environment: {
    nodeVersion: string;
    aemVersion?: string;
    config: any;
  };
}

export class E2ETestRunner {
  private client: AEMHttpClient;
  private config: ConfigManager;
  private logger: Logger;
  private stdioHandler: STDIOHandler;
  private healthCheckService: HealthCheckService;
  private metricsCollector: MetricsCollector;
  private auditLogger: AuditLogger;
  private startTime: Date;
  private report: TestReport;

  constructor() {
    this.logger = Logger.getInstance();
    this.startTime = new Date();
    this.report = {
      timestamp: this.startTime,
      duration: 0,
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        successRate: 0
      },
      environment: {
        nodeVersion: process.version,
        config: {}
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize configuration
      this.config = ConfigManager.getInstance();
      await this.config.load();

      // Initialize AEM client
      this.client = new AEMHttpClient(this.config.getAEMConfig());

      // Initialize services
      this.stdioHandler = new STDIOHandler(this.client);
      this.healthCheckService = new HealthCheckService(this.client, this.config);
      this.metricsCollector = new MetricsCollector();
      this.auditLogger = new AuditLogger();

      // Connect to AEM
      await this.client.connect();

      // Get AEM version for environment info
      try {
        const systemInfo = await this.client.get('/system/console/bundles.json');
        this.report.environment.aemVersion = systemInfo.data?.['sling:version'] || 'Unknown';
      } catch (error) {
        this.logger.warn('Could not retrieve AEM version');
      }

      this.report.environment.config = {
        baseUrl: this.config.getAEMConfig().baseUrl,
        authType: this.config.getAEMConfig().auth.type
      };

      this.logger.info('E2E Test Runner initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize E2E Test Runner', error as Error);
      throw error;
    }
  }

  async runTest(testName: string, testFunction: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      return {
        name: testName,
        status: 'passed',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: testName,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runTestSuite(suiteName: string, tests: Array<{ name: string; fn: () => Promise<void> }>): Promise<TestSuite> {
    this.logger.info(`Running test suite: ${suiteName}`);
    const suiteStartTime = Date.now();
    const testResults: TestResult[] = [];

    for (const test of tests) {
      this.logger.info(`  Running test: ${test.name}`);
      const result = await this.runTest(test.name, test.fn);
      testResults.push(result);
      
      if (result.status === 'failed') {
        this.logger.error(`  Test failed: ${test.name} - ${result.error}`);
      } else {
        this.logger.info(`  Test passed: ${test.name} (${result.duration}ms)`);
      }
    }

    const suiteDuration = Date.now() - suiteStartTime;
    const failedTests = testResults.filter(t => t.status === 'failed');
    const status = failedTests.length === 0 ? 'passed' : 
                   failedTests.length === testResults.length ? 'failed' : 'partial';

    const suite: TestSuite = {
      name: suiteName,
      tests: testResults,
      duration: suiteDuration,
      status
    };

    this.logger.info(`Test suite completed: ${suiteName} - ${status} (${suiteDuration}ms)`);
    return suite;
  }

  async runCoreWorkflowTests(): Promise<TestSuite> {
    return await this.runTestSuite('Core Workflow Tests', [
      {
        name: 'Complete Page Management Workflow',
        fn: async () => {
          await this.stdioHandler.start();

          const testPath = `/content/test-core-${Date.now()}`;
          const pagePath = `${testPath}/test-page`;

          // Create page
          const createResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'createPage',
              arguments: {
                path: pagePath,
                title: 'Core Test Page',
                template: '/conf/we-retail/settings/wcm/templates/content-page'
              }
            }
          });

          if (!createResponse.result?.success) {
            throw new Error('Failed to create page');
          }

          // Update content
          const updateResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'updatePageContent',
              arguments: {
                path: pagePath,
                content: { 'jcr:title': 'Updated Core Test Page' }
              }
            }
          });

          if (!updateResponse.result?.success) {
            throw new Error('Failed to update page content');
          }

          // Publish page
          const publishResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'publishContent',
              arguments: { contentPath: pagePath, deep: false }
            }
          });

          if (!publishResponse.result?.success) {
            throw new Error('Failed to publish page');
          }

          // Cleanup
          await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
              name: 'deletePage',
              arguments: { path: pagePath }
            }
          });
        }
      },
      {
        name: 'Asset Management Workflow',
        fn: async () => {
          await this.stdioHandler.start();

          const testAssetPath = `/content/dam/test-core-${Date.now()}/test-asset.jpg`;
          const testImageContent = Buffer.from('fake-image-content').toString('base64');

          // Create folder
          await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 11,
            method: 'tools/call',
            params: {
              name: 'createFolder',
              arguments: {
                parentPath: '/content/dam',
                folderName: `test-core-${Date.now()}`
              }
            }
          });

          // Upload asset
          const uploadResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 12,
            method: 'tools/call',
            params: {
              name: 'uploadAsset',
              arguments: {
                parentPath: `/content/dam/test-core-${Date.now()}`,
                fileName: 'test-asset.jpg',
                fileContent: testImageContent,
                metadata: { 'dc:title': 'Core Test Asset' }
              }
            }
          });

          if (!uploadResponse.result?.success) {
            throw new Error('Failed to upload asset');
          }

          // Cleanup
          await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 13,
            method: 'tools/call',
            params: {
              name: 'deleteAsset',
              arguments: { assetPath: testAssetPath }
            }
          });
        }
      }
    ]);
  }

  async runEnhancedFeatureTests(): Promise<TestSuite> {
    return await this.runTestSuite('Enhanced Feature Tests', [
      {
        name: 'Content Fragment Operations',
        fn: async () => {
          await this.stdioHandler.start();

          const listModelsResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 21,
            method: 'tools/call',
            params: {
              name: 'listContentFragmentModels',
              arguments: {}
            }
          });

          if (!listModelsResponse.result?.success) {
            throw new Error('Failed to list content fragment models');
          }
        }
      },
      {
        name: 'Workflow Management',
        fn: async () => {
          await this.stdioHandler.start();

          const listModelsResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 31,
            method: 'tools/call',
            params: {
              name: 'listWorkflowModels',
              arguments: {}
            }
          });

          if (!listModelsResponse.result?.success) {
            throw new Error('Failed to list workflow models');
          }
        }
      },
      {
        name: 'Advanced Search',
        fn: async () => {
          await this.stdioHandler.start();

          const searchResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 41,
            method: 'tools/call',
            params: {
              name: 'advancedSearch',
              arguments: {
                query: 'we-retail',
                type: 'page',
                limit: 5
              }
            }
          });

          if (!searchResponse.result?.success) {
            throw new Error('Failed to perform advanced search');
          }
        }
      },
      {
        name: 'Permission Management',
        fn: async () => {
          await this.stdioHandler.start();

          const aclResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 51,
            method: 'tools/call',
            params: {
              name: 'readACL',
              arguments: {
                path: '/content/we-retail'
              }
            }
          });

          if (!aclResponse.result?.success) {
            throw new Error('Failed to read ACL');
          }
        }
      },
      {
        name: 'Replication Management',
        fn: async () => {
          await this.stdioHandler.start();

          const queueResponse = await this.stdioHandler.sendRequest({
            jsonrpc: '2.0',
            id: 61,
            method: 'tools/call',
            params: {
              name: 'getReplicationQueueStatus',
              arguments: {}
            }
          });

          if (!queueResponse.result?.success) {
            throw new Error('Failed to get replication queue status');
          }
        }
      }
    ]);
  }

  async runConcurrentOperationTests(): Promise<TestSuite> {
    return await this.runTestSuite('Concurrent Operation Tests', [
      {
        name: 'Multiple Concurrent MCP Requests',
        fn: async () => {
          await this.stdioHandler.start();

          const concurrentRequests = Array.from({ length: 5 }, (_, index) => ({
            jsonrpc: '2.0',
            id: 100 + index,
            method: 'tools/call',
            params: {
              name: 'searchContent',
              arguments: {
                query: `test-${index}`,
                type: 'system'
              }
            }
          }));

          const responses = await Promise.allSettled(
            concurrentRequests.map(request => this.stdioHandler.sendRequest(request))
          );

          const failedResponses = responses.filter(r => r.status === 'rejected');
          if (failedResponses.length > 2) { // Allow some failures
            throw new Error(`Too many concurrent requests failed: ${failedResponses.length}/5`);
          }
        }
      },
      {
        name: 'High Concurrency Stress Test',
        fn: async () => {
          await this.stdioHandler.start();

          const stressRequests = Array.from({ length: 10 }, (_, index) => ({
            jsonrpc: '2.0',
            id: 200 + index,
            method: 'tools/call',
            params: {
              name: 'listPages',
              arguments: {
                path: '/content/we-retail',
                depth: 1
              }
            }
          }));

          const startTime = Date.now();
          const responses = await Promise.allSettled(
            stressRequests.map(request => this.stdioHandler.sendRequest(request))
          );
          const duration = Date.now() - startTime;

          const successfulResponses = responses.filter(r => 
            r.status === 'fulfilled' && r.value.result?.success
          );

          if (successfulResponses.length < 5) {
            throw new Error(`Stress test failed: only ${successfulResponses.length}/10 requests succeeded`);
          }

          if (duration > 15000) {
            throw new Error(`Stress test too slow: ${duration}ms`);
          }
        }
      }
    ]);
  }

  async runErrorRecoveryTests(): Promise<TestSuite> {
    return await this.runTestSuite('Error Recovery Tests', [
      {
        name: 'Malformed Request Handling',
        fn: async () => {
          await this.stdioHandler.start();

          const malformedRequest = {
            id: 301,
            method: 'tools/call',
            params: {
              name: 'listPages',
              arguments: { path: '/content/test' }
            }
          };

          try {
            await this.stdioHandler.sendRequest(malformedRequest);
            throw new Error('Should have failed with malformed request');
          } catch (error) {
            // Expected to fail
            if (!error.message.includes('jsonrpc') && !error.message.includes('invalid')) {
              throw new Error(`Unexpected error: ${error.message}`);
            }
          }
        }
      },
      {
        name: 'Invalid Tool Name Handling',
        fn: async () => {
          await this.stdioHandler.start();

          const invalidToolRequest = {
            jsonrpc: '2.0',
            id: 302,
            method: 'tools/call',
            params: {
              name: 'invalidTool',
              arguments: {}
            }
          };

          const response = await this.stdioHandler.sendRequest(invalidToolRequest);
          
          if (response.result?.success) {
            throw new Error('Should have failed with invalid tool name');
          }
        }
      }
    ]);
  }

  async runAllTests(): Promise<TestReport> {
    try {
      await this.initialize();

      // Run all test suites
      const suites = await Promise.all([
        this.runCoreWorkflowTests(),
        this.runEnhancedFeatureTests(),
        this.runConcurrentOperationTests(),
        this.runErrorRecoveryTests()
      ]);

      this.report.suites = suites;

      // Calculate summary
      const allTests = suites.flatMap(suite => suite.tests);
      this.report.summary.total = allTests.length;
      this.report.summary.passed = allTests.filter(t => t.status === 'passed').length;
      this.report.summary.failed = allTests.filter(t => t.status === 'failed').length;
      this.report.summary.skipped = allTests.filter(t => t.status === 'skipped').length;
      this.report.summary.successRate = (this.report.summary.passed / this.report.summary.total) * 100;

      this.report.duration = Date.now() - this.startTime.getTime();

      // Generate final report
      this.generateReport();

      return this.report;
    } catch (error) {
      this.logger.error('E2E Test Runner failed', error as Error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private generateReport(): void {
    this.logger.info('='.repeat(80));
    this.logger.info('E2E TEST REPORT');
    this.logger.info('='.repeat(80));
    this.logger.info(`Timestamp: ${this.report.timestamp.toISOString()}`);
    this.logger.info(`Duration: ${this.report.duration}ms`);
    this.logger.info(`Environment: Node ${this.report.environment.nodeVersion}, AEM ${this.report.environment.aemVersion || 'Unknown'}`);
    this.logger.info('');

    this.logger.info('SUMMARY:');
    this.logger.info(`  Total Tests: ${this.report.summary.total}`);
    this.logger.info(`  Passed: ${this.report.summary.passed}`);
    this.logger.info(`  Failed: ${this.report.summary.failed}`);
    this.logger.info(`  Skipped: ${this.report.summary.skipped}`);
    this.logger.info(`  Success Rate: ${this.report.summary.successRate.toFixed(2)}%`);
    this.logger.info('');

    for (const suite of this.report.suites) {
      this.logger.info(`SUITE: ${suite.name} (${suite.status.toUpperCase()})`);
      this.logger.info(`  Duration: ${suite.duration}ms`);
      this.logger.info(`  Tests: ${suite.tests.length}`);
      
      for (const test of suite.tests) {
        const status = test.status.toUpperCase().padEnd(8);
        const duration = `${test.duration}ms`.padStart(8);
        this.logger.info(`    ${status} ${duration} ${test.name}`);
        
        if (test.status === 'failed' && test.error) {
          this.logger.info(`      ERROR: ${test.error}`);
        }
      }
      this.logger.info('');
    }

    this.logger.info('='.repeat(80));
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect();
      }
    } catch (error) {
      this.logger.error('Error during cleanup', error as Error);
    }
  }
}

// Export for use in test scripts
export async function runE2ETests(): Promise<TestReport> {
  const runner = new E2ETestRunner();
  return await runner.runAllTests();
}
