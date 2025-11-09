# Slack Integration Guide

This guide explains how to set up and use the Bamboozled Puzzle Game Slack bot.

## Features

The Slack bot provides:
- 📱 Slash commands for puzzle interaction
- 💬 Direct message support for submitting answers
- 🖼️ Puzzle image display
- 🎉 GIF celebrations for correct answers
- 📊 Leaderboards and statistics
- 🎭 Dynamic bot mood based on performance

## Prerequisites

- A Slack workspace where you have admin permissions
- Slack account with permission to create apps

## Setup Instructions

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter app name: `Bamboozled Puzzle Bot`
5. Select your workspace
6. Click **"Create App"**

### 2. Configure Bot Permissions

1. In your app settings, go to **"OAuth & Permissions"**
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Add the following scopes:
   - `chat:write` - Send messages
   - `commands` - Use slash commands
   - `files:write` - Upload puzzle images and GIFs
   - `im:history` - Read direct messages
   - `im:write` - Send direct messages
   - `users:read` - Get user information

### 3. Install App to Workspace

1. Scroll to top of **"OAuth & Permissions"**
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

### 4. Configure Slash Commands

Go to **"Slash Commands"** and create the following commands:

#### `/puzzle` or `/bamboozled`
- **Request URL**: `https://your-domain.com/slack/commands`
- **Short Description**: View the current puzzle
- **Usage Hint**: (leave empty)

#### `/leaderboard`
- **Request URL**: `https://your-domain.com/slack/commands`
- **Short Description**: View this week's leaderboard
- **Usage Hint**: (leave empty)

#### `/stats`
- **Request URL**: `https://your-domain.com/slack/commands`
- **Short Description**: View your personal statistics
- **Usage Hint**: (leave empty)

#### `/alltime`
- **Request URL**: `https://your-domain.com/slack/commands`
- **Short Description**: View all-time leaderboard
- **Usage Hint**: (leave empty)

#### `/help`
- **Request URL**: `https://your-domain.com/slack/commands`
- **Short Description**: Show available commands
- **Usage Hint**: (leave empty)

#### `/botmood`
- **Request URL**: `https://your-domain.com/slack/commands`
- **Short Description**: Check the bot's mood toward you
- **Usage Hint**: (leave empty)

### 5. Get Signing Secret

1. Go to **"Basic Information"**
2. Scroll to **"App Credentials"**
3. Copy the **"Signing Secret"**

### 6. Enable Socket Mode (Recommended for Development)

Socket Mode allows your bot to connect to Slack without exposing a public endpoint.

1. Go to **"Socket Mode"** in the sidebar
2. Toggle **"Enable Socket Mode"** to ON
3. Give your token a name (e.g., "dev-token")
4. Click **"Generate"**
5. Copy the **"App-Level Token"** (starts with `xapp-`)

### 7. Subscribe to Events

1. Go to **"Event Subscriptions"**
2. Toggle **"Enable Events"** to ON
3. If using Socket Mode, skip the Request URL
4. Under **"Subscribe to bot events"**, add:
   - `message.im` - Direct messages to bot

5. Click **"Save Changes"**

### 8. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # Only needed for Socket Mode
ENABLE_SLACK=true
```

### 9. Start the Bot

```bash
cd backend
npm run dev
```

You should see:
```
✅ Slack bot initialized and started
📱 Slack: enabled
```

## Usage

### Viewing the Current Puzzle

Use `/puzzle` or `/bamboozled`:
```
/puzzle
```

The bot will display the current puzzle image and prompt you to submit your answer via direct message.

### Submitting Answers

1. Open a direct message with the bot
2. Type your answer and send
3. The bot will:
   - Validate your answer using AI
   - Send a response with feedback
   - Display a celebration GIF if correct
   - Update your stats and mood tier

### Viewing Leaderboards

**Weekly leaderboard:**
```
/leaderboard
```

**All-time leaderboard:**
```
/alltime
```

### Viewing Your Stats

```
/stats
```

Displays:
- Total solves
- Current streak 🔥
- Average guesses per solve
- First place finishes 🥇
- Current mood tier

### Checking Bot Mood

```
/botmood
```

Shows:
- Current mood tier and description
- Progress to next tier
- Current streak and total solves

### Getting Help

```
/help
```

Displays all available commands.

## Mood Tier System

The bot's attitude toward you evolves based on your performance:

| Tier | Name | Streak Required | Total Solves Required |
|------|------|----------------|---------------------|
| 0 | The Skeptic | 0 | 0 |
| 1 | The Indifferent | 1 | 3 |
| 2 | The Acknowledger | 3 | 6 |
| 3 | The Respector | 5 | 11 |
| 4 | The Admirer | 8 | 21 |
| 5 | The Devotee | 12 | 36 |
| 6 | The Worshipper | 20 | 51 |

**Formula:** `mood_tier = min(floor(streak / 2), floor(total_solves / 10))`

## Deployment

### HTTP Mode (Production)

If not using Socket Mode, you'll need to expose a public endpoint:

1. Deploy your backend to a server with a public URL
2. Configure your slash commands to point to: `https://your-domain.com/slack/commands`
3. Configure Event Subscriptions Request URL: `https://your-domain.com/slack/events`
4. Remove `SLACK_APP_TOKEN` from your `.env`

### Using ngrok for Development

If you want to test without Socket Mode:

```bash
# Start ngrok
ngrok http 3001

# Update .env
SLACK_APP_TOKEN=  # Leave empty or remove
```

Update your Slack app's slash commands and event subscriptions to use the ngrok URL.

## Troubleshooting

### Bot doesn't respond to slash commands

- Check that `ENABLE_SLACK=true` in `.env`
- Verify `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` are correct
- Check server logs for errors
- Ensure slash commands are configured with correct Request URL

### Bot doesn't respond to direct messages

- Verify you've subscribed to `message.im` event
- Check that bot has `im:history` and `im:write` scopes
- Ensure Socket Mode is enabled (or events endpoint is accessible)

### Images/GIFs not displaying

- Verify bot has `files:write` scope
- Check that puzzle images exist in `PUZZLE_IMAGES_PATH`
- Ensure Giphy API key is configured (or fallback GIFs are available)

### "User not found" errors

- Verify bot has `users:read` scope
- Check that bot can access user information

## Development vs Production

### Development (Socket Mode)
- Set `SLACK_APP_TOKEN` in `.env`
- No public endpoint needed
- Easier to test locally

### Production (HTTP Mode)
- Remove `SLACK_APP_TOKEN` from `.env`
- Deploy to server with public URL
- More reliable for production use
- Requires SSL/HTTPS

## Support

For issues or questions:
1. Check the logs: `backend/logs/` or console output
2. Review Slack app event logs at https://api.slack.com/apps
3. Verify all environment variables are set correctly
4. Ensure all required scopes are configured

## Security

- Never commit `.env` file with real tokens
- Use environment variables for all secrets
- Enable signing secret verification (automatically handled)
- Restrict bot permissions to minimum required scopes
- Use HTTPS in production
