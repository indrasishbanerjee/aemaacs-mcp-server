# AEM MCP Servers Setup Guide

## Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Access to an AEMaaCS instance
- Valid AEM credentials

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd aemaacs-mcp-servers
npm install
```

### 2. Build the Project

```bash
npm run build
```

## Configuration

### Environment Variables

Create environment files for each server:

```bash
cp config/read-server.example.env .env.read
cp config/write-server.example.env .env.write
```

### Required Configuration

#### AEM Connection

```bash
# AEM Instance
AEM_HOST=author.aemaacs.example.com
AEM_PORT=443
AEM_PROTOCOL=https

# Authentication (choose one method)
# Method 1: Basic Authentication
AEM_USERNAME=your-username
AEM_PASSWORD=your-password

# Method 2: OAuth 2.0
AEM_CLIENT_ID=your-client-id
AEM_CLIENT_SECRET=your-client-secret

# Method 3: Access Token
AEM_ACCESS_TOKEN=your-access-token
```

#### Server Configuration

```bash
# Read Server
READ_SERVER_PORT=3001
READ_SERVER_HOST=0.0.0.0

# Write Server
WRITE_SERVER_PORT=3002
WRITE_SERVER_HOST=0.0.0.0
```

#### Security (Write Server)

```bash
# API Keys (required for write operations)
API_KEYS=your-api-key-1,your-api-key-2

# IP Allowlisting (optional)
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8

# Dangerous Operations
ALLOW_DANGEROUS_OPERATIONS=false
```

### Optional Configuration

#### Logging

```bash
LOG_LEVEL=info          # debug, info, warn, error
LOG_FORMAT=json         # json, text
LOG_FILE=/var/log/aem-server.log
```

#### CORS

```bash
CORS_ENABLED=true
CORS_ORIGINS=*          # Use specific origins in production
```

#### Rate Limiting

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Caching (Read Server)

```bash
CACHE_ENABLED=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000
```

## Running the Servers

### Development Mode

```bash
# Read Server
npm run dev:read

# Write Server
npm run dev:write

# Both servers
npm run dev
```

### Production Mode

```bash
# Build first
npm run build

# Read Server
npm run start:read

# Write Server
npm run start:write

# Both servers
npm start
```

### MCP Protocol Mode

For AI assistants and MCP clients:

```bash
# Read Server (STDIO)
npm run start:read:stdio

# Write Server (STDIO)
npm run start:write:stdio
```

## Docker Deployment

### Using Docker Compose

1. **Create environment file:**

```bash
cp .env.example .env
```

2. **Configure environment variables:**

```bash
# Edit .env with your AEM connection details
AEM_HOST=author.aemaacs.example.com
AEM_USERNAME=your-username
AEM_PASSWORD=your-password
API_KEYS=your-secure-api-key
```

3. **Start services:**

```bash
docker-compose up -d
```

4. **View logs:**

```bash
docker-compose logs -f
```

5. **Stop services:**

```bash
docker-compose down
```

### Individual Docker Containers

```bash
# Build images
docker build -f packages/read-server/Dockerfile -t aem-read-server .
docker build -f packages/write-server/Dockerfile -t aem-write-server .

# Run containers
docker run -d -p 3001:3001 --env-file .env.read aem-read-server
docker run -d -p 3002:3002 --env-file .env.write aem-write-server
```

## Testing the Setup

### Health Checks

```bash
# Read Server
curl http://localhost:3001/health

# Write Server
curl http://localhost:3002/health
```

### API Test

```bash
# List available tools (Read Server)
curl http://localhost:3001/api/tools

# List available tools (Write Server with API key)
curl -H "X-API-Key: your-api-key" http://localhost:3002/api/tools
```

### MCP Test

```bash
# Test MCP protocol (Read Server)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npm run start:read:stdio

# Test MCP protocol (Write Server)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npm run start:write:stdio
```

## Troubleshooting

### Common Issues

#### Connection Errors

**Problem:** Cannot connect to AEM instance

**Solutions:**
1. Verify AEM_HOST, AEM_PORT, and AEM_PROTOCOL
2. Check network connectivity
3. Verify AEM instance is running
4. Check firewall settings

#### Authentication Errors

**Problem:** 401 Unauthorized responses

**Solutions:**
1. Verify credentials are correct
2. Check if user has necessary permissions
3. For OAuth, verify client ID and secret
4. For access tokens, check token validity

#### Permission Errors

**Problem:** 403 Forbidden responses

**Solutions:**
1. Verify user has required AEM permissions
2. Check group memberships
3. Review ACL configurations
4. Ensure user is not disabled

#### Rate Limiting

**Problem:** 429 Too Many Requests

**Solutions:**
1. Reduce request frequency
2. Increase rate limit configuration
3. Use different API keys for different clients
4. Implement client-side rate limiting

### Debug Mode

Enable debug logging for troubleshooting:

```bash
LOG_LEVEL=debug npm run start:read
```

### Log Analysis

Check server logs for detailed error information:

```bash
# Docker logs
docker-compose logs aemaacs-mcp-read-server
docker-compose logs aemaacs-mcp-write-server

# Local logs (if LOG_FILE is configured)
tail -f /var/log/aem-server.log
```

## Security Considerations

### Production Deployment

1. **Use HTTPS:** Always use HTTPS in production
2. **Secure API Keys:** Use strong, unique API keys
3. **IP Allowlisting:** Restrict access to known IP addresses
4. **Regular Updates:** Keep dependencies updated
5. **Monitor Logs:** Set up log monitoring and alerting
6. **Backup Configuration:** Backup environment files securely

### Network Security

1. **Firewall Rules:** Configure appropriate firewall rules
2. **VPN Access:** Consider VPN for additional security
3. **Load Balancer:** Use load balancer with SSL termination
4. **Rate Limiting:** Configure appropriate rate limits

### AEM Security

1. **Least Privilege:** Use service accounts with minimal permissions
2. **Regular Rotation:** Rotate credentials regularly
3. **Audit Logging:** Enable AEM audit logging
4. **Security Patches:** Keep AEM updated with security patches

## Performance Tuning

### Read Server Optimization

```bash
# Enable caching
CACHE_ENABLED=true
CACHE_TTL=600
CACHE_MAX_SIZE=5000

# Adjust connection settings
AEM_TIMEOUT=30000
AEM_RETRY_ATTEMPTS=3
```

### Write Server Optimization

```bash
# Adjust rate limits based on load
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=60000

# Enable strict validation for better performance
VALIDATION_STRICT=true
```

### System Resources

- **Memory:** Minimum 512MB RAM per server
- **CPU:** 1 CPU core per server recommended
- **Network:** Low latency connection to AEM instance
- **Storage:** Minimal storage requirements for logs

## Monitoring

### Health Endpoints

Both servers provide health endpoints:

- Read Server: `GET /health`
- Write Server: `GET /health`

### Metrics

Monitor these key metrics:

- Response times
- Error rates
- Request volumes
- Memory usage
- CPU usage
- Connection pool status

### Alerting

Set up alerts for:

- Server downtime
- High error rates
- Authentication failures
- Rate limit violations
- Resource exhaustion