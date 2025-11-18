import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { UserService } from '../services/user.service.js';
import { PuzzleService } from '../services/puzzle.service.js';
import { StatsService } from '../services/stats.service.js';
import { MoodService } from '../services/mood.service.js';
import { GuessService } from '../services/guess.service.js';
import { HintService } from '../services/hint.service.js';
import type { AIProvider } from '../types/index.js';

interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  userId?: string;
  timestamp?: string;
  metadata?: {
    imageUrl?: string;
    isCommand?: boolean;
    moodTier?: number;
  };
}

interface IncomingMessage {
  type: 'message' | 'command' | 'init';
  content: string;
  userId?: string;
  userName?: string;
}

interface InitResult {
  success: boolean;
  user?: any;
  error?: string;
  errorType?: 'DISPLAY_NAME_TAKEN' | 'USER_ID_MISMATCH' | 'INVALID_INPUT';
}

/**
 * Initialize user with proper validation and session recovery
 */
async function initializeUser(
  message: IncomingMessage,
  userService: UserService,
  fastify: FastifyInstance
): Promise<InitResult> {
  const { userId, userName } = message;

  // Validate input
  if (!userName || userName.trim().length === 0) {
    return {
      success: false,
      error: 'Please enter a username',
      errorType: 'INVALID_INPUT'
    };
  }

  if (userName.trim().length > 50) {
    return {
      success: false,
      error: 'Username must be 50 characters or less',
      errorType: 'INVALID_INPUT'
    };
  }

  const cleanUserName = userName.trim();

  // Case 1: Frontend provided a userId (session recovery)
  if (userId && userId.trim().length > 0) {
    const existingUser = await userService.getUserById(userId);

    if (existingUser) {
      // Session recovery: user exists with this ID
      fastify.log.info({ userId, existingDisplayName: existingUser.display_name, requestedDisplayName: cleanUserName }, 'Session recovery for existing user');

      // Check if they're trying to change their display name
      if (existingUser.display_name !== cleanUserName) {
        // Check if new display name is available
        const isAvailable = await userService.isDisplayNameAvailable(cleanUserName);
        if (!isAvailable) {
          return {
            success: false,
            error: `The username "${cleanUserName}" is already taken. Your username is "${existingUser.display_name}".`,
            errorType: 'DISPLAY_NAME_TAKEN'
          };
        }

        // Update display name
        const updatedUser = await userService.updateDisplayName(userId, cleanUserName);
        fastify.log.info({ userId, oldName: existingUser.display_name, newName: cleanUserName }, 'Updated display name for existing user');
        return { success: true, user: updatedUser };
      }

      // Same display name, just return existing user
      return { success: true, user: existingUser };
    } else {
      // User ID doesn't exist yet, create new user with provided ID
      fastify.log.info({ userId, userName: cleanUserName }, 'Creating new user with provided userId');

      // Check if display name is available
      const isAvailable = await userService.isDisplayNameAvailable(cleanUserName);
      if (!isAvailable) {
        return {
          success: false,
          error: `The username "${cleanUserName}" is already taken. Please choose a different username.`,
          errorType: 'DISPLAY_NAME_TAKEN'
        };
      }

      // Create user with the frontend-provided userId
      const newUser = await userService.createUserWithId(userId, cleanUserName);
      return { success: true, user: newUser };
    }
  }

  // Case 2: No userId provided, try to find by display name (legacy flow)
  const existingUserByName = await userService.getUserByDisplayName(cleanUserName);

  if (existingUserByName) {
    // Display name exists, return the existing user
    fastify.log.info({ userId: existingUserByName.user_id, displayName: cleanUserName }, 'Found existing user by display name');
    return { success: true, user: existingUserByName };
  }

  // Case 3: Create new user (no userId provided, display name doesn't exist)
  fastify.log.info({ userName: cleanUserName }, 'Creating new user without userId (legacy)');
  const newUser = await userService.getOrCreateUserByDisplayName(cleanUserName);
  return { success: true, user: newUser };
}

