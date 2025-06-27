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
const publishDate = `${day.toString().padStart(2, '0')} ${month} ${year}`;

// Get arguments
const slug = process.argv[2] || 'new-blog-post';
const title = process.argv[3] || 'New Blog Post';
const description = process.argv[4] || 'A new blog post description.';

// Generate folder name for assets
const folderName = `${dateStr}-${slug}`;

// Read template
const templatePath = path.join(__dirname, '..', '..', 'templates', 'blog-post.md');
const template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders
const content = template
  .replace(/\{\{DATE\}\}/g, publishDate)
  .replace(/\{\{TITLE\}\}/g, title)
  .replace(/\{\{DESCRIPTION\}\}/g, description)
  .replace(/\{\{FOLDER\}\}/g, folderName)
  .replace(/\{\{THUMBNAIL\}\}/g, `/assets/blog/${folderName}/thumbnail.jpg`);

// Generate filename
const filename = `${dateStr}-${slug}.md`;

// Create output path
const outputDir = path.join(__dirname, '..', 'src', 'data', 'blog-posts', 'published');
const outputPath = path.join(outputDir, filename);

// Ensure directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Write file
fs.writeFileSync(outputPath, content);

console.log(`Created new blog post: ${outputPath}`);
console.log(`\nTo customize your blog post:`);
console.log(`1. Add content to the markdown file`);
console.log(`2. Update tags, description, and thumbnail as needed`);
console.log(`3. Add thumbnail image to /public/assets/blog/${dateStr}_thumbnail.png`);