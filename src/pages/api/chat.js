/**
 * Chat API endpoint for personal-site-rag AutoRAG integration
 * Using Astro API route pattern
 */

import { processSimpleMarkdown } from '../../utils/simpleMarkdown.js';

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
    const accountId = env.CF_ACCOUNT_ID;

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

      // Process the response - clean first, then apply markdown
      let cleanedResponse = cleanResponse(result.response ||
                                  "I couldn't find specific information about that. Could you rephrase your question?");

      // Replace [LINEBREAK] markers with paragraph breaks
      cleanedResponse = cleanedResponse.replace(/\[LINEBREAK\]/g, '\n\n');

      // Normalize existing line breaks - convert multiple newlines to just 2
      cleanedResponse = cleanedResponse.replace(/\n{3,}/g, '\n\n');

      const answer = processSimpleMarkdown(cleanedResponse);

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
    // Clean up extra spaces while preserving newlines
    .replace(/[^\S\n]+/g, ' ')  // Replace multiple spaces/tabs (but not newlines) with single space
    .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with just 2
    .trim();
  
  // Ensure reasonable length while preserving sentence endings
  if (cleaned.length > 500) {
    // Find the last complete sentence within 500 chars
    const lastPeriod = cleaned.substring(0, 500).lastIndexOf('.');
    const lastQuestion = cleaned.substring(0, 500).lastIndexOf('?');
    const lastExclamation = cleaned.substring(0, 500).lastIndexOf('!');

    // Get the position of the last sentence ending
    const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);

    if (lastSentence > 300) {
      // Truncate at the last complete sentence
      cleaned = cleaned.substring(0, lastSentence + 1);
    } else {
      // If no good sentence break, truncate and add ellipsis
      cleaned = cleaned.substring(0, 497) + '...';
    }
  }

  // Ensure the response ends with proper punctuation
  if (cleaned && !/[.!?]$/.test(cleaned.trim())) {
    cleaned = cleaned.trim() + '.';
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
  // Fun question pool
  const funQuestions = [
    "Who is she???",
    "What's all this about?",
    "What has Emily blogged recently?",
    "What thoughts are in her brain?",
    "How do I get Emily to date me?",
    "What's Emily's deal with cats?",
    "Does Emily have any hot takes?",
    "What makes Emily laugh?",
    "What's in the museum of weird?",
    "Tell me Emily's most controversial opinion",
    "What does Emily think about AI?",
    "Is Emily actually funny?",
    "What's Emily's biggest pet peeve?",
    "Does Emily believe in aliens?",
    "What would Emily never admit publicly?",
    "What's Emily's weirdest project?",
    "How chaotic is Emily really?",
    "What keeps Emily up at night?",
    "What's Emily's favorite conspiracy theory?",
    "Would Emily survive a zombie apocalypse?",
    "What's Emily's most unpopular opinion?",
    "Is Emily a morning person or night owl?",
    "What's Emily's secret talent?",
    "Does Emily have any nemeses?",
    "What would Emily's superpower be?",
    "What's Emily's ideal first date?",
    "How many plants has Emily killed?",
    "What's Emily's go-to karaoke song?",
    "Would Emily win in a fight?",
    "What's Emily's biggest red flag?",
    "Is Emily secretly three kids in a trenchcoat?",
    "What's Emily's most irrational fear?",
    "Does Emily actually like people?",
    "What's Emily's toxic trait?",
    "Would Emily eat the last slice of pizza?",
    "Is Emily a witch?",
    "Can Emily smell colors?",
    "How many bodies?",
    "Is Emily real?",
    "Does Emily know about the incident?",
    "What crimes has Emily committed?",
    "Is Emily watching me right now?",
    "Has Emily ever eaten a bug?",
    "Can Emily do a backflip?",
    "Is Emily secretly a robot?",
    "What's Emily hiding in the basement?",
    "Does Emily have bones?",
    "Is Emily allergic to fun?",
    "Has Emily ever fought a goose?",
    "Can Emily see through walls?",
    "Is Emily made of bees?",
    "What cursed knowledge does Emily possess?",
    "Has Emily met the void?",
    "Does Emily pay taxes?",
    "Is Emily capable of love?",
    "What did Emily do in 2019?",
    "Can Emily photosynthesize?",
    "Is Emily legally allowed in Ohio?",
    "Does Emily dream of electric sheep?",
    "Has Emily achieved enlightenment?",
    "Is Emily's mom proud of her?",
    "Can Emily speak to pigeons?",
    "What's Emily's credit score?",
    "Is Emily biodegradable?",
    "Has Emily ever been to space?",
    "Does Emily know what you did?",
    "Has anyone really been far even as decided to use even go want to do look more like?"
  ];

  // Shuffle and pick 3 random questions
  const shuffled = funQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
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