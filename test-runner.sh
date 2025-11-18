#!/bin/bash

# Test Runner Script for Bamboozled
# Runs comprehensive tests in Docker containers for repeatable results

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Run comprehensive tests in Docker containers for repeatable results.

OPTIONS:
    all             Run all tests (unit, integration, and E2E)
    unit            Run unit tests only (backend + frontend)
    backend         Run backend tests only
    frontend        Run frontend tests only
    e2e             Run E2E tests only
    coverage        Run all tests with coverage reports
    clean           Clean up test containers and volumes
    help            Show this help message

EXAMPLES:
    $0 all          # Run all tests
    $0 unit         # Run unit tests only
    $0 coverage     # Run all tests with coverage
    $0 clean        # Clean up test containers

EOF
}

# Function to clean up
cleanup() {
    print_info "Cleaning up test containers and volumes..."
    docker-compose -f docker-compose.test.yml down -v
    print_success "Cleanup complete"
}

# Function to run backend tests
run_backend_tests() {
    print_info "Running backend tests..."
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit backend-test
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        print_success "Backend tests passed!"
    else
        print_error "Backend tests failed with exit code $exit_code"
        return $exit_code
    fi
}

# Function to run frontend tests
run_frontend_tests() {
    print_info "Running frontend tests..."
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit frontend-test
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        print_success "Frontend tests passed!"
    else
        print_error "Frontend tests failed with exit code $exit_code"
        return $exit_code
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_info "Running E2E tests..."
    print_info "Starting backend and frontend services..."

    # Start backend and frontend services
    docker-compose -f docker-compose.test.yml up -d backend frontend

    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    timeout=60
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        backend_healthy=$(docker inspect --format='{{.State.Health.Status}}' bamboozled-backend-e2e 2>/dev/null || echo "starting")
        frontend_healthy=$(docker inspect --format='{{.State.Health.Status}}' bamboozled-frontend-e2e 2>/dev/null || echo "starting")

        if [ "$backend_healthy" = "healthy" ] && [ "$frontend_healthy" = "healthy" ]; then
            print_success "Services are healthy!"
            break
        fi

        print_info "Waiting for services... (${elapsed}s/${timeout}s)"
        sleep 5
        elapsed=$((elapsed + 5))
    done

    if [ $elapsed -ge $timeout ]; then
        print_error "Services failed to become healthy within ${timeout}s"
        docker-compose -f docker-compose.test.yml logs backend frontend
        docker-compose -f docker-compose.test.yml down
        return 1
    fi

    # Run E2E tests
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit e2e-test
    local exit_code=$?

    # Stop services
    docker-compose -f docker-compose.test.yml down

    if [ $exit_code -eq 0 ]; then
        print_success "E2E tests passed!"
    else
        print_error "E2E tests failed with exit code $exit_code"
        return $exit_code
    fi
}

# Function to run unit tests (backend + frontend)
run_unit_tests() {
    print_info "Running unit tests (backend + frontend)..."

    run_backend_tests
    backend_result=$?

    run_frontend_tests
    frontend_result=$?

    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        print_success "All unit tests passed!"
        return 0
    else
        print_error "Some unit tests failed"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_info "Running all tests (unit + E2E)..."

    run_unit_tests
    unit_result=$?

    run_e2e_tests
    e2e_result=$?

    if [ $unit_result -eq 0 ] && [ $e2e_result -eq 0 ]; then
        print_success "All tests passed! 🎉"
        return 0
    else
        print_error "Some tests failed"
        return 1
    fi
}

# Function to run tests with coverage
run_coverage() {
    print_info "Running tests with coverage reports..."

    # Run backend tests with coverage
    print_info "Running backend tests with coverage..."
    docker-compose -f docker-compose.test.yml run --rm backend-test npm run test:coverage

    # Run frontend tests with coverage
    print_info "Running frontend tests with coverage..."
    docker-compose -f docker-compose.test.yml run --rm frontend-test npm run test:coverage

    print_success "Coverage reports generated!"
    print_info "Backend coverage: ./backend/coverage/index.html"
    print_info "Frontend coverage: ./web-chat/coverage/index.html"
}

# Main script
main() {
    local command="${1:-help}"

    case "$command" in
        all)
            run_all_tests
            exit $?
            ;;
        unit)
            run_unit_tests
            exit $?
            ;;
        backend)
            run_backend_tests
            exit $?
            ;;
        frontend)
            run_frontend_tests
            exit $?
            ;;
        e2e)
            run_e2e_tests
            exit $?
            ;;
        coverage)
            run_coverage
            exit $?
            ;;
        clean)
            cleanup
            exit 0
            ;;
        help|--help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
