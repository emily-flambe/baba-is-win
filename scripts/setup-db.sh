#!/bin/bash

echo "Setting up local D1 database for authentication..."

# Create the D1 database locally
echo "Creating local D1 database..."
wrangler d1 create baba-is-win-db --local

# Execute the migration
echo "Running database migrations..."
wrangler d1 execute baba-is-win-db --local --file=./migrations/0001_create_auth_tables.sql

echo "Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Update wrangler.json with the database_id from the output above"
echo "2. Generate a JWT secret: openssl rand -base64 32"
echo "3. Add the JWT secret to wrangler.json vars section"
echo "4. Run: npm run dev"