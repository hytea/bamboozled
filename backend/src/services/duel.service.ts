import { DuelRepository } from '../db/repositories/duel.repository.js';
import { UserService } from './user.service.js';
import { PuzzleService } from './puzzle.service.js';
import { GuessRepository } from '../db/repositories/guess.repository.js';
import { AchievementService, type AchievementUnlock } from './achievement.service.js';
import type { AIProvider } from '../types/index.js';
import type { Duel, Puzzle } from '../db/schema.js';

export interface CreateDuelResult {
  success: boolean;
  message: string;
  duel?: Duel;
  puzzle?: Puzzle;
}

export interface DuelGuessResult {
  isCorrect: boolean;
  message: string;
  duelCompleted: boolean;
  winner?: string;
  winnerId?: string;
  achievements?: AchievementUnlock[];
}

export interface DuelStats {
  total_duels: number;
  wins: number;
  losses: number;
  win_rate: number;
  active: number;
  pending: number;
  consecutive_wins: number;
}

export class DuelService {
  private duelRepository: DuelRepository;
  private userService: UserService;
  private puzzleService: PuzzleService;
  private guessRepository: GuessRepository;
  private achievementService: AchievementService;
  private aiProvider: AIProvider;

  constructor(aiProvider: AIProvider) {
    this.duelRepository = new DuelRepository();
    this.userService = new UserService();
    this.puzzleService = new PuzzleService();
    this.guessRepository = new GuessRepository();
    this.achievementService = new AchievementService();
    this.aiProvider = aiProvider;
  }

