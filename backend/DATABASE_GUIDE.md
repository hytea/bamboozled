# Database Developer Guide

Welcome! This guide will help you work with the Bamboozled database, especially if you're primarily a frontend engineer. Everything has been designed to be as simple and intuitive as possible.

## Quick Start

### 1. Initialize the Database

```bash
# First time setup - creates all tables
npm run db:migrate

# Add some test data to work with
npm run db:seed
```

That's it! Your database is ready to use.

### 2. Check Everything is Working

```bash
npm run db:health
```

You should see a nice summary of your database with row counts for each table.

## Common Tasks

### Working with Migrations

**What are migrations?** Think of them as version control for your database schema. Each migration is a file that describes how to change the database structure.

```bash
# Check which migrations have run
npm run db:migrate:status

# Run pending migrations
npm run db:migrate

# Undo the last batch of migrations
npm run db:migrate:rollback

# Start fresh (deletes all data and re-runs migrations)
npm run db:migrate:fresh
```

### Creating a New Migration

Need to add a new table or column? Create a migration:

```bash
# Create a new migration file
npm run db:make-migration add_user_preferences

# This creates a file like: 20250118000000_add_user_preferences.ts
```

Edit the generated file and add your changes:

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  // Add a new column to the users table
  await db.schema
    .alterTable('users')
    .addColumn('theme_preference', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove the column (for rollback)
  await db.schema
    .alterTable('users')
    .dropColumn('theme_preference')
    .execute();
}
```

Then run it:

```bash
npm run db:migrate
```

### Seeding Test Data

Working on the frontend and need realistic data? We've got you covered:

```bash
# Quick minimal data (2 users, 1 puzzle, 5 guesses)
npm run db:seed:minimal

# Realistic data (10 users, 5 puzzles, 50 guesses) - DEFAULT
npm run db:seed

# Stress test data (50 users, 20 puzzles, 500 guesses)
npm run db:seed:stress

# Custom amounts
npm run db:seed custom 20 10 100
#                       ^   ^   ^
#                       |   |   └─ guesses
#                       |   └───── puzzles
#                       └───────── users

# Clear all data (achievements stay)
npm run db:seed:clear
```

### Backup and Restore

```bash
# Export all data to JSON
npm run db:export

# Import data from JSON
npm run db:import backup.json
```

## Database Helpers

We've created helpful utilities to make common tasks super easy. Import them wherever you need them:

```typescript
import { DbHelpers } from './db/helpers.js';
import { getDatabase } from './db/connection.js';

const db = getDatabase();
```

### Working with Dates

SQLite stores dates as text (ISO 8601 format). Use our helpers to avoid headaches:

```typescript
// Get current timestamp for database
const now = DbHelpers.date.now();

// Get start/end of current week
const weekStart = DbHelpers.date.weekStart();
const weekEnd = DbHelpers.date.weekEnd();

// Convert Date to database format
const dbDate = DbHelpers.date.toDb(new Date());

// Convert database string to Date
const jsDate = DbHelpers.date.fromDb('2025-01-01T00:00:00.000Z');

// Format for display
const formatted = DbHelpers.date.format('2025-01-01T00:00:00.000Z');
// Output: "January 1, 2025"
```

### Working with Booleans

SQLite uses 0 and 1 for booleans:

```typescript
// Convert boolean to database format
const isActive = DbHelpers.bool.toDb(true); // Returns 1

// Convert database value to boolean
const isEnabled = DbHelpers.bool.fromDb(1); // Returns true
```

### Working with JSON Fields

Some columns store JSON data (like `progress_data` in achievements):

```typescript
// Create progress data
const progressData = DbHelpers.json.createProgressData(5, 10);

// Parse JSON from database
const progress = DbHelpers.json.parse(row.progress_data);

// Update progress
const updated = DbHelpers.json.updateProgress(existingData, 7, 10);
```

### Common Queries Made Easy

```typescript
// Get the currently active puzzle
const puzzle = await DbHelpers.query.getActivePuzzle(db);

// Get all guesses for a user on a puzzle
const guesses = await DbHelpers.query.getUserGuesses(db, userId, puzzleId);

