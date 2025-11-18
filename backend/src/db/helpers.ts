import type { Kysely, Transaction } from 'kysely';
import type { Database } from './schema.js';

/**
 * Database Helpers
 *
 * Convenient utility functions for common database operations.
 * Makes it super easy for frontend engineers to work with the database!
 *
 * Features:
 * - Transaction management
 * - Date helpers (SQLite stores dates as text)
 * - Boolean helpers (SQLite stores booleans as 0/1)
 * - Common query patterns
 * - Type-safe wrappers
 */

/**
 * Transaction helper - Makes multi-table operations safe and atomic
 *
 * Example:
 *   await withTransaction(db, async (trx) => {
 *     await trx.insertInto('users').values({...}).execute();
 *     await trx.insertInto('mood_history').values({...}).execute();
 *   });
 */
export async function withTransaction<T>(
  db: Kysely<Database>,
  callback: (trx: Transaction<Database>) => Promise<T>
): Promise<T> {
  return await db.transaction().execute(callback);
}

/**
 * Date Helpers
 */
export const DateHelpers = {
  /**
   * Convert Date object to SQLite TEXT format (ISO 8601)
   */
  toDb(date: Date): string {
    return date.toISOString();
  },

  /**
   * Convert SQLite TEXT to Date object
   */
  fromDb(dateString: string): Date {
    return new Date(dateString);
  },

  /**
   * Get current timestamp for SQLite
   */
  now(): string {
    return new Date().toISOString();
  },

  /**
   * Get start of current week (Sunday)
   */
  weekStart(date: Date = new Date()): string {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  },

  /**
   * Get end of current week (Saturday)
   */
  weekEnd(date: Date = new Date()): string {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay() + 6);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  },

  /**
   * Check if two dates are in the same week
   */
  isSameWeek(date1: string | Date, date2: string | Date): boolean {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

    const week1 = this.weekStart(d1);
    const week2 = this.weekStart(d2);

    return week1 === week2;
  },

  /**
   * Add days to a date
   */
  addDays(date: Date, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  },

  /**
   * Format date for display
   */
  format(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Format datetime for display
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};

/**
 * Boolean Helpers (SQLite uses 0/1 for booleans)
 */
export const BoolHelpers = {
  /**
   * Convert boolean to SQLite INTEGER (0 or 1)
   */
  toDb(value: boolean): number {
    return value ? 1 : 0;
  },

  /**
   * Convert SQLite INTEGER to boolean
   */
  fromDb(value: number): boolean {
    return value === 1;
  },
};

/**
 * JSON Helpers for progress_data and other JSON fields
 */
export const JsonHelpers = {
  /**
   * Parse JSON string from database
   */
  parse<T = any>(jsonString: string | null): T | null {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return null;
    }
  },

  /**
   * Stringify object for database storage
   */
  stringify(obj: any): string {
    return JSON.stringify(obj);
  },

  /**
   * Create progress data for achievements
   */
  createProgressData(current: number, target: number, metadata?: any): string {
    return JSON.stringify({
      current,
      target,
      lastUpdated: DateHelpers.now(),
      ...metadata,
    });
  },

  /**
   * Update progress data
   */
  updateProgress(
    existingJson: string | null,
    current: number,
    target?: number
  ): string {
    const existing = this.parse(existingJson) || {};
    return JSON.stringify({
      ...existing,
      current,
      target: target ?? existing.target,
      lastUpdated: DateHelpers.now(),
    });
  },
};

/**
 * Common query patterns
 */
