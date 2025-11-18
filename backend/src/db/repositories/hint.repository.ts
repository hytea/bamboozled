import { getDatabase } from '../connection.js';
import type { Hint, NewHint } from '../schema.js';
import { randomUUID } from 'crypto';

export class HintRepository {
  /**
   * Create a new hint record
   */
  async create(hint: NewHint): Promise<Hint> {
    const db = getDatabase();
    const hintId = randomUUID();

    await db
      .insertInto('hints')
      .values({
        hint_id: hintId,
        ...hint
      })
      .execute();

    const created = await db
      .selectFrom('hints')
      .selectAll()
      .where('hint_id', '=', hintId)
      .executeTakeFirst();

    if (!created) {
      throw new Error('Failed to create hint');
    }

    return created as Hint;
  }

  /**
   * Get hints for a user on a specific puzzle
   */
  async getHintsForUserPuzzle(userId: string, puzzleId: string): Promise<Hint[]> {
    const db = getDatabase();
    const hints = await db
      .selectFrom('hints')
      .selectAll()
      .where('user_id', '=', userId)
      .where('puzzle_id', '=', puzzleId)
      .orderBy('hint_level', 'asc')
      .execute();

    return hints as Hint[];
  }

  /**
   * Get all hints for a user
   */
  async getHintsByUser(userId: string): Promise<Hint[]> {
    const db = getDatabase();
    const hints = await db
      .selectFrom('hints')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('timestamp', 'desc')
      .execute();

    return hints as Hint[];
  }

  /**
   * Get total coins spent by user
   */
  async getTotalCoinsSpent(userId: string): Promise<number> {
    const db = getDatabase();
    const result = await db
      .selectFrom('hints')
      .select((eb) => eb.fn.sum('coins_spent').as('total'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    return Number(result?.total || 0);
  }
}
