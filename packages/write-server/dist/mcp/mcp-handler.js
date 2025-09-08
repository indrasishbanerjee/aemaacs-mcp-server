"use strict";
/**
 * MCP Protocol Handler for Write Server
 * Handles MCP tool discovery, schema generation, and tool execution for write operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPHandler = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
// Import all write services
const package_service_js_1 = require("../services/package-service.js");
const page_operations_service_js_1 = require("../services/page-operations-service.js");
const component_operations_service_js_1 = require("../services/component-operations-service.js");
const content_operations_service_js_1 = require("../services/content-operations-service.js");
const replication_operations_service_js_1 = require("../services/replication-operations-service.js");
const user_administration_service_js_1 = require("../services/user-administration-service.js");
const asset_management_service_js_1 = require("../services/asset-management-service.js");
const tag_operations_service_js_1 = require("../services/tag-operations-service.js");
const content_fragment_operations_service_js_1 = require("../services/content-fragment-operations-service.js");
const workflow_operations_service_js_1 = require("../services/workflow-operations-service.js");
const inbox_operations_service_js_1 = require("../services/inbox-operations-service.js");
const system_operations_service_js_1 = require("../services/system-operations-service.js");
class MCPHandler {
    constructor(client) {
        this.logger = logger_js_1.Logger.getInstance();
        this.client = client;
        // Initialize all services
        this.services = {
            package: new package_service_js_1.PackageService(client),
            pageOperations: new page_operations_service_js_1.PageOperationsService(client),
            componentOperations: new component_operations_service_js_1.ComponentOperationsService(client),
            contentOperations: new content_operations_service_js_1.ContentOperationsService(client),
            replicationOperations: new replication_operations_service_js_1.ReplicationOperationsService(client),
            userAdministration: new user_administration_service_js_1.UserAdministrationService(client),
            assetManagement: new asset_management_service_js_1.AssetManagementService(client),
            tagOperations: new tag_operations_service_js_1.TagOperationsService(client),
            contentFragmentOperations: new content_fragment_operations_service_js_1.ContentFragmentOperationsService(client),
            workflowOperations: new workflow_operations_service_js_1.WorkflowOperationsService(client),
            inboxOperations: new inbox_operations_service_js_1.InboxOperationsService(client),
            systemOperations: new system_operations_service_js_1.SystemOperationsService(client)
        };
    }
    /**
     * Get list of available MCP tools for write operations
     */
    getTools() {
        return [
            // Package Management Tools
            {
                name: 'aem_create_package',
                description: 'Create a new package in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        groupName: { type: 'string', description: 'Package group name' },
                        packageName: { type: 'string', description: 'Package name' },
                        version: { type: 'string', description: 'Package version', default: '1.0.0' },
                        description: { type: 'string', description: 'Package description' }
                    },
                    required: ['groupName', 'packageName']
                }
            },
            {
                name: 'aem_install_package',
                description: 'Install a package in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        packagePath: { type: 'string', description: 'Path to the package' },
                        recursive: { type: 'boolean', description: 'Install recursively', default: false }
                    },
                    required: ['packagePath']
                }
            },
            {
                name: 'aem_delete_package',
                description: 'Delete a package from AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        packagePath: { type: 'string', description: 'Path to the package' },
                        force: { type: 'boolean', description: 'Force deletion', default: false }
                    },
                    required: ['packagePath']
                }
            },
            // Page Operations Tools
            {
                name: 'aem_create_page',
                description: 'Create a new page in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parentPath: { type: 'string', description: 'Parent page path' },
                        pageName: { type: 'string', description: 'Page name' },
                        title: { type: 'string', description: 'Page title' },
                        template: { type: 'string', description: 'Page template path' },
                        properties: { type: 'object', description: 'Additional page properties' }
                    },
                    required: ['parentPath', 'pageName', 'title', 'template']
                }
            },
            {
                name: 'aem_copy_page',
                description: 'Copy a page in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourcePath: { type: 'string', description: 'Source page path' },
                        destinationPath: { type: 'string', description: 'Destination path' },
                        shallow: { type: 'boolean', description: 'Shallow copy', default: false }
                    },
                    required: ['sourcePath', 'destinationPath']
                }
            },
            {
                name: 'aem_move_page',
                description: 'Move a page in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourcePath: { type: 'string', description: 'Source page path' },
                        destinationPath: { type: 'string', description: 'Destination path' }
                    },
                    required: ['sourcePath', 'destinationPath']
                }
            },
            {
                name: 'aem_delete_page',
                description: 'Delete a page in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pagePath: { type: 'string', description: 'Page path to delete' },
                        force: { type: 'boolean', description: 'Force deletion', default: false }
                    },
                    required: ['pagePath']
                }
            },
            // Content Operations Tools
            {
                name: 'aem_create_folder',
                description: 'Create a folder in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parentPath: { type: 'string', description: 'Parent path' },
                        folderName: { type: 'string', description: 'Folder name' },
                        title: { type: 'string', description: 'Folder title' },
                        ordered: { type: 'boolean', description: 'Create as ordered folder', default: false }
                    },
                    required: ['parentPath', 'folderName']
                }
            },
            {
                name: 'aem_upload_file',
                description: 'Upload a file to AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parentPath: { type: 'string', description: 'Parent path' },
                        fileName: { type: 'string', description: 'File name' },
                        fileContent: { type: 'string', description: 'Base64 encoded file content' },
                        mimeType: { type: 'string', description: 'MIME type' }
                    },
                    required: ['parentPath', 'fileName', 'fileContent']
                }
            },
            // Asset Management Tools
            {
                name: 'aem_upload_asset',
                description: 'Upload an asset to DAM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parentPath: { type: 'string', description: 'DAM parent path' },
                        fileName: { type: 'string', description: 'Asset file name' },
                        fileContent: { type: 'string', description: 'Base64 encoded file content' },
                        metadata: { type: 'object', description: 'Asset metadata' }
                    },
                    required: ['parentPath', 'fileName', 'fileContent']
                }
            },
            {
                name: 'aem_update_asset',
                description: 'Update asset metadata',
                inputSchema: {
                    type: 'object',
                    properties: {
                        assetPath: { type: 'string', description: 'Asset path' },
                        metadata: { type: 'object', description: 'Updated metadata' }
                    },
                    required: ['assetPath', 'metadata']
                }
            },
            {
                name: 'aem_delete_asset',
                description: 'Delete an asset from DAM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        assetPath: { type: 'string', description: 'Asset path to delete' }
                    },
                    required: ['assetPath']
                }
            },
            // User Administration Tools
            {
                name: 'aem_create_user',
                description: 'Create a new user in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string', description: 'User ID' },
                        password: { type: 'string', description: 'User password' },
                        profile: { type: 'object', description: 'User profile information' }
                    },
                    required: ['userId']
                }
            },
            {
                name: 'aem_create_group',
                description: 'Create a new group in AEM',
                inputSchema: {
                    type: 'object',
                    properties: {
                        groupId: { type: 'string', description: 'Group ID' },
                        description: { type: 'string', description: 'Group description' }
                    },
                    required: ['groupId']
                }
            },
            {
                name: 'aem_add_user_to_group',
                description: 'Add a user to a group',
                inputSchema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string', description: 'User ID' },
                        groupId: { type: 'string', description: 'Group ID' }
                    },
                    required: ['userId', 'groupId']
                }
            },
            // Tag Operations Tools
            {
                name: 'aem_create_tag_namespace',
                description: 'Create a new tag namespace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        namespace: { type: 'string', description: 'Namespace name' },
                        title: { type: 'string', description: 'Namespace title' },
                        description: { type: 'string', description: 'Namespace description' }
                    },
                    required: ['namespace']
                }
            },
            {
                name: 'aem_create_tag',
                description: 'Create a new tag',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tagId: { type: 'string', description: 'Tag ID (namespace:tagname)' },
                        title: { type: 'string', description: 'Tag title' },
                        description: { type: 'string', description: 'Tag description' }
                    },
                    required: ['tagId']
                }
            },
            // Replication Tools
            {
                name: 'aem_publish_content',
                description: 'Publish content to publish tier',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentPath: { type: 'string', description: 'Content path to publish' },
                        deep: { type: 'boolean', description: 'Deep publish', default: false }
                    },
                    required: ['contentPath']
                }
            },
            {
                name: 'aem_unpublish_content',
                description: 'Unpublish content from publish tier',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentPath: { type: 'string', description: 'Content path to unpublish' },
                        deep: { type: 'boolean', description: 'Deep unpublish', default: false }
                    },
                    required: ['contentPath']
                }
            },
            // Workflow Tools
            {
                name: 'aem_start_workflow',
                description: 'Start a workflow instance',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workflowModel: { type: 'string', description: 'Workflow model path' },
                        payload: { type: 'string', description: 'Workflow payload path' },
                        title: { type: 'string', description: 'Workflow title' }
                    },
                    required: ['workflowModel', 'payload']
                }
            },
            // System Operations Tools
            {
                name: 'aem_delete_async_job',
                description: 'Delete an async job',
                inputSchema: {
                    type: 'object',
                    properties: {
                        jobId: { type: 'string', description: 'Job ID to delete' }
                    },
                    required: ['jobId']
                }
            }
        ];
    }
    /**
     * Execute MCP tool
     */
    async executeTool(request) {
        try {
            this.logger.debug('Executing MCP write tool', { toolName: request.params.name });
            const toolName = request.params.name;
            const args = request.params.arguments || {};
            let result;
            switch (toolName) {
                // Package Management
                case 'aem_create_package':
                    result = await this.services.package.createPackage({
                        groupName: args.groupName,
                        packageName: args.packageName,
                        version: args.version,
                        description: args.description
                    });
                    break;
                case 'aem_install_package':
                    result = await this.services.package.installPackage(args.packagePath, {
                        recursive: args.recursive
                    });
                    break;
                case 'aem_delete_package':
                    result = await this.services.package.deletePackage(args.packagePath, {
                        force: args.force
                    });
                    break;
                // Page Operations
                case 'aem_create_page':
                    result = await this.services.pageOperations.createPage(args.parentPath, args.pageName, args.title, args.template, { properties: args.properties });
                    break;
                case 'aem_copy_page':
                    result = await this.services.pageOperations.copyPage(args.sourcePath, args.destinationPath, { shallow: args.shallow });
                    break;
                case 'aem_move_page':
                    result = await this.services.pageOperations.movePage(args.sourcePath, args.destinationPath);
                    break;
                case 'aem_delete_page':
                    result = await this.services.pageOperations.deletePage(args.pagePath, {
                        force: args.force
                    });
                    break;
                // Content Operations
                case 'aem_create_folder':
                    if (args.ordered) {
                        result = await this.services.contentOperations.createOrderedFolder(args.parentPath, args.folderName, { title: args.title });
                    }
                    else {
                        result = await this.services.contentOperations.createFolder(args.parentPath, args.folderName, { title: args.title });
                    }
                    break;
                case 'aem_upload_file':
                    const fileBuffer = Buffer.from(args.fileContent, 'base64');
                    result = await this.services.contentOperations.uploadFile(args.parentPath, args.fileName, fileBuffer, { mimeType: args.mimeType });
                    break;
                // Asset Management
                case 'aem_upload_asset':
                    const assetBuffer = Buffer.from(args.fileContent, 'base64');
                    result = await this.services.assetManagement.uploadAsset(args.parentPath, args.fileName, assetBuffer, { metadata: args.metadata });
                    break;
                case 'aem_update_asset':
                    result = await this.services.assetManagement.updateAsset(args.assetPath, {
                        metadata: args.metadata
                    });
                    break;
                case 'aem_delete_asset':
                    result = await this.services.assetManagement.deleteAsset(args.assetPath);
                    break;
                // User Administration
                case 'aem_create_user':
                    result = await this.services.userAdministration.createUser(args.userId, {
                        password: args.password,
                        profile: args.profile
                    });
                    break;
                case 'aem_create_group':
                    result = await this.services.userAdministration.createGroup(args.groupId, {
                        description: args.description
                    });
                    break;
                case 'aem_add_user_to_group':
                    result = await this.services.userAdministration.addUserToGroup(args.userId, args.groupId);
                    break;
                // Tag Operations
                case 'aem_create_tag_namespace':
                    result = await this.services.tagOperations.createTagNamespace(args.namespace, {
                        title: args.title,
                        description: args.description
                    });
                    break;
                case 'aem_create_tag':
                    result = await this.services.tagOperations.createTag(args.tagId, {
                        title: args.title,
                        description: args.description
                    });
                    break;
                // Replication
                case 'aem_publish_content':
                    result = await this.services.replicationOperations.publishContent(args.contentPath, { deep: args.deep });
                    break;
                case 'aem_unpublish_content':
                    result = await this.services.replicationOperations.unpublishContent(args.contentPath, { deep: args.deep });
                    break;
                // Workflow
                case 'aem_start_workflow':
                    result = await this.services.workflowOperations.startWorkflow(args.workflowModel, args.payload, { title: args.title });
                    break;
                // System Operations
                case 'aem_delete_async_job':
                    result = await this.services.systemOperations.deleteAsyncJob(args.jobId);
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
            this.logger.debug('MCP write tool executed successfully', { toolName });
            return response;
        }
        catch (error) {
            this.logger.error('Failed to execute MCP write tool', error, { toolName: request.params.name });
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