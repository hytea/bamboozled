import type { Kysely } from 'kysely';
import type { Database } from '../schema.js';

/**
 * Base interface for database providers
 * Allows swapping between SQLite, PostgreSQL, DynamoDB, etc.
 */
export interface DatabaseProvider {
  /**
   * Provider name (e.g., 'sqlite', 'postgres', 'dynamodb')
   */
  name: string;

  /**
   * Initialize the database connection
   */
  connect(): Promise<Kysely<Database>>;

  /**
   * Close the database connection
   */
  disconnect(): Promise<void>;

  /**
   * Check if the database is initialized (tables exist)
   */
  isInitialized(): Promise<boolean>;

  /**
   * Run migrations to create/update schema
   */
  migrate(): Promise<void>;

  /**
   * Reset the database (drop all tables and recreate)
   * WARNING: This will delete all data
   */
  reset(): Promise<void>;

  /**
   * Get health status of the database
   */
  healthCheck(): Promise<boolean>;

  /**
   * Export data for backup/migration
   */
  exportData(): Promise<any>;

  /**
   * Import data from backup/migration
   */
  importData(data: any): Promise<void>;
}

/**
 * Database provider configuration
 */
export interface DatabaseConfig {
  provider: 'sqlite' | 'postgres' | 'dynamodb';

  // SQLite config
  path?: string;

  // PostgreSQL config
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;

  // DynamoDB config
  region?: string;
  tablePrefix?: string;

  // Common config
  enableLogging?: boolean;
}
