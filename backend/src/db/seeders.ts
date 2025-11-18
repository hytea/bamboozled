import type { Kysely } from 'kysely';
import { randomUUID } from 'crypto';

/**
 * Database Seeders
 *
 * Provides easy-to-use functions for seeding development data.
 * Perfect for frontend engineers who need realistic test data quickly!
 *
 * Usage:
 *   import { seedDevelopmentData } from './db/seeders.js';
 *   await seedDevelopmentData(db);
 *
 * Or use the CLI:
 *   npm run db:seed
 */

export interface SeedOptions {
  users?: number;
  puzzles?: number;
  guesses?: number;
}

/**
 * Seed comprehensive development data
 *
 * Creates realistic test data including:
 * - Multiple users with different mood tiers
 * - Several puzzles (active and inactive)
 * - Guesses with varying success rates
 * - Mood history entries
 * - User achievements
 */
export async function seedDevelopmentData(
  db: Kysely<any>,
  options: SeedOptions = {}
): Promise<void> {
  const {
    users: numUsers = 5,
    puzzles: numPuzzles = 3,
    guesses: numGuesses = 20,
  } = options;

  console.log('🌱 Seeding development data...');

  // Create test users
  const userIds = await seedUsers(db, numUsers);
  console.log(`  ✅ Created ${userIds.length} users`);

  // Create test puzzles
  const puzzleIds = await seedPuzzles(db, numPuzzles);
  console.log(`  ✅ Created ${puzzleIds.length} puzzles`);

  // Create test guesses
  if (userIds.length > 0 && puzzleIds.length > 0) {
    await seedGuesses(db, userIds, puzzleIds, numGuesses);
    console.log(`  ✅ Created ~${numGuesses} guesses`);
  }

  // Create some mood history
  if (userIds.length > 0) {
    await seedMoodHistory(db, userIds);
    console.log(`  ✅ Created mood history entries`);
  }

  // Grant some achievements
  if (userIds.length > 0) {
    await seedUserAchievements(db, userIds);
    console.log(`  ✅ Granted user achievements`);
  }

  console.log('✅ Development data seeding complete!');
}

/**
 * Create test users with realistic data
 */
