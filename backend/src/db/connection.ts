import type { Kysely } from 'kysely';
import type { Database } from './schema.js';
import { randomUUID } from 'crypto';
import { createDatabaseProvider, getDatabaseProvider } from './providers/factory.js';

let db: Kysely<Database> | null = null;

/**
 * Create and connect to the database using the configured provider
 * @deprecated Use createDatabaseProvider() from providers/factory.ts instead
 */
export async function createDatabase(): Promise<Kysely<Database>> {
  if (db) {
    return db;
  }

  const provider = await createDatabaseProvider();
  db = await provider.connect();
  return db;
}

/**
 * Get the database instance
 * Throws if database not initialized
 */
export function getDatabase(): Kysely<Database> {
  if (!db) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 * @deprecated Use closeDatabaseProvider() from providers/factory.ts instead
 */
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
