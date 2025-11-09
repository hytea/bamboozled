import type { DatabaseProvider, DatabaseConfig } from './base.provider.js';
import { SQLiteProvider } from './sqlite.provider.js';
import { getConfig } from '../../config/env.js';

let providerInstance: DatabaseProvider | null = null;

/**
 * Create a database provider based on configuration
 */
export async function createDatabaseProvider(config?: DatabaseConfig): Promise<DatabaseProvider> {
  if (providerInstance) {
    return providerInstance;
  }

  const envConfig = getConfig();

  // If no config provided, use environment config
  const dbConfig: DatabaseConfig = config || {
    provider: 'sqlite',
    path: envConfig.DATABASE_PATH,
    enableLogging: envConfig.NODE_ENV === 'development'
  };

  switch (dbConfig.provider) {
    case 'sqlite':
      providerInstance = new SQLiteProvider(dbConfig);
      break;

    case 'postgres':
      throw new Error('PostgreSQL provider not yet implemented. Contribution welcome!');

    case 'dynamodb':
      throw new Error('DynamoDB provider not yet implemented. Contribution welcome!');

    default:
      throw new Error(`Unknown database provider: ${(dbConfig as any).provider}`);
  }

  return providerInstance;
}

/**
 * Get the current database provider instance
 */
export function getDatabaseProvider(): DatabaseProvider {
  if (!providerInstance) {
    throw new Error('Database provider not initialized. Call createDatabaseProvider() first.');
  }
  return providerInstance;
}

/**
 * Close the database provider
 */
export async function closeDatabaseProvider(): Promise<void> {
  if (providerInstance) {
    await providerInstance.disconnect();
    providerInstance = null;
  }
}
