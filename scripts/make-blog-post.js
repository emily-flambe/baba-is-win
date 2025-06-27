#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function createBlogPost() {
  console.log('Creating a new blog post...\n');

  const title = await question('Title: ');
  const description = await question('Description: ');
  const tags = await question('Tags (comma-separated): ');
  
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filename = `${dateStr}-${slug}.md`;
  
  const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  const formattedTags = tagArray.map(tag => `"${tag}"`).join(', ');
  
  const content = `---
title: ${title}
publishDate: ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
description: ${description}
thumbnail: /assets/blog/${dateStr}-${slug}/thumbnail.jpg
tags: [${formattedTags}]
---

# ${title}

Start writing your thought here...
`;

  const draftPath = path.join(__dirname, '..', 'src', 'data', 'blog-posts', 'draft', filename);
  
  fs.writeFileSync(draftPath, content);
  console.log(`\nBlog post created: ${draftPath}`);
  console.log('Edit the file and move it to published/ when ready.');
  
  rl.close();
}

createBlogPost().catch(console.error);