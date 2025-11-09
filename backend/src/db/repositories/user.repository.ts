import { getDatabase } from '../connection.js';
import type { User, NewUser, UserUpdate } from '../schema.js';

export class UserRepository {
  async create(userData: NewUser): Promise<User> {
    const db = getDatabase();

    const user = await db
      .insertInto('users')
      .values({
        ...userData,
        mood_tier: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return user;
  }

  async findById(userId: string): Promise<User | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('users')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();
  }

  async findByDisplayName(displayName: string): Promise<User | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('users')
      .selectAll()
      .where('display_name', '=', displayName)
      .executeTakeFirst();
  }

  async update(userId: string, updates: UserUpdate): Promise<User> {
    const db = getDatabase();
    return db
      .updateTable('users')
      .set({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateMoodTier(userId: string, newTier: number): Promise<User> {
    return this.update(userId, { mood_tier: newTier });
  }

  async getAll(): Promise<User[]> {
    const db = getDatabase();
    return db.selectFrom('users').selectAll().execute();
  }
}
