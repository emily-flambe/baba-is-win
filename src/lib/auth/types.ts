export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  emailBlogUpdates?: boolean;
  emailThoughtUpdates?: boolean;
  emailAnnouncements?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface AuthRequest {
  email?: string;
  username?: string;
  password: string;
  emailBlogUpdates?: boolean;
  emailThoughtUpdates?: boolean;
  emailAnnouncements?: boolean;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  username: string;
  exp: number;
  iat: number;
}

// Email notification types
export interface EmailNotification {
  id: string;
  userId: string;
  contentType: string;
  contentId: string;
  contentTitle: string;
  contentUrl: string;
  contentExcerpt?: string;
  notificationType: string;
  status: string;
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
  emailMessageId?: string;
}

export interface CreateEmailNotificationParams {
  userId: string;
  contentType: string;
  contentId: string;
  contentTitle: string;
  contentUrl: string;
  contentExcerpt?: string;
  notificationType: string;
  scheduledFor?: number;
}

export interface EmailNotificationHistory {
  id: string;
  userId: string;
  notificationId: string;
  action: string;
  timestamp: Date;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  errorCode?: string;
  retryAttempt: number;
}

export interface CreateNotificationHistoryParams {
  userId: string;
  notificationId: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  errorCode?: string;
  retryAttempt?: number;
}

export interface ContentItem {
  id: string;
  slug: string;
  contentType: string;
  title: string;
  description?: string;
  contentPreview?: string;
  publishDate: Date;
  filePath: string;
  contentHash?: string;
  notificationSent: boolean;
  notificationCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface CreateContentItemParams {
  slug: string;
  contentType: string;
  title: string;
  description?: string;
  contentPreview?: string;
  publishDate: number;
  filePath: string;
  contentHash?: string;
  tags?: string[];
}

export interface EmailTemplate {
  id: string;
  templateName: string;
  templateType: string;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  isActive: boolean;
  version: number;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailTemplateParams {
  templateName: string;
  templateType: string;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  variables?: string[];
  createdBy?: string;
}

export interface UnsubscribeToken {
  id: string;
  userId: string;
  token: string;
  tokenType: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
}

export interface CreateUnsubscribeTokenParams {
  userId: string;
  token: string;
  tokenType: string;
  expiresAt: number;
}

export interface EmailPreferences {
  emailBlogUpdates: boolean;
  emailThoughtUpdates: boolean;
  emailAnnouncements: boolean;
  emailFrequency: string;
}

export interface EmailStatistics {
  id: string;
  dateKey: string;
  contentType: string;
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  totalUnsubscribed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailStatisticsUpdate {
  sent?: number;
  delivered?: number;
  bounced?: number;
  failed?: number;
  opened?: number;
  clicked?: number;
  unsubscribed?: number;
}