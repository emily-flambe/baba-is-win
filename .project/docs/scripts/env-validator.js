#!/usr/bin/env node

/**
 * Environment Variables Validator
 * ==============================
 * 
 * This script validates environment configurations across different files
 * and ensures consistency between development and production setups.
 * 
 * Usage:
 *   node .project/scripts/env-validator.js [options]
 * 
 * Options:
 *   --fix        Attempt to fix common issues automatically
 *   --strict     Use strict validation (fail on warnings)
 *   --verbose    Show detailed output
 *   --help       Show this help message
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

// Validation rules
const VALIDATION_RULES = {
  // Required environment variables for basic functionality
  required: [
    'JWT_SECRET',
    'CRON_SECRET'
  ],
  
  // Required for specific features
  conditionallyRequired: {
    'Google OAuth': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
    'Email (Resend)': ['RESEND_API_KEY'],
    'Email (Gmail)': ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']
  },
  
  // Variables that should match patterns
  patterns: {
    'JWT_SECRET': /^.{32,}$/, // At least 32 characters
    'GOOGLE_CLIENT_ID': /\.apps\.googleusercontent\.com$/,
    'RESEND_API_KEY': /^re_/,
    'GOOGLE_REDIRECT_URI': /^https?:\/\/.+\/api\/auth\/google\/callback$/
  },
  
  // Development vs production considerations
  development: {
    allowedInsecure: ['JWT_SECRET', 'API_KEY_SALT', 'CRON_SECRET'],
    requiredFormat: {
      'GOOGLE_REDIRECT_URI': 'http://localhost:8788/api/auth/google/callback'
    }
  },
  
  production: {
    forbidden: [
      'dev-secret-key-for-local-testing-only',
      'dev-salt-for-api-keys-local-testing-only',
      'dev-cron-secret-change-in-production'
    ]
  }
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    fix: args.includes('--fix'),
    strict: args.includes('--strict'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help')
  };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Environment Variables Validator
==============================

This script validates environment configurations and ensures consistency.

Usage:
  node .project/scripts/env-validator.js [options]

Options:
  --fix        Attempt to fix common issues automatically
  --strict     Use strict validation (fail on warnings)
  --verbose    Show detailed output
  --help       Show this help message

What this script validates:
  1. Required environment variables are present
  2. Variable values match expected patterns
  3. Development vs production configuration safety
  4. Consistency across different environment files
  5. Cloudflare Workers specific requirements

Examples:
  node .project/scripts/env-validator.js --verbose
  node .project/scripts/env-validator.js --fix --strict
`);
}

/**
 * Parse environment file content
 */
function parseEnvFile(content) {
  const variables = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Parse variable assignments
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      variables[key.trim()] = value.trim();
    }
  }
  
  return variables;
}

/**
 * Load environment files
 */
async function loadEnvFiles() {
  const envFiles = [
    { path: '.env.example', name: 'Example Template' },
    { path: '.env.local.example', name: 'Local Example' },
    { path: '.project/.env.example', name: 'Project Template' },
    { path: '.dev.vars', name: 'Wrangler Development' }
  ];
  
  const loadedFiles = {};
  
  for (const file of envFiles) {
    const fullPath = path.join(PROJECT_ROOT, file.path);
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      loadedFiles[file.path] = {
        name: file.name,
        content,
        variables: parseEnvFile(content),
        exists: true
      };
    } catch (error) {
      loadedFiles[file.path] = {
        name: file.name,
        exists: false,
        error: error.message
      };
    }
  }
  
  return loadedFiles;
}

/**
 * Validate required variables
 */
function validateRequired(variables, environment = 'development') {
  const issues = [];
  
  // Check absolutely required variables
  for (const required of VALIDATION_RULES.required) {
    if (!variables[required]) {
      issues.push({
        type: 'error',
        category: 'missing-required',
        variable: required,
        message: `Missing required variable: ${required}`
      });
    }
  }
  
  return issues;
}

/**
 * Validate variable patterns
 */
function validatePatterns(variables) {
  const issues = [];
  
  for (const [variable, pattern] of Object.entries(VALIDATION_RULES.patterns)) {
    if (variables[variable] && !pattern.test(variables[variable])) {
      issues.push({
        type: 'warning',
        category: 'invalid-pattern',
        variable,
        message: `Variable ${variable} doesn't match expected pattern`,
        expected: pattern.toString()
      });
    }
  }
  
  return issues;
}

/**
 * Validate production safety
 */
function validateProductionSafety(variables, environment = 'development') {
  const issues = [];
  
  if (environment === 'production') {
    // Check for forbidden development values
    for (const [variable, value] of Object.entries(variables)) {
      if (VALIDATION_RULES.production.forbidden.some(forbidden => 
        value.includes(forbidden))) {
        issues.push({
          type: 'error',
          category: 'production-unsafe',
          variable,
          message: `Variable ${variable} contains development-only value in production`,
          value: value.substring(0, 20) + '...'
        });
      }
    }
  }
  
  return issues;
}

/**
 * Validate Cloudflare Workers requirements
 */
