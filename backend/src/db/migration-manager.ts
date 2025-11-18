import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Migration {
  name: string;
  timestamp: number;
  up: (db: Kysely<any>) => Promise<void>;
  down: (db: Kysely<any>) => Promise<void>;
}

export interface MigrationRecord {
  migration_name: string;
  executed_at: string;
  batch: number;
}

/**
 * Migration Manager
 *
 * Provides a robust, versioned migration system with:
 * - Automatic migration tracking
 * - Rollback support
 * - Batch operations
 * - Developer-friendly CLI
 *
 * Usage:
 *   const manager = new MigrationManager(db);
 *   await manager.migrate(); // Run pending migrations
 *   await manager.rollback(); // Rollback last batch
 *   await manager.status(); // See migration status
 */
export class MigrationManager {
  constructor(private db: Kysely<any>) {}

  /**
   * Ensure the migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    await this.db.schema
      .createTable('_migrations')
      .ifNotExists()
      .addColumn('migration_name', 'text', (col) => col.primaryKey())
      .addColumn('executed_at', 'text', (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .addColumn('batch', 'integer', (col) => col.notNull())
      .execute();
  }

  /**
   * Get all available migrations from the migrations directory
   */
  private async getAvailableMigrations(): Promise<Migration[]> {
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found, creating...');
      fs.mkdirSync(migrationsDir, { recursive: true });
      return [];
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      const migration = await import(migrationPath);

      if (!migration.up || !migration.down) {
        console.warn(`⚠️  Migration ${file} is missing up() or down() function`);
        continue;
      }

      migrations.push({
        name: file.replace(/\.(ts|js)$/, ''),
        timestamp: this.extractTimestamp(file),
        up: migration.up,
        down: migration.down,
      });
    }

    return migrations.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Extract timestamp from migration filename (format: YYYYMMDDHHMMSS_name.ts)
   */
  private extractTimestamp(filename: string): number {
    const match = filename.match(/^(\d{14})_/);
    if (!match) {
      throw new Error(
        `Invalid migration filename: ${filename}. Expected format: YYYYMMDDHHMMSS_name.ts`
      );
    }
    return parseInt(match[1], 10);
  }

  /**
   * Get executed migrations from the database
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const result = await this.db
        .selectFrom('_migrations')
        .selectAll()
        .orderBy('batch', 'asc')
        .orderBy('executed_at', 'asc')
        .execute();
      return result as MigrationRecord[];
    } catch (error) {
      // Table doesn't exist yet
      return [];
    }
  }

  /**
   * Get the next batch number
   */
  private async getNextBatch(): Promise<number> {
    const executed = await this.getExecutedMigrations();
    if (executed.length === 0) return 1;
    return Math.max(...executed.map((m) => m.batch)) + 1;
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.ensureMigrationsTable();

    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map((m) => m.migration_name));

