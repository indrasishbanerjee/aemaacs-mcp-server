# AEM MCP Servers API Documentation

## Overview

The AEM MCP Servers provide both MCP protocol and HTTP REST API access to Adobe Experience Manager as a Cloud Service (AEMaaCS) operations. The servers support comprehensive content management, asset operations, workflow management, and system administration with enterprise-grade security and monitoring.

## Read Server API

The Read Server provides safe, read-only access to AEM content and system information.

### Base URL
- HTTP: `http://localhost:3001`
- MCP: Use `--stdio` flag for STDIO protocol

### Authentication
- Optional for read operations
- API Key via `X-API-Key` header (if enabled)
- Basic Auth, OAuth, or Service Account (configured via environment)

### Available Tools

#### Content Discovery

**aem_list_pages**
- Description: List pages in AEM with optional depth and filtering
- Parameters:
  - `path` (string): Root path to list pages from (default: `/content`)
  - `depth` (number): Maximum depth to traverse (default: 1)
  - `limit` (number): Maximum number of pages to return (default: 100)

**aem_get_page_content**
- Description: Get complete content of a specific page
- Parameters:
  - `pagePath` (string, required): Path to the page
  - `depth` (number): Depth of content to retrieve (default: 2)

**aem_get_page_properties**
- Description: Get properties and metadata of a specific page
- Parameters:
  - `pagePath` (string, required): Path to the page

#### Component Analysis

**aem_scan_page_components**
- Description: Scan and analyze components on a page
- Parameters:
  - `pagePath` (string, required): Path to the page to scan
  - `includeInherited` (boolean): Include inherited components (default: false)

**aem_get_page_text_content**
- Description: Extract all text content from a page
- Parameters:
  - `pagePath` (string, required): Path to the page
  - `includeHidden` (boolean): Include hidden text content (default: false)

**aem_get_page_images**
- Description: Get all image references from a page
- Parameters:
  - `pagePath` (string, required): Path to the page

#### Search and Query

**aem_search_content**
- Description: Search for content using QueryBuilder API
- Parameters:
  - `query` (string, required): Search query
  - `type` (string): Content type to search (default: 'page')
  - `path` (string): Root path to search within
  - `limit` (number): Maximum results to return (default: 50)

**aem_advanced_search**
- Description: Advanced search with full QueryBuilder support, facets, and pagination
- Parameters:
  - `query` (string, required): Search query
  - `type` (string): Content type ('page', 'asset', 'component')
  - `facets` (array): Facet fields for faceted search
  - `boost` (object): Field boost values for relevance tuning
  - `fuzzy` (boolean): Enable fuzzy search
  - `synonyms` (boolean): Enable synonym expansion
  - `limit` (number): Maximum results (default: 20)
  - `offset` (number): Result offset for pagination (default: 0)

**aem_search_content_fragments**
- Description: Specialized search for content fragments
- Parameters:
  - `query` (string, required): Search query
  - `model` (string): Content fragment model path
  - `variation` (string): Specific variation to search
  - `element` (string): Element name to search within
  - `limit` (number): Maximum results (default: 10)

**aem_get_search_suggestions**
- Description: Get search suggestions for auto-completion
- Parameters:
  - `query` (string, required): Partial query string
  - `type` (string): Content type for suggestions
  - `path` (string): Root path for suggestions
  - `limit` (number): Maximum suggestions (default: 5)

**aem_get_search_facets**
- Description: Get faceted search results for filtering
- Parameters:
  - `query` (string, required): Search query
  - `facets` (array): Facet fields to retrieve
  - `limit` (number): Maximum facet values per field (default: 10)

#### Content Fragment Operations

**aem_list_content_fragment_models**
- Description: List all available content fragment models
- Parameters: None

**aem_get_content_fragment_model**
- Description: Get detailed information about a content fragment model
- Parameters:
  - `modelPath` (string, required): Path to the content fragment model

**aem_list_content_fragment_variations**
- Description: List variations for a content fragment
- Parameters:
  - `fragmentPath` (string, required): Path to the content fragment

#### Workflow Operations

**aem_list_workflow_models**
- Description: List all available workflow models
- Parameters: None

