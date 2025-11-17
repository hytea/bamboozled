# Docker Setup Guide

This guide will help you run Bamboozled in Docker containers.

## Prerequisites

- Docker (version 20.10 or later)
- Docker Compose (version 2.0 or later)

To install Docker:
- **macOS/Windows**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow [Docker Engine installation guide](https://docs.docker.com/engine/install/)

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and configure your API keys:

```bash
cp .env.docker.example .env
```

Edit `.env` and set your AI provider configuration:

```bash
# For Claude (Anthropic)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# OR for OpenRouter
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5

# OR for local Ollama
AI_PROVIDER=local
# Make sure Ollama is running on your host
```

**Note**: At minimum, you need to set one AI provider and its corresponding API key.

### 2. Build and Start the Containers

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

This will:
- Build the backend API server (Node.js/TypeScript)
- Build the frontend web application (React/Vite with Nginx)
- Start both services with proper networking
- Create persistent volumes for database and puzzle data

### 3. Access the Application

Once the containers are running:

- **Web Interface**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### 4. Stop the Containers

```bash
# Stop containers (preserves data)
docker-compose down

# Stop and remove volumes (deletes database)
docker-compose down -v
```

## Architecture

The Docker setup consists of two services:

### Backend Service
- **Image**: Node.js 20 Alpine
- **Port**: 3001
- **Database**: SQLite (persisted in `./data` volume)
- **Puzzles**: Loaded from `./puzzles` volume
- **Health Check**: HTTP GET `/health` endpoint

### Frontend Service
- **Image**: Nginx Alpine
- **Port**: 3000 (maps to container port 80)
- **Server**: Nginx reverse proxy
- **Proxies**:
  - `/api/*` → `http://backend:3001/api/*`
  - `/ws` → `http://backend:3001/ws` (WebSocket)

### Network
- **Name**: `bamboozled-network`
- **Type**: Bridge network (isolated container communication)

## Data Persistence

The following directories are mounted as volumes to persist data:

```yaml
volumes:
  - ./data:/app/data          # SQLite database
  - ./puzzles:/app/puzzles    # Puzzle data and images
```

Your data will survive container restarts unless you use `docker-compose down -v`.

## Environment Variables

All environment variables are configured in `.env` file. Key variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AI_PROVIDER` | AI provider to use | `claude` | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | - | If using Claude |
| `OPENROUTER_API_KEY` | OpenRouter API key | - | If using OpenRouter |
| `OPENROUTER_MODEL` | OpenRouter model name | `anthropic/claude-sonnet-4.5` | If using OpenRouter |
| `NODE_ENV` | Environment mode | `production` | No |
| `PUZZLE_ROTATION_DAY` | Day of week for rotation (1=Monday) | `1` | No |
| `PUZZLE_ROTATION_HOUR` | Hour for rotation (0-23) | `9` | No |
| `ENABLE_SLACK` | Enable Slack bot | `false` | No |
| `SLACK_BOT_TOKEN` | Slack bot token | - | If Slack enabled |
| `SLACK_SIGNING_SECRET` | Slack signing secret | - | If Slack enabled |
| `SLACK_APP_TOKEN` | Slack app token | - | If Slack enabled |
| `GIPHY_API_KEY` | Giphy API key for GIFs | - | No (fallback GIFs used) |

## Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Rebuild Containers

```bash
# Rebuild without cache (for code changes)
docker-compose build --no-cache

# Rebuild and restart
docker-compose up --build -d
```

### Execute Commands Inside Containers

```bash
# Access backend shell
docker-compose exec backend sh

# Access frontend shell
docker-compose exec frontend sh

# Run database commands
docker-compose exec backend npm run db:health
docker-compose exec backend npm run db:export
```

### Check Container Status

```bash
# List running containers
docker-compose ps

# Check health status
docker-compose ps --format json | jq '.[].Health'
```

## Troubleshooting

### Port Already in Use

If ports 3000 or 3001 are already in use, you can modify `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8001:3001"  # Change host port
  frontend:
    ports:
      - "8000:80"    # Change host port
```

### Database Issues

If you need to reset the database:

```bash
# Stop containers
docker-compose down

# Remove database file
rm -f data/bamboozled.db*

# Restart containers (will create fresh database)
docker-compose up -d
```

### WebSocket Connection Issues

If WebSocket connections fail:

1. Check that both containers are healthy:
   ```bash
   docker-compose ps
   ```

2. Verify backend health:
   ```bash
   curl http://localhost:3001/health
   ```

3. Check backend logs for errors:
   ```bash
   docker-compose logs backend
   ```

### Build Failures

If builds fail due to dependency issues:

```bash
# Clear Docker build cache
docker builder prune -a

# Remove all containers and images
docker-compose down
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

## Development vs Production

### Development Mode

For development with hot-reload:

1. Don't use Docker containers
2. Run backend and frontend separately:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm install
   npm run dev

   # Terminal 2 - Frontend
   cd web-chat
   npm install
   npm run dev
   ```

See [QUICKSTART.md](QUICKSTART.md) for detailed development setup.

### Production Mode

For production deployment:

1. Use Docker containers (this guide)
2. Set `NODE_ENV=production` in `.env`
3. Configure proper AI API keys
4. Consider using Docker Swarm or Kubernetes for scaling

See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud deployment options (AWS ECS, EC2, etc.).

## Security Best Practices

1. **Never commit `.env`** - It contains sensitive API keys (already in `.gitignore`)
2. **Use secrets management** - For production, use Docker secrets or environment variable injection
3. **Limit network exposure** - Only expose necessary ports (3000 for web access)
4. **Keep images updated** - Regularly rebuild with latest base images
5. **Use non-root users** - Production Dockerfiles should run as non-root (future enhancement)

## Next Steps

- Configure AI provider: See [AI-PROVIDERS.md](AI-PROVIDERS.md)
- Set up Slack integration: See [SLACK.md](SLACK.md)
- Configure Ollama for local models: See [OLLAMA.md](OLLAMA.md)
- Deploy to cloud: See [DEPLOYMENT.md](DEPLOYMENT.md)

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Verify health checks: `docker-compose ps`
3. Review documentation in this repository
4. Check that all required environment variables are set
