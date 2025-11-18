#!/usr/bin/env node
/**
 * Database seeding script
 *
 * Usage:
 *   npm run db:seed                 # Seed realistic development data
 *   npm run db:seed minimal         # Seed minimal data (quick)
 *   npm run db:seed realistic       # Seed realistic data (default)
 *   npm run db:seed stress          # Seed stress test data (lots of data)
 *   npm run db:seed clear           # Clear all data (except achievements)
 */

import { loadConfig } from '../config/env.js';
import { createDatabaseProvider } from '../db/providers/factory.js';
import {
  seedMinimal,
  seedRealistic,
  seedStress,
  clearDevelopmentData,
  seedDevelopmentData,
} from '../db/seeders.js';

loadConfig();

const command = process.argv[2] || 'realistic';

async function main() {
  const provider = await createDatabaseProvider();
  const db = await provider.connect();

  try {
    switch (command) {
      case 'minimal':
        console.log('🌱 Seeding minimal development data...');
        await seedMinimal(db);
        break;

      case 'realistic':
      case 'default':
        console.log('🌱 Seeding realistic development data...');
        await seedRealistic(db);
        break;

      case 'stress':
        console.log('🌱 Seeding stress test data...');
        console.log('⚠️  This will create a lot of data and may take a while...');
        await seedStress(db);
        break;

      case 'clear':
        console.log('⚠️  WARNING: This will clear all development data!');
        console.log('⚠️  Achievements will be preserved.');
        console.log('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to continue...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await clearDevelopmentData(db);
        break;

      case 'custom':
        // Allow custom seeding with args: npm run db:seed custom 10 5 100
        const users = parseInt(process.argv[3] || '5', 10);
        const puzzles = parseInt(process.argv[4] || '3', 10);
        const guesses = parseInt(process.argv[5] || '20', 10);

        console.log(
          `🌱 Seeding custom data (${users} users, ${puzzles} puzzles, ${guesses} guesses)...`
        );
        await seedDevelopmentData(db, { users, puzzles, guesses });
        break;

      default:
        console.error(`Unknown seeding command: ${command}`);
        console.log('');
        console.log('Available commands:');
        console.log('  minimal        Seed minimal data (2 users, 1 puzzle, 5 guesses)');
        console.log('  realistic      Seed realistic data (10 users, 5 puzzles, 50 guesses)');
        console.log('  stress         Seed stress test data (50 users, 20 puzzles, 500 guesses)');
        console.log('  clear          Clear all development data');
        console.log('  custom <users> <puzzles> <guesses>  Seed custom amounts');
        process.exit(1);
    }

    console.log('');
    console.log('✅ Seeding complete! Your database is ready for development.');
    console.log('');
    console.log('Next steps:');
    console.log('  - Start the server: npm run dev');
    console.log('  - Check database stats: npm run db:health');
    console.log('  - Export data: npm run db:export');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
