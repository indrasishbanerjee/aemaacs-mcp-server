# AEMaaCS MCP Servers Operations Runbook

## Overview

This runbook provides operational procedures for managing and maintaining the AEMaaCS MCP Servers in production environments.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Tasks](#monthly-tasks)
4. [Incident Response](#incident-response)
5. [Deployment Procedures](#deployment-procedures)
6. [Backup and Recovery](#backup-and-recovery)
7. [Performance Monitoring](#performance-monitoring)
8. [Security Operations](#security-operations)

## Daily Operations

### 1. Health Checks

#### Automated Health Checks

The system performs automated health checks every 5 minutes:

```bash
# Check health status
curl -f http://localhost:3001/health
curl -f http://localhost:3002/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "components": {
    "aem": "healthy",
    "redis": "healthy",
    "config": "healthy",
    "memory": "healthy",
    "disk": "healthy"
  }
}
```

#### Manual Health Verification

```bash
# Run comprehensive health check
./scripts/health-check.sh

# Check specific components
curl http://localhost:3001/health/detailed
curl http://localhost:3002/health/detailed
```

### 2. Log Review

#### Check for Errors

```bash
# Check for critical errors
grep -i "error\|exception\|failed" logs/*.log | tail -20

# Check for authentication issues
grep -i "auth\|unauthorized" logs/*.log | tail -10

# Check for performance issues
grep -i "timeout\|slow" logs/*.log | tail -10
```

#### Log Rotation Check

```bash
# Verify log rotation is working
ls -la logs/
du -sh logs/

# Check logrotate status
sudo logrotate -d /etc/logrotate.d/aem-mcp-servers
```

### 3. Performance Monitoring

#### Resource Usage

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check disk usage
df -h
du -sh /var/log/aem-mcp-servers/

# Check CPU usage
top -bn1 | grep "Cpu(s)"
```

#### Service Metrics

```bash
# Check Prometheus metrics
curl http://localhost:3001/metrics | grep -E "(http_requests_total|response_time)"

# Check Redis metrics
redis-cli info memory
redis-cli info stats
```

### 4. Security Monitoring

#### Authentication Logs

```bash
# Check authentication attempts
grep "authentication" logs/*.log | tail -20

# Check API key usage
grep "api-key" logs/*.log | tail -20

# Check rate limiting
grep "rate-limit" logs/*.log | tail -10
```

#### Audit Log Review

```bash
# Review audit logs
grep "audit" logs/audit.log | tail -20

# Check for suspicious activity
grep -i "suspicious\|anomaly" logs/*.log | tail -10
```

## Weekly Maintenance

### 1. System Updates

#### Security Updates

```bash
# Check for available updates
sudo apt update
sudo apt list --upgradable

# Apply security updates
sudo apt upgrade -y

# Restart services if needed
sudo systemctl restart aem-mcp-read-server
sudo systemctl restart aem-mcp-write-server
```

#### Application Updates

```bash
# Check for new releases
git fetch --tags
git tag -l | tail -10

# Review release notes
# Apply updates in staging first
```

### 2. Performance Analysis

#### Resource Usage Trends

```bash
# Generate weekly performance report
./scripts/performance-report.sh --period=7d

# Check for resource leaks
./scripts/memory-analysis.sh

# Analyze response times
./scripts/response-time-analysis.sh
```

#### Capacity Planning

```bash
# Check growth trends
./scripts/capacity-analysis.sh

# Review scaling requirements
kubectl top nodes
kubectl top pods -n aem-mcp-servers
```

### 3. Backup Verification

#### Backup Integrity Check

```bash
# Verify backup integrity
./scripts/verify-backups.sh

# Test restore procedures
./scripts/test-restore.sh --dry-run

# Check backup retention
./scripts/backup-retention-check.sh
```

### 4. Security Review

#### Vulnerability Assessment

```bash
# Run security scan
./scripts/security-scan.sh

# Check for known vulnerabilities
npm audit
docker scan aem-mcp-read-server:latest
docker scan aem-mcp-write-server:latest
```

#### Access Review

```bash
# Review user access
./scripts/access-review.sh

# Check API key rotation
./scripts/api-key-rotation-check.sh

# Review audit logs
./scripts/audit-review.sh
```

## Monthly Tasks

### 1. Comprehensive System Review

#### Performance Analysis

```bash
# Generate monthly performance report
./scripts/monthly-performance-report.sh

# Analyze trends and patterns
./scripts/trend-analysis.sh --period=30d

# Review capacity planning
./scripts/capacity-planning-review.sh
```

#### Security Assessment

```bash
# Comprehensive security review
./scripts/security-assessment.sh

# Penetration testing (if applicable)
./scripts/penetration-test.sh

# Review compliance requirements
./scripts/compliance-check.sh
```

### 2. Maintenance Tasks

#### Database Maintenance

```bash
# Redis maintenance
redis-cli BGREWRITEAOF
redis-cli BGSAVE

# Check Redis memory usage
redis-cli MEMORY USAGE key-name
```

#### Log Management

```bash
# Archive old logs
./scripts/archive-logs.sh --older-than=30d

# Clean up temporary files
./scripts/cleanup-temp-files.sh

# Review log retention policies
./scripts/log-retention-review.sh
```

### 3. Documentation Updates

#### Update Runbooks

- Review and update operational procedures
- Update troubleshooting guides
- Revise deployment procedures

#### Knowledge Transfer

- Conduct team training sessions
- Update operational documentation
- Review incident response procedures

## Incident Response

### 1. Incident Classification

#### Severity Levels

- **Critical (P1)**: Service completely down, data loss
- **High (P2)**: Significant functionality impacted
- **Medium (P3)**: Minor functionality impacted
- **Low (P4)**: Cosmetic issues, workarounds available

### 2. Response Procedures

#### P1 - Critical Incidents

```bash
# Immediate response
1. Assess impact and notify stakeholders
2. Implement immediate workarounds
3. Escalate to on-call engineer
4. Begin incident response process

# Investigation steps
./scripts/incident-investigation.sh --severity=P1

# Recovery steps
./scripts/emergency-recovery.sh
```

#### P2 - High Priority Incidents

```bash
# Response within 1 hour
1. Notify team lead
2. Begin investigation
3. Implement temporary fixes
4. Document findings

# Investigation steps
./scripts/incident-investigation.sh --severity=P2
```

### 3. Post-Incident Review

#### Incident Analysis

```bash
# Generate incident report
./scripts/incident-report.sh --incident-id=INC-2024-001

# Root cause analysis
./scripts/root-cause-analysis.sh

# Lessons learned documentation
./scripts/lessons-learned.sh
```

## Deployment Procedures

### 1. Staging Deployment

#### Pre-deployment Checks

```bash
# Verify staging environment
./scripts/pre-deployment-check.sh --environment=staging

# Run integration tests
npm run test:integration

# Performance testing
./scripts/performance-test.sh --environment=staging
```

#### Deployment Process

```bash
# Deploy to staging
./scripts/deploy.sh --environment=staging --version=1.2.0

# Verify deployment
./scripts/post-deployment-verification.sh --environment=staging

# Monitor for issues
./scripts/monitor-deployment.sh --environment=staging
```

### 2. Production Deployment

#### Pre-deployment Checklist

- [ ] Staging deployment successful
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Rollback plan prepared
- [ ] Team notified

#### Deployment Process

```bash
# Create deployment branch
git checkout -b release/1.2.0

# Deploy to production
./scripts/deploy.sh --environment=production --version=1.2.0

# Verify deployment
./scripts/post-deployment-verification.sh --environment=production

# Monitor deployment
./scripts/monitor-deployment.sh --environment=production --duration=1h
```

#### Post-deployment Tasks

```bash
# Update monitoring dashboards
./scripts/update-dashboards.sh

# Notify stakeholders
./scripts/notify-deployment.sh --version=1.2.0

# Update documentation
./scripts/update-documentation.sh --version=1.2.0
```

### 3. Rollback Procedures

#### Emergency Rollback

```bash
# Immediate rollback
./scripts/emergency-rollback.sh --to-version=1.1.0

# Verify rollback
./scripts/verify-rollback.sh

# Notify stakeholders
./scripts/notify-rollback.sh --reason="Critical issue detected"
```

#### Planned Rollback

```bash
# Planned rollback
./scripts/planned-rollback.sh --to-version=1.1.0

# Post-rollback verification
./scripts/post-rollback-verification.sh

# Incident documentation
./scripts/document-rollback.sh
```

## Backup and Recovery

### 1. Backup Procedures

#### Daily Backups

```bash
# Configuration backup
./scripts/backup-config.sh

# Redis backup
./scripts/backup-redis.sh

# Log backup
./scripts/backup-logs.sh
```

#### Weekly Backups

```bash
# Full system backup
./scripts/full-backup.sh

# Database backup
./scripts/backup-database.sh

# Application backup
./scripts/backup-application.sh
```

### 2. Recovery Procedures

#### Configuration Recovery

```bash
# Restore configuration
./scripts/restore-config.sh --backup-date=2024-01-15

# Verify configuration
./scripts/verify-config.sh

# Restart services
sudo systemctl restart aem-mcp-read-server
sudo systemctl restart aem-mcp-write-server
```

#### Data Recovery

```bash
# Restore Redis data
./scripts/restore-redis.sh --backup-date=2024-01-15

# Verify data integrity
./scripts/verify-data-integrity.sh

# Test application functionality
./scripts/test-application.sh
```

## Performance Monitoring

### 1. Key Metrics

#### System Metrics

- CPU usage
- Memory usage
- Disk I/O
- Network I/O

#### Application Metrics

- Response times
- Throughput
- Error rates
- Cache hit rates

#### Business Metrics

- Active users
- Request volumes
- Feature usage
- Performance trends

### 2. Monitoring Tools

#### Prometheus Metrics

```bash
# Check metrics endpoint
curl http://localhost:3001/metrics

# Query specific metrics
curl "http://localhost:9090/api/v1/query?query=up"
```

#### Grafana Dashboards

- System overview dashboard
- Application performance dashboard
- Business metrics dashboard
- Alerting dashboard

### 3. Alerting

#### Alert Rules

```yaml
# High error rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: High error rate detected

# High response time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: High response time detected
```

## Security Operations

### 1. Security Monitoring

#### Authentication Monitoring

```bash
# Monitor authentication attempts
./scripts/monitor-auth.sh

# Check for brute force attacks
./scripts/check-brute-force.sh

# Review failed login attempts
./scripts/review-failed-logins.sh
```

#### Access Control

```bash
# Review user permissions
./scripts/review-permissions.sh

# Check API key usage
./scripts/check-api-keys.sh

# Validate IP allowlisting
./scripts/validate-ip-allowlist.sh
```

### 2. Security Maintenance

#### Regular Updates

```bash
# Security patch management
./scripts/security-patches.sh

# Dependency updates
npm audit fix

# Container security scanning
./scripts/container-scan.sh
```

#### Compliance Checks

```bash
# Compliance verification
./scripts/compliance-check.sh

# Security policy enforcement
./scripts/enforce-security-policies.sh

# Audit trail verification
./scripts/verify-audit-trail.sh
```

## Emergency Contacts

### 1. On-Call Rotation

- **Primary**: [Primary On-Call Engineer]
- **Secondary**: [Secondary On-Call Engineer]
- **Escalation**: [Team Lead]

### 2. External Contacts

- **AEM Support**: [AEM Support Contact]
- **Infrastructure Team**: [Infrastructure Team Contact]
- **Security Team**: [Security Team Contact]

### 3. Escalation Procedures

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: Director of Engineering

## Conclusion

This runbook provides comprehensive operational procedures for managing the AEMaaCS MCP Servers. Regular review and updates of these procedures ensure effective operations and incident response.

For questions or updates to this runbook, please contact the operations team or create a pull request with the proposed changes.
