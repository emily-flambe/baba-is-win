#!/usr/bin/env node

/**
 * Package Management Utility
 * ==========================
 * 
 * This script helps manage dependencies, security updates, and package maintenance.
 * 
 * Usage:
 *   node .project/scripts/package-manager.js [command] [options]
 * 
 * Commands:
 *   audit       Run security audit and show vulnerabilities
 *   update      Update packages (with safety checks)
 *   clean       Clean and reinstall node_modules
 *   outdated    Show outdated packages
 *   info        Show package information and statistics
 * 
 * Options:
 *   --fix       Attempt to fix issues automatically
 *   --force     Force operations (use with caution)
 *   --verbose   Show detailed output
 *   --help      Show this help message
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
  const command = args[0] || 'info';
  
  return {
    command,
    fix: args.includes('--fix'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help')
  };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Package Management Utility
==========================

This script helps manage dependencies, security updates, and package maintenance.

Usage:
  node .project/scripts/package-manager.js [command] [options]

Commands:
  audit       Run security audit and show vulnerabilities
  update      Update packages (with safety checks)  
  clean       Clean and reinstall node_modules
  outdated    Show outdated packages
  info        Show package information and statistics (default)

Options:
  --fix       Attempt to fix issues automatically
  --force     Force operations (use with caution)
  --verbose   Show detailed output
  --help      Show this help message

Examples:
  node .project/scripts/package-manager.js audit --verbose
  node .project/scripts/package-manager.js update --fix
  node .project/scripts/package-manager.js clean --force
`);
}

/**
 * Execute command with error handling
 */
async function runCommand(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: PROJECT_ROOT,
      timeout: options.timeout || 60000,
      ...options
    });
    return { success: true, stdout, stderr };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      stdout: error.stdout || '', 
      stderr: error.stderr || '',
      code: error.code
    };
  }
}

/**
 * Get package.json information
 */
async function getPackageInfo() {
  try {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const content = await fs.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(content);
    
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      scripts: pkg.scripts || {},
      engines: pkg.engines || {}
    };
  } catch (error) {
    throw new Error(`Could not read package.json: ${error.message}`);
  }
}

/**
 * Show package information
 */
async function showPackageInfo(options) {
  console.log('📦 Package Information\n');
  
  try {
    const pkg = await getPackageInfo();
    
    console.log(`**${pkg.name}** ${pkg.version ? `v${pkg.version}` : '(no version)'}`);
    if (pkg.description) {
      console.log(`${pkg.description}\n`);
    }
    
    const depCount = Object.keys(pkg.dependencies).length;
    const devDepCount = Object.keys(pkg.devDependencies).length;
    const scriptCount = Object.keys(pkg.scripts).length;
    
    console.log(`📊 **Statistics:**`);
    console.log(`- Production dependencies: ${depCount}`);
    console.log(`- Development dependencies: ${devDepCount}`);
    console.log(`- NPM scripts: ${scriptCount}`);
    
    if (Object.keys(pkg.engines).length > 0) {
      console.log(`\n🔧 **Engine Requirements:**`);
      for (const [engine, version] of Object.entries(pkg.engines)) {
        console.log(`- ${engine}: ${version}`);
      }
    }
    
    if (options.verbose) {
      console.log(`\n📦 **Production Dependencies:**`);
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        console.log(`- ${name}: ${version}`);
      }
      
      console.log(`\n🛠️ **Development Dependencies:**`);
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        console.log(`- ${name}: ${version}`);
      }
    }
    
    // Check node_modules size
    try {
      const nodeModulesPath = path.join(PROJECT_ROOT, 'node_modules');
      await fs.access(nodeModulesPath);
      
      const sizeResult = await runCommand('du -sh node_modules', { timeout: 10000 });
      if (sizeResult.success) {
        const size = sizeResult.stdout.trim().split('\t')[0];
        console.log(`\n💾 **node_modules size:** ${size}`);
      }
    } catch (error) {
      console.log(`\n💾 **node_modules:** Not installed`);
    }
    
  } catch (error) {
    console.error('❌ Error getting package info:', error.message);
  }
}

/**
 * Run security audit
 */
async function runSecurityAudit(options) {
  console.log('🔍 Running Security Audit\n');
  
  // Run npm audit
  const auditResult = await runCommand('npm audit --json', { timeout: 30000 });
  
  if (auditResult.success) {
    try {
      const auditData = JSON.parse(auditResult.stdout);
      
      if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
        console.log('⚠️ Security vulnerabilities found:\n');
        
        const vulnsByLevel = {};
        for (const [pkg, vuln] of Object.entries(auditData.vulnerabilities)) {
          const level = vuln.severity;
          if (!vulnsByLevel[level]) vulnsByLevel[level] = [];
          vulnsByLevel[level].push({ pkg, ...vuln });
        }
        
        // Show vulnerabilities by severity
        const severityOrder = ['critical', 'high', 'moderate', 'low'];
        for (const severity of severityOrder) {
          if (vulnsByLevel[severity]) {
            const icon = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : 'ℹ️';
            console.log(`${icon} **${severity.toUpperCase()}** (${vulnsByLevel[severity].length})`);
            
            if (options.verbose) {
              for (const vuln of vulnsByLevel[severity]) {
                console.log(`  - ${vuln.pkg}: ${vuln.via.join(', ')}`);
              }
            }
          }
        }
        
        if (options.fix) {
          console.log('\n🔧 Attempting to fix vulnerabilities...');
          const fixResult = await runCommand('npm audit fix', { timeout: 60000 });
          
          if (fixResult.success) {
            console.log('✅ Attempted automatic fixes');
            if (fixResult.stdout) {
              console.log(fixResult.stdout);
            }
          } else {
            console.log('❌ Could not fix vulnerabilities automatically');
            if (fixResult.stderr) {
              console.log(fixResult.stderr);
            }
          }
        } else {
          console.log('\n💡 Run with --fix to attempt automatic fixes');
        }
        
      } else {
        console.log('✅ No security vulnerabilities found!');
      }
      
    } catch (error) {
      // Fallback to text output
      console.log('📋 Audit results:');
      console.log(auditResult.stdout);
    }
    
  } else {
    console.error('❌ Security audit failed:', auditResult.error);
    if (auditResult.stderr) {
      console.error(auditResult.stderr);
    }
  }
}

