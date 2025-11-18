# Database Management

This document describes the database provider pattern and management scripts.

## 📚 Documentation

- **[Database Developer Guide](./DATABASE_GUIDE.md)** - Complete guide for working with the database (especially helpful for frontend engineers!)
- **[Quick Reference](./DATABASE_QUICK_REF.md)** - One-page cheat sheet for common operations
- **This Document** - Provider pattern and management scripts reference

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

### Migration Commands (Recommended)

The new versioned migration system provides better control over schema changes:

```bash
# Run pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback last batch of migrations
npm run db:migrate:rollback

# Create a new migration
npm run db:make-migration add_feature_name

# Reset database and re-run all migrations
npm run db:migrate:fresh

# Rollback all migrations
npm run db:migrate:reset
```

### Development Data Seeding

Quickly populate your database with realistic test data:

```bash
# Seed realistic data (10 users, 5 puzzles, 50 guesses)
npm run db:seed

# Seed minimal data (2 users, 1 puzzle, 5 guesses)
npm run db:seed:minimal

# Seed stress test data (50 users, 20 puzzles, 500 guesses)
npm run db:seed:stress

# Clear all data (achievements preserved)
npm run db:seed:clear
```

### Legacy Commands (Still Supported)

```bash
# Initialize database (create tables if they don't exist)
npm run db:init

# Reset database (WARNING: deletes all data!)
npm run db:reset

# Check database health
npm run db:health

# Export data to JSON backup
npm run db:export

# Import data from JSON backup
npm run db:import backup.json
```

### Typical Development Workflow

```bash
# First time setup
npm run db:migrate        # Create all tables
npm run db:seed           # Add test data

# Make a schema change
npm run db:make-migration add_new_column
# Edit the generated migration file
npm run db:migrate        # Apply the change

# Need fresh data?
npm run db:seed:clear     # Clear old data
npm run db:seed           # Add fresh data

# Made a mistake?
npm run db:migrate:rollback  # Undo last migration

# Want to start completely fresh?
npm run db:migrate:fresh  # Reset everything
npm run db:seed           # Add test data
```

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
