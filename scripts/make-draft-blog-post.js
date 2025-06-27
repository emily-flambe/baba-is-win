#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current date
const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = monthNames[now.getMonth()];
const day = now.getDate();
const year = now.getFullYear();
const publishDate = `${day} ${month} ${year}`;

// Get arguments
const slug = process.argv[2] || 'new-blog-post-draft';
const title = process.argv[3] || 'New Blog Post Draft';
const description = process.argv[4] || 'A new blog post draft - work in progress.';

// Generate folder name for assets
const folderName = `${dateStr}-${slug}`;

// Read template
const templatePath = path.join(__dirname, '..', '..', 'templates', 'blog-post.md');
const template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders
const content = template
  .replace(/{{TITLE}}/g, title)
  .replace(/{{DATE}}/g, publishDate)
  .replace(/{{DESCRIPTION}}/g, description)
  .replace(/{{FOLDER}}/g, folderName)
  .replace(/{{THUMBNAIL}}/g, `/assets/blog/${folderName}/thumbnail.jpg`);

// Generate filename
const filename = `${folderName}.md`;

// Create output path for draft
const outputDir = path.join(__dirname, '..', 'src', 'data', 'blog-posts', 'draft');
const outputPath = path.join(outputDir, filename);

// Create assets directory
const assetsDir = path.join(__dirname, '..', 'public', 'assets', 'blog', folderName);
fs.mkdirSync(assetsDir, { recursive: true });

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Write file
fs.writeFileSync(outputPath, content);

console.log(`Created new DRAFT blog post: ${outputPath}`);
console.log(`Created assets directory: ${assetsDir}`);
console.log(`\nUsage: node scripts/make-draft-blog-post.js [slug] [title] [description]`);
console.log(`Example: node scripts/make-draft-blog-post.js "my-adventure" "My Amazing Adventure" "A story about my latest adventure"`);
console.log(`\nNext steps:`);
console.log(`1. Add your thumbnail image to: ${assetsDir}/thumbnail.jpg`);
console.log(`2. Add any other images to: ${assetsDir}/`);
console.log(`3. Edit the blog post content in: ${outputPath}`);
console.log(`4. Update the tags in the frontmatter as needed`);
console.log(`5. When ready to publish, move the file to: src/data/blog-posts/published/`);