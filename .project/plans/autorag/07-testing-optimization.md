# Step 7: Testing & Optimization

## Objective
Thoroughly test the AutoRAG chatbot implementation and optimize for performance, accuracy, and user experience.

## Testing Strategy

### 7.1 Unit Testing

Create `tests/chat/chat-api.test.js`:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queryAutoRAG, cleanResponse, removeFileReferences } from '../../src/lib/chat';

describe('Chat API Functions', () => {
  describe('removeFileReferences', () => {
    it('should remove markdown links', () => {
      const input = 'Check [this file](path/to/file.md) for details';
      const output = removeFileReferences(input);
      expect(output).toBe('Check this file for details');
    });
    
    it('should remove file paths', () => {
      const input = 'As shown in src/components/Header.astro file';
      const output = removeFileReferences(input);
      expect(output).toBe('As shown in file');
    });
    
    it('should remove documentation references', () => {
      const input = 'This is described in the documentation thoroughly';
      const output = removeFileReferences(input);
      expect(output).toBe('This is thoroughly');
    });
  });
  
  describe('cleanResponse', () => {
    it('should extract answer from response field', () => {
      const response = { response: 'Test answer', data: [] };
      const cleaned = cleanResponse(response);
      expect(cleaned.answer).toBe('Test answer');
    });
    
    it('should handle missing response gracefully', () => {
      const response = {};
      const cleaned = cleanResponse(response);
      expect(cleaned.answer).toContain('could not find');
    });
    
    it('should truncate long responses', () => {
      const longText = 'a'.repeat(1000);
      const response = { response: longText };
      const cleaned = cleanResponse(response);
      expect(cleaned.answer.length).toBeLessThanOrEqual(500);
    });
  });
});
```

### 7.2 Integration Testing

Create `tests/chat/integration.test.js`:
```javascript
describe('AutoRAG Integration', () => {
  it('should respond to basic queries', async () => {
    const queries = [
      'What is this site about?',
      'Tell me about the museum',
      'How do I sign up?'
    ];
    
    for (const query of queries) {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.answer).toBeDefined();
      expect(data.answer.length).toBeGreaterThan(10);
    }
  });
  
  it('should handle rate limiting', async () => {
    // Send many requests quickly
    const promises = Array(15).fill(null).map(() => 
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' })
      })
    );
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});
```

### 7.3 End-to-End Testing

Create `tests/e2e/chat-flow.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Chat Widget E2E', () => {
  test('should open and close chat widget', async ({ page }) => {
    await page.goto('/');
    
    // Chat should be closed initially
    const chatContainer = page.locator('#chat-container');
    await expect(chatContainer).toBeHidden();
    
    // Click toggle to open
    await page.click('#chat-toggle');
    await expect(chatContainer).toBeVisible();
    
    // Close chat
    await page.click('#chat-close');
    await expect(chatContainer).toBeHidden();
  });
  
  test('should send message and receive response', async ({ page }) => {
    await page.goto('/');
    await page.click('#chat-toggle');
    
    // Type and send message
    await page.fill('#chat-input', 'What is this site about?');
    await page.click('.chat-send');
    
    // Wait for response
    await page.waitForSelector('.typing-indicator', { state: 'visible' });
    await page.waitForSelector('.typing-indicator', { state: 'hidden', timeout: 10000 });
    
    // Check response exists
    const messages = page.locator('.chat-message.assistant');
    const count = await messages.count();
    expect(count).toBeGreaterThan(1); // Initial greeting + response
  });
  
  test('should use suggestion chips', async ({ page }) => {
    await page.goto('/');
    await page.click('#chat-toggle');
    
    // Click suggestion chip
    await page.click('.suggestion-chip:first-child');
    
    // Check input is filled
    const inputValue = await page.inputValue('#chat-input');
    expect(inputValue).toBeTruthy();
    
    // Message should be sent automatically
    await page.waitForSelector('.typing-indicator');
  });
});
```

### 7.4 Performance Testing

Create `scripts/performance-test.js`:
```javascript
import autocannon from 'autocannon';

async function runPerformanceTest() {
  const instance = autocannon({
    url: 'http://localhost:8787/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: 'What is this site about?' }),
    connections: 10,
    duration: 30,
    pipelining: 1
  });
  
  autocannon.track(instance);
  
  instance.on('done', (results) => {
    console.log('Performance Test Results:');
    console.log(`Requests/sec: ${results.requests.average}`);
    console.log(`Latency (ms): ${results.latency.mean}`);
    console.log(`p95 Latency: ${results.latency.p95}`);
    console.log(`p99 Latency: ${results.latency.p99}`);
    
    // Assert performance requirements
    if (results.latency.p95 > 3000) {
      console.error('❌ p95 latency exceeds 3 seconds');
      process.exit(1);
    }
    
    console.log('✅ Performance test passed');
  });
}

