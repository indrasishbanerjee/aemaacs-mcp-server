# AEMaaCS MCP Servers

> **License Notice**: This software is licensed under the Server Side Public License (SSPL). For commercial use in enterprise environments, a paid license is required. Contact [HERE](mailto:indrasish00@gmail.com) for details.

Two separate Model Context Protocol (MCP) servers for Adobe Experience Manager as a Cloud Service (AEMaaCS):

- **aemaacs-mcp-read-server**: Read-only operations for safe content exploration
- **aemaacs-mcp-write-server**: Write operations for content management and automation

## Project Structure -

```
├── packages/
│   ├── shared/           # Common utilities, types, and configurations
│   ├── read-server/      # Read-only MCP server
│   └── write-server/     # Write operations MCP server
├── docker-compose.yml    # Docker orchestration
├── .github/workflows/    # CI/CD pipeline
└── docs/                 # Documentation
```

## Development Setup

### Prerequisites

- Node.js 16+ 
- npm 8+
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build packages
npm run build

# Lint code
npm run lint
```

### Environment Configuration

Copy `.env.example` to `.env` and configure your AEMaaCS connection:

```bash
cp .env.example .env
```

Key configuration options:
- `AEM_HOST`: Your AEMaaCS instance hostname
- `AEM_AUTH_TYPE`: Authentication method (basic, oauth, service-account)
- `AEM_USERNAME/AEM_PASSWORD`: Basic auth credentials

## Architecture

### Shared Package (`@aemaacs-mcp/shared`)

Common utilities and types used by both servers:

- **Types**: AEM and MCP protocol interfaces
- **Error Handling**: Structured error management with retry logic
- **Validation**: Input sanitization and security validation
- **Configuration**: Environment-based configuration management
- **Logging**: Structured logging with audit capabilities

### Read Server (`@aemaacs-mcp/read-server`)

Provides safe, read-only access to AEMaaCS:

- Package information and status
- Content discovery and search
- Asset metadata and references
- User and group information
- Workflow and replication status
- System health and monitoring

### Write Server (`@aemaacs-mcp/write-server`)

Enables content management operations:

- Package creation, installation, and management
- Page and component operations
- Content publishing and replication
- User and group administration
- Asset upload and processing
- Workflow triggering and management

## Protocol Support

Both servers support dual interfaces:

1. **HTTP REST API**: JSON-RPC 2.0 compliant endpoints
2. **STDIO MCP Protocol**: Direct integration with AI tools and IDEs

## Security Features

- Input validation and sanitization
- Path traversal protection
- SQL injection prevention
- Rate limiting and throttling
- Comprehensive audit logging
- Configurable authentication methods

## Docker Support

Run with Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Testing

The project includes comprehensive testing:

- Unit tests for all core functionality
- Integration tests with mock AEM responses
- Security and validation testing
- Performance and load testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific package tests
npm test --workspace=packages/shared
```

## CI/CD Pipeline

GitHub Actions workflow includes:

- Automated testing on multiple Node.js versions
- Code quality checks (ESLint, Prettier)
- Security vulnerability scanning
- Docker image building and publishing
- Integration testing with services

## Development Status

✅ **Completed**: 
- Project structure and development infrastructure
- Core AEM HTTP client implementation with authentication (OAuth, Service Account, Basic)
- Complete service layer for read and write operations
- MCP protocol handlers for both servers with JSON-RPC 2.0 compliance
- HTTP REST API handlers for both servers
- Configuration management system with hot-reload support
- Comprehensive error handling and logging with audit capabilities
- Security middleware and validation (API keys, IP allowlisting, rate limiting)
- Redis cache adapter with connection pooling
- Circuit breaker integration with fallback mechanisms
- Bulk operations with progress tracking
- Content Fragment operations (models, variations, references)
- Workflow management (discovery, instances, tasks)
- Version management (creation, comparison, restoration, labeling)
- Advanced search with QueryBuilder support, facets, and pagination
- Asset enhancements (processing status, custom renditions, smart crop, video)
- Permission management (ACL reading, effective permissions, validation)
- Template component management (discovery, usage analysis, dependencies)
- Enhanced replication (queue status, agent management, scheduled publishing)
- Prometheus metrics collection with custom business metrics
- Comprehensive health check endpoints
- Automatic retry with exponential backoff
- Input validation for paths, content, file uploads, and JCR properties
- Unit tests (80%+ coverage), integration tests, and end-to-end tests
- Dangerous operation confirmation enforcement

🚀 **Production Ready**: Both read and write servers are fully implemented with enterprise-grade features and comprehensive testing

📋 **Available Features**: 
- Advanced caching and performance optimization with Redis
- Enhanced monitoring and observability with Prometheus
- Comprehensive security features and audit logging
- Complete documentation and deployment guides

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the full test suite
5. Submit a pull request

