import { TestCase, TestSuite } from './test-framework.js';

// Page Operations Test Cases
export const pageOperationsTests: TestCase[] = [
  {
    id: 'page-001',
    methodName: 'listPages',
    description: 'List pages with default parameters',
    category: 'page',
    parameters: {
      siteRoot: '/content',
      depth: 1,
      limit: 5
    },
    expectedResult: {
      success: true,
      data: {
        siteRoot: '/content'
      }
    }
  },
  {
    id: 'page-002',
    methodName: 'listPages',
    description: 'List pages with specific site root',
    category: 'page',
    parameters: {
      siteRoot: '/content/we-retail',
      depth: 2,
      limit: 10
    }
  },
  {
    id: 'page-003',
    methodName: 'getTemplates',
    description: 'Get available templates',
    category: 'page',
    parameters: {
      sitePath: '/content/we-retail'
    },
    expectedResult: {
      success: true
    }
  },
  {
    id: 'page-004',
    methodName: 'createPage',
    description: 'Create a test page with template',
    category: 'page',
    parameters: {
      parentPath: '/content/we-retail/us/en',
      title: 'Test Page Created by MCP',
      template: '/conf/we-retail/settings/wcm/templates/content-page',
      name: 'mcp-test-page'
    },
    cleanup: true
  },
  {
    id: 'page-005',
    methodName: 'getPageProperties',
    description: 'Get properties of created test page',
    category: 'page',
    parameters: {
      pagePath: '/content/we-retail/us/en/mcp-test-page'
    },
    dependencies: ['page-004']
  },
  {
    id: 'page-006',
    methodName: 'getPageContent',
    description: 'Get content of created test page',
    category: 'page',
    parameters: {
      pagePath: '/content/we-retail/us/en/mcp-test-page'
    },
    dependencies: ['page-004']
  },
  {
    id: 'page-007',
    methodName: 'getAllTextContent',
    description: 'Get text content from existing page',
    category: 'page',
    parameters: {
      pagePath: '/content/we-retail/us/en/experience'
    }
  },
  {
    id: 'page-008',
    methodName: 'getPageImages',
    description: 'Get images from existing page',
    category: 'page',
    parameters: {
      pagePath: '/content/we-retail/us/en/experience'
    }
  },
  {
    id: 'page-009',
    methodName: 'activatePage',
    description: 'Activate the test page',
    category: 'page',
    parameters: {
      pagePath: '/content/we-retail/us/en/mcp-test-page',
      activateTree: false
    },
    dependencies: ['page-004']
  },
  {
    id: 'page-010',
    methodName: 'deactivatePage',
    description: 'Deactivate the test page',
    category: 'page',
    parameters: {
      pagePath: '/content/we-retail/us/en/mcp-test-page',
      deactivateTree: false
    },
    dependencies: ['page-009']
  },
  {
    id: 'page-011',
    methodName: 'deletePage',
    description: 'Delete the test page (cleanup)',
    category: 'page',
    parameters: {
      pagePath: '/content/we-retail/us/en/mcp-test-page',
      force: true
    },
    dependencies: ['page-004']
  }
];

// Component Operations Test Cases
export const componentOperationsTests: TestCase[] = [
  {
    id: 'comp-001',
    methodName: 'scanPageComponents',
    description: 'Scan components on existing page',
    category: 'component',
    parameters: {
      pagePath: '/content/we-retail/us/en/experience'
    },
    expectedResult: {
      success: true,
      data: {
        pagePath: '/content/we-retail/us/en/experience'
      }
    }
  },
  {
    id: 'comp-002',
    methodName: 'validateComponent',
    description: 'Validate text component properties',
    category: 'component',
    parameters: {
      locale: 'en',
      pagePath: '/content/we-retail/us/en/experience',
      component: 'text',
      props: {
        text: 'Test text content',
        textIsRich: true
      }
    }
  },
  {
    id: 'comp-003',
    methodName: 'validateComponent',
    description: 'Validate image component properties',
    category: 'component',
    parameters: {
      locale: 'en',
      pagePath: '/content/we-retail/us/en/experience',
      component: 'image',
      props: {
        fileReference: '/content/dam/we-retail/en/activities/biking/bike_24.jpg',
        alt: 'Test image'
      }
    }
  },
  {
    id: 'comp-004',
    methodName: 'updateComponent',
    description: 'Update component properties (if component exists)',
    category: 'component',
    parameters: {
      componentPath: '/content/we-retail/us/en/experience/jcr:content/root/hero/image',
      properties: {
        alt: 'Updated by MCP Test'
      }
    },
    shouldFail: false // May fail if component doesn't exist
  },
  {
    id: 'comp-005',
    methodName: 'bulkUpdateComponents',
    description: 'Bulk update multiple components',
    category: 'component',
    parameters: {
      updates: [
        {
          componentPath: '/content/we-retail/us/en/experience/jcr:content/root/hero/image',
          properties: { alt: 'Bulk updated 1' }
        }
      ],
      validateFirst: true,
      continueOnError: false
    },
    shouldFail: false // May fail if components don't exist
  }
];

