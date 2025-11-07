# Bamboozled Puzzle Game

A Slack-integrated puzzle game system with web chat interface, AI-powered answer validation, and dynamic bot personality that evolves based on player performance.

## ✨ Features

- 🧩 **Weekly Puzzle Rotation** - Automatic scheduling and rotation
- 🤖 **AI-Powered Validation** - Fuzzy answer matching accepts variations, typos, plurals
- 💬 **Web Chat Interface** - Standalone browser interface mimicking Slack bot experience
- 📊 **Statistics & Leaderboards** - Weekly and all-time player rankings
- 🎭 **7-Tier Mood System** - Bot personality evolves from "The Skeptic" to "The Worshipper"
- 🎉 **Celebration GIFs** - Mood-tier appropriate GIFs from Giphy (with fallbacks)
- 🔄 **Swappable AI Providers** - Easy switching between Claude, OpenRouter, or local models
- 🐳 **Docker Ready** - One-command deployment with Docker Compose
- 📱 **Optional Slack Integration** - Deploy as a real Slack bot
- ⚡ **Real-time Communication** - WebSocket-based chat

## 🎭 Mood Tier System

The bot's personality evolves based on your performance:

| Tier | Name | Requirements | Personality |
|------|------|-------------|-------------|
| 0 | The Skeptic | New users | Dismissive, unimpressed |
| 1 | The Indifferent | 1-2 week streak, 3-5 solves | Neutral, factual |
| 2 | The Acknowledger | 3-4 week streak, 6-10 solves | Starting to approve |
| 3 | The Respector | 5-7 week streak, 11-20 solves | Respectful, impressed |
| 4 | The Admirer | 8-11 week streak, 21-35 solves | Highly complimentary |
| 5 | The Devotee | 12-19 week streak, 36-50 solves | Deeply reverential |
| 6 | The Worshipper | 20+ week streak, 51+ solves | Worshipful, deity-like |

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose
- API key for Claude or OpenRouter

### Steps
```bash
# 1. Clone and navigate
git clone <repository-url>
cd bamboozled

# 2. Set up environment
cp .env.docker.example .env
# Edit .env and add your API key

# 3. Create data directory
mkdir -p data

# 4. Start the application
docker-compose up -d

# 5. Access the web chat
open http://localhost:3000
```

That's it! The system is now running with:
- Frontend at http://localhost:3000
- Backend API at http://localhost:3001
- Health check at http://localhost:3001/health

## 💻 Development Setup (Without Docker)

### Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your API keys
npm run dev  # Starts on port 3001
```

### Frontend
```bash
cd web-chat
npm install
npm run dev  # Starts on port 3000
```

## 🔧 AI Provider Configuration

### Using Claude (Anthropic)
```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Using OpenRouter (Recommended for Testing)
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

**OpenRouter benefits:**
- 🎯 Access 100+ models through one API
- 💰 Often cheaper than direct API access
- 🔄 Switch models instantly
- 📊 Built-in usage tracking

**Quick setup:** `./setup-openrouter.sh`

See [OPENROUTER.md](./OPENROUTER.md) for complete guide.

### Using Ollama (Free & Private - Runs Locally)
```env
AI_PROVIDER=local
LOCAL_MODEL_URL=http://localhost:11434
LOCAL_MODEL_NAME=llama3.2
```

**Ollama benefits:**
- 🆓 Completely free
- 🔒 100% private (runs on your machine)
- ⚡ Fast responses (no API calls)
- 📡 Works offline

**Quick setup:** `./setup-ollama.sh`

See [OLLAMA.md](./OLLAMA.md) for complete guide.

**Switch providers anytime** by changing the env variable and restarting!

## 📝 Available Commands

In the web chat, type:
- `/puzzle` - View current puzzle
- `/stats` - View your statistics and mood tier
- `/leaderboard` - View weekly leaderboard
- `/alltime` - View all-time leaderboard
- `/botmood` - Check bot's attitude and progress to next tier
- `/help` - Show all commands

Or just type your guess directly!

## 📂 Project Structure

```
bamboozled/
├── backend/              # Node.js/TypeScript/Fastify server
│   ├── src/
│   │   ├── config/      # Environment configuration
│   │   ├── db/          # Database schema, migrations, repositories
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic (user, puzzle, mood, stats)
│   │   └── websocket/   # WebSocket chat handler
│   └── Dockerfile       # Backend container
├── web-chat/            # React/Vite/Tailwind frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # WebSocket, localStorage
│   │   └── lib/         # Utilities
│   ├── Dockerfile       # Frontend container
│   └── nginx.conf       # Production nginx config
├── puzzles/             # Puzzle data and images
│   ├── puzzle-data.json # Puzzle definitions
│   └── images/          # Puzzle images
├── .beads/              # Issue tracking database (Beads)
├── docker-compose.yml   # Multi-container orchestration
└── DEPLOYMENT.md        # Deployment guide
```

## 🛠️ Technology Stack

**Backend:**
- Node.js 20 with TypeScript
- Fastify (web framework)
- Kysely (SQL query builder)
- SQLite (database)
- @anthropic-ai/sdk (Claude integration)
- @fastify/websocket (real-time communication)

**Frontend:**
- React 18
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)
- Native WebSocket API

**Infrastructure:**
- Docker & Docker Compose
- Nginx (frontend production server)

## 📚 Documentation

- [Product Requirements Document](./bamboozled-prd.md) - Full feature specifications
- [Deployment Guide](./DEPLOYMENT.md) - AWS, Docker, production setup
- [AI Agent Instructions](./AGENTS.md) - Issue tracking with Beads

## 🗂️ Issue Tracking

This project uses [Beads](https://github.com/steveyegge/beads) for issue tracking:
```bash
bd ready           # Show ready work
bd list            # List all issues
bd create "title"  # Create new issue
```

## 🧪 Testing

Access the web chat at http://localhost:3000 and try:
1. Enter your name
2. Type `/puzzle` to see the current puzzle
3. Make a guess (the bot will validate it with AI)
4. Watch your mood tier evolve as you solve puzzles!
5. Try commands like `/stats` and `/botmood`

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- AWS ECS/Fargate deployment
- AWS EC2 deployment
- Production best practices
- Database backups
- Monitoring setup

## 🤝 Contributing

This is a personal project, but issues and suggestions are welcome!

## 📄 License

MIT
