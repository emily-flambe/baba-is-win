# Step 4: Worker API Implementation

## Objective
Create a Cloudflare Worker endpoint to handle chatbot queries, integrate with AutoRAG, and process responses.

## Prerequisites
- AutoRAG instance configured (Step 2)
- Content indexed in AutoRAG (Step 3)
- Wrangler CLI configured
- Worker development environment set up

## Implementation Steps

### 4.1 Update Wrangler Configuration

Add AutoRAG binding to `wrangler.toml`:
```toml
name = "baba-is-win"
main = "src/index.js"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[vars]
AUTORAG_INSTANCE = "baba-is-win-assistant"
```

### 4.2 Create Chat API Endpoint

Create `src/pages/api/chat.js`:
```javascript
export async function onRequestPost({ request, env }) {
  try {
    // Parse request
    const { query, userId = 'anonymous', sessionId } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Query is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Rate limiting check
    const rateLimitKey = `chat:${request.headers.get('CF-Connecting-IP') || userId}`;
    const isRateLimited = await checkRateLimit(env, rateLimitKey);
    
    if (isRateLimited) {
      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please wait a moment.' 
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Query AutoRAG
    const response = await queryAutoRAG(env, query);
    
    // Process and clean response
    const cleanedResponse = cleanResponse(response);
    
    // Log analytics (optional)
    await logQuery(env, {
      query,
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      responseLength: cleanedResponse.answer.length
    });
    
    return new Response(JSON.stringify(cleanedResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'An error occurred processing your request',
      answer: 'I apologize, but I encountered an error. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function queryAutoRAG(env, query) {
  try {
    const response = await env.AI.autorag(env.AUTORAG_INSTANCE).aiSearch({
      query: query,
      max_num_results: 5,
      rewrite_query: true
    });
    
    return response;
  } catch (error) {
    console.error('AutoRAG query failed:', error);
    throw error;
  }
}

function cleanResponse(response) {
  // Extract answer from response structure
  let answer = response.response || response.answer || 'I could not find relevant information.';
  
  // Remove file references aggressively
  answer = removeFileReferences(answer);
  
  // Ensure reasonable length
  answer = truncateResponse(answer, 500);
  
  // Extract sources if available
  const sources = extractSources(response.data || response.sources || []);
  
  return {
    answer,
    sources,
    confidence: calculateConfidence(response),
    timestamp: new Date().toISOString()
  };
}

function removeFileReferences(text) {
  // Remove various file reference patterns
  return text
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove file paths
    .replace(/(?:\/[\w-]+)+\.\w+/g, '')
    .replace(/[\w-]+\.\w+/g, '')
    // Remove "as described in..." phrases
    .replace(/as (?:described|mentioned|shown|detailed) in [^,.]+[,.]?/gi, '')
    // Remove "from the documentation"
    .replace(/from (?:the )?(?:documentation|docs|file)[^,.]*[,.]?/gi, '')
    // Remove "in the X file/document"
    .replace(/in the [\w\s-]+ (?:file|document|page)[^,.]*[,.]?/gi, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateResponse(text, maxLength) {
  if (text.length <= maxLength) return text;
  
  // Truncate at sentence boundary
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  if (lastSentenceEnd > maxLength * 0.8) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  return truncated + '...';
}

function extractSources(sources) {
  return sources
    .slice(0, 3)  // Limit to top 3 sources
    .map(source => ({
      title: cleanSourceTitle(source.source || source.title || ''),
      relevance: source.score || source.relevance || 0,
      excerpt: truncateResponse(source.excerpt || '', 100)
    }))
    .filter(s => s.title);  // Remove empty sources
}

function cleanSourceTitle(title) {
  // Convert file names to readable titles
  return title
    .replace(/\.\w+$/, '')  // Remove file extension
    .replace(/[-_]/g, ' ')  // Replace separators with spaces
    .replace(/\b\w/g, l => l.toUpperCase());  // Title case
}

function calculateConfidence(response) {
  // Simple confidence calculation based on response
  if (!response.data || response.data.length === 0) return 'low';
  
  const avgScore = response.data.reduce((sum, d) => sum + (d.score || 0), 0) / response.data.length;
  
  if (avgScore > 0.8) return 'high';
  if (avgScore > 0.5) return 'medium';
  return 'low';
}
```

