#!/usr/bin/env node

import { TestFramework } from './test-framework.js';
import { testSuites, quickTestSuite } from './test-cases.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestRunnerOptions {
  baseUrl?: string;
  username?: string;
  password?: string;
  suite?: string;
  output?: string;
  format?: 'json' | 'html';
  quick?: boolean;
  verbose?: boolean;
}

class TestRunner {
  private framework: TestFramework;
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions = {}) {
    this.options = {
      baseUrl: 'http://localhost:3001',
      username: 'admin',
      password: 'admin',
      format: 'json',
      ...options
    };

    this.framework = new TestFramework(
      this.options.baseUrl!,
      { 
        username: this.options.username!, 
        password: this.options.password! 
      }
    );
  }

  async run(): Promise<void> {
    console.log('🚀 AEM MCP Test Runner Starting...\n');
    console.log(`📡 Server: ${this.options.baseUrl}`);
    console.log(`👤 User: ${this.options.username}`);
    console.log(`📊 Format: ${this.options.format}\n`);

    // Check server health first
    console.log('🏥 Checking server health...');
    const isHealthy = await this.framework.checkServerHealth();
    
    if (!isHealthy) {
      console.error('❌ Server is not healthy. Please check your AEM MCP server.');
      process.exit(1);
    }
    
    console.log('✅ Server is healthy\n');

    // Determine which suites to run
    const suitesToRun = this.getSuitesToRun();
    console.log(`📋 Running ${suitesToRun.length} test suite(s):\n`);

    const startTime = Date.now();
    const suiteResults = [];

    // Run test suites
    for (const suite of suitesToRun) {
      const result = await this.framework.runTestSuite(suite);
      suiteResults.push(result);
    }

    const totalDuration = Date.now() - startTime;

    // Generate final report
    const report = await this.framework.generateReport();
    report.suiteResults = suiteResults;
    report.summary.duration = totalDuration;

    // Display summary
    this.displaySummary(report);

    // Save report if output specified
    if (this.options.output) {
      await this.saveReport(report);
    }

    // Exit with error code if tests failed
    if (report.summary.failed > 0) {
      console.log('\n❌ Some tests failed. Check the report for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  }

  private getSuitesToRun() {
    if (this.options.quick) {
      return [quickTestSuite];
    }

    if (this.options.suite) {
      const suite = testSuites.find(s => 
        s.name.toLowerCase().includes(this.options.suite!.toLowerCase())
      );
      if (!suite) {
        console.error(`❌ Suite '${this.options.suite}' not found.`);
        console.log('Available suites:');
        testSuites.forEach(s => console.log(`  - ${s.name}`));
        process.exit(1);
      }
      return [suite];
    }

    return testSuites;
  }

  private displaySummary(report: any): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Overall Summary:`);
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   ⏭️  Skipped: ${report.summary.skipped}`);
    
    const passRate = report.summary.totalTests > 0 ? 
      ((report.summary.passed / report.summary.totalTests) * 100).toFixed(1) : '0';
    console.log(`   📊 Pass Rate: ${passRate}%`);
    console.log(`   ⏱️  Total Duration: ${report.summary.duration}ms`);

    // Suite breakdown
    console.log(`\n📋 Suite Results:`);
    report.suiteResults.forEach((suiteResult: any) => {
      const suitePassRate = suiteResult.results.length > 0 ? 
        ((suiteResult.summary.passed / suiteResult.results.length) * 100).toFixed(1) : '0';
      
      console.log(`   ${suiteResult.suite.name}:`);
      console.log(`     ✅ ${suiteResult.summary.passed} passed`);
      console.log(`     ❌ ${suiteResult.summary.failed} failed`);
      console.log(`     📊 ${suitePassRate}% pass rate`);
    });

    // Issues summary
    if (report.issues.length > 0) {
      console.log(`\n🐛 Issues Found (${report.issues.length}):`);
      
      const issuesBySeverity = report.issues.reduce((acc: any, issue: any) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {});

      Object.entries(issuesBySeverity).forEach(([severity, count]) => {
        const emoji = severity === 'critical' ? '🔴' : 
                     severity === 'high' ? '🟠' : 
                     severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${emoji} ${severity.toUpperCase()}: ${count}`);
      });

      if (this.options.verbose) {
        console.log(`\n🔍 Issue Details:`);
        report.issues.forEach((issue: any, index: number) => {
          console.log(`\n   ${index + 1}. ${issue.description}`);
          console.log(`      Method: ${issue.method}`);
          console.log(`      Severity: ${issue.severity.toUpperCase()}`);
          console.log(`      Expected: ${issue.expectedBehavior}`);
          console.log(`      Actual: ${issue.actualBehavior}`);
        });
      }
    } else {
      console.log(`\n✨ No issues found!`);
    }

    console.log('\n' + '='.repeat(60));
  }

  private async saveReport(report: any): Promise<void> {
    try {
      const reportContent = await this.framework.exportReport(this.options.format);
      const extension = this.options.format === 'html' ? 'html' : 'json';
      const filename = this.options.output!.endsWith(`.${extension}`) ? 
        this.options.output! : 
        `${this.options.output}.${extension}`;
      
      writeFileSync(filename, reportContent, 'utf8');
      console.log(`\n💾 Report saved to: ${filename}`);
    } catch (error: any) {
      console.error(`❌ Failed to save report: ${error.message}`);
    }
  }
}

// CLI argument parsing
function parseArgs(): TestRunnerOptions {
  const args = process.argv.slice(2);
  const options: TestRunnerOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
      case '-u':
        options.baseUrl = args[++i];
        break;
      case '--username':
        options.username = args[++i];
        break;
      case '--password':
        options.password = args[++i];
        break;
      case '--suite':
      case '-s':
        options.suite = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as 'json' | 'html';
        break;
      case '--quick':
      case '-q':
        options.quick = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          showHelp();
          process.exit(1);
        }
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
AEM MCP Test Runner

Usage: npm run test [options]

Options:
  -u, --url <url>        Server URL (default: http://localhost:3001)
  --username <user>      Username for authentication (default: admin)
  --password <pass>      Password for authentication (default: admin)
  -s, --suite <name>     Run specific test suite
  -o, --output <file>    Save report to file
  -f, --format <format>  Report format: json|html (default: json)
  -q, --quick            Run quick test suite only
  -v, --verbose          Show detailed issue information
  -h, --help             Show this help message

Examples:
  npm run test                           # Run all tests
  npm run test -- --quick                # Run quick test suite
  npm run test -- --suite "Page"         # Run page operations tests
  npm run test -- --output report.html --format html  # Generate HTML report
  npm run test -- --url http://localhost:4502 --verbose  # Custom server with verbose output

Available Test Suites:
  - Page Operations
  - Component Operations  
  - Asset Operations
  - Search Operations
  - Template Operations
  - Site Operations
  - Replication Operations
  - Legacy Operations
  - Utility Operations
  - Error Handling
`);
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const runner = new TestRunner(options);
  
  runner.run().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner };