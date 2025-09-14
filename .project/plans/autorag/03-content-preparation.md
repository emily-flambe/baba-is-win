# Step 3: Content Preparation for RAG

## Objective
Prepare, structure, and optimize site content for effective retrieval and response generation in AutoRAG.

## Content Sources

### 3.1 Identify Content to Index
- [ ] Blog posts from `src/data/blog-posts/`
- [ ] Thoughts from `src/data/thoughts/`
- [ ] Museum descriptions from `src/data/museum-config.json`
- [ ] Biography content from `src/data/biography-levels/`
- [ ] Guides from `src/data/guides/`
- [ ] About page content
- [ ] Technical documentation from `.project/`

### 3.2 Content Transformation Pipeline

#### Create Processing Script
`scripts/prepare-rag-content.js`:
```javascript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

const outputDir = './docs-for-rag';

// Process markdown files with frontmatter
async function processMarkdownFile(filePath, category) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);
  
  // Create structured document
  const document = {
    title: frontmatter.title || path.basename(filePath, '.md'),
    category: category,
    tags: frontmatter.tags || [],
    date: frontmatter.date || null,
    description: frontmatter.description || '',
    content: await cleanContent(body),
    url: generateUrl(filePath, category),
    premium: frontmatter.premium || false
  };
  
  return document;
}

// Clean content for better RAG performance
async function cleanContent(markdown) {
  const processor = remark().use(strip);
  const result = await processor.process(markdown);
  
  return result.toString()
    .replace(/\n{3,}/g, '\n\n')  // Remove excessive newlines
    .replace(/```[\s\S]*?```/g, '[code snippet]')  // Simplify code blocks
    .trim();
}

// Generate user-facing URLs
function generateUrl(filePath, category) {
  const slug = path.basename(filePath, '.md');
  const urlMap = {
    'blog': `/blog/${slug}`,
    'thoughts': `/thoughts/${slug}`,
    'museum': `/museum/${slug}`,
    'guides': `/guides/${slug}`
  };
  return urlMap[category] || `/${slug}`;
}
```

### 3.3 Content Structure Templates

#### Blog Post Document
```markdown
---
type: blog_post
title: [Title]
date: [ISO Date]
url: /blog/[slug]
tags: [tag1, tag2]
---

# [Title]

[Description/Summary]

## Content
[Main content here]

## Key Points
- [Important point 1]
- [Important point 2]

Related: [List related content]
```

#### Site Feature Document
```markdown
---
type: feature
name: [Feature Name]
category: [Category]
---

# [Feature Name]

## What it is
[Brief description]

## How to use it
[Step-by-step instructions]

## Benefits
[Why users should care]
```

### 3.4 Metadata Enhancement

Add contextual metadata for better retrieval:
```javascript
function enhanceMetadata(document) {
  return {
    ...document,
    searchKeywords: extractKeywords(document.content),
    readingTime: calculateReadingTime(document.content),
    contentLength: document.content.length,
    lastUpdated: new Date().toISOString(),
    documentVersion: '1.0',
    language: 'en',
    accessibility: {
      hasAltText: checkForAltText(document.content),
      readabilityScore: calculateReadability(document.content)
    }
  };
}
```

### 3.5 Content Optimization Guidelines

#### For Better RAG Performance:
1. **Clear Headers**: Use descriptive H2/H3 headers
2. **Concise Paragraphs**: 3-4 sentences max
3. **Bullet Points**: For lists and key information
4. **Explicit Context**: Avoid pronouns without antecedents
5. **Keywords**: Natural repetition of important terms
6. **Summaries**: Add TLDR sections for long content

#### Avoid:
- Long code blocks (summarize instead)
- Deep nesting of information
- Ambiguous references
- Internal jargon without explanation
- File paths or implementation details

### 3.6 Create Upload Script

`scripts/upload-rag-content.js`:
```javascript
import { uploadToR2 } from './upload-to-r2.js';
import { prepareContent } from './prepare-rag-content.js';

async function uploadAllContent() {
  const categories = [
    { path: 'src/data/blog-posts', category: 'blog' },
    { path: 'src/data/thoughts', category: 'thoughts' },
    { path: 'src/data/guides', category: 'guides' }
  ];
  
  for (const { path, category } of categories) {
    const files = await getMarkdownFiles(path);
    
    for (const file of files) {
      const document = await processMarkdownFile(file, category);
      const enhanced = enhanceMetadata(document);
      
      // Upload as JSON for structured data
      await uploadToR2(
        `${category}/${document.slug}.json`,
        JSON.stringify(enhanced, null, 2)
      );
      
      // Also upload as markdown for better readability
      await uploadToR2(
        `${category}/${document.slug}.md`,
        formatAsMarkdown(enhanced)
      );
    }
  }
  
  console.log('✅ All content uploaded to R2');
}
```

### 3.7 Content Validation

Create validation script to ensure quality:
```javascript
function validateDocument(doc) {
  const issues = [];
  
  if (!doc.title) issues.push('Missing title');
  if (!doc.content) issues.push('Missing content');
  if (doc.content.length < 100) issues.push('Content too short');
  if (doc.content.length > 10000) issues.push('Content too long');
  if (!doc.category) issues.push('Missing category');
  if (!doc.url) issues.push('Missing URL');
  
  if (hasFileReferences(doc.content)) {
    issues.push('Contains file references');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
```

## Execution Checklist

- [ ] Create content processing scripts
- [ ] Process all blog posts
- [ ] Process all thoughts
- [ ] Process museum content
- [ ] Process guide documents
- [ ] Add site feature documentation
- [ ] Validate all documents
- [ ] Upload to R2 bucket
- [ ] Verify indexing in AutoRAG
- [ ] Test retrieval with sample queries

## Quality Metrics

Target metrics for content:
- Average document length: 500-2000 words
- Keyword density: 2-3%
- Readability score: Grade 8-10
- Metadata completeness: 100%
- No file path references: 0 occurrences

## Testing Content Retrieval

Test queries to validate content:
1. "What blog posts are about React?"
2. "Tell me about the museum"
3. "How do I sign up?"
4. "What are Emily's latest thoughts?"
5. "Explain the premium content system"

## Maintenance

### Regular Updates
- Re-process content weekly
- Add new content as published
- Update metadata quarterly
- Prune outdated content

### Monitoring
- Track which documents are retrieved most
- Identify content gaps from failed queries
- Optimize underperforming content

## Next Steps
→ Proceed to [04-worker-api-implementation.md](./04-worker-api-implementation.md)