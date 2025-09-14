# AutoRAG Chat API Test Commands

## Environment Setup

### Getting the Right API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Choose "Custom token" template
4. Set these permissions:
   - **Account** → **Account Analytics** → **Read** (for account access)
   - **Account** → **Workers AI** → **Edit**
   - **Account** → **Workers Scripts** → **Edit** (if deploying workers)
5. Set Account Resources to: Include → Your Account
6. Click "Continue to summary" → "Create Token"
7. Copy the token (starts with something like `v1.0-` or similar)

### Required Variables
```bash
# Set your Cloudflare API token (from above)
export CF_API_TOKEN="YOUR_CLOUDFLARE_API_TOKEN"

# Your account ID and RAG instance
export ACCOUNT_ID="facf6619808dc039df729531bbb26d1d"
export RAG_NAME="personal-site-rag"
```

## Direct AutoRAG API Testing

### 1. Test AutoRAG Instance Directly (Cloudflare API)
```bash
# Basic query to test if AutoRAG is working
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{
    "query": "Who is Emily?"
  }' | jq '.'
```

### 2. Test Different Query Types
```bash
# Personal information
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{
    "query": "What does Emily do?"
  }' | jq '.'

# Blog content
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{
    "query": "What has Emily written about AI?"
  }' | jq '.'

# Thoughts and opinions
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{
    "query": "What are Emily'\''s thoughts on Claude?"
  }' | jq '.'

# Museum content
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{
    "query": "Tell me about the museum"
  }' | jq '.'
```

### 3. Test AutoRAG Configuration Options
```bash
# With max results limit
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{
    "query": "What are Emily'\''s latest blog posts?",
    "max_num_results": 5
  }' | jq '.'

# With query rewriting enabled
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{
    "query": "emily interests",
    "rewrite_query": true
  }' | jq '.'
```

## Worker API Testing (Once Deployed)

### 1. Local Development Testing
```bash
# Start local worker
npm run dev

# Test chat endpoint locally
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Who is Emily?"
  }' | jq '.'

# Test with session ID
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Tell me more about her interests",
    "sessionId": "test-session-123"
  }' | jq '.'
```

### 2. Production API Testing
```bash
# Basic query to production
curl -X POST https://baba-is.win/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is this site about?"
  }' | jq '.'

# Test different query types
curl -X POST https://baba-is.win/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What has Emily written recently?"
  }' | jq '.'

# Test response fields
curl -X POST https://baba-is.win/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Tell me about Emily'\''s projects"
  }' | jq '.answer'

# Check sources
curl -X POST https://baba-is.win/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What tech does Emily use?"
  }' | jq '.sources'
```

### 3. Test Rate Limiting
```bash
# Run multiple requests quickly
for i in {1..12}; do
  echo "Request $i:"
  curl -X POST https://baba-is.win/api/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "test"}' \
    -w "\nHTTP Status: %{http_code}\n"
  sleep 0.5
done
```

### 4. Health Check
```bash
# Check API health
curl https://baba-is.win/api/chat/health

# Check stats (if implemented)
curl https://baba-is.win/api/chat/stats
```

## Expected Response Structures

### AutoRAG Direct Response
```json
{
  "result": {
    "response": "Emily is a software engineer and writer who...",
    "data": [
      {
        "source": "blog/20250627-based-and-claude-pilled.md",
        "score": 0.92,
        "excerpt": "Relevant content excerpt..."
      }
    ]
  },
  "success": true,
  "errors": [],
  "messages": []
}
```

### Worker API Response (Cleaned)
```json
{
  "answer": "Emily is a software engineer and writer who shares her thoughts on technology, AI, and personal experiences through her blog and thoughts section.",
  "sources": [
    {
      "title": "Based And Claude Pilled",
      "url": "/blog/20250627-based-and-claude-pilled",
      "relevance": 92,
      "snippet": "..."
    }
  ],
  "confidence": "high",
  "suggestions": [
    "What are Emily's latest projects?",
    "Tell me about Emily's work with AI",
    "What does Emily write about?"
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Debugging Commands

### 1. Check Response Structure
```bash
# Get raw response without jq
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"query": "test"}'
```

### 2. Check for Empty Responses
```bash
# Test with verbose output
curl -v "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"query": "Who is Emily?"}'
```

### 3. Test Query Variations
```bash
# Short query
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"query": "Emily"}' | jq '.result.response'

# Specific blog post query
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"query": "emoji linter"}' | jq '.result.data'

# Question about content
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"query": "Does Emily like opera?"}' | jq '.'
```

## Common Issues & Solutions

### No Results Returned
- Check if R2 bucket has content: `wrangler r2 object list personal-site-docs`
- Verify AutoRAG indexing completed in Cloudflare Dashboard
- Try simpler queries first

### Authentication Errors
- Ensure CF_API_TOKEN is set correctly
- Token needs "Cloudflare Workers AI:Read" permissions
- Check account ID matches your account

### Empty Responses
- AutoRAG might need re-indexing after content upload
- System prompt may need adjustment
- Try queries that directly match your content

## Test Sequence for New Setup

1. **Verify AutoRAG is accessible**
```bash
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

2. **Test basic personal query**
```bash
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "Who is Emily?"}' | jq '.result.response'
```

3. **Test content retrieval**
```bash
curl "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/autorag/rags/${RAG_NAME}/ai-search" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "What blog posts has Emily written?"}' | jq '.result'
```

4. **Test worker integration** (after implementing)
```bash
npm run dev
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Who is Emily?"}' | jq '.'
```