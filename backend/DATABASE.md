# Database Management

This document describes the database provider pattern and management scripts.

## Provider Pattern

The database layer uses a provider pattern allowing you to swap between different database backends:

- **SQLite** (default) - Local file-based database, great for development and small deployments
- **PostgreSQL** (planned) - Production-ready SQL database
- **DynamoDB** (planned) - AWS serverless NoSQL database

### Configuration

Set the database provider in your environment:

```bash
# SQLite (default)
DATABASE_PATH=./data/bamboozled.db

# PostgreSQL (future)
DB_PROVIDER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bamboozled
DB_USER=user
DB_PASSWORD=password

# DynamoDB (future)
DB_PROVIDER=dynamodb
DB_REGION=us-east-1
DB_TABLE_PREFIX=bamboozled_
```

## Data Persistence

**IMPORTANT**: The database is now persistent by default. Data will **NOT** be lost when the server restarts.

To reset the database (delete all data), set the environment variable:

```bash
RESET_DB=true npm run dev
```

Or use the reset script:

```bash
npm run db:reset
```

## Management Scripts

### Initialize Database

Create tables if they don't exist (safe, won't delete data):

```bash
cd backend
npm run db:init
```

### Reset Database

**WARNING**: This deletes all data!

```bash
cd backend
npm run db:reset
```

### Check Database Health

View database status and contents:

```bash
cd backend
npm run db:health
```

Example output:
```
🏥 Checking database health...

📊 Database Status:
  Provider: sqlite
  Initialized: ✅
  Healthy: ✅

📈 Database Contents:
  Users: 5
  Puzzles: 30
  Guesses: 42
```

### Export Data (Backup)

Export all data to a JSON file for backup or migration:

```bash
cd backend
npm run db:export                # Creates backup-YYYY-MM-DD.json
npm run db:export my-backup.json  # Custom filename
```

### Import Data (Restore)

Restore data from a backup file:

```bash
cd backend
npm run db:import my-backup.json
```

**WARNING**: This replaces all existing data!

## Implementing New Providers

To add support for PostgreSQL or DynamoDB:

1. Create a new provider class in `src/db/providers/`
2. Implement the `DatabaseProvider` interface
3. Add it to the factory in `src/db/providers/factory.ts`

Example structure:

```typescript
// src/db/providers/postgres.provider.ts
import type { DatabaseProvider } from './base.provider.js';

export class PostgresProvider implements DatabaseProvider {
  name = 'postgres';

  async connect() { /* ... */ }
  async disconnect() { /* ... */ }
  async isInitialized() { /* ... */ }
  async migrate() { /* ... */ }
  async reset() { /* ... */ }
  async healthCheck() { /* ... */ }
  async exportData() { /* ... */ }
  async importData(data: any) { /* ... */ }
}
```

## Migration Strategy

When deploying to production or switching providers:

1. **Export from current database**:
   ```bash
   npm run db:export production-backup-$(date +%Y%m%d).json
   ```

2. **Change provider** (update environment variables)

3. **Import to new database**:
   ```bash
   npm run db:import production-backup-20251109.json
   ```

## SQLite Best Practices

### Development
- Database file stored in `./data/bamboozled.db`
- Add `data/` to `.gitignore` (already done)
- Use `npm run db:export` to share test data

### Production (Small Scale)
- SQLite works great for small teams (<50 concurrent users)
- Mount persistent volume for Docker deployments
- Regular backups with `npm run db:export`

### When to Switch to PostgreSQL
- High concurrency (50+ simultaneous connections)
- Multiple server instances (horizontal scaling)
- Advanced query performance needs
- Cloud database management (RDS, etc.)

## Troubleshooting

### Database locked error
SQLite has limited concurrency. Consider PostgreSQL for high-traffic deployments.

### Data not persisting
Check that:
- `RESET_DB` is not set to `true`
- Database file path is writable
- Docker volume is mounted correctly

### Missing tables after upgrade
Run migrations:
```bash
npm run db:init
```

### Corrupt database
Restore from backup:
```bash
npm run db:import latest-backup.json
```