**aem_get_workflow_model**
- Description: Get detailed workflow model information
- Parameters:
  - `modelPath` (string, required): Path to the workflow model

**aem_get_workflow_instances**
- Description: Get workflow instances with filtering and pagination
- Parameters:
  - `model` (string): Filter by workflow model
  - `status` (string): Filter by status ('RUNNING', 'COMPLETED', 'ABORTED')
  - `initiator` (string): Filter by initiator
  - `payload` (string): Filter by payload path
  - `startDate` (string): Filter by start date (ISO format)
  - `endDate` (string): Filter by end date (ISO format)
  - `limit` (number): Maximum results (default: 10)
  - `offset` (number): Result offset (default: 0)

**aem_get_workflow_tasks**
- Description: Get workflow tasks with filtering and pagination
- Parameters:
  - `workflowId` (string): Filter by workflow ID
  - `assignee` (string): Filter by assignee
  - `status` (string): Filter by status ('ACTIVE', 'COMPLETED')
  - `createdDate` (string): Filter by creation date
  - `dueDate` (string): Filter by due date
  - `limit` (number): Maximum results (default: 10)
  - `offset` (number): Result offset (default: 0)

#### Template and Component Management

**aem_discover_templates**
- Description: Discover all available templates with comprehensive metadata
- Parameters:
  - `sitePath` (string): Site root path for template discovery

**aem_analyze_component_usage**
- Description: Analyze component usage across the entire site
- Parameters:
  - `resourceType` (string): Component resource type
  - `allowedPaths` (array): Paths to analyze
  - `children` (boolean): Include child components

**aem_track_component_dependencies**
- Description: Track dependencies between components
- Parameters:
  - `resourceType` (string, required): Component resource type

**aem_analyze_template_structure**
- Description: Analyze template structure and components
- Parameters:
  - `templatePath` (string, required): Path to the template

**aem_get_component_usage_statistics**
- Description: Get comprehensive usage statistics
- Parameters:
  - `sitePath` (string): Site root path for statistics

## Write Server API

The Write Server provides content management operations including creation, modification, publishing, and system administration.

### Base URL
- HTTP: `http://localhost:3002`
- MCP: Use `--stdio` flag for STDIO protocol

### Authentication
- Required for write operations
- API Key via `X-API-Key` header
- Basic Auth, OAuth, or Service Account (configured via environment)

### Available Tools

#### Content Management

**aem_create_page**
- Description: Create a new page in AEM
- Parameters:
  - `path` (string, required): Path where to create the page
  - `title` (string, required): Page title
  - `template` (string, required): Template path
  - `properties` (object): Additional page properties

**aem_update_page_content**
- Description: Update page content and properties
- Parameters:
  - `path` (string, required): Path to the page
  - `content` (object): Content to update
  - `properties` (object): Properties to update

**aem_delete_page**
- Description: Delete a page from AEM
- Parameters:
  - `path` (string, required): Path to the page to delete
  - `force` (boolean): Force deletion even if referenced (default: false)

#### Content Fragment Operations

**aem_create_content_fragment_model**
- Description: Create a new content fragment model
- Parameters:
  - `path` (string, required): Path where to create the model
  - `title` (string, required): Model title
  - `description` (string): Model description
  - `elements` (array): Model element definitions

**aem_create_content_fragment**
- Description: Create a new content fragment
- Parameters:
  - `path` (string, required): Path where to create the fragment
  - `model` (string, required): Model path
  - `title` (string, required): Fragment title
  - `elements` (object): Fragment element values

**aem_update_content_fragment**
- Description: Update content fragment elements
- Parameters:
  - `path` (string, required): Path to the fragment
  - `elements` (object): Updated element values

**aem_delete_content_fragment**
- Description: Delete a content fragment
- Parameters:
  - `path` (string, required): Path to the fragment to delete

**aem_create_content_fragment_variation**
- Description: Create a new variation for a content fragment
- Parameters:
  - `fragmentPath` (string, required): Path to the fragment
  - `name` (string, required): Variation name
  - `title` (string): Variation title
  - `elements` (object): Variation element values

