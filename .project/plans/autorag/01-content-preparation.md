# Phase 1: Content Preparation for Baba Is Win

## Objective
Process and prepare all website content for optimal indexing in AutoRAG, including blog posts, thoughts, museum items, and biographical information.

## Content Inventory

### Blog Posts (`src/data/blog-posts/`)
- Technical articles and tutorials
- Code examples and explanations
- Project announcements
- Learning experiences

### Thoughts (`src/data/thoughts/`)
- Personal reflections
- Philosophy and ideas
- Creative writing
- Commentary

### Museum Items (`src/data/museum-config.json`)
- Interactive demos
- Project descriptions
- Technical details
- Usage instructions

### Biography Content
- **Difficulty Levels** (`src/data/biography-levels/`)
  - very-easy.md - Quick intro
  - easy.md - Brief bio
  - medium.md - Standard bio
  - hard.md - Detailed bio
  - very-hard.md - Comprehensive bio
- **Bio Flavors** (`src/data/bio-flavors.ts`)
  - Professional variations
  - Casual variations
  - Technical focus

### Guides and Documentation
- User guides (`src/data/guides/`)
- API documentation (`.project/docs/api.md`)
- Technical documentation
- README files

## Content Processing Pipeline

### Step 1: Content Extraction Script

```javascript
// scripts/extract-content-for-rag.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';
import crypto from 'crypto';

const OUTPUT_DIR = './rag-content';

// Content extractors for different sources
const extractors = {
  // Blog posts extractor
  async extractBlogPosts() {
    const files = await glob('src/data/blog-posts/**/*.md');
    const posts = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const { data, content: body } = matter(content);
      
      posts.push({
        id: crypto.createHash('md5').update(file).digest('hex'),
        type: 'blog',
        title: data.title || path.basename(file, '.md'),
        description: data.description,
        tags: data.tags || [],
        date: data.date,
        author: 'Emily Cogsdill',
        content: body,
        url: `/blog/${path.basename(file, '.md')}`,
        metadata: {
          readTime: estimateReadTime(body),
          wordCount: body.split(/\s+/).length,
          codeBlocks: (body.match(/```/g) || []).length / 2,
          images: (body.match(/!\[.*?\]\(.*?\)/g) || []).length
        }
      });
    }
    
    return posts;
  },
  
  // Thoughts extractor
  async extractThoughts() {
    const files = await glob('src/data/thoughts/**/*.md');
    const thoughts = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const { data, content: body } = matter(content);
      
      thoughts.push({
        id: crypto.createHash('md5').update(file).digest('hex'),
        type: 'thought',
        title: data.title || path.basename(file, '.md'),
        description: data.description,
        tags: data.tags || [],
        date: data.date,
        content: body,
        url: `/thoughts/${path.basename(file, '.md')}`,
        metadata: {
          mood: data.mood,
          category: data.category,
          readTime: estimateReadTime(body)
        }
      });
    }
    
    return thoughts;
  },
  
  // Museum items extractor
  async extractMuseumItems() {
    const configPath = 'src/data/museum-config.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const items = [];
    
    for (const item of config.items) {
      items.push({
        id: crypto.createHash('md5').update(item.id).digest('hex'),
        type: 'museum',
        title: item.title,
        description: item.description,
        tags: item.tags || [],
        content: `
# ${item.title}

${item.description}

## Details
${item.longDescription || item.description}

## Technical Information
- Type: ${item.type}
- Category: ${item.category}
- Technologies: ${(item.technologies || []).join(', ')}

## How to Use
${item.instructions || 'Interactive demo - click to explore'}

${item.features ? `## Features\n${item.features.map(f => `- ${f}`).join('\n')}` : ''}
        `.trim(),
        url: `/museum/${item.id}`,
        metadata: {
          interactive: true,
          difficulty: item.difficulty,
          year: item.year
        }
      });
    }
    
    return items;
  },
  
  // Biography extractor
  async extractBiographies() {
    const levels = ['very-easy', 'easy', 'medium', 'hard', 'very-hard'];
    const bios = [];
    
    for (const level of levels) {
      const file = `src/data/biography-levels/${level}.md`;
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        
        bios.push({
          id: crypto.createHash('md5').update(file).digest('hex'),
          type: 'biography',
          title: `Biography - ${level.replace('-', ' ')} version`,
          description: `Emily Cogsdill's biography (${level} difficulty)`,
          tags: ['about', 'biography', 'personal'],
          content: content,
          url: `/about`,
          metadata: {
            difficulty: level,
            audience: getAudienceForLevel(level)
          }
        });
      }
    }
    
    return bios;
  }
};

