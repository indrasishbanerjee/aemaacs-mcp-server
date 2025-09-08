// Final integration test script to validate all fixes
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const AUTH = { username: 'admin', password: 'admin' };

async function runFinalIntegrationTests() {
  console.log('🚀 Running Final Integration Tests');
  console.log('='.repeat(50));
  
  const results = {
    tests: [],
    passed: 0,
    failed: 0,
    timestamp: new Date().toISOString()
  };
  
  try {
    // 1. Test server health
    console.log('\n🏥 Testing server health...');
    await testServerHealth(results);
    
    // 2. Test error handling patterns
    console.log('\n🐛 Testing error handling patterns...');
    await testErrorHandling(results);
    
    // 3. Test createPage with template selection
    console.log('\n📄 Testing createPage with template selection...');
    await testCreatePageWithTemplate(results);
    
    // 4. Test dashboard API
    console.log('\n🖥️ Testing dashboard API...');
    await testDashboardAPI(results);
    
    // Generate summary
    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    // Save results
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(logsDir, 'final-integration-test-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n💾 Results saved to logs/final-integration-test-results.json');
    
    if (results.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

async function testServerHealth(results) {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    const isHealthy = response.data.status === 'healthy' || response.data.status === 'degraded';
    
    addTestResult(results, 'Server Health Check', isHealthy, {
      status: response.data.status,
      aem: response.data.aem
    });
    
    console.log(isHealthy ? '✅ Server is healthy' : '❌ Server health check failed');
    return isHealthy;
  } catch (error) {
    addTestResult(results, 'Server Health Check', false, {
      error: error.message
    });
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

async function testErrorHandling(results) {
  // Test case 1: Invalid path for createPage
  try {
    const response = await axios.post(
      `${BASE_URL}/api/methods/createPage`,
      {
        parentPath: '/invalid/path',
        title: 'Test Page',
        template: '/invalid/template'
      },
      { auth: AUTH }
    );
    
    // Check if response has success: false
    const isCorrectErrorFormat = 
      response.status === 200 && 
      response.data.success === false && 
      response.data.error && 
      response.data.error.code && 
      response.data.error.message;
    
    addTestResult(results, 'Error Handling - Invalid Path', isCorrectErrorFormat, {
      status: response.status,
      data: response.data
    });
    
    console.log(isCorrectErrorFormat 
      ? '✅ Error handling works correctly for invalid path' 
      : '❌ Error handling failed for invalid path');
  } catch (error) {
    addTestResult(results, 'Error Handling - Invalid Path', false, {
      error: error.message
    });
    console.log('❌ Error handling test failed:', error.message);
  }
  
  // Test case 2: Invalid component path
  try {
    const response = await axios.post(
      `${BASE_URL}/api/methods/updateComponent`,
      {
        componentPath: '/invalid/component/path',
        properties: { text: 'test' }
      },
      { auth: AUTH }
    );
    
    // Check if response has success: false
    const isCorrectErrorFormat = 
      response.status === 200 && 
      response.data.success === false && 
      response.data.error && 
      response.data.error.code && 
      response.data.error.message;
    
    addTestResult(results, 'Error Handling - Invalid Component', isCorrectErrorFormat, {
      status: response.status,
      data: response.data
    });
    
    console.log(isCorrectErrorFormat 
      ? '✅ Error handling works correctly for invalid component' 
      : '❌ Error handling failed for invalid component');
  } catch (error) {
    addTestResult(results, 'Error Handling - Invalid Component', false, {
      error: error.message
    });
    console.log('❌ Error handling test failed:', error.message);
  }
}

async function testCreatePageWithTemplate(results) {
  // Test getAvailableTemplates method
  try {
    const response = await axios.post(
      `${BASE_URL}/api/methods/getAvailableTemplates`,
      { path: '/content' },
      { auth: AUTH }
    );
    
    const hasTemplates = 
      response.data.success === true && 
      Array.isArray(response.data.data.templates) && 
      response.data.data.templates.length > 0;
    
    addTestResult(results, 'Get Available Templates', hasTemplates, {
      templateCount: response.data.data?.templates?.length || 0
    });
    
    console.log(hasTemplates 
      ? `✅ Found ${response.data.data.templates.length} templates` 
      : '❌ No templates found');
    
    // If templates found, test createPage with first template
    if (hasTemplates) {
      const template = response.data.data.templates[0].path;
      
      try {
        const createResponse = await axios.post(
          `${BASE_URL}/api/methods/createPage`,
          {
            parentPath: '/content/test',
            title: 'Integration Test Page',
            template: template
          },
          { auth: AUTH }
        );
        
        const pageCreated = 
          createResponse.data.success === true && 
          createResponse.data.data.pagePath;
        
        addTestResult(results, 'Create Page With Template', pageCreated, {
          pagePath: createResponse.data.data?.pagePath,
          template: template
        });
        
        console.log(pageCreated 
          ? `✅ Page created at ${createResponse.data.data.pagePath}` 
          : '❌ Page creation failed');
      } catch (error) {
        addTestResult(results, 'Create Page With Template', false, {
          error: error.message,
          template: template
        });
        console.log('❌ Page creation failed:', error.message);
      }
    }
  } catch (error) {
    addTestResult(results, 'Get Available Templates', false, {
      error: error.message
    });
    console.log('❌ Template test failed:', error.message);
  }
}

async function testDashboardAPI(results) {
  // Test methods API endpoint
  try {
    const response = await axios.get(`${BASE_URL}/api/methods`, { auth: AUTH });
    
    const hasMethodsData = 
      response.data.success === true && 
      response.data.data.methods && 
      Object.keys(response.data.data.methods).length > 0;
    
    addTestResult(results, 'Dashboard API - Methods List', hasMethodsData, {
      categoryCount: Object.keys(response.data.data.methods).length,
      methodCount: Object.values(response.data.data.methods).flat().length
    });
    
    console.log(hasMethodsData 
      ? `✅ Found ${Object.values(response.data.data.methods).flat().length} methods in ${Object.keys(response.data.data.methods).length} categories` 
      : '❌ No methods found');
  } catch (error) {
    addTestResult(results, 'Dashboard API - Methods List', false, {
      error: error.message
    });
    console.log('❌ Dashboard API test failed:', error.message);
  }
  
  // Test dashboard HTML
  try {
    const response = await axios.get(`${BASE_URL}/dashboard.html`);
    
    const hasDashboardHtml = 
      response.status === 200 && 
      response.data.includes('<title>AEM MCP Server Dashboard</title>');
    
    addTestResult(results, 'Dashboard API - HTML', hasDashboardHtml, {
      status: response.status,
      contentLength: response.data.length
    });
    
    console.log(hasDashboardHtml 
      ? '✅ Dashboard HTML loaded successfully' 
      : '❌ Dashboard HTML failed to load');
  } catch (error) {
    addTestResult(results, 'Dashboard API - HTML', false, {
      error: error.message
    });
    console.log('❌ Dashboard HTML test failed:', error.message);
  }
}

function addTestResult(results, name, passed, details) {
  results.tests.push({
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

// Run the tests
runFinalIntegrationTests().catch(console.error);