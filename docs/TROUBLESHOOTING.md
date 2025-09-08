# AEM MCP Servers Troubleshooting Guide

## Common Issues and Solutions

### Connection Issues

#### Cannot Connect to AEM Instance

**Symptoms:**
- Connection timeout errors
- "ECONNREFUSED" errors
- Network unreachable errors

**Diagnosis:**
```bash
# Test network connectivity
ping your-aem-host.com

# Test port connectivity
telnet your-aem-host.com 443

# Check DNS resolution
nslookup your-aem-host.com
```

**Solutions:**
1. Verify AEM instance is running and accessible
2. Check firewall rules and network policies
3. Verify AEM_HOST, AEM_PORT, and AEM_PROTOCOL settings
4. Test with curl:
   ```bash
   curl -I https://your-aem-host.com/system/health
   ```

#### SSL/TLS Certificate Issues

**Symptoms:**
- "CERT_UNTRUSTED" errors
- SSL handshake failures
- Certificate validation errors

**Solutions:**
1. For development, you can disable SSL verification (NOT for production):
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```
2. Add custom CA certificates to Node.js
3. Use proper SSL certificates in production
4. Check certificate expiration dates

### Authentication Issues

#### 401 Unauthorized Errors

**Symptoms:**
- Authentication failed messages
- Invalid credentials errors
- Token expired errors

**Diagnosis:**
```bash
# Test basic auth
curl -u username:password https://your-aem-host.com/system/health

# Test with access token
curl -H "Authorization: Bearer your-token" https://your-aem-host.com/system/health
```

**Solutions:**
1. Verify credentials are correct
2. Check if user account is active and not locked
3. For OAuth, verify client credentials and token validity
4. Check AEM user permissions
5. Verify authentication method configuration

#### 403 Forbidden Errors

**Symptoms:**
- Permission denied messages
- Access forbidden errors
- Insufficient privileges errors

**Solutions:**
1. Check user group memberships in AEM
2. Verify ACL permissions for requested resources
3. Ensure user has necessary AEM permissions:
   - Read operations: `jcr:read`
   - Write operations: `jcr:write`, `jcr:modifyProperties`
   - Admin operations: `jcr:all`
4. Check if user is member of required groups (e.g., `administrators`)

### Server Startup Issues

#### Port Already in Use

**Symptoms:**
- "EADDRINUSE" errors
- Port binding failures

**Solutions:**
1. Check what's using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   
   # Linux/Mac
   lsof -i :3001
   ```
2. Change server port in configuration
3. Stop conflicting services
4. Use different ports for read and write servers

#### Missing Dependencies

**Symptoms:**
- Module not found errors
- Import/require failures

**Solutions:**
1. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Check Node.js version compatibility
3. Rebuild native modules:
   ```bash
   npm rebuild
   ```

#### Configuration Errors

**Symptoms:**
- Invalid configuration errors
- Missing required environment variables

**Solutions:**
1. Validate environment file syntax
2. Check for required variables:
   ```bash
   # Required for both servers
   AEM_HOST=your-host
   
   # Required for write server
   API_KEYS=your-keys
   ```
3. Use configuration validation:
   ```bash
   npm run validate-config
   ```

### Runtime Issues

#### Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Out of memory errors
- Slow performance

**Diagnosis:**
```bash
# Monitor memory usage
top -p $(pgrep -f "aem-.*-server")

# Node.js memory profiling
node --inspect packages/read-server/dist/index.js
```

**Solutions:**
1. Restart servers periodically
2. Implement proper cleanup in event handlers
3. Monitor and limit cache sizes
4. Use memory profiling tools to identify leaks

#### High CPU Usage

**Symptoms:**
- Server becomes unresponsive
- High CPU utilization
- Slow response times

**Solutions:**
1. Check for infinite loops in code
2. Optimize database queries
3. Implement proper rate limiting
4. Use clustering for load distribution
5. Profile CPU usage to identify bottlenecks

#### Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests errors
- Requests being rejected

**Solutions:**
1. Increase rate limits in configuration:
   ```bash
   RATE_LIMIT_MAX_REQUESTS=200
   RATE_LIMIT_WINDOW_MS=60000
   ```
2. Implement client-side rate limiting
3. Use multiple API keys for different clients
4. Optimize request patterns to reduce frequency

### API Issues

#### Tool Execution Failures

**Symptoms:**
- Tool execution errors
- Invalid parameter errors
- Unexpected results

**Diagnosis:**
1. Check tool parameters against schema
2. Verify AEM permissions for the operation
3. Check AEM logs for server-side errors
4. Test with minimal parameters first

**Solutions:**
1. Validate input parameters
2. Check tool documentation for required parameters
3. Verify user has necessary AEM permissions
4. Test with AEM's native APIs directly

#### MCP Protocol Issues

**Symptoms:**
- STDIO communication failures
- JSON-RPC parsing errors
- Protocol version mismatches