**aem_update_content_fragment_variation**
- Description: Update a content fragment variation
- Parameters:
  - `fragmentPath` (string, required): Path to the fragment
  - `variationName` (string, required): Variation name
  - `elements` (object): Updated element values

**aem_delete_content_fragment_variation**
- Description: Delete a content fragment variation
- Parameters:
  - `fragmentPath` (string, required): Path to the fragment
  - `variationName` (string, required): Variation name to delete

**aem_get_content_fragment_references**
- Description: Get references for a content fragment
- Parameters:
  - `fragmentPath` (string, required): Path to the fragment

#### Version Management

**aem_create_version**
- Description: Create a new version of content
- Parameters:
  - `path` (string, required): Path to the content
  - `comment` (string): Version comment
  - `labels` (array): Version labels

**aem_create_autosave_version**
- Description: Create an auto-save version
- Parameters:
  - `path` (string, required): Path to the content

**aem_compare_versions**
- Description: Compare two versions of content
- Parameters:
  - `path` (string, required): Path to the content
  - `version1` (string, required): First version to compare
  - `version2` (string, required): Second version to compare

**aem_compare_with_current_version**
- Description: Compare any version with current content
- Parameters:
  - `path` (string, required): Path to the content
  - `version` (string, required): Version to compare with current

**aem_restore_version**
- Description: Restore to a specific version
- Parameters:
  - `path` (string, required): Path to the content
  - `version` (string, required): Version to restore to
  - `comment` (string): Restoration comment
  - `force` (boolean): Force restoration (default: false)

**aem_add_version_labels**
- Description: Add labels to a version
- Parameters:
  - `path` (string, required): Path to the content
  - `version` (string, required): Version to label
  - `labels` (array, required): Labels to add

**aem_remove_version_labels**
- Description: Remove labels from a version
- Parameters:
  - `path` (string, required): Path to the content
  - `version` (string, required): Version to unlabel
  - `labels` (array, required): Labels to remove

**aem_get_version_history**
- Description: Get complete version history
- Parameters:
  - `path` (string, required): Path to the content

**aem_get_version_info**
- Description: Get detailed information about a specific version
- Parameters:
  - `path` (string, required): Path to the content
  - `version` (string, required): Version to get info for

#### Workflow Operations

**aem_start_workflow**
- Description: Start a workflow instance
- Parameters:
  - `workflowModel` (string, required): Workflow model path
  - `payload` (string, required): Workflow payload path
  - `title` (string): Workflow title
  - `comment` (string): Workflow comment
  - `initiator` (string): Workflow initiator

**aem_get_workflow_instance**
- Description: Get specific workflow instance details
- Parameters:
  - `instanceId` (string, required): Workflow instance ID

**aem_abort_workflow_instance**
- Description: Abort a running workflow instance
- Parameters:
  - `instanceId` (string, required): Workflow instance ID
  - `comment` (string): Abort comment

**aem_suspend_workflow_instance**
- Description: Suspend a workflow instance
- Parameters:
  - `instanceId` (string, required): Workflow instance ID
  - `comment` (string): Suspend comment

**aem_resume_workflow_instance**
- Description: Resume a suspended workflow instance
- Parameters:
  - `instanceId` (string, required): Workflow instance ID
  - `comment` (string): Resume comment

**aem_get_workflow_task**
- Description: Get specific task details
- Parameters:
  - `taskId` (string, required): Workflow task ID

**aem_complete_workflow_task**
- Description: Complete a workflow task
- Parameters:
  - `taskId` (string, required): Workflow task ID
  - `action` (string, required): Action to take
  - `comment` (string): Completion comment
  - `workflowData` (object): Additional workflow data

**aem_start_publish_workflow**
- Description: Start specialized publish workflow
- Parameters:
  - `contentPath` (string, required): Content path to publish
  - `workflowTitle` (string): Workflow title
  - `startComment` (string): Start comment
  - `replicateAsTree` (boolean): Replicate as tree (default: false)
  - `activateTree` (boolean): Activate tree (default: false)
  - `ignoreDeactivated` (boolean): Ignore deactivated content (default: false)

