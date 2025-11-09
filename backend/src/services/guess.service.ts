import { GuessRepository } from '../db/repositories/guess.repository.js';
import { PuzzleService } from './puzzle.service.js';
import { UserService } from './user.service.js';
import { MoodService } from './mood.service.js';
import { StatsService } from './stats.service.js';
import { GiphyService } from './giphy.service.js';
import type { AIProvider } from '../types/index.js';
import type { Guess } from '../db/schema.js';

export interface SubmitGuessResult {
  isCorrect: boolean;
  message: string;
  guess: Guess;
  tierChanged?: boolean;
  oldTier?: number;
  newTier?: number;
  gifUrl?: string;
  showLeaderboard?: boolean;
}

export class GuessService {
  private guessRepository: GuessRepository;
  private puzzleService: PuzzleService;
  private userService: UserService;
  private moodService: MoodService;
  private statsService: StatsService;
  private giphyService: GiphyService;
  private aiProvider: AIProvider;

  constructor(aiProvider: AIProvider) {
    this.guessRepository = new GuessRepository();
    this.puzzleService = new PuzzleService();
    this.userService = new UserService();
    this.moodService = new MoodService();
    this.statsService = new StatsService();
    this.giphyService = new GiphyService();
    this.aiProvider = aiProvider;
  }

  /**
   * Submit a guess for the active puzzle
   */
  async submitGuess(userId: string, guessText: string): Promise<SubmitGuessResult> {
    // Get active puzzle
    const activePuzzle = await this.puzzleService.getActivePuzzle();
    if (!activePuzzle) {
      throw new Error('No active puzzle available');
    }

    // Get user
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has already solved this puzzle
    const alreadySolved = await this.statsService.hasUserSolvedPuzzle(userId, activePuzzle.puzzle_id);
    if (alreadySolved) {
      return {
        isCorrect: false,
        message: "You've already solved this puzzle! Wait for the next one.",
        guess: {} as Guess
      };
    }

    // Get guess number
    const previousGuesses = await this.guessRepository.getUserGuessesForPuzzle(userId, activePuzzle.puzzle_id);
    const guessNumber = previousGuesses.length + 1;

    // Validate answer with AI
    const validation = await this.aiProvider.validateAnswer({
      correctAnswer: activePuzzle.answer,
      userGuess: guessText
    });

    // Record guess
    const guess = await this.guessRepository.create({
      user_id: userId,
      puzzle_id: activePuzzle.puzzle_id,
      guess_text: guessText,
      is_correct: validation.is_correct ? 1 : 0,
      guess_number: guessNumber,
      mood_tier_at_time: user.mood_tier
    });

    // Get current stats for AI context
    const stats = await this.statsService.getUserStats(userId);
    const streak = stats?.current_streak || 0;
    const totalSolves = stats?.total_solves || 0;
    const firstPlaceFinishes = stats?.first_place_finishes || 0;

    // Generate AI response
    const aiResponse = await this.aiProvider.generateResponse({
      moodTier: user.mood_tier,
      streak,
      totalSolves,
      isCorrect: validation.is_correct,
      guessNumber,
      userName: user.display_name,
      firstPlaceCount: firstPlaceFinishes,
      correctedAnswer: validation.corrected_answer
    });

    let tierChanged = false;
    let oldTier = user.mood_tier;
    let newTier = user.mood_tier;
    let gifUrl: string | undefined;

    // If correct, update mood tier, get GIF, and check for tier changes
    if (validation.is_correct) {
      const moodUpdate = await this.moodService.updateMoodTierAfterSolve(userId);
      tierChanged = moodUpdate.tierChanged;
      oldTier = moodUpdate.oldTier;
      newTier = moodUpdate.newTier;

      // Fetch celebration GIF based on mood tier
      gifUrl = await this.giphyService.getMoodTierCelebrationGif(newTier);
    }

    return {
      isCorrect: validation.is_correct,
      message: aiResponse.message,
      guess,
      tierChanged,
      oldTier,
      newTier,
      gifUrl,
      showLeaderboard: validation.is_correct
    };
  }

  /**
   * Get user's guesses for a puzzle
   */
  async getUserGuessesForPuzzle(userId: string, puzzleId: string): Promise<Guess[]> {
    return this.guessRepository.getUserGuessesForPuzzle(userId, puzzleId);
  }

  /**
   * Get user's guesses for active puzzle
   */
  async getUserGuessesForActivePuzzle(userId: string): Promise<Guess[]> {
    const activePuzzle = await this.puzzleService.getActivePuzzle();
    if (!activePuzzle) {
      return [];
    }

    return this.guessRepository.getUserGuessesForPuzzle(userId, activePuzzle.puzzle_id);
  }
}
