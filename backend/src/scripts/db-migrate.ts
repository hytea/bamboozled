#!/usr/bin/env node
/**
 * Database migration script
 *
 * Usage:
 *   npm run db:migrate              # Run pending migrations
 *   npm run db:migrate:status       # Check migration status
 *   npm run db:migrate:rollback     # Rollback last batch
 *   npm run db:migrate:fresh        # Reset and re-run all migrations
 */

import { loadConfig } from '../config/env.js';
import { createDatabaseProvider } from '../db/providers/factory.js';
import { MigrationManager } from '../db/migration-manager.js';

loadConfig();

const command = process.argv[2] || 'migrate';

async function main() {
  const provider = await createDatabaseProvider();
  await provider.connect();

  const db = await provider.connect();
  const manager = new MigrationManager(db);

  try {
    switch (command) {
      case 'migrate':
      case 'up':
        await manager.migrate();
        break;

      case 'status':
        await manager.status();
        break;

      case 'rollback':
      case 'down':
        console.log('⚠️  WARNING: This will rollback the last batch of migrations!');
        console.log('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to continue...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await manager.rollback();
        break;

      case 'fresh':
        console.log('⚠️  WARNING: This will DELETE ALL DATA and re-run migrations!');
        console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await manager.fresh();
        break;

      case 'reset':
        console.log('⚠️  WARNING: This will DELETE ALL DATA!');
        console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await manager.reset();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('');
        console.log('Available commands:');
        console.log('  migrate        Run pending migrations');
        console.log('  status         Check migration status');
        console.log('  rollback       Rollback last batch');
        console.log('  fresh          Reset and re-run all migrations');
        console.log('  reset          Rollback all migrations');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration command failed:', error);
    process.exit(1);
  }
}

main();
