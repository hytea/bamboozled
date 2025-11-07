import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { loadConfig, getConfig } from './config/env.js';
import { createAIProvider } from './services/ai/factory.js';
import { initDatabase } from './db/init.js';
import { registerApiRoutes } from './routes/api.routes.js';
import { registerWebSocketHandler } from './websocket/chat.handler.js';

// Load configuration
loadConfig();
const config = getConfig();

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'development' ? 'info' : 'warn',
    transport: config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
  }
});

// Register plugins
await fastify.register(fastifyCors, {
  origin: true // Allow all origins in development
});

await fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: 1048576, // 1MB
    perMessageDeflate: false
  }
});

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider: config.AI_PROVIDER
  };
});

// Initialize AI provider and make it available globally
let aiProvider: Awaited<ReturnType<typeof createAIProvider>>;
try {
  aiProvider = await createAIProvider();
  fastify.log.info(`✅ AI Provider initialized: ${config.AI_PROVIDER}`);

  // Store in fastify context for access in routes
  fastify.decorate('aiProvider', aiProvider);

  // Register routes and WebSocket handler
  await registerApiRoutes(fastify, aiProvider);
  registerWebSocketHandler(fastify, aiProvider);

  fastify.log.info('✅ Routes and WebSocket handler registered');
} catch (error) {
  fastify.log.error(`❌ Failed to initialize AI provider: ${error}`);
  process.exit(1);
}

// Initialize database
async function initializeDatabase() {
  try {
    await initDatabase();
    fastify.log.info('✅ Database initialized');
  } catch (error) {
    fastify.log.error(`❌ Failed to initialize database: ${error}`);
    process.exit(1);
  }
}

// Load and activate puzzles
async function initializePuzzles() {
  try {
    const { PuzzleService } = await import('./services/puzzle.service.js');
    const puzzleService = new PuzzleService();

    // Load puzzles from file
    await puzzleService.loadPuzzlesFromFile();

    // Check if there's an active puzzle
    const activePuzzle = await puzzleService.getActivePuzzle();

    if (!activePuzzle) {
      // Get all puzzles and activate the first one
      const allPuzzles = await puzzleService.getAllPuzzles();
      if (allPuzzles.length > 0) {
        await puzzleService.activatePuzzleById(allPuzzles[0].puzzle_id);
        fastify.log.info(`✅ Activated puzzle: ${allPuzzles[0].puzzle_key}`);
      } else {
        fastify.log.warn('⚠️  No puzzles available to activate');
      }
    } else {
      fastify.log.info(`✅ Active puzzle: ${activePuzzle.puzzle_key}`);
    }
  } catch (error) {
    fastify.log.error(`❌ Failed to initialize puzzles: ${error}`);
    // Don't exit - just log the error
  }
}

// Start server
const start = async () => {
  try {
    // Initialize database first
    await initializeDatabase();

    // Load and activate puzzles
    await initializePuzzles();

    // Start listening
    await fastify.listen({
      port: config.PORT,
      host: '0.0.0.0'
    });

    fastify.log.info(`🚀 Server running on http://localhost:${config.PORT}`);
    fastify.log.info(`🎮 Environment: ${config.NODE_ENV}`);
    fastify.log.info(`🤖 AI Provider: ${config.AI_PROVIDER}`);
    fastify.log.info(`💬 Web Chat: ${config.ENABLE_WEB_CHAT ? 'enabled' : 'disabled'}`);
    fastify.log.info(`📱 Slack: ${config.ENABLE_SLACK ? 'enabled' : 'disabled'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
