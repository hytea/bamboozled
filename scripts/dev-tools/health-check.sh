#!/bin/bash
#
# Comprehensive Health Check Script
# Verifies all services are healthy and responding correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

MODE="${1:-local}"  # local or docker

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Health Check ($MODE mode)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

health_status=0

# Check HTTP endpoint
check_http() {
    local url=$1
    local name=$2
    local timeout=${3:-5}

    info "Checking $name..."

    response=$(curl -s -w "\n%{http_code}" --max-time $timeout "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        success "$name is healthy (HTTP $http_code)"
        return 0
    else
        error "$name is unhealthy (HTTP $http_code)"
        health_status=1
        return 1
    fi
}

# Check WebSocket
check_websocket() {
    local url=$1
    local name=$2

    info "Checking $name..."

    # Try to connect with timeout
    if timeout 5 bash -c "echo > /dev/tcp/localhost/3001" 2>/dev/null; then
        success "$name is accepting connections"
        return 0
    else
        error "$name is not accepting connections"
        health_status=1
        return 1
    fi
}

# Check database
check_database() {
    info "Checking database..."

    if [ -f "data/bamboozled.db" ]; then
        # Try to read database
        if command -v sqlite3 &> /dev/null; then
            if sqlite3 data/bamboozled.db "SELECT 1;" &>/dev/null; then
                success "Database is accessible and valid"

                # Check table count
                table_count=$(sqlite3 data/bamboozled.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
                info "Database has $table_count tables"

                return 0
            else
                error "Database file is corrupted"
                health_status=1
                return 1
            fi
        else
            warning "sqlite3 not installed, skipping database integrity check"
            success "Database file exists"
            return 0
        fi
    else
        error "Database file not found"
        health_status=1
        return 1
    fi
}

# Check Docker containers
check_docker() {
    info "Checking Docker containers..."

    if ! command -v docker &> /dev/null; then
        warning "Docker not installed"
        return 0
    fi

    # Check if containers are running
    backend_status=$(docker compose ps backend 2>/dev/null | grep -c "Up" || echo "0")
    frontend_status=$(docker compose ps frontend 2>/dev/null | grep -c "Up" || echo "0")

    if [ "$backend_status" -gt 0 ]; then
        success "Backend container is running"

        # Check container health
        backend_health=$(docker compose ps backend --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        if [ "$backend_health" = "healthy" ]; then
            success "Backend container is healthy"
        elif [ "$backend_health" = "starting" ]; then
            warning "Backend container is starting..."
        else
            warning "Backend container health: $backend_health"
        fi
    else
        error "Backend container is not running"
        health_status=1
    fi

    if [ "$frontend_status" -gt 0 ]; then
        success "Frontend container is running"

        # Check container health
        frontend_health=$(docker compose ps frontend --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        if [ "$frontend_health" = "healthy" ]; then
            success "Frontend container is healthy"
        elif [ "$frontend_health" = "starting" ]; then
            warning "Frontend container is starting..."
        else
            warning "Frontend container health: $frontend_health"
        fi
    else
        error "Frontend container is not running"
        health_status=1
    fi
}

# Backend API Health Checks
echo ""
echo -e "${BLUE}Backend API:${NC}"
check_http "http://localhost:3001/api/health" "Backend Health Endpoint" || true
check_http "http://localhost:3001/api/puzzles/current" "Current Puzzle Endpoint" || true

# Frontend Health Check
echo ""
echo -e "${BLUE}Frontend:${NC}"
check_http "http://localhost:3000" "Frontend" || true

# WebSocket Check
echo ""
echo -e "${BLUE}WebSocket:${NC}"
check_websocket "ws://localhost:3001" "WebSocket Server" || true

# Database Check
echo ""
echo -e "${BLUE}Database:${NC}"
check_database || true

# Docker Check (if in docker mode)
if [ "$MODE" = "docker" ]; then
    echo ""
    echo -e "${BLUE}Docker Containers:${NC}"
    check_docker || true
fi

# Environment Check
echo ""
echo -e "${BLUE}Environment:${NC}"
info "Checking environment configuration..."
if ./scripts/dev-tools/env-check.sh >/dev/null 2>&1; then
    success "Environment configuration is valid"
else
    warning "Some environment variables may be missing"
fi

# Disk Space Check
echo ""
echo -e "${BLUE}System Resources:${NC}"
info "Checking disk space..."
disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 90 ]; then
    success "Disk space is adequate ($disk_usage% used)"
else
    warning "Disk space is low ($disk_usage% used)"
fi

# Memory Check
info "Checking available memory..."
if command -v free &> /dev/null; then
    mem_available=$(free -m | awk 'NR==2 {print $7}')
    if [ "$mem_available" -gt 500 ]; then
        success "Available memory: ${mem_available}MB"
    else
        warning "Low available memory: ${mem_available}MB"
    fi
else
    info "Memory check not available on this system"
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $health_status -eq 0 ]; then
    success "All health checks passed!"
else
    error "Some health checks failed"
    info "Check the errors above and resolve any issues"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit $health_status
