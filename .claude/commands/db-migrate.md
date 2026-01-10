---
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# Create Database Migration

Create and apply a new D1 database migration.

## Arguments

Description of the schema change needed.

## Instructions

1. List existing migrations to determine next number:
   ```bash
   ls migrations/
   ```

2. Based on the description in $ARGUMENTS, create the SQL migration:
   - Use the next sequential number (e.g., `0015_description.sql`)
   - Include both the change and any necessary indexes
   - Use IF NOT EXISTS for safety where appropriate

3. Write the migration file to `migrations/NNNN_description.sql`

4. Show the migration content for review:
   ```bash
   cat migrations/NNNN_description.sql
   ```

5. Provide the command to apply (but don't run it without confirmation):
   ```
   To apply locally:
   npx wrangler d1 migrations apply baba-is-win-db --local

   To apply to production:
   npx wrangler d1 migrations apply baba-is-win-db --remote
   ```

6. Remind user to test locally before applying to production.
