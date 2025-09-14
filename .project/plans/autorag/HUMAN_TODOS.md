# Human TODOs for AutoRAG Implementation

This document contains all manual steps that need to be completed by a human to set up the AutoRAG chatbot.

## 🔐 1. Cloudflare Account Setup

### R2 Storage Setup
- [ ] Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
- [ ] Navigate to R2 → Overview
- [ ] Create a new bucket named `baba-is-win-docs`
- [ ] Go to R2 → Manage R2 API Tokens
- [ ] Create a new API token with:
  - **Permissions**: Object Read & Write
  - **TTL**: No expiration (or set as needed)
  - **IP Restrictions**: Optional for security
- [ ] Copy the credentials and save them securely:
  - Access Key ID
  - Secret Access Key
  - Endpoint URL
- [ ] Update `.r2.env` file with your credentials (already configured in this repo)

### AutoRAG Instance Setup
- [ ] Navigate to AI → AutoRAG in Cloudflare Dashboard
- [ ] Click "Create Instance"
- [ ] Configure the instance:
  - **Name**: `baba-is-win-assistant`
  - **Description**: "AI assistant for baba-is-win personal site"
  - **Model**: Select the latest available (e.g., Llama 3.1)

### Connect R2 to AutoRAG
- [ ] In your AutoRAG instance, go to Data Sources
- [ ] Click "Add Data Source"
- [ ] Select "R2 Bucket"
- [ ] Configure:
  - **Bucket**: `baba-is-win-docs`
  - **Path Prefix**: `/content/` (or leave as `/`)
  - **File Types**: `.md, .txt, .json`
  - **Auto-sync**: Enable
- [ ] Save the configuration

## 📝 2. Configure System Prompts

In the AutoRAG instance settings:

- [ ] Navigate to Settings → System Prompt
- [ ] Copy and paste this system prompt:

```
PERSONALITY:
You are Baba, a friendly and knowledgeable AI assistant for the baba-is-win website. You help visitors understand the site's content, features, and Emily's work.

CORE KNOWLEDGE:
- Personal website showcasing Emily's blog posts, thoughts, and projects
- Museum section with creative content and experiments
- Technical blog posts about programming and technology
- Personal thoughts and reflections
- Premium content system for subscribers
- Biography with different difficulty levels

RESPONSE GUIDELINES:
1. Be concise - aim for 2-3 sentences unless more detail is specifically requested
2. Be friendly but professional
3. Never reference internal files, documentation, or paths
4. Focus on helping users navigate and understand the site
5. If you don't know something, suggest where on the site they might find it
6. Mention premium content features when relevant
7. Use clear, accessible language

EXAMPLES:
Q: What is this site about?
A: This is Emily's personal website featuring her blog posts on technology and programming, personal thoughts, and creative projects in the museum section. You can explore different sections to find content that interests you.

Q: How do I access premium content?
A: Premium content is available to logged-in users. You can sign up for an account to access exclusive posts and additional features throughout the site.

Q: Tell me about the museum
A: The museum is a creative space showcasing various projects and experiments. It's regularly updated with new interactive experiences and visual content.

IMPORTANT:
- Never mention file names or paths
- Don't reference documentation structure
- Keep responses natural and conversational
```

- [ ] Save the system prompt

### Optional: Query Rewrite Prompt
- [ ] Navigate to Settings → Query Rewrite (if available)
- [ ] Add this prompt:

```
Rewrite the user's query to be more specific and searchable while preserving their intent. Focus on extracting key topics and concepts.

Examples:
- "what's new" → "latest blog posts recent updates new content"
- "how to login" → "authentication login signup account access"
- "Emily's work" → "Emily projects blog posts portfolio about biography"
```

## 📤 3. Upload Content to R2

### Install Dependencies
```bash
npm install @aws-sdk/client-s3 gray-matter dotenv
```

### Prepare Content
- [ ] Review content in `src/data/` directories
- [ ] Ensure all markdown files have proper frontmatter
- [ ] Check that `.r2.env` has correct credentials

### Run Upload Script
```bash
# First time - clear and upload all
node scripts/upload-content-to-r2.js --clear

# Subsequent updates
node scripts/upload-content-to-r2.js
```

### Verify Upload
- [ ] Check R2 bucket in Cloudflare Dashboard
- [ ] Verify file count matches expectations
- [ ] Check a few files to ensure content is correct

