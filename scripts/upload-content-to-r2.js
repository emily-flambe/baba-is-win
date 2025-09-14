#!/usr/bin/env node

/**
 * Upload Content to Cloudflare R2 for AutoRAG
 * 
 * This script uploads all site content (blog posts, thoughts, museum entries, etc.)
 * to R2 storage for use with Cloudflare AutoRAG
 */

import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import matter from 'gray-matter';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .r2.env
const envPath = path.join(__dirname, '..', '.r2.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log('Note: .r2.env file not found. Using environment variables.');
}

// Validate required environment variables
const requiredEnvVars = [
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('\nPlease create a .r2.env file with:');
  console.error('R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com');
  console.error('R2_ACCESS_KEY_ID=<your-access-key>');
  console.error('R2_SECRET_ACCESS_KEY=<your-secret-key>');
  console.error('R2_BUCKET_NAME=personal-site-docs');
  process.exit(1);
}

// Configure R2 client
const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

// Document metadata index
const documentIndex = [];
const uploadErrors = [];

/**
 * Content sources configuration
 */
const contentSources = [
  {
    name: 'Blog Posts',
    path: path.join(__dirname, '..', 'src', 'data', 'blog-posts'),
    category: 'blog',
    urlPrefix: '/blog/'
  },
  {
    name: 'Thoughts',
    path: path.join(__dirname, '..', 'src', 'data', 'thoughts'),
    category: 'thoughts',
    urlPrefix: '/thoughts/'
  },
  {
    name: 'Guides',
    path: path.join(__dirname, '..', 'src', 'data', 'guides'),
    category: 'guides',
    urlPrefix: '/guides/'
  },
  {
    name: 'Biography Levels',
    path: path.join(__dirname, '..', 'src', 'data', 'biography-levels'),
    category: 'about',
    urlPrefix: '/bio'
  },
  {
    name: 'Project Documentation',
    path: path.join(__dirname, '..', '.project', 'docs'),
    category: 'documentation',
    urlPrefix: '/docs/'
  }
];

/**
 * Get all markdown files recursively
 */
async function getAllMarkdownFiles(dir) {
  const files = [];
  
  try {
    if (!fs.existsSync(dir)) {
      console.log(`  Directory not found: ${dir}`);
      return files;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!item.startsWith('.') && item !== 'node_modules') {
          const subFiles = await getAllMarkdownFiles(fullPath);
          files.push(...subFiles);
        }
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * Process museum configuration
 */
async function processMuseumConfig() {
  const configPath = path.join(__dirname, '..', 'src', 'data', 'museum-config.json');
  const documents = [];
  
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      if (config.exhibits && Array.isArray(config.exhibits)) {
        config.exhibits.forEach(exhibit => {
          const doc = {
            title: exhibit.title || exhibit.name,
            content: `# ${exhibit.title || exhibit.name}\n\n${exhibit.description || ''}\n\n${exhibit.details || ''}`,
            category: 'museum',
            slug: exhibit.slug || exhibit.id,
            url: `/museum/${exhibit.slug || exhibit.id}`,
            metadata: {
              type: exhibit.type || 'exhibit',
              tags: exhibit.tags || []
            }
          };
          documents.push(doc);
        });
      }
    }
  } catch (error) {
    console.error('Error processing museum config:', error.message);
  }
  
  return documents;
}

/**
 * Extract title from filename if not in frontmatter
 */
