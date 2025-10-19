# AEMaaCS MCP Servers Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for common issues encountered when deploying and operating the AEMaaCS MCP Servers.

## Quick Diagnostics

### Health Check Commands

```bash
# Check server health
curl -f http://localhost:3001/health
curl -f http://localhost:3002/health

# Check metrics
curl http://localhost:3001/metrics
curl http://localhost:3002/metrics

# Check logs
docker-compose logs -f read-server
docker-compose logs -f write-server

# Check service status
systemctl status aem-mcp-read-server
systemctl status aem-mcp-write-server
```

## Common Issues and Solutions

### 1. Connection Issues

#### Issue: Cannot connect to AEMaaCS instance

**Symptoms:**
- Connection timeout errors
- "ECONNREFUSED" errors
- Authentication failures

**Diagnosis:**
```bash
# Test network connectivity
ping your-aem-instance.adobeaemcloud.com
telnet your-aem-instance.adobeaemcloud.com 443

# Test AEM connectivity
curl -k https://your-aem-instance.adobeaemcloud.com/system/console/bundles.json
```

**Solutions:**

1. **Check Network Configuration**
   ```bash
   # Verify DNS resolution
   nslookup your-aem-instance.adobeaemcloud.com
   
   # Check firewall rules
   sudo ufw status
   sudo iptables -L
   ```

2. **Verify AEM Credentials**
   ```bash
   # Test authentication
   curl -u username:password https://your-aem-instance.adobeaemcloud.com/system/console/bundles.json
   ```

3. **Check Environment Variables**
   ```bash
   # Verify configuration
   echo $AEM_HOST
   echo $AEM_USERNAME
   echo $AEM_AUTH_TYPE
   ```

4. **Network Proxy Issues**
   ```bash
   # Configure proxy if needed
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   ```

#### Issue: SSL/TLS Certificate Errors

**Symptoms:**
- "CERT_HAS_EXPIRED" errors
- "UNABLE_TO_VERIFY_LEAF_SIGNATURE" errors
- SSL handshake failures

**Solutions:**

1. **Update Certificates**
   ```bash
   # Update Node.js certificates
   npm config set ca ""
   npm config set strict-ssl false
   ```

2. **Custom Certificate Authority**
   ```bash
   # Set custom CA
   export NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.crt
   ```

3. **Disable SSL Verification (Development Only)**
   ```bash
   # Add to environment variables
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

### 2. Authentication Issues

#### Issue: OAuth Authentication Failures

**Symptoms:**
- "Invalid client credentials" errors
- Token refresh failures
- "Unauthorized" responses

**Diagnosis:**
```bash
# Check OAuth configuration
echo $AEM_CLIENT_ID
echo $AEM_CLIENT_SECRET
echo $AEM_TOKEN_URL

# Test token endpoint
curl -X POST $AEM_TOKEN_URL \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$AEM_CLIENT_ID&client_secret=$AEM_CLIENT_SECRET"
```

**Solutions:**

1. **Verify OAuth Configuration**
   - Check client ID and secret
   - Verify token URL endpoint
   - Ensure proper OAuth scopes

2. **Token Refresh Issues**
   ```bash
   # Check token expiration
   # Tokens typically expire after 1 hour
   # Implement proper token refresh logic
   ```

3. **Service Account Issues**
   ```bash
   # Verify service account email
   echo $AEM_SERVICE_ACCOUNT_EMAIL
   
   # Check private key format
   cat $AEM_PRIVATE_KEY_PATH
   ```

#### Issue: API Key Authentication Failures

**Symptoms:**
- "Invalid API key" errors
- "Access denied" responses
- 401 Unauthorized errors

**Solutions:**

1. **Verify API Key Configuration**
   ```bash
   # Check API key in request headers
   curl -H "X-API-Key: your-api-key" http://localhost:3002/api/tools
   ```

2. **Check API Key Format**
   ```bash
   # API keys should be 32+ characters
   echo $API_KEY_SECRET | wc -c
   ```

3. **IP Allowlisting Issues**
   ```bash
   # Check allowed IPs configuration
   echo $ALLOWED_IPS
   
   # Verify client IP
   curl http://ipinfo.io/ip
   ```

### 3. Performance Issues

#### Issue: High Memory Usage

**Symptoms:**
- Out of memory errors
- Slow response times
- System instability

**Diagnosis:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js heap usage
curl http://localhost:3001/metrics | grep nodejs_heap_size
```

**Solutions:**

1. **Optimize Node.js Memory**
   ```bash
   # Increase heap size
   export NODE_OPTIONS="--max-old-space-size=4096"
   
   # Monitor garbage collection
   export NODE_OPTIONS="--max-old-space-size=4096 --trace-gc"
   ```

2. **Redis Memory Optimization**
   ```bash
   # Configure Redis memory limits
   redis-cli CONFIG SET maxmemory 512mb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

3. **Application Optimization**
   - Review caching strategies
   - Optimize database queries
   - Implement connection pooling

#### Issue: Slow Response Times

**Symptoms:**
- High latency
- Timeout errors
- Poor user experience

**Diagnosis:**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health

# Monitor metrics
curl http://localhost:3001/metrics | grep http_request_duration
```

