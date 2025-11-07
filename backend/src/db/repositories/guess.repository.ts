import { getDatabase, generateId } from '../connection.js';
import type { Guess, NewGuess } from '../schema.js';

export class GuessRepository {
  async create(guessData: Omit<NewGuess, 'guess_id' | 'timestamp'>): Promise<Guess> {
    const db = getDatabase();
    const guessId = generateId();

    const guess = await db
      .insertInto('guesses')
      .values({
        guess_id: guessId,
        ...guessData,
        timestamp: new Date().toISOString()
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return guess;
  }

  async findById(guessId: string): Promise<Guess | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('guesses')
      .selectAll()
      .where('guess_id', '=', guessId)
      .executeTakeFirst();
  }

  async getUserGuessesForPuzzle(userId: string, puzzleId: string): Promise<Guess[]> {
    const db = getDatabase();
    return db
      .selectFrom('guesses')
      .selectAll()
      .where('user_id', '=', userId)
      .where('puzzle_id', '=', puzzleId)
      .orderBy('timestamp', 'asc')
      .execute();
  }

  async hasUserSolvedPuzzle(userId: string, puzzleId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .selectFrom('guesses')
      .select('guess_id')
      .where('user_id', '=', userId)
      .where('puzzle_id', '=', puzzleId)
      .where('is_correct', '=', 1)
      .executeTakeFirst();

    return !!result;
  }

  async getCorrectGuessForPuzzle(userId: string, puzzleId: string): Promise<Guess | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('guesses')
      .selectAll()
      .where('user_id', '=', userId)
      .where('puzzle_id', '=', puzzleId)
      .where('is_correct', '=', 1)
      .executeTakeFirst();
  }

  async getFirstCorrectGuessForPuzzle(puzzleId: string): Promise<Guess | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('guesses')
      .selectAll()
      .where('puzzle_id', '=', puzzleId)
      .where('is_correct', '=', 1)
      .orderBy('timestamp', 'asc')
      .executeTakeFirst();
  }

  async getAllGuessesByUser(userId: string): Promise<Guess[]> {
    const db = getDatabase();
    return db
      .selectFrom('guesses')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('timestamp', 'desc')
      .execute();
  }
}
