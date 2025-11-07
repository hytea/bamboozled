import type { FastifyInstance } from 'fastify';
import { UserService } from '../services/user.service.js';
import { PuzzleService } from '../services/puzzle.service.js';
import { StatsService } from '../services/stats.service.js';
import { MoodService } from '../services/mood.service.js';
import { GuessService } from '../services/guess.service.js';
import type { AIProvider } from '../types/index.js';

export async function registerApiRoutes(fastify: FastifyInstance, aiProvider: AIProvider) {
  const userService = new UserService();
  const puzzleService = new PuzzleService();
  const statsService = new StatsService();
  const moodService = new MoodService();
  const guessService = new GuessService(aiProvider);

  // Get or create user
  fastify.post<{
    Body: { displayName: string; slackUserId?: string };
  }>('/api/users', async (request, reply) => {
    const { displayName, slackUserId } = request.body;

    try {
      let user;
      if (slackUserId) {
        user = await userService.getOrCreateUserBySlackId(slackUserId, displayName);
      } else {
        user = await userService.getOrCreateUserByDisplayName(displayName);
      }

      reply.send({ user });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  // Get active puzzle
  fastify.get('/api/puzzle/active', async (_request, reply) => {
    try {
      const puzzle = await puzzleService.getActivePuzzle();
      if (!puzzle) {
        reply.status(404).send({ error: 'No active puzzle' });
        return;
      }

      reply.send({ puzzle });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  // Get user stats
  fastify.get<{
    Params: { userId: string };
  }>('/api/stats/:userId', async (request, reply) => {
    try {
      const stats = await statsService.getUserStats(request.params.userId);
      if (!stats) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }

      reply.send({ stats });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  // Get weekly leaderboard
  fastify.get('/api/leaderboard/weekly', async (_request, reply) => {
    try {
      const puzzle = await puzzleService.getActivePuzzle();
      const leaderboard = puzzle
        ? await statsService.getWeeklyLeaderboard(puzzle.puzzle_id)
        : [];

      reply.send({ leaderboard });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  // Get all-time leaderboard
  fastify.get('/api/leaderboard/alltime', async (_request, reply) => {
    try {
      const leaderboard = await statsService.getAllTimeLeaderboard();
      reply.send({ leaderboard });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  // Get mood tier progress
  fastify.get<{
    Params: { userId: string };
  }>('/api/mood/:userId', async (request, reply) => {
    try {
      const progress = await moodService.getProgressToNextTier(request.params.userId);
      reply.send({ progress });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  // Submit guess
  fastify.post<{
    Body: { userId: string; guessText: string };
  }>('/api/guess', async (request, reply) => {
    const { userId, guessText } = request.body;

    try {
      const result = await guessService.submitGuess(userId, guessText);
      reply.send({ result });
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });

  // Get puzzle image
  fastify.get<{
    Params: { puzzleId: string };
  }>('/api/puzzle/:puzzleId/image', async (request, reply) => {
    try {
      const puzzle = await puzzleService.getPuzzleById(request.params.puzzleId);
      if (!puzzle) {
        reply.status(404).send({ error: 'Puzzle not found' });
        return;
      }

      const imagePath = puzzleService.getPuzzleImagePath(puzzle);
      if (!puzzleService.puzzleImageExists(puzzle)) {
        reply.status(404).send({ error: 'Image not found' });
        return;
      }

      // Send file using Fastify's sendFile (requires @fastify/static) or just read and send
      const fs = await import('fs');
      const imageBuffer = fs.readFileSync(imagePath);
      reply.type('image/png').send(imageBuffer);
    } catch (error) {
      reply.status(500).send({ error: String(error) });
    }
  });
}