**Solutions:**

1. **Enable Caching**
   ```bash
   # Configure Redis caching
   export REDIS_HOST=localhost
   export REDIS_PORT=6379
   export CACHE_ENABLED=true
   ```

2. **Optimize Database Connections**
   ```bash
   # Configure connection pooling
   export DB_POOL_MIN=5
   export DB_POOL_MAX=20
   ```

3. **Implement Circuit Breaker**
   ```bash
   # Enable circuit breaker
   export CIRCUIT_BREAKER_ENABLED=true
   export CIRCUIT_BREAKER_THRESHOLD=5
   ```

### 4. Redis Issues

#### Issue: Redis Connection Failures

**Symptoms:**
- "Redis connection failed" errors
- Cache miss issues
- Performance degradation

**Diagnosis:**
```bash
# Test Redis connectivity
redis-cli ping
redis-cli info

# Check Redis logs
docker logs redis-container
```

**Solutions:**

1. **Redis Configuration**
   ```bash
   # Check Redis configuration
   redis-cli CONFIG GET "*"
   
   # Restart Redis service
   sudo systemctl restart redis
   ```

2. **Connection Pool Issues**
   ```bash
   # Monitor Redis connections
   redis-cli CLIENT LIST
   
   # Check connection limits
   redis-cli CONFIG GET maxclients
   ```

3. **Memory Issues**
   ```bash
   # Check Redis memory usage
   redis-cli INFO memory
   
   # Clear cache if needed
   redis-cli FLUSHDB
   ```

### 5. Docker Issues

#### Issue: Container Startup Failures

**Symptoms:**
- Container exits immediately
- "Port already in use" errors
- Permission denied errors

