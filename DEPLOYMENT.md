# Bamboozled Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- API key for your chosen AI provider (Claude or OpenRouter)

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd bamboozled
```

2. **Set up environment variables**
```bash
cp .env.docker.example .env
# Edit .env and add your API keys
```

3. **Create data directory**
```bash
mkdir -p data
```

4. **Build and run with Docker Compose**
```bash
docker-compose up -d
```

5. **Access the application**
- Web Chat: http://localhost:3000
- API: http://localhost:3001
- Health Check: http://localhost:3001/health

### Stopping the Application
```bash
docker-compose down
```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

## Development Setup (Without Docker)

### Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your API keys
npm run dev
```

### Frontend
```bash
cd web-chat
npm install
npm run dev
```

## AI Provider Configuration

### Using Claude (Anthropic)
```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Using OpenRouter (Free/Alternative Models)
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

### Switching Providers
Simply change the `AI_PROVIDER` environment variable and restart:
```bash
docker-compose restart backend
```

## AWS Deployment

### Option 1: ECS Fargate

1. **Build and push images to ECR**
```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag backend
docker build -t bamboozled-backend ./backend
docker tag bamboozled-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/bamboozled-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/bamboozled-backend:latest

# Build and tag frontend
docker build -t bamboozled-frontend ./web-chat
docker tag bamboozled-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/bamboozled-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/bamboozled-frontend:latest
```

2. **Create ECS Task Definition**
- Use the images pushed to ECR
- Set environment variables in task definition
- Configure volume for SQLite database (EFS recommended)

3. **Create ECS Service**
- Use Application Load Balancer
- Configure target groups for ports 3000 and 3001
- Set desired count to 1

### Option 2: EC2 with Docker

1. **Launch EC2 instance**
```bash
# Amazon Linux 2
# Install Docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Clone and deploy**
```bash
git clone <repository-url>
cd bamboozled
cp .env.docker.example .env
# Edit .env with your API keys
docker-compose up -d
```

3. **Configure security groups**
- Allow inbound on port 3000 (frontend)
- Allow inbound on port 3001 (backend API)

## Data Persistence

### SQLite Database
The database is stored in `./data/bamboozled.db` and is mounted as a volume.

### Backups
```bash
# Create backup
docker exec bamboozled-backend sqlite3 /app/data/bamboozled.db .dump > backup.sql

# Restore backup
docker exec -i bamboozled-backend sqlite3 /app/data/bamboozled.db < backup.sql
```

## Puzzle Management

### Adding Puzzles
1. Edit `puzzles/puzzle-data.json`
2. Add puzzle images to `puzzles/images/`
3. Restart backend: `docker-compose restart backend`

### Activating a Puzzle
The system auto-rotates puzzles weekly. To manually activate:
```bash
# Access backend container
docker exec -it bamboozled-backend sh

# Use the API (implement admin endpoint if needed)
```

## Monitoring

### Health Checks
- Backend: http://localhost:3001/health
- Frontend: http://localhost:3000/health

### Docker Stats
```bash
docker stats bamboozled-backend bamboozled-frontend
```

## Troubleshooting

### Backend won't start
- Check API keys in .env
- View logs: `docker-compose logs backend`
- Ensure data directory exists and is writable

### WebSocket connection fails
- Check CORS settings
- Verify nginx proxy configuration
- Check firewall rules

### Database errors
- Ensure data directory is mounted correctly
- Check file permissions
- Try removing and recreating: `rm -rf data && mkdir data`

## Security Best Practices

1. **Never commit .env files**
2. **Use secrets management** (AWS Secrets Manager, HashiCorp Vault)
3. **Enable HTTPS** with reverse proxy (nginx, CloudFlare)
4. **Restrict API access** with authentication (for production)
5. **Regular backups** of database
6. **Update dependencies** regularly

## Scaling Considerations

For production use with larger teams:
1. **Switch to PostgreSQL** instead of SQLite
2. **Add Redis** for caching and session management
3. **Use managed services** (RDS, ElastiCache)
4. **Implement CDN** for puzzle images (CloudFront, CloudFlare)
5. **Add monitoring** (CloudWatch, Datadog, New Relic)
6. **Implement rate limiting** to prevent abuse
