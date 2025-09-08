#!/bin/bash

# Health Check Script for AEMaaCS MCP Servers
# This script checks the health of all deployed services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
READ_SERVER_URL="http://localhost:3001"
WRITE_SERVER_URL="http://localhost:3002"
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3000"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to check HTTP endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    print_status "Checking $name at $url"
    
    if response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null); then
        if [[ "$response" == "$expected_status" ]]; then
            print_success "$name is healthy (HTTP $response)"
            return 0
        else
            print_error "$name returned HTTP $response (expected $expected_status)"
            return 1
        fi
    else
        print_error "$name is not responding"
        return 1
    fi
}

# Function to check JSON endpoint
check_json_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    
    print_status "Checking $name JSON response at $url"
    
    if response=$(curl -s "$url" 2>/dev/null); then
        if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
            print_success "$name JSON response is valid"
            return 0
        else
            print_error "$name JSON response is invalid or missing field: $expected_field"
            return 1
        fi
    else
        print_error "$name JSON endpoint is not responding"
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local container_name=$1
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
        print_success "Container $container_name is running"
        return 0
    else
        print_error "Container $container_name is not running"
        return 1
    fi
}

# Function to check Docker container health
check_container_health() {
    local container_name=$1
    
    if health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null); then
        case "$health_status" in
            "healthy")
                print_success "Container $container_name is healthy"
                return 0
                ;;
            "unhealthy")
                print_error "Container $container_name is unhealthy"
                return 1
                ;;
            "starting")
                print_warning "Container $container_name is starting"
                return 1
                ;;
            *)
                print_warning "Container $container_name health status: $health_status"
                return 1
                ;;
        esac
    else
        print_warning "Container $container_name not found or no health check configured"
        return 1
    fi
}

# Main health check function
main() {
    echo "========================================"
    echo "AEMaaCS MCP Servers Health Check"
    echo "========================================"
    echo
    
    local overall_status=0
    
    # Check Docker containers
    print_status "Checking Docker containers..."
    
    containers=("aemaacs-mcp-servers-aem-read-server-1" "aemaacs-mcp-servers-aem-write-server-1")
    
    for container in "${containers[@]}"; do
        if ! check_container "$container"; then
            overall_status=1
        fi
        
        if ! check_container_health "$container"; then
            overall_status=1
        fi
    done
    
    echo
    
    # Check service endpoints
    print_status "Checking service endpoints..."
    
    if ! check_endpoint "Read Server Health" "$READ_SERVER_URL/health"; then
        overall_status=1
    fi
    
    if ! check_endpoint "Write Server Health" "$WRITE_SERVER_URL/health"; then
        overall_status=1
    fi
    
    if ! check_json_endpoint "Read Server Tools" "$READ_SERVER_URL/api/tools" "tools"; then
        overall_status=1
    fi
    
    if ! check_json_endpoint "Write Server Tools" "$WRITE_SERVER_URL/api/tools" "tools"; then
        overall_status=1
    fi
    
    echo
    
    # Check monitoring endpoints (if available)
    print_status "Checking monitoring endpoints..."
    
    if check_endpoint "Prometheus" "$PROMETHEUS_URL/-/healthy" 200; then
        print_success "Monitoring stack is available"
    else
        print_warning "Monitoring stack is not available (this is optional)"
    fi
    
    if check_endpoint "Grafana" "$GRAFANA_URL/api/health" 200; then
        print_success "Grafana is available"
    else
        print_warning "Grafana is not available (this is optional)"
    fi
    
    echo
    
    # Check system resources
    print_status "Checking system resources..."
    
    # Check disk space
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 80 ]]; then
        print_error "Disk usage is high: ${disk_usage}%"
        overall_status=1
    else
        print_success "Disk usage is normal: ${disk_usage}%"
    fi
    
    # Check memory usage
    if command -v free > /dev/null; then
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [[ $memory_usage -gt 80 ]]; then
            print_warning "Memory usage is high: ${memory_usage}%"
        else
            print_success "Memory usage is normal: ${memory_usage}%"
        fi
    fi
    
    echo
    
    # Summary
    if [[ $overall_status -eq 0 ]]; then
        print_success "All health checks passed!"
        echo
        print_status "Service URLs:"
        echo "  Read Server:  $READ_SERVER_URL"
        echo "  Write Server: $WRITE_SERVER_URL"
        echo "  Prometheus:   $PROMETHEUS_URL"
        echo "  Grafana:      $GRAFANA_URL"
    else
        print_error "Some health checks failed!"
        echo
        print_status "To troubleshoot:"
        echo "  - Check service logs: docker-compose logs -f"
        echo "  - Check container status: docker ps"
        echo "  - Check system resources: df -h && free -h"
        echo "  - Restart services: docker-compose restart"
    fi
    
    echo
    return $overall_status
}

# Run health check
main "$@"