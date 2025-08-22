#!/usr/bin/env node

/**
 * Update Context Synchronization Script
 * =====================================
 * 
 * This script helps keep context files synchronized with the actual project state.
 * It scans the project structure and updates relevant documentation and context files.
 * 
 * Usage:
 *   node .project/scripts/update-context.js [options]
 * 
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --verbose    Show detailed output
 *   --help       Show this help message
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

// Configuration
const CONFIG = {
  // Directories to scan for project structure
  scanDirs: [
    'src',
    'public',
    'scripts',
    'tests',
    'migrations',
    '.project'
  ],
  
  // Files to ignore in scans
  ignorePatterns: [
    'node_modules',
    '.git',
    'dist',
    '.astro',
    '*.log',
    '.DS_Store',
    '*.tmp'
  ],
  
  // Context files to potentially update
  contextFiles: [
    '.project/README.md',
    'README.md',
    'package.json'
  ],
  
  // Environment files to check
  envFiles: [
    '.env.example',
    '.env.local.example', 
    '.dev.vars',
    '.project/.env.example'
  ]
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
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
Update Context Synchronization Script
=====================================

This script helps keep context files synchronized with the actual project state.

Usage:
  node .project/scripts/update-context.js [options]

Options:
  --dry-run    Show what would be updated without making changes
  --verbose    Show detailed output  
  --help       Show this help message

Examples:
  node .project/scripts/update-context.js --dry-run --verbose
  node .project/scripts/update-context.js
`);
}

/**
 * Check if a path should be ignored
 */
function shouldIgnore(filePath) {
  return CONFIG.ignorePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

/**
 * Recursively scan directory structure
 */
async function scanDirectory(dirPath, relativePath = '') {
  const structure = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      if (shouldIgnore(relPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subStructure = await scanDirectory(fullPath, relPath);
        structure.push({
          type: 'directory',
          name: entry.name,
          path: relPath,
          children: subStructure
        });
      } else {
        const stats = await fs.stat(fullPath);
        structure.push({
          type: 'file',
          name: entry.name,
          path: relPath,
          size: stats.size,
          modified: stats.mtime
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
  }
  
  return structure.sort((a, b) => {
    // Directories first, then files, both alphabetically
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get project structure
 */
async function getProjectStructure() {
  const structure = {};
  
  for (const dir of CONFIG.scanDirs) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    try {
      await fs.access(dirPath);
      structure[dir] = await scanDirectory(dirPath, dir);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Could not access directory ${dir}: ${error.message}`);
      }
    }
  }
  
  return structure;
}

/**
 * Check environment file consistency
 */
async function checkEnvironmentFiles() {
  const envStatus = {};
  
  for (const envFile of CONFIG.envFiles) {
    const filePath = path.join(PROJECT_ROOT, envFile);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      envStatus[envFile] = {
        exists: true,
        size: content.length,
        lines: content.split('\n').length,
        hasJwtSecret: content.includes('JWT_SECRET'),
        hasApiKeySalt: content.includes('API_KEY_SALT'),
        hasGoogleOAuth: content.includes('GOOGLE_CLIENT_ID'),
        hasResendApi: content.includes('RESEND_API_KEY')
      };
    } catch (error) {
      envStatus[envFile] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  return envStatus;
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
      scripts: Object.keys(pkg.scripts || {}),
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {})
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Generate context report
 */
function generateContextReport(data) {
  const { structure, envStatus, packageInfo, timestamp } = data;
  
  let report = `# Project Context Report
Generated: ${timestamp}

## Project Overview
`;

  if (packageInfo.error) {
    report += `- **Error reading package.json**: ${packageInfo.error}\n`;
  } else {
    report += `- **Name**: ${packageInfo.name}
- **Description**: ${packageInfo.description}
- **Dependencies**: ${packageInfo.dependencies?.length || 0} production, ${packageInfo.devDependencies?.length || 0} development
- **Scripts**: ${packageInfo.scripts?.length || 0} available
`;
  }

  report += `
## Directory Structure
`;

  // Add structure summary
  for (const [dir, contents] of Object.entries(structure)) {
    const fileCount = countFiles(contents);
    const dirCount = countDirectories(contents);
    report += `- **${dir}/**: ${fileCount} files, ${dirCount} directories\n`;
  }

  report += `
## Environment Configuration Status
`;

  for (const [file, status] of Object.entries(envStatus)) {
    if (status.exists) {
      report += `- **${file}**: ✅ Present (${status.lines} lines)\n`;
      if (status.hasJwtSecret) report += `  - Has JWT_SECRET configuration\n`;
      if (status.hasApiKeySalt) report += `  - Has API_KEY_SALT configuration\n`;
      if (status.hasGoogleOAuth) report += `  - Has Google OAuth configuration\n`;
      if (status.hasResendApi) report += `  - Has Resend API configuration\n`;
    } else {
      report += `- **${file}**: ❌ Missing\n`;
    }
  }

  return report;
}

/**
 * Count files in structure
 */
function countFiles(structure) {
  let count = 0;
  for (const item of structure) {
    if (item.type === 'file') {
      count++;
    } else if (item.children) {
      count += countFiles(item.children);
    }
  }
  return count;
}

/**
 * Count directories in structure
 */
function countDirectories(structure) {
  let count = 0;
  for (const item of structure) {
    if (item.type === 'directory') {
      count++;
      if (item.children) {
        count += countDirectories(item.children);
      }
    }
  }
  return count;
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
  
  console.log('🐻 Bear Context Updater - Scanning project structure...\n');
  
  try {
    // Gather project data
    if (options.verbose) console.log('📁 Scanning directory structure...');
    const structure = await getProjectStructure();
    
    if (options.verbose) console.log('🔧 Checking environment files...');
    const envStatus = await checkEnvironmentFiles();
    
    if (options.verbose) console.log('📦 Reading package information...');
    const packageInfo = await getPackageInfo();
    
    // Generate context data
    const contextData = {
      structure,
      envStatus,
      packageInfo,
      timestamp: new Date().toISOString()
    };
    
    // Generate report
    const report = generateContextReport(contextData);
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN - Context report that would be generated:\n');
      console.log(report);
    } else {
      // Write context report
      const reportPath = path.join(PROJECT_ROOT, '.project/context-report.md');
      await fs.writeFile(reportPath, report);
      console.log(`✅ Context report written to: ${reportPath}`);
    }
    
    // Provide recommendations
    console.log('\n📋 Recommendations:');
    
    // Check for missing critical env files
    if (!envStatus['.dev.vars']?.exists) {
      console.log('⚠️  Missing .dev.vars file - copy .project/.env.example to root as .dev.vars for local development');
    }
    
    if (!envStatus['.project/.env.example']?.exists) {
      console.log('⚠️  Missing .project/.env.example - this should be the master environment template');
    }
    
    // Check for JWT_SECRET in env files
    const hasJwtSecret = Object.values(envStatus).some(status => status.hasJwtSecret);
    if (!hasJwtSecret) {
      console.log('⚠️  No JWT_SECRET found in any environment files - auth will not work');
    }
    
    console.log('\n🎉 Context update completed!');
    
  } catch (error) {
    console.error('❌ Error updating context:', error.message);
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

export { main, getProjectStructure, checkEnvironmentFiles };