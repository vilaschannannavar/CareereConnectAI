#!/bin/sh
set -e

# Run database migrations if alembic configuration is present
echo "==> Checking database connection and running Alembic migrations..."
alembic upgrade head || {
    echo "==> Note: Alembic migration reported an error or database is initializing directly. Continuing startup..."
}

echo "==> Starting backend server..."
exec "$@"
