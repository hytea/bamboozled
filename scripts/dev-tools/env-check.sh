#!/bin/bash
#
# Environment Variable Validation Script
# Checks that all required environment variables are set

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

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Environment Configuration Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Load backend .env if it exists
if [ -f "backend/.env" ]; then
    source backend/.env 2>/dev/null || true
fi

all_good=true

# Required variables
echo -e "${BLUE}Required Variables:${NC}"

check_var() {
    local var_name=$1
    local var_value=${!var_name}
    local is_required=$2

    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            error "$var_name is not set (required)"
            all_good=false
        else
            warning "$var_name is not set (optional)"
        fi
    else
        # Mask sensitive values
        if [[ $var_name == *"KEY"* ]] || [[ $var_name == *"SECRET"* ]] || [[ $var_name == *"TOKEN"* ]]; then
            success "$var_name is set (***hidden***)"
        else
            success "$var_name = $var_value"
        fi
    fi
}

# Core settings
check_var "NODE_ENV" false
check_var "PORT" false

# AI Provider settings
echo ""
echo -e "${BLUE}AI Provider Configuration:${NC}"
check_var "AI_PROVIDER" false

if [ "$AI_PROVIDER" = "claude" ]; then
    check_var "ANTHROPIC_API_KEY" true
elif [ "$AI_PROVIDER" = "openrouter" ]; then
    check_var "OPENROUTER_API_KEY" true
    check_var "OPENROUTER_MODEL" false
fi

# Database settings
echo ""
echo -e "${BLUE}Database Configuration:${NC}"
check_var "DATABASE_PATH" false

# Check if database file exists
if [ -n "$DATABASE_PATH" ] && [ ! -f "$DATABASE_PATH" ]; then
    warning "Database file does not exist at: $DATABASE_PATH"
    info "Run 'make db-init' to create it"
fi

# Puzzle settings
echo ""
echo -e "${BLUE}Puzzle Configuration:${NC}"
check_var "PUZZLE_DATA_PATH" false
check_var "PUZZLE_IMAGES_PATH" false
check_var "PUZZLE_ROTATION_DAY" false
check_var "PUZZLE_ROTATION_HOUR" false

# Slack settings (optional)
echo ""
echo -e "${BLUE}Slack Integration (Optional):${NC}"
check_var "ENABLE_SLACK" false

if [ "$ENABLE_SLACK" = "true" ]; then
    check_var "SLACK_BOT_TOKEN" true
    check_var "SLACK_SIGNING_SECRET" true
    check_var "SLACK_APP_TOKEN" true
fi

# Giphy settings (optional)
echo ""
echo -e "${BLUE}Giphy Integration (Optional):${NC}"
check_var "GIPHY_API_KEY" false

# Web chat settings
echo ""
echo -e "${BLUE}Web Chat Configuration:${NC}"
check_var "ENABLE_WEB_CHAT" false

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$all_good" = true ]; then
    success "All required environment variables are set"
    echo ""
    exit 0
else
    error "Some required environment variables are missing"
    echo ""
    info "Please check backend/.env and set the missing variables"
    info "You can copy from backend/.env.example as a template"
    echo ""
    exit 1
fi
