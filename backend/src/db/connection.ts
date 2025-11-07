import { Kysely, SqliteDialect } from 'kysely';
import SQLite from 'better-sqlite3';
import type { Database } from './schema.js';
import { getConfig } from '../config/env.js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

let db: Kysely<Database> | null = null;

export function createDatabase(): Kysely<Database> {
  if (db) {
    return db;
  }

  const config = getConfig();
  const dbPath = config.DATABASE_PATH;

  // Ensure data directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dialect = new SqliteDialect({
    database: new SQLite(dbPath)
  });

  db = new Kysely<Database>({
    dialect,
    log(event) {
      if (event.level === 'query') {
        console.log('Query:', event.query.sql);
        console.log('Parameters:', event.query.parameters);
      }
    }
  });

  return db;
}

export function getDatabase(): Kysely<Database> {
  if (!db) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

// Helper function to generate IDs
export function generateId(): string {
  return randomUUID();
}
