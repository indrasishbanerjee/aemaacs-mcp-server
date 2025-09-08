# AEMaaCS MCP Servers - Quick Start Guide

## Overview

Get up and running with AEMaaCS MCP Servers in minutes. This guide covers the essential steps to start using the servers for both read and write operations with Adobe Experience Manager as a Cloud Service.

## Prerequisites

- Node.js 16+ and npm 8+
- Access to an AEMaaCS instance
- Service account credentials for AEMaaCS (for authentication)

## Installation

### Option 1: Clone and Build (Recommended for Development)

```bash
# Clone the repository
git clone <repository-url>
cd aemaacs-mcp-servers

# Install dependencies
npm install

# Build all packages
npm run build
```

### Option 2: Docker (Recommended for Production)

```bash
# Pull the images
docker pull aemaacs-mcp-read-server:latest
docker pull aemaacs-mcp-write-server:latest

# Or build locally
docker build -f packages/read-server/Dockerfile -t aemaacs-mcp-read-server .
docker build -f packages/write-server/Dockerfile -t aemaacs-mcp-write-server .
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# AEM Connection
AEM_HOST=https://your-aem-instance.adobeaemcloud.com
AEM_CLIENT_ID=your-client-id
AEM_CLIENT_SECRET=your-client-secret
AEM_TECHNICAL_ACCOUNT_ID=your-technical-account-id
AEM_ORGANIZATION_ID=your-organization-id
AEM_PRIVATE_KEY=your-private-key

# Server Configuration
READ_SERVER_PORT=3001
WRITE_SERVER_PORT=3002
LOG_LEVEL=info

# Security (for write server)
API_KEY=your-secure-api-key
ALLOWED_IPS=127.0.0.1,::1
```

### AEM Service Account Setup

1. Create a service account in Adobe Developer Console
2. Add AEM API access
3. Generate JWT credentials
4. Download the private key
5. Configure the environment variables above

## Quick Start

### 1. Start the Read Server

```bash
# Using npm
cd packages/read-server
npm start

# Using Docker
docker run -p 3001:3001 --env-file .env aemaacs-mcp-read-server

# Using MCP protocol (STDIO)
cd packages/read-server
node dist/index.js --stdio
```

### 2. Start the Write Server

```bash
# Using npm
cd packages/write-server
npm start

# Using Docker
docker run -p 3002:3002 --env-file .env aemaacs-mcp-write-server

# Using MCP protocol (STDIO)
cd packages/write-server
node dist/index.js --stdio
```

### 3. Test the Connection

#### HTTP API Test

```bash
# Test read server health
curl http://localhost:3001/health

# List available tools
curl http://localhost:3001/api/tools

# Test a simple read operation
curl -X POST http://localhost:3001/api/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools.call",
    "params": {
      "name": "getSystemHealth",
      "arguments": {}
    },
    "id": 1
  }'
```

#### MCP Protocol Test

```bash
# Test MCP initialization (using stdio)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node packages/read-server/dist/index.js --stdio
```

## Common Use Cases

### 1. Content Discovery

```bash
# List pages in a site
curl -X POST http://localhost:3001/api/tools/listPages \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/content/mysite",
    "depth": 2,
    "limit": 50
  }'
```

### 2. Asset Management

```bash
# List assets in DAM
curl -X POST http://localhost:3001/api/tools/listAssets \
  -H "Content-Type: application/json" \
  -d '{
    "folderPath": "/content/dam/mysite",
    "limit": 20
  }'
```

### 3. Search Content

```bash
# Search for pages
curl -X POST http://localhost:3001/api/tools/searchContent \
  -H "Content-Type: application/json" \
  -d '{
    "query": "fulltext=adobe",
    "path": "/content/mysite",
    "limit": 10
  }'
```

### 4. Create Content (Write Server)

```bash
# Create a new page
curl -X POST http://localhost:3002/api/tools/createPage \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-api-key" \
  -d '{
    "parentPath": "/content/mysite/en",
    "pageName": "new-page",
    "title": "My New Page",
    "template": "/conf/mysite/settings/wcm/templates/page"
  }'
```

## MCP Client Integration

