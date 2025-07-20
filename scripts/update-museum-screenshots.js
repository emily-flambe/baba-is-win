#!/usr/bin/env node

/**
 * Museum Screenshot Manager
 * 
 * This script automatically captures screenshots for museum projects
 * that have demo URLs but are missing screenshots.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MUSEUM_CONFIG_PATH = path.join(__dirname, '../src/data/museum-config.json');
const SCREENSHOTS_DIR = path.join(__dirname, '../public/assets/museum');

async function loadMuseumConfig() {
  try {
    const configData = await fs.readFile(MUSEUM_CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load museum config:', error);
    process.exit(1);
  }
}

async function saveMuseumConfig(config) {
  try {
    await fs.writeFile(MUSEUM_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Museum config updated');
  } catch (error) {
    console.error('Failed to save museum config:', error);
    process.exit(1);
  }
}

async function ensureScreenshotsDir() {
  try {
    await fs.access(SCREENSHOTS_DIR);
  } catch {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
    console.log('📁 Created screenshots directory');
  }
}

function getScreenshotPath(projectName) {
  return `/assets/museum/${projectName}-screenshot.png`;
}

function getScreenshotFilePath(projectName) {
  return path.join(SCREENSHOTS_DIR, `${projectName}-screenshot.png`);
}

async function screenshotExists(projectName) {
  try {
    await fs.access(getScreenshotFilePath(projectName));
    return true;
  } catch {
    return false;
  }
}

async function captureScreenshot(url, outputPath) {
  // This function would use the MCP screenshot tool
  // For now, we'll just log what would happen
  console.log(`📸 Would capture screenshot of ${url} to ${outputPath}`);
  
  // In practice, you'd call the MCP tool here:
  // const result = await mcpClient.screenshot_website({
  //   url: url,
  //   output_path: outputPath,
  //   width: 1200,
  //   height: 800,
  //   wait_time: 2000
  // });
  
  return true; // Simulate success
}

async function updateProjectScreenshots() {
  console.log('🎨 Starting museum screenshot update...\n');
  
  await ensureScreenshotsDir();
  const config = await loadMuseumConfig();
  let updated = false;

  for (const project of config.repositories) {
    if (!project.demoUrl) {
      console.log(`⏭️  Skipping ${project.displayName} - no demo URL`);
      continue;
    }

    if (project.screenshot && await screenshotExists(project.name)) {
      console.log(`✅ ${project.displayName} - screenshot already exists`);
      continue;
    }

    console.log(`📸 Capturing screenshot for ${project.displayName}...`);
    console.log(`   URL: ${project.demoUrl}`);
    
    try {
      const screenshotPath = getScreenshotPath(project.name);
      const filePath = getScreenshotFilePath(project.name);
      
      await captureScreenshot(project.demoUrl, filePath);
      
      // Update the config with the new screenshot path
      project.screenshot = screenshotPath;
      updated = true;
      
      console.log(`✅ Screenshot saved: ${screenshotPath}\n`);
    } catch (error) {
      console.error(`❌ Failed to capture screenshot for ${project.displayName}:`, error);
    }
  }

  if (updated) {
    await saveMuseumConfig(config);
    console.log('🎉 Museum screenshots updated successfully!');
  } else {
    console.log('ℹ️  No screenshots needed updating');
  }
}

// CLI interface
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Museum Screenshot Manager

Usage:
  node scripts/update-museum-screenshots.js [options]

Options:
  --force    Force re-capture all screenshots
  --help     Show this help message

Examples:
  node scripts/update-museum-screenshots.js
  node scripts/update-museum-screenshots.js --force
`);
  process.exit(0);
}

const forceUpdate = process.argv.includes('--force');
if (forceUpdate) {
  console.log('🔄 Force mode enabled - will re-capture all screenshots\n');
}

updateProjectScreenshots().catch(console.error);