// Test setup file - runs before all tests
import { TextEncoder, TextDecoder } from 'util';

// Mock Web APIs that aren't available in Node.js
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock btoa and atob for Node.js
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      importKey: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
    },
  },
});

// Mock fetch for testing
global.fetch = jest.fn();

// Mock Request/Response for testing
global.Request = class MockRequest {
  url: string;
  method: string;
  headers: Headers;
  
  constructor(url: string, init?: RequestInit) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
  }
} as any;

global.Response = class MockResponse {
  status: number;
  statusText: string;
  headers: Headers;
  
  constructor(body?: BodyInit, init?: ResponseInit) {
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Headers(init?.headers);
  }
  
  json() {
    return Promise.resolve({});
  }
  
  text() {
    return Promise.resolve('');
  }
} as any;

// Mock Headers
global.Headers = class MockHeaders {
  private headers: Map<string, string> = new Map();
  
  constructor(init?: HeadersInit) {
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.headers.set(key.toLowerCase(), value));
      } else if (init instanceof Headers) {
        // Copy from another Headers instance
        init.forEach((value, key) => this.headers.set(key.toLowerCase(), value));
      } else if (typeof init === 'object') {
        // Object form
        Object.entries(init).forEach(([key, value]) => 
          this.headers.set(key.toLowerCase(), value)
        );
      }
    }
  }
  
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
  
  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }
  
  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }
  
  delete(name: string): void {
    this.headers.delete(name.toLowerCase());
  }
  
  forEach(callback: (value: string, key: string) => void): void {
    this.headers.forEach((value, key) => callback(value, key));
  }
} as any;

// Mock URL for testing
global.URL = class MockURL {
  href: string;
  origin: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  searchParams: URLSearchParams;
  
  constructor(url: string, base?: string) {
    this.href = url;
    // Simple mock - in real tests you'd want more complete URL parsing
    const parts = url.split('?');
    this.pathname = parts[0];
    this.search = parts[1] ? '?' + parts[1] : '';
    this.searchParams = new URLSearchParams(parts[1] || '');
    this.origin = 'https://example.com';
    this.protocol = 'https:';
    this.hostname = 'example.com';
    this.port = '';
    this.hash = '';
  }
} as any;

// Mock URLSearchParams
global.URLSearchParams = class MockURLSearchParams {
  private params: Map<string, string> = new Map();
  
  constructor(init?: string | URLSearchParams | Record<string, string>) {
    if (typeof init === 'string') {
      const pairs = init.split('&');
      pairs.forEach(pair => {
        const [key, value = ''] = pair.split('=');
        if (key) {
          try {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value));
          } catch (e) {
            // If decoding fails, use the original value
            this.params.set(key, value);
          }
        }
      });
    } else if (init instanceof URLSearchParams) {
      init.forEach((value, key) => this.params.set(key, value));
    } else if (init && typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => this.params.set(key, value));
    }
  }
  
  get(name: string): string | null {
    return this.params.get(name) || null;
  }
  
  set(name: string, value: string): void {
    this.params.set(name, value);
  }
  
  has(name: string): boolean {
    return this.params.has(name);
  }
  
  delete(name: string): void {
    this.params.delete(name);
  }
  
  forEach(callback: (value: string, key: string) => void): void {
    this.params.forEach((value, key) => callback(value, key));
  }
  
  toString(): string {
    const pairs: string[] = [];
    this.params.forEach((value, key) => {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    });
    return pairs.join('&');
  }
} as any;

// Set up console to be less noisy during tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};