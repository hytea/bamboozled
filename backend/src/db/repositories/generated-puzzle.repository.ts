import { getDatabase } from '../connection.js';
import type {
  GeneratedPuzzle,
  NewGeneratedPuzzle,
  GeneratedPuzzleUpdate
} from '../schema.js';
import { randomUUID } from 'crypto';

export class GeneratedPuzzleRepository {
  async create(puzzleData: Omit<NewGeneratedPuzzle, 'generated_puzzle_id'>): Promise<GeneratedPuzzle> {
    const db = getDatabase();

    const puzzle = await db
      .insertInto('generated_puzzles')
      .values({
        generated_puzzle_id: randomUUID(),
        ...puzzleData,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return puzzle;
  }

  async findById(puzzleId: string): Promise<GeneratedPuzzle | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('generated_puzzles')
      .selectAll()
      .where('generated_puzzle_id', '=', puzzleId)
      .executeTakeFirst();
  }

  async findByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<GeneratedPuzzle[]> {
    const db = getDatabase();
    return db
      .selectFrom('generated_puzzles')
      .selectAll()
      .where('status', '=', status)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async findPendingPuzzles(): Promise<GeneratedPuzzle[]> {
    return this.findByStatus('PENDING');
  }

  async findApprovedPuzzles(): Promise<GeneratedPuzzle[]> {
    return this.findByStatus('APPROVED');
  }

  async findByUser(userId: string): Promise<GeneratedPuzzle[]> {
    const db = getDatabase();
    return db
      .selectFrom('generated_puzzles')
      .selectAll()
      .where('generated_by', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async update(puzzleId: string, updates: GeneratedPuzzleUpdate): Promise<GeneratedPuzzle> {
    const db = getDatabase();
    return db
      .updateTable('generated_puzzles')
      .set(updates)
      .where('generated_puzzle_id', '=', puzzleId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async approve(puzzleId: string, reviewedBy: string): Promise<GeneratedPuzzle> {
    return this.update(puzzleId, {
      status: 'APPROVED',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    });
  }

  async reject(puzzleId: string, reviewedBy: string, reason: string): Promise<GeneratedPuzzle> {
    return this.update(puzzleId, {
      status: 'REJECTED',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    });
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const db = getDatabase();

    const results = await db
      .selectFrom('generated_puzzles')
      .select([
        db.fn.count('generated_puzzle_id').as('total'),
        db.fn
          .count('generated_puzzle_id')
          .filterWhere('status', '=', 'PENDING')
          .as('pending'),
        db.fn
          .count('generated_puzzle_id')
          .filterWhere('status', '=', 'APPROVED')
          .as('approved'),
        db.fn
          .count('generated_puzzle_id')
          .filterWhere('status', '=', 'REJECTED')
          .as('rejected'),
      ])
      .executeTakeFirst();

    return {
      total: Number(results?.total ?? 0),
      pending: Number(results?.pending ?? 0),
      approved: Number(results?.approved ?? 0),
      rejected: Number(results?.rejected ?? 0),
    };
  }
}