// Check if user has solved a puzzle
const solved = await DbHelpers.query.hasSolved(db, userId, puzzleId);

// Get user's current streak
const streak = await DbHelpers.query.getUserStreak(db, userId);

// Get total number of puzzles a user has solved
const totalSolves = await DbHelpers.query.getTotalSolves(db, userId);

// Get user's achievements
const achievements = await DbHelpers.query.getUserAchievements(db, userId);

// Get database statistics
await DbHelpers.debug.printStats(db);
```

### Using Transactions

When you need to update multiple tables atomically (all succeed or all fail):

```typescript
await DbHelpers.transaction(db, async (trx) => {
  // All these queries happen in one transaction
  await trx.insertInto('users').values({ ... }).execute();
  await trx.insertInto('mood_history').values({ ... }).execute();
  await trx.updateTable('users').set({ ... }).execute();

  // If any query fails, ALL changes are rolled back
});
```

## Validation

We use Zod for runtime validation of complex data. This gives you autocomplete and type safety:

```typescript
import { ProgressValidation, Validation } from './db/validation.js';

// Create new achievement progress
const progressData = ProgressValidation.create(5, 10, {
  currentStreak: 5,
});

// Increment progress
const incremented = ProgressValidation.increment(progressData);

// Validate and parse
if (ProgressValidation.isValid(progressData)) {
  const progress = ProgressValidation.parse(progressData);
  console.log(`${progress.current}/${progress.target}`);
}

// Validate enum values
const isValidTier = Validation.achievementTier.safeParse('gold').success;
const isValidCategory = Validation.achievementCategory.safeParse('streak').success;
```

### Available Validators

- `ProgressValidation` - Achievement progress data
- `Validation.moodTier` - Mood tier (0-6)
- `Validation.achievementCategory` - Achievement category
- `Validation.achievementTier` - Achievement tier
- `Validation.puzzleDifficulty` - Puzzle difficulty
- `Validation.generatedPuzzleStatus` - Generated puzzle status
- `Validation.moodChangeReason` - Mood change reason

## Database Schema Reference

### Tables

#### `users`
- `user_id` - UUID, primary key
- `slack_user_id` - Slack user ID (nullable)
- `display_name` - User's display name
- `mood_tier` - Current mood tier (0-6)
- `best_streak` - Best streak achieved
- `created_at`, `updated_at` - Timestamps

#### `puzzles`
- `puzzle_id` - UUID, primary key
- `puzzle_key` - Unique identifier
- `answer` - The puzzle answer
- `image_path` - Path to puzzle image
- `week_start_date`, `week_end_date` - Week boundaries
- `is_active` - Boolean (0/1)
- `created_at` - Timestamp

#### `guesses`
- `guess_id` - UUID, primary key
- `user_id` - Foreign key to users
- `puzzle_id` - Foreign key to puzzles
- `guess_text` - The guessed answer
- `is_correct` - Boolean (0/1)
- `guess_number` - Attempt number
- `mood_tier_at_time` - User's tier when guessing
- `timestamp` - When guess was made

#### `mood_history`
- `mood_history_id` - UUID, primary key
- `user_id` - Foreign key to users
- `old_tier`, `new_tier` - Tier change
- `reason` - 'SOLVE' | 'STREAK_BREAK' | 'TIER_UP'
- `streak_at_change` - Streak at time of change
- `total_solves_at_change` - Total solves at time
- `timestamp` - When change occurred

#### `achievements`
- `achievement_id` - UUID, primary key
- `achievement_key` - Unique identifier
- `name`, `description`, `emoji` - Display info
- `category` - 'streak' | 'solve' | 'speed' | 'efficiency' | 'comeback' | 'special'
- `tier` - 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary'
- `is_secret` - Hidden until earned (0/1)
- `created_at` - Timestamp

#### `user_achievements`
- `user_achievement_id` - UUID, primary key
- `user_id` - Foreign key to users
- `achievement_id` - Foreign key to achievements
- `unlocked_at` - When earned
- `progress_data` - JSON string for progress tracking

#### `weekly_leaderboards`
- `leaderboard_id` - UUID, primary key
- `week_start_date` - Week reference
- `user_id` - Foreign key to users
- `puzzle_id` - Foreign key to puzzles
- `solve_time` - When solved
- `total_guesses` - Number of attempts
- `rank` - Ranking for that week

#### `generated_puzzles`
- `generated_puzzle_id` - UUID, primary key
- `puzzle_concept` - Description
- `answer` - Puzzle answer
- `visual_description` - How to display
- `difficulty` - 'EASY' | 'MEDIUM' | 'HARD'
- `status` - 'PENDING' | 'APPROVED' | 'REJECTED'
- `generated_by` - User who created
- `reviewed_by` - User who reviewed
- `created_at`, `reviewed_at` - Timestamps
- `rejection_reason`, `theme` - Optional fields

## Type Safety

The database is fully type-safe with Kysely. Your IDE will autocomplete everything:

```typescript
import { getDatabase } from './db/connection.js';

