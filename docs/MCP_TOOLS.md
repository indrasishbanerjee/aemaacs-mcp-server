# AEMaaCS MCP Tools Reference

## Overview

This document provides a comprehensive reference for all MCP (Model Context Protocol) tools available in the AEMaaCS MCP Servers. These tools enable AI assistants and other MCP clients to interact with Adobe Experience Manager as a Cloud Service.

## Tool Categories

### 🔍 Content Discovery Tools (Read Server)

#### `listPages`
**Purpose**: Discover and list pages in AEM with hierarchical navigation support.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Root path to list pages from",
      "default": "/content"
    },
    "depth": {
      "type": "number",
      "description": "Maximum depth to traverse (1-5)",
      "minimum": 1,
      "maximum": 5,
      "default": 1
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of pages to return",
      "minimum": 1,
      "maximum": 500,
      "default": 100
    }
  }
}
```

**Example Usage**:
```json
{
  "name": "listPages",
  "arguments": {
    "path": "/content/mysite",
    "depth": 2,
    "limit": 50
  }
}
```

**Response**: Array of page objects with path, title, template, and metadata.

---

#### `getPageContent`
**Purpose**: Retrieve complete content structure of a specific page.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "pagePath": {
      "type": "string",
      "description": "Full path to the page",
      "pattern": "^/content/.*"
    },
    "depth": {
      "type": "number",
      "description": "Depth of content to retrieve",
      "minimum": 1,
      "maximum": 10,
      "default": 2
    }
  },
  "required": ["pagePath"]
}
```

**Use Cases**:
- Content analysis and auditing
- Migration planning
- Template structure analysis

---

#### `getPageProperties`
**Purpose**: Extract metadata and properties from a specific page.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "pagePath": {
      "type": "string",
      "description": "Full path to the page",
      "pattern": "^/content/.*"
    }
  },
  "required": ["pagePath"]
}
```

**Response**: Page properties including jcr:title, cq:template, creation date, etc.

---

### 🔧 Component Analysis Tools (Read Server)

#### `scanPageComponents`
**Purpose**: Analyze and catalog all components used on a page.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "pagePath": {
      "type": "string",
      "description": "Path to the page to scan",
      "pattern": "^/content/.*"
    },
    "includeInherited": {
      "type": "boolean",
      "description": "Include inherited components",
      "default": false
    }
  },
  "required": ["pagePath"]
}
```

**Use Cases**:
- Component usage analysis
- Migration planning
- Performance optimization
- Template auditing

---

#### `getPageTextContent`
**Purpose**: Extract all text content from a page for analysis.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "pagePath": {
      "type": "string",
      "description": "Path to the page",
      "pattern": "^/content/.*"
    },
    "includeHidden": {
      "type": "boolean",
      "description": "Include hidden text content",
      "default": false
    }
  },
  "required": ["pagePath"]
}
```

**Use Cases**:
- Content auditing
- SEO analysis
- Translation preparation
- Accessibility compliance

---

#### `getPageImages`
**Purpose**: Discover all image references and assets used on a page.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "pagePath": {
      "type": "string",
      "description": "Path to the page",
      "pattern": "^/content/.*"
    }
  },
  "required": ["pagePath"]
}
```

**Response**: Array of image objects with paths, alt text, and metadata.

---

### 🔍 Search and Query Tools (Read Server)

#### `searchContent`
**Purpose**: Search for content across AEM using QueryBuilder API.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query string"
    },
    "path": {
      "type": "string",
      "description": "Path to search within",
      "default": "/content"
    },
    "type": {
      "type": "string",
      "description": "Node type to search for",
      "default": "cq:Page"
    },
    "limit": {
      "type": "number",
      "description": "Maximum results to return",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    }
  },
  "required": ["query"]
}
```

**Advanced Query Examples**:
```json
{
  "name": "searchContent",
  "arguments": {
    "query": "fulltext=adobe AND path=/content/mysite",
    "type": "cq:Page",
    "limit": 50
  }
}
```

---

#### `searchAssets`
**Purpose**: Search for assets in the Digital Asset Manager (DAM).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Asset search query"
    },
    "mimeType": {
      "type": "string",
      "description": "Filter by MIME type (e.g., 'image/jpeg')"
    },
    "path": {
      "type": "string",
      "description": "DAM path to search within",
      "default": "/content/dam"
    },
    "limit": {
      "type": "number",
      "description": "Maximum results to return",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    }
  },
  "required": ["query"]
}
```

