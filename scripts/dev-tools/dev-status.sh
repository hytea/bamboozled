#!/bin/bash
#
# Development Environment Status Check
# Shows the status of all services and development tools

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║         🎮 Bamboozled Status Dashboard 🎮         ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check process status
check_process() {
    local process_name=$1
    local friendly_name=$2

    if pgrep -f "$process_name" > /dev/null; then
        success "$friendly_name is running"
        return 0
    else
        error "$friendly_name is not running"
        return 1
    fi
}

# Check port status
check_port() {
    local port=$1
    local service_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || nc -z localhost $port 2>/dev/null; then
        success "$service_name (port $port) is listening"
        return 0
    else
        error "$service_name (port $port) is not listening"
        return 1
    fi
}

# Check URL status
check_url() {
    local url=$1
    local service_name=$2

    if curl -s -f -o /dev/null "$url" 2>/dev/null; then
        success "$service_name is responding"
        return 0
    else
        error "$service_name is not responding"
        return 1
    fi
}

# Local Development Services
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Local Development Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

check_port 3001 "Backend API" || info "Start with: cd backend && npm run dev"
check_port 3000 "Frontend Dev Server" || info "Start with: cd web-chat && npm run dev"

# Docker Services
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Docker Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if command -v docker &> /dev/null; then
    if docker compose ps 2>/dev/null | grep -q "Up"; then
        success "Docker Compose services are running"
        echo ""
        docker compose ps
    else
        info "Docker Compose services are not running"
        info "Start with: make docker-up"
    fi
else
    warning "Docker is not installed"
fi

# Database Status
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Database Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "data/bamboozled.db" ]; then
    success "Database file exists"

    # Show database size
    db_size=$(du -h data/bamboozled.db | cut -f1)
    info "Database size: $db_size"

    # Check last modification
    last_modified=$(stat -c %y data/bamboozled.db 2>/dev/null || stat -f "%Sm" data/bamboozled.db 2>/dev/null || echo "unknown")
    info "Last modified: $last_modified"
else
    error "Database file not found"
    info "Initialize with: make db-init"
fi

# Git Status
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Git Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

current_branch=$(git branch --show-current)
info "Current branch: $current_branch"

# Check for uncommitted changes
if git diff-index --quiet HEAD -- 2>/dev/null; then
    success "Working directory is clean"
else
    warning "You have uncommitted changes"
fi

# Check for unpushed commits
unpushed=$(git log @{u}.. --oneline 2>/dev/null | wc -l || echo 0)
if [ "$unpushed" -gt 0 ]; then
    warning "You have $unpushed unpushed commit(s)"
else
    success "All commits are pushed"
fi

# Environment Configuration
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Environment Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "backend/.env" ]; then
    success "backend/.env exists"

    # Source and check AI provider
    source backend/.env 2>/dev/null || true
    if [ -n "$AI_PROVIDER" ]; then
        info "AI Provider: $AI_PROVIDER"
    fi
else
    error "backend/.env not found"
    info "Copy from: backend/.env.example"
fi

# Dependencies
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Dependencies${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -d "backend/node_modules" ]; then
    success "Backend dependencies installed"
else
    error "Backend dependencies missing"
    info "Install with: cd backend && npm install"
fi

if [ -d "web-chat/node_modules" ]; then
    success "Frontend dependencies installed"
else
    error "Frontend dependencies missing"
    info "Install with: cd web-chat && npm install"
fi

# Build artifacts
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Build Artifacts${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -d "backend/dist" ]; then
    success "Backend build exists"
else
    warning "Backend not built"
    info "Build with: make build-backend"
fi

if [ -d "web-chat/dist" ]; then
    success "Frontend build exists"
else
    warning "Frontend not built"
    info "Build with: make build-frontend"
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Quick Actions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  make dev          - Start development servers"
echo "  make dev-docker   - Start with Docker"
echo "  make test         - Run all tests"
echo "  make health       - Run health checks"
echo "  make help         - Show all commands"
echo ""