// Asset Operations Test Cases
export const assetOperationsTests: TestCase[] = [
  {
    id: 'asset-001',
    methodName: 'getAssetMetadata',
    description: 'Get metadata of existing asset',
    category: 'asset',
    parameters: {
      assetPath: '/content/dam/we-retail/en/activities/biking/bike_24.jpg'
    },
    expectedResult: {
      success: true,
      data: {
        assetPath: '/content/dam/we-retail/en/activities/biking/bike_24.jpg'
      }
    }
  },
  {
    id: 'asset-002',
    methodName: 'uploadAsset',
    description: 'Upload a test asset',
    category: 'asset',
    parameters: {
      parentPath: '/content/dam/we-retail/test',
      fileName: 'mcp-test-image.jpg',
      fileContent: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      mimeType: 'image/jpeg',
      metadata: {
        'dc:title': 'MCP Test Image',
        'dc:description': 'Test image uploaded by MCP'
      }
    },
    cleanup: true
  },
  {
    id: 'asset-003',
    methodName: 'updateAsset',
    description: 'Update test asset metadata',
    category: 'asset',
    parameters: {
      assetPath: '/content/dam/we-retail/test/mcp-test-image.jpg',
      metadata: {
        'dc:title': 'Updated MCP Test Image',
        'dc:description': 'Updated test image'
      }
    },
    dependencies: ['asset-002']
  },
  {
    id: 'asset-004',
    methodName: 'deleteAsset',
    description: 'Delete test asset (cleanup)',
    category: 'asset',
    parameters: {
      assetPath: '/content/dam/we-retail/test/mcp-test-image.jpg',
      force: true
    },
    dependencies: ['asset-002']
  }
];

// Search Operations Test Cases
export const searchOperationsTests: TestCase[] = [
  {
    id: 'search-001',
    methodName: 'searchContent',
    description: 'Search for pages by type',
    category: 'search',
    parameters: {
      type: 'cq:Page',
      path: '/content/we-retail',
      limit: 5
    },
    expectedResult: {
      success: true
    }
  },
  {
    id: 'search-002',
    methodName: 'searchContent',
    description: 'Full-text search for content',
    category: 'search',
    parameters: {
      fulltext: 'experience',
      path: '/content/we-retail',
      limit: 10
    }
  },
  {
    id: 'search-003',
    methodName: 'executeJCRQuery',
    description: 'Execute JCR query with fulltext search',
    category: 'search',
    parameters: {
      query: 'retail',
      limit: 5
    }
  },
  {
    id: 'search-004',
    methodName: 'enhancedPageSearch',
    description: 'Enhanced page search with fallback',
    category: 'search',
    parameters: {
      searchTerm: 'experience',
      basePath: '/content/we-retail',
      includeAlternateLocales: false
    }
  }
];

// Template Operations Test Cases
export const templateOperationsTests: TestCase[] = [
  {
    id: 'template-001',
    methodName: 'getTemplates',
    description: 'Get templates for we-retail site',
    category: 'template',
    parameters: {
      sitePath: '/content/we-retail'
    }
  },
  {
    id: 'template-002',
    methodName: 'getTemplateStructure',
    description: 'Get structure of content page template',
    category: 'template',
    parameters: {
      templatePath: '/conf/we-retail/settings/wcm/templates/content-page'
    }
  }
];

// Site Operations Test Cases
export const siteOperationsTests: TestCase[] = [
  {
    id: 'site-001',
    methodName: 'fetchSites',
    description: 'Fetch all available sites',
    category: 'site',
    parameters: {},
    expectedResult: {
      success: true,
      data: {
        sites: []
      }
    }
  },
  {
    id: 'site-002',
    methodName: 'fetchLanguageMasters',
    description: 'Fetch language masters for we-retail',
    category: 'site',
    parameters: {
      site: 'we-retail'
    }
  },
  {
    id: 'site-003',
    methodName: 'fetchAvailableLocales',
    description: 'Fetch available locales',
    category: 'site',
    parameters: {
      site: 'we-retail',
      languageMasterPath: '/content/we-retail/us'
    }
  }
];

// Replication Operations Test Cases
export const replicationOperationsTests: TestCase[] = [
  {
    id: 'repl-001',
    methodName: 'replicateAndPublish',
    description: 'Simulate replication and publish',
    category: 'replication',
    parameters: {
      selectedLocales: ['en_US'],
      componentData: {
        text: 'Test content for replication'
      },
      localizedOverrides: {}
    }
  },
  {
    id: 'repl-002',
    methodName: 'unpublishContent',
    description: 'Unpublish test content',
    category: 'replication',
    parameters: {
      contentPaths: ['/content/we-retail/us/en/mcp-test-page'],
      unpublishTree: false
    }
  }
];

