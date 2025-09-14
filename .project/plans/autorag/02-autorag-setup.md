# Phase 2: AutoRAG Setup for Baba Is Win

## Objective
Configure Cloudflare AutoRAG instance with R2 storage, optimize settings for website content retrieval, and establish the RAG pipeline for the chatbot.

## Prerequisites

- [ ] Cloudflare account with Workers enabled
- [ ] Content prepared from Phase 1
- [ ] R2 storage access enabled
- [ ] Workers AI access enabled
- [ ] AI Gateway configured (optional but recommended)

## Setup Tasks

### 1. R2 Bucket Configuration

#### Create R2 Bucket
```bash
# Create dedicated bucket for website content
wrangler r2 bucket create baba-is-win-docs

# Verify bucket creation
wrangler r2 bucket list
```

#### Bucket Structure
```
baba-is-win-docs/
├── content/                # Main content documents
│   ├── blog/              # Blog posts
│   ├── thoughts/          # Thought pieces
│   ├── museum/            # Museum items
│   ├── biography/         # Bio variations
│   └── guides/            # Guides and docs
├── metadata/              # Document metadata
│   └── index.json        # Master index file
└── config/               # Configuration files
    └── autorag.json     # AutoRAG configuration
```

### 2. Document Upload to R2

#### Environment Configuration
Create `.env.r2` file:
```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET_NAME=baba-is-win-docs
```

#### Upload Script (`scripts/upload-to-r2.js`)
```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.r2' });

// Configure R2 client
const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function uploadToR2() {
  console.log('🚀 Uploading content to R2...\n');
  
  const MARKDOWN_DIR = './rag-markdown';
  const files = await glob(`${MARKDOWN_DIR}/**/*.md`);
  
  let uploaded = 0;
  
  for (const file of files) {
    const key = path.relative(MARKDOWN_DIR, file);
    const content = fs.readFileSync(file, 'utf-8');
    
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `content/${key}`,
      Body: content,
      ContentType: 'text/markdown',
      Metadata: {
        source: 'baba-is-win',
        type: path.dirname(key),
        uploaded: new Date().toISOString()
      }
    }));
    
    uploaded++;
    console.log(`✓ Uploaded: ${key}`);
  }
  
  // Upload index
  const index = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    documentCount: uploaded,
    source: 'baba-is-win'
  };
  
  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: 'metadata/index.json',
    Body: JSON.stringify(index, null, 2),
    ContentType: 'application/json'
  }));
  
  console.log(`\n✅ Uploaded ${uploaded} documents to R2`);
}

uploadToR2().catch(console.error);
```

### 3. AutoRAG Instance Creation

#### Via Cloudflare Dashboard

1. Navigate to **AI > AutoRAG**
2. Click **Create AutoRAG**
3. Configure with these settings:

```javascript
{
  "name": "baba-is-win-assistant",
  "description": "Personal website content assistant for baba-is-win",
  
  // Data Source Configuration
  "dataSource": {
    "type": "r2",
    "bucket": "baba-is-win-docs",
    "path": "/content",
    "refreshInterval": "daily"  // Auto-reindex daily
  },
  
  // Chunking Configuration
  "chunking": {
    "strategy": "recursive",
    "chunkSize": 768,         // Larger for blog posts
    "chunkOverlap": 200,      // More overlap for context
    "separators": ["\n## ", "\n### ", "\n\n", "\n", ". ", " "]
  },
  
  // Embedding Configuration
  "embedding": {
    "model": "@cf/baai/bge-m3",  // High quality embeddings
    "pooling": "cls",
    "batchSize": 50
  },
  
  // Query Rewriting Configuration
  "queryRewrite": {
    "enabled": true,
    "model": "@cf/meta/llama-3.1-8b-instruct",
    "systemPrompt": "Rewrite the user's question to search Emily's website content effectively. Focus on blog posts, thoughts, museum items, and biographical information. Preserve the intent while making it more search-friendly.",
    "maxTokens": 150
  },
  
  // Retrieval Configuration
  "retrieval": {
    "maxResults": 6,        // More context for varied content
    "minScore": 0.65,       // Lower threshold for creative content
    "diversityBias": 0.4,   // More diversity for varied topics
    "reranking": {
      "enabled": true,
      "model": "@cf/baai/bge-reranker-base"
    }
  },
  
  // Generation Configuration
  "generation": {
    "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "systemPrompt": "You are a helpful assistant for Emily's personal website (baba-is-win). Answer questions about blog posts, thoughts, museum projects, and Emily's background. Be friendly and conversational while staying accurate to the source content. If you're not sure about something, say so. Never make up information not in the provided context.",
    "temperature": 0.5,      // Balance creativity and accuracy
    "maxTokens": 600,       // Longer for detailed explanations
    "fallbackModel": "@cf/meta/llama-3.1-8b-instruct"
  },
  
  // Caching Configuration
  "caching": {
    "similarityThreshold": 0.92,  // Cache similar queries
    "ttl": 7200                   // Cache for 2 hours
  },
  
  // AI Gateway Integration
  "aiGateway": {
    "enabled": true,
    "endpoint": "https://gateway.ai.cloudflare.com/v1/{account_id}/baba-is-win-rag"
  }
}
```

