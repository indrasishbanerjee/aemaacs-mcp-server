"use strict";
/**
 * MCP Protocol Handler for Read Server
 * Handles MCP tool discovery, schema generation, and tool execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPHandler = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
// Import all read services
const package_service_js_1 = require("../services/package-service.js");
const content_discovery_service_js_1 = require("../services/content-discovery-service.js");
const component_analysis_service_js_1 = require("../services/component-analysis-service.js");
const search_query_service_js_1 = require("../services/search-query-service.js");
const asset_management_service_js_1 = require("../services/asset-management-service.js");
const user_administration_service_js_1 = require("../services/user-administration-service.js");
const tag_management_service_js_1 = require("../services/tag-management-service.js");
const template_site_service_js_1 = require("../services/template-site-service.js");
const workflow_service_js_1 = require("../services/workflow-service.js");
const replication_service_js_1 = require("../services/replication-service.js");
const system_operations_service_js_1 = require("../services/system-operations-service.js");
class MCPHandler {
    constructor(client) {
        this.logger = logger_js_1.Logger.getInstance();
        this.client = client;
        // Initialize all services
        this.services = {
            package: new package_service_js_1.PackageService(client),
            contentDiscovery: new content_discovery_service_js_1.ContentDiscoveryService(client),
            componentAnalysis: new component_analysis_service_js_1.ComponentAnalysisService(client),
            searchQuery: new search_query_service_js_1.SearchQueryService(client),
            assetManagement: new asset_management_service_js_1.AssetManagementService(client),
            userAdministration: new user_administration_service_js_1.UserAdministrationService(client),
            tagManagement: new tag_management_service_js_1.TagManagementService(client),
            templateSite: new template_site_service_js_1.TemplateSiteService(client),
            workflow: new workflow_service_js_1.WorkflowService(client),
            replication: new replication_service_js_1.ReplicationService(client),
            systemOperations: new system_operations_service_js_1.SystemOperationsService(client)
        };
    }
    /**
     * Get list of available MCP tools
     */
    getTools() {
        return [
            // Package Management Tools
            {
                name: 'aem_list_packages',
                description: 'List all packages in AEM with optional filtering',
                inputSchema: {
                    type: 'object',
                    properties: {
                        group: { type: 'string', description: 'Filter by package group' },
                        installed: { type: 'boolean', description: 'Filter by installation status' }
                    }
                }
            },
            {
                name: 'aem_get_package_info',
                description: 'Get detailed information about a specific package',
                inputSchema: {
                    type: 'object',
                    properties: {
                        packagePath: { type: 'string', description: 'Path to the package' }
                    },
                    required: ['packagePath']
                }
            },
            // Content Discovery Tools
            {
                name: 'aem_list_pages',
                description: 'List pages in AEM with optional depth and filtering',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Root path to list pages from', default: '/content' },
                        depth: { type: 'number', description: 'Maximum depth to traverse', default: 1 },
                        limit: { type: 'number', description: 'Maximum number of pages to return', default: 100 }
                    }
                }
            },
            {
                name: 'aem_get_page_content',
                description: 'Get complete content of a specific page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pagePath: { type: 'string', description: 'Path to the page' },
                        depth: { type: 'number', description: 'Depth of content to retrieve', default: 2 }
                    },
                    required: ['pagePath']
                }
            },
            {
                name: 'aem_get_page_properties',
                description: 'Get properties and metadata of a specific page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pagePath: { type: 'string', description: 'Path to the page' }
                    },
                    required: ['pagePath']
                }
            },
            // Component Analysis Tools
            {
                name: 'aem_scan_page_components',
                description: 'Scan and analyze components on a page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pagePath: { type: 'string', description: 'Path to the page to scan' },
                        includeInherited: { type: 'boolean', description: 'Include inherited components', default: false }
                    },
                    required: ['pagePath']
                }
            },
            {
                name: 'aem_get_page_text_content',
                description: 'Extract all text content from a page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pagePath: { type: 'string', description: 'Path to the page' },
                        includeHidden: { type: 'boolean', description: 'Include hidden text content', default: false }
                    },
                    required: ['pagePath']
                }
            },
            {
                name: 'aem_get_page_images',
                description: 'Get all image references from a page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pagePath: { type: 'string', description: 'Path to the page' }
                    },
                    required: ['pagePath']
                }
            },
            // Search and Query Tools
            {
                name: 'aem_search_content',
                description: 'Search for content using QueryBuilder API',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        path: { type: 'string', description: 'Path to search within', default: '/content' },
                        type: { type: 'string', description: 'Node type to search for', default: 'cq:Page' },
                        limit: { type: 'number', description: 'Maximum results to return', default: 20 }
                    },
                    required: ['query']
                }
            },
            {
                name: 'aem_search_assets',
                description: 'Search for assets in DAM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        mimeType: { type: 'string', description: 'Filter by MIME type' },
                        limit: { type: 'number', description: 'Maximum results to return', default: 20 }
                    },
                    required: ['query']
                }
            },
            // Asset Management Tools
            {
                name: 'aem_list_assets',
                description: 'List assets in DAM with filtering options',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'DAM path to list assets from', default: '/content/dam' },
                        mimeType: { type: 'string', description: 'Filter by MIME type' },
                        limit: { type: 'number', description: 'Maximum assets to return', default: 50 }
                    }
                }
            },
            {
                name: 'aem_get_asset_metadata',
                description: 'Get metadata for a specific asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        assetPath: { type: 'string', description: 'Path to the asset' }
                    },
                    required: ['assetPath']
                }
            },
            {
                name: 'aem_get_asset_renditions',
                description: 'Get available renditions for an asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        assetPath: { type: 'string', description: 'Path to the asset' }
                    },
                    required: ['assetPath']
                }
            },
            // User Administration Tools
            {
                name: 'aem_list_users',
                description: 'List users in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        group: { type: 'string', description: 'Filter by group membership' },
                        limit: { type: 'number', description: 'Maximum users to return', default: 50 }
                    }
                }
            },
            {
                name: 'aem_list_groups',
                description: 'List groups in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Maximum groups to return', default: 50 }
                    }
                }
            },
            {
                name: 'aem_get_user_profile',
                description: 'Get detailed profile information for a user',
                inputSchema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string', description: 'User ID' }
                    },
                    required: ['userId']
                }
            },
            // Tag Management Tools
            {
                name: 'aem_list_tag_namespaces',
                description: 'List all tag namespaces',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'aem_list_tags',
                description: 'List tags with optional namespace filtering',
                inputSchema: {
                    type: 'object',
                    properties: {
                        namespace: { type: 'string', description: 'Filter by namespace' },
                        includeChildren: { type: 'boolean', description: 'Include child tags', default: true }
                    }
                }
            },
            {
                name: 'aem_get_tagged_content',
                description: 'Find content tagged with specific tags',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tags: { type: 'array', items: { type: 'string' }, description: 'Tag IDs to search for' },
                        path: { type: 'string', description: 'Path to search within', default: '/content' }
                    },
                    required: ['tags']
                }
            },
            // System Operations Tools
            {
                name: 'aem_get_system_health',
                description: 'Get AEM system health information',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'aem_get_system_info',
                description: 'Get AEM system information',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'aem_list_async_jobs',
                description: 'List running async jobs',
                inputSchema: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', description: 'Filter by job status' }
                    }
                }
            }
        ];
    }
    /**
     * Execute MCP tool
     */
    async executeTool(request) {
        try {
            this.logger.debug('Executing MCP tool', { toolName: request.params.name });
            const toolName = request.params.name;
            const args = request.params.arguments || {};
            let result;
            switch (toolName) {
                // Package Management
                case 'aem_list_packages':
                    result = await this.services.package.listPackages(args);
                    break;
                case 'aem_get_package_info':
                    result = await this.services.package.getPackageInfo(args.packagePath);
                    break;
                // Content Discovery
                case 'aem_list_pages':
                    result = await this.services.contentDiscovery.listPages(args.path || '/content', {
                        depth: args.depth,
                        limit: args.limit
                    });
                    break;
                case 'aem_get_page_content':
                    result = await this.services.contentDiscovery.getPageContent(args.pagePath, {
                        depth: args.depth
                    });
                    break;
                case 'aem_get_page_properties':
                    result = await this.services.contentDiscovery.getPageProperties(args.pagePath);
                    break;
                // Component Analysis
                case 'aem_scan_page_components':
                    result = await this.services.componentAnalysis.scanPageComponents(args.pagePath, {
                        includeInherited: args.includeInherited
                    });
                    break;
                case 'aem_get_page_text_content':
                    result = await this.services.componentAnalysis.getPageTextContent(args.pagePath, {
                        includeHidden: args.includeHidden
                    });
                    break;
                case 'aem_get_page_images':
                    result = await this.services.componentAnalysis.getPageImages(args.pagePath);
                    break;
                // Search and Query
                case 'aem_search_content':
                    result = await this.services.searchQuery.searchContent(args.query, {
                        path: args.path,
                        type: args.type,
                        limit: args.limit
                    });
                    break;
                case 'aem_search_assets':
                    result = await this.services.searchQuery.searchAssets(args.query, {
                        mimeType: args.mimeType,
                        limit: args.limit
                    });
                    break;
                // Asset Management
                case 'aem_list_assets':
                    result = await this.services.assetManagement.listAssets(args.path || '/content/dam', {
                        mimeType: args.mimeType,
                        limit: args.limit
                    });
                    break;
                case 'aem_get_asset_metadata':
                    result = await this.services.assetManagement.getAssetMetadata(args.assetPath);
                    break;
                case 'aem_get_asset_renditions':
                    result = await this.services.assetManagement.getAssetRenditions(args.assetPath);
                    break;
                // User Administration
                case 'aem_list_users':
                    result = await this.services.userAdministration.listUsers({
                        group: args.group,
                        limit: args.limit
                    });
                    break;
                case 'aem_list_groups':
                    result = await this.services.userAdministration.listGroups({
                        limit: args.limit
                    });
                    break;
                case 'aem_get_user_profile':
                    result = await this.services.userAdministration.getUserProfile(args.userId);
                    break;
                // Tag Management
                case 'aem_list_tag_namespaces':
                    result = await this.services.tagManagement.listTagNamespaces();
                    break;
                case 'aem_list_tags':
                    result = await this.services.tagManagement.listTags({
                        namespace: args.namespace,
                        includeChildren: args.includeChildren
                    });
                    break;
                case 'aem_get_tagged_content':
                    result = await this.services.tagManagement.getTaggedContent(args.tags, {
                        path: args.path
                    });
                    break;
                // System Operations
                case 'aem_get_system_health':
                    result = await this.services.systemOperations.getSystemHealth();
                    break;
                case 'aem_get_system_info':
                    result = await this.services.systemOperations.getSystemInfo();
                    break;
                case 'aem_list_async_jobs':
                    result = await this.services.systemOperations.getAsyncJobs({
                        status: args.status
                    });
                    break;
                default:
                    throw new errors_js_1.AEMException(`Unknown tool: ${toolName}`, 'VALIDATION_ERROR', false);
            }
            // Format response
            const response = {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
            this.logger.debug('MCP tool executed successfully', { toolName });
            return response;
        }
        catch (error) {
            this.logger.error('Failed to execute MCP tool', error, { toolName: request.params.name });
            const errorMessage = error instanceof errors_js_1.AEMException
                ? error.message
                : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error executing tool ${request.params.name}: ${errorMessage}`
                    }
                ],
                isError: true
            };
        }
    }
    /**
     * Handle MCP request
     */
    async handleRequest(request) {
        switch (request.method) {
            case 'tools/list':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ tools: this.getTools() }, null, 2)
                        }
                    ]
                };
            case 'tools/call':
                return await this.executeTool(request);
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Unknown method: ${request.method}`
                        }
                    ],
                    isError: true
                };
        }
    }
}
exports.MCPHandler = MCPHandler;
//# sourceMappingURL=mcp-handler.js.map