function extractTitle(filename) {
  const name = path.basename(filename, '.md');
  return name
    .replace(/^\d{4}-\d{2}-\d{2}-/, '') // Remove date prefix
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Clean content for better RAG performance
 */
function cleanContent(content) {
  return content
    // Remove code blocks (keep a marker)
    .replace(/```[\s\S]*?```/g, '[code example]')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Clean up whitespace
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Upload a single document to R2
 */
async function uploadDocument(filePath, source) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);
    const filename = path.basename(filePath, '.md');
    const relativePath = path.relative(source.path, filePath);
    
    // Generate document ID
    const docId = crypto.createHash('md5').update(`${source.category}/${filename}`).digest('hex');
    
    // Extract date from filename or frontmatter
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = parsed.data.date || (dateMatch ? dateMatch[1] : null);
    
    // Prepare clean content for RAG
    const cleanedContent = cleanContent(parsed.content);
    
    // Create structured document
    const structuredDoc = {
      title: parsed.data.title || extractTitle(filePath),
      description: parsed.data.description || parsed.data.excerpt || '',
      category: source.category,
      url: `${source.urlPrefix}${filename}`,
      date: date,
      tags: parsed.data.tags || [],
      premium: parsed.data.premium || false,
      content: cleanedContent
    };
    
    // Prepare metadata for R2 - encode special characters
    const metadata = {
      id: docId,
      path: encodeURIComponent(relativePath),
      title: encodeURIComponent(structuredDoc.title),
      category: source.category,
      url: structuredDoc.url,
      tags: Array.isArray(structuredDoc.tags) ? encodeURIComponent(structuredDoc.tags.join(',')) : '',
      date: date || '',
      premium: String(structuredDoc.premium),
      lastModified: new Date().toISOString(),
      contentHash: crypto.createHash('md5').update(content).digest('hex')
    };
    
    // Create markdown document for R2
    const r2Document = `---
title: ${structuredDoc.title}
category: ${structuredDoc.category}
url: ${structuredDoc.url}
date: ${date || 'N/A'}
tags: ${structuredDoc.tags.join(', ')}
---

# ${structuredDoc.title}

${structuredDoc.description ? `${structuredDoc.description}\n\n` : ''}${cleanedContent}

---
*This content is from ${structuredDoc.url} on the baba-is-win website.*`;
    
    // Upload document to R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `content/${source.category}/${filename}.md`,
      Body: r2Document,
      ContentType: 'text/markdown',
      Metadata: metadata
    });
    
    await r2Client.send(command);
    
    // Add to index
    documentIndex.push({
      ...metadata,
      tags: structuredDoc.tags,
      size: r2Document.length,
      wordCount: cleanedContent.split(/\s+/).length
    });
    
    console.log(`✓ Uploaded: ${source.category}/${filename}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to upload ${filePath}:`, error.message);
    uploadErrors.push({ file: filePath, error: error.message });
    return false;
  }
}

/**
 * Upload special content (museum, etc.)
 */
async function uploadSpecialDocument(doc, key) {
  try {
    const docId = crypto.createHash('md5').update(key).digest('hex');
    
    const metadata = {
      id: docId,
      title: doc.title,
      category: doc.category,
      url: doc.url,
      tags: (doc.metadata?.tags || []).join(','),
      lastModified: new Date().toISOString()
    };
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `content/${key}.md`,
      Body: doc.content,
      ContentType: 'text/markdown',
      Metadata: metadata
    });
    
    await r2Client.send(command);
    
    documentIndex.push({
      ...metadata,
      tags: doc.metadata?.tags || [],
      size: doc.content.length
    });
    
    console.log(`✓ Uploaded: ${key}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to upload ${key}:`, error.message);
    uploadErrors.push({ file: key, error: error.message });
    return false;
  }
}

/**
 * Upload the document index
 */
async function uploadIndex() {
  try {
    const indexContent = JSON.stringify({
      documentCount: documentIndex.length,
      lastUpdated: new Date().toISOString(),
      categories: [...new Set(documentIndex.map(d => d.category))],
      documents: documentIndex
    }, null, 2);
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: 'metadata/index.json',
      Body: indexContent,
      ContentType: 'application/json',
      Metadata: {
        documentCount: String(documentIndex.length),
        lastUpdated: new Date().toISOString()
      }
    });
    
    await r2Client.send(command);
    console.log('📄 Index uploaded to metadata/index.json');
    return true;
  } catch (error) {
    console.error('✗ Failed to upload index:', error.message);
    return false;
  }
}

/**
 * List existing objects in bucket (for verification)
 */
async function listBucketContents() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: 'content/',
      MaxKeys: 10
    });
    
    const response = await r2Client.send(command);
    
    if (response.Contents && response.Contents.length > 0) {
      console.log('\nSample of uploaded files (first 10):');
      response.Contents.forEach(item => {
        console.log(`  - ${item.Key} (${item.Size} bytes)`);
      });
      
      if (response.KeyCount > 10) {
        console.log(`  ... and ${response.KeyCount - 10} more files`);
      }
    }
  } catch (error) {
    console.error('Could not list bucket contents:', error.message);
  }
}

