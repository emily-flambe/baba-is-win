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
