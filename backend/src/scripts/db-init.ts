#!/usr/bin/env node
/**
 * Database initialization script
 * Usage:
 *   npm run db:init          # Initialize database (create tables if not exists)
 *   npm run db:init --reset  # Reset database (WARNING: deletes all data)
 */

import { loadConfig } from '../config/env.js';
import { initDatabase } from '../db/init.js';

loadConfig();

const shouldReset = process.argv.includes('--reset');

if (shouldReset) {
  console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
  console.log('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to continue...');

  await new Promise(resolve => setTimeout(resolve, 3000));
}

try {
  await initDatabase(shouldReset);
  console.log('✅ Database initialization complete');
  process.exit(0);
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}