export function registerWebSocketHandler(fastify: FastifyInstance, aiProvider: AIProvider) {
  const userService = new UserService();
  const puzzleService = new PuzzleService();
  const statsService = new StatsService();
  const moodService = new MoodService();
  const guessService = new GuessService(aiProvider);
  const hintService = new HintService(aiProvider);

  fastify.get('/ws', { websocket: true }, (socket, request) => {
    fastify.log.info({ remoteAddress: request.socket.remoteAddress }, 'WebSocket connection established');
    fastify.log.info({ state: socket.readyState }, 'Initial socket state');

    socket.on('error', (error) => {
      fastify.log.error({ error }, 'WebSocket socket error');
      fastify.log.error({ state: socket.readyState }, 'Socket state during error');
    });

    socket.on('message', async (rawMessage: Buffer) => {
      try {
        fastify.log.info({ message: rawMessage.toString() }, 'Received WebSocket message');
        fastify.log.info({ state: socket.readyState }, 'Socket state before processing');

        let message: IncomingMessage;
        try {
          message = JSON.parse(rawMessage.toString());
        } catch (parseError) {
          fastify.log.error({ error: parseError }, 'Failed to parse JSON message');
          socket.send(JSON.stringify({
            type: 'bot',
            content: 'Error: Invalid message format',
            timestamp: new Date().toISOString()
          } as ChatMessage));
          return;
        }

        if (message.type === 'init') {
          fastify.log.info({ userName: message.userName, userId: message.userId }, 'Processing init message for user');

          try {
            // Initialize user with proper validation
            const initResult = await initializeUser(message, userService, fastify);

            if (!initResult.success) {
              // Send error message to client
              socket.send(JSON.stringify({
                type: 'error',
                content: initResult.error || 'Failed to initialize user',
                timestamp: new Date().toISOString(),
                metadata: { errorType: initResult.errorType }
              }));
              fastify.log.error({ error: initResult.error, errorType: initResult.errorType }, 'User initialization failed');
              return;
            }

            const user = initResult.user;
            fastify.log.info({ displayName: user.display_name, userId: user.user_id }, 'User initialized successfully');

            const response = JSON.stringify({
              type: 'bot',
              content: `Welcome, ${user.display_name}! Type your guess or use commands like /puzzle, /stats, /leaderboard, /botmood, /hint, /help`,
              timestamp: new Date().toISOString(),
              userId: user.user_id,
              metadata: { moodTier: user.mood_tier }
            } as ChatMessage);

            fastify.log.info({ state: socket.readyState }, 'Sending welcome message');

            if (socket.readyState === 1) { // 1 = OPEN
              socket.send(response);
              fastify.log.info({ state: socket.readyState }, 'Welcome message sent successfully');

              // Automatically send the current puzzle
              const puzzle = await puzzleService.getActivePuzzle();
              if (puzzle) {
                socket.send(JSON.stringify({
                  type: 'bot',
                  content: `Here's the current puzzle:`,
                  timestamp: new Date().toISOString(),
                  metadata: {
                    imageUrl: `/api/puzzle/${puzzle.puzzle_id}/image`,
                    isCommand: true
                  }
                } as ChatMessage));
                fastify.log.info('Puzzle sent automatically after init');
              }
            } else {
              fastify.log.error({ state: socket.readyState }, 'Socket not in OPEN state, cannot send');
            }
          } catch (initError) {
            fastify.log.error({ error: initError }, 'Error during init processing');
            socket.send(JSON.stringify({
              type: 'error',
              content: 'An unexpected error occurred. Please try again.',
              timestamp: new Date().toISOString()
            }));
          }

          return;
        }

        if (message.type === 'command' || message.content.startsWith('/')) {
          if (!message.userId) {
            socket.send(JSON.stringify({
              type: 'bot',
              content: 'Error: User ID not found. Please refresh the page.',
              timestamp: new Date().toISOString()
            } as ChatMessage));
            return;
          }
          await handleCommand(socket, message, {
            userService,
            puzzleService,
            statsService,
            moodService,
            guessService,
            hintService
          });
        } else if (message.type === 'message') {
          if (!message.userId) {
            socket.send(JSON.stringify({
              type: 'bot',
              content: 'Error: User ID not found. Please refresh the page.',
              timestamp: new Date().toISOString()
            } as ChatMessage));
            return;
          }
          await handleGuess(socket, message, { guessService, statsService });
        }

        fastify.log.info({ state: socket.readyState }, 'Message processing complete');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        fastify.log.error(`WebSocket message error: ${errorMessage}`);
        fastify.log.error(`Error stack: ${errorStack}`);
        try {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify({
              type: 'bot',
              content: `Error: ${String(error)}`,
              timestamp: new Date().toISOString()
            } as ChatMessage));
          }
        } catch (sendError) {
          fastify.log.error({ error: sendError }, 'Failed to send error message');
        }
      }
    });

    socket.on('close', (code, reason) => {
      fastify.log.info({ code, reason: reason.toString() }, 'WebSocket connection closed');
    });

    socket.on('ping', () => {
      fastify.log.debug('WebSocket ping received');
    });

    socket.on('pong', () => {
      fastify.log.debug('WebSocket pong received');
    });
  });
}