## Documentation

📚 **Complete Documentation Available**:

- **[Quick Start Guide](docs/QUICKSTART.md)** - Get up and running in minutes
- **[Setup Guide](docs/SETUP.md)** - Detailed installation and configuration
- **[API Documentation](docs/API.md)** - Complete HTTP REST API reference
- **[MCP Tools Reference](docs/MCP_TOOLS.md)** - Comprehensive MCP tools documentation
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Quick Start

### Option 1: Simplified Servers (Recommended for Testing)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Both Servers**:
   ```bash
   node start-both-servers.js
   ```
   This will start:
   - AEMaaCS Read Server on http://localhost:3003
   - AEMaaCS Write Server on http://localhost:3004

3. **Test Connection**:
   ```bash
   curl http://localhost:3003/health
   curl http://localhost:3004/health
   curl -H "X-API-Key: development-api-key-12345" http://localhost:3004/api/tools
   ```

### Option 2: Full Development Build

1. **Install and Build**:
   ```bash
   npm install && npm run build
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your AEMaaCS credentials
   ```

3. **Start Read Server**:
   ```bash
   cd packages/read-server && npm start
   # Server available at http://localhost:3001
   ```

4. **Start Write Server**:
   ```bash
   cd packages/write-server && npm start
   # Server available at http://localhost:3002
   ```

5. **Test Connection**:
   ```bash
   curl http://localhost:3001/health
   ```

## MCP Integration

### Cursor MCP Configuration

Add this configuration to your **Cursor Settings > Features > Model Context Protocol**:

```json
{
  "mcpServers": {
    "aemaacs-read-server": {
      "command": "node",
      "args": ["aemaacs-read-server.js", "--stdio"],
      "cwd": "/path/to/your/project",
      "env": {
        "AEM_HOST": "https://mock-aem-instance.com",
        "AEM_CLIENT_ID": "mock-client-id",
        "AEM_CLIENT_SECRET": "mock-client-secret",
        "LOG_LEVEL": "info",
        "MOCK_AEM": "true"
      }
    },
    "aemaacs-write-server": {
      "command": "node",
      "args": ["aemaacs-write-server.js", "--stdio"],
      "cwd": "/path/to/your/project",
      "env": {
        "AEM_HOST": "https://mock-aem-instance.com",
        "AEM_CLIENT_ID": "mock-client-id",
        "AEM_CLIENT_SECRET": "mock-client-secret",
        "API_KEY": "development-api-key-12345",
        "LOG_LEVEL": "info",
        "MOCK_AEM": "true"
      }
    }
  }
}
```

**Note**: Replace the `cwd` path with your actual project directory path.

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aemaacs-read": {
      "command": "node",
      "args": ["aemaacs-read-server.js", "--stdio"],
      "cwd": "/path/to/your/project",
      "env": {
        "AEM_HOST": "https://your-instance.adobeaemcloud.com",
        "AEM_CLIENT_ID": "your-client-id",
        "AEM_CLIENT_SECRET": "your-client-secret",
        "LOG_LEVEL": "info",
        "MOCK_AEM": "true"
      }
    },
    "aemaacs-write": {
      "command": "node",
      "args": ["aemaacs-write-server.js", "--stdio"],
      "cwd": "/path/to/your/project",
      "env": {
        "AEM_HOST": "https://your-instance.adobeaemcloud.com",
        "AEM_CLIENT_ID": "your-client-id",
        "AEM_CLIENT_SECRET": "your-client-secret",
        "API_KEY": "your-secure-api-key",
        "LOG_LEVEL": "info",
        "MOCK_AEM": "true"
      }
    }
  }
}
```

### Available Tools

**Read Server** (50+ tools):
- Content discovery (`listPages`, `getPageContent`)
- Asset management (`listAssets`, `getAssetMetadata`)
- Search and query (`searchContent`, `searchAssets`)
- User administration (`listUsers`, `getUserProfile`)
- System monitoring (`getSystemHealth`, `getSystemInfo`)

**Write Server** (40+ tools):
- Package management (`createPackage`, `installPackage`)
- Page operations (`createPage`, `copyPage`, `deletePage`)
- Asset operations (`uploadAsset`, `updateAsset`)
- Publishing (`publishContent`, `unpublishContent`)
- User management (`createUser`, `createGroup`)

## Production Deployment

### Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# With monitoring
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Security Checklist

- ✅ Use HTTPS in production
- ✅ Configure API key authentication
- ✅ Enable IP allowlisting for write server
- ✅ Set up rate limiting
- ✅ Enable audit logging
- ✅ Use secrets management for credentials

## License

This software is licensed under the Server Side Public License (SSPL). For commercial use in enterprise environments, a paid license is required. Contact [HERE](mailto:indrasish00@gmail.com) for details.

See the [LICENSE](LICENSE) file for the full license text.
