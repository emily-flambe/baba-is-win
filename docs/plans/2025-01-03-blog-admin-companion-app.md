# Blog Admin Companion App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a personal blogging platform with web and mobile (APK) interfaces for creating/editing thoughts and blog posts, backed by D1 database.

**Architecture:** Extend baba-is-win with content stored in D1 (migrated from markdown files). Create a standalone Svelte SPA for the admin editor that can be wrapped with Capacitor for Android. The main site reads from D1, the admin app writes to D1.

**Tech Stack:**
- Backend: Cloudflare Workers + D1 (existing baba-is-win infrastructure)
- Admin Web: Svelte SPA (standalone, static build)
- Admin Mobile: Capacitor 8 wrapping the Svelte SPA
- CI/CD: GitHub Actions (following splitdumb/exercise-tracker patterns)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     baba-is-win (Astro + Svelte)                    │
│                                                                      │
│  Public Pages:           │  API Routes:          │  Existing:        │
│  /blog/[slug]  ─────────▶│  /api/admin/posts     │  - JWT Auth       │
│  /thoughts/[slug] ──────▶│  /api/admin/thoughts  │  - D1 Database    │
│  /blog                   │  /api/admin/images    │  - R2 (unused)    │
│  /thoughts               │                       │  - Email system   │
│                          │                       │                   │
│  ▲ Reads from D1         │  ▲ Protected routes   │                   │
└──────────────────────────┴───────────────────────┴───────────────────┘
                                    │
                                    │ JWT Auth + REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    blog-admin/ (New Svelte SPA)                      │
