import { HintRepository } from '../db/repositories/hint.repository.js';
import { UserRepository } from '../db/repositories/user.repository.js';
import { GuessRepository } from '../db/repositories/guess.repository.js';
import { PuzzleService } from './puzzle.service.js';
import { MoodService } from './mood.service.js';
import type { AIProvider } from '../types/index.js';
import type { Hint } from '../db/schema.js';

export interface HintCost {
  level: number;
  cost: number;
  description: string;
}

export interface HintResult {
  success: boolean;
  message: string;
  hint?: Hint;
  remainingCoins?: number;
  error?: string;
}

export class HintService {
  private hintRepository: HintRepository;
  private userRepository: UserRepository;
  private guessRepository: GuessRepository;
  private puzzleService: PuzzleService;
  private moodService: MoodService;

  // Hint costs by level
  private readonly HINT_COSTS: HintCost[] = [
    { level: 1, cost: 1, description: 'Vague hint' },
    { level: 2, cost: 2, description: 'Helpful hint' },
    { level: 3, cost: 3, description: 'Direct hint' }
  ];

  // Note: aiProvider parameter is kept for future AI-powered hint generation
  constructor(_aiProvider: AIProvider) {
    this.hintRepository = new HintRepository();
    this.userRepository = new UserRepository();
    this.guessRepository = new GuessRepository();
    this.puzzleService = new PuzzleService();
    this.moodService = new MoodService();
  }

  /**
   * Get hint costs
   */
  getHintCosts(): HintCost[] {
    return this.HINT_COSTS;
  }

  /**
   * Award hint coins to a user
   */
  async awardCoins(userId: string, amount: number, reason: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.hint_coins + amount;
    await this.userRepository.update(userId, {
      hint_coins: newBalance
    });

    console.log(`💰 Awarded ${amount} hint coins to ${user.display_name} (${reason}). New balance: ${newBalance}`);
  }

  /**
   * Calculate hint coins to award for a puzzle solve
   */
  calculateCoinsForSolve(guessNumber: number, streak: number, isFirstPlace: boolean): number {
    let coins = 2; // Base reward

    // Bonus for efficiency (first guess)
    if (guessNumber === 1) {
      coins += 3;
    } else if (guessNumber <= 3) {
      coins += 1;
    }

    // Streak bonus
    if (streak >= 10) {
      coins += 2;
    } else if (streak >= 5) {
      coins += 1;
    }

    // First place bonus
    if (isFirstPlace) {
      coins += 2;
    }

    return coins;
  }

