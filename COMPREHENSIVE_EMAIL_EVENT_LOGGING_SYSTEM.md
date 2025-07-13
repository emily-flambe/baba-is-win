# Comprehensive D1 Email Event Logging System

## Overview

This document describes the comprehensive email event logging system designed for the Busy Beaver email infrastructure. The system provides complete audit trails, performance monitoring, and debugging capabilities for all email operations.

## Architecture Components

### 1. Database Schema (`migrations/0011_add_email_events_system.sql`)

#### Core Tables

**`email_events`** - Main event logging table
- Captures ALL email-related operations
- Supports correlation tracking for operation chains
- Includes performance metrics and error details
- Optimized indexes for common query patterns

**`email_event_aggregates`** - Pre-computed metrics
- Daily and hourly aggregations
- Performance percentiles (P95, avg, min, max)
- Error category breakdowns
- Resource usage tracking

**`email_debug_sessions`** - Debug session management
- Groups related correlation IDs for investigation
- Tracks debugging progress and resolution
- Supports collaborative troubleshooting

### 2. Event Logger Service (`src/lib/monitoring/email-event-logger.ts`)

#### Core Features

- **Correlation Tracking**: Links related events across the entire email pipeline
- **Performance Monitoring**: Automatic timing and resource usage tracking
- **Error Classification**: Categorizes errors for targeted troubleshooting
- **Payload Sanitization**: Removes sensitive data from logs
- **Standardized Interface**: Consistent logging across all email operations

#### Event Types and Categories

**Event Types:**
- `auth` - Authentication operations
- `send` - Email sending operations
- `template` - Template rendering
- `user_lookup` - User data retrieval
- `api_request` - External API calls
- `performance` - Performance metrics

**Event Categories:**
- `attempt` - Operation started
- `success` - Operation completed successfully
- `failure` - Operation failed
- `retry` - Retry attempt
- `timeout` - Operation timed out
- `validation` - Validation result

### 3. Enhanced Services

#### Gmail Auth Enhanced (`src/lib/email/gmail-auth-enhanced.ts`)
- Logs all authentication attempts and token refreshes
- Tracks token cache performance
- Records API request/response details
- Monitors authentication failure patterns

#### Notification Service Enhanced (`src/lib/email/notification-service-enhanced.ts`)
- End-to-end email operation tracking
- Batch processing with per-notification correlation
- Template rendering event logging
- User lookup operation tracking
- Comprehensive error handling with event logging

### 4. Debug Dashboard (`src/components/admin/EmailDebugDashboard.astro`)
- Real-time performance metrics
- Recent failure analysis
- Operation trace investigation
- Event type breakdown
- Quick access to troubleshooting tools

## Implementation Guide

### 1. Database Migration

Run the migration to create the event logging tables:

```sql
-- Apply migration 0011
-- This creates email_events, email_event_aggregates, and email_debug_sessions tables
```

### 2. Service Integration

#### Basic Usage Pattern

```typescript
import { EmailEventLogger } from '../monitoring/email-event-logger';

// Create logger with correlation ID
const eventLogger = new EmailEventLogger(env, authDB);

// Start operation tracking
eventLogger.startOperation('my_operation');

try {
  // Log attempt
  await eventLogger.logAttempt('send', 'my_operation', {
    userId: 'user123',
    operationDetails: { context: 'data' }
  });
  
  // Perform operation
  const result = await performOperation();
  
  // Log success
  await eventLogger.logSuccess('send', 'my_operation', {
    operationDetails: { result: 'success' }
  });
  
} catch (error) {
  // Log failure
  await eventLogger.logFailure('send', 'my_operation', error, 'internal', {
    operationDetails: { context: 'data' }
  });
  throw error;
}
```

#### Gmail Auth Integration

```typescript
import { GmailAuthEnhanced } from './gmail-auth-enhanced';

const gmailAuth = new GmailAuthEnhanced(env, authDB, correlationId);

// All auth operations are automatically logged
const messageId = await gmailAuth.sendEmail(
  'recipient@example.com',
  'Subject',
  htmlContent,
  textContent
);
```

#### Notification Service Integration

```typescript
import { EmailNotificationServiceEnhanced } from './notification-service-enhanced';

const notificationService = new EmailNotificationServiceEnhanced(env, authDB);

// Full operation chain logging
await notificationService.sendBlogNotification(blogPost);
```

### 3. Event Logging Best Practices

#### Operation Correlation
- Use correlation IDs to link related events
- Start new correlation for each major operation chain
- Pass correlation IDs between service calls

#### Error Classification
- Use appropriate error categories for better filtering
- Include relevant context in operation details
- Sanitize sensitive data from payloads

#### Performance Tracking
- Start operation timing before work begins
- Include resource usage when available
- Track API call counts for rate limiting insights

### 4. Debugging and Troubleshooting