  /**
   * Create a new duel challenge
   */
  async createChallenge(
    challengerId: string,
    opponentSlackUserId: string,
    coinsWagered: number = 0
  ): Promise<CreateDuelResult> {
    // Get challenger
    const challenger = await this.userService.getUserById(challengerId);
    if (!challenger) {
      return { success: false, message: 'Challenger not found' };
    }

    // Get opponent by Slack user ID
    const opponent = await this.userService.getUserBySlackId(opponentSlackUserId);
    if (!opponent) {
      return { success: false, message: 'Opponent not found. They may need to play the game first!' };
    }

    // Check if challenging yourself
    if (challenger.user_id === opponent.user_id) {
      return { success: false, message: "You can't challenge yourself! Pick a worthy opponent." };
    }

    // Check if opponent has pending challenges
    const existingPending = await this.duelRepository.findPendingDuelForOpponent(opponent.user_id);
    if (existingPending) {
      return {
        success: false,
        message: `<@${opponentSlackUserId}> already has a pending challenge. Let them respond first!`
      };
    }

    // Check if either user has an active duel
    const challengerActiveDuel = await this.duelRepository.findActiveDuelForUser(challengerId);
    if (challengerActiveDuel) {
      return { success: false, message: "You're already in an active duel! Finish it first." };
    }

    const opponentActiveDuel = await this.duelRepository.findActiveDuelForUser(opponent.user_id);
    if (opponentActiveDuel) {
      return {
        success: false,
        message: `<@${opponentSlackUserId}> is already in an active duel. Challenge them later!`
      };
    }

    // Check coin balance if wagering
    if (coinsWagered > 0) {
      if (challenger.hint_coins < coinsWagered) {
        return {
          success: false,
          message: `You don't have enough hint coins! You have ${challenger.hint_coins}, but need ${coinsWagered}.`
        };
      }
      if (opponent.hint_coins < coinsWagered) {
        return {
          success: false,
          message: `<@${opponentSlackUserId}> doesn't have enough hint coins for that wager.`
        };
      }
    }

    // Get a random past puzzle for the duel (not the active weekly puzzle)
    const allPuzzles = await this.puzzleService.getAllPuzzles();
    const activePuzzle = await this.puzzleService.getActivePuzzle();

    // Filter out the active puzzle
    const availablePuzzles = allPuzzles.filter(p => p.puzzle_id !== activePuzzle?.puzzle_id);

    if (availablePuzzles.length === 0) {
      return { success: false, message: 'No puzzles available for duels yet!' };
    }

    // Randomly select a puzzle
    const randomPuzzle = availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)];

    // Create the duel
    const duel = await this.duelRepository.create({
      challenger_id: challengerId,
      opponent_id: opponent.user_id,
      puzzle_id: randomPuzzle.puzzle_id,
      status: 'PENDING',
      coins_wagered: coinsWagered,
      winner_id: null,
      challenger_solve_time: null,
      opponent_solve_time: null,
      started_at: null,
      completed_at: null
    });

    return {
      success: true,
      message: `Challenge sent to <@${opponentSlackUserId}>!`,
      duel,
      puzzle: randomPuzzle
    };
  }

  /**
   * Accept a duel challenge
   */
  async acceptChallenge(duelId: string, userId: string): Promise<CreateDuelResult> {
    const duel = await this.duelRepository.findById(duelId);
    if (!duel) {
      return { success: false, message: 'Duel not found' };
    }

    if (duel.opponent_id !== userId) {
      return { success: false, message: 'Only the challenged player can accept this duel' };
    }

    if (duel.status !== 'PENDING') {
      return { success: false, message: 'This challenge is no longer pending' };
    }

    // Accept the duel
    const updatedDuel = await this.duelRepository.acceptDuel(duelId);
    const puzzle = await this.puzzleService.getPuzzleById(duel.puzzle_id);

    return {
      success: true,
      message: 'Challenge accepted! The duel begins now!',
      duel: updatedDuel,
      puzzle: puzzle || undefined
    };
  }

  /**
   * Decline a duel challenge
   */
  async declineChallenge(duelId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const duel = await this.duelRepository.findById(duelId);
    if (!duel) {
      return { success: false, message: 'Duel not found' };
    }

    if (duel.opponent_id !== userId) {
      return { success: false, message: 'Only the challenged player can decline this duel' };
    }

    if (duel.status !== 'PENDING') {
      return { success: false, message: 'This challenge is no longer pending' };
    }

    await this.duelRepository.declineDuel(duelId);

    return {
      success: true,
      message: 'Challenge declined'
    };
  }

  /**
   * Submit a guess for an active duel
   */
  async submitDuelGuess(userId: string, guessText: string): Promise<DuelGuessResult | null> {
    // Find active duel for user
    const duel = await this.duelRepository.findActiveDuelForUser(userId);
    if (!duel) {
      return null; // No active duel
    }

    // Get the puzzle
    const puzzle = await this.puzzleService.getPuzzleById(duel.puzzle_id);
    if (!puzzle) {
      throw new Error('Duel puzzle not found');
    }

    // Check if user already solved this duel puzzle
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate the answer using AI
    const validation = await this.aiProvider.validateAnswer({
      correctAnswer: puzzle.answer,
      userGuess: guessText
    });

    // Get guess number for this duel puzzle
    const previousGuesses = await this.guessRepository.getUserGuessesForPuzzle(userId, puzzle.puzzle_id);
    const guessNumber = previousGuesses.length + 1;

    // Record the guess
    await this.guessRepository.create({
      user_id: userId,
      puzzle_id: puzzle.puzzle_id,
      guess_text: guessText,
      is_correct: validation.is_correct ? 1 : 0,
      guess_number: guessNumber,
      mood_tier_at_time: user.mood_tier
    });

    if (!validation.is_correct) {
      // Generate AI response for incorrect guess
      const aiResponse = await this.aiProvider.generateResponse({
        moodTier: user.mood_tier,
        streak: 0,
        totalSolves: 0,
        isCorrect: false,
        guessNumber,
        userName: user.display_name,
        firstPlaceCount: 0
      });

      return {
        isCorrect: false,
        message: aiResponse.message || 'Not quite! Try again.',
        duelCompleted: false
      };
    }

    // Correct answer! Record solve time
    const solveTime = new Date();
    await this.duelRepository.recordSolveTime(duel.duel_id, userId, solveTime);

    // Check if opponent has also solved
    const updatedDuel = await this.duelRepository.findById(duel.duel_id);
    if (!updatedDuel) {
      throw new Error('Duel not found after update');
    }

    // Determine if duel is complete
    if (updatedDuel.challenger_solve_time && updatedDuel.opponent_solve_time) {
      // Both solved - determine winner by time
      const challengerTime = new Date(updatedDuel.challenger_solve_time).getTime();
      const opponentTime = new Date(updatedDuel.opponent_solve_time).getTime();

      const winnerId = challengerTime < opponentTime ? updatedDuel.challenger_id : updatedDuel.opponent_id;
      const loserId = winnerId === updatedDuel.challenger_id ? updatedDuel.opponent_id : updatedDuel.challenger_id;

      // Complete the duel
      await this.duelRepository.completeDuel(duel.duel_id, winnerId);

      // Award coins if wagered
      if (updatedDuel.coins_wagered > 0) {
        const winner = await this.userService.getUserById(winnerId);
        const loser = await this.userService.getUserById(loserId);

        if (winner && loser) {
          await this.userService.updateHintCoins(winnerId, winner.hint_coins + updatedDuel.coins_wagered);
          await this.userService.updateHintCoins(loserId, loser.hint_coins - updatedDuel.coins_wagered);
        }
      }

      // Check for achievements
      const achievements = await this.achievementService.checkAndAwardDuelAchievements(userId);

      // Get winner name
      const winner = await this.userService.getUserById(winnerId);

      // Generate AI response for correct guess
      const correctAiResponse = await this.aiProvider.generateResponse({
        moodTier: user.mood_tier,
        streak: 0,
        totalSolves: 0,
        isCorrect: true,
        guessNumber,
        userName: user.display_name,
        firstPlaceCount: 0
      });

      return {
        isCorrect: true,
        message: correctAiResponse.message || 'Correct!',
        duelCompleted: true,
        winner: winner?.display_name,
        winnerId,
        achievements
      };
    } else {
      // Only one person solved so far
      // Generate AI response for correct guess
      const waitingAiResponse = await this.aiProvider.generateResponse({
        moodTier: user.mood_tier,
        streak: 0,
        totalSolves: 0,
        isCorrect: true,
        guessNumber,
        userName: user.display_name,
        firstPlaceCount: 0
      });

      return {
        isCorrect: true,
        message: waitingAiResponse.message || 'Correct! Waiting for your opponent to solve...',
        duelCompleted: false
      };
    }
  }

  /**
   * Get duel status
   */
  async getDuelStatus(duelId: string): Promise<Duel | null> {
    const duel = await this.duelRepository.findById(duelId);
    return duel || null;
  }

  /**
   * Get user's recent duels
   */
  async getUserDuels(userId: string, limit: number = 10): Promise<Duel[]> {
    return this.duelRepository.findDuelsForUser(userId, limit);
  }

  /**
   * Get user's duel statistics
   */
  async getUserDuelStats(userId: string): Promise<DuelStats> {
    const stats = await this.duelRepository.getUserDuelStats(userId);
    const consecutiveWins = await this.duelRepository.getConsecutiveWins(userId);

    const win_rate = stats.total_duels > 0
      ? Math.round((stats.wins / stats.total_duels) * 100)
      : 0;

    return {
      ...stats,
      win_rate,
      consecutive_wins: consecutiveWins
    };
  }

  /**
   * Cancel a duel (for challenger only if still pending)
   */
  async cancelChallenge(duelId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const duel = await this.duelRepository.findById(duelId);
    if (!duel) {
      return { success: false, message: 'Duel not found' };
    }

    if (duel.challenger_id !== userId) {
      return { success: false, message: 'Only the challenger can cancel this challenge' };
    }

    if (duel.status !== 'PENDING') {
      return { success: false, message: 'Can only cancel pending challenges' };
    }

    await this.duelRepository.cancelDuel(duelId);

    return {
      success: true,
      message: 'Challenge cancelled'
    };
  }
}
