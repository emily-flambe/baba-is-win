# Step 6: Frontend Chat UI Implementation

## Objective
Build an intuitive, responsive chat interface for the AutoRAG-powered chatbot that integrates seamlessly with the existing Astro site.

## UI Components

### 6.1 Chat Widget Component

Create `src/components/ChatWidget.astro`:
```astro
---
// Chat widget that can be embedded on any page
---

<div id="chat-widget" class="chat-widget">
  <button id="chat-toggle" class="chat-toggle" aria-label="Open chat">
    <svg class="chat-icon" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    </svg>
    <span class="chat-badge" id="chat-badge" style="display: none;">1</span>
  </button>
  
  <div id="chat-container" class="chat-container" style="display: none;">
    <div class="chat-header">
      <h3>Baba Assistant</h3>
      <button id="chat-close" class="chat-close" aria-label="Close chat">×</button>
    </div>
    
    <div id="chat-messages" class="chat-messages">
      <div class="chat-message assistant">
        <div class="message-content">
          Hi! I'm Baba, your AI assistant. I can help you navigate the site, find content, and answer questions about Emily's work. How can I help you today?
        </div>
      </div>
    </div>
    
    <div class="chat-suggestions" id="chat-suggestions">
      <button class="suggestion-chip" data-query="What is this site about?">
        What is this site about?
      </button>
      <button class="suggestion-chip" data-query="Show me recent blog posts">
        Recent blog posts
      </button>
      <button class="suggestion-chip" data-query="Tell me about the museum">
        About the museum
      </button>
    </div>
    
    <form id="chat-form" class="chat-input-form">
      <input 
        type="text" 
        id="chat-input" 
        class="chat-input"
        placeholder="Ask me anything..."
        maxlength="500"
        autocomplete="off"
      />
      <button type="submit" class="chat-send" aria-label="Send message">
        <svg viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </form>
    
    <div class="chat-footer">
      <span class="chat-status" id="chat-status">Ready</span>
      <button id="chat-clear" class="chat-clear-btn">Clear</button>
    </div>
  </div>
</div>

<style>
  .chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    font-family: var(--font-body);
  }
  
  .chat-toggle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: transform 0.3s, box-shadow 0.3s;
  }
  
  .chat-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }
  
  .chat-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4444;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
  }
  
  .chat-container {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 380px;
    height: 600px;
    background: var(--background);
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .chat-header {
    padding: 16px 20px;
    background: var(--accent);
    color: white;
    border-radius: 16px 16px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .chat-header h3 {
    margin: 0;
    font-size: 18px;
  }
  
  .chat-close {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .chat-message {
    display: flex;
    gap: 12px;
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .chat-message.user {
    flex-direction: row-reverse;
  }
  
  .message-content {
    max-width: 80%;
    padding: 12px 16px;
    border-radius: 12px;
    line-height: 1.5;
  }
  
  .chat-message.assistant .message-content {
    background: var(--gray-100);
    color: var(--gray-900);
  }
  
  .chat-message.user .message-content {
    background: var(--accent);
    color: white;
  }
  
  .chat-suggestions {
    padding: 12px;
    border-top: 1px solid var(--gray-200);
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    min-height: 0;
  }
  
  .suggestion-chip {
    padding: 6px 12px;
    background: var(--gray-100);
    border: 1px solid var(--gray-300);
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .suggestion-chip:hover {
    background: var(--accent);
    color: white;
    transform: translateY(-2px);
  }
  
  .chat-input-form {
    padding: 16px;
    border-top: 1px solid var(--gray-200);
    display: flex;
    gap: 8px;
  }
  
  .chat-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid var(--gray-300);
    border-radius: 24px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  
  .chat-input:focus {
    border-color: var(--accent);
  }
  
  .chat-send {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }
  
  .chat-send:hover {
    transform: scale(1.1);
  }
  
  .chat-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .chat-footer {
    padding: 8px 16px;
    border-top: 1px solid var(--gray-200);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--gray-600);
  }
  
  .chat-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .chat-status::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4caf50;
  }
  
  .chat-status.loading::before {
    background: #ff9800;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .chat-clear-btn {
    background: none;
    border: none;
    color: var(--gray-600);
    cursor: pointer;
    text-decoration: underline;
  }
  
  /* Loading animation */
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    background: var(--gray-100);
    border-radius: 12px;
    width: fit-content;
  }
  
  .typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gray-500);
    animation: typing 1.4s infinite;
  }
  
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-10px); }
  }
  
  /* Mobile responsive */
  @media (max-width: 480px) {
    .chat-container {
      width: calc(100vw - 20px);
      height: calc(100vh - 100px);
      right: 10px;
      bottom: 80px;
    }
    
    .chat-toggle {
      width: 50px;
      height: 50px;
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .chat-container {
      background: var(--gray-900);
      color: var(--gray-100);
    }
    
    .chat-message.assistant .message-content {
      background: var(--gray-800);
      color: var(--gray-100);
    }
    
    .suggestion-chip {
      background: var(--gray-800);
      border-color: var(--gray-700);
      color: var(--gray-100);
    }
    
    .chat-input {
      background: var(--gray-800);
      border-color: var(--gray-700);
      color: var(--gray-100);
    }
  }
</style>

<script>
  import { ChatClient } from '../lib/chatClient.js';
  
  // Initialize chat when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const chat = new ChatClient({
      apiUrl: '/api/chat',
      maxRetries: 3,
      persistHistory: true
    });
    
    chat.initialize();
  });
</script>
```

