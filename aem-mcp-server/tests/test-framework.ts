import axios, { AxiosInstance } from 'axios';

export interface TestCase {
  id: string;
  methodName: string;
  description: string;
  category: 'page' | 'component' | 'asset' | 'search' | 'template' | 'site' | 'replication' | 'legacy' | 'utility';
  parameters: any;
  expectedResult?: any;
  shouldFail?: boolean;
  timeout?: number;
  dependencies?: string[]; // Other test IDs that must pass first
  cleanup?: boolean; // Whether this test needs cleanup
}

export interface TestResult {
  testCase: TestCase;
  success: boolean;
  response?: any;
  error?: string;
  duration: number;
  timestamp: string;
  httpStatus?: number;
}

export interface TestSuite {
  name: string;
  description: string;
  testCases: TestCase[];
}

export interface TestReport {
  suiteResults: TestSuiteResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timestamp: string;
  };
  issues: Issue[];
}

export interface TestSuiteResult {
  suite: TestSuite;
  results: TestResult[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

export interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  method: string;
  description: string;
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  errorDetails?: any;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  testCaseId?: string;
}

export class TestFramework {
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private credentials: { username: string; password: string };
  private testResults: TestResult[] = [];
  private issues: Issue[] = [];

  constructor(baseUrl: string = 'http://localhost:3001', credentials = { username: 'admin', password: 'admin' }) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
    this.httpClient = axios.create({
      baseURL: baseUrl,
      auth: credentials,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  async runTestSuite(suite: TestSuite): Promise<TestSuiteResult> {
    console.log(`\n🧪 Running test suite: ${suite.name}`);
    console.log(`📝 ${suite.description}`);
    console.log(`📊 ${suite.testCases.length} test cases\n`);

    const results: TestResult[] = [];
    const startTime = Date.now();

    for (const testCase of suite.testCases) {
      // Check dependencies
      if (testCase.dependencies && testCase.dependencies.length > 0) {
        const dependenciesMet = testCase.dependencies.every(depId => {
          const depResult = results.find(r => r.testCase.id === depId);
          return depResult && depResult.success;
        });

        if (!dependenciesMet) {
          console.log(`⏭️  Skipping ${testCase.id} - dependencies not met`);
          continue;
        }
      }

      const result = await this.runTestCase(testCase);
      results.push(result);
      this.testResults.push(result);

      // Generate issue if test failed
      if (!result.success) {
        this.generateIssue(result);
      }
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = suite.testCases.length - results.length;

    console.log(`\n📈 Suite Summary:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Duration: ${duration}ms\n`);

    return {
      suite,
      results,
      summary: {
        passed,
        failed,
        skipped,
        duration
      }
    };
  }

  async runTestCase(testCase: TestCase): Promise<TestResult> {
    console.log(`🔍 Testing: ${testCase.id} - ${testCase.description}`);
    
    const startTime = Date.now();
    let result: TestResult;

    try {
      const response = await this.executeMethod(testCase.methodName, testCase.parameters, testCase.timeout);
      const duration = Date.now() - startTime;

      const success = testCase.shouldFail ? false : this.validateResponse(response, testCase.expectedResult);
      
      result = {
        testCase,
        success,
        response: response.data,
        duration,
        timestamp: new Date().toISOString(),
        httpStatus: response.status
      };

      if (success) {
        console.log(`✅ ${testCase.id} passed (${duration}ms)`);
      } else {
        console.log(`❌ ${testCase.id} failed (${duration}ms)`);
        if (response.data?.error) {
          console.log(`   Error: ${response.data.error.message}`);
        }
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const success = testCase.shouldFail ? true : false;

      result = {
        testCase,
        success,
        error: error.message,
        duration,
        timestamp: new Date().toISOString(),
        httpStatus: error.response?.status
      };

      if (success) {
        console.log(`✅ ${testCase.id} passed (expected failure) (${duration}ms)`);
      } else {
        console.log(`❌ ${testCase.id} failed with error (${duration}ms)`);
        console.log(`   Error: ${error.message}`);
      }
    }

    return result;
  }

  private async executeMethod(methodName: string, parameters: any, timeout?: number): Promise<any> {
    const config = timeout ? { timeout } : {};
    
    // Try REST API first
    try {
      return await this.httpClient.post(`/api/methods/${methodName}`, parameters, config);
    } catch (error) {
      // Fallback to JSON-RPC
      const jsonRpcPayload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: methodName,
        params: parameters
      };
      
      return await this.httpClient.post('/mcp', jsonRpcPayload, config);
    }
  }

  private validateResponse(response: any, expectedResult?: any): boolean {
    // If this is an error scenario test, check if the response contains error details
    if (this.currentMethod?.shouldFail) {
      // For error scenarios, we expect success: false in the response body
      return response.data?.success === false;
    }

    // Basic validation - response should be successful
    if (response.data?.success === false) {
      return false;
    }

    // If no expected result specified, just check for successful response
    if (!expectedResult) {
      return response.status >= 200 && response.status < 300;
    }

    // Validate against expected result
    return this.deepCompare(response.data, expectedResult);
  }

  private deepCompare(actual: any, expected: any): boolean {
    if (typeof expected !== 'object' || expected === null) {
      return actual === expected;
    }

    for (const key in expected) {
      if (!(key in actual)) {
        return false;
      }
      if (!this.deepCompare(actual[key], expected[key])) {
        return false;
      }
    }

    return true;
  }

  private generateIssue(result: TestResult): void {
    const issue: Issue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: this.determineSeverity(result),
      category: result.testCase.category,
      method: result.testCase.methodName,
      description: `Test case "${result.testCase.description}" failed`,
      reproductionSteps: [
        `Execute method: ${result.testCase.methodName}`,
        `With parameters: ${JSON.stringify(result.testCase.parameters, null, 2)}`,
        `Expected: ${result.testCase.shouldFail ? 'Failure' : 'Success'}`,
        `Actual: ${result.success ? 'Success' : 'Failure'}`
      ],
      expectedBehavior: result.testCase.shouldFail ? 
        'Method should fail with appropriate error' : 
        'Method should succeed and return expected result',
      actualBehavior: result.error || 
        (result.response?.error?.message) || 
        'Unexpected response format',
      errorDetails: {
        httpStatus: result.httpStatus,
        response: result.response,
        error: result.error,
        duration: result.duration
      },
      status: 'open',
      createdAt: result.timestamp,
      testCaseId: result.testCase.id
    };

    this.issues.push(issue);
  }

  private determineSeverity(result: TestResult): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: Core functionality failures
    if (['createPage', 'updateComponent', 'uploadAsset'].includes(result.testCase.methodName)) {
      return 'critical';
    }

    // High: Important operations
    if (['deletePage', 'activatePage', 'searchContent'].includes(result.testCase.methodName)) {
      return 'high';
    }

    // Medium: Standard operations
    if (result.testCase.category === 'page' || result.testCase.category === 'component') {
      return 'medium';
    }

    // Low: Utility and legacy operations
    return 'low';
  }

  async generateReport(): Promise<TestReport> {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    return {
      suiteResults: [], // Will be populated by runAllSuites
      summary: {
        totalTests,
        passed,
        failed,
        skipped: 0,
        duration: totalDuration,
        timestamp: new Date().toISOString()
      },
      issues: this.issues
    };
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('❌ Server health check failed:', error);
      return false;
    }
  }

