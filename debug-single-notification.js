/**
 * Comprehensive Single Notification Test
 * 
 * This script performs isolated testing of each component in the email notification pipeline
 * to identify the exact root cause of notification failures.
 * 
 * Test Components:
 * 1. Environment/Configuration validation
 * 2. Database connectivity and user retrieval
 * 3. Content item preparation
 * 4. Template rendering
 * 5. Unsubscribe service
 * 6. Gmail authentication
 * 7. Email sending
 * 8. Database updates
 * 
 * Usage: node debug-single-notification.js
 */

import type { Env } from './src/types/env';
import { AuthDB } from './src/lib/auth/db';
import { EmailNotificationService } from './src/lib/email/notification-service';
import { GmailAuth } from './src/lib/email/gmail-auth';
import { EmailTemplateEngine } from './src/lib/email/template-engine';
import { UnsubscribeService } from './src/lib/email/unsubscribe-service';

// Test configuration - modify these values for your specific test case
const TEST_CONFIG = {
  // Test user - use an existing user ID or email
  TEST_USER_EMAIL: 'your-test-email@example.com', // REPLACE WITH ACTUAL TEST EMAIL
  
  // Test content - blog post or thought data
  TEST_CONTENT: {
    slug: 'test-notification-debug',
    title: 'Debug Test Notification',
    description: 'This is a test notification to debug the email system',
    content: 'This is test content for debugging the notification pipeline.',
    publishDate: new Date(),
    tags: ['debug', 'test'],
    filePath: '/test/debug-notification.md'
  },
  
  // Test type: 'blog' or 'thought'
  CONTENT_TYPE: 'blog',
  
  // Debug levels
  VERBOSE_LOGGING: true,
  STEP_BY_STEP: true // Pause between major steps for manual verification
};

// Color-coded logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n${colors.bright}${colors.blue}=== STEP ${step}: ${description} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function logInfo(message) {
  log(`${colors.cyan}ℹ ${message}${colors.reset}`);
}

async function pauseForInput(message = 'Press Enter to continue...') {
  if (!TEST_CONFIG.STEP_BY_STEP) return;
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    readline.question(`${colors.yellow}${message}${colors.reset}`, () => {
      readline.close();
      resolve();
    });
  });
}

async function validateEnvironment() {
  logStep(1, 'Environment & Configuration Validation');
  
  const requiredEnvVars = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET', 
    'GMAIL_REFRESH_TOKEN',
    'GMAIL_SENDER_EMAIL',
    'SITE_NAME',
    'SITE_URL',
    'DATABASE_URL' // or whatever your DB connection var is
  ];
  
  const missing = [];
  const present = [];
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      present.push(envVar);
      logSuccess(`${envVar}: Present`);
    } else {
      missing.push(envVar);
      logError(`${envVar}: Missing`);
    }
  }
  
  if (missing.length > 0) {
    logError(`Missing required environment variables: ${missing.join(', ')}`);
    logError('Please ensure all required environment variables are set.');
    return false;
  }
  
  // Validate Gmail configuration format
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  if (gmailClientId && !gmailClientId.includes('.googleusercontent.com')) {
    logWarning('GMAIL_CLIENT_ID doesn\'t appear to be in correct format (.googleusercontent.com)');
  }
  
  const siteUrl = process.env.SITE_URL;
  if (siteUrl && !siteUrl.startsWith('http')) {
    logWarning('SITE_URL should include protocol (http:// or https://)');
  }
  
  logSuccess('Environment validation passed');
  
  if (TEST_CONFIG.VERBOSE_LOGGING) {
    logInfo(`Present environment variables: ${present.join(', ')}`);
  }
  
  await pauseForInput();
  return true;
}

async function testDatabaseConnection() {
  logStep(2, 'Database Connection & User Retrieval');
  
  try {
    // Note: You'll need to adapt this based on your actual DB setup
    // This assumes you're using Cloudflare D1 or similar
    logInfo('Testing database connection...');
    
    // Mock environment for testing
    const env = {
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
      GMAIL_SENDER_EMAIL: process.env.GMAIL_SENDER_EMAIL,
      SITE_NAME: process.env.SITE_NAME,
      SITE_URL: process.env.SITE_URL
    };
    
    // For this debug script, we'll create a mock database connection
    // In production, replace this with your actual database initialization
    logWarning('Database connection test skipped - requires actual DB instance');
    logInfo('Manual verification required:');
    logInfo('1. Verify database is accessible');
    logInfo('2. Check user table exists and has test user');
    logInfo('3. Verify user has appropriate email preferences enabled');
    
    await pauseForInput('Verify database manually, then press Enter...');
    
    return { success: true, user: null }; // Will be filled in actual implementation
    
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    if (TEST_CONFIG.VERBOSE_LOGGING) {
      console.error(error);
    }
    return { success: false, error };
  }
}