### 6.2 Chat Client JavaScript

Create `src/lib/chatClient.js`:
```javascript
export class ChatClient {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || '/api/chat';
    this.maxRetries = config.maxRetries || 3;
    this.persistHistory = config.persistHistory || false;
    this.history = [];
    this.isOpen = false;
    this.isLoading = false;
    
    // DOM elements
    this.elements = {};
  }
  
  initialize() {
    this.cacheElements();
    this.bindEvents();
    this.loadHistory();
    this.checkForUnreadMessages();
  }
  
  cacheElements() {
    this.elements = {
      widget: document.getElementById('chat-widget'),
      toggle: document.getElementById('chat-toggle'),
      container: document.getElementById('chat-container'),
      messages: document.getElementById('chat-messages'),
      input: document.getElementById('chat-input'),
      form: document.getElementById('chat-form'),
      close: document.getElementById('chat-close'),
      clear: document.getElementById('chat-clear'),
      status: document.getElementById('chat-status'),
      suggestions: document.getElementById('chat-suggestions'),
      badge: document.getElementById('chat-badge')
    };
  }
  
  bindEvents() {
    // Toggle chat
    this.elements.toggle.addEventListener('click', () => this.toggleChat());
    this.elements.close.addEventListener('click', () => this.closeChat());
    
    // Send message
    this.elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    // Suggestion chips
    this.elements.suggestions.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-chip')) {
        const query = e.target.dataset.query;
        this.elements.input.value = query;
        this.sendMessage();
      }
    });
    
    // Clear history
    this.elements.clear.addEventListener('click', () => this.clearHistory());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });
  }
  
  toggleChat() {
    this.isOpen = !this.isOpen;
    this.elements.container.style.display = this.isOpen ? 'flex' : 'none';
    
    if (this.isOpen) {
      this.elements.input.focus();
      this.markAsRead();
    }
  }
  
  closeChat() {
    this.isOpen = false;
    this.elements.container.style.display = 'none';
  }
  
  async sendMessage() {
    const query = this.elements.input.value.trim();
    if (!query || this.isLoading) return;
    
    // Add user message
    this.addMessage(query, 'user');
    this.elements.input.value = '';
    
    // Show loading
    this.setLoading(true);
    const typingId = this.showTypingIndicator();
    
    try {
      const response = await this.queryAPI(query);
      
      // Remove typing indicator
      this.removeTypingIndicator(typingId);
      
      // Add assistant response
      this.addMessage(response.answer, 'assistant', response);
      
      // Update suggestions if provided
      if (response.suggestions && response.suggestions.length > 0) {
        this.updateSuggestions(response.suggestions);
      }
      
    } catch (error) {
      this.removeTypingIndicator(typingId);
      this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
      console.error('Chat error:', error);
    } finally {
      this.setLoading(false);
    }
  }
  
  async queryAPI(query, retryCount = 0) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query,
          sessionId: this.getSessionId()
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limited. Please wait a moment.');
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await this.delay(1000 * Math.pow(2, retryCount));
        return this.queryAPI(query, retryCount + 1);
      }
      throw error;
    }
  }
  
  addMessage(content, sender, metadata = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    // Add sources if available
    if (metadata.sources && metadata.sources.length > 0) {
      const sourcesDiv = this.createSourcesElement(metadata.sources);
      contentDiv.appendChild(sourcesDiv);
    }
    
    messageDiv.appendChild(contentDiv);
    this.elements.messages.appendChild(messageDiv);
    
    // Scroll to bottom
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    
    // Save to history
    this.history.push({ content, sender, metadata, timestamp: Date.now() });
    if (this.persistHistory) {
      this.saveHistory();
    }
  }
  
  createSourcesElement(sources) {
    const div = document.createElement('div');
    div.className = 'message-sources';
    div.innerHTML = '<small>Sources:</small>';
    
    const list = document.createElement('ul');
    sources.forEach(source => {
      const item = document.createElement('li');
      if (source.url) {
        const link = document.createElement('a');
        link.href = source.url;
        link.textContent = source.title;
        link.target = '_blank';
        item.appendChild(link);
      } else {
        item.textContent = source.title;
      }
      list.appendChild(item);
    });
    
    div.appendChild(list);
    return div;
  }
  
  showTypingIndicator() {
    const id = `typing-${Date.now()}`;
    const indicator = document.createElement('div');
    indicator.className = 'chat-message assistant';
    indicator.id = id;
    
    indicator.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    
    this.elements.messages.appendChild(indicator);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    
    return id;
  }
  
  removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
      indicator.remove();
    }
  }
  
  updateSuggestions(suggestions) {
    this.elements.suggestions.innerHTML = '';
    
    suggestions.slice(0, 3).forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.dataset.query = suggestion;
      chip.textContent = suggestion;
      this.elements.suggestions.appendChild(chip);
    });
  }
  
  setLoading(loading) {
    this.isLoading = loading;
    this.elements.status.textContent = loading ? 'Thinking...' : 'Ready';
    this.elements.status.className = loading ? 'chat-status loading' : 'chat-status';
    this.elements.input.disabled = loading;
    this.elements.form.querySelector('button').disabled = loading;
  }
  
  getSessionId() {
    let sessionId = sessionStorage.getItem('chat-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('chat-session-id', sessionId);
    }
    return sessionId;
  }
  
  loadHistory() {
    if (!this.persistHistory) return;
    
    const saved = localStorage.getItem('chat-history');
    if (saved) {
      try {
        this.history = JSON.parse(saved);
        // Restore last few messages
        this.history.slice(-5).forEach(msg => {
          this.addMessage(msg.content, msg.sender, msg.metadata);
        });
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }
  
  saveHistory() {
    if (!this.persistHistory) return;
    
    try {
      // Keep only last 50 messages
      const toSave = this.history.slice(-50);
      localStorage.setItem('chat-history', JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }
  
  clearHistory() {
    if (confirm('Clear chat history?')) {
      this.history = [];
      this.elements.messages.innerHTML = `
        <div class="chat-message assistant">
          <div class="message-content">
            Hi! How can I help you today?
          </div>
        </div>
      `;
      
      if (this.persistHistory) {
        localStorage.removeItem('chat-history');
      }
    }
  }
  
  checkForUnreadMessages() {
    // Check if there are unread messages (from push notifications, etc.)
    const unread = localStorage.getItem('chat-unread');
    if (unread && parseInt(unread) > 0) {
      this.elements.badge.textContent = unread;
      this.elements.badge.style.display = 'flex';
    }
  }
  
  markAsRead() {
    localStorage.removeItem('chat-unread');
    this.elements.badge.style.display = 'none';
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 6.3 Integration with Existing Pages

Add chat widget to base layout:
```astro
---
// In src/layouts/BaseLayout.astro
import ChatWidget from '../components/ChatWidget.astro';
---

<html>
  <body>
    <!-- Existing content -->
    
    <!-- Add chat widget -->
    <ChatWidget />
  </body>
</html>
```

## Next Steps
→ Proceed to [07-testing-optimization.md](./07-testing-optimization.md)