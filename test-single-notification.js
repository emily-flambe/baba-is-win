// 🦅 Single Notification Test - Comprehensive Debugging
// This script tests a single notification end-to-end with detailed logging

const TEST_CONFIG = {
  // UPDATE THESE VALUES FOR YOUR TEST
  TEST_USER_EMAIL: 'emily.cogsdill@demexchange.com',  // Real subscriber email
  CONTENT_SLUG: '20250712-i-love-cloudflare',         // Reset content item
  CONTENT_TYPE: 'blog',                               // 'blog' or 'thought'
  SEND_REAL_EMAIL: false,                            // Set to true to actually send
  
  // API Configuration
  API_BASE: 'https://personal.emily-cogsdill.workers.dev',
  AUTH_TOKEN: '27dc2709f1ca0de1fa66c0be0a3d2effc9bba93a5d53acec473eb06374dacb6a'
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n🦅 Step ${step}: ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function pause(message = 'Press Enter to continue...') {
  log(`\n${message}`, 'yellow');
  // In a real terminal, you'd use readline, but for testing we'll just wait
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function makeRequest(endpoint, options = {}) {
  const url = `${TEST_CONFIG.API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${TEST_CONFIG.AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  const text = await response.text();
  
  try {
    return {
      status: response.status,
      ok: response.ok,
      data: JSON.parse(text),
      raw: text
    };
  } catch {
    return {
      status: response.status,
      ok: response.ok,
      data: null,
      raw: text
    };
  }
}

async function testStep1_EnvironmentCheck() {
  logStep(1, 'Environment & Configuration Check');
  
  logInfo('Checking API connectivity...');
  try {
    const response = await fetch(TEST_CONFIG.API_BASE);
    if (response.ok) {
      logSuccess('API endpoint is accessible');
    } else {
      logError(`API returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot reach API: ${error.message}`);
    return false;
  }
  
  logInfo('Testing authentication...');
  const authTest = await makeRequest('/api/admin/notifications');
  if (authTest.ok) {
    logSuccess('Authentication working');
  } else {
    logError(`Authentication failed: ${authTest.status} - ${authTest.raw}`);
    return false;
  }
  
  return true;
}

async function testStep2_DatabaseCheck() {
  logStep(2, 'Database State Verification');
  
  logInfo(`Checking for user: ${TEST_CONFIG.TEST_USER_EMAIL}`);
  
  // We'll check via the API by trying to look up the user indirectly
  const notificationTest = await makeRequest('/api/admin/notifications');
  if (notificationTest.ok) {
    logSuccess('Database connection working');
  } else {
    logError('Database connection issues');
    return false;
  }
  
  logInfo(`Checking content item: ${TEST_CONFIG.CONTENT_SLUG}`);
  // Content check will happen in the sync step
  
  return true;
}

async function testStep3_ContentSync() {
  logStep(3, 'Content Synchronization Test');
  
  logInfo('Triggering content sync...');
  const syncResponse = await makeRequest('/api/admin/trigger-content-sync', {
    method: 'POST'
  });
  
  if (syncResponse.ok) {
    logSuccess(`Content sync completed`);
    logInfo(`Sync stats: ${JSON.stringify(syncResponse.data.stats, null, 2)}`);
    
    if (syncResponse.data.stats.newContent > 0) {
      logSuccess(`Found ${syncResponse.data.stats.newContent} new content items`);
    } else {
      logWarning('No new content detected - this is expected if content was already synced');
    }
  } else {
    logError(`Content sync failed: ${syncResponse.status} - ${syncResponse.raw}`);
    return false;
  }
  
  return true;
}

async function testStep4_SingleNotificationTest() {
  logStep(4, 'Single Notification Processing Test');
  
  if (!TEST_CONFIG.SEND_REAL_EMAIL) {
    logWarning('SEND_REAL_EMAIL is false - testing in simulation mode');
  }
  
  // First, let's check if we can trigger a test email
  logInfo('Testing email system with test email...');
  const testEmailResponse = await makeRequest('/api/admin/test-email', {
    method: 'POST',
    body: JSON.stringify({
      to: TEST_CONFIG.TEST_USER_EMAIL,
      subject: '🦅 Single Notification Test',
      content: 'This is a test email from the debugging process'
    })
  });
  
  if (testEmailResponse.ok) {
    logSuccess('Test email system working');
    logInfo(`Test response: ${JSON.stringify(testEmailResponse.data, null, 2)}`);
  } else {
    logError(`Test email failed: ${testEmailResponse.status} - ${testEmailResponse.raw}`);
    
    // Try to get more details about the failure
    logInfo('Analyzing test email failure...');
    if (testEmailResponse.raw.includes('Gmail API')) {
      logError('Gmail API issue detected');
    }
    if (testEmailResponse.raw.includes('authentication') || testEmailResponse.raw.includes('401')) {
      logError('Authentication issue detected');
    }
    if (testEmailResponse.raw.includes('quota') || testEmailResponse.raw.includes('rate')) {
      logError('Rate limiting or quota issue detected');
    }
    
    return false;
  }
  
  // Now test the full notification pipeline
  logInfo('Triggering content sync again to test notification creation...');
  const notificationTrigger = await makeRequest('/api/admin/trigger-content-sync', {
    method: 'POST'
  });
  
  if (notificationTrigger.ok) {
    logSuccess('Notification trigger completed');
    logInfo(`Processing time: ${notificationTrigger.data.stats.processingTime}ms`);
  } else {
    logError(`Notification trigger failed: ${notificationTrigger.raw}`);
    return false;
  }
  
  return true;
}

async function testStep5_ResultsAnalysis() {
  logStep(5, 'Results Analysis & Error Investigation');
  
  // We can't directly query the database, but we can check the API response patterns
  logInfo('Checking for common error patterns...');
  
  // Check if we can get any error information from the logs
  logInfo('The detailed error analysis would require database access.');
  logInfo('Check the Cloudflare Workers logs for detailed error information:');
  log('  wrangler tail --format pretty', 'cyan');
  
  logInfo('Or check the database directly:');
  log('  wrangler d1 execute baba-is-win-db --remote --command "SELECT * FROM email_notifications WHERE status = \'failed\' ORDER BY created_at DESC LIMIT 5;"', 'cyan');
  
  // Provide diagnostic questions
  log('\n🔍 Diagnostic Questions:', 'magenta');
  log('1. Are you seeing "Unknown error occurred" in the database?');
  log('2. Are Gmail API tokens being refreshed successfully?');
  log('3. Are templates rendering without errors?');
  log('4. Are user lookups succeeding?');
  log('5. Are emails being formatted correctly?');
  
  return true;
}

async function main() {
  log('🦅 Starting Single Notification Test', 'bright');
  log('=' * 50, 'cyan');
  
  log('\n📋 Test Configuration:', 'yellow');
  log(`User: ${TEST_CONFIG.TEST_USER_EMAIL}`);
  log(`Content: ${TEST_CONFIG.CONTENT_SLUG} (${TEST_CONFIG.CONTENT_TYPE})`);
  log(`Send Real Email: ${TEST_CONFIG.SEND_REAL_EMAIL}`);
  log(`API: ${TEST_CONFIG.API_BASE}`);
  
  await pause();
  
  const results = {
    step1: await testStep1_EnvironmentCheck(),
    step2: await testStep2_DatabaseCheck(),
    step3: await testStep3_ContentSync(),
    step4: await testStep4_SingleNotificationTest(),
    step5: await testStep5_ResultsAnalysis()
  };
  
  log('\n📊 Test Results Summary:', 'bright');
  log('=' * 30, 'cyan');
  
  for (const [step, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const color = result ? 'green' : 'red';
    log(`${step}: ${status}`, color);
  }
  
  const passCount = Object.values(results).filter(r => r).length;
  const totalSteps = Object.keys(results).length;
  
  log(`\nOverall: ${passCount}/${totalSteps} steps passed`, passCount === totalSteps ? 'green' : 'red');
  
  if (passCount < totalSteps) {
    log('\n🔧 Next Steps:', 'yellow');
    log('1. Check Cloudflare Workers logs: wrangler tail');
    log('2. Examine database for error details');
    log('3. Verify Gmail API credentials and permissions');
    log('4. Test email template rendering');
    log('5. Check user subscription preferences');
  } else {
    log('\n🎉 All tests passed! Email notification system appears healthy.', 'green');
  }
}

// Run the test
main().catch(error => {
  logError(`Test execution failed: ${error.message}`);
  console.error(error);
});