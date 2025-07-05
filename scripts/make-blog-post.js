#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to prompt user for input
function prompt(question, defaultValue = '') {
  return new Promise((resolve) => {
    const displayDefault = defaultValue ? ` (${defaultValue})` : '';
    process.stdout.write(`${question}${displayDefault}: `);
    rl.once('line', (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

// Function to generate folder name from slug
function generateFolder(slug) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${slug}`;
}

async function main() {
  console.log('📝 Creating a new blog post...\n');

  try {
    // Get blog post details from user
    const title = await prompt('Blog post title');
    
    if (!title) {
      console.error('❌ Title is required');
      process.exit(1);
    }

    const description = await prompt('Description/summary');
    
    if (!description) {
      console.error('❌ Description is required');
      process.exit(1);
    }

    // Generate slug and folder name
    const slug = generateSlug(title);
    const folder = generateFolder(slug);
    
    console.log(`\n📁 Generated folder: ${folder}`);
    console.log(`🔗 Generated slug: ${slug}`);
    
    const useGenerated = await prompt('Use generated folder/slug? (y/n)', 'y');
    
    let finalFolder = folder;
    let finalSlug = slug;
    
    if (useGenerated.toLowerCase() !== 'y') {
      finalFolder = await prompt('Custom folder name', folder);
      finalSlug = await prompt('Custom slug', slug);
    }

    // Get current date
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[now.getMonth()];
    const day = now.getDate();
    const year = now.getFullYear();
    const publishDate = `${day} ${month} ${year}`;

    // Generate thumbnail path
    const thumbnailPath = `/assets/blog/${finalFolder}/thumbnail.jpg`;

    // Read template - try current directory first, then parent directories
    let templatePath = path.join(__dirname, '..', 'templates', 'blog-post.md');
    
    // If not found in current directory, try parent directory (for worktrees)
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, '..', '..', 'templates', 'blog-post.md');
    }
    
    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template not found. Looked in:`);
      console.error(`   - ${path.join(__dirname, '..', 'templates', 'blog-post.md')}`);
      console.error(`   - ${path.join(__dirname, '..', '..', 'templates', 'blog-post.md')}`);
      process.exit(1);
    }
    
    const template = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders
    const content = template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{DATE\}\}/g, publishDate)
      .replace(/\{\{DESCRIPTION\}\}/g, description)
      .replace(/\{\{FOLDER\}\}/g, finalFolder)
      .replace(/\{\{THUMBNAIL\}\}/g, thumbnailPath);

    // Generate filename
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${dateStr}-${finalSlug}.md`;

    // Create output path
    const outputDir = path.join(__dirname, '..', 'src', 'data', 'blog-posts', 'published');
    const outputPath = path.join(outputDir, filename);

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      const overwrite = await prompt(`File ${filename} already exists. Overwrite? (y/n)`, 'n');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ Operation cancelled');
        process.exit(1);
      }
    }

    // Ensure directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Write file
    fs.writeFileSync(outputPath, content);

    console.log(`\n✅ Created new blog post: ${outputPath}`);
    console.log(`📝 Title: ${title}`);
    console.log(`📁 Folder: ${finalFolder}`);
    console.log(`🖼️  Thumbnail: ${thumbnailPath}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Add your content to the markdown file`);
    console.log(`   2. Create the assets folder: public/assets/blog/${finalFolder}/`);
    console.log(`   3. Add your thumbnail image: public${thumbnailPath}`);
    console.log(`   4. Update tags in the frontmatter as needed`);

  } catch (error) {
    console.error('❌ Error creating blog post:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();