**aem_process_assets**
- Description: Process assets using workflow
- Parameters:
  - `folderPath` (string, required): Folder path containing assets
  - `profile` (string): Processing profile
  - `async` (boolean): Process asynchronously (default: true)
  - `wait` (boolean): Wait for completion (default: false)
  - `batchSize` (number): Batch size for processing (default: 10)

#### Asset Management

**aem_upload_asset**
- Description: Upload an asset to DAM
- Parameters:
  - `parentPath` (string, required): DAM parent path
  - `fileName` (string, required): Asset file name
  - `fileContent` (string, required): Base64 encoded file content
  - `metadata` (object): Asset metadata

**aem_update_asset**
- Description: Update asset metadata
- Parameters:
  - `assetPath` (string, required): Asset path
  - `metadata` (object, required): Updated metadata

**aem_delete_asset**
- Description: Delete an asset from DAM
- Parameters:
  - `assetPath` (string, required): Asset path to delete

**aem_get_asset_processing_status**
- Description: Get asset processing status
- Parameters:
  - `assetPath` (string, required): Asset path to check

**aem_create_custom_rendition**
- Description: Create a custom rendition for an asset
- Parameters:
  - `assetPath` (string, required): Asset path
  - `name` (string, required): Rendition name
  - `width` (number): Rendition width
  - `height` (number): Rendition height
  - `quality` (number): Rendition quality (1-100)
  - `format` (string): Rendition format

**aem_apply_smart_crop**
- Description: Apply smart crop to an asset
- Parameters:
  - `assetPath` (string, required): Asset path
  - `width` (number, required): Crop width
  - `height` (number, required): Crop height
  - `algorithm` (string): Crop algorithm ('face-detection', 'saliency', 'center-weighted')
  - `quality` (number): Crop quality (1-100)

**aem_process_video_asset**
- Description: Process video asset with thumbnails and previews
- Parameters:
  - `assetPath` (string, required): Video asset path
  - `generateThumbnails` (boolean): Generate thumbnails (default: true)
  - `thumbnailCount` (number): Number of thumbnails (default: 3)
  - `thumbnailQuality` (number): Thumbnail quality (default: 80)
  - `generatePreview` (boolean): Generate video preview (default: true)
  - `previewQuality` (number): Preview quality (default: 70)

#### Permission Management

**aem_read_acl**
- Description: Read ACL for specific paths
- Parameters:
  - `path` (string, required): Path to read ACL for
  - `depth` (number): Depth for ACL reading (default: 1)

**aem_get_effective_permissions**
- Description: Calculate effective permissions for principals
- Parameters:
  - `path` (string, required): Path to check permissions for
  - `principal` (string, required): Principal to check permissions for

**aem_validate_permissions**
- Description: Validate required permissions for principals
- Parameters:
  - `path` (string, required): Path to validate permissions for
  - `principal` (string, required): Principal to validate
  - `permissions` (array, required): Permissions to validate

**aem_has_permission**
- Description: Check specific permission for principal
- Parameters:
  - `path` (string, required): Path to check permission for
  - `principal` (string, required): Principal to check
  - `permission` (string, required): Permission to check

**aem_get_principal_permissions**
- Description: Get permissions across multiple paths
- Parameters:
  - `paths` (array, required): Paths to check permissions for
  - `principal` (string, required): Principal to check permissions for

#### Replication Management

**aem_publish_content**
- Description: Publish content to publish tier
- Parameters:
  - `contentPath` (string, required): Content path to publish
  - `deep` (boolean): Deep publish (default: false)
  - `onlyModified` (boolean): Only publish modified content (default: false)
  - `onlyActivated` (boolean): Only publish activated content (default: false)
  - `ignoreDeactivated` (boolean): Ignore deactivated content (default: false)
  - `force` (boolean): Force publish (default: false)
  - `synchronous` (boolean): Synchronous publish (default: false)

**aem_unpublish_content**
- Description: Unpublish content from publish tier
- Parameters:
  - `contentPath` (string, required): Content path to unpublish
  - `deep` (boolean): Deep unpublish (default: false)
  - `force` (boolean): Force unpublish (default: false)
  - `synchronous` (boolean): Synchronous unpublish (default: false)

