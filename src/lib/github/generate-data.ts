import { writeFile } from 'fs/promises';
import { join } from 'path';
import { generateMuseumData } from './api.js';
import type { MuseumData } from './types.js';

const DEFAULT_USERNAME = 'emily-flambe';
const OUTPUT_PATH = join(process.cwd(), 'src/data/github-projects.json');

export async function generateGitHubProjectsData(username: string = DEFAULT_USERNAME): Promise<MuseumData> {
  console.log(`🚀 Fetching GitHub projects for ${username}...`);
  
  try {
    const museumData = await generateMuseumData(username);
    
    console.log(`✅ Successfully fetched ${museumData.totalProjects} projects`);
    console.log(`📊 Categories: ${museumData.categories.join(', ')}`);
    console.log(`🔤 Languages: ${museumData.languages.join(', ')}`);
    
    return museumData;
  } catch (error) {
    console.error('❌ Error generating museum data:', error);
    throw error;
  }
}

export async function writeGitHubProjectsData(data: MuseumData, outputPath: string = OUTPUT_PATH): Promise<void> {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await writeFile(outputPath, jsonData, 'utf-8');
    console.log(`💾 GitHub projects data written to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error writing projects data:', error);
    throw error;
  }
}

export async function updateGitHubProjectsData(username: string = DEFAULT_USERNAME): Promise<void> {
  const data = await generateGitHubProjectsData(username);
  await writeGitHubProjectsData(data);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const username = process.argv[2] || DEFAULT_USERNAME;
  
  updateGitHubProjectsData(username)
    .then(() => {
      console.log('🎉 GitHub projects data update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to update GitHub projects data:', error);
      process.exit(1);
    });
}