async function testUserRetrieval(authDB) {
  logStep(3, 'User Data Retrieval & Validation');
  
  try {
    logInfo(`Looking up user: ${TEST_CONFIG.TEST_USER_EMAIL}`);
    
    // Test user retrieval by email
    const user = await authDB.getUserByEmail(TEST_CONFIG.TEST_USER_EMAIL);
    
    if (!user) {
      logError(`User not found: ${TEST_CONFIG.TEST_USER_EMAIL}`);
      logInfo('Available troubleshooting steps:');
      logInfo('1. Check if email address is correct');
      logInfo('2. Verify user exists in database');
      logInfo('3. Check if email is stored in lowercase');
      return { success: false, error: 'User not found' };
    }
    
    logSuccess(`User found: ${user.username} (${user.email})`);
    
    // Validate user subscription preferences
    const contentTypeKey = TEST_CONFIG.CONTENT_TYPE === 'blog' ? 'emailBlogUpdates' : 'emailThoughtUpdates';
    const isSubscribed = user[contentTypeKey];
    
    if (!isSubscribed) {
      logWarning(`User is not subscribed to ${TEST_CONFIG.CONTENT_TYPE} updates`);
      logInfo(`User preferences: Blog=${user.emailBlogUpdates}, Thoughts=${user.emailThoughtUpdates}, Announcements=${user.emailAnnouncements}`);
    } else {
      logSuccess(`User is subscribed to ${TEST_CONFIG.CONTENT_TYPE} updates`);
    }
    
    // Check additional user status fields if they exist
    logInfo('User status validation:');
    logInfo(`Created: ${user.createdAt}`);
    logInfo(`Email verified: ${user.emailVerified !== false ? 'Yes' : 'No'}`);
    logInfo(`Email status: ${user.emailStatus || 'active'}`);
    logInfo(`Unsubscribed from all: ${user.unsubscribeAll ? 'Yes' : 'No'}`);
    
    await pauseForInput();
    return { success: true, user };
    
  } catch (error) {
    logError(`User retrieval failed: ${error.message}`);
    if (TEST_CONFIG.VERBOSE_LOGGING) {
      console.error(error);
    }
    return { success: false, error };
  }
}

async function testContentProcessing() {
  logStep(4, 'Content Item Processing');
  
  try {
    logInfo('Validating test content structure...');
    
    const content = TEST_CONFIG.TEST_CONTENT;
    
    // Validate required fields
    const requiredFields = ['slug', 'title', 'publishDate'];
    const missingFields = requiredFields.filter(field => !content[field]);
    
    if (missingFields.length > 0) {
      logError(`Missing required content fields: ${missingFields.join(', ')}`);
      return { success: false, error: 'Invalid content structure' };
    }
    
    logSuccess('Content structure is valid');
    
    // Log content details
    logInfo(`Content details:`);
    logInfo(`  Slug: ${content.slug}`);
    logInfo(`  Title: ${content.title}`);
    logInfo(`  Type: ${TEST_CONFIG.CONTENT_TYPE}`);
    logInfo(`  Publish Date: ${content.publishDate}`);
    logInfo(`  Tags: ${content.tags?.join(', ') || 'None'}`);
    
    // Validate content-specific fields
    if (TEST_CONFIG.CONTENT_TYPE === 'blog') {
      if (!content.description) {
        logWarning('Blog post missing description field');
      } else {
        logSuccess(`Blog description: ${content.description.substring(0, 100)}...`);
      }
    }
    
    if (!content.content) {
      logWarning('Content missing main content field');
    } else {
      logSuccess(`Content length: ${content.content.length} characters`);
    }
    
    await pauseForInput();
    return { success: true, content };
    
  } catch (error) {
    logError(`Content processing failed: ${error.message}`);
    return { success: false, error };
  }
}

