#!/bin/bash
#
# Complete Bamboozled Development Environment Setup
# This script sets up everything needed for local development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    header "Checking Prerequisites"

    local all_good=true

    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node -v)
        success "Node.js installed: $node_version"

        # Check if version is >= 20
        local major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$major_version" -lt 20 ]; then
            warning "Node.js version should be >= 20.x (found $node_version)"
        fi
    else
        error "Node.js is not installed"
        all_good=false
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        success "npm installed: $(npm -v)"
    else
        error "npm is not installed"
        all_good=false
    fi

    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        success "Docker installed: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
    else
        warning "Docker not found (optional, needed for containerized development)"
    fi

    # Check git
    if command -v git &> /dev/null; then
        success "Git installed: $(git --version | cut -d' ' -f3)"
    else
        error "Git is not installed"
        all_good=false
    fi

    if [ "$all_good" = false ]; then
        error "Some prerequisites are missing. Please install them and try again."
        exit 1
    fi

    success "All prerequisites satisfied"
}

# Install dependencies
install_dependencies() {
    header "Installing Dependencies"

    info "Installing root dependencies..."
    npm install

    info "Installing backend dependencies..."
    cd backend
    npm install
    cd ..

    info "Installing frontend dependencies..."
    cd web-chat
    npm install
    cd ..

    info "Installing infrastructure dependencies..."
    cd infrastructure
    npm install
    cd ..

    success "All dependencies installed"
}

# Setup environment files
setup_environment() {
    header "Setting Up Environment Configuration"

    # Backend .env
    if [ ! -f "backend/.env" ]; then
        info "Creating backend/.env from template..."
        cp backend/.env.example backend/.env
        warning "Please edit backend/.env with your actual API keys"
        success "Created backend/.env"
    else
        info "backend/.env already exists"
    fi

    # Docker .env
    if [ ! -f ".env" ]; then
        info "Creating .env for Docker from template..."
        if [ -f ".env.docker.example" ]; then
            cp .env.docker.example .env
            success "Created .env for Docker"
        fi
    else
        info ".env already exists"
    fi

    # Validate environment
    info "Validating environment configuration..."
    ./scripts/dev-tools/env-check.sh || warning "Some environment variables are not set"
}

# Initialize database
setup_database() {
    header "Setting Up Database"

    # Create data directory
    mkdir -p data

    info "Initializing database..."
    cd backend
    npm run db:init
    cd ..

    # Ask if user wants to seed
    read -p "Would you like to seed the database with sample data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Seeding database with realistic data..."
        cd backend
        npm run db:seed
        cd ..
        success "Database seeded"
    fi

    success "Database setup complete"
}

# Install Git hooks
setup_git_hooks() {
    header "Setting Up Git Hooks"

    info "Installing pre-commit hooks..."
    ./scripts/dev-tools/install-hooks.sh

    success "Git hooks installed"
}

# Create necessary directories
create_directories() {
    header "Creating Project Directories"

    mkdir -p data
    mkdir -p logs
    mkdir -p backups
    mkdir -p backend/coverage
    mkdir -p web-chat/coverage

    success "Directories created"
}

# Verify setup
verify_setup() {
    header "Verifying Setup"

    info "Running build check..."
    cd backend
    npm run build
    cd ..

    cd web-chat
    npm run build
    cd ..

    success "Builds successful"

    info "Running quick test..."
    cd backend
    npm test -- --run --reporter=verbose 2>&1 | head -n 20 || true
    cd ..

    success "Setup verification complete"
}

# Print next steps
print_next_steps() {
    header "Setup Complete! 🎉"

    echo ""
    echo -e "${GREEN}Your Bamboozled development environment is ready!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo ""
    echo "  1. Configure your API keys in backend/.env"
    echo "     - Add your ANTHROPIC_API_KEY or other AI provider keys"
    echo ""
    echo "  2. Start development servers:"
    echo -e "     ${YELLOW}make dev${NC}           - Start backend + frontend"
    echo -e "     ${YELLOW}make dev-docker${NC}    - Start with Docker"
    echo ""
    echo "  3. Open your browser:"
    echo "     - Frontend: http://localhost:3000"
    echo "     - Backend:  http://localhost:3001"
    echo ""
    echo "  4. Useful commands:"
    echo -e "     ${YELLOW}make help${NC}          - Show all available commands"
    echo -e "     ${YELLOW}make status${NC}        - Check service status"
    echo -e "     ${YELLOW}make health${NC}        - Run health checks"
    echo -e "     ${YELLOW}make test${NC}          - Run all tests"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "  - README.md              - Project overview"
    echo "  - LOCAL_DEVELOPMENT.md   - Development guide"
    echo "  - TESTING.md             - Testing guide"
    echo "  - DEPLOYMENT.md          - Deployment guide"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
    echo ""
}

# Main setup flow
main() {
    clear
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                    ║${NC}"
    echo -e "${BLUE}║      🎮 Bamboozled Development Setup 🎮           ║${NC}"
    echo -e "${BLUE}║                                                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites
    create_directories
    install_dependencies
    setup_environment
    setup_database
    setup_git_hooks
    verify_setup
    print_next_steps
}

# Run main
main
