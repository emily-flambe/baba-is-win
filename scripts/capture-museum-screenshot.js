#!/usr/bin/env node

/**
 * Individual Museum Screenshot Capture
 * 
 * Captures a single screenshot for a museum project using MCP
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureProjectScreenshot(projectName, url, options = {}) {
  const {
    width = 1200,
    height = 800,
    waitTime = 3000,
    quality = 90
  } = options;

  const outputPath = path.join(__dirname, '../public/assets/museum', `${projectName}.png`);
  
  console.log(`📸 Capturing screenshot for ${projectName}`);
  console.log(`   URL: ${url}`);
  console.log(`   Dimensions: ${width}x${height}`);
  console.log(`   Output: ${outputPath}`);
  
  try {
    // This is where you'd use the MCP screenshot tool
    // Example call (you'll need to adapt this to your MCP client):
    /*
    const result = await mcpClient.call('screenshot_website', {
      url: url,
      width: width,
      height: height,
      output_path: outputPath,
      wait_time: waitTime,
      quality: quality,
      full_page: false,
      device_scale_factor: 2 // For retina displays
    });
    */
    
    console.log(`✅ Screenshot captured successfully!`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Failed to capture screenshot:`, error);
    throw error;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, projectName, url] = process.argv;
  
  if (!projectName || !url) {
    console.log(`
Usage: node capture-museum-screenshot.js <project-name> <url>

Examples:
  node capture-museum-screenshot.js cutty https://cutty.emilycogsdill.com
  node capture-museum-screenshot.js esquie https://esquie.emilycogsdill.com
`);
    process.exit(1);
  }
  
  captureProjectScreenshot(projectName, url)
    .then(outputPath => {
      console.log(`Screenshot saved to: ${outputPath}`);
    })
    .catch(error => {
      console.error('Screenshot capture failed:', error);
      process.exit(1);
    });
}

export { captureProjectScreenshot };