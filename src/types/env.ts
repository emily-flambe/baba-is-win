export interface Env {
  // Database
  DB: D1Database;
  
  // Authentication
  JWT_SECRET: string;
  
  // Gmail OAuth2 Configuration (deprecated - using Resend now)
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_SENDER_EMAIL?: string;
  GMAIL_FROM_EMAIL?: string;
  
  // Resend Configuration
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL?: string;
  
  // Site Configuration
  SITE_URL: string;
  SITE_NAME: string;
  
  // Content Storage (optional)
  CONTENT_KV?: KVNamespace;
  
  // Cron Security
  CRON_SECRET: string;
}