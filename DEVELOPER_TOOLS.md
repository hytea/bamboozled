# Developer Tools Guide

Welcome to the Bamboozled Developer Tools! This guide covers all the tools and utilities created to make building, deploying, and maintaining Bamboozled a breeze.

## Table of Contents

- [Quick Start](#quick-start)
- [Makefile Commands](#makefile-commands)
- [Developer Scripts](#developer-scripts)
- [Development Dashboard](#development-dashboard)
- [Git Hooks](#git-hooks)
- [Best Practices](#best-practices)

---

## Quick Start

The fastest way to get started with development:

```bash
# Complete setup (first time)
make setup

# Start development servers
make dev

# Or use Docker
make dev-docker

# View dashboard
make dashboard
```

---

## Makefile Commands

All development tasks can be run through the Makefile. Run `make help` to see all available commands.

### General Commands

| Command | Description |
|---------|-------------|
| `make help` | Display all available commands with descriptions |
| `make setup` | Complete project setup (dependencies + database + hooks) |
| `make install` | Install all dependencies |
| `make deps` | Install dependencies for all components |

### Development Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start development servers (backend + frontend) |
| `make dev-docker` | Start development using Docker Compose |
| `make stop` | Stop all running development servers |
| `make status` | Show status of all services |
| `make health` | Run health checks on all services |
| `make logs` | View aggregated logs from all services |
| `make dashboard` | Open development dashboard in browser |

### Build Commands

| Command | Description |
|---------|-------------|
| `make build` | Build all components |
| `make build-backend` | Build backend TypeScript only |
| `make build-frontend` | Build frontend React app only |

### Testing Commands

| Command | Description |
|---------|-------------|
| `make test` | Run all tests (backend + frontend + E2E) |
| `make test-backend` | Run backend tests only |
| `make test-frontend` | Run frontend tests only |
| `make test-e2e` | Run end-to-end tests |
| `make test-coverage` | Generate test coverage reports |

### Code Quality Commands

| Command | Description |
|---------|-------------|
| `make lint` | Lint all code (backend + frontend) |
| `make lint-backend` | Lint backend code only |
| `make lint-frontend` | Lint frontend code only |
| `make format` | Format all code |
| `make format-backend` | Format backend code only |
| `make format-frontend` | Format frontend code only |
| `make pre-commit-install` | Install Git hooks |
| `make pre-commit-run` | Run pre-commit checks manually |

### Database Commands

| Command | Description |
|---------|-------------|
| `make db-init` | Initialize database |
| `make db-reset` | Reset database (⚠️ destructive!) |
| `make db-health` | Check database health |
| `make db-migrate` | Run database migrations |
| `make db-seed` | Seed database with test data |
| `make db-backup` | Backup database |
| `make db-restore` | Restore database from backup |

### Docker Commands

| Command | Description |
|---------|-------------|
| `make docker-build` | Build Docker images |
| `make docker-up` | Start Docker containers |
| `make docker-down` | Stop Docker containers |
| `make docker-logs` | View Docker logs |
| `make docker-health` | Check Docker container health |
| `make docker-clean` | Remove Docker containers and volumes |

### Deployment Commands

| Command | Description |
|---------|-------------|
| `make deploy` | Deploy to AWS using CDK |
| `make deploy-verify` | Verify deployment health |
| `make deploy-rollback` | Rollback to previous deployment |
| `make deploy-logs` | View deployment logs from AWS |

### Cleanup Commands

| Command | Description |
|---------|-------------|
| `make clean` | Clean build artifacts |
| `make clean-all` | Clean everything (build artifacts + Docker + node_modules) |

### Quick Combo Commands

| Command | Description |
|---------|-------------|
| `make quick-start` | Install deps + setup DB + start dev servers |
| `make quick-test` | Lint + run all tests |
| `make quick-deploy` | Build + deploy + verify |
| `make ci` | Run CI pipeline (lint + test + build) |

---

## Developer Scripts

All developer scripts are located in `scripts/dev-tools/`.

### Setup Script

**Location:** `scripts/dev-tools/setup.sh`

Complete development environment setup script.

```bash
./scripts/dev-tools/setup.sh
# Or
make setup
```

**What it does:**
- ✅ Checks prerequisites (Node.js, npm, Docker, git)
- ✅ Installs all dependencies
- ✅ Sets up environment files (.env)
- ✅ Initializes database
- ✅ Installs Git hooks
- ✅ Verifies setup with builds

### Environment Check Script

**Location:** `scripts/dev-tools/env-check.sh`

Validates that all required environment variables are set.

```bash
./scripts/dev-tools/env-check.sh
```

**Checks:**
- Required environment variables
- AI provider configuration
- Database settings
- Slack integration (if enabled)
- Giphy API key (optional)

### Status Script

**Location:** `scripts/dev-tools/dev-status.sh`

Shows comprehensive status of development environment.

```bash
./scripts/dev-tools/dev-status.sh
# Or
make status
```

**Displays:**
- Local development services status
- Docker services status
- Database status
- Git status
- Environment configuration
- Dependencies status
- Build artifacts status

### Health Check Script

**Location:** `scripts/dev-tools/health-check.sh`

Runs comprehensive health checks on all services.

```bash
./scripts/dev-tools/health-check.sh [local|docker]
# Or
make health
```

**Checks:**
- Backend API health endpoint
- Frontend availability
- WebSocket connectivity
- Database integrity
- Docker container health (if in docker mode)
- System resources (disk space, memory)

### Logs Viewer Script

**Location:** `scripts/dev-tools/logs.sh`

Aggregated log viewer for all services.

```bash
./scripts/dev-tools/logs.sh [local|docker|file]
# Or
make logs
```

**Modes:**
- `local` - Shows status of local dev servers
- `docker` - Follows Docker container logs
- `file` - Follows log files in logs/ directory

### Database Backup Script

**Location:** `scripts/dev-tools/db-backup.sh`

Database backup and restore utility.

```bash
./scripts/dev-tools/db-backup.sh [backup|restore|list]
# Or
make db-backup
make db-restore
```

**Features:**
- Creates compressed backups (.db.gz)
- Automatic timestamp naming
- Keeps last 10 backups
- Pre-restore backup for safety
- Database integrity verification

**Commands:**
- `backup` - Create new backup
- `restore` - Restore from backup (interactive)
- `list` - List available backups

### Deployment Verification Script

**Location:** `scripts/dev-tools/deploy-verify.sh`

Post-deployment smoke tests.

```bash
./scripts/dev-tools/deploy-verify.sh [environment]
# Or
make deploy-verify
```

**Tests:**
- Frontend homepage loads
- Backend health endpoint
- API endpoints respond correctly
- WebSocket connectivity
- Response time performance
- SSL certificate validity (for HTTPS)

**Exit Codes:**
- 0: All tests passed
- 1: Some tests failed

### Deployment Rollback Script

**Location:** `scripts/dev-tools/deploy-rollback.sh`

Helps rollback deployments safely.

```bash
./scripts/dev-tools/deploy-rollback.sh
# Or
make deploy-rollback
```

**Options:**
1. Rollback CDK stack (manual process with guidance)
2. Rollback Docker images to previous tags
3. Cancel rollback

### Git Hooks Installation Script

**Location:** `scripts/dev-tools/install-hooks.sh`

Installs Git hooks for code quality.

```bash
./scripts/dev-tools/install-hooks.sh
# Or
make pre-commit-install
```

**Installs:**
- `pre-commit` - Runs linting before commits
- `commit-msg` - Validates commit message format
- `pre-push` - Runs tests before pushing

### Pre-commit Check Script

**Location:** `scripts/dev-tools/pre-commit.sh`

Runs pre-commit checks (called by Git hook).

```bash
./scripts/dev-tools/pre-commit.sh
# Or
make pre-commit-run
```

**Checks:**
- ESLint (backend and frontend)
- TypeScript type checking
- Console.log statements (warning)
- TODO/FIXME comments (info)
- Sensitive data patterns (API keys, secrets)

---

## Development Dashboard

**Location:** `scripts/dev-tools/dashboard.html`

Web-based visual dashboard for monitoring development environment.

```bash
./scripts/dev-tools/open-dashboard.sh
# Or
make dashboard
```

**Features:**
- 🟢 Real-time service status monitoring
- ⚡ Quick action buttons
- 🔧 Environment information display
- 🔗 Quick links to services
- 💻 Common command reference
- 🔄 Auto-refresh every 10 seconds

**Services Monitored:**
- Backend API (port 3001)
- Frontend (port 3000)
- Database
- WebSocket

---

## Git Hooks

Git hooks are automatically installed when you run `make setup`.

### Pre-commit Hook

Runs before every commit.

**Checks:**
- ✅ ESLint on changed files
- ✅ TypeScript type checking
- ⚠️ Console.log statements (warning)
- ℹ️ TODO/FIXME comments (info)
- 🔒 Sensitive data detection (fails on match)

**Skip:**
```bash
git commit --no-verify
```

### Commit Message Hook

Validates commit message format.

**Format:** `type(scope): description`

**Valid types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Test changes
- `chore` - Build/tooling changes
- `perf` - Performance improvements
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Revert previous commit

**Examples:**
```bash
git commit -m "feat(auth): add user authentication"
git commit -m "fix(api): resolve CORS issue"
git commit -m "docs: update README with setup instructions"
```

### Pre-push Hook

Runs before every push.

**Checks:**
- ✅ Backend tests pass
- ✅ Frontend tests pass

**Skip:**
```bash
git push --no-verify
```

---

## Best Practices

### Daily Development Workflow

```bash
# 1. Start your day
git pull
make status           # Check current state
make dev             # Start development

# 2. During development
make dashboard       # Monitor services
make test            # Run tests frequently
make lint            # Check code quality

# 3. Before committing
make pre-commit-run  # Run checks manually
git add .
git commit -m "feat: your changes"

# 4. Before pushing
make test-all        # Ensure all tests pass
git push
```

### Database Management

```bash
# Regular backup
make db-backup

# After major changes
make db-backup       # Backup before changes
# ... make your changes ...
make db-backup       # Backup after changes

# If something goes wrong
make db-restore      # Restore from backup
```

### Docker Development

```bash
# Start fresh
make docker-clean
make docker-build
make docker-up

# Monitor
make docker-logs
make docker-health

# Stop
make docker-down
```

### Deployment

```bash
# 1. Pre-deployment
make ci              # Run full CI pipeline
make build-all       # Ensure builds work

# 2. Deploy
make deploy          # Deploy to AWS

# 3. Verify
make deploy-verify   # Run smoke tests

# 4. If issues
make deploy-rollback # Rollback if needed
```

### Troubleshooting

#### Services won't start

```bash
make stop            # Stop all services
make clean           # Clean artifacts
make deps            # Reinstall dependencies
make dev             # Try again
```

#### Database issues

```bash
make db-health       # Check database
make db-reset        # Reset if needed
make db-seed         # Reseed data
```

#### Docker issues

```bash
make docker-clean    # Clean Docker resources
make docker-build    # Rebuild images
make docker-up       # Start fresh
```

#### Tests failing

```bash
make lint            # Check for linting issues
make format          # Auto-format code
make test-coverage   # See what's not covered
```

---

## Environment Variables

All environment variables are configured in `backend/.env`.

Copy from template:
```bash
cp backend/.env.example backend/.env
```

### Required Variables

- `AI_PROVIDER` - AI provider (claude, openrouter, local)
- `ANTHROPIC_API_KEY` - Claude API key (if using Claude)
- `OPENROUTER_API_KEY` - OpenRouter API key (if using OpenRouter)

### Optional Variables

- `PORT` - Backend port (default: 3001)
- `DATABASE_PATH` - Database file path
- `ENABLE_SLACK` - Enable Slack integration
- `SLACK_BOT_TOKEN` - Slack bot token
- `GIPHY_API_KEY` - Giphy API key

Check your configuration:
```bash
./scripts/dev-tools/env-check.sh
```

---

## Tips & Tricks

### Speed up development

```bash
# Use quick commands
make quick-start     # One command to start

# Use dashboard for monitoring
make dashboard       # Visual monitoring

# Use Docker for consistency
make dev-docker      # Same environment everywhere
```

### Maintain code quality

```bash
# Format before committing
make format

# Run full check
make ci

# Check coverage
make test-coverage
```

### Manage backups

```bash
# Daily backup
make db-backup

# List backups
./scripts/dev-tools/db-backup.sh list

# Automated backup (add to cron)
0 2 * * * cd /path/to/bamboozled && make db-backup
```

### Monitor deployments

```bash
# After deployment
make deploy-verify   # Verify health
make deploy-logs     # Check logs

# Rollback if needed
make deploy-rollback
```

---

## Getting Help

- Run `make help` to see all available commands
- Check specific script help: `./scripts/dev-tools/<script>.sh --help`
- View the dashboard: `make dashboard`
- Check status: `make status`
- Run health checks: `make health`

---

## Contributing

When adding new developer tools:

1. Add scripts to `scripts/dev-tools/`
2. Make them executable: `chmod +x scripts/dev-tools/your-script.sh`
3. Add to Makefile with description
4. Update this documentation
5. Test thoroughly: `make test-all`
6. Commit with proper message: `feat(tools): add your tool`

---

## Summary

The Bamboozled developer tools provide:

✅ **Unified interface** - Single Makefile entry point
✅ **Comprehensive scripts** - Setup, health, logs, backup, deploy
✅ **Visual dashboard** - Real-time service monitoring
✅ **Git hooks** - Automated quality checks
✅ **Documentation** - Complete usage guide

**Get started now:**
```bash
make setup
make dev
make dashboard
```

Happy coding! 🚀
