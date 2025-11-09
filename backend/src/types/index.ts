// User types
export interface User {
  user_id: string;
  slack_user_id: string | null;
  display_name: string;
  mood_tier: number;
  created_at: Date;
  updated_at: Date;
}

// Puzzle types
export interface Puzzle {
  puzzle_id: string;
  puzzle_key: string;
  answer: string;
  image_path: string;
  week_start_date: Date;
  week_end_date: Date;
  is_active: number; // 0 or 1 for SQLite boolean
  created_at: Date;
}

// Guess types
export interface Guess {
  guess_id: string;
  user_id: string;
  puzzle_id: string;
  guess_text: string;
  is_correct: boolean;
  timestamp: Date;
  guess_number: number;
  mood_tier_at_time: number;
}

// Leaderboard types
export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  solve_time: Date;
  total_guesses: number;
  rank: number;
}

// Mood types
export interface MoodTier {
  tier: number;
  name: string;
  description: string;
  minStreak: number;
  minSolves: number;
}

export interface MoodHistory {
  mood_history_id: string;
  user_id: string;
  old_tier: number;
  new_tier: number;
  reason: 'SOLVE' | 'STREAK_BREAK' | 'TIER_UP';
  timestamp: Date;
  streak_at_change: number;
  total_solves_at_change: number;
}

// AI Provider types
export interface AIValidationRequest {
  correctAnswer: string;
  userGuess: string;
}

export interface AIValidationResponse {
  is_correct: boolean;
  confidence: number;
  reasoning: string;
  corrected_answer?: string; // Present if answer had minor typos
}

export interface AIResponseRequest {
  moodTier: number;
  streak: number;
  totalSolves: number;
  isCorrect: boolean;
  guessNumber: number;
  userName?: string;
  firstPlaceCount?: number;
  correctedAnswer?: string; // Present if user had minor typos
}

export interface AIResponseResult {
  message: string;
}

export interface AIProvider {
  validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse>;
  generateResponse(request: AIResponseRequest): Promise<AIResponseResult>;
  determineIntent(message: string, availableCommands: string[]): Promise<string>;
}

// Stats types
export interface UserStats {
  user_id: string;
  display_name: string;
  total_solves: number;
  total_guesses: number;
  avg_guesses_per_solve: number;
  current_streak: number;
  best_streak: number;
  first_place_finishes: number;
  mood_tier: number;
  mood_tier_name: string;
}