// Helper functions
function estimateReadTime(text) {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function getAudienceForLevel(level) {
  const audiences = {
    'very-easy': 'Quick browsers',
    'easy': 'Casual readers',
    'medium': 'Interested visitors',
    'hard': 'Professional contacts',
    'very-hard': 'Deep researchers'
  };
  return audiences[level] || 'General';
}

// Main extraction
async function extractAllContent() {
  console.log('📚 Extracting content for RAG...\n');
  
  const allContent = [];
  
  // Extract from all sources
  for (const [name, extractor] of Object.entries(extractors)) {
    console.log(`Extracting ${name}...`);
    const content = await extractor();
    allContent.push(...content);
    console.log(`  ✓ Extracted ${content.length} items`);
  }
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Save individual documents
  for (const doc of allContent) {
    const filename = `${doc.type}-${doc.id}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      JSON.stringify(doc, null, 2)
    );
  }
  
  // Save master index
  const index = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    documentCount: allContent.length,
    documents: allContent.map(doc => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      url: doc.url
    }))
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );
  
  console.log(`\n✅ Extracted ${allContent.length} documents`);
  console.log(`📁 Saved to ${OUTPUT_DIR}/`);
  
  // Generate statistics
  const stats = {
    total: allContent.length,
    byType: {},
    totalWords: 0,
    averageWords: 0
  };
  
  for (const doc of allContent) {
    stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1;
    stats.totalWords += doc.content.split(/\s+/).length;
  }
  
  stats.averageWords = Math.round(stats.totalWords / allContent.length);
  
  console.log('\n📊 Statistics:');
  console.log(`  Total documents: ${stats.total}`);
  console.log(`  By type:`, stats.byType);
  console.log(`  Total words: ${stats.totalWords.toLocaleString()}`);
  console.log(`  Average words per doc: ${stats.averageWords}`);
  
  return allContent;
}

// Run extraction
extractAllContent().catch(console.error);
```

### Step 2: Content Enhancement Script

```javascript
// scripts/enhance-content-for-rag.js
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const CONTENT_DIR = './rag-content';
const ENHANCED_DIR = './rag-content-enhanced';

// Enhancement strategies
const enhancers = {
  // Add semantic metadata
  addSemanticMetadata(doc) {
    const enhanced = { ...doc };
    
    // Add question-answer pairs
    enhanced.qa = generateQAPairs(doc);
    
    // Add summary
    enhanced.summary = generateSummary(doc);
    
    // Add related topics
    enhanced.relatedTopics = extractTopics(doc);
    
    // Add keywords
    enhanced.keywords = extractKeywords(doc);
    
    return enhanced;
  },
  
  // Format for optimal chunking
  formatForChunking(doc) {
    const enhanced = { ...doc };
    
    // Add section markers
    enhanced.formattedContent = `
# Document: ${doc.title}
Type: ${doc.type}
URL: ${doc.url}

## Summary
${doc.summary || doc.description}

## Main Content
${doc.content}

## Metadata
- Author: Emily Cogsdill
- Type: ${doc.type}
- Tags: ${(doc.tags || []).join(', ')}
${doc.date ? `- Date: ${doc.date}` : ''}

## Common Questions
${(doc.qa || []).map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')}
    `.trim();
    
    return enhanced;
  },
  
  // Add navigation helpers
  addNavigationHelpers(doc) {
    const enhanced = { ...doc };
    
    enhanced.navigation = {
      breadcrumb: getBreadcrumb(doc),
      relatedLinks: getRelatedLinks(doc),
      category: getCategoryPath(doc)
    };
    
    return enhanced;
  }
};

// Helper functions
function generateQAPairs(doc) {
  const pairs = [];
  
  // Type-specific Q&A generation
  switch(doc.type) {
    case 'blog':
      pairs.push(
        { question: `What is ${doc.title} about?`, answer: doc.description },
        { question: `When was ${doc.title} published?`, answer: doc.date || 'Recently' },
        { question: `How long does it take to read ${doc.title}?`, answer: `About ${doc.metadata?.readTime || 5} minutes` }
      );
      break;
    
    case 'museum':
      pairs.push(
        { question: `What is ${doc.title}?`, answer: doc.description },
        { question: `How do I use ${doc.title}?`, answer: 'Visit the museum section to interact with this demo.' },
        { question: `Is ${doc.title} interactive?`, answer: 'Yes, this is an interactive museum piece.' }
      );
      break;
    
    case 'biography':
      pairs.push(
        { question: 'Who is Emily Cogsdill?', answer: extractFirstParagraph(doc.content) },
        { question: 'What does Emily do?', answer: 'Software engineer and creative technologist.' }
      );
      break;
  }
  
  return pairs;
}

function generateSummary(doc) {
  // Extract first paragraph or description
  if (doc.description) return doc.description;
  
  const firstPara = doc.content.split('\n\n')[0];
  return firstPara.length > 200 
    ? firstPara.substring(0, 197) + '...'
    : firstPara;
}

function extractTopics(doc) {
  // Extract main topics from content
  const topics = new Set([...doc.tags || []]);
  
  // Add type as topic
  topics.add(doc.type);
  
  // Extract from title
  const titleWords = doc.title.toLowerCase().split(/\s+/);
  titleWords.forEach(word => {
    if (word.length > 4) topics.add(word);
  });
  
  return Array.from(topics);
}

function extractKeywords(doc) {
  // Simple keyword extraction
  const text = `${doc.title} ${doc.description} ${doc.content}`.toLowerCase();
  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  
  // Count frequency
  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });
  
  // Get top keywords
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function getBreadcrumb(doc) {
  const parts = ['Home'];
  
  switch(doc.type) {
    case 'blog':
      parts.push('Blog', doc.title);
      break;
    case 'thought':
      parts.push('Thoughts', doc.title);
      break;
    case 'museum':
      parts.push('Museum', doc.title);
      break;
    case 'biography':
      parts.push('About');
      break;
  }
  
  return parts.join(' > ');
}

function getRelatedLinks(doc) {
  // This would be enhanced with actual related content
  return [];
}

function getCategoryPath(doc) {
  return `/${doc.type}`;
}

function extractFirstParagraph(content) {
  return content.split('\n\n')[0] || content.substring(0, 200);
}

// Main enhancement
async function enhanceAllContent() {
  console.log('🔧 Enhancing content for optimal RAG performance...\n');
  
  // Create output directory
  if (!fs.existsSync(ENHANCED_DIR)) {
    fs.mkdirSync(ENHANCED_DIR, { recursive: true });
  }
  
  // Load all documents
  const files = await glob(`${CONTENT_DIR}/*.json`);
  const documents = [];
  
  for (const file of files) {
    if (path.basename(file) === 'index.json') continue;
    
    const doc = JSON.parse(fs.readFileSync(file, 'utf-8'));
    
    // Apply all enhancers
    let enhanced = doc;
    for (const [name, enhancer] of Object.entries(enhancers)) {
      enhanced = enhancer(enhanced);
    }
    
    documents.push(enhanced);
    
    // Save enhanced document
    const filename = path.basename(file);
    fs.writeFileSync(
      path.join(ENHANCED_DIR, filename),
      JSON.stringify(enhanced, null, 2)
    );
  }
  
  console.log(`✅ Enhanced ${documents.length} documents`);
  console.log(`📁 Saved to ${ENHANCED_DIR}/`);
  
  return documents;
}

// Run enhancement
enhanceAllContent().catch(console.error);
```

### Step 3: Convert to Markdown for R2

```javascript
// scripts/convert-to-markdown-for-r2.js
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const ENHANCED_DIR = './rag-content-enhanced';
const MARKDOWN_DIR = './rag-markdown';

async function convertToMarkdown() {
  console.log('📝 Converting to Markdown for R2 upload...\n');
  
  // Create output directory structure
  const dirs = ['blog', 'thoughts', 'museum', 'biography', 'guides'];
  dirs.forEach(dir => {
    const fullPath = path.join(MARKDOWN_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
  
  // Load enhanced documents
  const files = await glob(`${ENHANCED_DIR}/*.json`);
  
  for (const file of files) {
    if (path.basename(file) === 'index.json') continue;
    
    const doc = JSON.parse(fs.readFileSync(file, 'utf-8'));
    
    // Create markdown with frontmatter
    const markdown = `---
title: ${doc.title}
type: ${doc.type}
url: ${doc.url}
description: ${doc.description || ''}
tags: ${(doc.tags || []).join(', ')}
keywords: ${(doc.keywords || []).join(', ')}
${doc.date ? `date: ${doc.date}` : ''}
---

${doc.formattedContent || doc.content}
`;
    
    // Determine output path
    const dir = doc.type === 'thought' ? 'thoughts' : doc.type;
    const filename = `${doc.id}.md`;
    const outputPath = path.join(MARKDOWN_DIR, dir, filename);
    
    // Save markdown file
    fs.writeFileSync(outputPath, markdown);
  }
  
  console.log(`✅ Converted ${files.length - 1} documents to Markdown`);
  console.log(`📁 Ready for R2 upload from ${MARKDOWN_DIR}/`);
}

// Run conversion
convertToMarkdown().catch(console.error);
```

## Content Quality Checklist

For each content type, ensure:

### Blog Posts
- [ ] Title clearly describes content
- [ ] Description provides good summary
- [ ] Code examples are properly formatted
- [ ] Tags accurately categorize content
- [ ] Links are converted to full URLs
- [ ] Images have alt text

### Thoughts
- [ ] Personal voice is preserved
- [ ] Context is clear without prior knowledge
- [ ] Mood/category metadata included
- [ ] Related thoughts are linked

### Museum Items
- [ ] Clear explanation of what it does
- [ ] Usage instructions included
- [ ] Technical details provided
- [ ] Interactive nature is mentioned

### Biography
- [ ] All difficulty levels processed
- [ ] Professional information clear
- [ ] Personal touches preserved
- [ ] Contact information excluded

## Metadata Standards

Each document should include:
```yaml
---
title: Clear, descriptive title
type: blog|thought|museum|biography|guide
url: /path/to/content
description: 1-2 sentence summary
tags: relevant, tags, here
keywords: extracted, keywords
date: YYYY-MM-DD (if applicable)
author: Emily Cogsdill
premium: false|true (for gated content)
---
```

## Premium Content Handling

For content behind authentication:
1. Mark with `premium: true` in metadata
2. Include teaser/summary in public version
3. Add note about authentication requirement
4. Ensure no sensitive content in indexed version

## Next Steps

1. Run content extraction script
2. Review extracted content for quality
3. Run enhancement script
4. Convert to markdown format
5. Upload to R2 bucket
6. Proceed to Phase 2: AutoRAG Setup

---

*Phase Status: Ready to Execute*
*Estimated Time: 4-6 hours*
*Output: ~100-200 indexed documents*