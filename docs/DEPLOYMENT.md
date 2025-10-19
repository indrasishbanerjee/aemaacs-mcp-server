# AEMaaCS MCP Servers Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the AEMaaCS MCP Servers in various environments, from development to production.

## Prerequisites

### System Requirements

- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 8+ or yarn 1.22+
- **Memory**: Minimum 2GB RAM (4GB+ recommended for production)
- **Storage**: Minimum 1GB free space
- **Network**: Access to AEMaaCS instance

### AEMaaCS Requirements

- AEMaaCS instance with appropriate permissions
- Service account or user credentials with required permissions
- Network connectivity from deployment environment

## Environment Configuration

### 1. Environment Variables

Create a `.env` file in the project root with the following configuration:

```bash
# AEM Configuration
AEM_HOST=your-aem-instance.adobeaemcloud.com
AEM_AUTH_TYPE=basic
AEM_USERNAME=your-username
AEM_PASSWORD=your-password

# For OAuth Authentication
# AEM_AUTH_TYPE=oauth
# AEM_CLIENT_ID=your-client-id
# AEM_CLIENT_SECRET=your-client-secret
# AEM_TOKEN_URL=https://your-aem-instance.adobeaemcloud.com/oauth/token

# For Service Account Authentication
# AEM_AUTH_TYPE=service-account
# AEM_SERVICE_ACCOUNT_EMAIL=your-service-account@domain.com
# AEM_PRIVATE_KEY_PATH=/path/to/private-key.pem
# AEM_PRIVATE_KEY=your-private-key-content

# Server Configuration
READ_SERVER_PORT=3001
WRITE_SERVER_PORT=3002
NODE_ENV=production

# Security Configuration
API_KEY_SECRET=your-secure-api-key-secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
AUDIT_LOG_ENABLED=true

# Monitoring Configuration
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
CIRCUIT_BREAKER_ENABLED=true
```

### 2. Security Configuration

#### API Key Management

Generate secure API keys for write operations:

```bash
# Generate API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### IP Allowlisting

Configure IP allowlisting in your environment:

```bash
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### 1. Build Docker Images

```bash
# Build all images
docker-compose build

# Or build specific services
docker-compose build read-server
docker-compose build write-server
```

#### 2. Configure Docker Compose