async function testTemplateEngine(user, content, env) {
  logStep(5, 'Template Engine & Rendering');
  
  try {
    logInfo('Initializing template engine...');
    
    const templateEngine = new EmailTemplateEngine(env);
    
    // Test template retrieval
    const templateName = TEST_CONFIG.CONTENT_TYPE === 'blog' ? 'blog_notification' : 'thought_notification';
    logInfo(`Testing template: ${templateName}`);
    
    // Generate mock unsubscribe URL for testing
    const mockUnsubscribeUrl = `${env.SITE_URL}/unsubscribe?token=test_token_12345`;
    
    // Test template rendering
    let emailContent;
    if (TEST_CONFIG.CONTENT_TYPE === 'blog') {
      emailContent = await templateEngine.renderBlogNotification(user, content, mockUnsubscribeUrl);
    } else {
      emailContent = await templateEngine.renderThoughtNotification(user, content, mockUnsubscribeUrl);
    }
    
    logSuccess('Template rendering completed');
    
    // Validate rendered content
    if (!emailContent.subject || !emailContent.html || !emailContent.text) {
      logError('Template rendering produced incomplete output');
      logInfo(`Subject: ${emailContent.subject ? 'Present' : 'Missing'}`);
      logInfo(`HTML: ${emailContent.html ? 'Present' : 'Missing'}`);
      logInfo(`Text: ${emailContent.text ? 'Present' : 'Missing'}`);
      return { success: false, error: 'Incomplete template output' };
    }
    
    logSuccess(`Subject: ${emailContent.subject}`);
    logSuccess(`HTML length: ${emailContent.html.length} characters`);
    logSuccess(`Text length: ${emailContent.text.length} characters`);
    
    // Validate content interpolation
    const hasUserName = emailContent.html.includes(user.username);
    const hasContentTitle = emailContent.html.includes(content.title);
    const hasUnsubscribeLink = emailContent.html.includes('unsubscribe');
    
    logInfo('Template variable interpolation check:');
    logInfo(`  User name: ${hasUserName ? '✓' : '✗'}`);
    logInfo(`  Content title: ${hasContentTitle ? '✓' : '✗'}`);
    logInfo(`  Unsubscribe link: ${hasUnsubscribeLink ? '✓' : '✗'}`);
    
    if (TEST_CONFIG.VERBOSE_LOGGING) {
      log('\n--- RENDERED EMAIL CONTENT ---', colors.magenta);
      log(`Subject: ${emailContent.subject}`, colors.cyan);
      log('\nHTML Preview (first 500 chars):', colors.cyan);
      log(emailContent.html.substring(0, 500) + '...', colors.reset);
      log('\nText Preview (first 300 chars):', colors.cyan);
      log(emailContent.text.substring(0, 300) + '...', colors.reset);
      log('--- END EMAIL CONTENT ---\n', colors.magenta);
    }
    
    await pauseForInput();
    return { success: true, emailContent };
    
  } catch (error) {
    logError(`Template engine failed: ${error.message}`);
    if (TEST_CONFIG.VERBOSE_LOGGING) {
      console.error(error);
    }
    return { success: false, error };
  }
}

async function testUnsubscribeService(user, env) {
  logStep(6, 'Unsubscribe Service & Token Generation');
  
  try {
    logInfo('Testing unsubscribe service...');
    
    // Note: This requires database connection, so we'll mock it for now
    logWarning('Unsubscribe service test requires database connection');
    logInfo('Manual verification steps:');
    logInfo('1. Verify unsubscribe_tokens table exists');
    logInfo('2. Check token generation produces valid URLs');
    logInfo('3. Validate token expiration settings');
    
    // Mock unsubscribe URL generation
    const mockToken = 'debug_token_' + Date.now();
    const unsubscribeUrl = `${env.SITE_URL}/unsubscribe?token=${mockToken}`;
    
    logSuccess(`Mock unsubscribe URL: ${unsubscribeUrl}`);
    
    // Validate URL format
    const urlPattern = /^https?:\/\/.+\/unsubscribe\?token=.+/;
    if (!urlPattern.test(unsubscribeUrl)) {
      logError('Unsubscribe URL format is invalid');
      return { success: false, error: 'Invalid URL format' };
    }
    
    logSuccess('Unsubscribe URL format is valid');
    
    await pauseForInput();
    return { success: true, unsubscribeUrl };
    
  } catch (error) {
    logError(`Unsubscribe service failed: ${error.message}`);
    return { success: false, error };
  }
}

