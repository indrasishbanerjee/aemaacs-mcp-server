export interface MethodParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
  examples?: any[];
}

export interface MethodExample {
  title: string;
  description: string;
  request: any;
  expectedResponse: any;
  curlExample?: string;
}

export interface MethodMetadata {
  name: string;
  description: string;
  category: string;
  parameters: MethodParameter[];
  examples: MethodExample[];
  returnType: string;
  errorCodes: string[];
  deprecated?: boolean;
  version: string;
  implementationStatus: 'complete' | 'partial' | 'mock' | 'not-implemented';
  notes?: string;
}

export const AEM_MCP_METHODS: MethodMetadata[] = [
  // Page Operations
  {
    name: 'createPage',
    description: 'Create a new page in AEM with proper template and jcr:content structure',
    category: 'page',
    parameters: [
      {
        name: 'parentPath',
        type: 'string',
        required: true,
        description: 'Parent path where the page will be created',
        examples: ['/content/mysite', '/content/mysite/en']
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Page title',
        examples: ['My New Page', 'Product Landing Page']
      },
      {
        name: 'template',
        type: 'string',
        required: true,
        description: 'Template path to use for page creation',
        examples: ['/conf/mysite/settings/wcm/templates/page-template']
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: 'Page name (URL segment). If not provided, derived from title',
        examples: ['my-new-page', 'product-landing']
      },
      {
        name: 'properties',
        type: 'object',
        required: false,
        description: 'Additional page properties',
        examples: [{ 'cq:tags': ['mysite:topic/product'] }]
      }
    ],
    examples: [
      {
        title: 'Create basic page',
        description: 'Create a simple page with title and template',
        request: {
          parentPath: '/content/mysite/en',
          title: 'New Product Page',
          template: '/conf/mysite/settings/wcm/templates/page-template'
        },
        expectedResponse: {
          success: true,
          pagePath: '/content/mysite/en/new-product-page',
          templateUsed: '/conf/mysite/settings/wcm/templates/page-template',
          jcrContentCreated: true
        },
        curlExample: `curl -u admin:admin -X POST http://localhost:3001/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"createPage","params":{"parentPath":"/content/mysite/en","title":"New Product Page","template":"/conf/mysite/settings/wcm/templates/page-template"}}'`
      }
    ],
    returnType: 'object',
    errorCodes: ['INVALID_PATH', 'INVALID_PARAMETERS', 'TEMPLATE_NOT_FOUND'],
    version: '1.0.0',
    implementationStatus: 'partial',
    notes: 'Current implementation has issues with jcr:content creation. Enhancement needed for proper template-based page creation.'
  },
  {
    name: 'deletePage',
    description: 'Delete a page from AEM',
    category: 'page',
    parameters: [
      {
        name: 'pagePath',
        type: 'string',
        required: true,
        description: 'Path of the page to delete',
        examples: ['/content/mysite/en/old-page']
      },
      {
        name: 'force',
        type: 'boolean',
        required: false,
        description: 'Force deletion even if page has references',
        defaultValue: false
      }
    ],
    examples: [
      {
        title: 'Delete page',
        description: 'Delete a page by path',
        request: {
          pagePath: '/content/mysite/en/old-page'
        },
        expectedResponse: {
          success: true,
          pagePath: '/content/mysite/en/old-page',
          deleted: true
        }
      }
    ],
    returnType: 'object',
    errorCodes: ['INVALID_PATH', 'PAGE_NOT_FOUND', 'INSUFFICIENT_PERMISSIONS'],
    version: '1.0.0',
    implementationStatus: 'complete'
  },
  {
    name: 'listPages',
    description: 'List all pages under a site root with pagination and depth control',
    category: 'page',
    parameters: [
      {
        name: 'siteRoot',
        type: 'string',
        required: false,
        description: 'Root path to list pages from',
        defaultValue: '/content',
        examples: ['/content/mysite', '/content/mysite/en']
      },
      {
        name: 'depth',
        type: 'number',
        required: false,
        description: 'Maximum depth to traverse',
        defaultValue: 1,
        examples: [1, 2, 3]
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Maximum number of pages to return',
        defaultValue: 20,
        examples: [10, 50, 100]
      }
    ],
    examples: [
      {
        title: 'List pages with depth',
        description: 'List pages under a site with specific depth',
        request: {
          siteRoot: '/content/mysite/en',
          depth: 2,
          limit: 10
        },
        expectedResponse: {
          success: true,
          siteRoot: '/content/mysite/en',
          pages: [],
          pageCount: 0,
          depth: 2,
          limit: 10
        }
      }
    ],
    returnType: 'object',
    errorCodes: ['INVALID_PATH', 'QUERY_FAILED'],
    version: '1.0.0',
    implementationStatus: 'complete'
  },
  // Component Operations
  {
    name: 'validateComponent',
    description: 'Validate component changes before applying them to ensure data integrity',
    category: 'component',
    parameters: [
      {
        name: 'locale',
        type: 'string',
        required: true,
        description: 'Locale for validation context',
        examples: ['en', 'en_US', 'de_DE']
      },
      {
        name: 'pagePath',
        type: 'string',
        required: true,
        description: 'Path of the page containing the component',
        examples: ['/content/mysite/en/home']
      },
      {
        name: 'component',
        type: 'string',
        required: true,
        description: 'Component type to validate',
        examples: ['text', 'image', 'hero', 'button']
      },
      {
        name: 'props',
        type: 'object',
        required: true,
        description: 'Component properties to validate',
        examples: [{ text: 'Hello World' }, { fileReference: '/content/dam/image.jpg' }]
      }
    ],
    examples: [
      {
        title: 'Validate text component',
        description: 'Validate a text component with content',
        request: {
          locale: 'en',
          pagePath: '/content/mysite/en/home',
          component: 'text',
          props: { text: 'Hello World', richText: '<p>Hello World</p>' }
        },
        expectedResponse: {
          success: true,
          validation: {
            valid: true,
            errors: [],
            warnings: []
          }
        }
      }
    ],
    returnType: 'object',
    errorCodes: ['INVALID_LOCALE', 'INVALID_PATH', 'INVALID_COMPONENT_TYPE', 'VALIDATION_FAILED'],
    version: '1.0.0',
    implementationStatus: 'complete'
  },
  {
    name: 'updateComponent',
    description: 'Update component properties in AEM with validation and verification',
    category: 'component',
    parameters: [
      {
        name: 'componentPath',
        type: 'string',
        required: true,
        description: 'Full path to the component to update',
        examples: ['/content/mysite/en/home/jcr:content/root/container/text']
      },
      {
        name: 'properties',
        type: 'object',
        required: true,
        description: 'Properties to update on the component',
        examples: [{ text: 'Updated text content' }, { fileReference: '/content/dam/new-image.jpg' }]
      }
    ],
    examples: [
      {
        title: 'Update text component',
        description: 'Update the text content of a component',
        request: {
          componentPath: '/content/mysite/en/home/jcr:content/root/container/text',
          properties: { text: 'Updated content', textIsRich: true }
        },
        expectedResponse: {
          success: true,
          path: '/content/mysite/en/home/jcr:content/root/container/text',
          properties: { text: 'Updated content', textIsRich: true },
          verification: { success: true, propertiesChanged: 2 }
        }
      }
    ],
    returnType: 'object',
    errorCodes: ['INVALID_PATH', 'COMPONENT_NOT_FOUND', 'UPDATE_FAILED'],
    version: '1.0.0',
    implementationStatus: 'complete'
  },
  // Asset Operations
  {
    name: 'uploadAsset',
    description: 'Upload a new asset to AEM DAM with metadata and processing',
    category: 'asset',
    parameters: [
      {
        name: 'parentPath',
        type: 'string',
        required: true,
        description: 'DAM folder path where asset will be uploaded',
        examples: ['/content/dam/mysite', '/content/dam/mysite/images']
      },
      {
        name: 'fileName',
        type: 'string',
        required: true,
        description: 'Name of the file to upload',
        examples: ['image.jpg', 'document.pdf', 'video.mp4']
      },
      {
        name: 'fileContent',
        type: 'string',
        required: true,
        description: 'Base64 encoded file content or file path',
        examples: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...']
      },
      {
        name: 'mimeType',
        type: 'string',
        required: false,
        description: 'MIME type of the file',
        examples: ['image/jpeg', 'application/pdf', 'video/mp4']
      },
      {
        name: 'metadata',
        type: 'object',
        required: false,
        description: 'Additional metadata for the asset',
        examples: [{ 'dc:title': 'My Image', 'dc:description': 'A sample image' }]
      }
    ],
    examples: [
      {
        title: 'Upload image asset',
        description: 'Upload an image to DAM with metadata',
        request: {
          parentPath: '/content/dam/mysite/images',
          fileName: 'hero-image.jpg',
          fileContent: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
          mimeType: 'image/jpeg',
          metadata: { 'dc:title': 'Hero Image', 'dc:description': 'Main hero image for homepage' }
        },
        expectedResponse: {
          success: true,
          assetPath: '/content/dam/mysite/images/hero-image.jpg',
          uploaded: true,
          metadata: { 'dc:title': 'Hero Image' }
        }
      }
    ],
    returnType: 'object',
    errorCodes: ['INVALID_PATH', 'UPLOAD_FAILED', 'INVALID_FILE_TYPE'],
    version: '1.0.0',
    implementationStatus: 'complete'
  },
  // Search Operations
  {
    name: 'searchContent',
    description: 'Search content using AEM Query Builder with flexible parameters',
    category: 'search',
    parameters: [
      {
        name: 'type',
        type: 'string',
        required: false,
        description: 'JCR node type to search for',
        examples: ['cq:Page', 'dam:Asset', 'nt:unstructured']
      },
      {
        name: 'fulltext',
        type: 'string',
        required: false,
        description: 'Full-text search term',
        examples: ['product', 'hello world', 'documentation']
      },
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'Path to search within',
        examples: ['/content/mysite', '/content/dam']
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Maximum number of results',
        defaultValue: 20,
        examples: [10, 50, 100]
      }
    ],
    examples: [
      {
        title: 'Search pages by text',
        description: 'Search for pages containing specific text',
        request: {
          type: 'cq:Page',
          fulltext: 'product',
          path: '/content/mysite',
          limit: 10
        },
        expectedResponse: {
          success: true,
          params: { type: 'cq:Page', fulltext: 'product' },
          results: [],
          total: 0
        }
      }
    ],
    returnType: 'object',
    errorCodes: ['QUERY_FAILED', 'INVALID_PARAMETERS'],
    version: '1.0.0',
    implementationStatus: 'complete'
  },
  // Template Operations
  {
    name: 'getTemplates',
    description: 'Get available page templates for a site or globally',
    category: 'template',
    parameters: [
      {
        name: 'sitePath',
        type: 'string',
        required: false,
        description: 'Site path to get templates for',
        examples: ['/content/mysite', '/conf/mysite']
      }
    ],
    examples: [
      {
        title: 'Get site templates',
        description: 'Get all templates available for a specific site',
        request: {
          sitePath: '/content/mysite'
        },
        expectedResponse: {
          success: true,
          templates: [],
          sitePath: '/content/mysite'
        }
      }
    ],
    returnType: 'object',
    errorCodes: ['INVALID_PATH', 'QUERY_FAILED'],
    version: '1.0.0',
    implementationStatus: 'complete'
  },
  // Utility Operations
  {
    name: 'listMethods',
    description: 'Get list of all available MCP methods with metadata',
    category: 'utility',
    parameters: [],
    examples: [
      {
        title: 'List all methods',
        description: 'Get complete list of available MCP methods',
        request: {},
        expectedResponse: {
          methods: []
        }
      }
    ],
    returnType: 'object',
    errorCodes: [],
    version: '1.0.0',
    implementationStatus: 'complete'
  }
];

export function getMethodByName(name: string): MethodMetadata | undefined {
  return AEM_MCP_METHODS.find(method => method.name === name);
}

export function getMethodsByCategory(category: string): MethodMetadata[] {
  return AEM_MCP_METHODS.filter(method => method.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(AEM_MCP_METHODS.map(method => method.category))];
}

export function getMethodCount(): number {
  return AEM_MCP_METHODS.length;
}

export function getImplementationStatus(): Record<string, number> {
  const status: Record<string, number> = {};
  AEM_MCP_METHODS.forEach(method => {
    status[method.implementationStatus] = (status[method.implementationStatus] || 0) + 1;
  });
  return status;
}