#### Query Recent Failures
```typescript
const eventLogger = new EmailEventLogger(env, authDB);
const recentFailures = await eventLogger.getRecentFailures(50);
```

#### Investigate Operation Chain
```typescript
const events = await eventLogger.getEventsByCorrelationId('correlation_123');
// Analyze complete operation flow
```

#### Performance Analysis
```typescript
const metrics = await eventLogger.getPerformanceMetrics(
  'send', 
  'gmail_send_email', 
  24 // hours
);
console.log(`Success rate: ${metrics.successRate}%`);
```

## Event Logging Injection Points

### Gmail Authentication
- Token cache hits/misses
- Token refresh attempts
- API authentication failures
- Rate limiting events

### Email Sending
- Email composition and encoding
- Gmail API requests/responses
- Send success/failure with message IDs
- Retry attempts and circuit breaker events

### Template Rendering
- Template lookup and loading
- Variable substitution
- Rendering success/failure
- Performance metrics

### User Operations
- User lookups by ID/email
- Subscriber list retrieval
- Preference validation
- Database query performance

### Batch Processing
- Batch creation and sizing
- Individual notification processing
- Rate limiting delays
- Overall batch completion

## Monitoring and Alerting

### Key Metrics to Monitor
- Email send success rate (target: >95%)
- Average send duration (target: <5 seconds)
- Authentication failure rate (target: <1%)
- Template rendering errors (target: <0.1%)
- Circuit breaker activations

### Alert Conditions
- Failure rate >10% in 10 minutes
- Authentication failures >5 in 5 minutes
- Send duration >30 seconds average
- Template errors >3 in 1 hour
- No successful sends in 1 hour (during business hours)

## Performance Considerations

### Database Optimization
- Event tables are heavily indexed for common queries
- Aggregation tables reduce query load for dashboards
- Automatic cleanup of old events (implement retention policy)

### Logging Performance
- Asynchronous logging to avoid blocking operations
- Payload sanitization to reduce storage size
- Batched inserts for high-volume scenarios

### Resource Usage
- Memory tracking for operation optimization
- API call counting for rate limit management
- Duration tracking for SLA monitoring

## Maintenance and Cleanup

### Data Retention
- Keep detailed events for 30 days
- Keep aggregated data for 1 year
- Archive critical failure events indefinitely

### Index Maintenance
- Monitor query performance on large datasets
- Consider partitioning for very high volumes
- Regular VACUUM operations for SQLite optimization

## Advanced Features

### Debug Sessions
Create grouped debugging sessions for complex issues:

```typescript
// Create debug session for investigation
const debugSession = await authDB.createDebugSession({
  sessionName: 'Investigation: Gmail API 401 errors',
  correlationIds: ['corr_1', 'corr_2', 'corr_3'],
  notes: 'Investigating authentication token refresh issues'
});
```

### Custom Event Types
Extend the system for domain-specific events:

```typescript
// Log custom business events
await eventLogger.logEvent({
  eventType: 'business',
  eventCategory: 'success',
  eventName: 'subscription_conversion',
  operationDetails: {
    userId: 'user123',
    subscriptionType: 'premium',
    conversionSource: 'email_campaign'
  }
});
```

### Performance Baselines
Establish and monitor performance baselines:

```typescript
// Compare current performance to baseline
const currentMetrics = await eventLogger.getPerformanceMetrics('send', 'gmail_send_email', 1);
const baselineMetrics = await eventLogger.getPerformanceMetrics('send', 'gmail_send_email', 168); // 1 week

const performanceDelta = currentMetrics.avgDuration - baselineMetrics.avgDuration;
if (performanceDelta > 1000) { // 1 second degradation
  // Alert on performance regression
}
```

## Integration with Existing Systems

### Current Email Monitor
The new event logging system complements the existing `EmailMonitor` class:
- Keep existing metrics aggregation
- Add detailed event logging for debugging
- Use event data to enhance monitoring accuracy

### Database Schema Compatibility
- New tables don't affect existing schema
- Foreign key relationships maintain data integrity
- Indexes are optimized for both new and existing queries

### Gradual Migration
1. Deploy event logging infrastructure
2. Update Gmail auth service to use enhanced version
3. Migrate notification service to enhanced version
4. Add debug dashboard to admin interface
5. Set up monitoring and alerting

## Conclusion

This comprehensive email event logging system provides complete visibility into email operations, enabling:

1. **Rapid Debugging** - Trace any email issue from start to finish
2. **Performance Optimization** - Identify bottlenecks and optimize operations
3. **Reliability Monitoring** - Track success rates and detect issues early
4. **Operational Insights** - Understand email system behavior and patterns
5. **Compliance Support** - Maintain audit trails for email operations

The system is designed to be both comprehensive for debugging and efficient for production use, ensuring that email operations can be monitored, optimized, and debugged without impacting performance.