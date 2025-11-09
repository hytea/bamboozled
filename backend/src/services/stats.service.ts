import { getDatabase } from '../db/connection.js';
import { GuessRepository } from '../db/repositories/guess.repository.js';
import { UserRepository } from '../db/repositories/user.repository.js';
import { WeeklyLeaderboardRepository } from '../db/repositories/weekly_leaderboard.repository.js';
import { MoodService } from './mood.service.js';
import type { UserStats, LeaderboardEntry } from '../types/index.js';
import { sql } from 'kysely';

export class StatsService {
  private guessRepository: GuessRepository;
  private userRepository: UserRepository;
  private weeklyLeaderboardRepository: WeeklyLeaderboardRepository;
  private moodService: MoodService;

  constructor() {
    this.guessRepository = new GuessRepository();
    this.userRepository = new UserRepository();
    this.weeklyLeaderboardRepository = new WeeklyLeaderboardRepository();
    this.moodService = new MoodService();
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return undefined;
    }

    const db = getDatabase();

    // Get total solves (unique puzzles solved)
    const totalSolvesResult = await db
      .selectFrom('guesses')
      .select(sql<number>`COUNT(DISTINCT puzzle_id)`.as('count'))
      .where('user_id', '=', userId)
      .where('is_correct', '=', 1)
      .executeTakeFirst();
    const totalSolves = totalSolvesResult?.count || 0;

    // Get total guesses
    const totalGuessesResult = await db
      .selectFrom('guesses')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();
    const totalGuesses = totalGuessesResult?.count || 0;

    // Get first place finishes
    const firstPlaceResult = await db
      .selectFrom('weekly_leaderboards')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('user_id', '=', userId)
      .where('rank', '=', 1)
      .executeTakeFirst();
    const firstPlaceFinishes = firstPlaceResult?.count || 0;

    // Calculate average guesses per solve
    const avgGuessesPerSolve = totalSolves > 0 ? totalGuesses / totalSolves : 0;

    // Get streak
    const currentStreak = await this.moodService.getUserStreak(userId);

    // Get best streak from user record
    const bestStreak = user.best_streak;

    // Get mood tier info
    const moodTierInfo = this.moodService.getMoodTierInfo(user.mood_tier);

    return {
      user_id: user.user_id,
      display_name: user.display_name,
      total_solves: totalSolves,
      total_guesses: totalGuesses,
      avg_guesses_per_solve: Math.round(avgGuessesPerSolve * 100) / 100,
      current_streak: currentStreak,
      best_streak: bestStreak,
      first_place_finishes: firstPlaceFinishes,
      mood_tier: user.mood_tier,
      mood_tier_name: moodTierInfo.name
    };
  }

  /**
   * Get weekly leaderboard for current active puzzle
   */
  async getWeeklyLeaderboard(puzzleId?: string): Promise<LeaderboardEntry[]> {
    const db = getDatabase();

    let query = db
      .selectFrom('guesses')
      .innerJoin('users', 'users.user_id', 'guesses.user_id')
      .select([
        'users.user_id',
        'users.display_name',
        sql<Date>`MIN(guesses.timestamp)`.as('solve_time'),
        sql<number>`COUNT(guesses.guess_id)`.as('total_guesses')
      ])
      .where('guesses.is_correct', '=', 1)
      .groupBy(['users.user_id', 'users.display_name'])
      .orderBy(sql`MIN(guesses.timestamp)`, 'asc');

    if (puzzleId) {
      query = query.where('guesses.puzzle_id', '=', puzzleId);
    }

    const results = await query.execute();

    // Add rank
    return results.map((result, index) => ({
      user_id: result.user_id,
      display_name: result.display_name,
      solve_time: result.solve_time,
      total_guesses: result.total_guesses,
      rank: index + 1
    }));
  }

  /**
   * Get all-time leaderboard
   */
  async getAllTimeLeaderboard(): Promise<Array<{
    user_id: string;
    display_name: string;
    total_solves: number;
    total_guesses: number;
    avg_guesses_per_solve: number;
    first_place_finishes: number;
    current_streak: number;
    rank: number;
  }>> {
    const users = await this.userRepository.getAll();
    const stats = await Promise.all(
      users.map(user => this.getUserStats(user.user_id))
    );

    // Filter out undefined and sort by total solves, then by avg guesses
    const validStats = stats.filter(s => s !== undefined) as UserStats[];
    validStats.sort((a, b) => {
      if (b.total_solves !== a.total_solves) {
        return b.total_solves - a.total_solves;
      }
      return a.avg_guesses_per_solve - b.avg_guesses_per_solve;
    });

    return validStats.map((stat, index) => ({
      ...stat,
      rank: index + 1
    }));
  }

  /**
   * Get user's guess count for a puzzle
   */
  async getUserGuessCountForPuzzle(userId: string, puzzleId: string): Promise<number> {
    const guesses = await this.guessRepository.getUserGuessesForPuzzle(userId, puzzleId);
    return guesses.length;
  }

  /**
   * Check if user has solved a puzzle
   */
  async hasUserSolvedPuzzle(userId: string, puzzleId: string): Promise<boolean> {
    return this.guessRepository.hasUserSolvedPuzzle(userId, puzzleId);
  }

  /**
   * Persist the current weekly leaderboard for a puzzle
   * This should be called when a puzzle becomes inactive or a week ends
   */
  async persistWeeklyLeaderboard(puzzleId: string, weekStartDate: string): Promise<void> {
    // Check if leaderboard already persisted for this puzzle
    const exists = await this.weeklyLeaderboardRepository.existsForPuzzle(puzzleId);
    if (exists) {
      console.log(`Leaderboard already persisted for puzzle ${puzzleId}`);
      return;
    }

    // Calculate the current leaderboard from guesses
    const leaderboard = await this.getWeeklyLeaderboard(puzzleId);

    // Persist each entry
    for (const entry of leaderboard) {
      await this.weeklyLeaderboardRepository.create({
        week_start_date: weekStartDate,
        user_id: entry.user_id,
        puzzle_id: puzzleId,
        solve_time: entry.solve_time instanceof Date
          ? entry.solve_time.toISOString()
          : String(entry.solve_time),
        total_guesses: entry.total_guesses,
        rank: entry.rank
      });
    }

    console.log(`✅ Persisted leaderboard for puzzle ${puzzleId} (${leaderboard.length} entries)`);
  }

  /**
   * Get weekly leaderboard from database (for historical weeks)
   * Returns persisted data if available, otherwise calculates from guesses
   */
  async getPersistedWeeklyLeaderboard(puzzleId: string): Promise<LeaderboardEntry[]> {
    // Check if persisted leaderboard exists
    const persistedEntries = await this.weeklyLeaderboardRepository.getByPuzzle(puzzleId);

    if (persistedEntries.length > 0) {
      // Return persisted data with user display names
      return Promise.all(
        persistedEntries.map(async (entry) => {
          const user = await this.userRepository.findById(entry.user_id);
          return {
            user_id: entry.user_id,
            display_name: user?.display_name || 'Unknown',
            solve_time: entry.solve_time,
            total_guesses: entry.total_guesses,
            rank: entry.rank
          };
        })
      );
    }

    // Fall back to calculating from guesses
    return this.getWeeklyLeaderboard(puzzleId);
  }

  /**
   * Get all weeks with leaderboard data
   */
  async getAvailableWeeks(): Promise<string[]> {
    return this.weeklyLeaderboardRepository.getAllWeeks();
  }
}