function validateCloudflareWorkers(variables) {
  const issues = [];
  
  // Check for .dev.vars specific requirements
  if (!variables.JWT_SECRET) {
    issues.push({
      type: 'error',
      category: 'cloudflare-workers',
      variable: 'JWT_SECRET',
      message: 'JWT_SECRET is required for Cloudflare Workers auth endpoints'
    });
  }
  
  // Warn about variables that should be secrets
  const shouldBeSecrets = ['JWT_SECRET', 'API_KEY_SALT', 'GOOGLE_CLIENT_SECRET', 'RESEND_API_KEY'];
  for (const secretVar of shouldBeSecrets) {
    if (variables[secretVar]) {
      issues.push({
        type: 'info',
        category: 'cloudflare-secrets',
        variable: secretVar,
        message: `In production, use: wrangler secret put ${secretVar}`
      });
    }
  }
  
  return issues;
}

/**
 * Check consistency across files
 */
function validateConsistency(envFiles) {
  const issues = [];
  const allVariables = new Set();
  
  // Collect all variables across files
  for (const file of Object.values(envFiles)) {
    if (file.exists && file.variables) {
      Object.keys(file.variables).forEach(key => allVariables.add(key));
    }
  }
  
  // Check if important variables are consistent across files
  const importantVars = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'RESEND_API_KEY'];
  
  for (const variable of importantVars) {
    const filesWithVar = Object.entries(envFiles)
      .filter(([, file]) => file.exists && file.variables && variable in file.variables)
      .map(([path, file]) => ({ path, value: file.variables[variable] }));
    
    if (filesWithVar.length > 1) {
      const values = new Set(filesWithVar.map(f => f.value));
      if (values.size > 1) {
        issues.push({
          type: 'warning',
          category: 'inconsistent-values',
          variable,
          message: `Variable ${variable} has different values across files`,
          files: filesWithVar.map(f => f.path)
        });
      }
    }
  }
  
  return issues;
}

/**
 * Generate validation report
 */
function generateReport(envFiles, allIssues) {
  let report = `# Environment Variables Validation Report
Generated: ${new Date().toISOString()}

## Files Checked
`;

  for (const [path, file] of Object.entries(envFiles)) {
    if (file.exists) {
      const varCount = Object.keys(file.variables || {}).length;
      report += `- ✅ **${path}** (${file.name}): ${varCount} variables\n`;
    } else {
      report += `- ❌ **${path}** (${file.name}): Missing\n`;
    }
  }

  report += `\n## Validation Results\n`;

  // Group issues by type
  const grouped = allIssues.reduce((acc, issue) => {
    const key = `${issue.type}-${issue.category}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(issue);
    return acc;
  }, {});

  let hasErrors = false;
  let hasWarnings = false;

  for (const [key, issues] of Object.entries(grouped)) {
    const [type, category] = key.split('-');
    
    if (type === 'error') hasErrors = true;
    if (type === 'warning') hasWarnings = true;
    
    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    
    report += `\n### ${icon} ${category.replace('-', ' ').toUpperCase()}\n`;
    
    for (const issue of issues) {
      report += `- **${issue.variable || 'General'}**: ${issue.message}\n`;
      if (issue.expected) report += `  - Expected: ${issue.expected}\n`;
      if (issue.files) report += `  - Files: ${issue.files.join(', ')}\n`;
    }
  }

  if (!hasErrors && !hasWarnings) {
    report += '\n✅ All validations passed!\n';
  }

  return { report, hasErrors, hasWarnings };
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
  
  console.log('🐻 Bear Environment Validator - Checking configurations...\n');
  
  try {
    // Load all environment files
    if (options.verbose) console.log('📁 Loading environment files...');
    const envFiles = await loadEnvFiles();
    
    // Validate each file
    const allIssues = [];
    
    for (const [path, file] of Object.entries(envFiles)) {
      if (!file.exists) {
        if (path === '.dev.vars') {
          allIssues.push({
            type: 'warning',
            category: 'missing-file',
            message: `Missing ${path} - run setup-dev-env.js to create it`
          });
        }
        continue;
      }
      
      if (options.verbose) console.log(`🔍 Validating ${path}...`);
      
      // Determine environment type
      const environment = path.includes('dev') || path.includes('local') ? 'development' : 'unknown';
      
      // Run validations
      allIssues.push(...validateRequired(file.variables, environment));
      allIssues.push(...validatePatterns(file.variables));
      allIssues.push(...validateProductionSafety(file.variables, environment));
      allIssues.push(...validateCloudflareWorkers(file.variables));
    }
    
    // Check consistency across files
    allIssues.push(...validateConsistency(envFiles));
    
    // Generate report
    const { report, hasErrors, hasWarnings } = generateReport(envFiles, allIssues);
    
    console.log(report);
    
    // Handle results
    if (hasErrors) {
      console.log('\n❌ Validation failed with errors!');
      if (options.strict) {
        process.exit(1);
      }
    } else if (hasWarnings) {
      console.log('\n⚠️ Validation completed with warnings.');
      if (options.strict) {
        process.exit(1);
      }
    } else {
      console.log('\n🎉 Environment validation passed!');
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
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

export { main, parseEnvFile, validateRequired, validatePatterns };