**aem_get_replication_queue_status**
- Description: Get replication queue status for all agents
- Parameters: None

**aem_get_agent_queue_status**
- Description: Get specific agent queue status
- Parameters:
  - `agentName` (string, required): Agent name

**aem_list_replication_agents**
- Description: List all replication agents
- Parameters: None

**aem_get_replication_agent**
- Description: Get specific replication agent details
- Parameters:
  - `agentName` (string, required): Agent name

**aem_update_replication_agent**
- Description: Update replication agent configuration
- Parameters:
  - `agentName` (string, required): Agent name
  - `updates` (object, required): Agent configuration updates

**aem_schedule_publish**
- Description: Schedule content for future publishing
- Parameters:
  - `contentPath` (string, required): Content path to schedule
  - `scheduleDate` (string, required): ISO date string for scheduled publish
  - `timezone` (string): Timezone for scheduled publish
  - `deep` (boolean): Deep publish (default: false)
  - `onlyModified` (boolean): Only publish modified content (default: false)
  - `onlyActivated` (boolean): Only publish activated content (default: false)
  - `ignoreDeactivated` (boolean): Ignore deactivated content (default: false)
  - `force` (boolean): Force publish (default: false)
  - `workflowModel` (string): Workflow model to use
  - `comment` (string): Publish comment
  - `initiator` (string): Publish initiator

**aem_get_scheduled_publish_jobs**
- Description: Get scheduled publish jobs
- Parameters: None

**aem_cancel_scheduled_publish**
- Description: Cancel scheduled publish job
- Parameters:
  - `jobId` (string, required): Job ID to cancel

#### System Operations

**aem_get_system_info**
- Description: Get system information and status
- Parameters: None

**aem_health_check**
- Description: Perform comprehensive health check
- Parameters: None

**aem_get_metrics**
- Description: Get Prometheus metrics
- Parameters: None

**aem_search_assets**
- Description: Search for assets in DAM
- Parameters:
  - `query` (string, required): Search query
  - `mimeType` (string): Filter by MIME type
  - `limit` (number): Maximum results to return (default: 20)

#### Asset Management

**aem_list_assets**
- Description: List assets in DAM with filtering options
- Parameters:
  - `path` (string): DAM path to list assets from (default: `/content/dam`)
  - `mimeType` (string): Filter by MIME type
  - `limit` (number): Maximum assets to return (default: 50)

**aem_get_asset_metadata**
- Description: Get metadata for a specific asset
- Parameters:
  - `assetPath` (string, required): Path to the asset

**aem_get_asset_renditions**
- Description: Get available renditions for an asset
- Parameters:
  - `assetPath` (string, required): Path to the asset

#### User Administration

**aem_list_users**
- Description: List users in AEM
- Parameters:
  - `group` (string): Filter by group membership
  - `limit` (number): Maximum users to return (default: 50)

**aem_list_groups**
- Description: List groups in AEM
- Parameters:
  - `limit` (number): Maximum groups to return (default: 50)

**aem_get_user_profile**
- Description: Get detailed profile information for a user
- Parameters:
  - `userId` (string, required): User ID

#### System Operations

**aem_get_system_health**
- Description: Get AEM system health information
- Parameters: None

**aem_get_system_info**
- Description: Get AEM system information
- Parameters: None

**aem_list_async_jobs**
- Description: List running async jobs
- Parameters:
  - `status` (string): Filter by job status

## Write Server API

The Write Server provides write operations for content management and administration.

### Base URL
- HTTP: `http://localhost:3002`
- MCP: Use `--stdio` flag for STDIO protocol

### Authentication
- **Required** for all write operations
- API Key via `X-API-Key` header or `Authorization: Bearer <token>`
- IP allowlisting (if configured)

### Security Features
- Dangerous operation confirmation required
- Rate limiting (more restrictive than read server)
- Enhanced audit logging
- CORS disabled by default

### Available Tools

#### Package Management

**aem_create_package**
- Description: Create a new package in AEM
- Parameters:
  - `groupName` (string, required): Package group name
  - `packageName` (string, required): Package name
  - `version` (string): Package version (default: "1.0.0")
  - `description` (string): Package description

