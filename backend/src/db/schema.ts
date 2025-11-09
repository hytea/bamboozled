import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

// Users table
export interface UsersTable {
  user_id: string;
  display_name: string;
  mood_tier: number;
  best_streak: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

// Puzzles table
export interface PuzzlesTable {
  puzzle_id: Generated<string>;
  puzzle_key: string;
  answer: string;
  image_path: string;
  week_start_date: ColumnType<Date, string, string>;
  week_end_date: ColumnType<Date, string, string>;
  is_active: number; // 0 or 1 for SQLite boolean
  created_at: ColumnType<Date, string | undefined, never>;
}

export type Puzzle = Selectable<PuzzlesTable>;
export type NewPuzzle = Insertable<PuzzlesTable>;
export type PuzzleUpdate = Updateable<PuzzlesTable>;

// Guesses table
export interface GuessesTable {
  guess_id: Generated<string>;
  user_id: string;
  puzzle_id: string;
  guess_text: string;
  is_correct: number; // 0 or 1 for SQLite boolean
  timestamp: ColumnType<Date, string | undefined, never>;
  guess_number: number;
  mood_tier_at_time: number;
}

export type Guess = Selectable<GuessesTable>;
export type NewGuess = Insertable<GuessesTable>;
export type GuessUpdate = Updateable<GuessesTable>;

// Weekly Leaderboards table
export interface WeeklyLeaderboardsTable {
  leaderboard_id: Generated<string>;
  week_start_date: ColumnType<Date, string, string>;
  user_id: string;
  puzzle_id: string;
  solve_time: ColumnType<Date, string, string>;
  total_guesses: number;
  rank: number;
}

export type WeeklyLeaderboard = Selectable<WeeklyLeaderboardsTable>;
export type NewWeeklyLeaderboard = Insertable<WeeklyLeaderboardsTable>;
export type WeeklyLeaderboardUpdate = Updateable<WeeklyLeaderboardsTable>;

// Mood History table
export interface MoodHistoryTable {
  mood_history_id: Generated<string>;
  user_id: string;
  old_tier: number;
  new_tier: number;
  reason: 'SOLVE' | 'STREAK_BREAK' | 'TIER_UP';
  timestamp: ColumnType<Date, string | undefined, never>;
  streak_at_change: number;
  total_solves_at_change: number;
}

export type MoodHistory = Selectable<MoodHistoryTable>;
export type NewMoodHistory = Insertable<MoodHistoryTable>;
export type MoodHistoryUpdate = Updateable<MoodHistoryTable>;

// Database interface
export interface Database {
  users: UsersTable;
  puzzles: PuzzlesTable;
  guesses: GuessesTable;
  weekly_leaderboards: WeeklyLeaderboardsTable;
  mood_history: MoodHistoryTable;
}