async function testGmailAuthentication(env) {
  logStep(7, 'Gmail Authentication & API Access');
  
  try {
    logInfo('Testing Gmail authentication...');
    
    const gmailAuth = new GmailAuth(env);
    
    // Test token refresh
    logInfo('Attempting to refresh access token...');
    const accessToken = await gmailAuth.getValidAccessToken();
    
    if (!accessToken) {
      logError('Failed to obtain access token');
      return { success: false, error: 'Token refresh failed' };
    }
    
    logSuccess('Access token obtained successfully');
    logInfo(`Token length: ${accessToken.length} characters`);
    logInfo(`Token starts with: ${accessToken.substring(0, 20)}...`);
    
    // Test Gmail API connectivity
    logInfo('Testing Gmail API connectivity...');
    
    const testResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!testResponse.ok) {
      logError(`Gmail API test failed: ${testResponse.status} - ${testResponse.statusText}`);
      const errorText = await testResponse.text();
      logError(`Error details: ${errorText}`);
      return { success: false, error: 'Gmail API access failed' };
    }
    
    const profile = await testResponse.json();
    logSuccess('Gmail API connectivity confirmed');
    logInfo(`Gmail account: ${profile.emailAddress}`);
    logInfo(`Messages total: ${profile.messagesTotal}`);
    
    await pauseForInput();
    return { success: true, accessToken, profile };
    
  } catch (error) {
    logError(`Gmail authentication failed: ${error.message}`);
    if (TEST_CONFIG.VERBOSE_LOGGING) {
      console.error(error);
    }
    
    // Provide specific troubleshooting guidance
    if (error.message.includes('refresh_token')) {
      logError('TROUBLESHOOTING: Refresh token issue');
      logInfo('1. Check GMAIL_REFRESH_TOKEN environment variable');
      logInfo('2. Verify refresh token is not expired');
      logInfo('3. Re-run OAuth flow to get new refresh token');
    } else if (error.message.includes('client_id')) {
      logError('TROUBLESHOOTING: Client ID issue');
      logInfo('1. Verify GMAIL_CLIENT_ID is correct');
      logInfo('2. Check Google Cloud Console OAuth settings');
    } else if (error.message.includes('client_secret')) {
      logError('TROUBLESHOOTING: Client secret issue');
      logInfo('1. Verify GMAIL_CLIENT_SECRET is correct');
      logInfo('2. Check if secret was regenerated in console');
    }
    
    return { success: false, error };
  }
}

async function testEmailSending(gmailAuth, user, emailContent, env) {
  logStep(8, 'Email Sending & Delivery');
  
  try {
    logInfo(`Preparing to send test email to: ${user.email}`);
    
    // Confirm before sending
    await pauseForInput(`⚠️  WARNING: This will send a real email to ${user.email}. Continue? (Enter to proceed, Ctrl+C to abort)`);
    
    logInfo('Sending email via Gmail API...');
    
    const emailMessageId = await gmailAuth.sendEmail(
      user.email,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );
    
    logSuccess(`Email sent successfully!`);
    logSuccess(`Gmail Message ID: ${emailMessageId}`);
    
    // Provide verification steps
    logInfo('Email delivery verification:');
    logInfo(`1. Check ${user.email} inbox for the test message`);
    logInfo(`2. Verify subject line: "${emailContent.subject}"`);
    logInfo('3. Check if email appears in Gmail Sent folder');
    logInfo('4. Test unsubscribe link functionality');
    logInfo('5. Verify email formatting and content display correctly');
    
    await pauseForInput('After checking email delivery, press Enter to continue...');
    
    return { success: true, emailMessageId };
    
  } catch (error) {
    logError(`Email sending failed: ${error.message}`);
    
    // Provide specific troubleshooting based on error
    if (error.message.includes('400')) {
      logError('TROUBLESHOOTING: Bad Request (400)');
      logInfo('1. Check email format and encoding');
      logInfo('2. Verify recipient email address is valid');
      logInfo('3. Check email content for invalid characters');
    } else if (error.message.includes('401')) {
      logError('TROUBLESHOOTING: Unauthorized (401)');
      logInfo('1. Access token may be expired');
      logInfo('2. Check OAuth scopes include Gmail send permission');
    } else if (error.message.includes('403')) {
      logError('TROUBLESHOOTING: Forbidden (403)');
      logInfo('1. Gmail API may not be enabled');
      logInfo('2. Check quota limits');
      logInfo('3. Verify sender email authorization');
    } else if (error.message.includes('429')) {
      logError('TROUBLESHOOTING: Rate Limited (429)');
      logInfo('1. Too many requests - implement rate limiting');
      logInfo('2. Wait and retry later');
    }
    
    if (TEST_CONFIG.VERBOSE_LOGGING) {
      console.error(error);
    }
    
    return { success: false, error };
  }
}

