import type { D1Database } from '@cloudflare/workers-types';

// === TYPES ===

export type ContentStatus = 'draft' | 'published' | 'archived';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  thumbnail: string | null;
  tags: string[];
  premium: boolean;
  status: ContentStatus;
  publishDate: string | null;
  readingTimeMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThoughtImage {
  url: string;
  offset?: { x: number; y: number };
}

export interface Thought {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  color: string | null;
  images: ThoughtImage[];
  tags: string[];
  status: ContentStatus;
  publishDate: string | null;
  publishTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListOptions {
  status?: ContentStatus;
  limit?: number;
  offset?: number;
}

export interface CreateBlogPostInput {
  slug: string;
  title: string;
  description?: string | null;
  content: string;
  thumbnail?: string | null;
  tags?: string[];
  premium?: boolean;
  status?: ContentStatus;
  publishDate?: string | null;
  readingTimeMinutes?: number | null;
}

export interface UpdateBlogPostInput {
  slug?: string;
  title?: string;
  description?: string | null;
  content?: string;
  thumbnail?: string | null;
  tags?: string[];
  premium?: boolean;
  status?: ContentStatus;
  publishDate?: string | null;
  readingTimeMinutes?: number | null;
}

export interface CreateThoughtInput {
  slug: string;
  title?: string | null;
  content: string;
  color?: string | null;
  images?: ThoughtImage[];
  tags?: string[];
  status?: ContentStatus;
  publishDate?: string | null;
  publishTime?: string | null;
}

export interface UpdateThoughtInput {
  slug?: string;
  title?: string | null;
  content?: string;
  color?: string | null;
  images?: ThoughtImage[];
  tags?: string[];
  status?: ContentStatus;
  publishDate?: string | null;
  publishTime?: string | null;
}

// === HELPER FUNCTIONS ===

function parseJsonField<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

function mapDbRowToBlogPost(row: Record<string, unknown>): BlogPost {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string | null,
    content: row.content as string,
    thumbnail: row.thumbnail as string | null,
    tags: parseJsonField<string[]>(row.tags, []),
    premium: Boolean(row.premium),
    status: row.status as ContentStatus,
    publishDate: row.publish_date as string | null,
    readingTimeMinutes: row.reading_time_minutes as number | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDbRowToThought(row: Record<string, unknown>): Thought {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string | null,
    content: row.content as string,
    color: row.color as string | null,
    images: parseJsonField<ThoughtImage[]>(row.images, []),
    tags: parseJsonField<string[]>(row.tags, []),
    status: row.status as ContentStatus,
    publishDate: row.publish_date as string | null,
    publishTime: row.publish_time as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// === BLOG POST FUNCTIONS ===

export async function getBlogPosts(
  db: D1Database,
  options: ListOptions = {}
): Promise<BlogPost[]> {
  const { status, limit = 50, offset = 0 } = options;

  let query = 'SELECT * FROM blog_posts';
  const params: unknown[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY publish_date DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all();

  return result.results.map((row) => mapDbRowToBlogPost(row as Record<string, unknown>));
}

export async function getBlogPostBySlug(
  db: D1Database,
  slug: string
): Promise<BlogPost | null> {
  const result = await db
    .prepare('SELECT * FROM blog_posts WHERE slug = ?')
    .bind(slug)
    .first();

  if (!result) return null;

  return mapDbRowToBlogPost(result as Record<string, unknown>);
}

export async function getBlogPostById(
  db: D1Database,
  id: string
): Promise<BlogPost | null> {
  const result = await db
    .prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first();

  if (!result) return null;

  return mapDbRowToBlogPost(result as Record<string, unknown>);
}

export async function createBlogPost(
  db: D1Database,
  post: CreateBlogPostInput
): Promise<BlogPost> {
  const id = crypto.randomUUID();
  const now = getCurrentTimestamp();

  const tags = JSON.stringify(post.tags ?? []);
  const premium = post.premium ? 1 : 0;
  const status = post.status ?? 'draft';

  await db
    .prepare(
      `INSERT INTO blog_posts (
        id, slug, title, description, content, thumbnail, tags, premium,
        status, publish_date, reading_time_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      post.slug,
      post.title,
      post.description ?? null,
      post.content,
      post.thumbnail ?? null,
      tags,
      premium,
      status,
      post.publishDate ?? null,
      post.readingTimeMinutes ?? null,
      now,
      now
    )
    .run();

  return {
    id,
    slug: post.slug,
    title: post.title,
    description: post.description ?? null,
    content: post.content,
    thumbnail: post.thumbnail ?? null,
    tags: post.tags ?? [],
    premium: Boolean(post.premium),
    status,
    publishDate: post.publishDate ?? null,
    readingTimeMinutes: post.readingTimeMinutes ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateBlogPost(
  db: D1Database,
  id: string,
  updates: UpdateBlogPostInput
): Promise<BlogPost | null> {
  const now = getCurrentTimestamp();

  const setParts: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  if (updates.slug !== undefined) {
    setParts.push('slug = ?');
    params.push(updates.slug);
  }
  if (updates.title !== undefined) {
    setParts.push('title = ?');
    params.push(updates.title);
  }
  if (updates.description !== undefined) {
    setParts.push('description = ?');
    params.push(updates.description);
  }
  if (updates.content !== undefined) {
    setParts.push('content = ?');
    params.push(updates.content);
  }
  if (updates.thumbnail !== undefined) {
    setParts.push('thumbnail = ?');
    params.push(updates.thumbnail);
  }
  if (updates.tags !== undefined) {
    setParts.push('tags = ?');
    params.push(JSON.stringify(updates.tags));
  }
  if (updates.premium !== undefined) {
    setParts.push('premium = ?');
    params.push(updates.premium ? 1 : 0);
  }
  if (updates.status !== undefined) {
    setParts.push('status = ?');
    params.push(updates.status);
  }
  if (updates.publishDate !== undefined) {
    setParts.push('publish_date = ?');
    params.push(updates.publishDate);
  }
  if (updates.readingTimeMinutes !== undefined) {
    setParts.push('reading_time_minutes = ?');
    params.push(updates.readingTimeMinutes);
  }

  params.push(id);

  await db
    .prepare(`UPDATE blog_posts SET ${setParts.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  // Fetch and return the updated post
  const result = await db
    .prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first();

  if (!result) return null;

  return mapDbRowToBlogPost(result as Record<string, unknown>);
}

export async function deleteBlogPost(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM blog_posts WHERE id = ?')
    .bind(id)
    .run();

  return result.meta.changes > 0;
}

// === THOUGHT FUNCTIONS ===

export async function getThoughts(
  db: D1Database,
  options: ListOptions = {}
): Promise<Thought[]> {
  const { status, limit = 50, offset = 0 } = options;

  let query = 'SELECT * FROM thoughts';
  const params: unknown[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY publish_date DESC, publish_time DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all();

  return result.results.map((row) => mapDbRowToThought(row as Record<string, unknown>));
}

export async function getThoughtBySlug(
  db: D1Database,
  slug: string
): Promise<Thought | null> {
  const result = await db
    .prepare('SELECT * FROM thoughts WHERE slug = ?')
    .bind(slug)
    .first();

  if (!result) return null;

  return mapDbRowToThought(result as Record<string, unknown>);
}

export async function createThought(
  db: D1Database,
  thought: CreateThoughtInput
): Promise<Thought> {
  const id = crypto.randomUUID();
  const now = getCurrentTimestamp();

  const images = JSON.stringify(thought.images ?? []);
  const tags = JSON.stringify(thought.tags ?? []);
  const status = thought.status ?? 'draft';

  await db
    .prepare(
      `INSERT INTO thoughts (
        id, slug, title, content, color, images, tags,
        status, publish_date, publish_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      thought.slug,
      thought.title ?? null,
      thought.content,
      thought.color ?? null,
      images,
      tags,
      status,
      thought.publishDate ?? null,
      thought.publishTime ?? null,
      now,
      now
    )
    .run();

  return {
    id,
    slug: thought.slug,
    title: thought.title ?? null,
    content: thought.content,
    color: thought.color ?? null,
    images: thought.images ?? [],
    tags: thought.tags ?? [],
    status,
    publishDate: thought.publishDate ?? null,
    publishTime: thought.publishTime ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateThought(
  db: D1Database,
  id: string,
  updates: UpdateThoughtInput
): Promise<Thought | null> {
  const now = getCurrentTimestamp();

  const setParts: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  if (updates.slug !== undefined) {
    setParts.push('slug = ?');
    params.push(updates.slug);
  }
  if (updates.title !== undefined) {
    setParts.push('title = ?');
    params.push(updates.title);
  }
  if (updates.content !== undefined) {
    setParts.push('content = ?');
    params.push(updates.content);
  }
  if (updates.color !== undefined) {
    setParts.push('color = ?');
    params.push(updates.color);
  }
  if (updates.images !== undefined) {
    setParts.push('images = ?');
    params.push(JSON.stringify(updates.images));
  }
  if (updates.tags !== undefined) {
    setParts.push('tags = ?');
    params.push(JSON.stringify(updates.tags));
  }
  if (updates.status !== undefined) {
    setParts.push('status = ?');
    params.push(updates.status);
  }
  if (updates.publishDate !== undefined) {
    setParts.push('publish_date = ?');
    params.push(updates.publishDate);
  }
  if (updates.publishTime !== undefined) {
    setParts.push('publish_time = ?');
    params.push(updates.publishTime);
  }

  params.push(id);

  await db
    .prepare(`UPDATE thoughts SET ${setParts.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  // Fetch and return the updated thought
  const result = await db
    .prepare('SELECT * FROM thoughts WHERE id = ?')
    .bind(id)
    .first();

  if (!result) return null;

  return mapDbRowToThought(result as Record<string, unknown>);
}

export async function deleteThought(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM thoughts WHERE id = ?')
    .bind(id)
    .run();

  return result.meta.changes > 0;
}
