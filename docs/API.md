# AEM MCP Servers API Documentation

## Overview

The AEM MCP Servers provide both MCP protocol and HTTP REST API access to Adobe Experience Manager as a Cloud Service (AEMaaCS) operations.

## Read Server API

The Read Server provides safe, read-only access to AEM content and system information.

### Base URL
- HTTP: `http://localhost:3001`
- MCP: Use `--stdio` flag for STDIO protocol

### Authentication
- Optional for read operations
- API Key via `X-API-Key` header (if enabled)

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
  - `path` (string): Path to search within (default: `/content`)
  - `type` (string): Node type to search for (default: `cq:Page`)
  - `limit` (number): Maximum results to return (default: 20)

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