---

### 📁 Asset Management Tools (Read Server)

#### `listAssets`
**Purpose**: List and browse assets in the DAM with filtering capabilities.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "folderPath": {
      "type": "string",
      "description": "DAM folder path to list assets from",
      "default": "/content/dam"
    },
    "mimeType": {
      "type": "string",
      "description": "Filter by MIME type"
    },
    "limit": {
      "type": "number",
      "description": "Maximum assets to return",
      "minimum": 1,
      "maximum": 200,
      "default": 50
    },
    "offset": {
      "type": "number",
      "description": "Pagination offset",
      "minimum": 0,
      "default": 0
    }
  }
}
```

---

#### `getAssetMetadata`
**Purpose**: Retrieve comprehensive metadata for a specific asset.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "assetPath": {
      "type": "string",
      "description": "Full path to the asset",
      "pattern": "^/content/dam/.*"
    }
  },
  "required": ["assetPath"]
}
```

**Response**: Complete asset metadata including EXIF data, custom properties, and system metadata.

---

### 👥 User Administration Tools (Read Server)

#### `listUsers`
**Purpose**: List users in the AEM system with filtering options.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "group": {
      "type": "string",
      "description": "Filter by group membership"
    },
    "limit": {
      "type": "number",
      "description": "Maximum users to return",
      "minimum": 1,
      "maximum": 100,
      "default": 50
    }
  }
}
```

---

#### `getUserProfile`
**Purpose**: Get detailed profile information for a specific user.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "description": "User ID or username"
    }
  },
  "required": ["userId"]
}
```

---

### ⚙️ System Operations Tools (Read Server)

#### `getSystemHealth`
**Purpose**: Check AEM system health and status.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Response**: System health metrics, bundle status, and performance indicators.

---

#### `getSystemInfo`
**Purpose**: Retrieve AEM system information and configuration details.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

---

## Write Server Tools

### ⚠️ Important Security Notice
All write operations require proper authentication and may require explicit confirmation for dangerous operations.

### 📦 Package Management Tools (Write Server)

#### `createPackage`
**Purpose**: Create a new content package in AEM.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "groupName": {
      "type": "string",
      "description": "Package group name"
    },
    "packageName": {
      "type": "string",
      "description": "Package name"
    },
    "version": {
      "type": "string",
      "description": "Package version",
      "default": "1.0.0"
    },
    "description": {
      "type": "string",
      "description": "Package description"
    }
  },
  "required": ["groupName", "packageName"]
}
```

---

#### `installPackage`
**Purpose**: Install a package in AEM.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "packagePath": {
      "type": "string",
      "description": "Path to the package to install"
    },
    "recursive": {
      "type": "boolean",
      "description": "Install recursively",
      "default": false
    }
  },
  "required": ["packagePath"]
}
```

---

### 📄 Page Operations Tools (Write Server)

#### `createPage`
**Purpose**: Create a new page in AEM.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "parentPath": {
      "type": "string",
      "description": "Parent page path",
      "pattern": "^/content/.*"
    },
    "pageName": {
      "type": "string",
      "description": "Page name (node name)"
    },
    "title": {
      "type": "string",
      "description": "Page title"
    },
    "template": {
      "type": "string",
      "description": "Page template path"
    },
    "properties": {
      "type": "object",
      "description": "Additional page properties"
    }
  },
  "required": ["parentPath", "pageName", "title", "template"]
}
```

**Example**:
```json
{
  "name": "createPage",
  "arguments": {
    "parentPath": "/content/mysite/en",
    "pageName": "new-page",
    "title": "New Page Title",
    "template": "/conf/mysite/settings/wcm/templates/page",
    "properties": {
      "description": "Page description",
      "keywords": ["keyword1", "keyword2"]
    }
  }
}
```

---

#### `copyPage`
**Purpose**: Copy a page to a new location.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "sourcePath": {
      "type": "string",
      "description": "Source page path",
      "pattern": "^/content/.*"
    },
    "destinationPath": {
      "type": "string",
      "description": "Destination path",
      "pattern": "^/content/.*"
    },
    "shallow": {
      "type": "boolean",
      "description": "Perform shallow copy",
      "default": false
    }
  },
  "required": ["sourcePath", "destinationPath"]
}
```