/**
 * Show outdated packages
 */
async function showOutdatedPackages(options) {
  console.log('📅 Checking for Outdated Packages\n');
  
  const outdatedResult = await runCommand('npm outdated --json', { timeout: 30000 });
  
  if (outdatedResult.success && outdatedResult.stdout.trim()) {
    try {
      const outdatedData = JSON.parse(outdatedResult.stdout);
      
      if (Object.keys(outdatedData).length > 0) {
        console.log('📦 Outdated packages found:\n');
        
        for (const [pkg, info] of Object.entries(outdatedData)) {
          const current = info.current || 'not installed';
          const wanted = info.wanted || 'unknown';
          const latest = info.latest || 'unknown';
          
          console.log(`**${pkg}**`);
          console.log(`  - Current: ${current}`);
          console.log(`  - Wanted: ${wanted}`);
          console.log(`  - Latest: ${latest}`);
          
          if (info.type) {
            console.log(`  - Type: ${info.type}`);
          }
          console.log('');
        }
        
        console.log('💡 Run `npm update` to update packages to wanted versions');
        console.log('💡 Check package changelogs before major version updates');
        
      } else {
        console.log('✅ All packages are up to date!');
      }
      
    } catch (error) {
      // Fallback to text output
      console.log('📋 Outdated packages:');
      console.log(outdatedResult.stdout);
    }
    
  } else if (outdatedResult.stdout.trim() === '') {
    console.log('✅ All packages are up to date!');
  } else {
    console.error('❌ Failed to check outdated packages:', outdatedResult.error);
  }
}

/**
 * Update packages
 */
async function updatePackages(options) {
  console.log('🔄 Updating Packages\n');
  
  if (!options.force) {
    console.log('🔍 First, let\'s check what would be updated...\n');
    await showOutdatedPackages({ verbose: false });
    
    if (!options.fix) {
      console.log('\n💡 Run with --fix to proceed with updates');
      console.log('💡 Use --force to skip this safety check');
      return;
    }
  }
  
  console.log('\n🔄 Running npm update...');
  const updateResult = await runCommand('npm update', { timeout: 120000 });
  
  if (updateResult.success) {
    console.log('✅ Packages updated successfully!');
    if (options.verbose && updateResult.stdout) {
      console.log(updateResult.stdout);
    }
    
    // Run audit after update
    console.log('\n🔍 Running security audit after update...');
    await runSecurityAudit({ verbose: false, fix: false });
    
  } else {
    console.error('❌ Package update failed:', updateResult.error);
    if (updateResult.stderr) {
      console.error(updateResult.stderr);
    }
  }
}

/**
 * Clean and reinstall packages
 */
async function cleanPackages(options) {
  console.log('🧹 Cleaning Package Installation\n');
  
  if (!options.force) {
    console.log('⚠️ This will delete node_modules and package-lock.json');
    console.log('💡 Use --force to proceed');
    return;
  }
  
  try {
    console.log('🗑️ Removing node_modules...');
    await runCommand('rm -rf node_modules', { timeout: 30000 });
    
    console.log('🗑️ Removing package-lock.json...');
    try {
      await fs.unlink(path.join(PROJECT_ROOT, 'package-lock.json'));
    } catch (error) {
      // File might not exist, that's ok
    }
    
    console.log('📦 Running fresh npm install...');
    const installResult = await runCommand('npm install', { timeout: 180000 });
    
    if (installResult.success) {
      console.log('✅ Clean installation completed!');
      
      // Run audit after clean install
      console.log('\n🔍 Running security audit...');
      await runSecurityAudit({ verbose: false, fix: false });
      
    } else {
      console.error('❌ Fresh installation failed:', installResult.error);
      if (installResult.stderr) {
        console.error(installResult.stderr);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during clean operation:', error.message);
  }
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
  
  console.log('🐻 Bear Package Manager\n');
  
  try {
    switch (options.command) {
      case 'info':
        await showPackageInfo(options);
        break;
        
      case 'audit':
        await runSecurityAudit(options);
        break;
        
      case 'outdated':
        await showOutdatedPackages(options);
        break;
        
      case 'update':
        await updatePackages(options);
        break;
        
      case 'clean':
        await cleanPackages(options);
        break;
        
      default:
        console.error(`❌ Unknown command: ${options.command}`);
        console.log('\n💡 Run with --help to see available commands');
        process.exit(1);
    }
    
    console.log('\n🎉 Package management completed!');
    
  } catch (error) {
    console.error('❌ Error during package management:', error.message);
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

export { main, getPackageInfo, runSecurityAudit, showOutdatedPackages };