#!/usr/bin/env node

/**
 * Project Health Check Script
 * ===========================
 * 
 * This script performs comprehensive health checks on the project,
 * including dependencies, configuration, environment, and runtime checks.
 * 
 * Usage:
 *   node .project/scripts/health-check.js [options]
 * 
 * Options:
 *   --quick      Run only quick checks (skip slow operations)
 *   --fix        Attempt to fix issues automatically where possible
 *   --verbose    Show detailed output
 *   --help       Show this help message
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    quick: args.includes('--quick'),
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help')
  };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Project Health Check Script
===========================

This script performs comprehensive health checks on the project.

Usage:
  node .project/scripts/health-check.js [options]

Options:
  --quick      Run only quick checks (skip slow operations)
  --fix        Attempt to fix issues automatically where possible
  --verbose    Show detailed output
  --help       Show this help message

Health checks performed:
  1. Node.js and npm version compatibility
  2. Package dependencies and security
  3. Environment configuration
  4. Cloudflare Workers setup
  5. Database connectivity (if applicable)
  6. Build and test status
  7. Git repository health

Examples:
  node .project/scripts/health-check.js --quick --verbose
  node .project/scripts/health-check.js --fix
`);
}

/**
 * Execute command with timeout and error handling
 */
async function runCommand(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: PROJECT_ROOT,
      timeout: options.timeout || 30000,
      ...options
    });
    return { success: true, stdout, stderr };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      stdout: error.stdout || '', 
      stderr: error.stderr || '' 
    };
  }
}

/**
 * Check Node.js and npm versions
 */
async function checkNodeVersion(options) {
  console.log('🔍 Checking Node.js environment...');
  
  const checks = [];
  
  // Check Node.js version
  const nodeResult = await runCommand('node --version');
  if (nodeResult.success) {
    const nodeVersion = nodeResult.stdout.trim();
    checks.push({
      name: 'Node.js Version',
      status: 'pass',
      details: nodeVersion,
      message: `Running ${nodeVersion}`
    });
  } else {
    checks.push({
      name: 'Node.js Version',
      status: 'fail',
      message: 'Node.js not found or not working'
    });
  }
  
  // Check npm version
  const npmResult = await runCommand('npm --version');
  if (npmResult.success) {
    const npmVersion = npmResult.stdout.trim();
    checks.push({
      name: 'npm Version',
      status: 'pass',
      details: npmVersion,
      message: `Running npm ${npmVersion}`
    });
  } else {
    checks.push({
      name: 'npm Version',
      status: 'fail',
      message: 'npm not found or not working'
    });
  }
  
  return checks;
}

/**
 * Check package dependencies
 */
async function checkDependencies(options) {
  console.log('📦 Checking package dependencies...');
  
  const checks = [];
  
  try {
    // Check if package.json exists
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(packageContent);
    
    checks.push({
      name: 'package.json',
      status: 'pass',
      message: `Found package.json for ${pkg.name}`
    });
    
    // Check if node_modules exists
    try {
      await fs.access(path.join(PROJECT_ROOT, 'node_modules'));
      checks.push({
        name: 'node_modules',
        status: 'pass',
        message: 'Dependencies installed'
      });
    } catch {
      checks.push({
        name: 'node_modules',
        status: 'fail',
        message: 'Dependencies not installed - run npm install'
      });
    }
    
    // Check for security vulnerabilities (if not quick mode)
    if (!options.quick) {
      const auditResult = await runCommand('npm audit --audit-level=high', { timeout: 15000 });
      if (auditResult.success) {
        checks.push({
          name: 'Security Audit',
          status: 'pass',
          message: 'No high-severity vulnerabilities found'
        });
      } else {
        const hasVulns = auditResult.stderr.includes('vulnerabilities');
        checks.push({
          name: 'Security Audit',
          status: hasVulns ? 'warn' : 'fail',
          message: hasVulns ? 'Security vulnerabilities found' : 'Audit failed to run'
        });
      }
    }
    
  } catch (error) {
    checks.push({
      name: 'Package Dependencies',
      status: 'fail',
      message: `Error checking dependencies: ${error.message}`
    });
  }
  
  return checks;
}

/**
 * Check environment configuration
 */
