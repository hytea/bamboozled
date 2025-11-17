import { Kysely, SqliteDialect } from 'kysely';
import SQLite from 'better-sqlite3';
import type { Database } from '../schema.js';
import type { DatabaseProvider, DatabaseConfig } from './base.provider.js';
import { up, down } from '../migrations.js';
import * as fs from 'fs';
import * as path from 'path';

export class SQLiteProvider implements DatabaseProvider {
  name = 'sqlite';
  private db: Kysely<Database> | null = null;
  private sqliteDb: SQLite.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<Kysely<Database>> {
    if (this.db) {
      return this.db;
    }

    const dbPath = this.config.path || './data/bamboozled.db';

    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      console.log(`📁 Creating data directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Check if database file exists
    const dbExists = fs.existsSync(dbPath);
    if (dbExists) {
      console.log(`✅ Found existing database at ${dbPath}`);
    } else {
      console.log(`📦 Creating new database at ${dbPath}`);
    }

    this.sqliteDb = new SQLite(dbPath);

    const dialect = new SqliteDialect({
      database: this.sqliteDb
    });

    this.db = new Kysely<Database>({
      dialect
      // Disable query logging by default - too verbose
      // Enable via config.enableLogging if needed
    });

    return this.db;
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
  }

  async isInitialized(): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const tables = await this.db.introspection.getTables();
      const requiredTables = ['users', 'puzzles', 'guesses', 'weekly_leaderboards', 'mood_history', 'achievements', 'user_achievements', 'generated_puzzles'];
      const existingTableNames = tables.map(t => t.name);

      return requiredTables.every(table => existingTableNames.includes(table));
    } catch (error) {
      return false;
    }
  }

  async migrate(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    console.log('🔄 Running database migrations...');
    await up(this.db);
    console.log('✅ Migrations completed successfully');
  }

  async reset(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    console.log('⚠️  Resetting database (all data will be lost)...');
    await down(this.db);
    await up(this.db);
    console.log('✅ Database reset complete');
  }

  async healthCheck(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      await this.db.selectFrom('users').selectAll().limit(1).execute();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async exportData(): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    console.log('📤 Exporting database data...');

    const users = await this.db.selectFrom('users').selectAll().execute();
    const puzzles = await this.db.selectFrom('puzzles').selectAll().execute();
    const guesses = await this.db.selectFrom('guesses').selectAll().execute();
    const weeklyLeaderboards = await this.db.selectFrom('weekly_leaderboards').selectAll().execute();
    const moodHistory = await this.db.selectFrom('mood_history').selectAll().execute();
    const achievements = await this.db.selectFrom('achievements').selectAll().execute();
    const userAchievements = await this.db.selectFrom('user_achievements').selectAll().execute();
    const generatedPuzzles = await this.db.selectFrom('generated_puzzles').selectAll().execute();

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      provider: this.name,
      data: {
        users,
        puzzles,
        guesses,
        weeklyLeaderboards,
        moodHistory,
        achievements,
        userAchievements,
        generatedPuzzles
      }
    };

    console.log(`✅ Exported ${users.length} users, ${puzzles.length} puzzles, ${guesses.length} guesses, ${userAchievements.length} user achievements, ${generatedPuzzles.length} generated puzzles`);
    return exportData;
  }

  async importData(data: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    console.log('📥 Importing database data...');

    if (!data.version || !data.data) {
      throw new Error('Invalid import data format');
    }

    // Clear existing data
    await this.db.deleteFrom('generated_puzzles').execute();
    await this.db.deleteFrom('user_achievements').execute();
    await this.db.deleteFrom('mood_history').execute();
    await this.db.deleteFrom('weekly_leaderboards').execute();
    await this.db.deleteFrom('guesses').execute();
    await this.db.deleteFrom('puzzles').execute();
    await this.db.deleteFrom('achievements').execute();
    await this.db.deleteFrom('users').execute();

    // Import data
    if (data.data.users?.length > 0) {
      await this.db.insertInto('users').values(data.data.users).execute();
    }
    if (data.data.puzzles?.length > 0) {
      await this.db.insertInto('puzzles').values(data.data.puzzles).execute();
    }
    if (data.data.guesses?.length > 0) {
      await this.db.insertInto('guesses').values(data.data.guesses).execute();
    }
    if (data.data.weeklyLeaderboards?.length > 0) {
      await this.db.insertInto('weekly_leaderboards').values(data.data.weeklyLeaderboards).execute();
    }
    if (data.data.moodHistory?.length > 0) {
      await this.db.insertInto('mood_history').values(data.data.moodHistory).execute();
    }
    if (data.data.achievements?.length > 0) {
      await this.db.insertInto('achievements').values(data.data.achievements).execute();
    }
    if (data.data.userAchievements?.length > 0) {
      await this.db.insertInto('user_achievements').values(data.data.userAchievements).execute();
    }
    if (data.data.generatedPuzzles?.length > 0) {
      await this.db.insertInto('generated_puzzles').values(data.data.generatedPuzzles).execute();
    }

    console.log('✅ Data import complete');
  }
}
