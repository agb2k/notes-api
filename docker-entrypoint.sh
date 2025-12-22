#!/bin/sh
set -e

# Determine environment - default to production if NODE_ENV is not set
NODE_ENV=${NODE_ENV:-production}
export NODE_ENV

# Get database connection details
export DB_HOST=${DB_HOST:-mysql}
export DB_PORT=${DB_PORT:-3306}
export DB_USER=${DB_USER:-root}
export DB_PASSWORD=${DB_PASSWORD:-test123}
export DB_NAME=${DB_NAME:-notes_db}

echo "Waiting for database to be ready..."
echo "Database configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Environment: $NODE_ENV"

# Wait for database to be ready
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Use mysql client if available, otherwise use nc (netcat) to check port
  if command -v mysql >/dev/null 2>&1; then
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; then
      echo "Database is ready!"
      break
    fi
  elif command -v nc >/dev/null 2>&1; then
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
      echo "Database port is open, assuming ready..."
      sleep 2
      break
    fi
  else
    # Fallback: just wait if mysql/nc are not available
    if [ $RETRY_COUNT -eq 0 ]; then
      echo "No mysql or nc available, using fallback wait..."
      sleep 5
      break
    fi
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Warning: Database connection check timed out, but continuing anyway..."
fi

echo "Running database migrations..."
# Run database migrations with explicit environment
if npx sequelize-cli db:migrate --env "$NODE_ENV"; then
  echo "Migrations completed successfully"
else
  echo "Migration failed or already up to date"
  # Don't exit on migration failure - might be a connection issue that app can handle
fi

echo "Starting application..."
# Start the application
exec "$@"