export const QueryHelpers = {
  /**
   * Get active puzzle
   */
  async getActivePuzzle(db: Kysely<Database>) {
    return await db
      .selectFrom('puzzles')
      .selectAll()
      .where('is_active', '=', 1)
      .executeTakeFirst();
  },

  /**
   * Get user's guesses for a puzzle
   */
  async getUserGuesses(
    db: Kysely<Database>,
    userId: string,
    puzzleId: string
  ) {
    return await db
      .selectFrom('guesses')
      .selectAll()
      .where('user_id', '=', userId)
      .where('puzzle_id', '=', puzzleId)
      .orderBy('timestamp', 'asc')
      .execute();
  },

  /**
   * Get user's achievement progress
   */
  async getUserAchievements(db: Kysely<Database>, userId: string) {
    return await db
      .selectFrom('user_achievements')
      .innerJoin(
        'achievements',
        'achievements.achievement_id',
        'user_achievements.achievement_id'
      )
      .selectAll()
      .where('user_id', '=', userId)
      .execute();
  },

  /**
   * Check if user has solved a puzzle
   */
  async hasSolved(
    db: Kysely<Database>,
    userId: string,
    puzzleId: string
  ): Promise<boolean> {
    const result = await db
      .selectFrom('guesses')
      .select('guess_id')
      .where('user_id', '=', userId)
      .where('puzzle_id', '=', puzzleId)
      .where('is_correct', '=', 1)
      .executeTakeFirst();

    return !!result;
  },

  /**
   * Get user's current streak
   */
  async getUserStreak(db: Kysely<Database>, userId: string): Promise<number> {
    // Get all solved puzzles with their week info
    const solvedPuzzles = await db
      .selectFrom('guesses')
      .innerJoin('puzzles', 'puzzles.puzzle_id', 'guesses.puzzle_id')
      .select(['puzzles.week_start_date', 'guesses.timestamp'])
      .where('guesses.user_id', '=', userId)
      .where('guesses.is_correct', '=', 1)
      .orderBy('puzzles.week_start_date', 'desc')
      .execute();

    if (solvedPuzzles.length === 0) return 0;

    // Group by week and count consecutive weeks
    const uniqueWeeks = new Set<string>();
    for (const puzzle of solvedPuzzles) {
      const weekStart = DateHelpers.weekStart(new Date(puzzle.week_start_date));
      uniqueWeeks.add(weekStart);
    }

    const sortedWeeks = Array.from(uniqueWeeks).sort().reverse();
    const currentWeek = DateHelpers.weekStart();

    let streak = 0;
    let expectedWeek = currentWeek;

    for (const week of sortedWeeks) {
      // Allow for a 10-day window (current week + grace period)
      const weekDate = new Date(week);
      const expectedDate = new Date(expectedWeek);
      const daysDiff = Math.abs(
        (weekDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 10) {
        streak++;
        // Move to previous week
        const prevWeek = new Date(expectedDate);
        prevWeek.setDate(prevWeek.getDate() - 7);
        expectedWeek = DateHelpers.weekStart(prevWeek);
      } else {
        break;
      }
    }

    return streak;
  },

  /**
   * Get total solves for a user
   */
  async getTotalSolves(db: Kysely<Database>, userId: string): Promise<number> {
    const result = await db
      .selectFrom('guesses')
      .innerJoin('puzzles', 'puzzles.puzzle_id', 'guesses.puzzle_id')
      .select(({ fn }) => [fn.countAll<number>().as('count')])
      .where('guesses.user_id', '=', userId)
      .where('guesses.is_correct', '=', 1)
      .groupBy('puzzles.puzzle_id')
      .execute();

    return result.length;
  },
};

/**
 * Validation helpers
 */
export const ValidationHelpers = {
  /**
   * Validate mood tier (0-6)
   */
  isValidMoodTier(tier: number): boolean {
    return Number.isInteger(tier) && tier >= 0 && tier <= 6;
  },

  /**
   * Validate achievement category
   */
  isValidAchievementCategory(category: string): boolean {
    return ['streak', 'solve', 'speed', 'efficiency', 'comeback', 'special'].includes(
      category
    );
  },

  /**
   * Validate achievement tier
   */
  isValidAchievementTier(tier: string): boolean {
    return ['bronze', 'silver', 'gold', 'platinum', 'legendary'].includes(tier);
  },

  /**
   * Validate puzzle difficulty
   */
  isValidDifficulty(difficulty: string): boolean {
    return ['EASY', 'MEDIUM', 'HARD'].includes(difficulty);
  },

  /**
   * Validate generated puzzle status
   */
  isValidPuzzleStatus(status: string): boolean {
    return ['PENDING', 'APPROVED', 'REJECTED'].includes(status);
  },

  /**
   * Validate mood change reason
   */
  isValidMoodReason(reason: string): boolean {
    return ['SOLVE', 'STREAK_BREAK', 'TIER_UP'].includes(reason);
  },
};

/**
 * Debugging helpers
 */
export const DebugHelpers = {
  /**
   * Get database statistics
   */
  async getStats(db: Kysely<Database>) {
    const [
      userCount,
      puzzleCount,
      guessCount,
      achievementCount,
      userAchievementCount,
    ] = await Promise.all([
      db
        .selectFrom('users')
        .select(({ fn }) => [fn.countAll<number>().as('count')])
        .executeTakeFirst(),
      db
        .selectFrom('puzzles')
        .select(({ fn }) => [fn.countAll<number>().as('count')])
        .executeTakeFirst(),
      db
        .selectFrom('guesses')
        .select(({ fn }) => [fn.countAll<number>().as('count')])
        .executeTakeFirst(),
      db
        .selectFrom('achievements')
        .select(({ fn }) => [fn.countAll<number>().as('count')])
        .executeTakeFirst(),
      db
        .selectFrom('user_achievements')
        .select(({ fn }) => [fn.countAll<number>().as('count')])
        .executeTakeFirst(),
    ]);

    return {
      users: userCount?.count || 0,
      puzzles: puzzleCount?.count || 0,
      guesses: guessCount?.count || 0,
      achievements: achievementCount?.count || 0,
      userAchievements: userAchievementCount?.count || 0,
    };
  },

  /**
   * Pretty print database stats
   */
  async printStats(db: Kysely<Database>) {
    const stats = await this.getStats(db);

    console.log('\n📊 Database Statistics\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Users:             ${stats.users}`);
    console.log(`Puzzles:           ${stats.puzzles}`);
    console.log(`Guesses:           ${stats.guesses}`);
    console.log(`Achievements:      ${stats.achievements}`);
    console.log(`User Achievements: ${stats.userAchievements}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  },
};

/**
 * Export all helpers as a single object for convenience
 */
export const DbHelpers = {
  transaction: withTransaction,
  date: DateHelpers,
  bool: BoolHelpers,
  json: JsonHelpers,
  query: QueryHelpers,
  validate: ValidationHelpers,
  debug: DebugHelpers,
};

/**
 * Example usage:
 *
 * import { DbHelpers } from './db/helpers.js';
 *
 * // Use transaction
 * await DbHelpers.transaction(db, async (trx) => {
 *   // Your queries here
 * });
 *
 * // Date helpers
 * const weekStart = DbHelpers.date.weekStart();
 * const formatted = DbHelpers.date.format('2025-01-01T00:00:00.000Z');
 *
 * // Boolean helpers
 * const isActive = DbHelpers.bool.toDb(true); // 1
 *
 * // Query helpers
 * const puzzle = await DbHelpers.query.getActivePuzzle(db);
 * const streak = await DbHelpers.query.getUserStreak(db, userId);
 *
 * // Debug helpers
 * await DbHelpers.debug.printStats(db);
 */
