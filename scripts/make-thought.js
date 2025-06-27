#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current date and time
const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = monthNames[now.getMonth()];
const day = now.getDate();
const year = now.getFullYear();
const publishDate = `${day} ${month} ${year}`;

// Format time as "H:MM PM/AM"
let hours = now.getHours();
const minutes = now.getMinutes();
const ampm = hours >= 12 ? 'PM' : 'AM';
hours = hours % 12;
hours = hours ? hours : 12; // the hour '0' should be '12'
const minutesStr = minutes < 10 ? '0' + minutes : minutes;
const publishTime = `${hours}:${minutesStr} ${ampm}`;

// Read template (try multiple possible locations)
let templatePath = path.join(__dirname, '..', '..', 'templates', 'thought.md');
if (!fs.existsSync(templatePath)) {
  templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'thought.md');
}
const template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders
const content = template
  .replace(/{{DATE}}/g, publishDate)
  .replace(/{{TIME}}/g, publishTime);

// Generate filename with slug (can be customized later)
const slug = process.argv[2] || 'new-thought';
const filename = `${dateStr}-${slug}.md`;

// Create output path
const outputDir = path.join(__dirname, '..', 'src', 'data', 'thoughts', 'published');
const outputPath = path.join(outputDir, filename);

// Ensure directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Write file
fs.writeFileSync(outputPath, content);

console.log(`Created new thought: ${outputPath}`);
console.log(`\nOpen this file in your editor to add content and customize the tags, color, and images.`);