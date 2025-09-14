# Step 8: Production Deployment

## Objective
Deploy the AutoRAG chatbot to production with proper monitoring, security, and performance optimization.

## Pre-Deployment Checklist

### 8.1 Code Review
- [ ] All TypeScript/JavaScript properly typed
- [ ] No console.log statements in production code
- [ ] Error handling implemented throughout
- [ ] Sensitive data removed from codebase
- [ ] Dependencies up to date
- [ ] Tests passing (unit, integration, e2e)

### 8.2 Configuration Review
- [ ] Environment variables documented
- [ ] AutoRAG instance configured in production
- [ ] R2 bucket permissions set correctly
- [ ] Rate limiting configured appropriately
- [ ] CORS settings verified

### 8.3 Content Preparation
- [ ] All content uploaded to R2
- [ ] AutoRAG indexing complete
- [ ] System prompts finalized
- [ ] Test queries validated

## Deployment Steps

### 9.1 Environment Configuration

Update production environment variables:
```bash
# In Cloudflare Dashboard or wrangler.toml
[env.production]
name = "baba-is-win-production"
route = "baba-is.win/*"

[env.production.vars]
AUTORAG_INSTANCE = "baba-is-win-assistant"
ENVIRONMENT = "production"
RATE_LIMIT_PER_MINUTE = 10
CACHE_TTL = 3600

[[env.production.kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"

[env.production.ai]
binding = "AI"
```

### 9.2 Deploy Worker

```bash
# Build and deploy
npm run build
wrangler deploy --env production

# Verify deployment
wrangler tail --env production
```

### 9.3 DNS and Routing

Configure in Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Configure routes:
   - `baba-is.win/api/chat*`
   - `baba-is.win/api/v1/assistant/*`

### 9.4 Enable Cloudflare Features

- **Web Analytics**: Track usage patterns
- **Page Rules**: Cache static assets
- **Firewall Rules**: Block malicious traffic
- **Rate Limiting**: Prevent abuse
- **SSL/TLS**: Full (strict) mode

## Monitoring Setup

### 10.1 Cloudflare Analytics

Enable and configure:
- Worker Analytics
- Web Analytics
- Real User Monitoring (RUM)

### 10.2 Custom Monitoring

Create monitoring worker:
```javascript
// src/workers/monitor.js
export default {
  async scheduled(event, env, ctx) {
    // Run every 5 minutes
    await checkHealth(env);
    await collectMetrics(env);
    await alertOnIssues(env);
  }
};

async function checkHealth(env) {
  const endpoints = [
    '/api/chat',
    '/api/chat/stats'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`https://baba-is.win${endpoint}`, {
        method: endpoint === '/api/chat' ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint === '/api/chat' ? 
          JSON.stringify({ query: 'health check' }) : undefined
      });
      
      if (!response.ok) {
        await sendAlert(env, `Endpoint ${endpoint} returned ${response.status}`);
      }
    } catch (error) {
      await sendAlert(env, `Endpoint ${endpoint} is unreachable: ${error.message}`);
    }
  }
}

async function collectMetrics(env) {
  const stats = await env.KV.get('chat-stats', 'json') || {};
  
  // Store time-series data
  const timestamp = new Date().toISOString();
  const metrics = {
    timestamp,
    ...stats
  };
  
  await env.KV.put(`metrics:${timestamp}`, JSON.stringify(metrics));
  
  // Clean old metrics (keep 7 days)
  await cleanOldMetrics(env);
}
```

### 10.3 Error Tracking

Implement Sentry or similar:
```javascript
import * as Sentry from '@sentry/cloudflare';

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.ENVIRONMENT,
  tracesSampleRate: 0.1
});

