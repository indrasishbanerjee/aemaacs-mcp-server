#!/bin/bash

# AEMaaCS MCP Servers Deployment Script
# This script handles deployment of the servers in various environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
COMPOSE_FILE="docker-compose.yml"
BUILD_IMAGES=false
PULL_IMAGES=false
MONITORING=false
BACKUP=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy AEMaaCS MCP Servers

OPTIONS:
    -e, --environment ENV    Deployment environment (development|staging|production)
    -b, --build             Build Docker images locally
    -p, --pull              Pull latest images from registry
    -m, --monitoring        Include monitoring stack
    -B, --backup            Create backup before deployment
    -h, --help              Show this help message

EXAMPLES:
    $0 -e development
    $0 -e production -p -m
    $0 -e staging -b -B

ENVIRONMENTS:
    development: Local development with hot reload
    staging:     Staging environment with SSL
    production:  Production environment with full monitoring

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build)
            BUILD_IMAGES=true
            shift
            ;;
        -p|--pull)
            PULL_IMAGES=true
            shift
            ;;
        -m|--monitoring)
            MONITORING=true
            shift
            ;;
        -B|--backup)
            BACKUP=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    development|staging|production)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_error "Valid environments: development, staging, production"
        exit 1
        ;;
esac

print_status "Starting deployment for environment: $ENVIRONMENT"

# Set compose file based on environment
case $ENVIRONMENT in
    development)
        COMPOSE_FILE="docker-compose.yml"
        ;;
    staging|production)
        COMPOSE_FILE="docker-compose.prod.yml"
        ;;
esac

# Check if required files exist
if [[ ! -f "$COMPOSE_FILE" ]]; then
    print_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

if [[ ! -f ".env" ]]; then
    print_warning ".env file not found. Creating from .env.example"
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before continuing"
        exit 1
    else
        print_error ".env.example file not found"
        exit 1
    fi
fi

# Create backup if requested
if [[ "$BACKUP" == true ]]; then
    print_status "Creating backup..."
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup volumes
    docker run --rm -v aemaacs-mcp-servers_redis-data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf /backup/redis-data.tar.gz -C /data .
    
    # Backup configuration
    cp .env "$BACKUP_DIR/"
    cp "$COMPOSE_FILE" "$BACKUP_DIR/"
    
    print_success "Backup created in $BACKUP_DIR"
fi

# Build images if requested
if [[ "$BUILD_IMAGES" == true ]]; then
    print_status "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build
    print_success "Images built successfully"
fi

# Pull images if requested
if [[ "$PULL_IMAGES" == true ]]; then
    print_status "Pulling Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    print_success "Images pulled successfully"
fi

# Create network if it doesn't exist
if ! docker network ls | grep -q aem-network; then
    print_status "Creating Docker network..."
    docker network create aem-network
fi

# Deploy the services
print_status "Deploying services..."

COMPOSE_FILES="-f $COMPOSE_FILE"

if [[ "$MONITORING" == true ]]; then
    if [[ -f "docker-compose.monitoring.yml" ]]; then
        COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.monitoring.yml"
        print_status "Including monitoring stack"
    else
        print_warning "Monitoring compose file not found, skipping monitoring"
    fi
fi

# Stop existing services
print_status "Stopping existing services..."
docker-compose $COMPOSE_FILES down

# Start services
print_status "Starting services..."
docker-compose $COMPOSE_FILES up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        print_status "Waiting for $service_name to be healthy (attempt $attempt/$max_attempts)..."
        sleep 5
        ((attempt++))
    done
    
    print_error "$service_name failed to become healthy"
    return 1
}

# Check read server health
if check_service_health "Read Server" "http://localhost:3001/health"; then
    print_success "Read Server deployed successfully"
else
    print_error "Read Server deployment failed"
    exit 1
fi

# Check write server health
if check_service_health "Write Server" "http://localhost:3002/health"; then
    print_success "Write Server deployed successfully"
else
    print_error "Write Server deployment failed"
    exit 1
fi

# Show deployment summary
print_success "Deployment completed successfully!"
echo
print_status "Service URLs:"
echo "  Read Server:  http://localhost:3001"
echo "  Write Server: http://localhost:3002"

if [[ "$MONITORING" == true ]]; then
    echo "  Prometheus:   http://localhost:9090"
    echo "  Grafana:      http://localhost:3000"
    echo "  AlertManager: http://localhost:9093"
fi

echo
print_status "To view logs:"
echo "  docker-compose $COMPOSE_FILES logs -f"
echo
print_status "To stop services:"
echo "  docker-compose $COMPOSE_FILES down"
echo

# Show next steps based on environment
case $ENVIRONMENT in
    development)
        print_status "Development environment ready!"
        print_status "You can now test the servers using the API documentation."
        ;;
    staging)
        print_status "Staging environment deployed!"
        print_status "Remember to configure DNS and SSL certificates for production use."
        ;;
    production)
        print_status "Production environment deployed!"
        print_warning "Make sure to:"
        echo "  - Configure proper SSL certificates"
        echo "  - Set up monitoring alerts"
        echo "  - Configure backup schedules"
        echo "  - Review security settings"
        echo "  - Set up log rotation"
        ;;
esac