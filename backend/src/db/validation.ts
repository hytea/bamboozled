import { z } from 'zod';

/**
 * Validation Schemas
 *
 * Type-safe validation for JSON fields and other complex data.
 * Uses Zod for runtime validation with TypeScript type inference.
 *
 * This makes it easy for frontend engineers to:
 * - Know exactly what data structure is expected
 * - Get helpful error messages when data is invalid
 * - Have autocomplete support in their IDE
 */

/**
 * Achievement Progress Data Schema
 *
 * Used in user_achievements.progress_data field to track progress toward achievements
 */
export const AchievementProgressSchema = z.object({
  current: z.number().int().min(0).describe('Current progress value'),
  target: z.number().int().min(1).describe('Target value to complete achievement'),
  lastUpdated: z.string().datetime().describe('ISO timestamp of last update'),
  completedAt: z.string().datetime().optional().describe('ISO timestamp when completed'),
  metadata: z
    .record(z.any())
    .optional()
    .describe('Additional metadata specific to achievement type'),
});

export type AchievementProgress = z.infer<typeof AchievementProgressSchema>;

/**
 * Specific achievement progress types
 */

// Streak-based achievement progress
export const StreakProgressSchema = AchievementProgressSchema.extend({
  metadata: z
    .object({
      bestStreak: z.number().int().optional(),
      currentStreak: z.number().int().optional(),
    })
    .optional(),
});

export type StreakProgress = z.infer<typeof StreakProgressSchema>;

// Speed-based achievement progress
export const SpeedProgressSchema = AchievementProgressSchema.extend({
  metadata: z
    .object({
      fastestTime: z.number().optional().describe('Fastest solve time in seconds'),
      averageTime: z.number().optional().describe('Average solve time in seconds'),
      firstPlaceCount: z.number().int().optional(),
    })
    .optional(),
});

export type SpeedProgress = z.infer<typeof SpeedProgressSchema>;

// Efficiency-based achievement progress
export const EfficiencyProgressSchema = AchievementProgressSchema.extend({
  metadata: z
    .object({
      totalGuesses: z.number().int().optional(),
      totalSolves: z.number().int().optional(),
      averageGuesses: z.number().optional(),
      oneShots: z.number().int().optional().describe('Number of first-guess solves'),
    })
    .optional(),
});

export type EfficiencyProgress = z.infer<typeof EfficiencyProgressSchema>;

/**
 * Validation helpers
 */
export const ProgressValidation = {
  /**
   * Validate and parse achievement progress data
   */
  parse(jsonString: string | null): AchievementProgress | null {
    if (!jsonString) return null;

    try {
      const data = JSON.parse(jsonString);
      return AchievementProgressSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid achievement progress data:', error.errors);
      } else {
        console.error('Failed to parse achievement progress:', error);
      }
      return null;
    }
  },

  /**
   * Validate without parsing (returns boolean)
   */
  isValid(jsonString: string | null): boolean {
    if (!jsonString) return false;

    try {
      const data = JSON.parse(jsonString);
      AchievementProgressSchema.parse(data);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Create new progress data
   */
  create(current: number, target: number, metadata?: any): string {
    const progress: AchievementProgress = {
      current,
      target,
      lastUpdated: new Date().toISOString(),
      metadata,
    };

    return JSON.stringify(AchievementProgressSchema.parse(progress));
  },

  /**
   * Update existing progress data
   */
  update(
    existingJson: string | null,
    updates: Partial<AchievementProgress>
  ): string {
    const existing = this.parse(existingJson) || {
      current: 0,
      target: 100,
      lastUpdated: new Date().toISOString(),
    };

    const updated: AchievementProgress = {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    return JSON.stringify(AchievementProgressSchema.parse(updated));
  },

  /**
   * Mark progress as completed
   */
  complete(existingJson: string | null): string {
    const existing = this.parse(existingJson);
    if (!existing) {
      throw new Error('Cannot complete null progress data');
    }

    const completed: AchievementProgress = {
      ...existing,
      current: existing.target,
      lastUpdated: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    return JSON.stringify(completed);
  },

  /**
   * Increment progress
   */
  increment(existingJson: string | null, amount: number = 1): string {
    const existing = this.parse(existingJson);
    if (!existing) {
      throw new Error('Cannot increment null progress data');
    }

    const updated: AchievementProgress = {
      ...existing,
      current: Math.min(existing.current + amount, existing.target),
      lastUpdated: new Date().toISOString(),
    };

    // Mark as completed if we reached the target
    if (updated.current >= updated.target && !updated.completedAt) {
      updated.completedAt = new Date().toISOString();
    }

    return JSON.stringify(updated);
  },
};

/**
 * Mood tier validation
 */
export const MoodTierSchema = z.number().int().min(0).max(6);

export const MoodTierNames = {
  0: 'The Skeptic',
  1: 'The Dabbler',
  2: 'The Believer',
  3: 'The Devotee',
  4: 'The Zealot',
  5: 'The Evangelist',
  6: 'The Worshipper',
} as const;

export type MoodTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Achievement category validation
 */
export const AchievementCategorySchema = z.enum([
  'streak',
  'solve',
  'speed',
  'efficiency',
  'comeback',
  'special',
]);

export type AchievementCategory = z.infer<typeof AchievementCategorySchema>;

/**
 * Achievement tier validation
 */
export const AchievementTierSchema = z.enum([
  'bronze',
  'silver',
  'gold',
  'platinum',
  'legendary',
]);

export type AchievementTier = z.infer<typeof AchievementTierSchema>;

/**
 * Puzzle difficulty validation
 */
export const PuzzleDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export type PuzzleDifficulty = z.infer<typeof PuzzleDifficultySchema>;

/**
 * Generated puzzle status validation
 */
export const GeneratedPuzzleStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export type GeneratedPuzzleStatus = z.infer<typeof GeneratedPuzzleStatusSchema>;

/**
 * Mood change reason validation
 */
export const MoodChangeReasonSchema = z.enum(['SOLVE', 'STREAK_BREAK', 'TIER_UP']);

export type MoodChangeReason = z.infer<typeof MoodChangeReasonSchema>;

/**
 * Export all validation schemas
 */
export const Validation = {
  progress: ProgressValidation,
  moodTier: MoodTierSchema,
  achievementCategory: AchievementCategorySchema,
  achievementTier: AchievementTierSchema,
  puzzleDifficulty: PuzzleDifficultySchema,
  generatedPuzzleStatus: GeneratedPuzzleStatusSchema,
  moodChangeReason: MoodChangeReasonSchema,
};

/**
 * Example usage:
 *
 * import { ProgressValidation, Validation } from './db/validation.js';
 *
 * // Create new progress
 * const progressData = ProgressValidation.create(5, 10, { currentStreak: 5 });
 *
 * // Update progress
 * const updated = ProgressValidation.update(progressData, { current: 7 });
 *
 * // Increment progress
 * const incremented = ProgressValidation.increment(progressData);
 *
 * // Validate data
 * if (ProgressValidation.isValid(progressData)) {
 *   const progress = ProgressValidation.parse(progressData);
 *   console.log(progress.current, progress.target);
 * }
 *
 * // Validate enum values
 * const tier = Validation.achievementTier.parse('gold'); // OK
 * const invalid = Validation.achievementTier.parse('diamond'); // Throws error
 */