**Solutions:**

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3001
   netstat -tulpn | grep :3002
   
   # Kill conflicting processes
   sudo fuser -k 3001/tcp
   sudo fuser -k 3002/tcp
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod +x packages/*/dist/index.js
   ```

3. **Environment Variable Issues**
   ```bash
   # Check environment variables in container
   docker exec -it container-name env
   
   # Verify .env file
   cat .env
   ```

#### Issue: Docker Build Failures

**Symptoms:**
- Build timeouts
- Dependency installation failures
- Image size issues

**Solutions:**

1. **Build Optimization**
   ```dockerfile
   # Use multi-stage builds
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   FROM node:18-alpine AS runtime
   WORKDIR /app
   COPY --from=builder /app/node_modules ./node_modules
   COPY . .
   ```

2. **Dependency Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Use npm ci for production builds
   npm ci --only=production
   ```

### 6. Kubernetes Issues

#### Issue: Pod Startup Failures

**Symptoms:**
- Pods stuck in Pending state
- CrashLoopBackOff errors
- Image pull failures

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -n aem-mcp-servers

# Check pod events
kubectl describe pod pod-name -n aem-mcp-servers

# Check pod logs
kubectl logs pod-name -n aem-mcp-servers
```

**Solutions:**

1. **Resource Constraints**
   ```bash
   # Check node resources
   kubectl top nodes
   kubectl describe nodes
   
   # Adjust resource requests/limits
   ```

2. **Image Pull Issues**
   ```bash
   # Check image pull secrets
   kubectl get secrets -n aem-mcp-servers
   
   # Verify image availability
   docker pull your-image:tag
   ```

3. **Configuration Issues**
   ```bash
   # Check ConfigMaps and Secrets
   kubectl get configmaps -n aem-mcp-servers
   kubectl get secrets -n aem-mcp-servers
   ```

### 7. Logging and Monitoring Issues

#### Issue: Missing or Incomplete Logs

**Symptoms:**
- No log output
- Incomplete log information
- Log format issues

**Solutions:**

1. **Log Configuration**
   ```bash
   # Check log level
   echo $LOG_LEVEL
   
   # Verify log format
   echo $LOG_FORMAT
   ```

2. **Log Rotation**
   ```bash
   # Configure logrotate
   sudo logrotate -f /etc/logrotate.conf
   ```

3. **Log Aggregation Issues**
   ```bash
   # Check logstash configuration
   # Verify Elasticsearch connectivity
   # Test log shipping
   ```

#### Issue: Metrics Collection Problems

**Symptoms:**
- Missing metrics
- Inaccurate metrics
- Prometheus scrape failures

**Solutions:**

1. **Metrics Endpoint Issues**
   ```bash
   # Test metrics endpoint
   curl http://localhost:3001/metrics
   
   # Check Prometheus configuration
   curl http://prometheus:9090/api/v1/targets
   ```

2. **Metric Format Issues**
   ```bash
   # Validate Prometheus format
   # Check metric naming conventions
   # Verify metric types
   ```

### 8. Security Issues

#### Issue: Rate Limiting Problems

**Symptoms:**
- Legitimate requests blocked
- Inconsistent rate limiting
- Performance impact

**Solutions:**

1. **Rate Limit Configuration**
   ```bash
   # Check rate limit settings
   echo $RATE_LIMIT_WINDOW_MS
   echo $RATE_LIMIT_MAX_REQUESTS
   ```

2. **Whitelist Configuration**
   ```bash
   # Add trusted IPs
   export ALLOWED_IPS="192.168.1.0/24,10.0.0.0/8"
   ```

#### Issue: Audit Logging Issues

**Symptoms:**
- Missing audit logs
- Incomplete audit information
- Log retention issues

**Solutions:**

1. **Audit Configuration**
   ```bash
   # Enable audit logging
   export AUDIT_LOG_ENABLED=true
   export AUDIT_LOG_LEVEL=info
   ```

2. **Log Retention**
   ```bash
   # Configure log retention policies
   # Implement log archival
   # Set up log rotation
   ```

## Diagnostic Tools

### 1. Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

echo "AEM MCP Servers Health Check"
echo "============================"

# Check read server
echo "Checking Read Server..."
if curl -f -s http://localhost:3001/health > /dev/null; then
    echo "✅ Read Server: Healthy"
else
    echo "❌ Read Server: Unhealthy"
fi

# Check write server
echo "Checking Write Server..."
if curl -f -s http://localhost:3002/health > /dev/null; then
    echo "✅ Write Server: Healthy"
else
    echo "❌ Write Server: Unhealthy"
fi

# Check Redis
echo "Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Unhealthy"
fi

# Check AEM connectivity
echo "Checking AEM Connectivity..."
if curl -f -s -u $AEM_USERNAME:$AEM_PASSWORD https://$AEM_HOST/system/console/bundles.json > /dev/null; then
    echo "✅ AEM: Connected"
else
    echo "❌ AEM: Connection Failed"
fi

echo "============================"
```

### 2. Performance Monitoring Script

Create `scripts/performance-check.sh`:

```bash
#!/bin/bash

echo "Performance Check"
echo "================="

# Check memory usage
echo "Memory Usage:"
free -h

# Check disk usage
echo "Disk Usage:"
df -h

# Check CPU usage
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)"

# Check network connections
echo "Network Connections:"
netstat -tulpn | grep -E ":(3001|3002)"

# Check process status
echo "Process Status:"
ps aux | grep -E "(read-server|write-server)" | grep -v grep

echo "================="
```

### 3. Log Analysis Script

Create `scripts/log-analysis.sh`:

```bash
#!/bin/bash

echo "Log Analysis"
echo "============"

# Check for errors in logs
echo "Recent Errors:"
grep -i "error\|exception\|failed" logs/*.log | tail -20

# Check for warnings
echo "Recent Warnings:"
grep -i "warn\|warning" logs/*.log | tail -20

# Check request patterns
echo "Request Patterns:"
grep "HTTP" logs/*.log | tail -10

# Check authentication issues
echo "Authentication Issues:"
grep -i "auth\|unauthorized\|forbidden" logs/*.log | tail -10

echo "============"
```

## Emergency Procedures

### 1. Service Recovery

```bash
# Stop all services
docker-compose down
sudo systemctl stop aem-mcp-read-server
sudo systemctl stop aem-mcp-write-server

# Clear caches
redis-cli FLUSHALL

# Restart services
docker-compose up -d
sudo systemctl start aem-mcp-read-server
sudo systemctl start aem-mcp-write-server
```

### 2. Data Recovery

```bash
# Restore Redis data
redis-cli --pipe < redis-backup.rdb

# Restore configuration
tar -xzf config-backup.tar.gz

# Restart services
docker-compose restart
```

### 3. Rollback Procedure

```bash
# Rollback to previous version
git checkout previous-stable-tag

# Rebuild and redeploy
docker-compose build
docker-compose up -d

# Verify deployment
./scripts/health-check.sh
```

## Prevention and Best Practices

### 1. Regular Monitoring

- Set up automated health checks
- Monitor key metrics and alerts
- Review logs regularly
- Perform capacity planning

### 2. Backup Strategy

- Regular configuration backups
- Database backup schedules
- Disaster recovery testing
- Document recovery procedures

### 3. Security Maintenance

- Regular security updates
- Vulnerability scanning
- Access review and rotation
- Audit log monitoring

### 4. Performance Optimization

- Regular performance testing
- Capacity monitoring
- Resource optimization
- Cache tuning

## Getting Help

### 1. Documentation

- Check this troubleshooting guide
- Review API documentation
- Consult deployment guides
- Read release notes

### 2. Community Support

- GitHub Issues for bug reports
- Discord server for community help
- Stack Overflow for technical questions
- Developer forums for discussions

### 3. Professional Support

- Enterprise support options
- Consulting services
- Training programs
- Custom development

## Conclusion

This troubleshooting guide covers the most common issues encountered with the AEMaaCS MCP Servers. For issues not covered here, please:

1. Check the logs for detailed error information
2. Review the configuration settings
3. Test with minimal configurations
4. Contact the support team with detailed information

Remember to always test solutions in a development environment before applying them to production systems.