---

#### `deletePage` ⚠️ **Dangerous Operation**
**Purpose**: Delete a page from AEM.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "pagePath": {
      "type": "string",
      "description": "Page path to delete",
      "pattern": "^/content/.*"
    },
    "force": {
      "type": "boolean",
      "description": "Force deletion",
      "default": false
    },
    "confirm": {
      "type": "boolean",
      "description": "Explicit confirmation required",
      "default": false
    }
  },
  "required": ["pagePath", "confirm"]
}
```

---

### 📁 Asset Management Tools (Write Server)

#### `uploadAsset`
**Purpose**: Upload a new asset to the DAM.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "folderPath": {
      "type": "string",
      "description": "DAM folder path",
      "pattern": "^/content/dam/.*"
    },
    "fileName": {
      "type": "string",
      "description": "Asset file name"
    },
    "fileContent": {
      "type": "string",
      "description": "Base64 encoded file content"
    },
    "metadata": {
      "type": "object",
      "description": "Asset metadata",
      "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}}
      }
    }
  },
  "required": ["folderPath", "fileName", "fileContent"]
}
```

---

#### `deleteAsset` ⚠️ **Dangerous Operation**
**Purpose**: Delete an asset from the DAM.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "assetPath": {
      "type": "string",
      "description": "Asset path to delete",
      "pattern": "^/content/dam/.*"
    },
    "confirm": {
      "type": "boolean",
      "description": "Explicit confirmation required",
      "default": false
    }
  },
  "required": ["assetPath", "confirm"]
}
```

---

### 🚀 Replication Tools (Write Server)

#### `publishContent`
**Purpose**: Publish content to the publish tier.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "contentPath": {
      "type": "string",
      "description": "Content path to publish"
    },
    "deep": {
      "type": "boolean",
      "description": "Deep publish (include children)",
      "default": false
    }
  },
  "required": ["contentPath"]
}
```

---

#### `unpublishContent`
**Purpose**: Unpublish content from the publish tier.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "contentPath": {
      "type": "string",
      "description": "Content path to unpublish"
    },
    "deep": {
      "type": "boolean",
      "description": "Deep unpublish (include children)",
      "default": false
    }
  },
  "required": ["contentPath"]
}
```

---

## Best Practices

### 1. Error Handling
Always check the response for errors before processing results:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "AEM connection failed",
    "data": {
      "details": "Authentication credentials invalid"
    }
  },
  "id": 1
}
```

### 2. Rate Limiting
Be mindful of rate limits:
- Read operations: 100 requests/minute
- Write operations: 50 requests/minute

### 3. Dangerous Operations
Always set `confirm: true` for dangerous operations:

```json
{
  "name": "deletePage",
  "arguments": {
    "pagePath": "/content/mysite/old-page",
    "confirm": true
  }
}
```

### 4. Path Validation
Ensure paths follow AEM conventions:
- Content paths: `/content/...`
- DAM paths: `/content/dam/...`
- Template paths: `/conf/.../settings/wcm/templates/...`

### 5. Batch Operations
For multiple operations, consider using batch tools or implement client-side batching with appropriate delays.

## Common Use Cases

### Content Audit
1. Use `listPages` to discover content structure
2. Use `scanPageComponents` to analyze component usage
3. Use `getPageTextContent` for content analysis
4. Use `searchContent` to find specific content patterns

### Migration Planning
1. Use `listPages` with deep traversal to map content structure
2. Use `getPageContent` to understand content complexity
3. Use `listAssets` to inventory DAM assets
4. Use `getAssetMetadata` to understand asset dependencies

### Content Management
1. Use `createPage` to create new content
2. Use `copyPage` for content templating
3. Use `uploadAsset` for asset management
4. Use `publishContent` to make content live

### System Monitoring
1. Use `getSystemHealth` for health checks
2. Use `getSystemInfo` for configuration verification
3. Use `listUsers` for user management
4. Use `searchContent` for content governance

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify AEM credentials and permissions
2. **Path Not Found**: Check path existence and format
3. **Rate Limiting**: Implement exponential backoff
4. **Timeout Errors**: Increase timeout for large operations
5. **Permission Denied**: Verify user has required permissions

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=aem-mcp-server:*
```

### Support
For issues and questions:
1. Check the troubleshooting guide
2. Review server logs
3. Verify AEM connectivity
4. Check tool input schemas