import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://baba-is.win';
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap.xml');

function generateSitemap() {
  const now = new Date().toISOString().split('T')[0];
  
  // Static pages with their change frequencies and priorities
  const staticPages = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/about', changefreq: 'monthly', priority: 0.8 },
    { path: '/bio', changefreq: 'monthly', priority: 0.7 },
    { path: '/blog', changefreq: 'weekly', priority: 0.9 },
    { path: '/thoughts', changefreq: 'weekly', priority: 0.8 },
    { path: '/museum', changefreq: 'monthly', priority: 0.7 },
    { path: '/login', changefreq: 'yearly', priority: 0.3 },
    { path: '/signup', changefreq: 'yearly', priority: 0.3 },
  ];

  // Get dynamic blog posts
  const blogPosts = getBlogPosts();
  
  // Get dynamic thoughts
  const thoughts = getThoughts();
  
  // Get museum entries
  const museumEntries = getMuseumEntries();

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Add static pages
  staticPages.forEach(page => {
    sitemap += `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  // Add blog posts
  blogPosts.forEach(post => {
    sitemap += `
  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${post.date || now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  // Add thoughts
  thoughts.forEach(thought => {
    sitemap += `
  <url>
    <loc>${SITE_URL}/thoughts/${thought.slug}</loc>
    <lastmod>${thought.date || now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  // Add museum entries
  museumEntries.forEach(entry => {
    sitemap += `
  <url>
    <loc>${SITE_URL}/museum/${entry.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  // Add tag pages
  const allTags = getAllTags();
  allTags.forEach(tag => {
    sitemap += `
  <url>
    <loc>${SITE_URL}/tags/${tag}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
  });

  sitemap += `
</urlset>`;

  return sitemap;
}

function getBlogPosts() {
  const blogDir = path.join(__dirname, '../src/data/blog-posts');
  const posts = [];
  
  try {
    const files = fs.readdirSync(blogDir);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const slug = file.replace('.md', '');
        const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
        const dateMatch = content.match(/date:\s*["']?(\d{4}-\d{2}-\d{2})/);
        posts.push({
          slug,
          date: dateMatch ? dateMatch[1] : null
        });
      }
    });
  } catch (error) {
    console.warn('Could not read blog posts:', error.message);
  }
  
  return posts;
}

function getThoughts() {
  const thoughtsDir = path.join(__dirname, '../src/data/thoughts');
  const thoughts = [];
  
  try {
    const files = fs.readdirSync(thoughtsDir);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const slug = file.replace('.md', '');
        const content = fs.readFileSync(path.join(thoughtsDir, file), 'utf-8');
        const dateMatch = content.match(/date:\s*["']?(\d{4}-\d{2}-\d{2})/);
        thoughts.push({
          slug,
          date: dateMatch ? dateMatch[1] : null
        });
      }
    });
  } catch (error) {
    console.warn('Could not read thoughts:', error.message);
  }
  
  return thoughts;
}

function getMuseumEntries() {
  const entries = [];
  
  try {
    const configPath = path.join(__dirname, '../src/data/museum-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    if (config.exhibits && Array.isArray(config.exhibits)) {
      config.exhibits.forEach(exhibit => {
        if (exhibit.slug) {
          entries.push({ slug: exhibit.slug });
        }
      });
    }
  } catch (error) {
    console.warn('Could not read museum config:', error.message);
  }
  
  return entries;
}

function getAllTags() {
  const tags = new Set();
  
  // Extract tags from blog posts and thoughts
  // This is a simplified version - you might need to parse frontmatter
  const contentDirs = [
    path.join(__dirname, '../src/data/blog-posts'),
    path.join(__dirname, '../src/data/thoughts')
  ];
  
  contentDirs.forEach(dir => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.endsWith('.md')) {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);
          if (tagsMatch) {
            const postTags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
            postTags.forEach(tag => tags.add(tag));
          }
        }
      });
    } catch (error) {
      console.warn(`Could not read tags from ${dir}:`, error.message);
    }
  });
  
  return Array.from(tags);
}

// Generate and save sitemap
try {
  const sitemap = generateSitemap();
  fs.writeFileSync(OUTPUT_PATH, sitemap);
  console.log(`✅ Sitemap generated successfully at ${OUTPUT_PATH}`);
  
  // Also create robots.txt if it doesn't exist
  const robotsPath = path.join(__dirname, '../public/robots.txt');
  if (!fs.existsSync(robotsPath)) {
    const robotsContent = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml`;
    fs.writeFileSync(robotsPath, robotsContent);
    console.log(`✅ robots.txt created at ${robotsPath}`);
  }
} catch (error) {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
}