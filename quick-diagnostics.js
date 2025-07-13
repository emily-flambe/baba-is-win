#!/usr/bin/env node

/**
 * Quick Email System Diagnostics
 * 
 * A fast diagnostic script to check email system health without sending emails.
 * Run this first to quickly identify obvious configuration issues.
 * 
 * Usage: node quick-diagnostics.js
 */

const https = require('https');

// Quick configuration check
function checkEnvironment() {
  console.log('🔍 Environment Configuration Check');
  console.log('=====================================');
  
  const required = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET', 
    'GMAIL_REFRESH_TOKEN',
    'GMAIL_SENDER_EMAIL',
    'SITE_NAME',
    'SITE_URL'
  ];
  
  let allPresent = true;
  
  required.forEach(key => {
    const present = !!process.env[key];
    const status = present ? '✅' : '❌';
    console.log(`${status} ${key}: ${present ? 'Set' : 'Missing'}`);
    
    if (!present) allPresent = false;
    
    // Format validation
    if (present) {
      if (key === 'GMAIL_CLIENT_ID' && !process.env[key].includes('.googleusercontent.com')) {
        console.log(`  ⚠️  Warning: ${key} format may be incorrect`);
      }
      if (key === 'SITE_URL' && !process.env[key].startsWith('http')) {
        console.log(`  ⚠️  Warning: ${key} should include protocol`);
      }
      if (key === 'GMAIL_SENDER_EMAIL' && !process.env[key].includes('@')) {
        console.log(`  ⚠️  Warning: ${key} doesn't appear to be an email`);
      }
    }
  });
  
  console.log(`\nResult: ${allPresent ? '✅ All required variables present' : '❌ Missing required variables'}`);
  return allPresent;
}

// Test OAuth token refresh
async function testTokenRefresh() {
  console.log('\n🔑 OAuth Token Refresh Test');
  console.log('============================');
  
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    console.log('❌ Missing OAuth credentials - skipping test');
    return false;
  }
  
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token refresh successful');
      console.log(`📧 Token type: ${data.token_type}`);
      console.log(`⏰ Expires in: ${data.expires_in} seconds`);
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Token refresh failed');
      console.log(`📄 Status: ${response.status}`);
      console.log(`📄 Error: ${error}`);
      
      // Provide specific guidance
      if (error.includes('invalid_grant')) {
        console.log('\n🔧 SOLUTION: Refresh token is expired or revoked');
        console.log('   1. Go to Google OAuth 2.0 Playground');
        console.log('   2. Re-authorize your application');
        console.log('   3. Get a new refresh token');
      } else if (error.includes('invalid_client')) {
        console.log('\n🔧 SOLUTION: Client credentials are incorrect');
        console.log('   1. Check GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET');
        console.log('   2. Verify credentials in Google Cloud Console');
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Network error during token refresh');
    console.log(`📄 Error: ${error.message}`);
    return false;
  }
}