async function seedUsers(db: Kysely<any>, count: number): Promise<string[]> {
  const userIds: string[] = [];

  const names = [
    'Alice the Achiever',
    'Bob the Builder',
    'Charlie the Champion',
    'Diana the Detective',
    'Eve the Expert',
    'Frank the Fast',
    'Grace the Genius',
    'Henry the Hero',
    'Iris the Incredible',
    'Jack the Jester',
  ];

  for (let i = 0; i < count; i++) {
    const userId = `user_${randomUUID()}`;
    userIds.push(userId);

    await db
      .insertInto('users')
      .values({
        user_id: userId,
        slack_user_id: `U${Math.random().toString(36).substring(7).toUpperCase()}`,
        display_name: names[i % names.length],
        mood_tier: Math.floor(Math.random() * 7), // 0-6
        best_streak: Math.floor(Math.random() * 15),
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();
  }

  return userIds;
}

/**
 * Create test puzzles
 */
async function seedPuzzles(db: Kysely<any>, count: number): Promise<string[]> {
  const puzzleIds: string[] = [];

  const puzzleData = [
    {
      key: 'word-ladder-cat-dog',
      answer: 'cat > cot > cog > dog',
      imagePath: '/puzzles/word-ladder-1.png',
    },
    {
      key: 'rebus-once-upon-time',
      answer: 'once upon a time',
      imagePath: '/puzzles/rebus-1.png',
    },
    {
      key: 'math-sequence-fibonacci',
      answer: '13',
      imagePath: '/puzzles/sequence-1.png',
    },
    {
      key: 'riddle-what-am-i',
      answer: 'keyboard',
      imagePath: '/puzzles/riddle-1.png',
    },
    {
      key: 'logic-grid-houses',
      answer: 'norwegian',
      imagePath: '/puzzles/logic-1.png',
    },
  ];

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const puzzleId = `puzzle_${randomUUID()}`;
    puzzleIds.push(puzzleId);

    const data = puzzleData[i % puzzleData.length];
    const weekOffset = i * 7; // Each puzzle is for a different week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - weekOffset); // Start of week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week

    await db
      .insertInto('puzzles')
      .values({
        puzzle_id: puzzleId,
        puzzle_key: `${data.key}_${i}`,
        answer: data.answer,
        image_path: data.imagePath,
        week_start_date: weekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
        is_active: i === 0 ? 1 : 0, // Only the first puzzle is active
        created_at: new Date().toISOString(),
      })
      .execute();
  }

  return puzzleIds;
}

/**
 * Create test guesses
 */
async function seedGuesses(
  db: Kysely<any>,
  userIds: string[],
  puzzleIds: string[],
  count: number
): Promise<void> {
  const wrongAnswers = [
    'not sure',
    'maybe this?',
    'wrong answer',
    'incorrect',
    'try again',
    'hmm...',
    'close but no',
  ];

  for (let i = 0; i < count; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const puzzleId = puzzleIds[Math.floor(Math.random() * puzzleIds.length)];

    // Get the puzzle's correct answer
    const puzzle = await db
      .selectFrom('puzzles')
      .select('answer')
      .where('puzzle_id', '=', puzzleId)
      .executeTakeFirst();

    if (!puzzle) continue;

    // Check how many guesses this user has made for this puzzle
    const existingGuesses = await db
      .selectFrom('guesses')
      .select('guess_id')
      .where('user_id', '=', userId)
      .where('puzzle_id', '=', puzzleId)
      .execute();

    const guessNumber = existingGuesses.length + 1;

    // 30% chance of correct guess
    const isCorrect = Math.random() < 0.3;
    const guessText = isCorrect
      ? puzzle.answer
      : wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];

    await db
      .insertInto('guesses')
      .values({
        guess_id: `guess_${randomUUID()}`,
        user_id: userId,
        puzzle_id: puzzleId,
        guess_text: guessText,
        is_correct: isCorrect ? 1 : 0,
        guess_number: guessNumber,
        mood_tier_at_time: Math.floor(Math.random() * 7),
        timestamp: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .execute();
  }
}

/**
 * Create test mood history entries
 */
async function seedMoodHistory(db: Kysely<any>, userIds: string[]): Promise<void> {
  const reasons: Array<'SOLVE' | 'STREAK_BREAK' | 'TIER_UP'> = [
    'SOLVE',
    'STREAK_BREAK',
    'TIER_UP',
  ];

  for (const userId of userIds) {
    // Create 3-5 mood history entries per user
    const numEntries = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numEntries; i++) {
      const oldTier = Math.floor(Math.random() * 7);
      const newTier = Math.max(
        0,
        Math.min(6, oldTier + (Math.random() < 0.5 ? 1 : -1))
      );

      await db
        .insertInto('mood_history')
        .values({
          mood_history_id: `mood_${randomUUID()}`,
          user_id: userId,
          old_tier: oldTier,
          new_tier: newTier,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          streak_at_change: Math.floor(Math.random() * 10),
          total_solves_at_change: Math.floor(Math.random() * 50),
          timestamp: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .execute();
    }
  }
}

/**
 * Grant some achievements to users
 */
async function seedUserAchievements(db: Kysely<any>, userIds: string[]): Promise<void> {
  // Get all achievements
  const achievements = await db
    .selectFrom('achievements')
    .select(['achievement_id', 'achievement_key'])
    .execute();

  if (achievements.length === 0) return;

  for (const userId of userIds) {
    // Grant 2-5 random achievements per user
    const numAchievements = 2 + Math.floor(Math.random() * 4);
    const shuffled = [...achievements].sort(() => Math.random() - 0.5);
    const toGrant = shuffled.slice(0, numAchievements);

    for (const achievement of toGrant) {
      await db
        .insertInto('user_achievements')
        .values({
          user_achievement_id: `ua_${randomUUID()}`,
          user_id: userId,
          achievement_id: achievement.achievement_id,
          unlocked_at: new Date(
            Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000
          ).toISOString(),
          progress_data: JSON.stringify({
            current: 100,
            target: 100,
            completedAt: new Date().toISOString(),
          }),
        })
        .execute();
    }
  }
}

/**
 * Clear all data (except achievements)
 */
export async function clearDevelopmentData(db: Kysely<any>): Promise<void> {
  console.log('🧹 Clearing development data...');

  await db.deleteFrom('generated_puzzles').execute();
  await db.deleteFrom('user_achievements').execute();
  await db.deleteFrom('mood_history').execute();
  await db.deleteFrom('weekly_leaderboards').execute();
  await db.deleteFrom('guesses').execute();
  await db.deleteFrom('puzzles').execute();
  await db.deleteFrom('users').execute();

  console.log('✅ Development data cleared (achievements preserved)');
}

/**
 * Quick seed preset: Minimal data
 */
export async function seedMinimal(db: Kysely<any>): Promise<void> {
  await seedDevelopmentData(db, {
    users: 2,
    puzzles: 1,
    guesses: 5,
  });
}

/**
 * Quick seed preset: Realistic data
 */
export async function seedRealistic(db: Kysely<any>): Promise<void> {
  await seedDevelopmentData(db, {
    users: 10,
    puzzles: 5,
    guesses: 50,
  });
}

/**
 * Quick seed preset: Stress test data
 */
export async function seedStress(db: Kysely<any>): Promise<void> {
  await seedDevelopmentData(db, {
    users: 50,
    puzzles: 20,
    guesses: 500,
  });
}
