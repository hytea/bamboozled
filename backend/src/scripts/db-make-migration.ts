#!/usr/bin/env node
/**
 * Generate a new migration file
 *
 * Usage:
 *   npm run db:make-migration <name>
 *
 * Example:
 *   npm run db:make-migration add_user_preferences
 *   npm run db:make-migration create_notifications_table
 */

import { generateMigrationFile } from '../db/migration-manager.js';

const name = process.argv[2];

if (!name) {
  console.error('❌ Error: Migration name is required');
  console.log('');
  console.log('Usage:');
  console.log('  npm run db:make-migration <name>');
  console.log('');
  console.log('Examples:');
  console.log('  npm run db:make-migration add_user_preferences');
  console.log('  npm run db:make-migration create_notifications_table');
  console.log('  npm run db:make-migration add_index_to_guesses');
  console.log('');
  process.exit(1);
}

// Validate migration name (should be snake_case)
if (!/^[a-z0-9_]+$/.test(name)) {
  console.error('❌ Error: Migration name must be snake_case (lowercase letters, numbers, and underscores only)');
  console.log('');
  console.log('Examples of valid names:');
  console.log('  - add_user_preferences');
  console.log('  - create_notifications_table');
  console.log('  - add_index_to_guesses_table');
  console.log('');
  process.exit(1);
}

try {
  generateMigrationFile(name);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Edit the migration file and add your changes');
  console.log('  2. Run the migration: npm run db:migrate');
  console.log('  3. Check status: npm run db:migrate:status');
  console.log('');
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to generate migration:', error);
  process.exit(1);
}