### Using with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "aem-read": {
      "command": "node",
      "args": ["/path/to/packages/read-server/dist/index.js", "--stdio"],
      "env": {
        "AEM_HOST": "https://your-aem-instance.adobeaemcloud.com",
        "AEM_CLIENT_ID": "your-client-id",
        "AEM_CLIENT_SECRET": "your-client-secret"
      }
    },
    "aem-write": {
      "command": "node",
      "args": ["/path/to/packages/write-server/dist/index.js", "--stdio"],
      "env": {
        "AEM_HOST": "https://your-aem-instance.adobeaemcloud.com",
        "AEM_CLIENT_ID": "your-client-id",
        "AEM_CLIENT_SECRET": "your-client-secret",
        "API_KEY": "your-secure-api-key"
      }
    }
  }
}
```

### Using with Other MCP Clients

The servers implement the standard MCP protocol and can be used with any MCP-compatible client:

1. Start the server with `--stdio` flag
2. Send MCP initialize request
3. Use `tools/list` to discover available tools
4. Call tools using `tools/call` method

## Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  aem-read-server:
    build:
      context: .
      dockerfile: packages/read-server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - AEM_HOST=${AEM_HOST}
      - AEM_CLIENT_ID=${AEM_CLIENT_ID}
      - AEM_CLIENT_SECRET=${AEM_CLIENT_SECRET}
      - AEM_TECHNICAL_ACCOUNT_ID=${AEM_TECHNICAL_ACCOUNT_ID}
      - AEM_ORGANIZATION_ID=${AEM_ORGANIZATION_ID}
      - AEM_PRIVATE_KEY=${AEM_PRIVATE_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  aem-write-server:
    build:
      context: .
      dockerfile: packages/write-server/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - AEM_HOST=${AEM_HOST}
      - AEM_CLIENT_ID=${AEM_CLIENT_ID}
      - AEM_CLIENT_SECRET=${AEM_CLIENT_SECRET}
      - AEM_TECHNICAL_ACCOUNT_ID=${AEM_TECHNICAL_ACCOUNT_ID}
      - AEM_ORGANIZATION_ID=${AEM_ORGANIZATION_ID}
      - AEM_PRIVATE_KEY=${AEM_PRIVATE_KEY}
      - API_KEY=${API_KEY}
      - ALLOWED_IPS=${ALLOWED_IPS}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

## Monitoring and Logging

### Health Checks

Both servers provide health check endpoints:

```bash
# Read server health
curl http://localhost:3001/health

# Write server health
curl http://localhost:3002/health
```

### Logs

Enable debug logging:

```bash
export DEBUG=aem-mcp-server:*
npm start
```

View logs in Docker:

```bash
docker logs aemaacs-mcp-read-server
docker logs aemaacs-mcp-write-server
```

## Security Considerations

### Read Server
- Generally safe for public access
- Consider rate limiting for production
- Monitor for excessive usage

### Write Server
- **Always** require authentication
- Use IP allowlisting in production
- Enable audit logging
- Require confirmation for dangerous operations
- Use HTTPS in production

### API Keys
- Generate strong, unique API keys
- Rotate keys regularly
- Store securely (environment variables, secrets management)
- Monitor API key usage

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check AEM host URL
   - Verify network connectivity
   - Check firewall settings

2. **Authentication Error**
   - Verify service account credentials
   - Check JWT token generation
   - Ensure proper permissions in AEM

3. **Tool Not Found**
   - Check tool name spelling
   - Verify server is running
   - Check available tools with `/api/tools`

4. **Rate Limited**
   - Implement exponential backoff
   - Reduce request frequency
   - Consider upgrading rate limits

### Debug Steps

1. Check server logs
2. Verify environment variables
3. Test AEM connectivity directly
4. Use curl to test individual endpoints
5. Enable debug logging

### Getting Help

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review the [API Documentation](API.md)
3. Check server logs for error details
4. Verify AEM permissions and connectivity

## Next Steps

- Read the [MCP Tools Reference](MCP_TOOLS.md) for detailed tool documentation
- Check the [API Documentation](API.md) for HTTP API details
- Review the [Setup Guide](SETUP.md) for advanced configuration
- See the [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues

## Production Deployment

For production deployment:

1. Use Docker containers
2. Enable HTTPS/TLS
3. Configure proper authentication
4. Set up monitoring and alerting
5. Implement backup and disaster recovery
6. Use a reverse proxy (nginx, Apache)
7. Configure rate limiting
8. Enable audit logging
9. Set up log aggregation
10. Implement health checks and auto-restart