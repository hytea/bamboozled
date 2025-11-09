#!/usr/bin/env node
/**
 * Database export script
 * Usage:
 *   npm run db:export [output-file]
 *   npm run db:export backup.json
 */

import { loadConfig } from '../config/env.js';
import { exportDatabaseData } from '../db/init.js';
import * as fs from 'fs';
import * as path from 'path';

loadConfig();

const outputFile = process.argv[2] || `backup-${new Date().toISOString().split('T')[0]}.json`;

try {
  console.log('📤 Exporting database...');
  const data = await exportDatabaseData();

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (outputDir !== '.' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

  console.log(`✅ Database exported to ${outputFile}`);
  console.log(`📊 Stats: ${data.data.users.length} users, ${data.data.puzzles.length} puzzles, ${data.data.guesses.length} guesses`);
  process.exit(0);
} catch (error) {
  console.error('❌ Export failed:', error);
  process.exit(1);
}
