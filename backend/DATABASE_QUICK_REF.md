# Database Quick Reference

One-page cheat sheet for common database operations.

## Setup Commands

```bash
npm run db:migrate              # Run pending migrations
npm run db:seed                 # Add realistic test data
npm run db:health               # Check database status
```

## Helper Functions

```typescript
import { DbHelpers } from './db/helpers.js';
import { getDatabase } from './db/connection.js';

const db = getDatabase();
```

### Dates

```typescript
DbHelpers.date.now()                    // Current timestamp
DbHelpers.date.weekStart()              // Start of current week
DbHelpers.date.weekEnd()                // End of current week
DbHelpers.date.toDb(new Date())         // Date to DB format
DbHelpers.date.fromDb('2025-01-01...')  // DB to Date object
DbHelpers.date.format('2025-01-01...')  // Pretty format
```

### Booleans

```typescript
DbHelpers.bool.toDb(true)   // Returns 1
DbHelpers.bool.fromDb(1)    // Returns true
```

### JSON

```typescript
DbHelpers.json.createProgressData(current, target)
DbHelpers.json.parse(jsonString)
DbHelpers.json.updateProgress(existing, newCurrent, newTarget)
```

### Common Queries

```typescript
await DbHelpers.query.getActivePuzzle(db)
await DbHelpers.query.getUserGuesses(db, userId, puzzleId)
await DbHelpers.query.hasSolved(db, userId, puzzleId)
await DbHelpers.query.getUserStreak(db, userId)
await DbHelpers.query.getTotalSolves(db, userId)
await DbHelpers.query.getUserAchievements(db, userId)
```

### Transactions

```typescript
await DbHelpers.transaction(db, async (trx) => {
  // All queries here are atomic
  await trx.insertInto('table').values({...}).execute();
  await trx.updateTable('table').set({...}).execute();
});
```

### Debug

```typescript
await DbHelpers.debug.printStats(db)     // Print table counts
await DbHelpers.debug.getStats(db)       // Get stats object
```

## Validation

```typescript
import { ProgressValidation, Validation } from './db/validation.js';

// Achievement progress
ProgressValidation.create(5, 10)         // Create new
ProgressValidation.increment(existing)    // Increment by 1
ProgressValidation.parse(jsonString)      // Parse & validate

// Enum validation
Validation.moodTier.parse(3)
Validation.achievementCategory.parse('streak')
Validation.achievementTier.parse('gold')
```

## Migration Commands

```bash
npm run db:migrate:status       # Check migration status
npm run db:migrate              # Run pending migrations
npm run db:migrate:rollback     # Undo last batch
npm run db:migrate:fresh        # Reset & re-run all
npm run db:make-migration name  # Create new migration
```

## Seeding Commands

```bash
npm run db:seed:minimal     # 2 users, 1 puzzle, 5 guesses
npm run db:seed             # 10 users, 5 puzzles, 50 guesses
npm run db:seed:stress      # 50 users, 20 puzzles, 500 guesses
npm run db:seed:clear       # Clear all data
```

## Schema Quick Ref

### users
```typescript
user_id, slack_user_id, display_name, mood_tier (0-6),
best_streak, created_at, updated_at
```

### puzzles
```typescript
puzzle_id, puzzle_key, answer, image_path,
week_start_date, week_end_date, is_active (0/1), created_at
```

### guesses
```typescript
guess_id, user_id, puzzle_id, guess_text, is_correct (0/1),
timestamp, guess_number, mood_tier_at_time
```

### achievements
```typescript
achievement_id, achievement_key, name, description, emoji,
category, tier, is_secret (0/1), created_at
```

### user_achievements
```typescript
user_achievement_id, user_id, achievement_id,
unlocked_at, progress_data (JSON)
```

## Example: Create User and Record Guess

```typescript
import { DbHelpers } from './db/helpers.js';
import { getDatabase } from './db/connection.js';
import { randomUUID } from 'crypto';

const db = getDatabase();

await DbHelpers.transaction(db, async (trx) => {
  // Create user
  const userId = randomUUID();
  await trx.insertInto('users').values({
    user_id: userId,
    display_name: 'New User',
    mood_tier: 0,
    best_streak: 0,
    created_at: DbHelpers.date.now(),
    updated_at: DbHelpers.date.now(),
  }).execute();

  // Record guess
  const puzzle = await DbHelpers.query.getActivePuzzle(trx as any);
  if (puzzle) {
    await trx.insertInto('guesses').values({
      guess_id: randomUUID(),
      user_id: userId,
      puzzle_id: puzzle.puzzle_id,
      guess_text: 'my guess',
      is_correct: DbHelpers.bool.toDb(false),
      guess_number: 1,
      mood_tier_at_time: 0,
      timestamp: DbHelpers.date.now(),
    }).execute();
  }
});
```

## Common Patterns

### Check if user exists
```typescript
const user = await db
  .selectFrom('users')
  .selectAll()
  .where('user_id', '=', userId)
  .executeTakeFirst();

if (!user) {
  // Create user
}
```

### Get user's recent guesses
```typescript
const recentGuesses = await db
  .selectFrom('guesses')
  .selectAll()
  .where('user_id', '=', userId)
  .orderBy('timestamp', 'desc')
  .limit(10)
  .execute();
```

### Update mood tier
```typescript
await DbHelpers.transaction(db, async (trx) => {
  const oldTier = user.mood_tier;
  const newTier = calculateNewTier();

  await trx.updateTable('users')
    .set({ mood_tier: newTier, updated_at: DbHelpers.date.now() })
    .where('user_id', '=', userId)
    .execute();

  await trx.insertInto('mood_history').values({
    mood_history_id: randomUUID(),
    user_id: userId,
    old_tier: oldTier,
    new_tier: newTier,
    reason: 'SOLVE',
    streak_at_change: currentStreak,
    total_solves_at_change: totalSolves,
    timestamp: DbHelpers.date.now(),
  }).execute();
});
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Database not initialized | `npm run db:migrate` |
| No data | `npm run db:seed` |
| Migration failed | `npm run db:migrate:rollback` |
| Want to start fresh | `npm run db:migrate:fresh && npm run db:seed` |
| Check what's inside | `npm run db:health` or `npm run db:export` |

## Resources

- Full Guide: [DATABASE_GUIDE.md](./DATABASE_GUIDE.md)
- Schema Details: [DATABASE.md](./DATABASE.md)
- Helper Code: `backend/src/db/helpers.ts`
- Validation Code: `backend/src/db/validation.ts`
- Migration Manager: `backend/src/db/migration-manager.ts`