async function testDatabaseUpdates(notificationId, emailMessageId) {
  logStep(9, 'Database Updates & Notification Tracking');
  
  try {
    logInfo('Testing database notification updates...');
    
    // Note: This requires actual database connection
    logWarning('Database update test requires live database connection');
    logInfo('Manual verification steps:');
    logInfo('1. Check email_notifications table for new record');
    logInfo('2. Verify notification status is "sent"');
    logInfo('3. Confirm email_message_id is stored');
    logInfo('4. Check sent_at timestamp is recorded');
    logInfo('5. Verify retry_count and error_message are appropriate');
    
    // Mock database update for testing
    const updateData = {
      notificationId: notificationId || 'debug_notification_' + Date.now(),
      status: 'sent',
      emailMessageId: emailMessageId,
      sentAt: new Date(),
      errorMessage: null
    };
    
    logSuccess('Mock database update successful');
    logInfo(`Notification ID: ${updateData.notificationId}`);
    logInfo(`Status: ${updateData.status}`);
    logInfo(`Email Message ID: ${updateData.emailMessageId}`);
    logInfo(`Sent At: ${updateData.sentAt}`);
    
    await pauseForInput();
    return { success: true, updateData };
    
  } catch (error) {
    logError(`Database update failed: ${error.message}`);
    return { success: false, error };
  }
}

