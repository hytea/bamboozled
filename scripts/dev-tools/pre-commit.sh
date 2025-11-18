#!/bin/bash
#
# Pre-commit checks
# Runs linting and formatting before allowing commit

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

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Pre-commit Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Track if any checks fail
checks_failed=0

# Get list of staged files
staged_files=$(git diff --cached --name-only --diff-filter=ACM)

# Check if there are any staged backend TypeScript files
backend_files=$(echo "$staged_files" | grep "^backend/.*\.ts$" || true)
if [ -n "$backend_files" ]; then
    info "Checking backend files..."

    # Run backend linting
    echo ""
    info "Running backend ESLint..."
    if cd backend && npm run lint -- --quiet 2>&1; then
        success "Backend linting passed"
    else
        error "Backend linting failed"
        warning "Run 'cd backend && npm run lint' to see errors"
        warning "Run 'cd backend && npm run format' to auto-fix"
        checks_failed=1
    fi
    cd ..
fi

# Check if there are any staged frontend TypeScript/React files
frontend_files=$(echo "$staged_files" | grep "^web-chat/.*\.\(ts\|tsx\)$" || true)
if [ -n "$frontend_files" ]; then
    info "Checking frontend files..."

    # Run frontend linting
    echo ""
    info "Running frontend ESLint..."
    if cd web-chat && npm run lint -- --quiet 2>&1; then
        success "Frontend linting passed"
    else
        error "Frontend linting failed"
        warning "Run 'cd web-chat && npm run lint' to see errors"
        warning "Run 'cd web-chat && npm run format' to auto-fix"
        checks_failed=1
    fi
    cd ..
fi

# TypeScript type checking
if [ -n "$backend_files" ]; then
    echo ""
    info "Running backend type checking..."
    if cd backend && npx tsc --noEmit 2>&1 | tail -n 20; then
        success "Backend type checking passed"
    else
        error "Backend type checking failed"
        warning "Fix TypeScript errors before committing"
        checks_failed=1
    fi
    cd ..
fi

if [ -n "$frontend_files" ]; then
    echo ""
    info "Running frontend type checking..."
    if cd web-chat && npx tsc --noEmit 2>&1 | tail -n 20; then
        success "Frontend type checking passed"
    else
        error "Frontend type checking failed"
        warning "Fix TypeScript errors before committing"
        checks_failed=1
    fi
    cd ..
fi

# Check for common issues
echo ""
info "Checking for common issues..."

# Check for console.log statements in production code
console_logs=$(echo "$staged_files" | xargs grep -n "console\.log" 2>/dev/null || true)
if [ -n "$console_logs" ]; then
    warning "Found console.log statements:"
    echo "$console_logs"
    warning "Consider removing console.log before committing"
    # Don't fail on this, just warn
fi

# Check for TODO comments
todos=$(echo "$staged_files" | xargs grep -n "TODO\|FIXME\|XXX" 2>/dev/null || true)
if [ -n "$todos" ]; then
    info "Found TODO/FIXME comments:"
    echo "$todos"
    info "Note: Using bd (beads) for issue tracking is preferred"
    # Don't fail on this, just inform
fi

# Check for sensitive data patterns
echo ""
info "Checking for sensitive data..."

sensitive_patterns=(
    "api[_-]key.*=.*['\"][^'\"]{10,}"
    "secret.*=.*['\"][^'\"]{10,}"
    "password.*=.*['\"][^'\"]{10,}"
    "token.*=.*['\"][^'\"]{10,}"
    "-----BEGIN.*PRIVATE KEY-----"
)

for pattern in "${sensitive_patterns[@]}"; do
    matches=$(echo "$staged_files" | xargs grep -iE "$pattern" 2>/dev/null || true)
    if [ -n "$matches" ]; then
        error "Potential sensitive data found:"
        echo "$matches"
        error "DO NOT commit sensitive data!"
        checks_failed=1
    fi
done

if [ $checks_failed -eq 0 ]; then
    success "No sensitive data patterns detected"
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $checks_failed -eq 0 ]; then
    success "All pre-commit checks passed!"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    exit 0
else
    error "Some pre-commit checks failed"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    warning "Fix the errors above before committing"
    echo ""
    info "To skip these checks (not recommended):"
    echo "  git commit --no-verify"
    echo ""
    exit 1
fi
