#!/bin/bash
# Promote a user to admin by email
# Usage: ./scripts/promote-admin.sh <email> [--production]

set -e

EMAIL=$1
PRODUCTION=$2

if [ -z "$EMAIL" ]; then
  echo "Usage: ./scripts/promote-admin.sh <email> [--production]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/promote-admin.sh user@example.com            # Local/preview"
  echo "  ./scripts/promote-admin.sh user@example.com --production  # Production"
  exit 1
fi

if [ "$PRODUCTION" = "--production" ]; then
  echo "Promoting $EMAIL to admin in PRODUCTION..."
  npx wrangler d1 execute baba-is-win-db --remote --command "UPDATE users SET is_admin = 1 WHERE email = '$EMAIL';"
  echo "Verifying..."
  npx wrangler d1 execute baba-is-win-db --remote --command "SELECT email, username, is_admin FROM users WHERE email = '$EMAIL';"
else
  echo "Promoting $EMAIL to admin locally..."
  npx wrangler d1 execute baba-is-win-db --local --command "UPDATE users SET is_admin = 1 WHERE email = '$EMAIL';"
  echo "Verifying..."
  npx wrangler d1 execute baba-is-win-db --local --command "SELECT email, username, is_admin FROM users WHERE email = '$EMAIL';"
fi

echo ""
echo "Done! User $EMAIL is now an admin."
