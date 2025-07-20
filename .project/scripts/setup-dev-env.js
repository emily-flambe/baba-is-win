#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * ===================================
 * 
 * This script automates the setup of the local development environment,
 * ensuring all necessary files and configurations are in place.
 * 
 * Usage:
 *   node .project/scripts/setup-dev-env.js [options]
 * 
 * Options:
 *   --force      Overwrite existing files
 *   --dry-run    Show what would be done without making changes
 *   --verbose    Show detailed output
 *   --help       Show this help message
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help')
  };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Development Environment Setup Script
===================================

This script automates the setup of the local development environment.

Usage:
  node .project/scripts/setup-dev-env.js [options]

Options:
  --force      Overwrite existing files
  --dry-run    Show what would be done without making changes
  --verbose    Show detailed output
  --help       Show this help message

What this script does:
  1. Creates .dev.vars file from template (for Cloudflare Workers)
  2. Checks for required dependencies
  3. Validates wrangler configuration
  4. Sets up development database if needed
  5. Provides setup verification and next steps

Examples:
  node .project/scripts/setup-dev-env.js --dry-run --verbose
  node .project/scripts/setup-dev-env.js --force
`);
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create .dev.vars file for Cloudflare Workers development
 */
async function createDevVars(options) {
  const devVarsPath = path.join(PROJECT_ROOT, '.dev.vars');
  const templatePath = path.join(PROJECT_ROOT, '.project/.env.example');
  
  const exists = await fileExists(devVarsPath);
  
  if (exists && !options.force) {
    console.log('ℹ️  .dev.vars already exists (use --force to overwrite)');
    return false;
  }
  
  try {
    // Read template
    const template = await fs.readFile(templatePath, 'utf8');
    
    // Extract only the essential variables needed for .dev.vars
    const essentialVars = [
      'JWT_SECRET=dev-secret-key-for-local-testing-only-never-use-in-production',
      'API_KEY_SALT=dev-salt-for-api-keys-local-testing-only',
      'CRON_SECRET=dev-cron-secret-change-in-production',
      '',
      '# Add your actual values below:',
      '# GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com',
      '# GOOGLE_CLIENT_SECRET=your_google_client_secret_here',
      '# GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/google/callback',
      '# RESEND_API_KEY=re_your_resend_api_key_here',
      '# RESEND_FROM_EMAIL=noreply@yourdomain.com'
    ];
    
    const devVarsContent = `# Cloudflare Workers Development Variables
# This file is used by 'wrangler dev' for local development
# Copy from .project/.env.example and uncomment variables you need