/**
 * Clear existing content (optional)
 */
async function clearBucket() {
  console.log('Clearing existing content...');
  
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: 'content/'
    });
    
    const response = await r2Client.send(listCommand);
    
    if (response.Contents && response.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: {
          Objects: response.Contents.map(item => ({ Key: item.Key }))
        }
      });
      
      await r2Client.send(deleteCommand);
      console.log(`Deleted ${response.Contents.length} existing files`);
    }
  } catch (error) {
    console.error('Warning: Could not clear bucket:', error.message);
  }
}

/**
 * Main upload function
 */
async function uploadAllContent() {
  console.log('Starting content upload to R2 for AutoRAG...\n');
  console.log(`Bucket: ${process.env.R2_BUCKET_NAME}`);
  console.log(`Endpoint: ${process.env.R2_ENDPOINT}\n`);
  
  // Optional: Clear existing content
  if (process.argv.includes('--clear')) {
    await clearBucket();
    console.log();
  }
  
  let totalFiles = 0;
  let totalSuccess = 0;
  
  // Process each content source
  for (const source of contentSources) {
    console.log(`\nProcessing ${source.name}...`);
    
    const files = await getAllMarkdownFiles(source.path);
    
    if (files.length === 0) {
      console.log(`  No files found in ${source.category}`);
      continue;
    }
    
    console.log(`  Found ${files.length} files`);
    totalFiles += files.length;
    
    // Upload each file
    for (const file of files) {
      const success = await uploadDocument(file, source);
      if (success) totalSuccess++;
    }
  }
  
  // Process museum configuration
  console.log('\nProcessing Museum Configuration...');
  const museumDocs = await processMuseumConfig();
  
  if (museumDocs.length > 0) {
    console.log(`  Found ${museumDocs.length} museum entries`);
    
    for (const doc of museumDocs) {
      const key = `museum/${doc.slug}`;
      const success = await uploadSpecialDocument(doc, key);
      if (success) totalSuccess++;
      totalFiles++;
    }
  }
  
  // Upload index
  if (documentIndex.length > 0) {
    console.log('\nUploading document index...');
    await uploadIndex();
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Upload Summary:');
  console.log(`✅ Successfully uploaded: ${totalSuccess}/${totalFiles} files`);
  console.log(`📚 Total documents indexed: ${documentIndex.length}`);
  
  // Category breakdown
  const categories = {};
  documentIndex.forEach(doc => {
    categories[doc.category] = (categories[doc.category] || 0) + 1;
  });
  
  console.log('\nContent by category:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`  - ${category}: ${count} documents`);
  });
  
  if (uploadErrors.length > 0) {
    console.log(`\n❌ Failed uploads: ${uploadErrors.length}`);
    console.log('Failed files:');
    uploadErrors.forEach(err => {
      console.log(`  - ${path.basename(err.file)}: ${err.error}`);
    });
  }
  
  // List bucket contents for verification
  if (totalSuccess > 0) {
    await listBucketContents();
  }
  
  console.log('\n✨ Content upload complete!');
  
  if (totalSuccess === totalFiles) {
    console.log('All files uploaded successfully. AutoRAG can now index your content.');
    console.log('\nNext steps:');
    console.log('1. Go to Cloudflare Dashboard → AI → AutoRAG');
    console.log('2. Verify your instance is connected to this R2 bucket');
    console.log('3. Trigger a manual re-index if needed');
    console.log('4. Test queries in the AutoRAG dashboard');
  } else {
    console.log('Some files failed to upload. Please check the errors above.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Parse command line arguments
if (process.argv.includes('--help')) {
  console.log('Usage: node upload-content-to-r2.js [options]');
  console.log('\nOptions:');
  console.log('  --clear    Clear existing content before uploading');
  console.log('  --help     Show this help message');
  process.exit(0);
}

// Run the upload
uploadAllContent().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});