async function handleCommand(
  socket: WebSocket,
  message: IncomingMessage,
  services: {
    userService: UserService;
    puzzleService: PuzzleService;
    statsService: StatsService;
    moodService: MoodService;
    guessService: GuessService;
    hintService: HintService;
  }
) {
  const command = message.content.toLowerCase().trim();

  if (command === '/puzzle' || command === '/bamboozled') {
    const puzzle = await services.puzzleService.getActivePuzzle();
    if (!puzzle) {
      socket.send(JSON.stringify({
        type: 'bot',
        content: 'No active puzzle available.',
        timestamp: new Date().toISOString()
      } as ChatMessage));
      return;
    }

    socket.send(JSON.stringify({
      type: 'bot',
      content: `Here's the current puzzle:`,
      timestamp: new Date().toISOString(),
      metadata: {
        imageUrl: `/api/puzzle/${puzzle.puzzle_id}/image`,
        isCommand: true
      }
    } as ChatMessage));
  } else if (command === '/stats') {
    const stats = await services.statsService.getUserStats(message.userId!);
    if (!stats) {
      socket.send(JSON.stringify({
        type: 'bot',
        content: 'Could not find your stats.',
        timestamp: new Date().toISOString()
      } as ChatMessage));
      return;
    }

    const content = `📊 Your Stats:
- Total Solves: ${stats.total_solves}
- Total Guesses: ${stats.total_guesses}
- Avg Guesses/Solve: ${stats.avg_guesses_per_solve.toFixed(2)}
- Current Streak: ${stats.current_streak} weeks
- Best Streak: ${stats.best_streak} weeks
- First Place Finishes: ${stats.first_place_finishes}
- Mood Tier: ${stats.mood_tier} (${stats.mood_tier_name})
- 💰 Hint Coins: ${stats.hint_coins}`;

    socket.send(JSON.stringify({
      type: 'bot',
      content,
      timestamp: new Date().toISOString(),
      metadata: { isCommand: true, moodTier: stats.mood_tier }
    } as ChatMessage));
  } else if (command === '/leaderboard') {
    const puzzle = await services.puzzleService.getActivePuzzle();
    const leaderboard = puzzle
      ? await services.statsService.getWeeklyLeaderboard(puzzle.puzzle_id)
      : [];

    if (leaderboard.length === 0) {
      socket.send(JSON.stringify({
        type: 'bot',
        content: 'No one has solved the puzzle yet. Be the first!',
        timestamp: new Date().toISOString()
      } as ChatMessage));
      return;
    }

    const content = `🏆 Weekly Leaderboard:\n${leaderboard
      .map((entry, i) => `${i + 1}. ${entry.display_name} - ${entry.total_guesses} guesses`)
      .join('\n')}`;

    socket.send(JSON.stringify({
      type: 'bot',
      content,
      timestamp: new Date().toISOString(),
      metadata: { isCommand: true }
    } as ChatMessage));
  } else if (command === '/alltime') {
    const leaderboard = await services.statsService.getAllTimeLeaderboard();

    if (leaderboard.length === 0) {
      socket.send(JSON.stringify({
        type: 'bot',
        content: 'No stats yet. Start solving puzzles!',
        timestamp: new Date().toISOString()
      } as ChatMessage));
      return;
    }

    const content = `🏅 All-Time Leaderboard:\n${leaderboard
      .slice(0, 10)
      .map((entry, i) => `${i + 1}. ${entry.display_name} - ${entry.total_solves} solves`)
      .join('\n')}`;

    socket.send(JSON.stringify({
      type: 'bot',
      content,
      timestamp: new Date().toISOString(),
      metadata: { isCommand: true }
    } as ChatMessage));
  } else if (command === '/botmood') {
    const progress = await services.moodService.getProgressToNextTier(message.userId!);

    const content = `🎭 Bot Mood Status:
Current Tier: ${progress.currentTier.tier} - ${progress.currentTier.name}
Description: ${progress.currentTier.description}

Your Progress:
- Streak: ${progress.streak} weeks
- Total Solves: ${progress.totalSolves}

${progress.nextTier
  ? `Next Tier: ${progress.nextTier.tier} - ${progress.nextTier.name}
Needed: ${progress.streaksNeeded} more streak weeks OR ${progress.solvesNeeded} more solves`
  : 'You\'ve reached the maximum tier! 🏆'}`;

    socket.send(JSON.stringify({
      type: 'bot',
      content,
      timestamp: new Date().toISOString(),
      metadata: { isCommand: true, moodTier: progress.currentTier.tier }
    } as ChatMessage));
  } else if (command.startsWith('/hint')) {
    const result = await services.hintService.requestHint(message.userId!);

    socket.send(JSON.stringify({
      type: 'bot',
      content: result.message,
      timestamp: new Date().toISOString(),
      metadata: { isCommand: true }
    } as ChatMessage));

    if (!result.success && result.error === 'INSUFFICIENT_COINS') {
      // Show hint costs
      const costs = services.hintService.getHintCosts();
      const costsContent = `💰 Hint Pricing:
${costs.map(c => `Level ${c.level}: ${c.cost} coins (${c.description})`).join('\n')}

Earn coins by solving puzzles! Bonuses for:
- First guess solve: +3 extra coins
- 3 or fewer guesses: +1 coin
- 5+ week streak: +1 coin
- 10+ week streak: +2 coins
- First place finish: +2 coins`;

      socket.send(JSON.stringify({
        type: 'bot',
        content: costsContent,
        timestamp: new Date().toISOString(),
        metadata: { isCommand: true }
      } as ChatMessage));
    }
  } else if (command === '/help') {
    const content = `📚 Available Commands:
/puzzle - View current puzzle
/leaderboard - View weekly leaderboard
/alltime - View all-time leaderboard
/stats - View your statistics
/botmood - Check bot's attitude toward you
/hint - Get a hint (costs coins!)
/help - Show this help message

Just type your answer to submit a guess!`;

    socket.send(JSON.stringify({
      type: 'bot',
      content,
      timestamp: new Date().toISOString(),
      metadata: { isCommand: true }
    } as ChatMessage));
  } else {
    socket.send(JSON.stringify({
      type: 'bot',
      content: `Unknown command. Type /help for available commands.`,
      timestamp: new Date().toISOString()
    } as ChatMessage));
  }
}

