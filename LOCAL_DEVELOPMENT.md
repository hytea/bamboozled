# Local Development Guide

## 🎯 User Authentication Improvements

We've fixed the local user identification issues! Here's what changed:

### What Was Fixed

**Before:**
- Frontend generated UUID but never sent it to backend
- Backend generated its own userId, causing session issues
- Clearing localStorage would create a new user even with same display name
- No error handling for duplicate usernames
- No session recovery

**After:**
- ✅ Frontend sends UUID to backend for proper session management
- ✅ Backend accepts and uses frontend UUID
- ✅ Session recovery across page refreshes and reconnects
- ✅ Clear error messages for taken usernames
- ✅ Username validation (empty, too long, special characters)
- ✅ Display name changes supported
- ✅ Comprehensive tests for all auth flows

### User Flows

#### New User
1. User enters username in UI
2. Frontend generates UUID, stores in localStorage
3. Both userId and userName sent to backend
4. Backend validates username is available
5. Creates new user with frontend's UUID
6. User stats tracked with this UUID

#### Returning User (Same Browser)
1. Frontend loads userId from localStorage
2. Sends userId + userName to backend
3. Backend finds existing user by userId
4. Session recovered with all stats intact

#### LocalStorage Cleared
1. Frontend generates new UUID
2. User enters same username
3. Backend finds user by display name
4. Returns existing user data
5. Frontend updates localStorage with correct userId
6. Stats preserved!

### Error Handling

**Duplicate Username:**
```
Error: The username "Alice" is already taken. Please choose a different username.
```

**Empty Username:**
```
Error: Please enter a username
```

**Username Too Long:**
```
Error: Username must be 50 characters or less
```

## 🚀 Running Locally

### Option 1: Docker (Recommended)

```bash
# Copy environment file
cp .env.docker.example .env

# Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env

# Start everything
docker-compose up --build

# Visit http://localhost:3000
```

### Option 2: Manual Setup

**Terminal 1 (Backend):**
```bash
cd backend
npm install
cp ../.env.example .env
# Add your API key to .env
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd web-chat
npm install
npm run dev
```

Visit http://localhost:5173

## 🧪 Testing

### Run All Tests
```bash
# Using Docker
./test-runner.sh all

# Or manually
cd backend && npm test
cd web-chat && npm test
```

### Test User Auth Flows
```bash
cd backend
npm test -- websocket/__tests__/chat.handler.test.ts
```

Tests cover:
- New user creation with frontend UUID
- Session recovery with same userId
- Display name conflict detection
- Username validation
- LocalStorage clear scenarios
- Display name changes
- Edge cases (special characters, rapid reconnects, etc.)

## 🔍 Debugging

### Check Backend Logs
```bash
# Docker
docker-compose logs -f backend

# Manual
# Check terminal running backend
```

### Check Frontend Console
Open browser DevTools → Console

Look for:
- WebSocket connection status
- userId stored in localStorage
- userName stored in localStorage

### Inspect Database
```bash
# Docker
docker-compose exec backend npm run db:health

# Manual
cd backend
npm run db:health
```

## 🐛 Troubleshooting

### "Display name already taken" error
This means someone else (or you in another browser) is using that name.
- Try a different username, OR
- Use the same browser/device to recover your session

### "Please refresh the page" error
This happens if userId is missing.
- Refresh the page
- Clear localStorage and reconnect
- Check browser console for errors

### WebSocket disconnects
- Check backend is running (port 3001)
- Check frontend proxy config in vite.config.ts
- Verify CORS settings in backend/src/index.ts

### Database issues
```bash
# Reset database (WARNING: deletes all data!)
cd backend
npm run db:migrate:fresh

# Or start fresh with Docker
docker-compose down -v
docker-compose up --build
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,        -- Format: web_<uuid> or slack_<id>
  display_name TEXT UNIQUE,        -- Unique username
  slack_user_id TEXT,
  mood_tier INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  hint_coins INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Session Flow
1. User connects → userId generated or loaded from localStorage
2. Backend checks if userId exists in database
3. If exists → recover session (return user data)
4. If not exists → check if display_name exists
5. If display_name taken → return error
6. If available → create new user with provided userId

## 🎨 User Experience Improvements

### Before
- Confusing errors
- Lost sessions on page refresh
- No feedback when username taken
- Stats reset randomly

### After
- Clear error messages with red alert styling
- Persistent sessions across refreshes
- Helpful feedback for all error cases
- Stats always preserved
- Username validation on frontend and backend

## 🔐 Security Notes

For local development:
- No password required (simple username-based auth)
- userId stored in browser localStorage
- Display names must be unique (enforced by database)

For production:
- Consider adding OAuth (Google, GitHub, etc.)
- Or username/password with bcrypt hashing
- Add rate limiting for auth attempts
- Add CAPTCHA for signup

## 📝 Development Tips

### Quick DB Commands
```bash
cd backend

# Check data
npm run db:health

# Reset and seed
npm run db:migrate:fresh
npm run db:seed

# Minimal seed (fast)
npm run db:seed:minimal

# Export backup
npm run db:export

# Import backup
npm run db:import backup.json
```

### Environment Variables
```bash
# Backend (.env in backend/)
ANTHROPIC_API_KEY=sk-ant-your-key
AI_PROVIDER=claude
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/bamboozled.db
RESET_DB=false  # Set to true to wipe DB on startup

# Frontend (no .env needed)
# Uses Vite proxy to connect to backend
```

### Hot Reload
Both frontend and backend support hot reload:
- Backend: Changes to TypeScript files restart server
- Frontend: Changes to React files update instantly

## 🎉 Next Steps

Now that local development is flawless:
1. ✅ User identification works perfectly
2. ✅ Error handling is clear and helpful
3. ✅ Tests ensure everything works
4. 🚀 Deploy to AWS using `./deploy.sh` (see DEPLOYMENT_AWS.md)
5. 🤖 Set up Slack bot (see DEPLOYMENT_AWS.md)

Happy coding! 🧩
