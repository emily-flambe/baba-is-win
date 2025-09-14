<script>
  import { onMount } from 'svelte';

  let isOpen = false;
  let query = '';
  let messages = [];
  let isLoading = false;
  let inputElement;

  const toggleChat = () => {
    isOpen = !isOpen;
    if (isOpen && inputElement) {
      setTimeout(() => inputElement?.focus(), 100);
    }
  };

  const sendMessage = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    query = '';

    // Add user message
    messages = [...messages, {
      type: 'user',
      text: userMessage,
      timestamp: new Date()
    }];

    isLoading = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: userMessage })
      });

      const data = await response.json();

      if (response.ok) {
        // Add assistant response
        messages = [...messages, {
          type: 'assistant',
          text: data.answer,
          sources: data.sources,
          confidence: data.confidence,
          timestamp: new Date()
        }];
      } else {
        // Add error message
        messages = [...messages, {
          type: 'error',
          text: data.message || 'Sorry, something went wrong. Please try again.',
          timestamp: new Date()
        }];
      }
    } catch (error) {
      console.error('Chat error:', error);
      messages = [...messages, {
        type: 'error',
        text: 'Unable to connect to the chat service. Please try again later.',
        timestamp: new Date()
      }];
    } finally {
      isLoading = false;
    }
  };

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  onMount(() => {
    // Add initial greeting
    messages = [{
      type: 'assistant',
      text: 'Hi! I can help you learn about Emily and explore the content on this site. What would you like to know?',
      timestamp: new Date()
    }];
  });
</script>

<style>
  .chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .chat-button {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }

  .chat-button:hover {
    transform: scale(1.05);
  }

  .chat-container {
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 380px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chat-title {
    font-weight: 600;
    font-size: 16px;
  }

  .close-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 24px;
    line-height: 1;
    padding: 0;
    width: 30px;
    height: 30px;
  }

  .messages-container {
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
    background: #f3f4f6;
    padding: 10px 14px;
    border-radius: 18px 18px 4px 18px;
  }

  .message.assistant {
    align-self: flex-start;
    background: #e0e7ff;
    padding: 10px 14px;
    border-radius: 18px 18px 18px 4px;
  }

  .message.error {
    align-self: center;
    background: #fee2e2;
    color: #dc2626;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 14px;
  }

  .message-text {
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }

  /* Style markdown elements within messages */
  .message-text :global(strong) {
    font-weight: 600;
    color: inherit;
  }

  .message-text :global(em) {
    font-style: italic;
    color: inherit;
  }

  .message-text :global(code) {
    background-color: #f3f4f6;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.9em;
    font-family: monospace;
  }

  .message.assistant .message-text :global(code) {
    background-color: rgba(99, 102, 241, 0.1);
  }

  .sources {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #c7d2fe;
    font-size: 12px;
  }

  .source-link {
    color: #6366f1;
    text-decoration: none;
    display: block;
    margin-top: 4px;
  }

  .source-link:hover {
    text-decoration: underline;
  }

  .input-container {
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 8px;
  }

  .chat-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 24px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .chat-input:focus {
    border-color: #6366f1;
  }

  .send-button {
    padding: 10px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 24px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.2s;
  }

  .send-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-dots {
    display: inline-block;
  }

  .loading-dots::after {
    content: '...';
    animation: dots 1.5s steps(4, end) infinite;
  }

  @keyframes dots {
    0%, 20% {
      content: '.';
    }
    40% {
      content: '..';
    }
    60%, 100% {
      content: '...';
    }
  }

  @media (max-width: 640px) {
    .chat-container {
      width: 100vw;
      height: 100vh;
      bottom: 0;
      right: 0;
      border-radius: 0;
    }

    .chat-button {
      bottom: 10px;
      right: 10px;
    }
  }
</style>

<div class="chat-widget">
  {#if isOpen}
    <div class="chat-container">
      <div class="chat-header">
        <div class="chat-title">Chat with Emily's Site</div>
        <button class="close-button" on:click={toggleChat} aria-label="Close chat">
          ×
        </button>
      </div>

      <div class="messages-container">
        {#each messages as message}
          <div class="message {message.type}">
            <p class="message-text">{@html message.text}</p>

            {#if message.sources && message.sources.length > 0}
              <div class="sources">
                <strong>Sources:</strong>
                {#each message.sources as source}
                  {#if source.url}
                    <a href={source.url} class="source-link" target="_blank" rel="noopener">
                      {source.title}
                    </a>
                  {:else}
                    <span class="source-link">{source.title}</span>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>
        {/each}

        {#if isLoading}
          <div class="message assistant">
            <p class="message-text">
              <span class="loading-dots">Thinking</span>
            </p>
          </div>
        {/if}
      </div>

      <div class="input-container">
        <input
          type="text"
          class="chat-input"
          placeholder="Ask me anything..."
          bind:value={query}
          bind:this={inputElement}
          on:keydown={handleKeydown}
          disabled={isLoading}
        />
        <button
          class="send-button"
          on:click={sendMessage}
          disabled={!query.trim() || isLoading}
        >
          Send
        </button>
      </div>
    </div>
  {/if}

  <button class="chat-button" on:click={toggleChat} aria-label="Open chat">
    {#if isOpen}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    {:else}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    {/if}
  </button>
</div>