### 4.3 Implement Rate Limiting

Create `src/lib/rateLimit.js`:
```javascript
export async function checkRateLimit(env, key) {
  const limit = 10;  // 10 requests per minute
  const window = 60;  // 60 seconds
  
  // Use KV or Durable Objects for rate limiting
  // This is a simplified example
  const current = await env.KV.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= limit) {
    return true;  // Rate limited
  }
  
  await env.KV.put(key, String(count + 1), { 
    expirationTtl: window 
  });
  
  return false;
}
```

### 4.4 Add CORS Support

Update API to handle CORS:
```javascript
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Add CORS headers to all responses
function addCORSHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
```

### 4.5 Create Test Script

`scripts/test-chat-api.js`:
```javascript
const API_URL = 'http://localhost:8787/api/chat';

async function testChatAPI() {
  const testQueries = [
    'What is this site about?',
    'Tell me about the museum',
    'How do I access premium content?',
    'What are Emily\'s latest blog posts?',
    'Random gibberish query xyz123'
  ];
  
  for (const query of testQueries) {
    console.log(`\nTesting: "${query}"`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      console.log('Response:', data.answer);
      console.log('Sources:', data.sources?.length || 0);
      console.log('Confidence:', data.confidence);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

testChatAPI();
```

### 4.6 Error Handling & Fallbacks

Implement robust error handling:
```javascript
const FALLBACK_RESPONSES = {
  timeout: 'The request took too long. Please try again.',
  noResults: 'I couldn\'t find specific information about that. Could you rephrase your question?',
  error: 'I encountered an error. Please try again in a moment.',
  maintenance: 'The chat service is temporarily unavailable for maintenance.'
};

async function queryWithFallback(env, query) {
  try {
    // Set timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    
    const queryPromise = queryAutoRAG(env, query);
    
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    if (error.message === 'timeout') {
      return { response: FALLBACK_RESPONSES.timeout };
    }
    throw error;
  }
}
```

## Validation Checklist

- [ ] Worker endpoint created at `/api/chat`
- [ ] AutoRAG binding configured in wrangler.toml
- [ ] Rate limiting implemented
- [ ] CORS headers configured
- [ ] Response cleaning working (no file refs)
- [ ] Error handling with fallbacks
- [ ] Test script validates all scenarios
- [ ] Response time < 3 seconds
- [ ] Handles malformed requests gracefully

## Performance Optimization

### Caching Strategy
```javascript
// Cache similar queries
const cacheKey = `chat:${hashQuery(query)}`;
const cached = await env.KV.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// After successful query
await env.KV.put(cacheKey, JSON.stringify(response), {
  expirationTtl: 3600  // 1 hour cache
});
```

### Response Streaming (Future)
Consider implementing streaming responses for better UX:
```javascript
// Stream response chunks as they arrive
const stream = new TransformStream();
// Implementation details...
```

## Monitoring

### Metrics to Track
- Query volume
- Response times (p50, p95, p99)
- Error rates
- Rate limit hits
- Cache hit ratio
- User satisfaction (if feedback collected)

### Logging
```javascript
await env.ANALYTICS.writeDataPoint({
  dataset: 'chat_queries',
  point: {
    time: Date.now(),
    tags: { endpoint: 'chat' },
    fields: {
      query_length: query.length,
      response_time: responseTime,
      success: success ? 1 : 0
    }
  }
});
```

## Security Considerations

1. **Input Validation**: Sanitize and validate all inputs
2. **Rate Limiting**: Prevent abuse with IP-based limits
3. **Content Filtering**: Filter inappropriate queries
4. **Authentication**: Consider requiring auth for premium features
5. **Monitoring**: Track suspicious patterns

## Next Steps
→ Proceed to [05-response-processing.md](./05-response-processing.md)