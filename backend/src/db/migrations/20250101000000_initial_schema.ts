import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Migration: Initial Schema
 * Created: 2025-01-01
 *
 * This migration creates the initial database schema with all core tables:
 * - users: User profiles and mood tier tracking
 * - puzzles: Weekly puzzle definitions
 * - guesses: User puzzle attempts
 * - weekly_leaderboards: Per-week competition rankings
 * - mood_history: Audit trail of mood tier changes
 * - achievements: Achievement definitions
 * - user_achievements: User achievement progress
 * - generated_puzzles: AI-generated puzzle submissions
 */

export async function up(db: Kysely<any>): Promise<void> {
  // Users table
  await db.schema
    .createTable('users')
    .addColumn('user_id', 'text', (col) => col.primaryKey())
    .addColumn('slack_user_id', 'text')
    .addColumn('display_name', 'text', (col) => col.notNull())
    .addColumn('mood_tier', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('best_streak', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('updated_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Puzzles table
  await db.schema
    .createTable('puzzles')
    .addColumn('puzzle_id', 'text', (col) => col.primaryKey())
    .addColumn('puzzle_key', 'text', (col) => col.notNull().unique())
    .addColumn('answer', 'text', (col) => col.notNull())
    .addColumn('image_path', 'text', (col) => col.notNull())
    .addColumn('week_start_date', 'text', (col) => col.notNull())
    .addColumn('week_end_date', 'text', (col) => col.notNull())
    .addColumn('is_active', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Index for active puzzles
  await db.schema
    .createIndex('idx_puzzles_is_active')
    .on('puzzles')
    .column('is_active')
    .execute();

  // Guesses table
  await db.schema
    .createTable('guesses')
    .addColumn('guess_id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('puzzle_id', 'text', (col) =>
      col.notNull().references('puzzles.puzzle_id').onDelete('cascade')
    )
    .addColumn('guess_text', 'text', (col) => col.notNull())
    .addColumn('is_correct', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('timestamp', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('guess_number', 'integer', (col) => col.notNull())
    .addColumn('mood_tier_at_time', 'integer', (col) => col.notNull())
    .execute();

  // Indexes for guesses
  await db.schema
    .createIndex('idx_guesses_user_id')
    .on('guesses')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_guesses_puzzle_id')
    .on('guesses')
    .column('puzzle_id')
    .execute();

  await db.schema
    .createIndex('idx_guesses_is_correct')
    .on('guesses')
    .column('is_correct')
    .execute();

  // Weekly Leaderboards table
  await db.schema
    .createTable('weekly_leaderboards')
    .addColumn('leaderboard_id', 'text', (col) => col.primaryKey())
    .addColumn('week_start_date', 'text', (col) => col.notNull())
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('puzzle_id', 'text', (col) =>
      col.notNull().references('puzzles.puzzle_id').onDelete('cascade')
    )
    .addColumn('solve_time', 'text', (col) => col.notNull())
    .addColumn('total_guesses', 'integer', (col) => col.notNull())
    .addColumn('rank', 'integer', (col) => col.notNull())
    .execute();

  // Indexes for leaderboards
  await db.schema
    .createIndex('idx_leaderboards_week')
    .on('weekly_leaderboards')
    .column('week_start_date')
    .execute();

  await db.schema
    .createIndex('idx_leaderboards_rank')
    .on('weekly_leaderboards')
    .column('rank')
    .execute();

  // Mood History table
  await db.schema
    .createTable('mood_history')
    .addColumn('mood_history_id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('old_tier', 'integer', (col) => col.notNull())
    .addColumn('new_tier', 'integer', (col) => col.notNull())
    .addColumn('reason', 'text', (col) => col.notNull())
    .addColumn('timestamp', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('streak_at_change', 'integer', (col) => col.notNull())
    .addColumn('total_solves_at_change', 'integer', (col) => col.notNull())
    .execute();

  // Index for mood history
  await db.schema
    .createIndex('idx_mood_history_user_id')
    .on('mood_history')
    .column('user_id')
    .execute();

  // Achievements table
  await db.schema
    .createTable('achievements')
    .addColumn('achievement_id', 'text', (col) => col.primaryKey())
    .addColumn('achievement_key', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('emoji', 'text', (col) => col.notNull())
    .addColumn('category', 'text', (col) => col.notNull())
    .addColumn('tier', 'text', (col) => col.notNull())
    .addColumn('is_secret', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Index for achievement category
  await db.schema
    .createIndex('idx_achievements_category')
    .on('achievements')
    .column('category')
    .execute();

  // User Achievements table
  await db.schema
    .createTable('user_achievements')
    .addColumn('user_achievement_id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('achievement_id', 'text', (col) =>
      col.notNull().references('achievements.achievement_id').onDelete('cascade')
    )
    .addColumn('unlocked_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('progress_data', 'text')
    .execute();

  // Indexes for user achievements
  await db.schema
    .createIndex('idx_user_achievements_user_id')
    .on('user_achievements')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_user_achievements_achievement_id')
    .on('user_achievements')
    .column('achievement_id')
    .execute();

  // Unique constraint to prevent duplicate achievements
  await db.schema
    .createIndex('idx_user_achievements_unique')
    .on('user_achievements')
    .columns(['user_id', 'achievement_id'])
    .unique()
    .execute();

  // Generated Puzzles table
  await db.schema
    .createTable('generated_puzzles')
    .addColumn('generated_puzzle_id', 'text', (col) => col.primaryKey())
    .addColumn('puzzle_concept', 'text', (col) => col.notNull())
    .addColumn('answer', 'text', (col) => col.notNull())
    .addColumn('visual_description', 'text', (col) => col.notNull())
    .addColumn('difficulty', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('PENDING'))
    .addColumn('generated_by', 'text', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('reviewed_by', 'text', (col) =>
      col.references('users.user_id').onDelete('set null')
    )
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('reviewed_at', 'text')
    .addColumn('rejection_reason', 'text')
    .addColumn('theme', 'text')
    .execute();

  // Indexes for generated puzzles
  await db.schema
    .createIndex('idx_generated_puzzles_status')
    .on('generated_puzzles')
    .column('status')
    .execute();

  await db.schema
    .createIndex('idx_generated_puzzles_generated_by')
    .on('generated_puzzles')
    .column('generated_by')
    .execute();

  // Seed initial achievements
  await seedAchievements(db);

  console.log('✅ Initial schema created successfully');
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('generated_puzzles').execute();
  await db.schema.dropTable('user_achievements').execute();
  await db.schema.dropTable('achievements').execute();
  await db.schema.dropTable('mood_history').execute();
  await db.schema.dropTable('weekly_leaderboards').execute();
  await db.schema.dropTable('guesses').execute();
  await db.schema.dropTable('puzzles').execute();
  await db.schema.dropTable('users').execute();

  console.log('✅ Initial schema dropped successfully');
}

/**
 * Seed initial achievements into the database
 */
async function seedAchievements(db: Kysely<any>): Promise<void> {
  const achievements = [
    // Streak Achievements
    {
      achievement_id: 'streak_first_blood',
      achievement_key: 'FIRST_BLOOD',
      name: 'First Blood',
      description: 'Solve your first puzzle',
      emoji: '🎯',
      category: 'streak',
      tier: 'bronze',
      is_secret: 0
    },
    {
      achievement_id: 'streak_hat_trick',
      achievement_key: 'HAT_TRICK',
      name: 'Hat Trick',
      description: 'Solve 3 puzzles in a row',
      emoji: '🎩',
      category: 'streak',
      tier: 'bronze',
      is_secret: 0
    },
    {
      achievement_id: 'streak_week_warrior',
      achievement_key: 'WEEK_WARRIOR',
      name: 'Week Warrior',
      description: 'Maintain a 7-week streak',
      emoji: '⚔️',
      category: 'streak',
      tier: 'silver',
      is_secret: 0
    },
    {
      achievement_id: 'streak_unstoppable',
      achievement_key: 'UNSTOPPABLE',
      name: 'Unstoppable Force',
      description: 'Maintain a 15-week streak',
      emoji: '💪',
      category: 'streak',
      tier: 'gold',
      is_secret: 0
    },
    {
      achievement_id: 'streak_legendary',
      achievement_key: 'LEGENDARY_STREAK',
      name: 'Legendary Streak',
      description: 'Maintain a 25-week streak',
      emoji: '🔥',
      category: 'streak',
      tier: 'legendary',
      is_secret: 0
    },

    // Solve Count Achievements
    {
      achievement_id: 'solve_rookie',
      achievement_key: 'ROOKIE',
      name: 'Rookie Riddler',
      description: 'Solve 5 total puzzles',
      emoji: '🌱',
      category: 'solve',
      tier: 'bronze',
      is_secret: 0
    },
    {
      achievement_id: 'solve_veteran',
      achievement_key: 'VETERAN',
      name: 'Veteran Solver',
      description: 'Solve 20 total puzzles',
      emoji: '🎖️',
      category: 'solve',
      tier: 'silver',
      is_secret: 0
    },
    {
      achievement_id: 'solve_master',
      achievement_key: 'MASTER',
      name: 'Puzzle Master',
      description: 'Solve 50 total puzzles',
      emoji: '👑',
      category: 'solve',
      tier: 'gold',
      is_secret: 0
    },
    {
      achievement_id: 'solve_legend',
      achievement_key: 'LEGEND',
      name: 'Living Legend',
      description: 'Solve 100 total puzzles',
      emoji: '🏆',
      category: 'solve',
      tier: 'legendary',
      is_secret: 0
    },

    // Speed Achievements
    {
      achievement_id: 'speed_flash',
      achievement_key: 'FLASH',
      name: 'The Flash',
      description: 'Solve a puzzle in under 1 minute',
      emoji: '⚡',
      category: 'speed',
      tier: 'gold',
      is_secret: 0
    },
    {
      achievement_id: 'speed_speedrun',
      achievement_key: 'SPEEDRUN',
      name: 'Speedrunner',
      description: 'Solve a puzzle in under 5 minutes',
      emoji: '🏃',
      category: 'speed',
      tier: 'silver',
      is_secret: 0
    },
    {
      achievement_id: 'speed_quick_draw',
      achievement_key: 'QUICK_DRAW',
      name: 'Quick Draw',
      description: 'Finish in 1st place 5 times',
      emoji: '🥇',
      category: 'speed',
      tier: 'gold',
      is_secret: 0
    },

    // Efficiency Achievements
    {
      achievement_id: 'efficiency_one_shot',
      achievement_key: 'ONE_SHOT',
      name: 'One-Shot Wonder',
      description: 'Solve a puzzle on your first guess',
      emoji: '🎯',
      category: 'efficiency',
      tier: 'legendary',
      is_secret: 0
    },
    {
      achievement_id: 'efficiency_sharp',
      achievement_key: 'SHARP_SHOOTER',
      name: 'Sharp Shooter',
      description: 'Solve 10 puzzles with 3 or fewer guesses',
      emoji: '🎪',
      category: 'efficiency',
      tier: 'gold',
      is_secret: 0
    },
    {
      achievement_id: 'efficiency_sniper',
      achievement_key: 'SNIPER',
      name: 'Sniper',
      description: 'Maintain an average of 2 guesses or less',
      emoji: '🎯',
      category: 'efficiency',
      tier: 'platinum',
      is_secret: 0
    },

    // Comeback Achievements
    {
      achievement_id: 'comeback_phoenix',
      achievement_key: 'PHOENIX',
      name: 'Phoenix Rising',
      description: 'Start a new 5-week streak after breaking one',
      emoji: '🔥',
      category: 'comeback',
      tier: 'silver',
      is_secret: 0
    },
    {
      achievement_id: 'comeback_redemption',
      achievement_key: 'REDEMPTION',
      name: 'Redemption Arc',
      description: 'Regain your best streak after losing it',
      emoji: '✨',
      category: 'comeback',
      tier: 'gold',
      is_secret: 0
    },

    // Special/Quirky Achievements
    {
      achievement_id: 'special_night_owl',
      achievement_key: 'NIGHT_OWL',
      name: 'Night Owl',
      description: 'Solve a puzzle between 11pm and 3am',
      emoji: '🦉',
      category: 'special',
      tier: 'bronze',
      is_secret: 1
    },
    {
      achievement_id: 'special_early_bird',
      achievement_key: 'EARLY_BIRD',
      name: 'Early Bird',
      description: 'Solve a puzzle between 5am and 7am',
      emoji: '🐦',
      category: 'special',
      tier: 'bronze',
      is_secret: 1
    },
    {
      achievement_id: 'special_lucky13',
      achievement_key: 'LUCKY_13',
      name: 'Lucky 13',
      description: 'Solve a puzzle on your 13th guess',
      emoji: '🍀',
      category: 'special',
      tier: 'silver',
      is_secret: 1
    },
    {
      achievement_id: 'special_perfectionist',
      achievement_key: 'PERFECTIONIST',
      name: 'The Perfectionist',
      description: 'Reach tier 6 (The Worshipper)',
      emoji: '💎',
      category: 'special',
      tier: 'platinum',
      is_secret: 0
    },
    {
      achievement_id: 'special_comeback_kid',
      achievement_key: 'COMEBACK_KID',
      name: 'Comeback Kid',
      description: 'Solve after 10+ incorrect guesses',
      emoji: '🎭',
      category: 'special',
      tier: 'bronze',
      is_secret: 1
    },
    {
      achievement_id: 'special_century_club',
      achievement_key: 'CENTURY_CLUB',
      name: 'Century Club',
      description: 'Make 100 total guesses (correct or not)',
      emoji: '💯',
      category: 'special',
      tier: 'silver',
      is_secret: 0
    },
    {
      achievement_id: 'special_social_butterfly',
      achievement_key: 'SOCIAL_BUTTERFLY',
      name: 'Social Butterfly',
      description: 'Check the leaderboard 25 times',
      emoji: '🦋',
      category: 'special',
      tier: 'bronze',
      is_secret: 1
    }
  ];

  // Insert achievements with timestamps
  for (const achievement of achievements) {
    await db
      .insertInto('achievements')
      .values({
        ...achievement,
        created_at: new Date().toISOString()
      })
      .execute();
  }

  console.log(`  ✅ Seeded ${achievements.length} achievements`);
}
