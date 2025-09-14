# AutoRAG Test Curls

Test commands for verifying AutoRAG integration and API functionality.

## Environment Variables

```bash
# Set these for production testing
export AUTORAG_API_TOKEN="OLgk8uUX1wub3DrUWjUJrZKK1Iz8BllDIp1QTHDj"
export CF_ACCOUNT_ID="facf6619808dc039df729531bbb26d1d"
export AUTORAG_INSTANCE="personal-site-rag"
```

## Local Development Testing

**Note**: The dev server now runs on a fixed port 4321 (configured in package.json)

### Basic Chat Query
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this site about?"}' \
  -s | jq '.'
```

### Query with Session ID
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Tell me about Emily",
    "sessionId": "test-session-123"
  }' \
  -s | jq '.'
```

### Test Different Queries
```bash
# About the author
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Who is Emily and what does she do?"}' \
  -s | jq '.answer'

# Blog content
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the latest blog posts?"}' \
  -s | jq '.answer'

# Museum content
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is in the museum section?"}' \
  -s | jq '.answer'

# Thoughts section
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What kind of thoughts does Emily share?"}' \
  -s | jq '.answer'
```

### Test Rate Limiting
```bash
# Send multiple requests quickly to test rate limiting (10/minute limit)
for i in {1..12}; do
  echo "Request $i:"
  curl -X POST http://localhost:4321/api/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "Test query '$i'"}' \
    -s | jq '.error // .answer' | head -1
  sleep 0.5
done
```

### Test Error Handling
```bash
# Empty query
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": ""}' \
  -s | jq '.'

# No query field
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{}' \
  -s | jq '.'

# Very long query (>500 chars)
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "'$(printf 'x%.0s' {1..501})'"}' \
  -s | jq '.error'
```

## Direct Cloudflare AutoRAG API Testing

### Test AutoRAG Directly
```bash
# Direct API call to Cloudflare AutoRAG
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/autorag/rags/${AUTORAG_INSTANCE}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTORAG_API_TOKEN}" \
  -d '{
    "query": "What is this site about?",
    "max_num_results": 5,
    "rewrite_query": true
  }' \
  -s | jq '.'
```

### Test with Different Models
```bash
# Using specific model
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/autorag/rags/${AUTORAG_INSTANCE}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTORAG_API_TOKEN}" \
  -d '{
    "query": "Tell me about Emily",
    "model": "@cf/meta/llama-3.3-70b-instruct-sd",
    "max_num_results": 10,
    "rewrite_query": false
  }' \
  -s | jq '.'
```

### Test Search Without Generation
```bash
# Search only (no AI generation)
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/autorag/rags/${AUTORAG_INSTANCE}/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTORAG_API_TOKEN}" \
  -d '{
    "query": "blog posts about technology",
    "max_num_results": 10
  }' \
  -s | jq '.data[] | {filename, score}'
```

## Production Testing

### Test Deployed Endpoint
```bash
# Replace with your production URL
PROD_URL="https://personal.emily-cogsdill.workers.dev"

curl -X POST "${PROD_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this site about?"}' \
  -s | jq '.'
```

## Response Analysis

### Check Response Structure
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Tell me about this website"}' \
  -s | jq 'keys'
# Should return: ["answer", "confidence", "sessionId", "sources", "suggestions", "timestamp"]
```

### Extract Sources
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What blog posts are available?"}' \
  -s | jq '.sources[] | {title, url, relevance}'
```

### Get Suggestions
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello"}' \
  -s | jq '.suggestions[]'
```

## Performance Testing

### Measure Response Time
```bash
time curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this site about?"}' \
  -o /dev/null -s -w "Status: %{http_code}\nTime: %{time_total}s\n"
```

### Concurrent Requests
```bash
# Test with 5 concurrent requests
for i in {1..5}; do
  (curl -X POST http://localhost:4321/api/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "Query '$i'"}' \
    -s -w "Request $i: %{time_total}s\n" -o /dev/null &)
done
wait
```

## Troubleshooting

### Verbose Output
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Test query"}' \
  -v 2>&1 | grep -E "^(< HTTP|< |{)"
```

### Check Headers
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Test"}' \
  -s -D - -o /dev/null | grep -E "^(HTTP|Content-|Cache-)"
```

## Notes

- Rate limit is 10 requests per minute per IP
- Query length limit is 500 characters
- AutoRAG may take 5-15 seconds to respond on first request
- Responses are not cached by default (Cache-Control: no-cache)
- The API supports CORS for browser-based requests