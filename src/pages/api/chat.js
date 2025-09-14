/**
 * Chat API endpoint for personal-site-rag AutoRAG integration
 * Using Astro API route pattern
 */

export const prerender = false;

export const POST = async ({ request, locals }) => {
  const env = locals.runtime.env;
  try {
    // Parse request body
    const body = await request.json().catch(() => null);
    
    if (!body || typeof body.query !== 'string') {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'Request body must include a "query" field'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { query, sessionId } = body;
    
    // Validate query
    if (query.trim().length === 0) {
      return new Response(JSON.stringify({
        error: 'Invalid query',
        message: 'Query cannot be empty'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (query.length > 500) {
      return new Response(JSON.stringify({
        error: 'Query too long',
        message: 'Query must be less than 500 characters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Rate limiting (simple IP-based)
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    'unknown';
    
    if (env.KV) {
      const rateLimitKey = `chat_rate:${clientIP}`;
      const currentMinute = Math.floor(Date.now() / 60000);
      const rateLimitData = await env.KV.get(rateLimitKey);
      
      let requestCount = 1;
      if (rateLimitData) {
        const parsed = JSON.parse(rateLimitData);
        if (parsed.minute === currentMinute) {
          requestCount = parsed.count + 1;
          
          // 10 requests per minute limit
          if (requestCount > 10) {
            return new Response(JSON.stringify({
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please wait a moment.',
              retry_after: 60
            }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      }
      
      // Update rate limit counter
      await env.KV.put(
        rateLimitKey,
        JSON.stringify({ minute: currentMinute, count: requestCount }),
        { expirationTtl: 120 }
      );
    }
    
    // Check if required environment variables are available
    if (!env.AUTORAG_API_TOKEN || !env.CF_ACCOUNT_ID) {
      console.error('AutoRAG configuration missing');
      return new Response(JSON.stringify({
        error: 'Service unavailable',
        message: 'Chat service is not properly configured'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get AutoRAG instance name from environment or use default
    const ragInstance = env.AUTORAG_INSTANCE || 'personal-site-rag';
    const accountId = env.CF_ACCOUNT_ID || 'facf6619808dc039df729531bbb26d1d';

    try {
      // Query AutoRAG using REST API
      const autoragUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/autorag/rags/${ragInstance}/ai-search`;

      const autoragRequest = await fetch(autoragUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.AUTORAG_API_TOKEN}`
        },
        body: JSON.stringify({
          query: query,
          max_num_results: 5,
          rewrite_query: true
        })
      });

      if (!autoragRequest.ok) {
        throw new Error(`AutoRAG API error: ${autoragRequest.status}`);
      }

      const autoragResponse = await autoragRequest.json();

      // Check if the response was successful
      if (!autoragResponse.success) {
        throw new Error('AutoRAG API returned an error');
      }

      // Extract the actual result
      const result = autoragResponse.result || {};

      // Process the response
      const answer = cleanResponse(result.response ||
                                  "I couldn't find specific information about that. Could you rephrase your question?");

      // Extract and format sources
      const sources = processSources(result.data || []);

      // Generate suggestions based on the query
      const suggestions = generateSuggestions(query);

      // Calculate confidence based on the result
      const confidence = calculateConfidence(result);
      
      return new Response(JSON.stringify({
        answer,
        sources,
        suggestions,
        confidence,
        sessionId: sessionId || generateSessionId(),
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
    } catch (autoragError) {
      console.error('AutoRAG query failed:', autoragError);
      
      // Fallback response
      return new Response(JSON.stringify({
        answer: "I'm having trouble accessing my knowledge base right now. Please try again in a moment.",
        sources: [],
        suggestions: [
          "What is this site about?",
          "Tell me about Emily",
          "What are the latest blog posts?"
        ],
        confidence: 'low',
        error: true,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('Chat API error:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Clean response by removing file references and formatting
 */
function cleanResponse(text) {
  if (!text) return '';
  
  // Remove file references aggressively (same as list-cutter)
  let cleaned = text
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove file paths
    .replace(/\/[\w\-\/]+\.\w+/g, '')
    .replace(/[\w\-]+\.\w{2,4}(?=\s|$|[.,!?])/g, '')
    // Remove "as described in..." phrases
    .replace(/as (?:described|mentioned|shown|detailed) in [^,.]+[,.]?/gi, '')
    // Remove "from the documentation"
    .replace(/from (?:the )?(?:documentation|docs|file)[^,.]*[,.]?/gi, '')
    // Remove "in the X file/document"
    .replace(/in the [\w\s\-]+ (?:file|document|page)[^,.]*[,.]?/gi, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Ensure reasonable length
  if (cleaned.length > 500) {
    const lastSentence = cleaned.substring(0, 500).lastIndexOf('.');
    if (lastSentence > 300) {
      cleaned = cleaned.substring(0, lastSentence + 1);
    } else {
      cleaned = cleaned.substring(0, 497) + '...';
    }
  }
  
  return cleaned;
}

/**
 * Process sources from AutoRAG response
 */
function processSources(sources) {
  if (!Array.isArray(sources)) return [];
  
  return sources
    .slice(0, 3) // Limit to top 3
    .map(source => {
      const filename = source.source || source.filename || '';
      const title = cleanSourceTitle(filename);
      const url = generateSourceUrl(filename);
      
      return {
        title,
        url,
        relevance: Math.round((source.score || 0) * 100),
        snippet: (source.excerpt || source.content || '').slice(0, 150) + '...'
      };
    })
    .filter(s => s.title); // Remove empty sources
}

/**
 * Clean source title from filename
 */
function cleanSourceTitle(filename) {
  if (!filename) return '';
  
  return filename
    .replace(/\.\w+$/, '') // Remove extension
    .replace(/^\d{4}-\d{2}-\d{2}-/, '') // Remove date prefix
    .split('/').pop() // Get just the filename
    .replace(/[-_]/g, ' ') // Replace separators
    .replace(/\b\w/g, l => l.toUpperCase()); // Title case
}

/**
 * Generate URL from source filename
 */
function generateSourceUrl(filename) {
  if (!filename) return null;
  
  const slug = filename.replace(/\.\w+$/, '').split('/').pop();
  
  if (filename.includes('blog')) return `/blog/${slug}`;
  if (filename.includes('thoughts')) return `/thoughts/${slug}`;
  if (filename.includes('museum')) return `/museum/${slug}`;
  if (filename.includes('about') || filename.includes('bio')) return '/bio';
  
  return null;
}

/**
 * Generate suggestions based on query
 */
function generateSuggestions(query) {
  const suggestions = [];
  
  // Topic-based suggestions
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('emily') || queryLower.includes('who')) {
    suggestions.push("What are Emily's interests?");
    suggestions.push("What has Emily written about?");
  } else if (queryLower.includes('blog') || queryLower.includes('post')) {
    suggestions.push("What are the latest blog posts?");
    suggestions.push("Tell me about Emily's writing style");
  } else if (queryLower.includes('museum')) {
    suggestions.push("What's in the museum?");
    suggestions.push("How often is the museum updated?");
  } else {
    // Default suggestions
    suggestions.push("What is this site about?");
    suggestions.push("Tell me about Emily");
    suggestions.push("What can I find here?");
  }
  
  return suggestions.slice(0, 3);
}

/**
 * Calculate confidence score
 */
function calculateConfidence(result) {
  if (!result) return 'low';

  const hasAnswer = result.response && result.response.length > 50;
  const hasSources = result.data && result.data.length > 0;
  const highScores = result.data && result.data.some(d => d.score > 0.7);

  if (hasAnswer && hasSources && highScores) return 'high';
  if (hasAnswer && hasSources) return 'medium';
  return 'low';
}

/**
 * Generate session ID
 */
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// OPTIONS handler for CORS
export const OPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
};