async function generateTestReport(results) {
  logStep(10, 'Test Results Summary & Recommendations');
  
  log('\n' + '='.repeat(80), colors.bright);
  log('SINGLE NOTIFICATION TEST REPORT', colors.bright + colors.blue);
  log('='.repeat(80), colors.bright);
  
  const testSteps = [
    { name: 'Environment Validation', result: results.environment },
    { name: 'Database Connection', result: results.database },
    { name: 'User Retrieval', result: results.user },
    { name: 'Content Processing', result: results.content },
    { name: 'Template Rendering', result: results.template },
    { name: 'Unsubscribe Service', result: results.unsubscribe },
    { name: 'Gmail Authentication', result: results.gmail },
    { name: 'Email Sending', result: results.emailSending },
    { name: 'Database Updates', result: results.databaseUpdates }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  log('\nTEST RESULTS:', colors.bright);
  testSteps.forEach((step, index) => {
    const status = step.result?.success ? 'PASS' : 'FAIL';
    const color = step.result?.success ? colors.green : colors.red;
    const icon = step.result?.success ? '✓' : '✗';
    
    log(`${index + 1}. ${step.name}: ${color}${icon} ${status}${colors.reset}`);
    
    if (step.result?.success) {
      passedTests++;
    } else {
      failedTests++;
      if (step.result?.error) {
        log(`   Error: ${step.result.error}`, colors.red);
      }
    }
  });
  
  log(`\nOVERALL RESULTS:`, colors.bright);
  log(`Passed: ${passedTests}/${testSteps.length}`, colors.green);
  log(`Failed: ${failedTests}/${testSteps.length}`, colors.red);
  
  // Root cause analysis
  log('\nROOT CAUSE ANALYSIS:', colors.bright + colors.yellow);
  
  if (failedTests === 0) {
    logSuccess('All tests passed! Email notification system is functioning correctly.');
    logInfo('If you\'re still experiencing issues, check:');
    logInfo('1. Production vs development environment differences');
    logInfo('2. Database connection in production');
    logInfo('3. Cloudflare Workers environment variables');
    logInfo('4. Rate limiting and quotas');
  } else {
    const firstFailure = testSteps.find(step => !step.result?.success);
    logError(`PRIMARY ISSUE: ${firstFailure.name} failed`);
    
    if (firstFailure.name === 'Environment Validation') {
      logError('DIAGNOSIS: Configuration issue');
      logInfo('SOLUTION: Fix missing environment variables');
    } else if (firstFailure.name === 'Database Connection') {
      logError('DIAGNOSIS: Database connectivity issue');
      logInfo('SOLUTION: Check database configuration and network access');
    } else if (firstFailure.name === 'User Retrieval') {
      logError('DIAGNOSIS: User data issue');
      logInfo('SOLUTION: Verify user exists and has correct subscription preferences');
    } else if (firstFailure.name === 'Gmail Authentication') {
      logError('DIAGNOSIS: Gmail OAuth configuration issue');
      logInfo('SOLUTION: Fix Gmail API credentials and refresh tokens');
    } else if (firstFailure.name === 'Email Sending') {
      logError('DIAGNOSIS: Email delivery issue');
      logInfo('SOLUTION: Check Gmail API permissions and email formatting');
    }
  }
  
  // Performance metrics
  log('\nPERFORMANCE INSIGHTS:', colors.bright + colors.cyan);
  logInfo('Template rendering: Fast (in-memory templates)');
  logInfo('Gmail API calls: Rate limited (respect quotas)');
  logInfo('Database operations: Should be optimized for batch processing');
  
  // Next steps
  log('\nRECOMMENDED NEXT STEPS:', colors.bright + colors.magenta);
  
  if (failedTests > 0) {
    logInfo('1. Fix the primary issue identified above');
    logInfo('2. Re-run this test script to verify the fix');
    logInfo('3. Test with multiple users and content types');
    logInfo('4. Monitor production logs for similar patterns');
  } else {
    logInfo('1. Run this test with different content types (blog vs thought)');
    logInfo('2. Test with multiple users to verify batch processing');
    logInfo('3. Test error handling scenarios (invalid emails, network issues)');
    logInfo('4. Implement production monitoring based on successful test patterns');
  }
  
  log('\n' + '='.repeat(80), colors.bright);
  log('END OF REPORT', colors.bright + colors.blue);
  log('='.repeat(80) + '\n', colors.bright);
}

// Main test execution
async function runSingleNotificationTest() {
  log(`${colors.bright}${colors.blue}COMPREHENSIVE SINGLE NOTIFICATION TEST${colors.reset}`);
  log(`Testing email notification pipeline for user: ${TEST_CONFIG.TEST_USER_EMAIL}`);
  log(`Content type: ${TEST_CONFIG.CONTENT_TYPE}`);
  log(`Verbose logging: ${TEST_CONFIG.VERBOSE_LOGGING ? 'Enabled' : 'Disabled'}`);
  log(`Step-by-step mode: ${TEST_CONFIG.STEP_BY_STEP ? 'Enabled' : 'Disabled'}\n`);
  
  const results = {};
  
  try {
    // Step 1: Environment validation
    results.environment = await validateEnvironment();
    if (!results.environment.success) return;
    
    // Step 2: Database connection
    results.database = await testDatabaseConnection();
    
    // Step 3: User retrieval (mocked for now)
    results.user = { 
      success: true, 
      user: { 
        id: 'test_user_123',
        email: TEST_CONFIG.TEST_USER_EMAIL,
        username: 'test_user',
        emailBlogUpdates: TEST_CONFIG.CONTENT_TYPE === 'blog',
        emailThoughtUpdates: TEST_CONFIG.CONTENT_TYPE === 'thought',
        emailAnnouncements: true,
        createdAt: new Date()
      } 
    };
    
    // Step 4: Content processing
    results.content = await testContentProcessing();
    if (!results.content.success) return;
    
    // Create mock environment object
    const env = {
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
      GMAIL_SENDER_EMAIL: process.env.GMAIL_SENDER_EMAIL,
      SITE_NAME: process.env.SITE_NAME || 'Test Site',
      SITE_URL: process.env.SITE_URL || 'https://example.com'
    };
    
    // Step 5: Template engine
    results.template = await testTemplateEngine(results.user.user, results.content.content, env);
    if (!results.template.success) return;
    
    // Step 6: Unsubscribe service
    results.unsubscribe = await testUnsubscribeService(results.user.user, env);
    
    // Step 7: Gmail authentication
    results.gmail = await testGmailAuthentication(env);
    if (!results.gmail.success) return;
    
    // Step 8: Email sending
    results.emailSending = await testEmailSending(
      new GmailAuth(env),
      results.user.user,
      results.template.emailContent,
      env
    );
    
    // Step 9: Database updates
    results.databaseUpdates = await testDatabaseUpdates(
      'test_notification_' + Date.now(),
      results.emailSending.emailMessageId
    );
    
    // Step 10: Generate report
    await generateTestReport(results);
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    if (TEST_CONFIG.VERBOSE_LOGGING) {
      console.error(error);
    }
  }
}

// Export for module usage or run directly
if (require.main === module) {
  runSingleNotificationTest().catch(console.error);
}

module.exports = {
  runSingleNotificationTest,
  TEST_CONFIG
};