// Legacy Operations Test Cases
export const legacyOperationsTests: TestCase[] = [
  {
    id: 'legacy-001',
    methodName: 'getNodeContent',
    description: 'Get JCR node content',
    category: 'legacy',
    parameters: {
      path: '/content/we-retail',
      depth: 1
    }
  },
  {
    id: 'legacy-002',
    methodName: 'listChildren',
    description: 'List child nodes',
    category: 'legacy',
    parameters: {
      path: '/content/we-retail'
    }
  }
];

// Utility Operations Test Cases
export const utilityOperationsTests: TestCase[] = [
  {
    id: 'util-001',
    methodName: 'listMethods',
    description: 'List all available MCP methods',
    category: 'utility',
    parameters: {},
    expectedResult: {
      methods: []
    }
  },
  {
    id: 'util-002',
    methodName: 'getStatus',
    description: 'Get workflow status (mock)',
    category: 'utility',
    parameters: {
      workflowId: 'test-workflow-123'
    },
    expectedResult: {
      success: true,
      status: 'completed'
    }
  },
  {
    id: 'util-003',
    methodName: 'undoChanges',
    description: 'Attempt to undo changes (not implemented)',
    category: 'utility',
    parameters: {
      jobId: 'test-job-123'
    },
    expectedResult: {
      success: true,
      message: 'undoChanges is not implemented'
    }
  }
];

// Error Test Cases - These should fail
export const errorTestCases: TestCase[] = [
  {
    id: 'error-001',
    methodName: 'createPage',
    description: 'Create page with invalid parent path',
    category: 'page',
    parameters: {
      parentPath: '/invalid/path',
      title: 'Test Page',
      template: '/conf/we-retail/settings/wcm/templates/content-page'
    },
    shouldFail: true
  },
  {
    id: 'error-002',
    methodName: 'updateComponent',
    description: 'Update non-existent component',
    category: 'component',
    parameters: {
      componentPath: '/content/non-existent/component',
      properties: {
        text: 'This should fail'
      }
    },
    shouldFail: true
  },
  {
    id: 'error-003',
    methodName: 'getAssetMetadata',
    description: 'Get metadata of non-existent asset',
    category: 'asset',
    parameters: {
      assetPath: '/content/dam/non-existent-asset.jpg'
    },
    shouldFail: true
  },
  {
    id: 'error-004',
    methodName: 'executeJCRQuery',
    description: 'Execute invalid JCR query',
    category: 'search',
    parameters: {
      query: 'DROP TABLE users; --',
      limit: 10
    },
    shouldFail: true
  }
];

// Test Suites
export const testSuites: TestSuite[] = [
  {
    name: 'Page Operations',
    description: 'Test all page-related operations including CRUD, activation, and content extraction',
    testCases: pageOperationsTests
  },
  {
    name: 'Component Operations',
    description: 'Test component validation, updates, and bulk operations',
    testCases: componentOperationsTests
  },
  {
    name: 'Asset Operations',
    description: 'Test DAM asset management including upload, update, and metadata operations',
    testCases: assetOperationsTests
  },
  {
    name: 'Search Operations',
    description: 'Test various search and query capabilities',
    testCases: searchOperationsTests
  },
  {
    name: 'Template Operations',
    description: 'Test template discovery and structure analysis',
    testCases: templateOperationsTests
  },
  {
    name: 'Site Operations',
    description: 'Test site and localization management',
    testCases: siteOperationsTests
  },
  {
    name: 'Replication Operations',
    description: 'Test content replication and publishing workflows',
    testCases: replicationOperationsTests
  },
  {
    name: 'Legacy Operations',
    description: 'Test legacy JCR node access methods',
    testCases: legacyOperationsTests
  },
  {
    name: 'Utility Operations',
    description: 'Test utility and system management methods',
    testCases: utilityOperationsTests
  },
  {
    name: 'Error Handling',
    description: 'Test error scenarios and edge cases',
    testCases: errorTestCases
  }
];

// Quick test suite with essential methods only
export const quickTestSuite: TestSuite = {
  name: 'Quick Test Suite',
  description: 'Essential tests for core functionality verification',
  testCases: [
    ...pageOperationsTests.slice(0, 3), // First 3 page tests
    ...componentOperationsTests.slice(0, 2), // First 2 component tests
    ...searchOperationsTests.slice(0, 2), // First 2 search tests
    ...utilityOperationsTests.slice(0, 1), // First utility test
    ...errorTestCases.slice(0, 2) // First 2 error tests
  ]
};