  getIssues(): Issue[] {
    return this.issues;
  }

  getTestResults(): TestResult[] {
    return this.testResults;
  }

  clearResults(): void {
    this.testResults = [];
    this.issues = [];
  }

  async exportReport(format: 'json' | 'html' = 'json'): Promise<string> {
    const report = await this.generateReport();
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      return this.generateHtmlReport(report);
    }
  }

  private generateHtmlReport(report: TestReport): string {
    const passRate = report.summary.totalTests > 0 ? 
      ((report.summary.passed / report.summary.totalTests) * 100).toFixed(1) : '0';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>AEM MCP Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .issue { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .critical { border-left: 5px solid #dc3545; }
        .high { border-left: 5px solid #fd7e14; }
        .medium { border-left: 5px solid #ffc107; }
        .low { border-left: 5px solid #28a745; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>AEM MCP Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> ${report.summary.totalTests}</p>
        <p><strong>Passed:</strong> <span class="passed">${report.summary.passed}</span></p>
        <p><strong>Failed:</strong> <span class="failed">${report.summary.failed}</span></p>
        <p><strong>Pass Rate:</strong> ${passRate}%</p>
        <p><strong>Duration:</strong> ${report.summary.duration}ms</p>
        <p><strong>Generated:</strong> ${report.summary.timestamp}</p>
    </div>
    
    <h2>Issues (${report.issues.length})</h2>
    ${report.issues.map(issue => `
        <div class="issue ${issue.severity}">
            <h3>${issue.description}</h3>
            <p><strong>Method:</strong> ${issue.method}</p>
            <p><strong>Severity:</strong> ${issue.severity.toUpperCase()}</p>
            <p><strong>Category:</strong> ${issue.category}</p>
            <p><strong>Expected:</strong> ${issue.expectedBehavior}</p>
            <p><strong>Actual:</strong> ${issue.actualBehavior}</p>
            <details>
                <summary>Error Details</summary>
                <pre>${JSON.stringify(issue.errorDetails, null, 2)}</pre>
            </details>
        </div>
    `).join('')}
</body>
</html>`;
  }
}