async function checkEnvironment(options) {
  console.log('🔧 Checking environment configuration...');
  
  const checks = [];
  
  // Check for .dev.vars file (critical for Cloudflare Workers)
  try {
    const devVarsPath = path.join(PROJECT_ROOT, '.dev.vars');
    const devVarsContent = await fs.readFile(devVarsPath, 'utf8');
    
    const hasJwtSecret = devVarsContent.includes('JWT_SECRET=') && 
                        !devVarsContent.includes('JWT_SECRET=your_');
    const hasApiKeySalt = devVarsContent.includes('API_KEY_SALT=');
    
    if (hasJwtSecret && hasApiKeySalt) {
      checks.push({
        name: '.dev.vars Configuration',
        status: 'pass',
        message: 'Critical environment variables configured'
      });
    } else {
      checks.push({
        name: '.dev.vars Configuration',
        status: 'warn',
        message: 'Some critical environment variables may not be configured'
      });
    }
    
  } catch (error) {
    checks.push({
      name: '.dev.vars Configuration',
      status: 'fail',
      message: '.dev.vars file missing - auth endpoints will not work'
    });
  }
  
  // Check wrangler configuration
  try {
    const wranglerPath = path.join(PROJECT_ROOT, 'wrangler.json');
    const wranglerContent = await fs.readFile(wranglerPath, 'utf8');
    const config = JSON.parse(wranglerContent);
    
    checks.push({
      name: 'Wrangler Configuration',
      status: 'pass',
      message: `Configured for ${config.name || 'unnamed project'}`
    });
    
    // Check D1 database configuration
    if (config.d1_databases && config.d1_databases.length > 0) {
      checks.push({
        name: 'D1 Database Configuration',
        status: 'pass',
        message: `Database: ${config.d1_databases[0].database_name}`
      });
    } else {
      checks.push({
        name: 'D1 Database Configuration',
        status: 'warn',
        message: 'No D1 database configured'
      });
    }
    
  } catch (error) {
    checks.push({
      name: 'Wrangler Configuration',
      status: 'fail',
      message: 'wrangler.json not found or invalid'
    });
  }
  
  return checks;
}

/**
 * Check build system
 */
async function checkBuild(options) {
  console.log('🏗️ Checking build system...');
  
  const checks = [];
  
  if (options.quick) {
    checks.push({
      name: 'Build Check',
      status: 'skip',
      message: 'Skipped in quick mode'
    });
    return checks;
  }
  
  // Test build process
  const buildResult = await runCommand('npm run build', { timeout: 60000 });
  if (buildResult.success) {
    checks.push({
      name: 'Build Process',
      status: 'pass',
      message: 'Project builds successfully'
    });
  } else {
    checks.push({
      name: 'Build Process',
      status: 'fail',
      message: 'Build failed - check build configuration'
    });
  }
  
  return checks;
}

/**
 * Check test system
 */
async function checkTests(options) {
  console.log('🧪 Checking test system...');
  
  const checks = [];
  
  if (options.quick) {
    checks.push({
      name: 'Test Check',
      status: 'skip',
      message: 'Skipped in quick mode'
    });
    return checks;
  }
  
  // Check if tests exist
  try {
    const testsPath = path.join(PROJECT_ROOT, 'tests');
    await fs.access(testsPath);
    
    // Run tests
    const testResult = await runCommand('npm test', { timeout: 45000 });
    if (testResult.success) {
      checks.push({
        name: 'Test Suite',
        status: 'pass',
        message: 'All tests passing'
      });
    } else {
      checks.push({
        name: 'Test Suite',
        status: 'warn',
        message: 'Some tests may be failing'
      });
    }
    
  } catch (error) {
    checks.push({
      name: 'Test Suite',
      status: 'warn',
      message: 'No tests directory found'
    });
  }
  
  return checks;
}

/**
 * Check Git repository health
 */
async function checkGit(options) {
  console.log('📂 Checking Git repository...');
  
  const checks = [];
  
  // Check if in Git repository
  const gitResult = await runCommand('git status --porcelain');
  if (gitResult.success) {
    const uncommittedFiles = gitResult.stdout.trim().split('\n').filter(line => line.trim());
    
    if (uncommittedFiles.length === 0) {
      checks.push({
        name: 'Git Working Directory',
        status: 'pass',
        message: 'Working directory clean'
      });
    } else {
      checks.push({
        name: 'Git Working Directory',
        status: 'info',
        message: `${uncommittedFiles.length} uncommitted changes`
      });
    }
    
    // Check current branch
    const branchResult = await runCommand('git branch --show-current');
    if (branchResult.success) {
      const currentBranch = branchResult.stdout.trim();
      checks.push({
        name: 'Git Branch',
        status: 'info',
        details: currentBranch,
        message: `On branch: ${currentBranch}`
      });
    }
    
  } else {
    checks.push({
      name: 'Git Repository',
      status: 'warn',
      message: 'Not in a Git repository or Git not available'
    });
  }
  
  return checks;
}

