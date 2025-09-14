# Phase 3: Integration Development for Baba Is Win

## Objective
Build the chatbot interface and API endpoints with AutoRAG bindings, integrating with the existing authentication system and website design.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Chat UI    │────▶│  API Worker  │────▶│  AutoRAG    │
│  (Svelte)   │◀────│  Endpoint    │◀────│  Instance   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │     Auth     │
                    │   Checking   │
                    └──────────────┘
```

## Implementation Tasks

### 1. API Endpoint Development

#### Main Chat Endpoint (`src/pages/api/v1/assistant/query.ts`)
```typescript
import type { APIRoute } from 'astro';

// Rate limiting store (consider using Durable Objects for production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For') ||
                     'anonymous';

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please wait a moment before trying again.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request
    const { query, sessionId, context } = await request.json();

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({
        error: 'Query is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check authentication for premium content queries
    const user = locals.user;
    const isPremiumUser = user?.subscription === 'premium';

    // Clean and validate query
    const cleanedQuery = sanitizeQuery(query);

    if (cleanedQuery.length > 500) {
      return new Response(JSON.stringify({
        error: 'Query too long. Please keep it under 500 characters.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add context based on authentication
    const enhancedQuery = isPremiumUser
      ? cleanedQuery
      : `${cleanedQuery} (public content only)`;

    // Call AutoRAG
    const runtime = (locals as any).runtime;
    const env = runtime.env;

    const ragResponse = await env.AI
      .autorag(env.AUTORAG_INSTANCE_NAME)
      .aiSearch({
        query: enhancedQuery,
        rewrite_query: true,
        max_num_results: 5,
        user_id: user?.id || sessionId || 'anonymous',
        metadata: {
          premium_access: isPremiumUser,
          source: 'web_chat'
        }
      });

    // Process response
    const processedResponse = processRAGResponse(ragResponse, isPremiumUser);

    // Log analytics (non-blocking)
    logChatAnalytics({
      query: cleanedQuery,
      userId: user?.id,
      sessionId,
      responseLength: processedResponse.answer.length,
      sourcesCount: processedResponse.sources.length,
      timestamp: new Date().toISOString()
    }).catch(console.error);

    return new Response(JSON.stringify({
      success: true,
      ...processedResponse
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat API error:', error);

    return new Response(JSON.stringify({
      error: 'An error occurred while processing your request.',
      fallback: 'Please try rephrasing your question or browse the site directly.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper functions
function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const limit = 10; // requests per minute
  const window = 60000; // 1 minute in ms

  const record = rateLimitStore.get(clientIP);

  if (!record || record.resetAt < now) {
    rateLimitStore.set(clientIP, {
      count: 1,
      resetAt: now + window
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

function sanitizeQuery(query: string): string {
  // Remove potentially harmful content
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500);   // Enforce max length
}

function processRAGResponse(ragResponse: any, isPremiumUser: boolean): any {
  // Extract answer (handle both response formats)
  let answer = ragResponse.response || ragResponse.answer || 'I couldn\'t find information about that.';

  // Clean up file references
  answer = answer
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/\b(in|from|as described in)\s+[\w\-\/]+\.(md|json)\b/gi, '') // Remove file refs
    .replace(/\s{2,}/g, ' ') // Clean extra spaces
    .trim();

  // Process sources
  const sources = (ragResponse.data || ragResponse.sources || [])
    .filter((source: any) => {
      // Filter out premium sources for non-premium users
      if (!isPremiumUser && source.metadata?.premium) {
        return false;
      }
      return true;
    })
    .map((source: any) => ({
      title: source.title || 'Untitled',
      url: source.url || '#',
      snippet: source.snippet || source.text?.substring(0, 150) || '',
      type: source.metadata?.type || 'content'
    }))
    .slice(0, 3); // Limit to 3 sources

  // Add suggestions for related content
  const suggestions = generateSuggestions(ragResponse, isPremiumUser);

  return {
    answer,
    sources,
    suggestions,
    metadata: {
      confidence: ragResponse.confidence || 0.8,
      cached: ragResponse.cached || false
    }
  };
}

function generateSuggestions(ragResponse: any, isPremiumUser: boolean): string[] {
  const suggestions = [];

  // Extract topics from response
  const topics = extractTopics(ragResponse);

  if (topics.includes('blog')) {
    suggestions.push('Check out the latest blog posts');
  }
  if (topics.includes('museum')) {
    suggestions.push('Explore the interactive museum');
  }
  if (topics.includes('biography') || topics.includes('about')) {
    suggestions.push('Learn more about Emily');
  }

  if (!isPremiumUser && suggestions.length === 0) {
    suggestions.push('Sign up for premium content access');
  }

  return suggestions.slice(0, 2);
}

function extractTopics(ragResponse: any): string[] {
  const text = JSON.stringify(ragResponse).toLowerCase();
  const topics = [];

  if (text.includes('blog')) topics.push('blog');
  if (text.includes('museum')) topics.push('museum');
  if (text.includes('thought')) topics.push('thoughts');
  if (text.includes('about') || text.includes('emily')) topics.push('about');

  return topics;
}

async function logChatAnalytics(data: any): Promise<void> {
  // Implement analytics logging
  // Could send to a queue, database, or analytics service
  console.log('Chat analytics:', data);
}
```

### 2. Chat UI Component

#### Svelte Chat Component (`src/components/chat/ChatWidget.svelte`)
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { marked } from 'marked';

  // State
  let isOpen = false;
  let messages: Message[] = [];
  let inputValue = '';
  let isLoading = false;
  let sessionId = generateSessionId();
  let error: string | null = null;

  // Types
  interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    timestamp: Date;
  }

  interface Source {
    title: string;
    url: string;
    snippet: string;
    type: string;
  }

  // Initialize with welcome message
  onMount(() => {
    messages = [{
      id: 'welcome',
      type: 'assistant',
      content: 'Hi! This is a stupid interface for you to ask questions',
      timestamp: new Date()
    }];

    // Restore chat history from sessionStorage
    const savedMessages = sessionStorage.getItem('chat-messages');
    if (savedMessages) {
      try {
        messages = JSON.parse(savedMessages);
      } catch (e) {
        console.error('Failed to restore chat history');
      }
    }
  });

  // Save messages on change
  $: if (messages.length > 0) {
    sessionStorage.setItem('chat-messages', JSON.stringify(messages));
  }

  // Functions
  function generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async function sendMessage() {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    inputValue = '';
    error = null;

    // Add user message
    messages = [...messages, {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }];

    // Start loading
    isLoading = true;

    try {
      const response = await fetch('/api/v1/assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: userMessage,
          sessionId: sessionId,
          context: {
            previousMessages: messages.slice(-3).map(m => ({
              type: m.type,
              content: m.content
            }))
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant response
      messages = [...messages, {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date()
      }];

      // Add suggestions if available
      if (data.suggestions?.length > 0) {
        setTimeout(() => {
          messages = [...messages, {
            id: `suggestion-${Date.now()}`,
            type: 'assistant',
            content: `💡 ${data.suggestions.join(' • ')}`,
            timestamp: new Date()
          }];
        }, 500);
      }

    } catch (err) {
      console.error('Chat error:', err);
      error = err.message || 'Something went wrong. Please try again.';

      messages = [...messages, {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try rephrasing your question or browse the site directly.',
        timestamp: new Date()
      }];
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    messages = [{
      id: 'welcome-new',
      type: 'assistant',
      content: 'Chat cleared. How can I help you explore the site?',
      timestamp: new Date()
    }];
    sessionStorage.removeItem('chat-messages');
  }

  function renderMarkdown(content: string): string {
    return marked(content, {
      breaks: true,
      gfm: true
    });
  }
</script>

<style>
  .chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    font-family: var(--font-family);
  }

  .chat-button {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .chat-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .chat-container {
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 380px;
    max-width: 90vw;
    height: 500px;
    max-height: 70vh;
    background: var(--color-bg);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-header {
    padding: 16px;
    background: var(--color-primary);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message {
    max-width: 80%;
    word-wrap: break-word;
  }

  .message.user {
    align-self: flex-end;
    background: var(--color-primary-light);
    color: white;
    padding: 10px 14px;
    border-radius: 18px 18px 4px 18px;
  }

  .message.assistant {
    align-self: flex-start;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    padding: 10px 14px;
    border-radius: 18px 18px 18px 4px;
  }

  .message-content :global(p) {
    margin: 0 0 8px 0;
  }

  .message-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .sources {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
  }

  .source-item {
    display: block;
    padding: 4px 0;
    color: var(--color-link);
    text-decoration: none;
    font-size: 0.9em;
  }

  .source-item:hover {
    text-decoration: underline;
  }

  .chat-input {
    padding: 16px;
    border-top: 1px solid var(--color-border);
    display: flex;
    gap: 8px;
  }

  .input-field {
    flex: 1;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 14px;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .send-button {
    padding: 10px 16px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .send-button:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-indicator {
    display: flex;
    gap: 4px;
    padding: 10px;
  }

  .loading-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-primary);
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .loading-dot:nth-child(1) { animation-delay: -0.32s; }
  .loading-dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  @media (max-width: 640px) {
    .chat-container {
      width: 100vw;
      height: 100vh;
      bottom: 0;
      right: 0;
      border-radius: 0;
      max-height: 100vh;
    }
  }
</style>

<div class="chat-widget">
  {#if !isOpen}
    <button
      class="chat-button"
      on:click={() => isOpen = true}
      aria-label="Open chat"
      transition:fade
    >
      💬
    </button>
  {/if}

  {#if isOpen}
    <div class="chat-container" transition:fly={{ y: 20, duration: 200 }}>
      <div class="chat-header">
        <h3>Chat Assistant</h3>
        <div>
          <button on:click={clearChat} aria-label="Clear chat">🔄</button>
          <button on:click={() => isOpen = false} aria-label="Close chat">✕</button>
        </div>
      </div>

      <div class="chat-messages">
        {#each messages as message}
          <div class="message {message.type}">
            <div class="message-content">
              {@html renderMarkdown(message.content)}
            </div>

            {#if message.sources?.length > 0}
              <div class="sources">
                <small>Sources:</small>
                {#each message.sources as source}
                  <a href={source.url} class="source-item" target="_blank">
                    📄 {source.title}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/each}

        {#if isLoading}
          <div class="message assistant">
            <div class="loading-indicator">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </div>
          </div>
        {/if}
      </div>

      <div class="chat-input">
        <input
          type="text"
          class="input-field"
          placeholder="Ask about blog posts, projects, or anything else..."
          bind:value={inputValue}
          on:keydown={handleKeydown}
          disabled={isLoading}
        />
        <button
          class="send-button"
          on:click={sendMessage}
          disabled={!inputValue.trim() || isLoading}
        >
          Send
        </button>
      </div>
    </div>
  {/if}
</div>
```

### 3. Integration with Existing Pages

#### Add Chat to Base Layout (`src/layouts/BaseLayout.astro`)
```astro
---
import ChatWidget from '../components/chat/ChatWidget.svelte';
// ... other imports
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- ... existing head content ... -->
  </head>
  <body>
    <!-- ... existing body content ... -->

    <!-- Add chat widget (only on client) -->
    <ChatWidget client:idle />
  </body>
</html>
```

### 4. Premium Content Handling

#### Enhanced Query Processing for Premium Users
```typescript
// src/lib/chat/premium-handler.ts
export function enhanceQueryForPremium(
  query: string,
  isPremium: boolean,
  userId?: string
): string {
  if (isPremium && userId) {
    // Add user context for personalized responses
    return `${query} [Premium user ${userId}]`;
  }

  if (!isPremium && containsPremiumKeywords(query)) {
    // Add disclaimer for non-premium users
    return `${query} (Note: Some content may require premium access)`;
  }

  return query;
}

function containsPremiumKeywords(query: string): boolean {
  const premiumKeywords = [
    'premium',
    'exclusive',
    'full article',
    'complete guide',
    'detailed'
  ];

  const lowerQuery = query.toLowerCase();
  return premiumKeywords.some(keyword => lowerQuery.includes(keyword));
}

export function filterPremiumContent(
  sources: any[],
  isPremium: boolean
): any[] {
  if (isPremium) return sources;

  return sources.filter(source => !source.metadata?.premium);
}
```

### 5. Analytics and Monitoring

#### Chat Analytics Endpoint (`src/pages/api/metrics/chat.ts`)
```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  // Check admin authentication
  const user = locals.user;
  if (!user?.isAdmin) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get metrics from your storage (example)
  const metrics = {
    totalQueries: 1234,
    uniqueUsers: 456,
    averageResponseTime: 1.8,
    popularQueries: [
      { query: 'Who is Emily?', count: 89 },
      { query: 'Latest blog posts', count: 67 },
      { query: 'Museum projects', count: 45 }
    ],
    responseQuality: {
      excellent: 78,
      good: 15,
      poor: 7
    },
    hourlyDistribution: generateHourlyData()
  };

  return new Response(JSON.stringify(metrics), {
    headers: { 'Content-Type': 'application/json' }
  });
};

function generateHourlyData() {
  // Generate sample hourly distribution
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    queries: Math.floor(Math.random() * 50)
  }));
}
```

## Testing Strategy

### Unit Tests
```typescript
// tests/chat/api.test.ts
import { describe, it, expect } from 'vitest';

describe('Chat API', () => {
  it('should validate query input', async () => {
    const response = await fetch('/api/v1/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ query: '' })
    });

    expect(response.status).toBe(400);
  });

  it('should enforce rate limiting', async () => {
    // Send multiple requests rapidly
    const promises = Array(15).fill(0).map(() =>
      fetch('/api/v1/assistant/query', {
        method: 'POST',
        body: JSON.stringify({ query: 'test' })
      })
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should clean file references from responses', async () => {
    const mockResponse = {
      response: 'As described in blog/post.md, this is the answer [link](file.md).'
    };

    const cleaned = processRAGResponse(mockResponse, false);

    expect(cleaned.answer).not.toContain('.md');
    expect(cleaned.answer).not.toContain('[link]');
  });
});
```

### Integration Tests
```typescript
// tests/chat/integration.test.ts
describe('Chat Integration', () => {
  it('should return relevant results for common queries', async () => {
    const queries = [
      'Who is Emily?',
      'What blog posts are available?',
      'Tell me about the museum'
    ];

    for (const query of queries) {
      const response = await fetch('/api/v1/assistant/query', {
        method: 'POST',
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.answer).toBeTruthy();
      expect(data.answer.length).toBeGreaterThan(50);
    }
  });
});
```

## Deployment Checklist

- [ ] API endpoint configured and tested
- [ ] Chat UI component integrated
- [ ] Rate limiting implemented
- [ ] Premium content filtering working
- [ ] Analytics tracking enabled
- [ ] Error handling comprehensive
- [ ] Mobile responsive design verified
- [ ] Accessibility features tested
- [ ] Performance optimized (<2s responses)
- [ ] Monitoring dashboard accessible

## Next Phase
Once integration is complete and tested, proceed to Phase 4: Testing & Refinement

---

*Phase Status: Ready to Implement*
*Estimated Time: 8-10 hours*
*Dependencies: Completed Phase 2*