async function handleGuess(
  socket: WebSocket,
  message: IncomingMessage,
  services: { guessService: GuessService; statsService: StatsService }
) {
  const result = await services.guessService.submitGuess(message.userId!, message.content);

  // Send bot response
  socket.send(JSON.stringify({
    type: 'bot',
    content: result.message,
    timestamp: new Date().toISOString(),
    metadata: {
      moodTier: result.newTier
    }
  } as ChatMessage));

  // If correct, send celebration GIF
  if (result.isCorrect && result.gifUrl) {
    socket.send(JSON.stringify({
      type: 'bot',
      content: '🎉 Correct! 🎉',
      timestamp: new Date().toISOString(),
      metadata: {
        gifUrl: result.gifUrl,
        moodTier: result.newTier
      }
    } as ChatMessage));
  }

  // If tier changed, send tier up notification
  if (result.tierChanged && result.newTier !== undefined && result.oldTier !== undefined) {
    const moodService = new MoodService();
    const tierInfo = moodService.getMoodTierInfo(result.newTier);

    socket.send(JSON.stringify({
      type: 'bot',
      content: `🎉 Tier Up! You've reached ${tierInfo.name}! ${tierInfo.description}`,
      timestamp: new Date().toISOString(),
      metadata: { moodTier: result.newTier }
    } as ChatMessage));
  }

  // If correct and should show leaderboard, send leaderboard
  if (result.showLeaderboard && result.isCorrect) {
    const puzzle = await new PuzzleService().getActivePuzzle();
    if (puzzle) {
      const leaderboard = await services.statsService.getWeeklyLeaderboard(puzzle.puzzle_id);

      const content = `🏆 Weekly Leaderboard:\n${leaderboard
        .slice(0, 10)
        .map((entry, i) => `${i + 1}. ${entry.display_name} - ${entry.total_guesses} guesses`)
        .join('\n')}`;

      socket.send(JSON.stringify({
        type: 'bot',
        content,
        timestamp: new Date().toISOString()
      } as ChatMessage));
    }
  }
}
