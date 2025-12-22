# Test Setup Guide

This guide explains how to set up and run tests for the Notes API.

## Prerequisites

Before running tests, ensure you have:

1. **MySQL Server** running and accessible
   - Default connection: `localhost:3306`
   - Default user: `root`
   - Default password: `test123` (or set via `DB_PASSWORD` env var)

2. **Redis Server** running and accessible
   - Default connection: `localhost:6379`

## Quick Start

### Option 1: Automatic Setup (Recommended)

Run the setup script and tests in one command:

```bash
npm run test:full
```

This will:
1. Create the test database (`notes_db_test`) if it doesn't exist
2. Run all database migrations
3. Execute all tests

### Option 2: Manual Setup

1. **Set up the test database:**
   ```bash
   npm run test:setup
   ```

   This script will:
   - Create the `notes_db_test` database
   - Run all migrations to set up the schema

2. **Run tests:**
   ```bash
   npm test
   ```

## Environment Variables

You can customize the test database connection by setting these environment variables:

```bash
export DB_HOST=localhost        # Default: localhost
export DB_PORT=3306             # Default: 3306
export DB_USER=root              # Default: root
export DB_PASSWORD=yourpassword  # Default: test123
export DB_NAME=notes_db_test     # Default: notes_db_test
```

Or create a `.env.test` file in the project root:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=test123
DB_NAME=notes_db_test
```

## Test Scripts

- `npm run test:setup` - Set up test database (create DB and run migrations)
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:full` - Set up test database and run all tests

## Test Structure

- **Unit Tests**: `tests/unit/` - Test individual functions and utilities
- **Integration Tests**: `tests/integration/` - Test API endpoints (requires database)

## Troubleshooting

### Database Connection Errors

If you see "Access denied" or "Connection refused" errors:

1. Verify MySQL is running:
   ```bash
   # On Windows
   # Check MySQL service in Services

   # On Linux/Mac
   sudo systemctl status mysql
   ```

2. Check your credentials match the MySQL server:
   ```bash
   mysql -u root -p -h localhost
   ```

3. Create the database manually if needed:
   ```sql
   CREATE DATABASE notes_db_test;
   ```

### Redis Connection Errors

If Redis is not available, unit tests will still pass, but integration tests may fail. Ensure Redis is running:

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### Migration Errors

If migrations fail, you can reset the test database:

```sql
DROP DATABASE IF EXISTS notes_db_test;
CREATE DATABASE notes_db_test;
```

Then run `npm run test:setup` again.

## Notes

- The test database is separate from your development/production databases
- Tests are designed to gracefully handle missing databases (they'll skip with warnings)
- Integration tests require both MySQL and Redis to be running
- Unit tests can run without a database connection

