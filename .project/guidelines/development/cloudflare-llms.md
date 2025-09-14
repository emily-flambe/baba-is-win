# Cloudflare LLMs and RAG Development Guidelines

## Overview

This document provides comprehensive guidelines for implementing Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG) using Cloudflare's AI ecosystem. It covers AutoRAG, Workers AI, Vectorize, and related technologies for building AI-powered applications.

## Table of Contents
1. [AutoRAG Fundamentals](#autorag-fundamentals)
2. [RAG Pipeline Architecture](#rag-pipeline-architecture)
3. [Implementation Guide](#implementation-guide)
4. [Browser Rendering for Dynamic Content](#browser-rendering-for-dynamic-content)
5. [Workers AI Integration](#workers-ai-integration)
6. [Vector Databases with Vectorize](#vector-databases-with-vectorize)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)

---

## AutoRAG Fundamentals

### What is AutoRAG?

AutoRAG is Cloudflare's fully-managed Retrieval-Augmented Generation solution that eliminates infrastructure complexity while providing:

- **Automated Pipeline Management**: End-to-end RAG workflow from ingestion to response generation
- **Continuous Synchronization**: Automatic monitoring and re-indexing of data sources
- **Edge Integration**: Native integration with Cloudflare's global network
- **Zero Infrastructure**: No need to manage vector databases, embedding models, or retrieval logic

### Core Processes

1. **Indexing (Asynchronous)**
   - Monitors data sources for changes
   - Converts documents into vector embeddings
   - Stores vectors in managed Vectorize database
   - Runs continuously in background

2. **Querying (Synchronous)**
   - Triggered by user queries
   - Retrieves relevant content from vector database
   - Generates context-aware responses using LLMs
   - Returns results in real-time

### Key Benefits

- **Accurate, Current Answers**: Based on latest content, not outdated training data
- **Controlled Information Sources**: Define trusted knowledge base
- **Reduced Hallucinations**: Responses grounded in retrieved data
- **No Model Training Required**: High-quality results without custom LLMs

---

## RAG Pipeline Architecture

### Complete RAG Implementation Stack

```
┌─────────────────────────────────────────────────┐
│                  User Query                      │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│            Cloudflare Worker                     │
│         (API Endpoint & Orchestration)           │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│                 AutoRAG                          │
│  ┌──────────────────────────────────────────┐   │
│  │  Query Rewriting (Optional)              │   │
│  │  - Transform query for better retrieval  │   │
│  └──────────────────────────────────────────┘   │
│                     ▼                            │
│  ┌──────────────────────────────────────────┐   │
│  │         Semantic Search                  │   │
│  │  - Vector similarity matching            │   │
│  │  - Metadata filtering                   │   │
│  └──────────────────────────────────────────┘   │
│                     ▼                            │
│  ┌──────────────────────────────────────────┐   │
│  │      Response Generation                 │   │
│  │  - Combine context with query           │   │
│  │  - Generate using Workers AI LLM        │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│           Supporting Infrastructure              │
│  ┌──────────────────────────────────────────┐   │
│  │ R2 Storage: Document storage             │   │
│  │ Vectorize: Vector database              │   │
│  │ Workers AI: Embedding & generation      │   │
│  │ D1: Metadata & document storage         │   │
│  │ Queues: Batch processing               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Document Processing Pipeline

```typescript
// 1. Client Upload
POST /api/documents
{
  "documents": [...],
  "metadata": {...}
}

// 2. Input Processing (Workers)
async function processDocuments(request) {
  const { documents } = await request.json();
  
  // Send to Queues for batch processing
  await env.DOCUMENT_QUEUE.send({
    type: 'batch_process',
    documents,
    timestamp: Date.now()
  });
}

// 3. Batch Processing (Queue Consumer)
async function consumeQueue(batch) {
  for (const message of batch.messages) {
    // Generate embeddings
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: message.body.documents
    });
    
    // Store in Vectorize
    await env.VECTORIZE.insert(embeddings);
    
    // Store documents in D1
    await env.D1.prepare('INSERT INTO documents...').run();
  }
}
```

---

## Implementation Guide

### Step 1: Configure AutoRAG in Wrangler

```toml
# wrangler.toml
name = "my-rag-worker"
main = "src/index.ts"

# AutoRAG binding
[[ai]]
binding = "AI"

# R2 bucket for documents
[[r2_buckets]]
binding = "DOCUMENT_BUCKET"
bucket_name = "rag-documents"

# D1 database for metadata
[[d1_databases]]
binding = "DB"
database_name = "rag-metadata"
database_id = "your-database-id"

# Environment variables
[vars]
AUTORAG_NAME = "my-autorag-instance"
```

### Step 2: Create AutoRAG Instance

1. Navigate to Cloudflare Dashboard → AI → AutoRAG
2. Click "Create AutoRAG"
3. Configure:
   - **Data Source**: Select R2 bucket
   - **Chunking**: 400 tokens with 50 token overlap
   - **Embedding Model**: Default Cloudflare model
   - **Generation Model**: @cf/openai/gpt-oss-120b
   - **Query Rewriting**: Enable for better retrieval

### Step 3: Implement Worker API

```typescript
// src/index.ts
import { AutoRouter } from 'itty-router';

const router = AutoRouter();

// AI Search endpoint
router.post('/api/chat', async (request, env) => {
  const { query, filters, history } = await request.json();
  
  // Build context from conversation history
  const context = history?.map(m => `${m.role}: ${m.content}`).join('\n');
  
  // Query AutoRAG with context
  const response = await env.AI.autorag(env.AUTORAG_NAME).aiSearch({
    query: context ? `${context}\n\nuser: ${query}` : query,
    model: "@cf/openai/gpt-oss-120b",
    rewrite_query: true,
    max_num_results: 5,
    filters: filters || {},
    stream: false
  });
  
  return Response.json({
    response: response.response,
    sources: response.results?.map(r => ({
      content: r.text,
      metadata: r.metadata,
      score: r.score
    }))
  });
});

// Simple search endpoint (no generation)
router.post('/api/search', async (request, env) => {
  const { query, limit = 10 } = await request.json();
  
  const results = await env.AI.autorag(env.AUTORAG_NAME).search({
    query,
    max_num_results: limit,
    rewrite_query: true
  });
  
  return Response.json({ results });
});

export default router;
```

### Step 4: Content Ingestion Service

```typescript
// src/contentIngestion.ts
export class ContentIngestionService {
  constructor(private env: Env) {}
  
  async ingestContent(content: Document[]) {
    const batch = [];
    
    for (const doc of content) {
      // Format document for R2 storage
      const formatted = {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        metadata: {
          type: doc.type,
          tags: doc.tags,
          createdAt: doc.createdAt,
          url: doc.url
        }
      };
      
      // Store in R2 (AutoRAG will auto-index)
      await this.env.DOCUMENT_BUCKET.put(
        `documents/${doc.type}/${doc.id}.json`,
        JSON.stringify(formatted),
        {
          customMetadata: formatted.metadata
        }
      );
      
      batch.push(formatted);
    }
    
    return { ingested: batch.length };
  }
  
  async deleteContent(documentId: string) {
    // Delete from R2 (AutoRAG will auto-remove from index)
    await this.env.DOCUMENT_BUCKET.delete(`documents/${documentId}.json`);
  }
}
```

---

## Browser Rendering for Dynamic Content

### Use Case
For indexing dynamic websites or SPAs that require JavaScript rendering.

### Implementation

```typescript
// src/browserRenderer.ts
import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request: Request, env: Env) {
    const { url, selector } = await request.json();
    
    // Launch browser
    const browser = await puppeteer.launch(env.MY_BROWSER);
    
    try {
      const page = await browser.newPage();
      
      // Navigate and wait for content
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Optional: Wait for specific selector
      if (selector) {
        await page.waitForSelector(selector);
      }
      
      // Extract content
      const content = await page.evaluate(() => {
        // Remove scripts and styles
        const scripts = document.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        // Get text content
        return {
          title: document.title,
          meta: {
            description: document.querySelector('meta[name="description"]')?.content,
            keywords: document.querySelector('meta[name="keywords"]')?.content
          },
          content: document.body.innerText,
          html: document.body.innerHTML
        };
      });
      
      // Store rendered content in R2
      const key = `rendered/${new URL(url).hostname}_${Date.now()}.json`;
      await env.HTML_BUCKET.put(key, JSON.stringify(content));
      
      return Response.json({ 
        success: true, 
        key,
        content: content.content.substring(0, 500) // Preview
      });
      
    } finally {
      await browser.close();
    }
  }
};
```

### Scheduled Rendering

```typescript
// Scheduled worker for regular content updates
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const urls = [
      'https://example.com/dynamic-page-1',
      'https://example.com/dynamic-page-2'
    ];
    
    for (const url of urls) {
      await fetch('https://renderer.workers.dev', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
    }
  }
};
```

---

## Workers AI Integration

### Available Models for RAG

```typescript
// Text Embedding Models
const EMBEDDING_MODELS = {
  'bge-base': '@cf/baai/bge-base-en-v1.5',        // 768 dimensions
  'bge-large': '@cf/baai/bge-large-en-v1.5',      // 1024 dimensions
  'bge-small': '@cf/baai/bge-small-en-v1.5'       // 384 dimensions
};

// Generation Models
const GENERATION_MODELS = {
  'gpt-oss-120b': '@cf/openai/gpt-oss-120b',      // 128K context
  'gpt-oss-20b': '@cf/openai/gpt-oss-20b',        // 128K context
  'llama-3': '@cf/meta/llama-3.3-70b-instruct'    // Alternative
};
```

### Direct Workers AI Usage

```typescript
// Generate embeddings manually
async function generateEmbeddings(text: string, env: Env) {
  const embeddings = await env.AI.run(
    '@cf/baai/bge-base-en-v1.5',
    { text: [text] }
  );
  
  return embeddings.data[0];
}

// Text generation without AutoRAG
async function generateResponse(prompt: string, env: Env) {
  const response = await env.AI.run(
    '@cf/openai/gpt-oss-120b',
    {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    }
  );
  
  return response.response;
}
```

---

## Vector Databases with Vectorize

### Creating and Managing Indexes

```bash
# Create a new vector index
wrangler vectorize create my-index \
  --dimensions 768 \
  --metric cosine

# List indexes
wrangler vectorize list

# Delete an index
wrangler vectorize delete my-index
```

### Vectorize Operations

```typescript
// Insert vectors
async function insertVectors(env: Env) {
  const vectors = [
    {
      id: 'doc-1',
      values: [0.1, 0.2, ...], // 768 dimensions
      metadata: { type: 'article', tags: ['tech'] }
    }
  ];
  
  await env.VECTORIZE.insert(vectors);
}

// Query vectors
async function searchVectors(query: number[], env: Env) {
  const results = await env.VECTORIZE.query(query, {
    topK: 10,
    filter: { type: 'article' }
  });
  
  return results.matches;
}

// Update vectors
async function updateVector(id: string, values: number[], env: Env) {
  await env.VECTORIZE.upsert([{
    id,
    values,
    metadata: { updated: Date.now() }
  }]);
}

// Delete vectors
async function deleteVectors(ids: string[], env: Env) {
  await env.VECTORIZE.deleteByIds(ids);
}
```

---

## Best Practices

### 1. Text Chunking Strategy

```typescript
class TextChunker {
  constructor(
    private chunkSize: number = 400,
    private overlap: number = 50
  ) {}
  
  chunk(text: string): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += this.chunkSize - this.overlap) {
      const chunk = words.slice(i, i + this.chunkSize).join(' ');
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  // Smart chunking by paragraph
  smartChunk(text: string): string[] {
    const paragraphs = text.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const para of paragraphs) {
      if ((currentChunk + para).split(' ').length > this.chunkSize) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = para;
      } else {
        currentChunk += '\n\n' + para;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }
}
```

### 2. Metadata Filtering

```typescript
// Use metadata for multi-tenancy
const response = await env.AI.autorag(AUTORAG_NAME).aiSearch({
  query: userQuery,
  filters: {
    tenant_id: request.headers.get('X-Tenant-ID'),
    visibility: 'public',
    language: 'en'
  }
});
```

### 3. Caching Strategy

```typescript
// Implement similarity-based caching
class RAGCache {
  constructor(private kv: KVNamespace) {}
  
  async get(query: string): Promise<CachedResponse | null> {
    // Generate cache key from normalized query
    const key = await this.generateCacheKey(query);
    const cached = await this.kv.get(key, 'json');
    
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached;
    }
    
    return null;
  }
  
  async set(query: string, response: any) {
    const key = await this.generateCacheKey(query);
    await this.kv.put(key, JSON.stringify({
      response,
      timestamp: Date.now()
    }), {
      expirationTtl: 3600 // 1 hour
    });
  }
  
  private async generateCacheKey(query: string): Promise<string> {
    // Normalize and hash query for cache key
    const normalized = query.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }
}
```

### 4. System Prompts

```typescript
const SYSTEM_PROMPTS = {
  product_assistant: `You are a helpful product assistant. 
    Rules:
    1. Only answer based on provided context
    2. If unsure, say "I don't have that information"
    3. Always cite sources when available
    4. Be concise but thorough`,
  
  technical_support: `You are a technical support specialist.
    Guidelines:
    1. Provide step-by-step solutions
    2. Include relevant documentation links
    3. Suggest alternatives if main solution doesn't work
    4. Be patient and clear in explanations`,
  
  creative_writer: `You are a creative content assistant.
    Style:
    1. Use engaging, conversational tone
    2. Include relevant examples
    3. Maintain brand voice consistency
    4. Balance creativity with accuracy`
};
```

### 5. Error Handling

```typescript
class RAGErrorHandler {
  async query(request: Request, env: Env): Promise<Response> {
    try {
      const response = await env.AI.autorag(AUTORAG_NAME).aiSearch({
        query: request.query,
        // Implement timeout
        signal: AbortSignal.timeout(30000)
      });
      
      return Response.json({ success: true, ...response });
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return Response.json(
          { error: 'Request timeout' },
          { status: 504 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return Response.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      
      // Fallback to simple search
      try {
        const fallback = await this.simpleFallback(request.query, env);
        return Response.json({ 
          success: true, 
          fallback: true,
          ...fallback 
        });
      } catch (fallbackError) {
        return Response.json(
          { error: 'Service unavailable' },
          { status: 503 }
        );
      }
    }
  }
  
  private async simpleFallback(query: string, env: Env) {
    // Implement basic keyword search as fallback
    const results = await env.DB.prepare(
      'SELECT * FROM documents WHERE content LIKE ? LIMIT 5'
    ).bind(`%${query}%`).all();
    
    return { results };
  }
}
```

### 6. Monitoring and Analytics

```typescript
// Track RAG performance
class RAGAnalytics {
  async trackQuery(
    query: string, 
    response: any,
    latency: number,
    env: Env
  ) {
    await env.ANALYTICS_QUEUE.send({
      type: 'rag_query',
      timestamp: Date.now(),
      query: query.substring(0, 100), // Truncate for privacy
      response_length: response.response?.length,
      sources_count: response.results?.length,
      latency,
      cache_hit: response.cached || false
    });
  }
  
  async trackError(error: Error, context: any, env: Env) {
    await env.ANALYTICS_QUEUE.send({
      type: 'rag_error',
      timestamp: Date.now(),
      error: error.message,
      context
    });
  }
}
```

---

## Code Examples

### Complete RAG Worker Example

```typescript
// src/rag-worker.ts
import { AutoRouter } from 'itty-router';

interface Env {
  AI: any;
  DOCUMENT_BUCKET: R2Bucket;
  DB: D1Database;
  KV: KVNamespace;
  AUTORAG_NAME: string;
}

const router = AutoRouter();

// Middleware for authentication
const authenticate = async (request: Request) => {
  const token = request.headers.get('Authorization');
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Validate token
};

// Health check
router.get('/health', () => Response.json({ status: 'healthy' }));

// Main chat endpoint
router.post('/api/chat', authenticate, async (request, env: Env) => {
  const startTime = Date.now();
  
  try {
    const { 
      query, 
      conversationId,
      filters = {},
      stream = false 
    } = await request.json();
    
    // Get conversation history from KV
    const history = await env.KV.get(
      `conversation:${conversationId}`,
      'json'
    ) || [];
    
    // Build context
    const context = history
      .slice(-10)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    // Query AutoRAG
    const response = await env.AI.autorag(env.AUTORAG_NAME).aiSearch({
      query: context ? `${context}\n\nuser: ${query}` : query,
      model: "@cf/openai/gpt-oss-120b",
      rewrite_query: true,
      max_num_results: 5,
      filters,
      stream
    });
    
    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: 'user', content: query },
      { role: 'assistant', content: response.response }
    ];
    
    await env.KV.put(
      `conversation:${conversationId}`,
      JSON.stringify(updatedHistory),
      { expirationTtl: 3600 }
    );
    
    // Track analytics
    const latency = Date.now() - startTime;
    
    return Response.json({
      success: true,
      response: response.response,
      sources: response.results,
      conversationId,
      latency
    });
    
  } catch (error) {
    console.error('RAG Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Document upload endpoint
router.post('/api/documents', authenticate, async (request, env: Env) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return Response.json(
      { error: 'No file provided' },
      { status: 400 }
    );
  }
  
  // Process and store document
  const content = await file.text();
  const metadata = {
    filename: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString()
  };
  
  // Store in R2 for AutoRAG indexing
  const key = `documents/${Date.now()}_${file.name}`;
  await env.DOCUMENT_BUCKET.put(key, content, {
    customMetadata: metadata
  });
  
  // Store metadata in D1
  await env.DB.prepare(
    'INSERT INTO documents (key, filename, type, size, uploaded_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    key,
    file.name,
    file.type,
    file.size,
    metadata.uploadedAt
  ).run();
  
  return Response.json({
    success: true,
    key,
    metadata
  });
});

// Search endpoint (without generation)
router.get('/api/search', async (request, env: Env) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  
  if (!query) {
    return Response.json(
      { error: 'Query parameter required' },
      { status: 400 }
    );
  }
  
  const results = await env.AI.autorag(env.AUTORAG_NAME).search({
    query,
    max_num_results: limit,
    rewrite_query: true
  });
  
  return Response.json({
    success: true,
    query,
    results
  });
});

// Delete document endpoint
router.delete('/api/documents/:key', authenticate, async (request, env: Env) => {
  const { key } = request.params;
  
  // Delete from R2
  await env.DOCUMENT_BUCKET.delete(key);
  
  // Delete from D1
  await env.DB.prepare(
    'DELETE FROM documents WHERE key = ?'
  ).bind(key).run();
  
  return Response.json({
    success: true,
    deleted: key
  });
});

export default router;
```

---

## Summary

Cloudflare's AutoRAG and LLM ecosystem provides a complete, managed solution for building RAG applications:

1. **AutoRAG** handles the complex RAG pipeline automatically
2. **Workers AI** provides powerful language models
3. **Vectorize** offers managed vector storage
4. **R2** stores your source documents
5. **Workers** orchestrate everything at the edge

This combination enables developers to build sophisticated AI applications without managing infrastructure, making it ideal for projects like Baba Is Win that require low maintenance overhead while delivering powerful AI capabilities.