### 4. System Prompts Configuration

#### Generation System Prompt (Configure in Dashboard)
```
IDENTITY:
You are a friendly assistant for Emily Cogsdill's personal website (baba-is-win.com). You help visitors learn about Emily's work, thoughts, and projects.

KNOWLEDGE BASE:
- Blog posts: Technical articles, tutorials, and project updates
- Thoughts: Personal reflections, philosophy, and creative writing
- Museum: Interactive demos and creative projects
- Biography: Information about Emily's background and experience

RESPONSE GUIDELINES:
1. Be conversational and friendly, matching the site's personal tone
2. Keep responses concise but informative (2-3 paragraphs max)
3. Always base answers on the provided content - never make things up
4. If asked about something not in the content, politely say you don't have that information
5. Suggest related content when relevant
6. Mention the content type (blog post, thought, museum item) when referencing specific pieces
7. Respect that some content may be premium/gated - don't reveal full premium content

FORMATTING:
- Use markdown for formatting (bold, italics, lists)
- Include relevant links using the format: [title](/path)
- Keep paragraphs short for readability
- Use bullet points for lists

EXAMPLE RESPONSES:

Q: "Who is Emily?"
A: Emily Cogsdill is a software engineer and creative technologist who combines technical expertise with creative exploration. She writes about programming, shares personal thoughts, and creates interactive demos in her digital museum. You can learn more about her background on the [about page](/about).

Q: "What kind of blog posts are there?"
A: The blog features technical articles covering web development, programming concepts, and project updates. Topics range from practical tutorials to deep dives into specific technologies. Each post includes code examples and real-world applications. Browse the [blog](/blog) to explore specific topics.

Q: "Tell me about the museum"
A: The museum showcases interactive demos and creative coding projects. Each piece is designed to be explored and played with, combining art and technology. These range from data visualizations to experimental interfaces. Visit the [museum](/museum) to start exploring!
```

#### Query Rewrite System Prompt
```
Transform the user's question into search queries for Emily's website content.

CONTENT TYPES:
- Blog posts: Technical articles and tutorials
- Thoughts: Personal reflections and ideas  
- Museum: Interactive demos and projects
- Biography: Background and experience
- Guides: How-to documentation

REWRITE STRATEGIES:
1. Expand abbreviations and acronyms
2. Include synonyms for key terms
3. Add content type if implied
4. Preserve specific names or titles mentioned
5. Convert casual language to searchable terms

EXAMPLES:
- "latest posts" → "recent blog posts articles updates 2024 2025"
- "who is she" → "Emily Cogsdill biography about background experience"
- "cool demos" → "museum interactive projects demos visualizations"
- "how to code" → "programming tutorial blog development guide"
```

### 5. Wrangler Configuration Update

