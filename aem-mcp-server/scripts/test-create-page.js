// Test script for createPage functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const AUTH = { username: 'admin', password: 'admin' };

async function testCreatePage() {
  console.log('🧪 Testing createPage functionality...');
  
  try {
    // 1. Get available templates
    console.log('\n1. Getting available templates...');
    const templatesResponse = await axios.post(
      `${BASE_URL}/api/methods/getAvailableTemplates`,
      { path: '/content/we-retail/us/en' },
      { auth: AUTH }
    );
    
    if (!templatesResponse.data.success) {
      console.error('❌ Failed to get templates:', templatesResponse.data.error);
      return;
    }
    
    const templates = templatesResponse.data.data.availableTemplates;
    console.log(`✅ Found ${templates.length} templates`);
    
    if (templates.length === 0) {
      console.error('❌ No templates available for testing');
      return;
    }
    
    const template = templates[0].path;
    console.log(`📄 Using template: ${template}`);
    
    // 2. Create a test page
    console.log('\n2. Creating test page...');
    const pageName = `test-page-${Date.now()}`;
    const createResponse = await axios.post(
      `${BASE_URL}/api/methods/createPage`,
      {
        parentPath: '/content/we-retail/us/en',
        title: 'Test Page',
        name: pageName,
        template: template
      },
      { auth: AUTH }
    );
    
    if (!createResponse.data.success) {
      console.error('❌ Failed to create page:', createResponse.data.error);
      return;
    }
    
    const pagePath = createResponse.data.data.pagePath;
    console.log(`✅ Page created successfully at: ${pagePath}`);
    console.log(`✅ Template used: ${createResponse.data.data.templateUsed}`);
    console.log(`✅ jcr:content created: ${createResponse.data.data.jcrContentCreated}`);
    console.log(`✅ Page accessible: ${createResponse.data.data.pageAccessible}`);
    
    // 3. Verify page structure
    console.log('\n3. Verifying page structure...');
    const pageStructure = createResponse.data.data.pageStructure;
    
    if (pageStructure && pageStructure['jcr:content']) {
      console.log('✅ Page has proper jcr:content node');
      
      const content = pageStructure['jcr:content'];
      console.log(`   - jcr:primaryType: ${content['jcr:primaryType']}`);
      console.log(`   - jcr:title: ${content['jcr:title']}`);
      console.log(`   - cq:template: ${content['cq:template']}`);
      
      // Check for protected properties that should be set by the repository
      if (content['jcr:created']) {
        console.log(`   - jcr:created: ${content['jcr:created']}`);
      }
      if (content['jcr:createdBy']) {
        console.log(`   - jcr:createdBy: ${content['jcr:createdBy']}`);
      }
    } else {
      console.error('❌ Page does not have proper structure');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testCreatePage().catch(console.error);