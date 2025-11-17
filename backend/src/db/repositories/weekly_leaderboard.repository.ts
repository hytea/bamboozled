import { getDatabase, generateId } from '../connection.js';
import type { WeeklyLeaderboard, NewWeeklyLeaderboard } from '../schema.js';

export class WeeklyLeaderboardRepository {
  /**
   * Save leaderboard entry
   */
  async create(data: Omit<NewWeeklyLeaderboard, 'leaderboard_id'>): Promise<WeeklyLeaderboard> {
    const db = getDatabase();
    const leaderboardId = generateId();

    const entry = await db
      .insertInto('weekly_leaderboards')
      .values({
        leaderboard_id: leaderboardId,
        ...data
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return entry;
  }

  /**
   * Get leaderboard entries for a specific week
   */
  async getByWeek(weekStartDate: string): Promise<WeeklyLeaderboard[]> {
    const db = getDatabase();
    return db
      .selectFrom('weekly_leaderboards')
      .selectAll()
      .where('week_start_date', '=', weekStartDate as any)
      .orderBy('rank', 'asc')
      .execute();
  }

  /**
   * Get leaderboard entries for a specific puzzle
   */
  async getByPuzzle(puzzleId: string): Promise<WeeklyLeaderboard[]> {
    const db = getDatabase();
    return db
      .selectFrom('weekly_leaderboards')
      .selectAll()
      .where('puzzle_id', '=', puzzleId)
      .orderBy('rank', 'asc')
      .execute();
  }

  /**
   * Check if leaderboard exists for a puzzle
   */
  async existsForPuzzle(puzzleId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .selectFrom('weekly_leaderboards')
      .select('leaderboard_id')
      .where('puzzle_id', '=', puzzleId)
      .limit(1)
      .executeTakeFirst();

    return result !== undefined;
  }

  /**
   * Delete all entries for a puzzle (in case we need to recalculate)
   */
  async deleteByPuzzle(puzzleId: string): Promise<void> {
    const db = getDatabase();
    await db
      .deleteFrom('weekly_leaderboards')
      .where('puzzle_id', '=', puzzleId)
      .execute();
  }

  /**
   * Get all weeks that have leaderboard data
   */
  async getAllWeeks(): Promise<string[]> {
    const db = getDatabase();
    const results = await db
      .selectFrom('weekly_leaderboards')
      .select('week_start_date')
      .distinct()
      .orderBy('week_start_date', 'desc')
      .execute();

    return results.map(r => r.week_start_date as unknown as string);
  }

  /**
   * Get user's first place finishes count
   */
  async getUserFirstPlaceCount(userId: string): Promise<number> {
    const db = getDatabase();
    const result = await db
      .selectFrom('weekly_leaderboards')
      .select(db.fn.count('leaderboard_id').as('count'))
      .where('user_id', '=', userId)
      .where('rank', '=', 1)
      .executeTakeFirst();

    return Number(result?.count || 0);
  }
}