    const pending = available.filter((m) => !executedNames.has(m.name));

    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📦 Running ${pending.length} migration(s)...`);

    const batch = await this.getNextBatch();

    for (const migration of pending) {
      console.log(`  ⏳ Running: ${migration.name}`);

      try {
        await migration.up(this.db);

        await this.db
          .insertInto('_migrations')
          .values({
            migration_name: migration.name,
            executed_at: new Date().toISOString(),
            batch,
          })
          .execute();

        console.log(`  ✅ Completed: ${migration.name}`);
      } catch (error) {
        console.error(`  ❌ Failed: ${migration.name}`, error);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  /**
   * Rollback the last batch of migrations
   */
  async rollback(): Promise<void> {
    await this.ensureMigrationsTable();

    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }

    const lastBatch = Math.max(...executed.map((m) => m.batch));
    const toRollback = executed.filter((m) => m.batch === lastBatch);
    const available = await this.getAvailableMigrations();

    console.log(`⏪ Rolling back ${toRollback.length} migration(s) from batch ${lastBatch}...`);

    // Rollback in reverse order
    for (const record of toRollback.reverse()) {
      const migration = available.find((m) => m.name === record.migration_name);

      if (!migration) {
        console.warn(`⚠️  Migration file not found: ${record.migration_name}`);
        continue;
      }

      console.log(`  ⏳ Rolling back: ${migration.name}`);

      try {
        await migration.down(this.db);

        await this.db
          .deleteFrom('_migrations')
          .where('migration_name', '=', migration.name)
          .execute();

        console.log(`  ✅ Rolled back: ${migration.name}`);
      } catch (error) {
        console.error(`  ❌ Rollback failed: ${migration.name}`, error);
        throw error;
      }
    }

    console.log('✅ Rollback completed successfully');
  }

  /**
   * Get migration status
   */
  async status(): Promise<void> {
    await this.ensureMigrationsTable();

    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map((m) => m.migration_name));

    console.log('\n📊 Migration Status\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (available.length === 0) {
      console.log('No migrations found');
      return;
    }

    for (const migration of available) {
      const isExecuted = executedNames.has(migration.name);
      const status = isExecuted ? '✅ Executed' : '⏳ Pending';
      const executedInfo = isExecuted
        ? executed.find((m) => m.migration_name === migration.name)
        : null;

      console.log(`${status} | ${migration.name}`);

      if (executedInfo) {
        console.log(`         Batch: ${executedInfo.batch}, Executed: ${executedInfo.executed_at}`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const pending = available.filter((m) => !executedNames.has(m.name));
    console.log(`\nTotal: ${available.length} | Executed: ${executed.length} | Pending: ${pending.length}\n`);
  }

  /**
   * Reset the entire database (run all down migrations)
   */
  async reset(): Promise<void> {
    await this.ensureMigrationsTable();

    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      console.log('ℹ️  Database is already empty');
      return;
    }

    const available = await this.getAvailableMigrations();

    console.log(`⚠️  Resetting database (rolling back ${executed.length} migration(s))...`);

    // Rollback all migrations in reverse order
    for (const record of executed.reverse()) {
      const migration = available.find((m) => m.name === record.migration_name);

      if (!migration) {
        console.warn(`⚠️  Migration file not found: ${record.migration_name}`);
        continue;
      }

      console.log(`  ⏳ Rolling back: ${migration.name}`);

      try {
        await migration.down(this.db);

        await this.db
          .deleteFrom('_migrations')
          .where('migration_name', '=', migration.name)
          .execute();

        console.log(`  ✅ Rolled back: ${migration.name}`);
      } catch (error) {
        console.error(`  ❌ Rollback failed: ${migration.name}`, error);
        throw error;
      }
    }

    console.log('✅ Database reset complete');
  }

  /**
   * Fresh database (reset + migrate)
   */
  async fresh(): Promise<void> {
    console.log('🔄 Performing fresh migration...');
    await this.reset();
    await this.migrate();
    console.log('✅ Fresh migration complete');
  }
}

/**
 * Generate a new migration file
 *
 * Usage:
 *   npm run db:make-migration add_user_preferences
 */
export function generateMigrationFile(name: string): void {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .replace(/\..+/, '')
    .slice(0, 14);

  const filename = `${timestamp}_${name}.ts`;
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const template = `import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

export async function up(db: Kysely<any>): Promise<void> {
  // Add your migration logic here
  // Example: Create a new table
  // await db.schema
  //   .createTable('new_table')
  //   .addColumn('id', 'text', (col) => col.primaryKey())
  //   .addColumn('name', 'text', (col) => col.notNull())
  //   .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Add your rollback logic here
  // Example: Drop the table
  // await db.schema.dropTable('new_table').execute();
}
`;

  const filepath = path.join(migrationsDir, filename);
  fs.writeFileSync(filepath, template);

  console.log(`✅ Created migration: ${filename}`);
  console.log(`📝 Edit: ${filepath}`);
}
