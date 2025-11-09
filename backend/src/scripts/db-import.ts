#!/usr/bin/env node
/**
 * Database import script
 * Usage:
 *   npm run db:import <backup-file>
 *   npm run db:import backup.json
 */

import { loadConfig } from '../config/env.js';
import { importDatabaseData } from '../db/init.js';
import * as fs from 'fs';

loadConfig();

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('❌ Please provide a backup file to import');
  console.error('Usage: npm run db:import <backup-file>');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ File not found: ${inputFile}`);
  process.exit(1);
}

try {
  console.log(`📥 Importing database from ${inputFile}...`);

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  console.log('⚠️  WARNING: This will REPLACE ALL DATA in the database!');
  console.log('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to continue...');

  await new Promise(resolve => setTimeout(resolve, 3000));

  await importDatabaseData(data);

  console.log('✅ Database import complete');
  console.log(`📊 Imported: ${data.data.users.length} users, ${data.data.puzzles.length} puzzles, ${data.data.guesses.length} guesses`);
  process.exit(0);
} catch (error) {
  console.error('❌ Import failed:', error);
  process.exit(1);
}
