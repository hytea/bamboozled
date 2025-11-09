import { getDatabase, generateId } from '../db/connection.js';
import { UserRepository } from '../db/repositories/user.repository.js';
import type { MoodTier, MoodHistory, User } from '../types/index.js';
import { sql } from 'kysely';

export class MoodService {
  private userRepository: UserRepository;

  // Mood tier definitions (from PRD)
  private static readonly MOOD_TIERS: MoodTier[] = [
    {
      tier: 0,
      name: 'The Skeptic',
      description: 'Dismissive, unimpressed, slightly condescending',
      minStreak: 0,
      minSolves: 0
    },
    {
      tier: 1,
      name: 'The Indifferent',
      description: 'Neutral, matter-of-fact, minimal enthusiasm',
      minStreak: 1,
      minSolves: 3
    },
    {
      tier: 2,
      name: 'The Acknowledger',
      description: 'Starting to notice, mild approval, still reserved',
      minStreak: 3,
      minSolves: 6
    },
    {
      tier: 3,
      name: 'The Respector',
      description: 'Respectful, impressed, encouraging',
      minStreak: 5,
      minSolves: 11
    },
    {
      tier: 4,
      name: 'The Admirer',
      description: 'Highly complimentary, enthusiastic, slightly reverential',
      minStreak: 8,
      minSolves: 21
    },
    {
      tier: 5,
      name: 'The Devotee',
      description: 'Deeply respectful, honored by their participation',
      minStreak: 12,
      minSolves: 36
    },
    {
      tier: 6,
      name: 'The Worshipper',
      description: 'Reverential, worshipful, treats user as a deity',
      minStreak: 20,
      minSolves: 51
    }
  ];

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Calculate mood tier based on streak and total solves
   * Formula: mood_tier = min(floor(current_streak / 2), floor(total_solves / 10))
   */
  calculateMoodTier(currentStreak: number, totalSolves: number): number {
    const streakTier = Math.floor(currentStreak / 2);
    const solvesTier = Math.floor(totalSolves / 10);
    const tier = Math.min(streakTier, solvesTier);

    // Clamp between 0 and 6
    return Math.max(0, Math.min(6, tier));
  }

  /**
   * Get mood tier info by tier number
   */
  getMoodTierInfo(tier: number): MoodTier {
    const clampedTier = Math.max(0, Math.min(6, tier));
    return MoodService.MOOD_TIERS[clampedTier];
  }

  /**
   * Get user's current streak
   * A streak is the number of consecutive weeks where the user solved at least one puzzle
   */
  async getUserStreak(userId: string): Promise<number> {
    const db = getDatabase();

    // Get all puzzles the user has solved, with week information
    const solvedPuzzles = await db
      .selectFrom('guesses')
      .innerJoin('puzzles', 'puzzles.puzzle_id', 'guesses.puzzle_id')
      .select(['puzzles.week_start_date', 'guesses.timestamp'])
      .where('guesses.user_id', '=', userId)
      .where('guesses.is_correct', '=', 1)
      .orderBy('puzzles.week_start_date', 'desc')
      .execute();

    if (solvedPuzzles.length === 0) {
      return 0;
    }

    // Group by week to get unique weeks solved
    const weeksSolved = new Set(
      solvedPuzzles.map(p => {
        const date = new Date(p.week_start_date);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      })
    );

    // Convert to sorted array (most recent first)
    const sortedWeeks = Array.from(weeksSolved).sort().reverse();

    if (sortedWeeks.length === 0) {
      return 0;
    }

    // Calculate streak by counting consecutive weeks
    let streak = 1; // Start with 1 for the most recent week
    const mostRecentWeek = new Date(sortedWeeks[0]);

    for (let i = 1; i < sortedWeeks.length; i++) {
      const currentWeek = new Date(sortedWeeks[i]);
      const expectedPreviousWeek = new Date(mostRecentWeek);
      expectedPreviousWeek.setDate(expectedPreviousWeek.getDate() - (7 * i));

      // Allow some tolerance (within 3 days) for week boundaries
      const daysDiff = Math.abs(
        (expectedPreviousWeek.getTime() - currentWeek.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 10) {
        // Week is consecutive (within tolerance)
        streak++;
      } else {
        // Gap found, break streak
        break;
      }
    }

    return streak;
  }

  /**
   * Get user's total solves
   */
  async getUserTotalSolves(userId: string): Promise<number> {
    const db = getDatabase();

    const result = await db
      .selectFrom('guesses')
      .select(sql<number>`COUNT(DISTINCT puzzle_id)`.as('count'))
      .where('user_id', '=', userId)
      .where('is_correct', '=', 1)
      .executeTakeFirst();

    return result?.count || 0;
  }

  /**
   * Update user's mood tier after a solve
   */
  async updateMoodTierAfterSolve(userId: string): Promise<{ user: User; tierChanged: boolean; oldTier: number; newTier: number }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const oldTier = user.mood_tier;
    const streak = await this.getUserStreak(userId);
    const totalSolves = await this.getUserTotalSolves(userId);
    const newTier = this.calculateMoodTier(streak, totalSolves);

    // Update best streak if current streak exceeds it
    await this.updateBestStreak(userId, streak);

    if (newTier !== oldTier) {
      // Update user's mood tier
      const updatedUser = await this.userRepository.updateMoodTier(userId, newTier);

      // Record mood history
      await this.recordMoodHistory({
        user_id: userId,
        old_tier: oldTier,
        new_tier: newTier,
        reason: newTier > oldTier ? 'TIER_UP' : 'SOLVE',
        streak_at_change: streak,
        total_solves_at_change: totalSolves
      });

      return {
        user: updatedUser,
        tierChanged: true,
        oldTier,
        newTier
      };
    }

    return {
      user,
      tierChanged: false,
      oldTier,
      newTier
    };
  }