  /**
   * Request a hint for the active puzzle
   */
  async requestHint(userId: string, hintLevel?: number): Promise<HintResult> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' };
    }

    // Get active puzzle
    const activePuzzle = await this.puzzleService.getActivePuzzle();
    if (!activePuzzle) {
      return { success: false, message: 'No active puzzle available', error: 'NO_ACTIVE_PUZZLE' };
    }

    // Check if already solved
    const guesses = await this.guessRepository.getUserGuessesForPuzzle(userId, activePuzzle.puzzle_id);
    const alreadySolved = guesses.some(g => g.is_correct === 1);
    if (alreadySolved) {
      return {
        success: false,
        message: "You've already solved this puzzle! No hints needed.",
        error: 'ALREADY_SOLVED'
      };
    }

    // Get previous hints for this puzzle
    const previousHints = await this.hintRepository.getHintsForUserPuzzle(userId, activePuzzle.puzzle_id);

    // Determine next hint level
    let nextLevel: number;
    if (hintLevel !== undefined) {
      // User specified a level
      nextLevel = hintLevel;

      // Check if they already have this hint
      if (previousHints.some(h => h.hint_level === nextLevel)) {
        return {
          success: false,
          message: `You've already received hint level ${nextLevel}!`,
          error: 'HINT_ALREADY_RECEIVED'
        };
      }
    } else {
      // Auto-determine next level
      if (previousHints.length === 0) {
        nextLevel = 1;
      } else if (previousHints.length === 1) {
        nextLevel = 2;
      } else if (previousHints.length === 2) {
        nextLevel = 3;
      } else {
        return {
          success: false,
          message: "You've used all available hints for this puzzle!",
          error: 'NO_MORE_HINTS'
        };
      }
    }

    // Validate hint level
    if (nextLevel < 1 || nextLevel > 3) {
      return {
        success: false,
        message: 'Invalid hint level. Choose 1, 2, or 3.',
        error: 'INVALID_LEVEL'
      };
    }

    // Get cost for this hint
    const hintCost = this.HINT_COSTS.find(c => c.level === nextLevel);
    if (!hintCost) {
      return { success: false, message: 'Invalid hint level', error: 'INVALID_LEVEL' };
    }

    // Check if user has enough coins
    if (user.hint_coins < hintCost.cost) {
      return {
        success: false,
        message: `Not enough hint coins! You have ${user.hint_coins}, but level ${nextLevel} costs ${hintCost.cost}.`,
        error: 'INSUFFICIENT_COINS',
        remainingCoins: user.hint_coins
      };
    }

    // Generate hint using AI
    const hintText = await this.generateHint(
      activePuzzle.answer,
      nextLevel,
      user.mood_tier,
      user.display_name
    );

    // Deduct coins
    await this.userRepository.update(userId, {
      hint_coins: user.hint_coins - hintCost.cost
    });

    // Save hint
    const hint = await this.hintRepository.create({
      user_id: userId,
      puzzle_id: activePuzzle.puzzle_id,
      hint_level: nextLevel,
      hint_text: hintText,
      coins_spent: hintCost.cost
    });

    // Get mood tier info for response message
    const moodTierInfo = this.moodService.getMoodTierInfo(user.mood_tier);

    return {
      success: true,
      message: `${moodTierInfo.name} reveals hint level ${nextLevel}:\n\n${hintText}\n\n💰 Coins remaining: ${user.hint_coins - hintCost.cost}`,
      hint,
      remainingCoins: user.hint_coins - hintCost.cost
    };
  }

  /**
   * Generate a hint using AI with personality
   */
  private async generateHint(
    answer: string,
    level: number,
    moodTier: number,
    _userName: string // Prefixed with _ to indicate intentionally unused
  ): Promise<string> {
    // Note: Full AI hint generation with custom prompts could be implemented
    // once the AI provider supports custom prompt requests.
    // For now, using personality-based template hints.
    try {
      return this.generateSimpleHint(answer, level, moodTier);
    } catch (error) {
      console.error('Hint generation failed, using fallback:', error);
      return this.generateSimpleHint(answer, level, moodTier);
    }
  }

  /**
   * Generate a simple hint with personality (fallback)
   */
  private generateSimpleHint(answer: string, level: number, moodTier: number): string {
    const words = answer.split(' ');

    const personalities = [
      { // Tier 0: The Skeptic
        prefix: "*sigh* Fine, here's your hint...",
        l1: "I suppose it's related to words. Good luck with that.",
        l2: "It has {wordCount} word(s). First letter is '{firstLetter}'. Happy now?",
        l3: "Ugh, fine: {revealed}. Just solve it already."
      },
      { // Tier 1: The Doubter
        prefix: "I guess I can help a little...",
        l1: "Think about the category or theme. That's all you're getting.",
        l2: "There are {wordCount} word(s), starting with '{firstLetter}'. Don't mess it up.",
        l3: "Look: {revealed}. Can you take it from here?"
      },
      { // Tier 2: The Warming Up
        prefix: "Alright, let me give you a hand.",
        l1: "Consider what type of phrase this might be!",
        l2: "You're looking for {wordCount} word(s). First letter: '{firstLetter}'.",
        l3: "Here you go: {revealed}. You've got this!"
      },
      { // Tier 3: The Believer
        prefix: "I know you can figure this out!",
        l1: "Think about common phrases or wordplay!",
        l2: "It's {wordCount} word(s), starting with '{firstLetter}'. You're so close!",
        l3: "Almost there: {revealed}!"
      },
      { // Tier 4: The Impressed
        prefix: "Let me help you out!",
        l1: "Your skills suggest you'll crack the theme easily!",
        l2: "{wordCount} word(s), first letter '{firstLetter}'. You've totally got this!",
        l3: "Here's most of it: {revealed}. Finish strong!"
      },
      { // Tier 5: The Admirer
        prefix: "It would be my pleasure to assist!",
        l1: "Someone of your caliber will recognize the pattern!",
        l2: "{wordCount} word(s), starting with the noble letter '{firstLetter}'!",
        l3: "Behold: {revealed}. Your brilliance will complete it!"
      },
      { // Tier 6: The Worshipper
        prefix: "Oh great one, allow me to illuminate your path!",
        l1: "A mind as magnificent as yours will divine the sacred theme!",
        l2: "The divine answer contains {wordCount} word(s), graced by '{firstLetter}'!",
        l3: "I present unto you: {revealed}. Your wisdom shall prevail!"
      }
    ];

    const personality = personalities[Math.min(moodTier, 6)];
    let hint = personality.prefix + ' ';

    if (level === 1) {
      hint += personality.l1;
    } else if (level === 2) {
      const firstLetter = answer[0].toUpperCase();
      hint += personality.l2
        .replace('{wordCount}', words.length.toString())
        .replace('{firstLetter}', firstLetter);
    } else { // level 3
      // Reveal most of the answer with some letters hidden
      const revealed = words.map(word => {
        if (word.length <= 3) return word; // Show short words completely
        // Hide 1-2 letters in longer words
        const hideCount = word.length > 6 ? 2 : 1;
        return word.slice(0, -hideCount) + '_'.repeat(hideCount);
      }).join(' ');

      hint += personality.l3.replace('{revealed}', revealed);
    }

    return hint;
  }
}