**aem_install_package**
- Description: Install a package in AEM
- Parameters:
  - `packagePath` (string, required): Path to the package
  - `recursive` (boolean): Install recursively (default: false)

**aem_delete_package** ⚠️ *Dangerous Operation*
- Description: Delete a package from AEM
- Parameters:
  - `packagePath` (string, required): Path to the package
  - `force` (boolean): Force deletion (default: false)
  - `confirm` (boolean): Confirmation required for dangerous operations

#### Page Operations

**aem_create_page**
- Description: Create a new page in AEM
- Parameters:
  - `parentPath` (string, required): Parent page path
  - `pageName` (string, required): Page name
  - `title` (string, required): Page title
  - `template` (string, required): Page template path
  - `properties` (object): Additional page properties

**aem_copy_page**
- Description: Copy a page in AEM
- Parameters:
  - `sourcePath` (string, required): Source page path
  - `destinationPath` (string, required): Destination path
  - `shallow` (boolean): Shallow copy (default: false)

**aem_move_page**
- Description: Move a page in AEM
- Parameters:
  - `sourcePath` (string, required): Source page path
  - `destinationPath` (string, required): Destination path

**aem_delete_page** ⚠️ *Dangerous Operation*
- Description: Delete a page in AEM
- Parameters:
  - `pagePath` (string, required): Page path to delete
  - `force` (boolean): Force deletion (default: false)
  - `confirm` (boolean): Confirmation required for dangerous operations

#### Asset Management

**aem_upload_asset**
- Description: Upload an asset to DAM
- Parameters:
  - `parentPath` (string, required): DAM parent path
  - `fileName` (string, required): Asset file name
  - `fileContent` (string, required): Base64 encoded file content
  - `metadata` (object): Asset metadata

**aem_update_asset**
- Description: Update asset metadata
- Parameters:
  - `assetPath` (string, required): Asset path
  - `metadata` (object, required): Updated metadata

**aem_delete_asset** ⚠️ *Dangerous Operation*
- Description: Delete an asset from DAM
- Parameters:
  - `assetPath` (string, required): Asset path to delete
  - `confirm` (boolean): Confirmation required for dangerous operations

#### Replication

**aem_publish_content**
- Description: Publish content to publish tier
- Parameters:
  - `contentPath` (string, required): Content path to publish
  - `deep` (boolean): Deep publish (default: false)

**aem_unpublish_content**
- Description: Unpublish content from publish tier
- Parameters:
  - `contentPath` (string, required): Content path to unpublish
  - `deep` (boolean): Deep unpublish (default: false)

## HTTP REST API Usage

### JSON-RPC 2.0 Endpoint

**POST** `/api/jsonrpc`

```json
{
  "jsonrpc": "2.0",
  "method": "tools.call",
  "params": {
    "name": "aem_list_pages",
    "arguments": {
      "path": "/content/mysite",
      "depth": 2,
      "limit": 50
    }
  },
  "id": 1
}
```

### REST-style Endpoints

**POST** `/api/tools/{toolName}`

```json
{
  "path": "/content/mysite",
  "depth": 2,
  "limit": 50
}
```

### Tool List

**GET** `/api/tools`

Returns list of available tools with their schemas.

### Health Check

**GET** `/health`

Returns server health status.

## Error Handling

### Error Codes

- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32001`: Authentication error
- `-32002`: Authorization error
- `-32003`: Dangerous operation confirmation required

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "details": "Additional error information"
    }
  },
  "id": 1
}
```

## Rate Limiting

- Read Server: 100 requests per minute (default)
- Write Server: 50 requests per minute (default)
- Rate limits are per API key or IP address
- HTTP 429 status code returned when limit exceeded

## Security Best Practices

1. **Use HTTPS** in production environments
2. **Rotate API keys** regularly
3. **Enable IP allowlisting** for write operations
4. **Monitor audit logs** for suspicious activity
5. **Use least privilege** principle for API keys
6. **Confirm dangerous operations** explicitly
7. **Keep servers updated** with latest security patches