## 🔄 4. Trigger AutoRAG Indexing

- [ ] Go to your AutoRAG instance in Cloudflare Dashboard
- [ ] Navigate to Indexing tab
- [ ] Click "Trigger Manual Index"
- [ ] Wait for indexing to complete (usually 5-10 minutes)
- [ ] Verify document count matches R2 bucket

## 🧪 5. Test AutoRAG Instance

In the AutoRAG Dashboard:
- [ ] Go to the Test tab
- [ ] Try these test queries:
  - "What is this site about?"
  - "Tell me about Emily"
  - "What are the latest blog posts?"
  - "How do I access the museum?"
  - "What is premium content?"
- [ ] Verify responses are accurate and don't contain file references
- [ ] Check that response time is acceptable (< 2 seconds)

## 🔧 6. Configure Worker

### Update wrangler.toml
- [ ] Ensure AI binding is configured:
```toml
[ai]
binding = "AI"
```

- [ ] Add environment variables:
```toml
[vars]
AUTORAG_INSTANCE = "baba-is-win-assistant"
```

### Create KV Namespace (for rate limiting/caching)
```bash
wrangler kv:namespace create "CHAT_CACHE"
```

- [ ] Add the KV binding to wrangler.toml:
```toml
[[kv_namespaces]]
binding = "KV"
id = "your-namespace-id-here"
```

## 🚀 7. Deploy and Test

### Local Testing
```bash
# Start local development
npm run dev

# Test the chat endpoint
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"What is this site about?"}'
```

### Deploy to Production
```bash
# Deploy the worker
wrangler deploy

# Verify deployment
wrangler tail
```

## 🎨 8. Frontend Integration

- [ ] Add the ChatWidget component to your base layout
- [ ] Style the chat widget to match your site theme
- [ ] Test on mobile devices
- [ ] Ensure accessibility (keyboard navigation, screen readers)

## 📊 9. Set Up Monitoring

### Cloudflare Analytics
- [ ] Enable Workers Analytics
- [ ] Set up Web Analytics for the site
- [ ] Configure Real User Monitoring (RUM) if available

### Custom Monitoring
- [ ] Set up scheduled worker for health checks (optional)
- [ ] Configure error alerting (email/Discord/Slack)
- [ ] Create dashboard for tracking metrics

## 🔒 10. Security Configuration

### Rate Limiting
- [ ] Configure rate limiting rules in Cloudflare Dashboard
- [ ] Set appropriate limits (e.g., 10 requests/minute per IP)

### Firewall Rules
- [ ] Block known bad actors
- [ ] Configure country restrictions if needed
- [ ] Set up bot protection

## 📝 11. Documentation

- [ ] Document the API endpoint for team reference
- [ ] Create user guide for chat features
- [ ] Document troubleshooting steps
- [ ] Add chat info to site's help/FAQ section

## ✅ 12. Final Verification

- [ ] Chat widget loads on all pages
- [ ] Responses are relevant and concise
- [ ] No file paths or internal references in responses
- [ ] Rate limiting works correctly
- [ ] Mobile experience is smooth
- [ ] Error messages are user-friendly
- [ ] Performance meets targets (< 3s response time)

## 🔄 13. Ongoing Maintenance

Set up regular tasks:
- [ ] Weekly: Review chat logs for quality
- [ ] Monthly: Update system prompts based on common queries
- [ ] Monthly: Re-upload content to R2 as site updates
- [ ] Quarterly: Review AutoRAG performance metrics

## 📞 Support Contacts

- **Cloudflare Support**: https://support.cloudflare.com
- **AutoRAG Documentation**: https://developers.cloudflare.com/autorag/
- **Workers Documentation**: https://developers.cloudflare.com/workers/

## 🎯 Success Criteria

Once complete, you should have:
- ✅ AutoRAG instance connected to R2 bucket
- ✅ Content indexed and searchable
- ✅ Chat API endpoint working
- ✅ Frontend chat widget functional
- ✅ Monitoring and analytics in place
- ✅ Security measures configured

## 📌 Notes

- Keep `.r2.env` file secure and never commit it to git
- Test thoroughly before enabling for all users
- Monitor costs in Cloudflare Dashboard
- Consider A/B testing different system prompts
- Collect user feedback for continuous improvement

---

**Estimated Time**: 2-4 hours for initial setup
**Difficulty**: Medium
**Prerequisites**: Cloudflare account with AutoRAG access