${essentialVars.join('\n')}
`;
    
    if (options.dryRun) {
      console.log('📝 Would create .dev.vars with content:');
      console.log(devVarsContent);
      return true;
    }
    
    await fs.writeFile(devVarsPath, devVarsContent);
    console.log('✅ Created .dev.vars file for Cloudflare Workers development');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating .dev.vars:', error.message);
    return false;
  }
}

/**
 * Check Node.js and package manager setup
 */
async function checkNodeSetup() {
  console.log('🔍 Checking Node.js setup...');
  
  try {
    // Check package.json
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(packageContent);
    
    console.log(`📦 Project: ${pkg.name} (${pkg.version || 'no version'})`);
    
    // Check if node_modules exists
    const nodeModulesExists = await fileExists(path.join(PROJECT_ROOT, 'node_modules'));
    if (!nodeModulesExists) {
      console.log('⚠️  node_modules not found - run npm install');
      return false;
    }
    
    console.log('✅ Node.js setup looks good');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking Node.js setup:', error.message);
    return false;
  }
}

/**
 * Check Cloudflare Workers configuration
 */
async function checkWranglerConfig() {
  console.log('🔍 Checking Wrangler configuration...');
  
  try {
    // Check wrangler.json
    const wranglerPath = path.join(PROJECT_ROOT, 'wrangler.json');
    const wranglerExists = await fileExists(wranglerPath);
    
    if (!wranglerExists) {
      console.log('⚠️  wrangler.json not found');
      return false;
    }
    
    const wranglerContent = await fs.readFile(wranglerPath, 'utf8');
    const config = JSON.parse(wranglerContent);
    
    console.log(`📋 Wrangler config: ${config.name || 'unnamed'}`);
    
    // Check for D1 database configuration
    if (config.d1_databases && config.d1_databases.length > 0) {
      console.log(`💾 D1 Database: ${config.d1_databases[0].database_name}`);
    } else {
      console.log('⚠️  No D1 database configured');
    }
    
    console.log('✅ Wrangler configuration found');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking Wrangler config:', error.message);
    return false;
  }
}

/**
 * Check database setup
 */
async function checkDatabaseSetup() {
  console.log('🔍 Checking database setup...');
  
  try {
    // Check for migrations directory
    const migrationsPath = path.join(PROJECT_ROOT, 'migrations');
    const migrationsExist = await fileExists(migrationsPath);
    
    if (!migrationsExist) {
      console.log('⚠️  No migrations directory found');
      return false;
    }
    
    // Count migration files
    const migrations = await fs.readdir(migrationsPath);
    const sqlMigrations = migrations.filter(f => f.endsWith('.sql'));
    
    console.log(`📊 Found ${sqlMigrations.length} database migrations`);
    
    // Check for setup script
    const setupScriptPath = path.join(PROJECT_ROOT, 'scripts/setup-db.sh');
    const setupScriptExists = await fileExists(setupScriptPath);
    
    if (setupScriptExists) {
      console.log('✅ Database setup script found');
    } else {
      console.log('ℹ️  No database setup script found');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking database setup:', error.message);
    return false;
  }
}

/**
 * Provide setup verification and next steps
 */
function provideNextSteps(results) {
  console.log('\n📋 Setup Summary:');
  
  if (results.devVars) {
    console.log('✅ .dev.vars file ready');
  } else {
    console.log('❌ .dev.vars file needs attention');
  }
  
  if (results.nodeSetup) {
    console.log('✅ Node.js environment ready');
  } else {
    console.log('❌ Node.js environment needs setup');
  }
  
  if (results.wranglerConfig) {
    console.log('✅ Wrangler configuration found');
  } else {
    console.log('❌ Wrangler configuration missing');
  }
  
  if (results.database) {
    console.log('✅ Database setup ready');
  } else {
    console.log('❌ Database setup needs attention');
  }
  
  console.log('\n🚀 Next Steps:');
  
  if (!results.nodeSetup) {
    console.log('1. Run: npm install');
  }
  
  if (!results.devVars) {
    console.log('2. Create .dev.vars file with your environment variables');
  }
  
  console.log('3. Update .dev.vars with your actual credentials:');
  console.log('   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (for OAuth)');
  console.log('   - RESEND_API_KEY (for email functionality)');
  
  console.log('4. Start development server:');
  console.log('   npm run dev');
  
  console.log('\n💡 Troubleshooting:');
  console.log('- If auth endpoints fail: Check JWT_SECRET in .dev.vars');
  console.log('- If OAuth login fails: Check Google OAuth credentials');
  console.log('- If emails don\'t send: Check RESEND_API_KEY');
  console.log('- If database errors: Run database migrations');
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
  
  console.log('🐻 Bear Development Environment Setup\n');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }
  
  try {
    const results = {};
    
    // Create .dev.vars file
    results.devVars = await createDevVars(options);
    
    // Check Node.js setup
    results.nodeSetup = await checkNodeSetup();
    
    // Check Wrangler configuration
    results.wranglerConfig = await checkWranglerConfig();
    
    // Check database setup
    results.database = await checkDatabaseSetup();
    
    // Provide next steps
    provideNextSteps(results);
    
    const allGood = Object.values(results).every(Boolean);
    
    if (allGood) {
      console.log('\n🎉 Development environment setup completed successfully!');
    } else {
      console.log('\n⚠️  Some setup steps need attention. See next steps above.');
    }
    
  } catch (error) {
    console.error('❌ Error setting up development environment:', error.message);
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

export { main, createDevVars, checkNodeSetup, checkWranglerConfig };