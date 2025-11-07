# Bamboozled Quick Start Guide

Get the Bamboozled Puzzle Game up and running in 5 minutes!

## 🚀 Fastest Way (Docker)

```bash
# 1. Set up environment
cp .env.docker.example .env
# Edit .env and add your AI API key (Claude or OpenRouter)

# 2. Create data directory
mkdir -p data

# 3. Start everything
docker-compose up -d

# 4. Open in browser
open http://localhost:3000
```

**Done!** The system is now running with:
- Web Chat: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## 💻 Development Mode

### Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your API key
npm run dev  # Runs on port 3001
```

### Frontend (in a new terminal)
```bash
cd web-chat
npm install
npm run dev  # Runs on port 3000
```

## 🔑 Getting Your API Key

### Option 1: Claude (Anthropic)
1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to "API Keys"
4. Create a new key
5. Add to `.env`:
```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Option 2: OpenRouter (Free/Alternative Models)
1. Go to https://openrouter.ai/
2. Create an account or sign in
3. Go to "Keys" section
4. Create a new key
5. Add to `.env`:
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

## 🎮 Using the Web Chat

1. **Enter your name** when prompted
2. **Type `/help`** to see all commands
3. **Try these commands:**
   - `/puzzle` - View the current puzzle
   - `/stats` - See your statistics and mood tier
   - `/leaderboard` - View weekly rankings
   - `/botmood` - Check bot's attitude toward you

4. **Make a guess** by typing your answer directly
5. **Watch the bot respond** with personality based on your mood tier!

## 🧩 Adding Puzzles

1. Edit `puzzles/puzzle-data.json`:
```json
{
  "key": "puzzle-1",
  "answer": "head over heels",
  "imagePath": "puzzle-1.png"
}
```

2. Add puzzle image to `puzzles/images/puzzle-1.png`

3. Restart backend:
```bash
docker-compose restart backend
# or if running locally: npm run dev
```

## 🎭 Understanding Mood Tiers

The bot's personality evolves as you solve more puzzles:

| Tier | Name | Personality |
|------|------|-------------|
| 0 | The Skeptic | Dismissive 😒 |
| 1 | The Indifferent | Neutral 😐 |
| 2 | The Acknowledger | Starting to approve 🙂 |
| 3 | The Respector | Respectful 😊 |
| 4 | The Admirer | Enthusiastic 🤩 |
| 5 | The Devotee | Reverential 🙏 |
| 6 | The Worshipper | Deity-like treatment 👑 |

**How to level up:**
- Solve puzzles consistently
- Maintain weekly streaks
- The more you solve, the more the bot respects you!

## 🎉 GIF Celebrations

When you get a correct answer:
- Bot sends a mood-tier appropriate celebration GIF
- Higher tiers = more impressive GIFs
- Works with Giphy API (optional) or fallback GIFs

To enable Giphy:
```env
GIPHY_API_KEY=your-giphy-api-key
```
Get free API key at: https://developers.giphy.com/

## 🔄 Switching AI Providers

Want to switch from Claude to OpenRouter?

1. Edit `.env`:
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-new-key
```

2. Restart:
```bash
docker-compose restart backend
```

That's it! The system automatically uses the new provider.

## 🐛 Troubleshooting

### Backend won't start
- Check API key in `.env`
- Make sure port 3001 is free
- View logs: `docker-compose logs backend`

### Frontend won't connect
- Make sure backend is running
- Check browser console for errors
- Try clearing browser cache

### No puzzles showing
- Check `puzzles/puzzle-data.json` exists
- Make sure puzzle images are in `puzzles/images/`
- View backend logs: `docker-compose logs backend`

### WebSocket connection fails
- Check firewall settings
- Make sure ports 3000 and 3001 are accessible
- Restart both services: `docker-compose restart`

## 📊 Viewing Stats

Check your progress anytime:
- `/stats` - Personal statistics
- `/botmood` - See mood tier progress
- `/leaderboard` - Weekly rankings
- `/alltime` - All-time leaderboard

## 🛑 Stopping the Application

```bash
docker-compose down
```

Or to also remove volumes:
```bash
docker-compose down -v
```

## 📚 Need More Help?

- [Full README](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Product Requirements](./bamboozled-prd.md)

## 🎯 Quick Tips

1. **Test with multiple users** - Open multiple browser windows
2. **Watch mood tier evolve** - Solve puzzles to see personality change
3. **Try wrong answers** - See how bot responds based on your tier
4. **Check leaderboard** - Compete with others for fastest solve
5. **Use Docker** - Easier than managing Node.js environments

Happy puzzling! 🧩✨