runPerformanceTest();
```

## Optimization Strategies

### 8.1 Response Caching

Implement intelligent caching:
```javascript
class ResponseCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.ttl = 3600000; // 1 hour
  }
  
  generateKey(query) {
    // Normalize query for better cache hits
    const normalized = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }
  
  get(query) {
    const key = this.generateKey(query);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.response;
    }
    
    return null;
  }
  
  set(query, response) {
    const key = this.generateKey(query);
    
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
  }
}
```

### 8.2 Query Optimization

```javascript
class QueryOptimizer {
  optimize(query) {
    // Remove common stop words for better matching
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an'];
    
    // Expand common abbreviations
    const abbreviations = {
      'whats': 'what is',
      'hows': 'how is',
      'im': 'I am',
      'dont': 'do not'
    };
    
    let optimized = query.toLowerCase();
    
    // Expand abbreviations
    Object.entries(abbreviations).forEach(([abbr, full]) => {
      optimized = optimized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
    });
    
    // Add context if query is too short
    if (optimized.split(' ').length < 3) {
      optimized = `Tell me about ${optimized}`;
    }
    
    return optimized;
  }
  
  detectIntent(query) {
    const intents = {
      navigation: /where|find|locate|navigate/i,
      information: /what|who|when|why|how|tell me/i,
      action: /sign up|log in|subscribe|download/i,
      help: /help|support|issue|problem/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(query)) {
        return intent;
      }
    }
    
    return 'general';
  }
}
```

### 8.3 Response Quality Monitoring

```javascript
class QualityMonitor {
  constructor() {
    this.metrics = {
      totalQueries: 0,
      successfulResponses: 0,
      averageResponseTime: 0,
      averageConfidence: 0,
      failureReasons: {}
    };
  }
  
  trackQuery(query, response, responseTime) {
    this.metrics.totalQueries++;
    
    if (response.answer && response.answer.length > 20) {
      this.metrics.successfulResponses++;
    }
    
    // Update rolling averages
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalQueries - 1) + responseTime) / 
      this.metrics.totalQueries;
    
    const confidence = this.calculateConfidence(response);
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (this.metrics.totalQueries - 1) + confidence) / 
      this.metrics.totalQueries;
    
    // Track low quality responses
    if (confidence < 0.5) {
      this.logLowQualityResponse(query, response);
    }
  }
  
  calculateConfidence(response) {
    let score = 0;
    
    // Length check
    if (response.answer.length > 50) score += 0.3;
    if (response.answer.length > 100) score += 0.2;
    
    // Sources check
    if (response.sources && response.sources.length > 0) score += 0.3;
    
    // No error indicators
    if (!response.answer.includes('I don\'t know')) score += 0.1;
    if (!response.answer.includes('error')) score += 0.1;
    
    return Math.min(score, 1);
  }
  
  getReport() {
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulResponses / this.metrics.totalQueries) * 100,
      healthScore: this.calculateHealthScore()
    };
  }
  
  calculateHealthScore() {
    const factors = [
      this.metrics.successfulResponses / this.metrics.totalQueries,
      Math.min(3000 / this.metrics.averageResponseTime, 1),
      this.metrics.averageConfidence
    ];
    
    return factors.reduce((a, b) => a + b, 0) / factors.length;
  }
}
```

## Testing Checklist

### Functional Testing
- [ ] Chat widget opens and closes properly
- [ ] Messages send and receive correctly
- [ ] Suggestion chips work
- [ ] Rate limiting prevents abuse
- [ ] Error messages display appropriately
- [ ] Chat history persists (if enabled)
- [ ] Sources display when available
- [ ] Mobile responsive design works

### Performance Testing
- [ ] Response time < 3 seconds (p95)
- [ ] Can handle 10 concurrent users
- [ ] Caching reduces response time
- [ ] No memory leaks in long sessions
- [ ] Widget loads without blocking page

### Content Quality
- [ ] No file references in responses
- [ ] Responses are concise and relevant
- [ ] Sources link to correct pages
- [ ] Handles unknown queries gracefully
- [ ] Provides helpful suggestions

### Security Testing
- [ ] Input sanitization prevents XSS
- [ ] Rate limiting prevents DoS
- [ ] No sensitive data in responses
- [ ] CORS configured correctly
- [ ] API authentication (if required)

## Monitoring Dashboard

Create a simple monitoring endpoint:
```javascript
// src/pages/api/chat/stats.js
export async function onRequestGet({ env }) {
  const stats = await env.KV.get('chat-stats', 'json') || {};
  
  return new Response(JSON.stringify({
    ...stats,
    status: 'healthy',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Next Steps
→ Proceed to [08-deployment.md](./08-deployment.md)