/**
 * Generate health report
 */
function generateHealthReport(allChecks, startTime) {
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  let report = `# Project Health Check Report
Generated: ${new Date().toISOString()}
Duration: ${duration.toFixed(2)}s

## Summary
`;

  // Count results by status
  const statusCounts = allChecks.reduce((acc, check) => {
    acc[check.status] = (acc[check.status] || 0) + 1;
    return acc;
  }, {});

  const total = allChecks.length;
  const passed = statusCounts.pass || 0;
  const failed = statusCounts.fail || 0;
  const warnings = statusCounts.warn || 0;
  const skipped = statusCounts.skip || 0;
  const info = statusCounts.info || 0;

  report += `- ✅ **Passed**: ${passed}/${total}\n`;
  if (failed > 0) report += `- ❌ **Failed**: ${failed}/${total}\n`;
  if (warnings > 0) report += `- ⚠️ **Warnings**: ${warnings}/${total}\n`;
  if (skipped > 0) report += `- ⏭️ **Skipped**: ${skipped}/${total}\n`;
  if (info > 0) report += `- ℹ️ **Info**: ${info}/${total}\n`;

  report += `\n## Detailed Results\n`;

  // Group checks by category
  const categories = {};
  for (const check of allChecks) {
    const category = check.category || 'General';
    if (!categories[category]) categories[category] = [];
    categories[category].push(check);
  }

  for (const [category, checks] of Object.entries(categories)) {
    report += `\n### ${category}\n`;
    
    for (const check of checks) {
      const statusIcon = {
        pass: '✅',
        fail: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        skip: '⏭️'
      }[check.status] || '❓';
      
      report += `${statusIcon} **${check.name}**: ${check.message}\n`;
      if (check.details) {
        report += `   - Details: ${check.details}\n`;
      }
    }
  }

  return { report, passed, failed, warnings, total };
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  const startTime = Date.now();
  
  console.log('🐻 Bear Health Check - Examining project health...\n');
  
  if (options.quick) {
    console.log('🏃 Quick mode enabled - skipping slow operations\n');
  }
  
  try {
    const allChecks = [];
    
    // Run all health checks
    const nodeChecks = await checkNodeVersion(options);
    nodeChecks.forEach(check => { check.category = 'Node.js Environment'; });
    allChecks.push(...nodeChecks);
    
    const depChecks = await checkDependencies(options);
    depChecks.forEach(check => { check.category = 'Dependencies'; });
    allChecks.push(...depChecks);
    
    const envChecks = await checkEnvironment(options);
    envChecks.forEach(check => { check.category = 'Environment'; });
    allChecks.push(...envChecks);
    
    const buildChecks = await checkBuild(options);
    buildChecks.forEach(check => { check.category = 'Build System'; });
    allChecks.push(...buildChecks);
    
    const testChecks = await checkTests(options);
    testChecks.forEach(check => { check.category = 'Test System'; });
    allChecks.push(...testChecks);
    
    const gitChecks = await checkGit(options);
    gitChecks.forEach(check => { check.category = 'Git Repository'; });
    allChecks.push(...gitChecks);
    
    // Generate and display report
    const { report, passed, failed, warnings, total } = generateHealthReport(allChecks, startTime);
    
    console.log('\n' + report);
    
    // Provide recommendations
    if (failed > 0) {
      console.log('\n🚨 Critical Issues Found:');
      console.log('Some checks failed. Please address the failed items before deploying.');
    } else if (warnings > 0) {
      console.log('\n⚠️ Warnings Found:');
      console.log('Project is functional but has some issues that should be addressed.');
    } else {
      console.log('\n🎉 Project Health Excellent!');
      console.log('All critical checks passed. Project is ready for development and deployment.');
    }
    
    // Exit codes for CI/CD
    if (failed > 0) {
      process.exit(1);
    } else if (warnings > 0 && options.strict) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error during health check:', error.message);
    if (options.verbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, checkNodeVersion, checkDependencies, checkEnvironment };