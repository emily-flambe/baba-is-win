# Step 2: AutoRAG Instance Setup

## Objective
Create and configure an AutoRAG instance in Cloudflare Dashboard to index R2 documents and provide AI-powered responses.

## Prerequisites
- R2 bucket created and populated with documents (Step 1)
- Cloudflare account with AutoRAG access
- Admin access to Cloudflare Dashboard

## Implementation Steps

### 2.1 Create AutoRAG Instance

#### Via Cloudflare Dashboard:
1. Navigate to AI → AutoRAG
2. Click "Create Instance"
3. Configure:
   - **Name**: `baba-is-win-assistant`
   - **Description**: "AI assistant for baba-is-win site"
   - **Model**: Latest available (e.g., Llama 3.1)

### 2.2 Connect R2 Data Source

1. In AutoRAG instance settings → Data Sources
2. Click "Add Data Source"
3. Select "R2 Bucket"
4. Configure:
   - **Bucket**: `baba-is-win-docs`
   - **Path Prefix**: `/` (or specific folder)
   - **File Types**: `.md, .txt, .json`
   - **Auto-sync**: Enable

### 2.3 Configure System Prompt

**CRITICAL**: Configure in Dashboard, not in code!

Navigate to Instance Settings → System Prompt:

```
PERSONALITY:
You are Baba, a friendly and knowledgeable AI assistant for the baba-is-win website. You help visitors understand the site's content, features, and Emily's work.

CORE KNOWLEDGE:
- Personal website showcasing Emily's blog posts, thoughts, and projects
- Museum section with creative content
- Technical blog posts about programming and technology
- Personal thoughts and reflections
- Premium content system for subscribers

RESPONSE GUIDELINES:
1. Be concise - aim for 2-3 sentences unless more detail is specifically requested
2. Be friendly but professional
3. Never reference internal files, documentation, or paths
4. Focus on helping users navigate and understand the site
5. If you don't know something, suggest where on the site they might find it
6. Mention premium content features when relevant

EXAMPLES:
Q: What is this site about?
A: This is Emily's personal website featuring her blog posts on technology and programming, personal thoughts, and creative projects in the museum section. You can explore different sections to find content that interests you.

Q: How do I access premium content?
A: Premium content is available to logged-in users. You can sign up for an account to access exclusive posts and additional features throughout the site.

Q: Tell me about the museum
A: The museum is a creative space showcasing various projects and experiments. It's regularly updated with new interactive experiences and visual content.
```

### 2.4 Configure Query Rewrite Prompt (Optional)

```
Rewrite the user's query to be more specific and searchable while preserving their intent. Focus on extracting key topics and concepts.

Examples:
- "what's new" → "latest blog posts recent updates new content"
- "how to login" → "authentication login signup account access"
- "Emily's work" → "Emily projects blog posts portfolio about"
```

### 2.5 Configure Indexing Settings

1. **Indexing Schedule**: Every 6 hours
2. **Chunk Size**: 512 tokens
3. **Overlap**: 128 tokens
4. **Embedding Model**: text-embedding-ada-002 (or latest)

### 2.6 Test Instance Configuration

#### Via Dashboard Test Interface:
1. Navigate to your AutoRAG instance
2. Use the "Test" tab
3. Try sample queries:
   - "What is this site about?"
   - "How do I access premium content?"
   - "Tell me about Emily's latest blog posts"
   - "What projects are in the museum?"

#### Expected Response Structure:
```json
{
  "response": "The actual answer text here",
  "data": [
    {
      "source": "document-name.md",
      "score": 0.95,
      "excerpt": "Relevant text excerpt..."
    }
  ],
  "metadata": {
    "query_time": 1234,
    "tokens_used": 567
  }
}
```

### 2.7 Enable Public Access

1. Instance Settings → Access Control
2. Enable "Public Access" 
3. Configure Rate Limiting:
   - 10 requests per minute per IP
   - 100 requests per hour per IP

### 2.8 Note Instance ID

Copy and save the instance ID for Worker binding:
- Format: `autorag_instance_xxxxxx`
- Will be used in wrangler.toml configuration

## Validation Checklist

- [ ] AutoRAG instance created
- [ ] R2 bucket connected as data source
- [ ] Documents successfully indexed (check count)
- [ ] System prompt configured
- [ ] Query rewrite prompt configured (optional)
- [ ] Test queries return accurate responses
- [ ] Public access enabled with rate limiting
- [ ] Instance ID documented

## Monitoring & Maintenance

### Check Indexing Status
1. Dashboard → AutoRAG → Your Instance → Indexing
2. Verify:
   - Document count matches R2 bucket
   - Last index time is recent
   - No indexing errors

### Monitor Performance
- Query latency (target: <2s)
- Token usage
- Rate limit hits
- Error rates

### Update System Prompt
1. Test new prompts in staging
2. A/B test if possible
3. Version control prompts in repo
4. Update via Dashboard

## Troubleshooting

### No Documents Indexed
- Check R2 bucket permissions
- Verify file formats (.md, .txt)
- Check path prefix configuration
- Manual re-index trigger

### Poor Response Quality
- Review system prompt
- Check document quality
- Increase max_num_results
- Enable query rewrite

### Slow Responses
- Reduce max_num_results
- Optimize document chunking
- Check instance region
- Review rate limits

### Authentication Issues
- Verify public access is enabled
- Check CORS settings
- Review Worker binding

## Next Steps
→ Proceed to [03-content-preparation.md](./03-content-preparation.md)