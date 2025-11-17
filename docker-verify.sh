#!/bin/bash

# Docker Setup Verification Script for Bamboozled
# This script verifies that your Docker setup is ready to run

set -e

echo "🔍 Bamboozled Docker Setup Verification"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if we have any errors
ERRORS=0

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "1. Checking Prerequisites..."
echo "----------------------------"

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    success "Docker installed: $DOCKER_VERSION"
else
    error "Docker not found. Please install Docker Desktop or Docker Engine."
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    success "Docker Compose installed: $COMPOSE_VERSION"
elif docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    success "Docker Compose (plugin) installed: $COMPOSE_VERSION"
else
    error "Docker Compose not found. Please install Docker Compose."
fi

# Check if Docker is running
if docker info &> /dev/null; then
    success "Docker daemon is running"
else
    error "Docker daemon is not running. Please start Docker."
fi

echo ""
echo "2. Checking Required Files..."
echo "------------------------------"

# Check docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    success "docker-compose.yml exists"
else
    error "docker-compose.yml not found"
fi

# Check backend Dockerfile
if [ -f "backend/Dockerfile" ]; then
    success "backend/Dockerfile exists"
else
    error "backend/Dockerfile not found"
fi

# Check frontend Dockerfile
if [ -f "web-chat/Dockerfile" ]; then
    success "web-chat/Dockerfile exists"
else
    error "web-chat/Dockerfile not found"
fi

# Check nginx config
if [ -f "web-chat/nginx.conf" ]; then
    success "web-chat/nginx.conf exists"
else
    error "web-chat/nginx.conf not found"
fi

echo ""
echo "3. Checking Environment Configuration..."
echo "-----------------------------------------"

# Check .env file
if [ -f ".env" ]; then
    success ".env file exists"

    # Check if API key is configured
    if grep -q "AI_API_KEY=your-api-key-here" .env || grep -q "ANTHROPIC_API_KEY=your-anthropic-key" .env; then
        warning ".env contains placeholder API key - you need to add your actual API key"
        echo "   Edit .env and set either:"
        echo "   - AI_API_KEY=<your-key> (for any provider)"
        echo "   - ANTHROPIC_API_KEY=<your-key> (for Claude)"
        echo "   - OPENROUTER_API_KEY=<your-key> (for OpenRouter)"
    else
        success "API key appears to be configured"
    fi

    # Check AI provider
    if grep -q "^AI_PROVIDER=" .env; then
        AI_PROVIDER=$(grep "^AI_PROVIDER=" .env | cut -d'=' -f2)
        success "AI Provider set to: $AI_PROVIDER"
    else
        warning "AI_PROVIDER not set in .env"
    fi
else
    error ".env file not found"
    echo "   Run: cp .env.docker.example .env"
    echo "   Then edit .env and add your API key"
fi

echo ""
echo "4. Checking Data Directories..."
echo "--------------------------------"

# Check data directory
if [ -d "data" ]; then
    success "data/ directory exists"
else
    warning "data/ directory not found (will be created automatically)"
    mkdir -p data
    success "Created data/ directory"
fi

# Check puzzles directory
if [ -d "puzzles" ]; then
    success "puzzles/ directory exists"

    if [ -f "puzzles/puzzle-data.json" ]; then
        success "puzzles/puzzle-data.json exists"
    else
        error "puzzles/puzzle-data.json not found"
    fi

    if [ -d "puzzles/images" ]; then
        success "puzzles/images/ directory exists"
    else
        warning "puzzles/images/ directory not found (will be created)"
        mkdir -p puzzles/images
        success "Created puzzles/images/ directory"
    fi
else
    error "puzzles/ directory not found"
fi

echo ""
echo "5. Checking Port Availability..."
echo "---------------------------------"

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "Port 3000 is already in use"
    echo "   The frontend needs port 3000. Stop the process using it or modify docker-compose.yml"
else
    success "Port 3000 is available (frontend)"
fi

# Check if port 3001 is available
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "Port 3001 is already in use"
    echo "   The backend needs port 3001. Stop the process using it or modify docker-compose.yml"
else
    success "Port 3001 is available (backend)"
fi

echo ""
echo "========================================"
echo "Verification Complete!"
echo "========================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You're ready to start Docker containers:"
    echo "  docker-compose up --build"
    echo ""
    echo "Or run in background:"
    echo "  docker-compose up --build -d"
    echo ""
    echo "Then access:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:3001"
    echo "  Health:   http://localhost:3001/health"
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS error(s) that need to be fixed${NC}"
    echo ""
    echo "Please fix the errors above before starting Docker."
    echo "For help, see DOCKER.md or README.md"
    exit 1
fi
