# Production Deployment Guide

## Overview

This guide covers deploying AEMaaCS MCP Servers in production environments with proper security, monitoring, and high availability.

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ or CentOS 8+ recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 50GB+ SSD
- **Network**: Stable internet connection with access to AEMaaCS

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl
- jq (for health checks)

### AEMaaCS Requirements

- Service Account with appropriate permissions
- JWT credentials configured
- Network access to AEMaaCS instance

## Quick Production Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply group changes
```

### 2. Application Deployment

```bash
# Clone repository
git clone <repository-url>
cd aemaacs-mcp-servers

# Configure environment
cp .env.example .env
nano .env  # Edit with your configuration

# Deploy with monitoring
./scripts/deploy.sh -e production -p -m
```

### 3. SSL Configuration

```bash
# Configure domain in .env
echo "DOMAIN=your-domain.com" >> .env
echo "ACME_EMAIL=admin@your-domain.com" >> .env

# Restart with SSL
docker-compose -f docker-compose.prod.yml restart
```

## Detailed Configuration

### Environment Variables

Critical production settings in `.env`:

```bash
# Production environment
NODE_ENV=production

# AEM Connection
AEM_HOST=https://your-instance.adobeaemcloud.com
AEM_CLIENT_ID=your-service-account-client-id
AEM_CLIENT_SECRET=your-service-account-secret
AEM_TECHNICAL_ACCOUNT_ID=your-technical-account@techacct.adobe.com
AEM_ORGANIZATION_ID=your-org@AdobeOrg
AEM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Security
API_KEY=your-very-secure-api-key-min-32-chars
ALLOWED_IPS=your.server.ip.address,10.0.0.0/8

# SSL
DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com

# Monitoring
GRAFANA_PASSWORD=secure-grafana-password
REDIS_PASSWORD=secure-redis-password
```

### Security Hardening

#### 1. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Or iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

#### 2. SSL/TLS Configuration

The deployment automatically configures Let's Encrypt SSL certificates via Traefik.

#### 3. API Key Security

```bash
# Generate secure API key
openssl rand -base64 32

# Store in environment
echo "API_KEY=$(openssl rand -base64 32)" >> .env
```

#### 4. Network Security

- Use private networks for internal communication
- Implement IP allowlisting for write operations
- Enable audit logging for all write operations

### High Availability Setup

#### 1. Load Balancer Configuration

```yaml
# docker-compose.ha.yml
version: '3.8'

services:
  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - aem-read-server-1
      - aem-read-server-2
      - aem-write-server-1
      - aem-write-server-2

  aem-read-server-1:
    # ... read server config
    
  aem-read-server-2:
    # ... read server config
    
  aem-write-server-1:
    # ... write server config
    
  aem-write-server-2:
    # ... write server config
```

#### 2. Database Clustering

For audit logs and session storage:

```yaml
postgres-primary:
  image: postgres:14
  environment:
    POSTGRES_REPLICATION_MODE: master
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: replication_password

postgres-replica:
  image: postgres:14
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: postgres-primary
```

## Monitoring and Alerting

### 1. Prometheus Configuration

The deployment includes Prometheus for metrics collection:

- **Metrics endpoint**: `http://localhost:9090`
- **Targets**: Both AEM servers, system metrics, container metrics
- **Retention**: 200 hours (configurable)

### 2. Grafana Dashboards

Pre-configured dashboards for:

- Server performance metrics
- AEM operation metrics
- Error rates and response times
- System resource utilization

Access: `https://grafana.your-domain.com`

### 3. AlertManager Rules

Configured alerts for:

- Server downtime
- High error rates
- Resource exhaustion
- AEM connection failures

### 4. Log Aggregation

Loki collects logs from all containers:

- Application logs
- Access logs
- Error logs
- Audit logs

## Backup and Recovery

### 1. Automated Backups

```bash
# Create backup script
cat > /etc/cron.daily/aem-mcp-backup << 'EOF'
#!/bin/bash
cd /opt/aemaacs-mcp-servers
./scripts/deploy.sh -B
find ./backups -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x /etc/cron.daily/aem-mcp-backup
```

### 2. Database Backups

```bash
# PostgreSQL backup
docker exec postgres pg_dump -U aem_user aem_mcp_audit > backup_$(date +%Y%m%d).sql

# Redis backup
docker exec redis redis-cli BGSAVE
```

### 3. Recovery Procedures

```bash
# Restore from backup
cd /opt/aemaacs-mcp-servers
./scripts/deploy.sh -e production --restore-from backups/20231201_120000
```

## Performance Optimization

### 1. Resource Limits

```yaml
# docker-compose.prod.yml
services:
  aem-read-server:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### 2. Caching Strategy

- Redis for session storage and caching
- HTTP caching headers for static content
- Connection pooling for AEM connections

### 3. Database Optimization

```sql
-- PostgreSQL optimization
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

## Maintenance Procedures

### 1. Regular Updates

```bash
# Update containers
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update application
git pull origin main
./scripts/deploy.sh -e production -b
```

### 2. Health Checks

```bash
# Automated health check
./scripts/health-check.sh

# Manual verification
curl -f https://aem-read.your-domain.com/health
curl -f https://aem-write.your-domain.com/health
```

### 3. Log Rotation

```bash
# Configure logrotate
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF
```

## Troubleshooting

### Common Issues

#### 1. SSL Certificate Issues

```bash
# Check certificate status
docker-compose logs traefik | grep -i cert

# Force certificate renewal
docker-compose exec traefik traefik version
```

#### 2. AEM Connection Issues

```bash
# Check AEM connectivity
docker-compose exec aem-read-server curl -I $AEM_HOST

# Verify credentials
docker-compose logs aem-read-server | grep -i auth
```

#### 3. Performance Issues

```bash
# Check resource usage
docker stats

# Check system resources
htop
df -h
```

### Log Analysis

```bash
# Application logs
docker-compose logs -f aem-read-server
docker-compose logs -f aem-write-server

# System logs
journalctl -u docker
tail -f /var/log/syslog
```

## Security Checklist

- [ ] SSL/TLS certificates configured and auto-renewing
- [ ] Strong API keys generated and stored securely
- [ ] IP allowlisting configured for write operations
- [ ] Firewall rules implemented
- [ ] Audit logging enabled
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Access logs monitored
- [ ] Vulnerability scanning implemented

## Scaling Considerations

### Horizontal Scaling

- Deploy multiple instances behind load balancer
- Use shared Redis for session storage
- Implement database clustering for audit logs

### Vertical Scaling

- Increase container resource limits
- Optimize JVM settings for Node.js
- Tune database parameters

### Auto-scaling

```yaml
# Docker Swarm example
version: '3.8'
services:
  aem-read-server:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

## Support and Maintenance

### Monitoring Dashboards

- **Grafana**: System and application metrics
- **Prometheus**: Metrics collection and alerting
- **Loki**: Log aggregation and analysis

### Health Check Endpoints

- Read Server: `https://aem-read.your-domain.com/health`
- Write Server: `https://aem-write.your-domain.com/health`
- Prometheus: `https://prometheus.your-domain.com/-/healthy`

### Emergency Procedures

1. **Service Outage**: Check health endpoints, restart services
2. **High Load**: Scale horizontally, check resource limits
3. **Security Incident**: Review audit logs, rotate API keys
4. **Data Loss**: Restore from backup, verify data integrity

For additional support, refer to the troubleshooting guide and check the application logs for detailed error information.