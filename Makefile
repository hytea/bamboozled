.PHONY: help setup dev dev-docker stop clean clean-all \
        build build-backend build-frontend build-all \
        test test-backend test-frontend test-e2e test-all test-coverage \
        lint lint-backend lint-frontend format format-backend format-frontend \
        db-init db-reset db-health db-migrate db-seed db-backup db-restore \
        docker-build docker-up docker-down docker-logs docker-health docker-clean \
        deploy deploy-aws deploy-verify deploy-rollback deploy-logs \
        status health logs dashboard install deps \
        pre-commit-install pre-commit-run

##@ General

help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\n\033[1m🚀 Bamboozled Developer Tools\033[0m\n\n\033[1mUsage:\033[0m\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup & Installation

setup: ## Complete project setup (dependencies + database + hooks)
	@echo "🔧 Setting up Bamboozled development environment..."
	@./scripts/dev-tools/setup.sh

install: deps ## Install all dependencies (alias for deps)

deps: ## Install dependencies for all components
	@echo "📦 Installing backend dependencies..."
	@cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	@cd web-chat && npm install
	@echo "📦 Installing infrastructure dependencies..."
	@cd infrastructure && npm install
	@echo "📦 Installing root dependencies..."
	@npm install
	@echo "✅ All dependencies installed"

##@ Development

dev: ## Start development servers (backend + frontend)
	@echo "🚀 Starting development servers..."
	@trap 'kill 0' INT; \
		(cd backend && npm run dev) & \
		(cd web-chat && npm run dev) & \
		wait

dev-docker: docker-up ## Start development using Docker Compose

stop: ## Stop all running development servers
	@echo "🛑 Stopping development servers..."
	@pkill -f "vite" || true
	@pkill -f "tsx watch" || true
	@echo "✅ Development servers stopped"

status: ## Show status of all services
	@./scripts/dev-tools/dev-status.sh

health: ## Run health checks on all services
	@./scripts/dev-tools/health-check.sh

logs: ## View aggregated logs from all services
	@./scripts/dev-tools/logs.sh

dashboard: ## Open development dashboard in browser
	@./scripts/dev-tools/open-dashboard.sh

##@ Build

build: build-all ## Build all components (alias for build-all)

build-backend: ## Build backend TypeScript
	@echo "🔨 Building backend..."
	@cd backend && npm run build
	@echo "✅ Backend build complete"

build-frontend: ## Build frontend React app
	@echo "🔨 Building frontend..."
	@cd web-chat && npm run build
	@echo "✅ Frontend build complete"

build-all: ## Build all components
	@echo "🔨 Building all components..."
	@$(MAKE) build-backend
	@$(MAKE) build-frontend
	@echo "✅ All builds complete"

##@ Testing

test: test-all ## Run all tests (alias for test-all)

test-backend: ## Run backend tests
	@echo "🧪 Running backend tests..."
	@cd backend && npm test

test-frontend: ## Run frontend tests
	@echo "🧪 Running frontend tests..."
	@cd web-chat && npm test

test-e2e: ## Run end-to-end tests
	@echo "🧪 Running E2E tests..."
	@npm run test:e2e

test-all: ## Run all test suites
	@echo "🧪 Running all tests..."
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@$(MAKE) test-e2e
	@echo "✅ All tests complete"

test-coverage: ## Generate test coverage reports
	@echo "📊 Generating coverage reports..."
	@cd backend && npm run test:coverage
	@cd web-chat && npm run test:coverage
	@echo "✅ Coverage reports generated"
	@echo "📂 Backend coverage: backend/coverage/index.html"
	@echo "📂 Frontend coverage: web-chat/coverage/index.html"

##@ Code Quality

lint: ## Lint all code
	@echo "🔍 Linting backend..."
	@cd backend && npm run lint
	@echo "🔍 Linting frontend..."
	@cd web-chat && npm run lint
	@echo "✅ Linting complete"

lint-backend: ## Lint backend code
	@cd backend && npm run lint

lint-frontend: ## Lint frontend code
	@cd web-chat && npm run lint

format: ## Format all code
	@echo "✨ Formatting backend..."
	@cd backend && npm run format
	@echo "✨ Formatting frontend..."
	@cd web-chat && npm run format
	@echo "✅ Formatting complete"

format-backend: ## Format backend code
	@cd backend && npm run format

format-frontend: ## Format frontend code
	@cd web-chat && npm run format

pre-commit-install: ## Install pre-commit hooks
	@./scripts/dev-tools/install-hooks.sh

pre-commit-run: ## Run pre-commit checks manually
	@./scripts/dev-tools/pre-commit.sh

##@ Database

db-init: ## Initialize database
	@echo "🗄️  Initializing database..."
	@cd backend && npm run db:init
	@echo "✅ Database initialized"

db-reset: ## Reset database (destructive!)
	@echo "⚠️  Resetting database..."
	@cd backend && npm run db:reset
	@echo "✅ Database reset complete"

db-health: ## Check database health
	@cd backend && npm run db:health

db-migrate: ## Run database migrations
	@echo "🔄 Running migrations..."
	@cd backend && npm run db:migrate
	@echo "✅ Migrations complete"

db-seed: ## Seed database with test data
	@echo "🌱 Seeding database..."
	@cd backend && npm run db:seed
	@echo "✅ Database seeded"

db-backup: ## Backup database
	@./scripts/dev-tools/db-backup.sh backup

db-restore: ## Restore database from backup
	@./scripts/dev-tools/db-backup.sh restore

##@ Docker

docker-build: ## Build Docker images
	@echo "🐳 Building Docker images..."
	@docker-compose build
	@echo "✅ Docker images built"

docker-up: ## Start Docker containers
	@echo "🐳 Starting Docker containers..."
	@docker-compose up -d
	@echo "✅ Docker containers started"
	@echo "🔍 Waiting for services to be healthy..."
	@sleep 5
	@docker-compose ps

docker-down: ## Stop Docker containers
	@echo "🐳 Stopping Docker containers..."
	@docker-compose down
	@echo "✅ Docker containers stopped"

docker-logs: ## View Docker logs
	@docker-compose logs -f

docker-health: ## Check Docker container health
	@echo "🏥 Checking Docker container health..."
	@docker-compose ps
	@./scripts/dev-tools/health-check.sh docker

docker-clean: ## Remove Docker containers and volumes
	@echo "🧹 Cleaning Docker resources..."
	@docker-compose down -v
	@docker system prune -f
	@echo "✅ Docker cleanup complete"

##@ Deployment

deploy: deploy-aws ## Deploy to AWS (alias for deploy-aws)

deploy-aws: ## Deploy to AWS using CDK
	@echo "🚀 Deploying to AWS..."
	@./deploy.sh deploy
	@echo "✅ Deployment complete"

deploy-verify: ## Verify deployment health
	@./scripts/dev-tools/deploy-verify.sh

deploy-rollback: ## Rollback to previous deployment
	@./scripts/dev-tools/deploy-rollback.sh

deploy-logs: ## View deployment logs from AWS
	@./deploy.sh logs

##@ Cleanup

clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf backend/dist
	@rm -rf web-chat/dist
	@rm -rf backend/coverage
	@rm -rf web-chat/coverage
	@rm -rf .cache
	@echo "✅ Build artifacts cleaned"

clean-all: clean docker-clean ## Clean everything (build artifacts + Docker)
	@echo "🧹 Cleaning node_modules..."
	@rm -rf backend/node_modules
	@rm -rf web-chat/node_modules
	@rm -rf infrastructure/node_modules
	@rm -rf node_modules
	@echo "✅ Complete cleanup done"

##@ Quick Commands

quick-start: deps db-init db-seed dev ## Quick start: install deps, setup DB, start dev servers

quick-test: lint test-all ## Quick test: lint + all tests

quick-deploy: build-all deploy-aws deploy-verify ## Quick deploy: build + deploy + verify

ci: lint test-all build-all ## CI pipeline: lint + test + build (mimics CI/CD)
