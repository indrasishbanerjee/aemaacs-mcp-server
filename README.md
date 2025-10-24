# AEMaaCS MCP Servers

> **License Notice**: This software is licensed under the Server Side Public License (SSPL). For commercial use in enterprise environments, a paid license is required. Contact [HERE](https://techmate.in/contact) for details.

## Connect AI Tools to Adobe Experience Manager

Transform how you interact with Adobe Experience Manager as a Cloud Service (AEMaaCS) by connecting your favorite AI tools through Model Context Protocol (MCP). These servers provide a secure, high-performance bridge between AI assistants and your AEM instance.

### Two Powerful Servers

🔍 **Read Server**: Safely explore and analyze your AEM content with 50+ read-only operations  
✏️ **Write Server**: Manage and automate content creation with 40+ write operations

Perfect for content teams, developers, and AI-powered workflows that need seamless AEM integration.

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

The servers automatically load configuration from a `.env` file. This keeps your credentials secure and separate from your MCP configuration.

**Required Steps:**
1. Copy the example environment file: `cp .env.example .env`
2. Edit `.env` with your AEMaaCS credentials
3. The MCP servers will automatically use these settings

**Key Configuration Options:**
- `AEM_HOST`: Your AEMaaCS instance URL (e.g., `https://your-instance.adobeaemcloud.com`)
- `AEM_AUTH_TYPE`: Authentication method (`oauth` for OAuth 2.0 Server-to-Server)
- `AEM_CLIENT_ID` & `AEM_CLIENT_SECRET`: OAuth 2.0 credentials
- `API_KEY`: Secure key for write operations

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

## Why Use AEMaaCS MCP Servers?

🚀 **Seamless Integration**: Connect your favorite AI tools directly to Adobe Experience Manager as a Cloud Service

🔒 **Enterprise Security**: Built with security-first design, supporting service account authentication, API keys, and audit logging

⚡ **High Performance**: Advanced caching, connection pooling, and optimized queries for fast content operations

🛡️ **Safe Operations**: Separate read and write servers ensure you can explore content safely before making changes

📊 **Rich Functionality**: 50+ read operations and 40+ write operations covering all major AEM workflows

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

### Get Started in 3 Steps

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd aemaacs-mcp-servers
   npm install
   ```

2. **Configure Your AEM Connection**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your AEMaaCS credentials
   # See "Getting Your AEM Credentials" section below
   ```

3. **Start the Servers**:
   ```bash
   # Option A: Start both servers (recommended for testing)
   node start-both-servers.js
   
   # Option B: Start individual servers
   cd packages/read-server && npm start
   cd packages/write-server && npm start
   ```

4. **Test Your Connection**:
   ```bash
   # Test read server
   curl http://localhost:3003/health
   
   # Test write server (requires API key)
   curl -H "X-API-Key: development-api-key-12345" http://localhost:3004/health
   ```

## MCP Integration

### Step 1: Configure Your AEM Connection

First, create a `.env` file in your project root with your AEMaaCS credentials:

```bash
# AEM Connection (Required)
AEM_HOST=https://your-instance.adobeaemcloud.com
AEM_AUTH_TYPE=oauth
AEM_CLIENT_ID=your-client-id
AEM_CLIENT_SECRET=your-client-secret

# Server Configuration
LOG_LEVEL=info

# Security (for write server)
API_KEY=your-secure-api-key
```

### Step 2: Configure Your MCP Client

#### Cursor MCP Configuration

Add this configuration to your **Cursor Settings > Features > Model Context Protocol**:

```json
{
  "mcpServers": {
    "aemaacs-read-server": {
      "command": "node",
      "args": ["aemaacs-read-server.js", "--stdio"],
      "cwd": "/path/to/your/project"
    },
    "aemaacs-write-server": {
      "command": "node",
      "args": ["aemaacs-write-server.js", "--stdio"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

**Note**: Replace the `cwd` path with your actual project directory path. The servers will automatically load configuration from your `.env` file.

#### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aemaacs-read": {
      "command": "node",
      "args": ["aemaacs-read-server.js", "--stdio"],
      "cwd": "/path/to/your/project"
    },
    "aemaacs-write": {
      "command": "node",
      "args": ["aemaacs-write-server.js", "--stdio"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### Getting Your AEM Credentials

To get the required AEMaaCS credentials using OAuth 2.0 (Adobe's current authentication method):

1. **Go to Adobe Developer Console**: https://developer.adobe.com/console/
2. **Create a new project** or select an existing one
3. **Add AEM API** to your project
4. **Generate OAuth 2.0 credentials** for server-to-server authentication
5. **Copy the Client ID and Client Secret** from your project credentials to the `.env` file

### Why Use .env File Configuration?

✅ **Security**: Keep sensitive credentials out of your MCP configuration files  
✅ **Simplicity**: No need to duplicate environment variables in multiple places  
✅ **Flexibility**: Easy to change configuration without modifying MCP settings  
✅ **Best Practice**: Standard approach for managing environment-specific settings  
✅ **Version Control Safe**: `.env` files are typically ignored by Git

### What Can You Do?

#### 🔍 Read Server - Explore & Analyze
- **Content Discovery**: Browse pages, components, and content fragments
- **Asset Management**: Search and analyze digital assets in DAM
- **Advanced Search**: Query content using AEM's QueryBuilder API
- **User Administration**: Manage users, groups, and permissions
- **System Monitoring**: Check AEM health, performance, and status
- **Workflow Tracking**: Monitor active workflows and tasks

#### ✏️ Write Server - Create & Manage
- **Content Creation**: Create pages, components, and content fragments
- **Asset Operations**: Upload, update, and process digital assets
- **Package Management**: Create, install, and manage AEM packages
- **Publishing**: Publish content to publish tier with workflow support
- **User Management**: Create users, groups, and manage permissions
- **Bulk Operations**: Efficiently manage large-scale content changes

#### 🚀 Real-World Use Cases
- **AI Content Generation**: Let AI create and populate AEM pages
- **Automated Asset Processing**: Batch upload and process digital assets
- **Content Migration**: Streamline content migration between environments
- **Quality Assurance**: Automated content validation and testing
- **Performance Monitoring**: Continuous monitoring of AEM performance

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
