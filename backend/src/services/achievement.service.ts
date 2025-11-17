import { getDatabase, generateId } from '../db/connection.js';
import type { Achievement, UserAchievement } from '../db/schema.js';
import { sql } from 'kysely';
import { MoodService } from './mood.service.js';

export interface AchievementUnlock {
  achievement: Achievement;
  isNew: boolean;
}

export interface UserAchievementWithDetails extends UserAchievement {
  achievement: Achievement;
}

export class AchievementService {
  private moodService: MoodService;

  constructor() {
    this.moodService = new MoodService();
  }

  /**
   * Check and award achievements after a correct guess
   */
  async checkAndAwardAchievements(
    userId: string,
    puzzleId: string,
    guessNumber: number,
    solveTime: Date
  ): Promise<AchievementUnlock[]> {
    const unlocked: AchievementUnlock[] = [];
    const db = getDatabase();

    // Get user stats
    const userStats = await this.getUserStatsForAchievements(userId);
    const user = await db.selectFrom('users').selectAll().where('user_id', '=', userId).executeTakeFirst();
    if (!user) return unlocked;

    // Get puzzle start time (when puzzle became active)
    const puzzle = await db.selectFrom('puzzles').selectAll().where('puzzle_id', '=', puzzleId).executeTakeFirst();
    if (!puzzle) return unlocked;

    const puzzleStartTime = new Date(puzzle.week_start_date);
    const solveTimeMs = solveTime.getTime() - puzzleStartTime.getTime();
    const solveTimeMinutes = solveTimeMs / (1000 * 60);

    // Get solve time of day
    const solveHour = solveTime.getHours();

    // Check achievements
    // Streak achievements
    if (userStats.totalSolves === 1) {
      await this.unlockAchievement(userId, 'streak_first_blood', unlocked);
    }
    if (userStats.currentStreak === 3) {
      await this.unlockAchievement(userId, 'streak_hat_trick', unlocked);
    }
    if (userStats.currentStreak === 7) {
      await this.unlockAchievement(userId, 'streak_week_warrior', unlocked);
    }
    if (userStats.currentStreak === 15) {
      await this.unlockAchievement(userId, 'streak_unstoppable', unlocked);
    }
    if (userStats.currentStreak === 25) {
      await this.unlockAchievement(userId, 'streak_legendary', unlocked);
    }

    // Solve count achievements
    if (userStats.totalSolves === 5) {
      await this.unlockAchievement(userId, 'solve_rookie', unlocked);
    }
    if (userStats.totalSolves === 20) {
      await this.unlockAchievement(userId, 'solve_veteran', unlocked);
    }
    if (userStats.totalSolves === 50) {
      await this.unlockAchievement(userId, 'solve_master', unlocked);
    }
    if (userStats.totalSolves === 100) {
      await this.unlockAchievement(userId, 'solve_legend', unlocked);
    }

    // Speed achievements
    if (solveTimeMinutes < 1) {
      await this.unlockAchievement(userId, 'speed_flash', unlocked);
    }
    if (solveTimeMinutes < 5) {
      await this.unlockAchievement(userId, 'speed_speedrun', unlocked);
    }
    if (userStats.firstPlaceFinishes === 5) {
      await this.unlockAchievement(userId, 'speed_quick_draw', unlocked);
    }

    // Efficiency achievements
    if (guessNumber === 1) {
      await this.unlockAchievement(userId, 'efficiency_one_shot', unlocked);
    }

    // Check sharp shooter (10 puzzles with 3 or fewer guesses)
    const lowGuessCount = await db
      .selectFrom('guesses')
      .select(sql<number>`COUNT(DISTINCT puzzle_id)`.as('count'))
      .where('user_id', '=', userId)
      .where('is_correct', '=', 1)
      .where('guess_number', '<=', 3)
      .executeTakeFirst();
    if (lowGuessCount?.count && lowGuessCount.count >= 10) {
      await this.unlockAchievement(userId, 'efficiency_sharp', unlocked);
    }

    // Check sniper (average 2 guesses or less)
    if (userStats.totalSolves >= 10 && userStats.avgGuessesPerSolve <= 2.0) {
      await this.unlockAchievement(userId, 'efficiency_sniper', unlocked);
    }

    // Comeback achievements - check if this is a new streak after breaking one
    if (userStats.currentStreak === 5 && userStats.bestStreak > 5) {
      await this.unlockAchievement(userId, 'comeback_phoenix', unlocked);
    }
    if (userStats.currentStreak === userStats.bestStreak && userStats.bestStreak >= 5) {
      // Check if they previously had this streak and lost it
      const hadLostStreak = await db
        .selectFrom('mood_history')
        .where('user_id', '=', userId)
        .where('reason', '=', 'STREAK_BREAK')
        .where('streak_at_change', '>=', userStats.bestStreak)
        .executeTakeFirst();
      if (hadLostStreak) {
        await this.unlockAchievement(userId, 'comeback_redemption', unlocked);
      }
    }

    // Special achievements
    if (solveHour >= 23 || solveHour < 3) {
      await this.unlockAchievement(userId, 'special_night_owl', unlocked);
    }
    if (solveHour >= 5 && solveHour < 7) {
      await this.unlockAchievement(userId, 'special_early_bird', unlocked);
    }
    if (guessNumber === 13) {
      await this.unlockAchievement(userId, 'special_lucky13', unlocked);
    }
    if (user.mood_tier === 6) {
      await this.unlockAchievement(userId, 'special_perfectionist', unlocked);
    }
    if (guessNumber >= 10) {
      await this.unlockAchievement(userId, 'special_comeback_kid', unlocked);
    }
    if (userStats.totalGuesses >= 100) {
      await this.unlockAchievement(userId, 'special_century_club', unlocked);
    }

    return unlocked;
  }

