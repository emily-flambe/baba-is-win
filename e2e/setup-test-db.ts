import Database from 'better-sqlite3';
import { webcrypto } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, readFileSync } from 'fs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(currentDir, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');

// Use same hashing as the app (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(hash);
  const saltedHash = new Uint8Array(salt.length + hashArray.length);
  saltedHash.set(salt);
  saltedHash.set(hashArray, salt.length);

  return btoa(String.fromCharCode(...saltedHash));
}

async function main() {
  // Find the SQLite file
  const files = readdirSync(DB_PATH).filter(f => f.endsWith('.sqlite') && !f.includes('-shm') && !f.includes('-wal'));
  if (files.length === 0) {
    console.error('No SQLite database found. Run `npm run dev` first to create it.');
    process.exit(1);
  }

  const dbFile = join(DB_PATH, files[0]);
  console.log('Using database:', dbFile);

  const db = new Database(dbFile);

  // Run migrations
  const migrationsDir = join(currentDir, '../migrations');
  const migrations = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Running migrations...');
  for (const migration of migrations) {
    const sql = readFileSync(join(migrationsDir, migration), 'utf-8');
    try {
      db.exec(sql);
      console.log(`  Applied: ${migration}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Ignore "already exists" errors
      if (!message.includes('already exists')) {
        console.log(`  Warning ${migration}: ${message}`);
      } else {
        console.log(`  Skipped ${migration} (already applied)`);
      }
    }
  }

  // Create test user
  console.log('\nCreating test user...');
  const passwordHash = await hashPassword('hunter2');

  try {
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, username, password_hash, is_admin, created_at, updated_at)
      VALUES ('test-user-id', 'emily@test.com', 'emily', ?, 1, unixepoch(), unixepoch())
    `).run(passwordHash);

    console.log('  Test user created: emily / hunter2');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('  Failed to create test user:', message);
  }

  // Verify essential tables exist (catches migration issues)
  console.log('\nVerifying essential tables...');
  const requiredTables = ['users', 'sessions', 'blog_posts', 'thoughts'];
  const existingTables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map((r: { name: string }) => r.name);

  const missingTables = requiredTables.filter(t => !existingTables.includes(t));
  if (missingTables.length > 0) {
    console.error(`  FATAL: Missing required tables: ${missingTables.join(', ')}`);
    console.error('  This indicates migrations were not properly applied.');
    process.exit(1);
  }
  console.log('  All required tables present:', requiredTables.join(', '));

  db.close();
  console.log('\nDone!');
}

main().catch(console.error);