const db = getDatabase();

// TypeScript knows all tables and columns
const users = await db
  .selectFrom('users')
  .select(['user_id', 'display_name', 'mood_tier'])
  .where('mood_tier', '>=', 3)
  .execute();

// Type-safe results
users.forEach(user => {
  console.log(user.display_name); // ✅ TypeScript knows this exists
  console.log(user.invalid_field); // ❌ TypeScript error
});
```

## Troubleshooting

### "Database not initialized"

Run the migrations:
```bash
npm run db:migrate
```

### "No data in database"

Seed some data:
```bash
npm run db:seed
```

### "Migration failed"

Check the migration file for syntax errors. You can rollback with:
```bash
npm run db:migrate:rollback
```

### "I want to start over"

```bash
npm run db:migrate:fresh  # Deletes all data and re-runs migrations
npm run db:seed           # Add fresh test data
```

### "How do I see what's in the database?"

```bash
npm run db:health         # Shows row counts for each table
npm run db:export         # Exports everything to JSON
```

You can also use a SQLite browser like [DB Browser for SQLite](https://sqlitebrowser.org/) to visually explore the database file at `backend/data/bamboozled.db`.

## Best Practices

### 1. Always Use Transactions for Multi-Table Updates

```typescript
// ✅ Good - Atomic operation
await DbHelpers.transaction(db, async (trx) => {
  await trx.insertInto('mood_history').values({ ... }).execute();
  await trx.updateTable('users').set({ mood_tier: newTier }).execute();
});

// ❌ Bad - If second query fails, first one still went through
await db.insertInto('mood_history').values({ ... }).execute();
await db.updateTable('users').set({ mood_tier: newTier }).execute();
```

### 2. Use Helpers for Dates and Booleans

```typescript
// ✅ Good
const weekStart = DbHelpers.date.weekStart();
const isActive = DbHelpers.bool.toDb(true);

// ❌ Bad - Error prone
const weekStart = new Date().toISOString(); // Might not be start of week
const isActive = 1; // What does this mean?
```

### 3. Validate JSON Data

```typescript
// ✅ Good
const progressData = ProgressValidation.create(5, 10);

// ❌ Bad
const progressData = JSON.stringify({ current: 5, target: 10 }); // Missing required fields
```

### 4. Use Type-Safe Queries

```typescript
// ✅ Good - TypeScript will catch errors
const users = await db
  .selectFrom('users')
  .select(['user_id', 'display_name'])
  .execute();

// ❌ Bad - No type safety
const users = await db.raw('SELECT * FROM users').execute();
```

## Need Help?

1. Check this guide first
2. Look at the code examples in `backend/src/db/helpers.ts`
3. Check the existing repositories in `backend/src/db/repositories/`
4. Ask a team member

## Summary

- Use `npm run db:migrate` to set up the database
- Use `npm run db:seed` to add test data
- Import `DbHelpers` for common operations
- Use transactions for multi-table updates
- All dates are ISO 8601 strings
- All booleans are 0/1
- JSON fields should be validated

Happy coding! 🎯
