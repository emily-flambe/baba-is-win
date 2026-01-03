import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { nanoid } from 'nanoid';

const BLOG_POSTS_DIR = 'src/data/blog-posts/published';
const THOUGHTS_DIR = 'src/data/thoughts/published';
const OUTPUT_FILE = 'scripts/migration-data.sql';

interface BlogPostFrontmatter {
  title: string;
  publishDate: string;
  description?: string;
  thumbnail?: string;
  tags?: string[];
  premium?: boolean;
}

interface ThoughtFrontmatter {
  title?: string;
  content: string;
  publishDate: string;
  publishTime?: string;
  tags?: string[];
  color?: string;
  images?: Array<{ url: string; offset?: string }> | string[];
}

function escapeSQL(str: string): string {
  if (str === null || str === undefined) return 'NULL';
  // Escape single quotes by doubling them
  return str.replace(/'/g, "''");
}

function extractSlugFromFilename(filename: string): string {
  // Remove .md extension
  const base = path.basename(filename, '.md');
  // Format: YYYYMMDD-slug or YYYYMMDD_slug
  const match = base.match(/^\d{8}[-_](.+)$/);
  if (match) {
    return match[1];
  }
  return base;
}

function parsePublishDate(dateStr: string): string {
  // Parse dates like "01 Mar 2025" into ISO format "2025-03-01"
  const months: { [key: string]: string } = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1]] || '01';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr; // Return as-is if already in different format
}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(words / wordsPerMinute);
}

function processBlogPosts(): string[] {
  const statements: string[] = [];
  const postsDir = path.resolve(BLOG_POSTS_DIR);

  if (!fs.existsSync(postsDir)) {
    console.log(`Directory not found: ${postsDir}`);
    return statements;
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} blog posts`);

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const frontmatter = data as BlogPostFrontmatter;

    const id = nanoid();
    const slug = extractSlugFromFilename(file);
    const title = escapeSQL(frontmatter.title || '');
    const description = frontmatter.description ? `'${escapeSQL(frontmatter.description)}'` : 'NULL';
    const contentEscaped = escapeSQL(content.trim());
    const thumbnail = frontmatter.thumbnail ? `'${escapeSQL(frontmatter.thumbnail)}'` : 'NULL';
    const tags = frontmatter.tags ? `'${JSON.stringify(frontmatter.tags)}'` : 'NULL';
    const premium = frontmatter.premium ? 1 : 0;
    const publishDate = parsePublishDate(frontmatter.publishDate);
    const readingTime = calculateReadingTime(content);

    const statement = `INSERT INTO blog_posts (id, slug, title, description, content, thumbnail, tags, premium, status, publish_date, reading_time_minutes) VALUES ('${id}', '${slug}', '${title}', ${description}, '${contentEscaped}', ${thumbnail}, ${tags}, ${premium}, 'published', '${publishDate}', ${readingTime});`;

    statements.push(statement);
    console.log(`  - ${slug}`);
  }

  return statements;
}

function processThoughts(): string[] {
  const statements: string[] = [];
  const thoughtsDir = path.resolve(THOUGHTS_DIR);

  if (!fs.existsSync(thoughtsDir)) {
    console.log(`Directory not found: ${thoughtsDir}`);
    return statements;
  }

  const files = fs.readdirSync(thoughtsDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} thoughts`);

  for (const file of files) {
    const filePath = path.join(thoughtsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);
    const frontmatter = data as ThoughtFrontmatter;

    const id = nanoid();
    const slug = extractSlugFromFilename(file);
    const title = frontmatter.title ? `'${escapeSQL(frontmatter.title)}'` : 'NULL';
    const content = escapeSQL(frontmatter.content || '');
    const color = frontmatter.color ? `'${escapeSQL(frontmatter.color)}'` : 'NULL';
    const tags = frontmatter.tags ? `'${JSON.stringify(frontmatter.tags)}'` : 'NULL';
    const publishDate = parsePublishDate(frontmatter.publishDate);
    const publishTime = frontmatter.publishTime ? `'${escapeSQL(frontmatter.publishTime)}'` : 'NULL';

    // Images can be array of objects or strings
    let imagesJson = 'NULL';
    if (frontmatter.images && frontmatter.images.length > 0) {
      // Normalize to consistent format
      const normalizedImages = frontmatter.images.map(img => {
        if (typeof img === 'string') {
          return { url: img };
        }
        return img;
      });
      imagesJson = `'${escapeSQL(JSON.stringify(normalizedImages))}'`;
    }

    const statement = `INSERT INTO thoughts (id, slug, title, content, color, images, tags, status, publish_date, publish_time) VALUES ('${id}', '${slug}', ${title}, '${content}', ${color}, ${imagesJson}, ${tags}, 'published', '${publishDate}', ${publishTime});`;

    statements.push(statement);
    console.log(`  - ${slug}`);
  }

  return statements;
}

function main() {
  console.log('Starting content migration...\n');

  const allStatements: string[] = [];

  // Header
  allStatements.push('-- Content Migration SQL');
  allStatements.push('-- Generated: ' + new Date().toISOString());
  allStatements.push('');

  // Blog posts
  console.log('Processing blog posts...');
  allStatements.push('-- Blog Posts');
  const blogStatements = processBlogPosts();
  allStatements.push(...blogStatements);
  allStatements.push('');

  // Thoughts
  console.log('\nProcessing thoughts...');
  allStatements.push('-- Thoughts');
  const thoughtStatements = processThoughts();
  allStatements.push(...thoughtStatements);

  // Write to file
  const outputPath = path.resolve(OUTPUT_FILE);
  fs.writeFileSync(outputPath, allStatements.join('\n'));

  console.log(`\nMigration SQL written to: ${outputPath}`);
  console.log(`Total: ${blogStatements.length} blog posts, ${thoughtStatements.length} thoughts`);
}

main();