**Solutions:**
1. Verify JSON-RPC 2.0 format:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/list",
     "id": 1
   }
   ```
2. Check for proper line endings in STDIO mode
3. Verify MCP client compatibility
4. Test with simple tools first

### Docker Issues

#### Container Startup Failures

**Symptoms:**
- Container exits immediately
- Health check failures
- Port binding issues

**Diagnosis:**
```bash
# Check container logs
docker-compose logs aemaacs-mcp-read-server

# Check container status
docker-compose ps

# Inspect container
docker inspect container-name
```

**Solutions:**
1. Check environment variable configuration
2. Verify port mappings in docker-compose.yml
3. Ensure proper file permissions
4. Check Docker resource limits

#### Network Connectivity in Docker

**Symptoms:**
- Cannot reach AEM from container
- DNS resolution failures
- Network timeouts

**Solutions:**
1. Use proper network configuration in docker-compose.yml
2. Check Docker network settings:
   ```bash
   docker network ls
   docker network inspect aemaacs-network
   ```
3. Use host networking for testing:
   ```yaml
   network_mode: host
   ```
4. Configure DNS servers if needed

### Performance Issues

#### Slow Response Times

**Symptoms:**
- High latency
- Timeouts
- Poor user experience

**Diagnosis:**
1. Check network latency to AEM:
   ```bash
   ping your-aem-host.com
   ```
2. Monitor server metrics
3. Check AEM performance
4. Analyze request patterns

**Solutions:**
1. Enable caching for read operations:
   ```bash
   CACHE_ENABLED=true
   CACHE_TTL=300
   ```
2. Optimize AEM queries
3. Use connection pooling
4. Implement request batching
5. Add CDN for static content

#### Database Connection Issues

**Symptoms:**
- Connection pool exhaustion
- Database timeouts
- Connection refused errors

**Solutions:**
1. Increase connection pool size
2. Implement proper connection cleanup
3. Use connection health checks
4. Monitor database performance
5. Implement retry logic with exponential backoff

## Debugging Techniques

### Enable Debug Logging

```bash
# Set debug log level
LOG_LEVEL=debug

# Enable specific debug categories
DEBUG=aem:*,mcp:*

# Start server with debug output
npm run dev:read
```

### Log Analysis

```bash
# Follow logs in real-time
tail -f logs/aem-read-server.log

# Search for specific errors
grep -i "error" logs/aem-read-server.log

# Analyze request patterns
grep "HTTP" logs/aem-read-server.log | awk '{print $4}' | sort | uniq -c
```

### Network Debugging

```bash
# Capture network traffic
tcpdump -i any -w aem-traffic.pcap host your-aem-host.com

# Analyze with Wireshark
wireshark aem-traffic.pcap

# Test with curl verbose mode
curl -v -H "X-API-Key: your-key" http://localhost:3001/api/tools
```

### Memory Debugging

```bash
# Generate heap dump
kill -USR2 $(pgrep -f "aem-read-server")

# Analyze with Node.js tools
node --inspect-brk packages/read-server/dist/index.js

# Use clinic.js for profiling
npx clinic doctor -- node packages/read-server/dist/index.js
```

## Getting Help

### Log Collection

When reporting issues, collect these logs:

1. **Server logs:**
   ```bash
   # Application logs
   cat logs/aem-read-server.log
   cat logs/aem-write-server.log
   
   # System logs (Linux)
   journalctl -u aem-mcp-servers
   
   # Docker logs
   docker-compose logs
   ```

2. **Configuration:**
   ```bash
   # Environment variables (sanitized)
   env | grep -E "^(AEM|READ|WRITE|LOG)" | sed 's/PASSWORD=.*/PASSWORD=***/'
   ```

3. **System information:**
   ```bash
   # Node.js version
   node --version
   npm --version
   
   # System info
   uname -a
   
   # Memory and CPU
   free -h
   top -n 1
   ```

### Support Channels

1. **GitHub Issues:** Report bugs and feature requests
2. **Documentation:** Check API and setup documentation
3. **Community:** Join community discussions
4. **Enterprise Support:** Contact for enterprise support options

### Before Reporting Issues

1. **Check existing issues** in the GitHub repository
2. **Verify configuration** against documentation
3. **Test with minimal setup** to isolate the problem
4. **Collect relevant logs** and error messages
5. **Provide reproduction steps** if possible

### Issue Template

When reporting issues, include:

```
**Environment:**
- OS: [e.g., Ubuntu 20.04]
- Node.js version: [e.g., 18.17.0]
- Server version: [e.g., 1.0.0]
- AEM version: [e.g., AEMaaCS]

**Configuration:**
- Authentication method: [basic/oauth/token]
- Server mode: [HTTP/MCP]
- Docker: [yes/no]

**Issue Description:**
[Clear description of the problem]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Third step]

**Expected Behavior:**
[What you expected to happen]

**Actual Behavior:**
[What actually happened]

**Logs:**
[Relevant log entries]

**Additional Context:**
[Any other relevant information]
```