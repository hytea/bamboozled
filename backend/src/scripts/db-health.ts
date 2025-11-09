#!/usr/bin/env node
/**
 * Database health check script
 * Usage:
 *   npm run db:health
 */

import { loadConfig } from '../config/env.js';
import { checkDatabaseHealth } from '../db/init.js';
import { createDatabaseProvider } from '../db/providers/factory.js';

loadConfig();

try {
  console.log('🏥 Checking database health...');

  const provider = await createDatabaseProvider();
  await provider.connect();

  const isHealthy = await checkDatabaseHealth();
  const isInitialized = await provider.isInitialized();

  console.log('\n📊 Database Status:');
  console.log(`  Provider: ${provider.name}`);
  console.log(`  Initialized: ${isInitialized ? '✅' : '❌'}`);
  console.log(`  Healthy: ${isHealthy ? '✅' : '❌'}`);

  if (isInitialized && isHealthy) {
    // Get some stats
    const { createDatabase } = await import('../db/connection.js');
    const db = await createDatabase();
    const userCount = await db.selectFrom('users').select(db.fn.count('user_id').as('count')).executeTakeFirst();
    const puzzleCount = await db.selectFrom('puzzles').select(db.fn.count('puzzle_id').as('count')).executeTakeFirst();
    const guessCount = await db.selectFrom('guesses').select(db.fn.count('guess_id').as('count')).executeTakeFirst();

    console.log('\n📈 Database Contents:');
    console.log(`  Users: ${userCount?.count || 0}`);
    console.log(`  Puzzles: ${puzzleCount?.count || 0}`);
    console.log(`  Guesses: ${guessCount?.count || 0}`);
  }

  await provider.disconnect();

  process.exit(isHealthy && isInitialized ? 0 : 1);
} catch (error) {
  console.error('❌ Health check failed:', error);
  process.exit(1);
}
