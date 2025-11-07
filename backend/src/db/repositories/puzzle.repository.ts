import { getDatabase, generateId } from '../connection.js';
import type { Puzzle, NewPuzzle, PuzzleUpdate } from '../schema.js';
import { sql } from 'kysely';

export class PuzzleRepository {
  async create(puzzleData: Omit<NewPuzzle, 'puzzle_id' | 'created_at'>): Promise<Puzzle> {
    const db = getDatabase();
    const puzzleId = generateId();

    const puzzle = await db
      .insertInto('puzzles')
      .values({
        puzzle_id: puzzleId,
        ...puzzleData,
        created_at: new Date().toISOString()
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return puzzle;
  }

  async findById(puzzleId: string): Promise<Puzzle | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('puzzles')
      .selectAll()
      .where('puzzle_id', '=', puzzleId)
      .executeTakeFirst();
  }

  async findByKey(puzzleKey: string): Promise<Puzzle | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('puzzles')
      .selectAll()
      .where('puzzle_key', '=', puzzleKey)
      .executeTakeFirst();
  }

  async getActivePuzzle(): Promise<Puzzle | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('puzzles')
      .selectAll()
      .where('is_active', '=', 1)
      .executeTakeFirst();
  }

  async setActivePuzzle(puzzleId: string): Promise<void> {
    const db = getDatabase();

    // Deactivate all puzzles
    await db
      .updateTable('puzzles')
      .set({ is_active: 0 })
      .execute();

    // Activate the specified puzzle
    await db
      .updateTable('puzzles')
      .set({ is_active: 1 })
      .where('puzzle_id', '=', puzzleId)
      .execute();
  }

  async update(puzzleId: string, updates: PuzzleUpdate): Promise<Puzzle> {
    const db = getDatabase();
    return db
      .updateTable('puzzles')
      .set(updates)
      .where('puzzle_id', '=', puzzleId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getAll(): Promise<Puzzle[]> {
    const db = getDatabase();
    return db.selectFrom('puzzles').selectAll().execute();
  }

  async getPuzzlesByWeek(weekStartDate: string): Promise<Puzzle[]> {
    const db = getDatabase();
    return db
      .selectFrom('puzzles')
      .selectAll()
      .where(sql`week_start_date`, '=', weekStartDate)
      .execute();
  }
}