// Test Gmail API connectivity
async function testGmailAPI() {
  console.log('\n📧 Gmail API Connectivity Test');
  console.log('===============================');
  
  try {
    // First get a token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });
    
    if (!tokenResponse.ok) {
      console.log('❌ Cannot test Gmail API - token refresh failed');
      return false;
    }
    
    const tokenData = await tokenResponse.json();
    
    // Test Gmail API access
    const apiResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (apiResponse.ok) {
      const profile = await apiResponse.json();
      console.log('✅ Gmail API access successful');
      console.log(`📧 Connected email: ${profile.emailAddress}`);
      console.log(`📊 Total messages: ${profile.messagesTotal || 'N/A'}`);
      
      // Check if sender email matches connected account
      if (process.env.GMAIL_SENDER_EMAIL && process.env.GMAIL_SENDER_EMAIL !== profile.emailAddress) {
        console.log('⚠️  Warning: GMAIL_SENDER_EMAIL doesn\'t match connected account');
        console.log(`   Sender: ${process.env.GMAIL_SENDER_EMAIL}`);
        console.log(`   Account: ${profile.emailAddress}`);
      }
      
      return true;
    } else {
      const error = await apiResponse.text();
      console.log('❌ Gmail API access failed');
      console.log(`📄 Status: ${apiResponse.status}`);
      console.log(`📄 Error: ${error}`);
      
      if (apiResponse.status === 403) {
        console.log('\n🔧 SOLUTION: Gmail API permission issue');
        console.log('   1. Enable Gmail API in Google Cloud Console');
        console.log('   2. Check OAuth scopes include Gmail access');
        console.log('   3. Verify quotas and billing settings');
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Network error during Gmail API test');
    console.log(`📄 Error: ${error.message}`);
    return false;
  }
}

// Test basic email template rendering
function testTemplateRendering() {
  console.log('\n🎨 Email Template Test');
  console.log('======================');
  
  try {
    const testData = {
      title: 'Test Email Subject',
      user_name: 'Test User',
      site_name: process.env.SITE_NAME || 'Test Site',
      site_url: process.env.SITE_URL || 'https://example.com',
      content: 'This is test content for template rendering.',
      unsubscribe_url: `${process.env.SITE_URL || 'https://example.com'}/unsubscribe?token=test123`
    };
    
    // Simple template test
    const subject = `New Post: ${testData.title}`;
    const textContent = `Hi ${testData.user_name},\n\n${testData.content}\n\nBest regards,\n${testData.site_name}\n\nUnsubscribe: ${testData.unsubscribe_url}`;
    const htmlContent = `<html><body><h1>${testData.title}</h1><p>Hi ${testData.user_name},</p><p>${testData.content}</p><p>Best regards,<br>${testData.site_name}</p><p><a href="${testData.unsubscribe_url}">Unsubscribe</a></p></body></html>`;
    
    console.log('✅ Template rendering successful');
    console.log(`📧 Subject: ${subject}`);
    console.log(`📝 Text length: ${textContent.length} chars`);
    console.log(`📝 HTML length: ${htmlContent.length} chars`);
    
    // Check for template variable issues
    const hasPlaceholders = textContent.includes('undefined') || htmlContent.includes('undefined');
    if (hasPlaceholders) {
      console.log('⚠️  Warning: Template contains undefined variables');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Template rendering failed');
    console.log(`📄 Error: ${error.message}`);
    return false;
  }
}

// Test email format validation
function testEmailFormat() {
  console.log('\n✉️  Email Format Validation');
  console.log('===========================');
  
  try {
    const testEmail = {
      to: 'test@example.com',
      from: process.env.GMAIL_SENDER_EMAIL || 'sender@example.com',
      subject: 'Test Subject',
      text: 'Test content',
      html: '<p>Test content</p>'
    };
    
    // Create RFC 2822 email format
    const emailMessage = [
      `To: ${testEmail.to}`,
      `From: ${process.env.SITE_NAME || 'Test'} <${testEmail.from}>`,
      `Subject: ${testEmail.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="test123"`,
      ``,
      `--test123`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      testEmail.text,
      ``,
      `--test123`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      testEmail.html,
      ``,
      `--test123--`
    ].join('\r\n');
    
    // Test Base64 encoding (Gmail API requirement)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(emailMessage);
    const encoded = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log('✅ Email format validation successful');
    console.log(`📧 Raw message length: ${emailMessage.length} chars`);
    console.log(`📧 Encoded length: ${encoded.length} chars`);
    console.log(`📧 Encoding ratio: ${(encoded.length / emailMessage.length * 100).toFixed(1)}%`);
    
    return true;
  } catch (error) {
    console.log('❌ Email format validation failed');
    console.log(`📄 Error: ${error.message}`);
    return false;
  }
}

// Generate system health report
function generateHealthReport(results) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 EMAIL SYSTEM HEALTH REPORT');
  console.log('='.repeat(50));
  
  const tests = [
    { name: 'Environment Configuration', passed: results.environment },
    { name: 'OAuth Token Refresh', passed: results.tokenRefresh },
    { name: 'Gmail API Connectivity', passed: results.gmailAPI },
    { name: 'Template Rendering', passed: results.templateRendering },
    { name: 'Email Format Validation', passed: results.emailFormat }
  ];
  
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  
  console.log(`\n📈 Overall Health: ${passed}/${total} tests passed`);
  
  tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.name}: ${status}`);
  });
  
  if (passed === total) {
    console.log('\n🎉 SYSTEM HEALTHY!');
    console.log('All basic components are working correctly.');
    console.log('Ready for full notification testing.');
  } else {
    console.log('\n⚠️  ISSUES DETECTED');
    console.log('Fix the failed components before proceeding with full tests.');
    
    const firstFailure = tests.find(t => !t.passed);
    console.log(`\n🔧 Priority: Fix "${firstFailure.name}" first`);
  }
  
  console.log('\n📋 Next Steps:');
  if (passed < total) {
    console.log('1. Fix the failed diagnostic checks above');
    console.log('2. Re-run this diagnostic script');
    console.log('3. Once all checks pass, run full notification test');
  } else {
    console.log('1. Run: node test-single-notification.js');
    console.log('2. Test with actual database connection');
    console.log('3. Send test notification to verify end-to-end flow');
  }
  
  console.log('\n' + '='.repeat(50));
}

// Main execution
async function runDiagnostics() {
  console.log('🚀 EMAIL SYSTEM QUICK DIAGNOSTICS');
  console.log('===================================\n');
  
  const results = {
    environment: checkEnvironment(),
    tokenRefresh: await testTokenRefresh(),
    gmailAPI: await testGmailAPI(),
    templateRendering: testTemplateRendering(),
    emailFormat: testEmailFormat()
  };
  
  generateHealthReport(results);
}

// Run diagnostics
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { runDiagnostics };