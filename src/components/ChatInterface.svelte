<script>
  import { onMount, afterUpdate } from 'svelte';

  let query = '';
  let messages = [];
  let isLoading = false;
  let inputElement;
  let messagesContainer;

  const sendMessage = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    query = '';

    // Add user message
    messages = [...messages, {
      id: Date.now(),
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
          id: Date.now(),
          type: 'assistant',
          text: data.answer,
          sources: data.sources,
          suggestions: data.suggestions,
          confidence: data.confidence,
          timestamp: new Date()
        }];
      } else {
        // Add error message
        messages = [...messages, {
          id: Date.now(),
          type: 'error',
          text: data.message || 'Sorry, something went wrong. Please try again.',
          timestamp: new Date()
        }];
      }
    } catch (error) {
      console.error('Chat error:', error);
      messages = [...messages, {
        id: Date.now(),
        type: 'error',
        text: 'Unable to connect to the chat service. Please try again later.',
        timestamp: new Date()
      }];
    } finally {
      isLoading = false;
      // Focus back on input
      setTimeout(() => inputElement?.focus(), 100);
    }
  };

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const useSuggestion = (suggestion) => {
    query = suggestion;
    sendMessage();
  };

  const scrollToBottom = () => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  const renderMarkdown = (text) => {
    // Basic markdown renderer with regex
    let html = text;

    // Escape HTML first
    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Hyperlinks [text](url) - process before other markdown
    html = html.replace(/\[([^\]]+?)\]\(([^\)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#66a3b3;text-decoration:underline">$1</a>');

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text* (simpler pattern to avoid conflicts)
    html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

    // Code with backticks
    html = html.replace(/`([^`]+?)`/g, '<code style="background:rgba(200,200,200,0.15);padding:2px 4px;font-family:\'SF Mono\',monospace;color:#00d030">$1</code>');

    // Headers - using gim flags like cool-scripts
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:1.1em;margin-top:0.5em;color:#ffb366">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:1.2em;margin-top:0.5em;color:#ff9933">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size:1.3em;margin-top:0.5em;color:#e68000">$1</h1>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  onMount(() => {
    // Add initial greeting
    messages = [{
      id: Date.now(),
      type: 'assistant',
      text: "Hi! Would you like to ask a question? No? Well too bad",
      suggestions: [
        "What is this site about?",
        "Tell me about Emily - who is she???",
        "What are the latest blog posts?",
        "How do I get Emily to date me?"
      ],
      timestamp: new Date()
    }];

    // Focus input on mount
    inputElement?.focus();
  });

  afterUpdate(() => {
    scrollToBottom();
  });
</script>

<style>
  .chat-interface {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: 'Fira Sans', sans-serif;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.2);
  }

  .message {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message-bubble {
    max-width: 70%;
    word-wrap: break-word;
  }

  .message.user .message-bubble {
    margin-left: auto;
    background: linear-gradient(135deg, #548e9b 0%, #4a7c87 100%);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 18px 18px 4px 18px;
    box-shadow: 0 2px 10px rgba(84, 142, 155, 0.3);
  }

  .message.assistant .message-bubble {
    background: rgba(255, 179, 102, 0.05);
    color: #fff;
    padding: 0.75rem 1rem;
    border-radius: 18px 18px 18px 4px;
    border: 1px solid rgba(255, 179, 102, 0.15);
  }

  .message.error .message-bubble {
    margin: 0 auto;
    background: rgba(230, 128, 0, 0.1);
    color: #ff9933;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    text-align: center;
    border: 1px solid rgba(230, 128, 0, 0.3);
  }

  .message-text {
    margin: 0;
    line-height: 1.5;
    font-family: Merriweather, serif;
  }

  .message-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    color: #ccc;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .message.user .message-meta {
    justify-content: flex-end;
  }

  .sources {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(84, 142, 155, 0.2);
  }

  .sources-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #66a3b3;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .source-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .source-link {
    color: #548e9b;
    text-decoration: none;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: color 0.2s;
  }

  .source-link:hover {
    color: #66a3b3;
    text-decoration: underline;
  }

  .relevance-badge {
    font-size: 0.625rem;
    background: rgba(84, 142, 155, 0.2);
    color: #66a3b3;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
  }

  .suggestions {
    margin-top: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .suggestion-chip {
    background: rgba(84, 142, 155, 0.1);
    border: 1px solid rgba(84, 142, 155, 0.3);
    color: #fff;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .suggestion-chip:hover {
    background: rgba(84, 142, 155, 0.2);
    border-color: #548e9b;
    transform: translateY(-1px);
  }

  .loading-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 179, 102, 0.05);
    border-radius: 18px 18px 18px 4px;
    max-width: 200px;
    border: 1px solid rgba(255, 179, 102, 0.15);
  }

  .loading-dots {
    display: flex;
    gap: 0.25rem;
  }

  .loading-dots span {
    width: 8px;
    height: 8px;
    background: #ff9933;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
  }

  .loading-dots span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .loading-dots span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .input-container {
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid rgba(255, 179, 102, 0.2);
    background: rgba(0, 0, 0, 0.3);
  }

  .input-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
  }

  .input-field {
    flex: 1;
    display: flex;
    align-items: center;
    background: rgba(200, 200, 200, 0.05);
    border: 1px solid rgba(200, 200, 200, 0.2);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    transition: all 0.2s;
  }

  .input-field:focus-within {
    background: rgba(200, 200, 200, 0.08);
    border-color: #548e9b;
    box-shadow: 0 0 0 3px rgba(84, 142, 155, 0.1);
  }

  .chat-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 0.95rem;
    color: #fff;
    resize: none;
    font-family: Merriweather, serif;
  }

  .chat-input::placeholder {
    color: #ccc;
  }

  .send-button {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #548e9b 0%, #4a7c87 100%);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 2px 10px rgba(84, 142, 155, 0.3);
  }

  .send-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(84, 142, 155, 0.4);
    background: linear-gradient(135deg, #66a3b3 0%, #548e9b 100%);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .input-hint {
    font-size: 0.75rem;
    color: #ccc;
    margin-top: 0.5rem;
    text-align: center;
  }

  @media (max-width: 640px) {
    .message-bubble {
      max-width: 85%;
    }

    .input-container {
      padding: 1rem;
    }

    .suggestions {
      flex-direction: column;
    }

    .suggestion-chip {
      width: 100%;
      text-align: center;
    }
  }
</style>

<div class="chat-interface">
  <div class="messages-container" bind:this={messagesContainer}>
    {#each messages as message (message.id)}
      <div class="message {message.type}">
        {#if message.type !== 'error'}
          <div class="message-meta">
            <span>{message.type === 'user' ? 'You' : 'Assistant'}</span>
          </div>
        {/if}

        <div class="message-bubble">
          <p class="message-text">{@html renderMarkdown(message.text)}</p>

          {#if message.sources && message.sources.length > 0}
            <div class="sources">
              <div class="sources-title">Sources:</div>
              {#each message.sources as source}
                <div class="source-item">
                  {#if source.url}
                    <a href={source.url} class="source-link" target="_blank" rel="noopener">
                      <span>📄</span>
                      {source.title}
                    </a>
                  {:else}
                    <span class="source-link">
                      <span>📄</span>
                      {source.title}
                    </span>
                  {/if}
                  {#if source.relevance}
                    <span class="relevance-badge">{source.relevance}%</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          {#if message.suggestions && message.suggestions.length > 0}
            <div class="suggestions">
              {#each message.suggestions as suggestion}
                <button
                  class="suggestion-chip"
                  on:click={() => useSuggestion(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if isLoading}
      <div class="message assistant">
        <div class="message-meta">
          <span>Assistant</span>
        </div>
        <div class="loading-message">
          <span>Thinking</span>
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="input-container">
    <div class="input-wrapper">
      <div class="input-field">
        <input
          type="text"
          class="chat-input"
          placeholder="Ask me anything..."
          bind:value={query}
          bind:this={inputElement}
          on:keydown={handleKeydown}
          disabled={isLoading}
        />
      </div>
      <button
        class="send-button"
        on:click={sendMessage}
        disabled={!query.trim() || isLoading}
        type="button"
      >
        <span>Send</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
    <div class="input-hint">Press Enter to send, Shift+Enter for new line</div>
  </div>
</div>
