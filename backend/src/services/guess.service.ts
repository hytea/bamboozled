import { GuessRepository } from '../db/repositories/guess.repository.js';
import { PuzzleService } from './puzzle.service.js';
import { UserService } from './user.service.js';
import { MoodService } from './mood.service.js';
import { StatsService } from './stats.service.js';
import { GiphyService } from './giphy.service.js';
import { AchievementService, type AchievementUnlock } from './achievement.service.js';
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
  achievements?: AchievementUnlock[];
}

export class GuessService {
  private guessRepository: GuessRepository;
  private puzzleService: PuzzleService;
  private userService: UserService;
  private moodService: MoodService;
  private statsService: StatsService;
  private giphyService: GiphyService;
  private achievementService: AchievementService;
  private aiProvider: AIProvider;

  constructor(aiProvider: AIProvider) {
    this.guessRepository = new GuessRepository();
    this.puzzleService = new PuzzleService();
    this.userService = new UserService();
    this.moodService = new MoodService();
    this.statsService = new StatsService();
    this.giphyService = new GiphyService();
    this.achievementService = new AchievementService();
    this.aiProvider = aiProvider;
  }

  /**
   * Pre-validate that all significant words are present
   * Returns true if the guess has all required words (ignoring articles)
   */
  private hasAllSignificantWords(correctAnswer: string, userGuess: string): boolean {
    const articles = new Set(['a', 'an', 'the']);

    // Normalize and split into words
    const answerWords = correctAnswer.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0 && !articles.has(w));

    const guessWords = userGuess.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0 && !articles.has(w));

    // Every significant word from answer must have a match in guess
    // Allow for minor typos (Levenshtein distance <= 2)
    for (const answerWord of answerWords) {
      const hasMatch = guessWords.some(guessWord => {
        // Exact match
        if (answerWord === guessWord) return true;

        // Allow for minor character differences
        const distance = this.levenshteinDistance(answerWord, guessWord);
        return distance <= 2;
      });

      if (!hasMatch) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
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

    // Pre-validate: Check if all significant words are present
    const hasAllWords = this.hasAllSignificantWords(activePuzzle.answer, guessText);

    let validation;
    if (!hasAllWords) {
      // Reject immediately if missing significant words
      validation = {
        is_correct: false,
        confidence: 1.0,
        reasoning: `Missing required words. The complete answer is "${activePuzzle.answer}".`
      };
    } else {
      // All words present, validate with AI for final check (typos, etc.)
      validation = await this.aiProvider.validateAnswer({
        correctAnswer: activePuzzle.answer,
        userGuess: guessText
      });
    }

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
    let achievements: AchievementUnlock[] = [];

    // If correct, update mood tier, get GIF, check achievements, and check for tier changes
    if (validation.is_correct) {
      const moodUpdate = await this.moodService.updateMoodTierAfterSolve(userId);
      tierChanged = moodUpdate.tierChanged;
      oldTier = moodUpdate.oldTier;
      newTier = moodUpdate.newTier;

      // Fetch celebration GIF based on mood tier
      gifUrl = await this.giphyService.getMoodTierCelebrationGif(newTier);

      // Check and award achievements
      achievements = await this.achievementService.checkAndAwardAchievements(
        userId,
        activePuzzle.puzzle_id,
        guessNumber,
        new Date()
      );
    }

    return {
      isCorrect: validation.is_correct,
      message: aiResponse.message,
      guess,
      tierChanged,
      oldTier,
      newTier,
      gifUrl,
      showLeaderboard: validation.is_correct,
      achievements
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
