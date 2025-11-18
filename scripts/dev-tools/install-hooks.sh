#!/bin/bash
#
# Git Hooks Installation Script
# Installs pre-commit and other Git hooks

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
echo -e "${BLUE}  Installing Git Hooks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    error "Not a git repository"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
info "Installing pre-commit hook..."

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
#
# Pre-commit hook for Bamboozled
# Runs linting and tests before allowing commit

# Run the pre-commit script
./scripts/dev-tools/pre-commit.sh

# Exit with the same code as the pre-commit script
exit $?
EOF

chmod +x .git/hooks/pre-commit
success "Pre-commit hook installed"

# Install commit-msg hook for commit message validation
info "Installing commit-msg hook..."

cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
#
# Commit message validation hook
# Ensures commit messages follow conventional commit format

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Skip merge commits
if echo "$commit_msg" | grep -qE "^Merge "; then
    exit 0
fi

# Check if commit message follows conventional commit format
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{3,}"; then
    echo -e "${RED}❌ Invalid commit message format${NC}"
    echo ""
    echo "Commit messages should follow the Conventional Commits format:"
    echo ""
    echo "  type(scope): description"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
    echo ""
    echo "Examples:"
    echo "  feat(auth): add user authentication"
    echo "  fix(api): resolve CORS issue"
    echo "  docs: update README with setup instructions"
    echo ""
    echo -e "${YELLOW}Your commit message:${NC}"
    echo "  $commit_msg"
    echo ""
    exit 1
fi

exit 0
EOF

chmod +x .git/hooks/commit-msg
success "Commit-msg hook installed"

# Install pre-push hook
info "Installing pre-push hook..."

cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
#
# Pre-push hook for Bamboozled
# Runs tests before allowing push

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}Running pre-push checks...${NC}"
echo ""

# Run backend tests
echo -e "${BLUE}Running backend tests...${NC}"
cd backend
if ! npm test -- --run 2>&1 | tail -n 20; then
    echo ""
    echo -e "${RED}❌ Backend tests failed${NC}"
    echo -e "${YELLOW}Fix the tests before pushing${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}✅ Backend tests passed${NC}"

# Run frontend tests
echo -e "${BLUE}Running frontend tests...${NC}"
cd web-chat
if ! npm test -- --run 2>&1 | tail -n 20; then
    echo ""
    echo -e "${RED}❌ Frontend tests failed${NC}"
    echo -e "${YELLOW}Fix the tests before pushing${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}✅ Frontend tests passed${NC}"
echo ""
echo -e "${GREEN}✅ All pre-push checks passed${NC}"
echo ""

exit 0
EOF

chmod +x .git/hooks/pre-push
success "Pre-push hook installed"

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
success "Git hooks installed successfully!"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
info "Installed hooks:"
echo "  • pre-commit  - Runs linting before commits"
echo "  • commit-msg  - Validates commit message format"
echo "  • pre-push    - Runs tests before pushing"
echo ""
info "To skip hooks temporarily, use:"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
warning "Note: Skipping hooks should be done sparingly!"
echo ""