// Wrap handlers
export async function onRequestPost(context) {
  return await Sentry.withIsolationScope(async () => {
    try {
      return await handleChatRequest(context);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
}
```

## Performance Optimization

### 11.1 Edge Caching

Configure caching headers:
```javascript
const cacheableResponse = new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    'CDN-Cache-Control': 'max-age=900',
    'Surrogate-Key': 'chat-response'
  }
});
```

### 11.2 Response Compression

Enable automatic compression:
```javascript
const response = new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip'
  }
});
```

### 11.3 Smart Routing

Use Cloudflare's Smart Routing:
- Argo Smart Routing for optimal paths
- Load Balancing for multiple workers
- Geo-routing for regional optimization

## Security Hardening

### 12.1 Input Validation

```javascript
function validateInput(query) {
  // Length check
  if (query.length > 500) {
    throw new Error('Query too long');
  }
  
  // Character validation
  if (!/^[\w\s\-.,!?'"]+$/u.test(query)) {
    throw new Error('Invalid characters in query');
  }
  
  // SQL injection patterns
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/gi;
  if (sqlPatterns.test(query)) {
    throw new Error('Suspicious query pattern');
  }
  
  return true;
}
```

### 12.2 Rate Limiting Enhancement

```javascript
class EnhancedRateLimiter {
  async checkLimit(identifier, env) {
    const limits = {
      perMinute: 10,
      perHour: 100,
      perDay: 500
    };
    
    const now = Date.now();
    const windows = {
      minute: Math.floor(now / 60000),
      hour: Math.floor(now / 3600000),
      day: Math.floor(now / 86400000)
    };
    
    for (const [period, window] of Object.entries(windows)) {
      const key = `rate:${identifier}:${period}:${window}`;
      const count = await env.KV.get(key) || 0;
      
      if (count >= limits[`per${period.charAt(0).toUpperCase() + period.slice(1)}`]) {
        return { limited: true, retryAfter: this.getRetryAfter(period) };
      }
      
      await env.KV.put(key, String(parseInt(count) + 1), {
        expirationTtl: this.getTTL(period)
      });
    }
    
    return { limited: false };
  }
}
```

## Rollback Plan

### 13.1 Version Management

```bash
# Tag releases
git tag -a v1.0.0 -m "AutoRAG chatbot initial release"
git push origin v1.0.0

# Deploy specific version
wrangler deploy --env production --compatibility-date 2024-01-01

# Rollback if needed
wrangler rollback --env production
```

### 13.2 Feature Flags

```javascript
const FEATURES = {
  CHAT_ENABLED: env.FEATURE_CHAT_ENABLED === 'true',
  CACHE_RESPONSES: env.FEATURE_CACHE === 'true',
  ENHANCED_LOGGING: env.FEATURE_LOGGING === 'true'
};

if (!FEATURES.CHAT_ENABLED) {
  return new Response('Chat temporarily unavailable', { status: 503 });
}
```

## Post-Deployment

### 14.1 Verification Tests

Run smoke tests:
```bash
# Test chat endpoint
curl -X POST https://baba-is.win/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"What is this site about?"}'

# Check health
curl https://baba-is.win/api/chat/stats

# Verify caching
curl -I https://baba-is.win/api/chat
```

### 14.2 Performance Monitoring

Monitor key metrics:
- Response time (target: < 2s p95)
- Success rate (target: > 99%)
- Cache hit ratio (target: > 30%)
- Error rate (target: < 1%)

### 14.3 User Feedback

Implement feedback collection:
```javascript
// Add to chat response
{
  answer: "...",
  feedbackId: generateId(),
  feedbackPrompt: "Was this helpful?"
}

// Feedback endpoint
export async function onRequestPost({ request, env }) {
  const { feedbackId, helpful, comment } = await request.json();
  
  await env.KV.put(`feedback:${feedbackId}`, JSON.stringify({
    helpful,
    comment,
    timestamp: Date.now()
  }));
  
  return new Response('Thank you for your feedback!');
}
```

## Maintenance Schedule

### Weekly
- Review error logs
- Check response quality metrics
- Update content in R2 if needed

### Monthly
- Review and optimize system prompts
- Analyze user query patterns
- Update documentation
- Performance review

### Quarterly
- Security audit
- Dependency updates
- Cost optimization review
- Feature planning

## Success Metrics

Track these KPIs:
1. **User Engagement**: Daily active users, messages per session
2. **Response Quality**: Confidence scores, feedback ratings
3. **Performance**: Response time, uptime
4. **Business Impact**: Support ticket reduction, user satisfaction

## Documentation

Update documentation:
- [ ] API documentation
- [ ] User guide
- [ ] Admin guide
- [ ] Troubleshooting guide
- [ ] Architecture diagram

## Next Steps
→ Proceed to [HUMAN_TODOS.md](./HUMAN_TODOS.md) for manual setup tasks