  /**
   * Track leaderboard view (for social butterfly achievement)
   */
  async trackLeaderboardView(userId: string): Promise<AchievementUnlock[]> {
    const db = getDatabase();
    const unlocked: AchievementUnlock[] = [];

    // Get or create progress data for social butterfly
    const existing = await db
      .selectFrom('user_achievements')
      .innerJoin('achievements', 'achievements.achievement_id', 'user_achievements.achievement_id')
      .selectAll()
      .where('user_achievements.user_id', '=', userId)
      .where('achievements.achievement_key', '=', 'SOCIAL_BUTTERFLY')
      .executeTakeFirst();

    if (existing) {
      // Already unlocked
      return unlocked;
    }

    // Track progress
    // For simplicity, we'll count leaderboard entries instead of tracking actual views
    // This is a placeholder - in production you'd want to track actual view events
    const leaderboardChecks = await db
      .selectFrom('weekly_leaderboards')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const views = leaderboardChecks?.count || 0;

    if (views >= 25) {
      await this.unlockAchievement(userId, 'special_social_butterfly', unlocked);
    }

    return unlocked;
  }

  /**
   * Unlock an achievement for a user
   */
  private async unlockAchievement(
    userId: string,
    achievementId: string,
    unlocked: AchievementUnlock[]
  ): Promise<void> {
    const db = getDatabase();

    // Check if already unlocked
    const existing = await db
      .selectFrom('user_achievements')
      .innerJoin('achievements', 'achievements.achievement_id', 'user_achievements.achievement_id')
      .selectAll()
      .where('user_achievements.user_id', '=', userId)
      .where('achievements.achievement_id', '=', achievementId)
      .executeTakeFirst();

    if (existing) {
      return; // Already unlocked
    }

    // Get achievement details
    const achievement = await db
      .selectFrom('achievements')
      .selectAll()
      .where('achievement_id', '=', achievementId)
      .executeTakeFirst();

    if (!achievement) {
      console.error(`Achievement ${achievementId} not found`);
      return;
    }

    // Award achievement
    await db
      .insertInto('user_achievements')
      .values({
        user_achievement_id: generateId(),
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
        progress_data: null
      })
      .execute();

    unlocked.push({
      achievement,
      isNew: true
    });

    console.log(`🏆 User ${userId} unlocked achievement: ${achievement.name}`);
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<UserAchievementWithDetails[]> {
    const db = getDatabase();

    const rows = await db
      .selectFrom('user_achievements')
      .innerJoin('achievements', 'achievements.achievement_id', 'user_achievements.achievement_id')
      .selectAll()
      .where('user_achievements.user_id', '=', userId)
      .orderBy('user_achievements.unlocked_at', 'desc')
      .execute();

    // Transform the flat joined result into the desired structure
    return rows.map(row => ({
      user_achievement_id: row.user_achievement_id,
      user_id: row.user_id,
      achievement_id: row.achievement_id,
      unlocked_at: row.unlocked_at,
      progress_data: row.progress_data,
      achievement: {
        achievement_id: row.achievement_id,
        achievement_key: row.achievement_key,
        name: row.name,
        description: row.description,
        emoji: row.emoji,
        category: row.category,
        tier: row.tier,
        is_secret: row.is_secret,
        created_at: row.created_at
      }
    })) as UserAchievementWithDetails[];
  }

  /**
   * Get all available achievements (for discovery)
   */
  async getAllAchievements(includeSecret: boolean = false): Promise<Achievement[]> {
    const db = getDatabase();

    let query = db.selectFrom('achievements').selectAll().orderBy('tier').orderBy('category');

    if (!includeSecret) {
      query = query.where('is_secret', '=', 0);
    }

    return await query.execute();
  }

  /**
   * Get achievement progress for a user
   */
  async getAchievementProgress(userId: string): Promise<{
    unlocked: number;
    total: number;
    percentage: number;
    byCategory: Record<string, { unlocked: number; total: number }>;
  }> {
    const db = getDatabase();

    const totalAchievements = await db
      .selectFrom('achievements')
      .select(sql<number>`COUNT(*)`.as('count'))
      .executeTakeFirst();
    const total = totalAchievements?.count || 0;

    const unlockedAchievements = await db
      .selectFrom('user_achievements')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();
    const unlocked = unlockedAchievements?.count || 0;

    // Get by category
    const categories = ['streak', 'solve', 'speed', 'efficiency', 'comeback', 'special'];
    const byCategory: Record<string, { unlocked: number; total: number }> = {};

    for (const category of categories) {
      const totalInCategory = await db
        .selectFrom('achievements')
        .select(sql<number>`COUNT(*)`.as('count'))
        .where('category', '=', category as any)
        .executeTakeFirst();

      const unlockedInCategory = await db
        .selectFrom('user_achievements')
        .innerJoin('achievements', 'achievements.achievement_id', 'user_achievements.achievement_id')
        .select(sql<number>`COUNT(*)`.as('count'))
        .where('user_achievements.user_id', '=', userId)
        .where('achievements.category', '=', category as any)
        .executeTakeFirst();

      byCategory[category] = {
        unlocked: unlockedInCategory?.count || 0,
        total: totalInCategory?.count || 0
      };
    }

    return {
      unlocked,
      total,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      byCategory
    };
  }

  /**
   * Get user stats needed for achievement checks
   */
  private async getUserStatsForAchievements(userId: string): Promise<{
    totalSolves: number;
    totalGuesses: number;
    avgGuessesPerSolve: number;
    currentStreak: number;
    bestStreak: number;
    firstPlaceFinishes: number;
  }> {
    const db = getDatabase();

    // Get total solves
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

    // Get user for streak info
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const currentStreak = await this.moodService.getUserStreak(userId);
    const bestStreak = user?.best_streak || 0;
    const avgGuessesPerSolve = totalSolves > 0 ? totalGuesses / totalSolves : 0;

    return {
      totalSolves,
      totalGuesses,
      avgGuessesPerSolve,
      currentStreak,
      bestStreak,
      firstPlaceFinishes
    };
  }

  /**
   * Format achievements for display
   */
  formatAchievementMessage(achievements: AchievementUnlock[]): string {
    if (achievements.length === 0) {
      return '';
    }

    const messages = achievements.map(({ achievement }) => {
      return `${achievement.emoji} *${achievement.name}* unlocked!\n_${achievement.description}_`;
    });

    return '\n\n🎉 *New Achievement' + (achievements.length > 1 ? 's' : '') + '!*\n' + messages.join('\n\n');
  }
}
