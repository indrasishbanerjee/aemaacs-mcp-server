# AEM MCP Server Deployment Guide

This guide provides instructions for deploying and configuring the AEM MCP Server in various environments.

## System Requirements

- **Node.js**: v14.x or higher
- **NPM**: v6.x or higher
- **Memory**: Minimum 2GB RAM
- **Disk Space**: Minimum 500MB free space
- **Network**: Access to AEM Author instance

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/aem-mcp-server.git
cd aem-mcp-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root directory with the following configuration:

```
# Server Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# AEM Connection
AEM_HOST=https://your-aem-author.com
AEM_USERNAME=admin
AEM_PASSWORD=admin
AEM_TIMEOUT=30000

# Security
CORS_ORIGINS=http://localhost:3000,https://your-app-domain.com
AUTH_ENABLED=true
```

## Deployment Options

### Option 1: Direct Node.js Deployment

Start the server directly with Node.js:

```bash
npm start
```

For production environments, use a process manager like PM2:

```bash
npm install -g pm2
pm2 start npm --name "aem-mcp-server" -- start
pm2 save
```

### Option 2: Docker Deployment

Build and run the Docker container:

```bash
docker build -t aem-mcp-server .
docker run -p 3001:3001 --env-file .env aem-mcp-server
```

### Option 3: Cloud Deployment

#### AWS Elastic Beanstalk

1. Install the EB CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize EB application:
   ```bash
   eb init
   ```

3. Deploy:
   ```bash
   eb create aem-mcp-server-env
   ```

#### Azure App Service

1. Install Azure CLI:
   ```bash
   npm install -g azure-cli
   ```

2. Login to Azure:
   ```bash
   az login
   ```

3. Create App Service and deploy:
   ```bash
   az webapp up --name aem-mcp-server --location westus --sku F1
   ```

## Configuration Options

### Server Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| PORT | HTTP server port | 3001 |
| NODE_ENV | Environment (development, production) | development |
| LOG_LEVEL | Logging level (debug, info, warn, error) | info |

### AEM Connection

| Parameter | Description | Default |
|-----------|-------------|---------|
| AEM_HOST | AEM Author instance URL | http://localhost:4502 |
| AEM_USERNAME | AEM admin username | admin |
| AEM_PASSWORD | AEM admin password | admin |
| AEM_TIMEOUT | Request timeout in milliseconds | 30000 |

### Security Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| CORS_ORIGINS | Comma-separated list of allowed origins | * |
| AUTH_ENABLED | Enable/disable authentication | true |
| AUTH_TYPE | Authentication type (basic, token) | basic |

## Health Monitoring

The server provides a health endpoint at `/health` that returns the current status:

```json
{
  "status": "healthy",
  "timestamp": "2025-07-21T12:34:56.789Z",
  "uptime": 3600,
  "aem": {
    "connected": true,
    "responseTime": 245
  },
  "mcp": {
    "methodCount": 35,
    "lastMethodCall": "2025-07-21T12:30:00.000Z"
  },
  "system": {
    "memory": {
      "free": "1.2GB",
      "total": "8GB",
      "usage": "15%"
    },
    "cpu": "5%"
  }
}
```

## Troubleshooting

### Common Issues

#### Connection to AEM Failed

**Symptoms**: Server starts but health check shows AEM connection as `false`

**Solutions**:
1. Verify AEM host is accessible
2. Check AEM credentials
3. Ensure AEM instance is running
4. Check network connectivity and firewall settings

#### Method Execution Errors

**Symptoms**: Methods return error responses

**Solutions**:
1. Check AEM permissions for the configured user
2. Verify paths exist in AEM
3. Check request parameters
4. Review AEM error logs

#### Performance Issues

**Symptoms**: Slow response times or timeouts

**Solutions**:
1. Increase `AEM_TIMEOUT` value
2. Check AEM server performance
3. Optimize request parameters (limit, depth)
4. Consider scaling server resources

## Security Best Practices

1. **Use HTTPS**: Always deploy behind HTTPS in production
2. **Restrict CORS**: Set specific origins in `CORS_ORIGINS`
3. **Strong Credentials**: Use complex passwords for AEM
4. **Network Security**: Deploy in private network when possible
5. **Regular Updates**: Keep dependencies updated

## Dashboard Access

The dashboard is available at the root URL of the server (e.g., `http://localhost:3001`).

Default credentials:
- Username: admin
- Password: admin

## API Documentation

API documentation is available at `/api-docs` endpoint.

## Support and Maintenance

For support, please contact:
- Email: support@example.com
- Issue Tracker: https://github.com/your-org/aem-mcp-server/issues