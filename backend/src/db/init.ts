import { createDatabase } from './connection.js';
import { up, down } from './migrations.js';

export async function initDatabase(reset: boolean = false): Promise<void> {
  const db = createDatabase();

  try {
    // Check if tables exist
    const tables = await db.introspection.getTables();
    const hasUsers = tables.some(t => t.name === 'users');

    if (reset && hasUsers) {
      console.log('🗑️  Dropping existing tables...');
      await down(db);
    }

    if (!hasUsers || reset) {
      console.log('📦 Creating database tables...');
      await up(db);
      console.log('✅ Database initialized successfully');
    } else {
      console.log('✅ Database already initialized');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = createDatabase();
    await db.selectFrom('users').selectAll().limit(1).execute();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
