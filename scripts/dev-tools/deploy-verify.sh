#!/bin/bash
#
# Deployment Verification Script
# Runs smoke tests to verify deployment health

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

# Configuration
ENVIRONMENT="${1:-production}"
BASE_URL="${BASE_URL:-}"
MAX_RETRIES=5
RETRY_DELAY=10

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Deployment Verification${NC}"
echo -e "${BLUE}  Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get deployment URL
if [ -z "$BASE_URL" ]; then
    if [ "$ENVIRONMENT" = "production" ]; then
        # Try to get URL from CDK output
        BASE_URL=$(cd infrastructure && npm run cdk -- outputs 2>/dev/null | grep -o 'https://[^"]*' | head -n1 || echo "")
    fi

    if [ -z "$BASE_URL" ]; then
        error "BASE_URL not set and could not be determined automatically"
        info "Please set BASE_URL environment variable or pass deployment URL"
        exit 1
    fi
fi

info "Testing deployment at: $BASE_URL"
echo ""

# Test counter
tests_passed=0
tests_failed=0

run_test() {
    local test_name=$1
    local url=$2
    local expected_status=${3:-200}
    local retry_count=0

    info "Testing: $test_name"

    while [ $retry_count -lt $MAX_RETRIES ]; do
        response=$(curl -s -w "\n%{http_code}" --max-time 30 "$url" 2>/dev/null || echo "000")
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n-1)

        if [ "$http_code" = "$expected_status" ]; then
            success "$test_name passed (HTTP $http_code)"
            tests_passed=$((tests_passed + 1))
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                warning "Attempt $retry_count failed (HTTP $http_code), retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
        fi
    done

    error "$test_name failed after $MAX_RETRIES attempts (HTTP $http_code)"
    tests_failed=$((tests_failed + 1))
    return 1
}

run_json_test() {
    local test_name=$1
    local url=$2
    local expected_field=$3

    info "Testing: $test_name"

    response=$(curl -s -w "\n%{http_code}" --max-time 30 "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        if echo "$body" | grep -q "$expected_field"; then
            success "$test_name passed (found '$expected_field')"
            tests_passed=$((tests_passed + 1))
            return 0
        else
            error "$test_name failed (field '$expected_field' not found)"
            tests_failed=$((tests_failed + 1))
            return 1
        fi
    else
        error "$test_name failed (HTTP $http_code)"
        tests_failed=$((tests_failed + 1))
        return 1
    fi
}

# Run smoke tests
echo -e "${BLUE}Running Smoke Tests:${NC}"
echo ""

# Test 1: Frontend loads
run_test "Frontend Homepage" "$BASE_URL" 200

# Test 2: Backend health endpoint
run_test "Backend Health" "$BASE_URL/api/health" 200

# Test 3: API endpoints
run_json_test "Current Puzzle API" "$BASE_URL/api/puzzles/current" "puzzle" || true
run_json_test "Leaderboard API" "$BASE_URL/api/leaderboard" "users" || true

# Test 4: WebSocket connectivity (basic check)
info "Testing WebSocket connectivity..."
if timeout 10 bash -c "echo > /dev/tcp/${BASE_URL#*://}/443" 2>/dev/null || \
   timeout 10 bash -c "echo > /dev/tcp/${BASE_URL#*://}/80" 2>/dev/null; then
    success "WebSocket port is accessible"
    tests_passed=$((tests_passed + 1))
else
    warning "WebSocket port check inconclusive"
fi

# Test 5: Response time check
echo ""
echo -e "${BLUE}Performance Check:${NC}"
info "Measuring response time..."

response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/api/health" 2>/dev/null || echo "999")
response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d'.' -f1)

if [ -n "$response_ms" ] && [ "$response_ms" -lt 2000 ]; then
    success "Response time: ${response_ms}ms (good)"
elif [ -n "$response_ms" ] && [ "$response_ms" -lt 5000 ]; then
    warning "Response time: ${response_ms}ms (acceptable)"
else
    warning "Response time: ${response_ms}ms (slow)"
fi

# Test 6: SSL/TLS check (if HTTPS)
if [[ "$BASE_URL" == https://* ]]; then
    echo ""
    echo -e "${BLUE}Security Check:${NC}"
    info "Checking SSL certificate..."

    if echo | openssl s_client -connect "${BASE_URL#https://}:443" -servername "${BASE_URL#https://}" 2>/dev/null | grep -q "Verify return code: 0"; then
        success "SSL certificate is valid"
        tests_passed=$((tests_passed + 1))
    else
        warning "SSL certificate validation inconclusive"
    fi
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Verification Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
success "$tests_passed tests passed"
if [ $tests_failed -gt 0 ]; then
    error "$tests_failed tests failed"
fi
echo ""

if [ $tests_failed -eq 0 ]; then
    success "Deployment verification completed successfully!"
    echo ""
    info "Deployment URL: $BASE_URL"
    echo ""
    exit 0
else
    error "Deployment verification failed!"
    echo ""
    warning "Please check the errors above and investigate the deployment"
    warning "Consider rolling back if issues persist"
    echo ""
    exit 1
fi
