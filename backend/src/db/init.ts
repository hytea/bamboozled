import { createDatabaseProvider } from './providers/factory.js';

/**
 * Initialize the database
 * @param reset If true, drops all tables and recreates them (WARNING: deletes all data)
 */
export async function initDatabase(reset: boolean = false): Promise<void> {
  try {
    const provider = await createDatabaseProvider();

    // Connect to database
    await provider.connect();

    // Check if database is already initialized
    const isInitialized = await provider.isInitialized();

    if (reset) {
      console.log('⚠️  Reset flag enabled - resetting database...');
      await provider.reset();
      console.log('✅ Database reset complete');
      return;
    }

    if (!isInitialized) {
      console.log('📦 Database not initialized. Running migrations...');
      await provider.migrate();
      console.log('✅ Database initialized successfully');
    } else {
      console.log('✅ Database already initialized - skipping migrations');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const provider = await createDatabaseProvider();
    return await provider.healthCheck();
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Export database data for backup
 */
export async function exportDatabaseData(): Promise<any> {
  const provider = await createDatabaseProvider();
  return await provider.exportData();
}

/**
 * Import database data from backup
 */
export async function importDatabaseData(data: any): Promise<void> {
  const provider = await createDatabaseProvider();
  await provider.importData(data);
}