Create or update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  read-server:
    build:
      context: .
      dockerfile: packages/read-server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - AEM_HOST=${AEM_HOST}
      - AEM_AUTH_TYPE=${AEM_AUTH_TYPE}
      - AEM_USERNAME=${AEM_USERNAME}
      - AEM_PASSWORD=${AEM_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  write-server:
    build:
      context: .
      dockerfile: packages/write-server/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - AEM_HOST=${AEM_HOST}
      - AEM_AUTH_TYPE=${AEM_AUTH_TYPE}
      - AEM_USERNAME=${AEM_USERNAME}
      - AEM_PASSWORD=${AEM_PASSWORD}
      - API_KEY_SECRET=${API_KEY_SECRET}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
```

#### 3. Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services if needed
docker-compose up -d --scale read-server=2 --scale write-server=2
```

### Option 2: Kubernetes Deployment

#### 1. Create Kubernetes Manifests

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aem-mcp-servers
```

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aem-mcp-config
  namespace: aem-mcp-servers
data:
  AEM_HOST: "your-aem-instance.adobeaemcloud.com"
  AEM_AUTH_TYPE: "basic"
  NODE_ENV: "production"
  READ_SERVER_PORT: "3001"
  WRITE_SERVER_PORT: "3002"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

Create `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aem-mcp-secrets
  namespace: aem-mcp-servers
type: Opaque
data:
  AEM_USERNAME: <base64-encoded-username>
  AEM_PASSWORD: <base64-encoded-password>
  API_KEY_SECRET: <base64-encoded-api-key>
```

Create `k8s/redis-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: aem-mcp-servers
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: aem-mcp-servers
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

Create `k8s/read-server-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: read-server
  namespace: aem-mcp-servers
spec:
  replicas: 2
  selector:
    matchLabels:
      app: read-server
  template:
    metadata:
      labels:
        app: read-server
    spec:
      containers:
      - name: read-server
        image: aem-mcp-read-server:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: aem-mcp-config
        - secretRef:
            name: aem-mcp-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: read-server-service
  namespace: aem-mcp-servers
spec:
  selector:
    app: read-server
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

Create `k8s/write-server-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: write-server
  namespace: aem-mcp-servers
spec:
  replicas: 2
  selector:
    matchLabels:
      app: write-server
  template:
    metadata:
      labels:
        app: write-server
    spec:
      containers:
      - name: write-server
        image: aem-mcp-write-server:latest
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: aem-mcp-config
        - secretRef:
            name: aem-mcp-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: write-server-service
  namespace: aem-mcp-servers
spec:
  selector:
    app: write-server
  ports:
  - port: 80
    targetPort: 3002
  type: ClusterIP
```

#### 2. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n aem-mcp-servers

# View logs
kubectl logs -f deployment/read-server -n aem-mcp-servers
kubectl logs -f deployment/write-server -n aem-mcp-servers
```

### Option 3: Direct Node.js Deployment

#### 1. Install Dependencies

```bash
# Install dependencies
npm ci --production

# Build packages
npm run build
```

#### 2. Create Systemd Services

Create `/etc/systemd/system/aem-mcp-read-server.service`:

```ini
[Unit]
Description=AEMaaCS MCP Read Server
After=network.target

[Service]
Type=simple
User=aem-mcp
WorkingDirectory=/opt/aem-mcp-servers
ExecStart=/usr/bin/node packages/read-server/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/aem-mcp-servers/.env

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/aem-mcp-write-server.service`:

```ini
[Unit]
Description=AEMaaCS MCP Write Server
After=network.target

[Service]
Type=simple
User=aem-mcp
WorkingDirectory=/opt/aem-mcp-servers
ExecStart=/usr/bin/node packages/write-server/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/aem-mcp-servers/.env

[Install]
WantedBy=multi-user.target
```

#### 3. Start Services

```bash
# Enable and start services
sudo systemctl enable aem-mcp-read-server
sudo systemctl enable aem-mcp-write-server
sudo systemctl start aem-mcp-read-server
sudo systemctl start aem-mcp-write-server

# Check status
sudo systemctl status aem-mcp-read-server
sudo systemctl status aem-mcp-write-server
```

## Load Balancing and High Availability

### Nginx Configuration

Create `/etc/nginx/sites-available/aem-mcp-servers`:

```nginx
upstream read_server {
    server localhost:3001;
    server localhost:3003;
    server localhost:3005;
}

upstream write_server {
    server localhost:3002;
    server localhost:3004;
    server localhost:3006;
}

server {
    listen 80;
    server_name your-domain.com;

    location /read/ {
        proxy_pass http://read_server/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }

    location /write/ {
        proxy_pass http://write_server/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API Key validation
        proxy_set_header X-API-Key $http_x_api_key;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### HAProxy Configuration

Create `/etc/haproxy/haproxy.cfg`:

```haproxy
global
    daemon
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend aem_mcp_frontend
    bind *:80
    default_backend aem_mcp_backend

backend aem_mcp_backend
    balance roundrobin
    option httpchk GET /health
    
    # Read servers
    server read1 localhost:3001 check
    server read2 localhost:3003 check
    server read3 localhost:3005 check
    
    # Write servers
    server write1 localhost:3002 check
    server write2 localhost:3004 check
    server write3 localhost:3006 check

listen stats
    bind *:8080
    stats enable
    stats uri /stats
    stats refresh 30s
```

## Monitoring and Observability

### Prometheus Configuration

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'aem-mcp-servers'
    static_configs:
      - targets: ['localhost:3001', 'localhost:3002']
    metrics_path: /metrics
    scrape_interval: 30s
```

### Grafana Dashboard

Import the provided Grafana dashboard configuration to monitor:

- Request rates and response times
- Error rates and types
- Circuit breaker status
- Cache hit/miss ratios
- AEM connectivity status
- System resource usage

### Log Aggregation

Configure log aggregation with ELK stack or similar:

```yaml
# Logstash configuration
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "aem-mcp-read-server" {
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "aem-mcp-servers-%{+YYYY.MM.dd}"
  }
}
```

## Security Considerations

### 1. Network Security

- Use HTTPS/TLS in production
- Implement proper firewall rules
- Use VPN or private networks for AEM connectivity
- Enable IP allowlisting

### 2. Authentication and Authorization

- Use strong API keys with proper rotation
- Implement proper RBAC for different operations
- Enable audit logging for compliance
- Use OAuth or Service Account authentication

### 3. Data Protection

- Encrypt sensitive data at rest
- Use secure communication protocols
- Implement proper input validation
- Enable rate limiting and DDoS protection

## Backup and Recovery

### 1. Configuration Backup

```bash
# Backup configuration
tar -czf aem-mcp-config-backup-$(date +%Y%m%d).tar.gz .env docker-compose.yml k8s/
```

### 2. Redis Backup

```bash
# Backup Redis data
redis-cli --rdb /backup/redis-backup-$(date +%Y%m%d).rdb
```

### 3. Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Frequency**: Daily
4. **Recovery Procedures**: Documented and tested

## Performance Tuning

### 1. Node.js Optimization

```bash
# Set optimal Node.js options
export NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=128"
```

### 2. Redis Optimization

```bash
# Redis configuration
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### 3. Load Testing

```bash
# Run load tests
npm run test:load

# Monitor performance metrics
curl http://localhost:3001/metrics
curl http://localhost:3002/metrics
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check network connectivity
   - Verify AEM credentials
   - Review firewall rules

2. **High Memory Usage**
   - Monitor memory leaks
   - Adjust Node.js heap size
   - Review caching configuration

3. **Performance Issues**
   - Check Redis connectivity
   - Monitor circuit breaker status
   - Review rate limiting settings

### Health Checks

```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Check metrics
curl http://localhost:3001/metrics
curl http://localhost:3002/metrics

# Check logs
docker-compose logs -f read-server
docker-compose logs -f write-server
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review logs and metrics
2. **Monthly**: Update dependencies
3. **Quarterly**: Security audit and penetration testing
4. **Annually**: Disaster recovery testing

### Updates and Patches

```bash
# Update dependencies
npm update

# Rebuild and redeploy
docker-compose build
docker-compose up -d

# Verify deployment
npm run test:health
```

## Support and Documentation

- **API Documentation**: [API.md](API.md)
- **MCP Tools Reference**: [MCP_TOOLS.md](MCP_TOOLS.md)
- **Troubleshooting Guide**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **GitHub Issues**: Report bugs and feature requests
- **Community Support**: Join our Discord server

## Conclusion

This deployment guide provides comprehensive instructions for deploying the AEMaaCS MCP Servers in various environments. Follow the security best practices, monitor your deployment, and maintain regular backups to ensure reliable operation.

For additional support or questions, please refer to the troubleshooting guide or contact the development team.