│                                                                      │
│  Features:                │  Build Outputs:       │  Deployment:      │
│  - Markdown editor        │  - /dist (web)        │  - Web: /admin/*  │
│  - Image upload to R2     │  - /android (APK)     │  - APK: GitHub    │
│  - Draft/publish toggle   │                       │    Releases       │
│  - Tag management         │                       │                   │
│  - Color picker (thoughts)│                       │                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema & Migration

### Task 1.1: Create Content Tables Migration

**Files:**
- Create: `migrations/0014_content_tables.sql`

**Step 1: Write the migration file**

```sql
-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    thumbnail TEXT,
    tags TEXT, -- JSON array: ["tag1", "tag2"]
    premium INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    publish_date TEXT,
    reading_time_minutes INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_publish_date ON blog_posts(publish_date DESC);

-- Thoughts Table
CREATE TABLE IF NOT EXISTS thoughts (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    color TEXT, -- Hex color for background
    images TEXT, -- JSON array: [{"url": "...", "offset": {...}}]
    tags TEXT, -- JSON array: ["tag1", "tag2"]
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    publish_date TEXT,
    publish_time TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_thoughts_slug ON thoughts(slug);
CREATE INDEX idx_thoughts_status ON thoughts(status);
CREATE INDEX idx_thoughts_publish_date ON thoughts(publish_date DESC);

-- Content Revisions (optional - for version history)
CREATE TABLE IF NOT EXISTS content_revisions (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'thought')),
    content_id TEXT NOT NULL,
    content_snapshot TEXT NOT NULL, -- JSON of full content at revision time
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_revisions_content ON content_revisions(content_type, content_id);
```

**Step 2: Apply migration locally**

Run: `wrangler d1 execute baba-is-win-db --local --file=./migrations/0014_content_tables.sql`
Expected: Success message, tables created

**Step 3: Verify tables exist**

Run: `wrangler d1 execute baba-is-win-db --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name IN ('blog_posts', 'thoughts', 'content_revisions');"`
Expected: 3 rows returned

**Step 4: Commit**

```bash
git add migrations/0014_content_tables.sql
git commit -m "feat: add blog_posts and thoughts tables for D1 content storage"
```

---

### Task 1.2: Create Migration Script

**Files:**
- Create: `scripts/migrate-content-to-d1.ts`

**Step 1: Write the migration script**

```typescript
/**
 * Migration script to import existing markdown files into D1
 * Run with: npx tsx scripts/migrate-content-to-d1.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import crypto from 'crypto';

const BLOG_DIR = 'src/data/blog-posts/published';
const THOUGHTS_DIR = 'src/data/thoughts/published';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  thumbnail: string | null;
  tags: string;
  premium: number;
  status: string;
  publish_date: string;
  reading_time_minutes: number;
}

interface Thought {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  color: string | null;
  images: string;
  tags: string;
  status: string;
  publish_date: string;
  publish_time: string | null;
}

function generateId(): string {
  return crypto.randomUUID();
}

function extractSlugFromFilename(filename: string): string {
  // Format: YYYYMMDD-slug.md or YYYYMMDD_slug.md
  const match = filename.match(/^\d{8}[-_](.+)\.md$/);
  return match ? match[1] : filename.replace('.md', '');
}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function parseBlogPost(filePath: string): BlogPost {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(fileContent);
  const filename = path.basename(filePath);
  const slug = extractSlugFromFilename(filename);

  return {
    id: generateId(),
    slug,
    title: frontmatter.title || 'Untitled',
    description: frontmatter.description || '',
    content: content.trim(),
    thumbnail: frontmatter.thumbnail || null,
    tags: JSON.stringify(frontmatter.tags || []),
    premium: frontmatter.premium ? 1 : 0,
    status: 'published',
    publish_date: frontmatter.publishDate || new Date().toISOString(),
    reading_time_minutes: calculateReadingTime(content),
  };
}

function parseThought(filePath: string): Thought {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter } = matter(fileContent);
  const filename = path.basename(filePath);
  const slug = extractSlugFromFilename(filename);

  // Thoughts store content in frontmatter, not body
  const content = frontmatter.content || '';

  return {
    id: generateId(),
    slug,
    title: frontmatter.title || null,
    content: typeof content === 'string' ? content : content.toString(),
    color: frontmatter.color || null,
    images: JSON.stringify(frontmatter.images || []),
    tags: JSON.stringify(frontmatter.tags || []),
    status: 'published',
    publish_date: frontmatter.publishDate || new Date().toISOString(),
    publish_time: frontmatter.publishTime || null,
  };
}

function generateSQL(blogPosts: BlogPost[], thoughts: Thought[]): string {
  const statements: string[] = [];

  for (const post of blogPosts) {
    const escapedContent = post.content.replace(/'/g, "''");
    const escapedTitle = post.title.replace(/'/g, "''");
    const escapedDesc = post.description.replace(/'/g, "''");

    statements.push(`
INSERT INTO blog_posts (id, slug, title, description, content, thumbnail, tags, premium, status, publish_date, reading_time_minutes)
VALUES ('${post.id}', '${post.slug}', '${escapedTitle}', '${escapedDesc}', '${escapedContent}', ${post.thumbnail ? `'${post.thumbnail}'` : 'NULL'}, '${post.tags}', ${post.premium}, '${post.status}', '${post.publish_date}', ${post.reading_time_minutes});
    `.trim());
  }

  for (const thought of thoughts) {
    const escapedContent = thought.content.replace(/'/g, "''");
    const escapedTitle = thought.title ? thought.title.replace(/'/g, "''") : null;

    statements.push(`
INSERT INTO thoughts (id, slug, title, content, color, images, tags, status, publish_date, publish_time)
VALUES ('${thought.id}', '${thought.slug}', ${escapedTitle ? `'${escapedTitle}'` : 'NULL'}, '${escapedContent}', ${thought.color ? `'${thought.color}'` : 'NULL'}, '${thought.images}', '${thought.tags}', '${thought.status}', '${thought.publish_date}', ${thought.publish_time ? `'${thought.publish_time}'` : 'NULL'});
    `.trim());
  }

  return statements.join('\n\n');
}

async function main() {
  console.log('Starting content migration to D1...\n');

  // Parse blog posts
  const blogFiles = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const blogPosts = blogFiles.map(f => parseBlogPost(path.join(BLOG_DIR, f)));
  console.log(`Found ${blogPosts.length} blog posts`);

  // Parse thoughts
  const thoughtFiles = fs.readdirSync(THOUGHTS_DIR).filter(f => f.endsWith('.md'));
  const thoughts = thoughtFiles.map(f => parseThought(path.join(THOUGHTS_DIR, f)));
  console.log(`Found ${thoughts.length} thoughts`);

  // Generate SQL
  const sql = generateSQL(blogPosts, thoughts);

  // Write to file
  const outputPath = 'scripts/migration-data.sql';
  fs.writeFileSync(outputPath, sql);
  console.log(`\nGenerated SQL written to: ${outputPath}`);
  console.log('\nTo apply migration:');
  console.log('  Local:  wrangler d1 execute baba-is-win-db --local --file=./scripts/migration-data.sql');
  console.log('  Remote: wrangler d1 execute baba-is-win-db --remote --file=./scripts/migration-data.sql');
}

main().catch(console.error);
```

**Step 2: Run the migration script**

Run: `npx tsx scripts/migrate-content-to-d1.ts`
Expected: SQL file generated at `scripts/migration-data.sql`

**Step 3: Apply migration to local database**

Run: `wrangler d1 execute baba-is-win-db --local --file=./scripts/migration-data.sql`
Expected: Success, content inserted

**Step 4: Verify migration**

Run: `wrangler d1 execute baba-is-win-db --local --command="SELECT COUNT(*) as count FROM blog_posts; SELECT COUNT(*) as count FROM thoughts;"`
Expected: Counts match number of markdown files

**Step 5: Commit**

```bash
git add scripts/migrate-content-to-d1.ts
git commit -m "feat: add migration script for markdown to D1"
```

---

### Task 1.3: Create Database Query Functions

**Files:**
- Create: `src/lib/db/content.ts`

**Step 1: Write the content database queries**

```typescript
import type { D1Database } from '@cloudflare/workers-types';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  thumbnail: string | null;
  tags: string[]; // Parsed from JSON
  premium: boolean;
  status: 'draft' | 'published' | 'archived';
  publish_date: string | null;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Thought {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  color: string | null;
  images: Array<{ url: string; offset?: { x?: number; y?: number } }>;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  publish_date: string | null;
  publish_time: string | null;
  created_at: string;
  updated_at: string;
}

interface RawBlogPost {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  thumbnail: string | null;
  tags: string; // JSON string
  premium: number;
  status: string;
  publish_date: string | null;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
}

interface RawThought {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  color: string | null;
  images: string; // JSON string
  tags: string; // JSON string
  status: string;
  publish_date: string | null;
  publish_time: string | null;
  created_at: string;
  updated_at: string;
}

function parseBlogPost(raw: RawBlogPost): BlogPost {
  return {
    ...raw,
    tags: JSON.parse(raw.tags || '[]'),
    premium: raw.premium === 1,
    status: raw.status as BlogPost['status'],
  };
}

function parseThought(raw: RawThought): Thought {
  return {
    ...raw,
    tags: JSON.parse(raw.tags || '[]'),
    images: JSON.parse(raw.images || '[]'),
    status: raw.status as Thought['status'],
  };
}

// Blog Post Queries
export async function getBlogPosts(
  db: D1Database,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<BlogPost[]> {
  const { status = 'published', limit = 50, offset = 0 } = options;

  const result = await db
    .prepare(`
      SELECT * FROM blog_posts
      WHERE status = ?
      ORDER BY publish_date DESC
      LIMIT ? OFFSET ?
    `)
    .bind(status, limit, offset)
    .all<RawBlogPost>();

  return result.results.map(parseBlogPost);
}

export async function getBlogPostBySlug(
  db: D1Database,
  slug: string
): Promise<BlogPost | null> {
  const result = await db
    .prepare('SELECT * FROM blog_posts WHERE slug = ?')
    .bind(slug)
    .first<RawBlogPost>();

  return result ? parseBlogPost(result) : null;
}

export async function createBlogPost(
  db: D1Database,
  post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>
): Promise<BlogPost> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO blog_posts (id, slug, title, description, content, thumbnail, tags, premium, status, publish_date, reading_time_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      post.slug,
      post.title,
      post.description,
      post.content,
      post.thumbnail,
      JSON.stringify(post.tags),
      post.premium ? 1 : 0,
      post.status,
      post.publish_date,
      post.reading_time_minutes,
      now,
      now
    )
    .run();

  return { ...post, id, created_at: now, updated_at: now };
}

export async function updateBlogPost(
  db: D1Database,
  id: string,
  updates: Partial<Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.slug !== undefined) { fields.push('slug = ?'); values.push(updates.slug); }
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
  if (updates.thumbnail !== undefined) { fields.push('thumbnail = ?'); values.push(updates.thumbnail); }
  if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
  if (updates.premium !== undefined) { fields.push('premium = ?'); values.push(updates.premium ? 1 : 0); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.publish_date !== undefined) { fields.push('publish_date = ?'); values.push(updates.publish_date); }
  if (updates.reading_time_minutes !== undefined) { fields.push('reading_time_minutes = ?'); values.push(updates.reading_time_minutes); }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db
    .prepare(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function deleteBlogPost(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();
}

// Thought Queries
export async function getThoughts(
  db: D1Database,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<Thought[]> {
  const { status = 'published', limit = 50, offset = 0 } = options;

  const result = await db
    .prepare(`
      SELECT * FROM thoughts
      WHERE status = ?
      ORDER BY publish_date DESC, publish_time DESC
      LIMIT ? OFFSET ?
    `)
    .bind(status, limit, offset)
    .all<RawThought>();

  return result.results.map(parseThought);
}

export async function getThoughtBySlug(
  db: D1Database,
  slug: string
): Promise<Thought | null> {
  const result = await db
    .prepare('SELECT * FROM thoughts WHERE slug = ?')
    .bind(slug)
    .first<RawThought>();

  return result ? parseThought(result) : null;
}

export async function createThought(
  db: D1Database,
  thought: Omit<Thought, 'id' | 'created_at' | 'updated_at'>
): Promise<Thought> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO thoughts (id, slug, title, content, color, images, tags, status, publish_date, publish_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      thought.slug,
      thought.title,
      thought.content,
      thought.color,
      JSON.stringify(thought.images),
      JSON.stringify(thought.tags),
      thought.status,
      thought.publish_date,
      thought.publish_time,
      now,
      now
    )
    .run();

  return { ...thought, id, created_at: now, updated_at: now };
}

export async function updateThought(
  db: D1Database,
  id: string,
  updates: Partial<Omit<Thought, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.slug !== undefined) { fields.push('slug = ?'); values.push(updates.slug); }
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
  if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
  if (updates.images !== undefined) { fields.push('images = ?'); values.push(JSON.stringify(updates.images)); }
  if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.publish_date !== undefined) { fields.push('publish_date = ?'); values.push(updates.publish_date); }
  if (updates.publish_time !== undefined) { fields.push('publish_time = ?'); values.push(updates.publish_time); }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db
    .prepare(`UPDATE thoughts SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function deleteThought(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM thoughts WHERE id = ?').bind(id).run();
}
```

**Step 2: Commit**

```bash
git add src/lib/db/content.ts
git commit -m "feat: add D1 query functions for blog posts and thoughts"
```

---

### Task 1.4: Update Astro Pages to Read from D1

**Files:**
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/blog/[slug].astro`
- Modify: `src/pages/thoughts/index.astro`
- Modify: `src/pages/thoughts/[slug].astro`

**Step 1: Update blog listing page**

In `src/pages/blog/index.astro`, replace the glob import with D1 query:

```astro
---
export const prerender = false;

import BaseLayout from '../../layouts/BaseLayout.astro';
import { getBlogPosts } from '../../lib/db/content';

const db = Astro.locals.runtime.env.DB;
const posts = await getBlogPosts(db, { status: 'published' });

// Sort by publish_date (already sorted in query, but ensure correct order)
const sortedPosts = posts.sort((a, b) => {
  const dateA = new Date(a.publish_date || 0);
  const dateB = new Date(b.publish_date || 0);
  return dateB.getTime() - dateA.getTime();
});
---
<!-- Rest of template uses sortedPosts instead of allPosts -->
```

**Step 2: Update blog post page**

In `src/pages/blog/[slug].astro`:

```astro
---
export const prerender = false;

import BaseLayout from '../../layouts/BaseLayout.astro';
import { getBlogPostBySlug, getBlogPosts } from '../../lib/db/content';

const { slug } = Astro.params;
const db = Astro.locals.runtime.env.DB;

const post = await getBlogPostBySlug(db, slug!);

if (!post) {
  return Astro.redirect('/404');
}

// For static paths (if needed for prerendering)
export async function getStaticPaths() {
  // Only used if prerender = true
  return [];
}
---
```

**Step 3: Update thoughts listing page**

In `src/pages/thoughts/index.astro`:

```astro
---
export const prerender = false;

import BaseLayout from '../../layouts/BaseLayout.astro';
import { getThoughts } from '../../lib/db/content';

const db = Astro.locals.runtime.env.DB;
const thoughts = await getThoughts(db, { status: 'published' });

// Group by date (existing logic)
// ...
---
```

**Step 4: Update thought page**

In `src/pages/thoughts/[slug].astro`:

```astro
---
export const prerender = false;

import BaseLayout from '../../layouts/BaseLayout.astro';
import { getThoughtBySlug } from '../../lib/db/content';

const { slug } = Astro.params;
const db = Astro.locals.runtime.env.DB;

const thought = await getThoughtBySlug(db, slug!);

if (!thought) {
  return Astro.redirect('/404');
}
---
```

**Step 5: Test locally**

Run: `npm run dev`
Expected: Blog and thoughts pages render correctly from D1 data

**Step 6: Commit**

```bash
git add src/pages/blog/index.astro src/pages/blog/\[slug\].astro src/pages/thoughts/index.astro src/pages/thoughts/\[slug\].astro
git commit -m "feat: update Astro pages to read content from D1"
```

---

## Phase 2: Admin API Endpoints

### Task 2.1: Create Admin API Routes for Blog Posts

**Files:**
- Create: `src/pages/api/admin/posts/index.ts`
- Create: `src/pages/api/admin/posts/[id].ts`

**Step 1: Write the posts list/create endpoint**

```typescript
// src/pages/api/admin/posts/index.ts
import type { APIRoute } from 'astro';
import { getBlogPosts, createBlogPost } from '../../../../lib/db/content';

export const prerender = false;

// GET /api/admin/posts - List all posts (including drafts)
export const GET: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const db = locals.runtime.env.DB;

  // Get all statuses if not specified
  let posts;
  if (status) {
    posts = await getBlogPosts(db, { status, limit, offset });
  } else {
    // Get all posts regardless of status
    const result = await db
      .prepare('SELECT * FROM blog_posts ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    posts = result.results;
  }

  return new Response(JSON.stringify({ posts }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST /api/admin/posts - Create new post
export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const body = await request.json();

  // Calculate reading time
  const wordsPerMinute = 200;
  const words = (body.content || '').trim().split(/\s+/).length;
  const reading_time_minutes = Math.ceil(words / wordsPerMinute);

  const post = await createBlogPost(db, {
    slug: body.slug,
    title: body.title,
    description: body.description || null,
    content: body.content,
    thumbnail: body.thumbnail || null,
    tags: body.tags || [],
    premium: body.premium || false,
    status: body.status || 'draft',
    publish_date: body.publish_date || null,
    reading_time_minutes,
  });

  return new Response(JSON.stringify({ post }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 2: Write the single post endpoint**

```typescript
// src/pages/api/admin/posts/[id].ts
import type { APIRoute } from 'astro';
import { updateBlogPost, deleteBlogPost } from '../../../../lib/db/content';

export const prerender = false;

// GET /api/admin/posts/:id
export const GET: APIRoute = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const { id } = params;

  const post = await db
    .prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first();

  if (!post) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ post }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT /api/admin/posts/:id
export const PUT: APIRoute = async ({ locals, params, request }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const { id } = params;
  const body = await request.json();

  // Recalculate reading time if content changed
  if (body.content) {
    const wordsPerMinute = 200;
    const words = body.content.trim().split(/\s+/).length;
    body.reading_time_minutes = Math.ceil(words / wordsPerMinute);
  }

  await updateBlogPost(db, id!, body);

  const updated = await db
    .prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first();

  return new Response(JSON.stringify({ post: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE /api/admin/posts/:id
export const DELETE: APIRoute = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const { id } = params;

  await deleteBlogPost(db, id!);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 3: Commit**

```bash
git add src/pages/api/admin/posts/
git commit -m "feat: add admin API endpoints for blog posts"
```

---

### Task 2.2: Create Admin API Routes for Thoughts

**Files:**
- Create: `src/pages/api/admin/thoughts/index.ts`
- Create: `src/pages/api/admin/thoughts/[id].ts`

**Step 1: Write the thoughts list/create endpoint**

```typescript
// src/pages/api/admin/thoughts/index.ts
import type { APIRoute } from 'astro';
import { getThoughts, createThought } from '../../../../lib/db/content';

export const prerender = false;

// GET /api/admin/thoughts
export const GET: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const db = locals.runtime.env.DB;

  let thoughts;
  if (status) {
    thoughts = await getThoughts(db, { status, limit, offset });
  } else {
    const result = await db
      .prepare('SELECT * FROM thoughts ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    thoughts = result.results;
  }

  return new Response(JSON.stringify({ thoughts }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST /api/admin/thoughts
export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const body = await request.json();

  // Generate slug if not provided
  const slug = body.slug || `thought-${Date.now()}`;

  const thought = await createThought(db, {
    slug,
    title: body.title || null,
    content: body.content,
    color: body.color || null,
    images: body.images || [],
    tags: body.tags || [],
    status: body.status || 'draft',
    publish_date: body.publish_date || null,
    publish_time: body.publish_time || null,
  });

  return new Response(JSON.stringify({ thought }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 2: Write the single thought endpoint**

```typescript
// src/pages/api/admin/thoughts/[id].ts
import type { APIRoute } from 'astro';
import { updateThought, deleteThought } from '../../../../lib/db/content';

export const prerender = false;

// GET /api/admin/thoughts/:id
export const GET: APIRoute = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const { id } = params;

  const thought = await db
    .prepare('SELECT * FROM thoughts WHERE id = ?')
    .bind(id)
    .first();

  if (!thought) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ thought }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT /api/admin/thoughts/:id
export const PUT: APIRoute = async ({ locals, params, request }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const { id } = params;
  const body = await request.json();

  await updateThought(db, id!, body);

  const updated = await db
    .prepare('SELECT * FROM thoughts WHERE id = ?')
    .bind(id)
    .first();

  return new Response(JSON.stringify({ thought: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE /api/admin/thoughts/:id
export const DELETE: APIRoute = async ({ locals, params }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const db = locals.runtime.env.DB;
  const { id } = params;

  await deleteThought(db, id!);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 3: Commit**

```bash
git add src/pages/api/admin/thoughts/
git commit -m "feat: add admin API endpoints for thoughts"
```

---

### Task 2.3: Create Image Upload API (R2)

**Files:**
- Create: `src/pages/api/admin/images/upload.ts`
- Modify: `wrangler.json` (add R2 binding)

**Step 1: Add R2 binding to wrangler.json**

Add to `wrangler.json`:

```json
{
  "r2_buckets": [
    {
      "binding": "IMAGES",
      "bucket_name": "baba-is-win-images"
    }
  ]
}
```

**Step 2: Create the R2 bucket**

Run: `wrangler r2 bucket create baba-is-win-images`
Expected: Bucket created successfully

**Step 3: Write the image upload endpoint**

```typescript
// src/pages/api/admin/images/upload.ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const r2 = locals.runtime.env.IMAGES;
  if (!r2) {
    return new Response(JSON.stringify({ error: 'Image storage not configured' }), { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 });
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const key = `uploads/${timestamp}-${randomId}.${ext}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await r2.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Return public URL (requires R2 public access or custom domain)
  const url = `https://images.emilycogsdill.com/${key}`;

  return new Response(JSON.stringify({ url, key }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 4: Commit**

```bash
git add src/pages/api/admin/images/ wrangler.json
git commit -m "feat: add R2 image upload endpoint"
```

---

## Phase 3: Admin Web Interface (Svelte SPA)

### Task 3.1: Create Admin SPA Project Structure

**Files:**
- Create: `blog-admin/package.json`
- Create: `blog-admin/vite.config.ts`
- Create: `blog-admin/tsconfig.json`
- Create: `blog-admin/capacitor.config.ts`

**Step 1: Initialize the project**

```bash
mkdir blog-admin
cd blog-admin
npm init -y
npm install svelte vite @sveltejs/vite-plugin-svelte
npm install -D typescript @tsconfig/svelte
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Blog Admin" com.emilycogsdill.blogadmin --web-dir dist
```

**Step 2: Create vite.config.ts**

```typescript
// blog-admin/vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
});
```

**Step 3: Create package.json scripts**

```json
{
  "name": "blog-admin",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "cap:sync": "npm run build && npx cap sync",
    "cap:open": "npx cap open android"
  }
}
```

**Step 4: Create capacitor.config.ts**

```typescript
// blog-admin/capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emilycogsdill.blogadmin',
  appName: 'Blog Admin',
  webDir: 'dist',
  server: {
    // Production API
    url: 'https://emilycogsdill.com',
    cleartext: false,
  },
};

export default config;
```

**Step 5: Commit**

```bash
git add blog-admin/
git commit -m "feat: initialize blog-admin Svelte SPA project"
```

---

### Task 3.2: Create Core Svelte Components

**Files:**
- Create: `blog-admin/src/index.html`
- Create: `blog-admin/src/main.ts`
- Create: `blog-admin/src/App.svelte`
- Create: `blog-admin/src/lib/api.ts`
- Create: `blog-admin/src/lib/auth.ts`

**Step 1: Create index.html**

```html
<!-- blog-admin/src/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>Blog Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

**Step 2: Create main.ts**

```typescript
// blog-admin/src/main.ts
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;
```

**Step 3: Create API client**

```typescript
// blog-admin/src/lib/api.ts
declare const window: Window & { Capacitor?: any };

const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;
const API_BASE = isCapacitor
  ? 'https://emilycogsdill.com/api'
  : '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('blog_admin_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Blog Posts
export async function getPosts(status?: string) {
  const params = status ? `?status=${status}` : '';
  return request<{ posts: any[] }>(`/admin/posts${params}`);
}

export async function getPost(id: string) {
  return request<{ post: any }>(`/admin/posts/${id}`);
}

export async function createPost(data: any) {
  return request<{ post: any }>('/admin/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePost(id: string, data: any) {
  return request<{ post: any }>(`/admin/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: string) {
  return request<{ success: boolean }>(`/admin/posts/${id}`, {
    method: 'DELETE',
  });
}

// Thoughts
export async function getThoughts(status?: string) {
  const params = status ? `?status=${status}` : '';
  return request<{ thoughts: any[] }>(`/admin/thoughts${params}`);
}

export async function getThought(id: string) {
  return request<{ thought: any }>(`/admin/thoughts/${id}`);
}

export async function createThought(data: any) {
  return request<{ thought: any }>('/admin/thoughts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateThought(id: string, data: any) {
  return request<{ thought: any }>(`/admin/thoughts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteThought(id: string) {
  return request<{ success: boolean }>(`/admin/thoughts/${id}`, {
    method: 'DELETE',
  });
}

// Images
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/admin/images/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
}

// Auth
export async function login(email: string, password: string) {
  return request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return request<{ user: any }>('/auth/me');
}
```

**Step 4: Create App.svelte**

```svelte
<!-- blog-admin/src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getMe } from './lib/api';
  import Login from './components/Login.svelte';
  import Dashboard from './components/Dashboard.svelte';

  let user: any = null;
  let loading = true;

  onMount(async () => {
    try {
      const result = await getMe();
      user = result.user;
    } catch {
      user = null;
    } finally {
      loading = false;
    }
  });

  function handleLogin(event: CustomEvent) {
    user = event.detail.user;
  }

  function handleLogout() {
    localStorage.removeItem('blog_admin_token');
    user = null;
  }
</script>

{#if loading}
  <div class="loading">Loading...</div>
{:else if !user}
  <Login on:login={handleLogin} />
{:else}
  <Dashboard {user} on:logout={handleLogout} />
{/if}

<style>
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: #888;
  }
</style>
```

**Step 5: Commit**

```bash
git add blog-admin/src/
git commit -m "feat: add core Svelte components for blog admin"
```

---

### Task 3.3: Create Editor Components

**Files:**
- Create: `blog-admin/src/components/Dashboard.svelte`
- Create: `blog-admin/src/components/PostEditor.svelte`
- Create: `blog-admin/src/components/ThoughtEditor.svelte`
- Create: `blog-admin/src/components/MarkdownEditor.svelte`

See detailed component implementations in supplementary document. Key features:

- **Dashboard**: Tab navigation (Posts, Thoughts), list views with status filters
- **PostEditor**: Title, slug, description, content (markdown), thumbnail, tags, premium toggle, publish date
- **ThoughtEditor**: Content (280 char limit), color picker, images with offsets, tags
- **MarkdownEditor**: Textarea with live preview, image paste/upload support

**Step: Commit after creating all components**

```bash
git add blog-admin/src/components/
git commit -m "feat: add editor components for posts and thoughts"
```

---

## Phase 4: Android APK Build & CI/CD

### Task 4.1: Initialize Capacitor Android

**Step 1: Add Android platform**

```bash
cd blog-admin
npx cap add android
```

**Step 2: Configure Android signing**

In `blog-admin/android/app/build.gradle`, add signing config:

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias "blogadmin"
            keyPassword System.getenv("KEYSTORE_PASSWORD") ?: ""
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Step 3: Commit**

```bash
git add blog-admin/android/
git commit -m "feat: add Capacitor Android platform"
```

---

### Task 4.2: Create GitHub Actions Workflow

**Files:**
- Create: `blog-admin/.github/workflows/android.yml`

**Step 1: Write the workflow**

```yaml
# blog-admin/.github/workflows/android.yml
name: Build Android APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: blog-admin/package-lock.json

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Update package.json version
        working-directory: blog-admin
        run: npm version ${{ steps.version.outputs.VERSION }} --no-git-tag-version

      - name: Install dependencies
        working-directory: blog-admin
        run: npm ci

      - name: Build and sync
        working-directory: blog-admin
        run: npm run cap:sync

      - name: Decode keystore
        working-directory: blog-admin
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore

      - name: Build release APK
        working-directory: blog-admin/android
        env:
          KEYSTORE_FILE: app/release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
        run: ./gradlew assembleRelease

      - name: Rename APK
        working-directory: blog-admin
        run: |
          mv android/app/build/outputs/apk/release/app-release.apk \
             android/app/build/outputs/apk/release/blog-admin-${{ steps.version.outputs.VERSION }}.apk

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: blog-admin/android/app/build/outputs/apk/release/blog-admin-*.apk
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Create keystore**

```bash
keytool -genkey -v -keystore blogadmin-release.keystore -alias blogadmin \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Step 3: Add secrets to GitHub**

- `KEYSTORE_BASE64`: `base64 -i blogadmin-release.keystore`
- `KEYSTORE_PASSWORD`: The password used when creating keystore

**Step 4: Commit**

```bash
git add blog-admin/.github/
git commit -m "feat: add GitHub Actions workflow for Android APK builds"
```

---

### Task 4.3: Add Makefile for Common Commands

**Files:**
- Create: `blog-admin/Makefile`

```makefile
# blog-admin/Makefile
.PHONY: dev build sync android clean

dev:
	npm run dev

build:
	npm run build

sync:
	npm run cap:sync

android:
	npm run cap:open

clean:
	rm -rf dist node_modules android/app/build

release:
	@read -p "Version (e.g., 0.1.0): " version; \
	git tag -a "v$$version" -m "Release v$$version" && \
	git push origin "v$$version"
```

**Step: Commit**

```bash
git add blog-admin/Makefile
git commit -m "feat: add Makefile for blog-admin"
```

---

## Phase 5: Integration & Testing

### Task 5.1: Update Middleware for API Auth

**Files:**
- Modify: `src/middleware.ts`

Add `/api/admin/posts`, `/api/admin/thoughts`, `/api/admin/images` to protected routes.

### Task 5.2: End-to-End Testing

**Tests to write:**
1. Create blog post via API
2. Update blog post via API
3. Delete blog post via API
4. Create thought via API
5. Upload image via API
6. Verify content appears on public pages

### Task 5.3: Deploy and Test

1. Apply migration to production D1
2. Run content migration script against production
3. Deploy baba-is-win with new API routes
4. Build and test blog-admin locally
5. Create GitHub release to trigger APK build
6. Install APK on device and test

---

## Summary

| Phase | Tasks | Key Files |
|-------|-------|-----------|
| **1: Database** | Schema, migration, queries | `migrations/0014_*.sql`, `src/lib/db/content.ts` |
| **2: API** | Posts, thoughts, images endpoints | `src/pages/api/admin/{posts,thoughts,images}/` |
| **3: Web UI** | Svelte SPA with editors | `blog-admin/src/` |
| **4: Mobile** | Capacitor + CI/CD | `blog-admin/android/`, `.github/workflows/` |
| **5: Testing** | Integration tests | `tests/` |

---

## References

- [Cloudflare D1 API](https://developers.cloudflare.com/d1/worker-api/)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Capacitor CI/CD](https://capacitorjs.com/docs/guides/ci-cd)
- [GitHub Actions for Android](https://capgo.app/blog/automatic-capacitor-android-build-github-action/)
- [SvelteKit + Capacitor](https://bryanhogan.com/blog/web-to-app-sveltekit-capacitor)
- Sister projects: `../splitdumb/.github/workflows/android.yml`, `../exercise-tracker-thingy/.github/workflows/android.yml`
