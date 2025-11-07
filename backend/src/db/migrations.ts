import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Users table
  await db.schema
    .createTable('users')
    .addColumn('user_id', 'text', (col) => col.primaryKey())
    .addColumn('slack_user_id', 'text', (col) => col.unique())
    .addColumn('display_name', 'text', (col) => col.notNull())
    .addColumn('mood_tier', 'integer', (col) => col.notNull().defaultTo(0))
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
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('mood_history').execute();
  await db.schema.dropTable('weekly_leaderboards').execute();
  await db.schema.dropTable('guesses').execute();
  await db.schema.dropTable('puzzles').execute();
  await db.schema.dropTable('users').execute();
}
