import { vi } from 'vitest';

export interface MockGmailResponse {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<{ name: string; value: string }>;
    body: { size: number; data?: string };
  };
  sizeEstimate: number;
}

export class MockGmailAPI {
  private static messageId = 0;
  private static failureRate = 0;
  private static latency = 0;
  
  static setFailureRate(rate: number) {
    this.failureRate = rate;
  }
  
  static setLatency(ms: number) {
    this.latency = ms;
  }
  
  static async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string,
    headers?: Record<string, string>
  ): Promise<string> {
    // Simulate network latency
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }
    
    // Simulate failures based on failure rate
    if (Math.random() < this.failureRate) {
      throw new Error('Gmail API Error: Rate limit exceeded');
    }
    
    // Validate inputs
    if (!to || !subject || (!htmlContent && !textContent)) {
      throw new Error('Gmail API Error: Invalid email parameters');
    }
    
    // Generate mock message ID
    const messageId = `gmail-message-${++this.messageId}-${Date.now()}`;
    
    // Log the email for debugging
    console.log('MockGmailAPI: Sending email', {
      to,
      subject,
      messageId,
      headers,
      htmlLength: htmlContent?.length || 0,
      textLength: textContent?.length || 0
    });
    
    return messageId;
  }
  
  static async getMessageById(messageId: string): Promise<MockGmailResponse> {
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }
    
    return {
      id: messageId,
      threadId: `thread-${messageId}`,
      labelIds: ['SENT'],
      snippet: 'Mock email snippet',
      historyId: `history-${Date.now()}`,
      internalDate: Date.now().toString(),
      payload: {
        partId: '',
        mimeType: 'multipart/alternative',
        filename: '',
        headers: [
          { name: 'To', value: 'test@example.com' },
          { name: 'Subject', value: 'Test Subject' },
          { name: 'From', value: 'sender@example.com' }
        ],
        body: { size: 1234 }
      },
      sizeEstimate: 1234
    };
  }
  
  static async listMessages(query?: string): Promise<MockGmailResponse[]> {
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }
    
    // Return mock messages
    return [
      await this.getMessageById('mock-message-1'),
      await this.getMessageById('mock-message-2')
    ];
  }
  
  static reset() {
    this.messageId = 0;
    this.failureRate = 0;
    this.latency = 0;
  }
}

export const createGmailMock = () => {
  return {
    sendEmail: vi.fn().mockImplementation(MockGmailAPI.sendEmail.bind(MockGmailAPI)),
    getMessageById: vi.fn().mockImplementation(MockGmailAPI.getMessageById.bind(MockGmailAPI)),
    listMessages: vi.fn().mockImplementation(MockGmailAPI.listMessages.bind(MockGmailAPI)),
    setFailureRate: MockGmailAPI.setFailureRate.bind(MockGmailAPI),
    setLatency: MockGmailAPI.setLatency.bind(MockGmailAPI),
    reset: MockGmailAPI.reset.bind(MockGmailAPI)
  };
};