Update `wrangler.toml`:
```toml
name = "baba-is-win"
main = "src/index.ts"
compatibility_date = "2025-01-01"
node_compat = true

# Workers AI Binding for AutoRAG
[[ai]]
binding = "AI"

# R2 Bucket for content
[[r2_buckets]]
binding = "CONTENT_BUCKET"
bucket_name = "baba-is-win-docs"

# AI Gateway (optional but recommended)
[ai_gateway]
binding = "AI_GATEWAY"
endpoint = "https://gateway.ai.cloudflare.com/v1/{account_id}/baba-is-win-rag"

# Environment variables
[vars]
AUTORAG_INSTANCE_NAME = "baba-is-win-assistant"
CHAT_RATE_LIMIT = "10"  # Queries per minute per IP

# Development environment
[env.development]
vars = { ENVIRONMENT = "development" }

# Production environment  
[env.production]
vars = { ENVIRONMENT = "production" }
```

### 6. Testing AutoRAG Instance

#### Test Script (`scripts/test-autorag.js`)
```javascript
export default {
  async fetch(request, env) {
    const testQueries = [
      "Who is Emily Cogsdill?",
      "What blog posts are available?",
      "Tell me about the museum",
      "What are Emily's thoughts on technology?",
      "How can I contact Emily?",
      "What projects has Emily worked on?",
      "What's the latest blog post?",
      "Tell me about Emily's background"
    ];
    
    const results = [];
    
    for (const query of testQueries) {
      try {
        const response = await env.AI
          .autorag(env.AUTORAG_INSTANCE_NAME)
          .aiSearch({
            query,
            rewrite_query: true,
            max_num_results: 5
          });
        
        results.push({
          query,
          answer: response.response || response.answer,
          sources: response.data?.length || 0,
          success: true
        });
      } catch (error) {
        results.push({
          query,
          error: error.message,
          success: false
        });
      }
    }
    
    return Response.json({
      timestamp: new Date().toISOString(),
      instance: env.AUTORAG_INSTANCE_NAME,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  }
};
```

### 7. Monitoring Setup

#### Metrics Dashboard Configuration
```javascript
// Create monitoring endpoints
const metrics = {
  endpoints: {
    '/api/metrics/chat': 'Chat usage statistics',
    '/api/metrics/performance': 'Response time metrics',
    '/api/metrics/quality': 'Response quality scores'
  },
  
  tracking: {
    queries_per_hour: { threshold: 100, alert: 'above' },
    avg_response_time: { threshold: 2500, alert: 'above' },
    error_rate: { threshold: 0.05, alert: 'above' },
    cache_hit_rate: { target: 0.25, alert: 'below' }
  }
};
```

### 8. Performance Optimization

#### Caching Strategy
```javascript
// Implement intelligent caching
const cacheConfig = {
  // Cache common queries
  commonQueries: [
    "Who is Emily?",
    "What is this site about?",
    "Latest blog posts",
    "Museum items"
  ],
  
  // Pre-warm cache on deployment
  prewarm: true,
  
  // Cache by user session
  sessionBased: true,
  
  // Invalidation rules
  invalidateOn: ['content_update', 'daily']
};
```

## Troubleshooting Guide

### Common Issues and Solutions

1. **No results returned**
   - Check R2 bucket permissions
   - Verify indexing completed
   - Test with simple queries first

2. **Slow responses**
   - Enable caching
   - Reduce max_num_results
   - Use fallback model for high load

3. **Irrelevant results**
   - Increase minScore threshold
   - Enable reranking
   - Improve query rewrite prompt

4. **Missing content**
   - Verify all documents uploaded
   - Check indexing status
   - Review chunk size settings

## Success Checklist

- [ ] R2 bucket created with correct name
- [ ] All content uploaded to R2
- [ ] AutoRAG instance created in dashboard
- [ ] System prompts configured
- [ ] Indexing completed successfully
- [ ] Test queries returning good results
- [ ] Wrangler.toml updated
- [ ] Monitoring configured
- [ ] Performance acceptable (<2s responses)

## Next Phase
Once AutoRAG is configured and tested, proceed to Phase 3: Integration Development

---

*Phase Status: Ready to Implement*
*Estimated Time: 3-4 hours*
*Dependencies: Completed Phase 1 content*