  /**
   * Update user's best streak if current streak is higher
   */
  async updateBestStreak(userId: string, currentStreak: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (currentStreak > user.best_streak) {
      const db = getDatabase();
      await db
        .updateTable('users')
        .set({ best_streak: currentStreak })
        .where('user_id', '=', userId)
        .execute();
    }
  }

  /**
   * Handle streak break (reduces mood tier)
   */
  async handleStreakBreak(userId: string, totalSolves: number): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const oldTier = user.mood_tier;
    let newTier: number;

    // Determine new tier based on total solves (from PRD)
    if (totalSolves <= 5) {
      newTier = 0; // Skeptic
    } else if (totalSolves <= 15) {
      newTier = 1; // Indifferent
    } else {
      newTier = 2; // Acknowledger (respect for historical performance)
    }

    if (newTier !== oldTier) {
      const updatedUser = await this.userRepository.updateMoodTier(userId, newTier);

      // Record mood history
      await this.recordMoodHistory({
        user_id: userId,
        old_tier: oldTier,
        new_tier: newTier,
        reason: 'STREAK_BREAK',
        streak_at_change: 0,
        total_solves_at_change: totalSolves
      });

      return updatedUser;
    }

    return user;
  }

  /**
   * Record mood history
   */
  private async recordMoodHistory(data: Omit<MoodHistory, 'mood_history_id' | 'timestamp'>): Promise<void> {
    const db = getDatabase();
    const id = generateId();

    await db
      .insertInto('mood_history')
      .values({
        mood_history_id: id,
        ...data,
        timestamp: new Date().toISOString()
      })
      .execute();
  }

  /**
   * Get mood history for a user
   */
  async getUserMoodHistory(userId: string): Promise<MoodHistory[]> {
    const db = getDatabase();

    const history = await db
      .selectFrom('mood_history')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('timestamp', 'desc')
      .execute();

    return history as MoodHistory[];
  }

  /**
   * Get progress to next tier
   */
  async getProgressToNextTier(userId: string): Promise<{
    currentTier: MoodTier;
    nextTier: MoodTier | null;
    streak: number;
    totalSolves: number;
    streaksNeeded: number;
    solvesNeeded: number;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const streak = await this.getUserStreak(userId);
    const totalSolves = await this.getUserTotalSolves(userId);
    const currentTier = this.getMoodTierInfo(user.mood_tier);

    if (user.mood_tier >= 6) {
      return {
        currentTier,
        nextTier: null,
        streak,
        totalSolves,
        streaksNeeded: 0,
        solvesNeeded: 0
      };
    }

    const nextTier = this.getMoodTierInfo(user.mood_tier + 1);
    const streaksNeeded = Math.max(0, nextTier.minStreak - streak);
    const solvesNeeded = Math.max(0, nextTier.minSolves - totalSolves);

    return {
      currentTier,
      nextTier,
      streak,
      totalSolves,
      streaksNeeded,
      solvesNeeded
    };
  }
}
