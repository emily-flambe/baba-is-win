import type { 
  GitHubRepository, 
  GitHubApiResponse, 
  GitHubApiError,
  MuseumProject,
  MuseumData,
  ProjectCategory,
  PROJECT_CATEGORIES
} from './types.js';

const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(url: string): string {
  return url;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION;
}

async function fetchWithCache<T>(url: string): Promise<T> {
  const cacheKey = getCacheKey(url);
  const cached = cache.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'emily-flambe-portfolio'
  };

  // Add GitHub token if available (for higher rate limits)
  const githubToken = import.meta.env?.GITHUB_TOKEN || process.env?.GITHUB_TOKEN;
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json() as GitHubApiError;
      throw new Error(`GitHub API error: ${errorData.message} (Status: ${response.status})`);
    }

    const data = await response.json();
    
    // Cache the successful response
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
}

export async function fetchUserRepositories(username: string): Promise<GitHubRepository[]> {
  const url = `${GITHUB_API_BASE}/users/${username}/repos?type=owner&sort=updated&per_page=100`;
  
  try {
    const repositories = await fetchWithCache<GitHubRepository[]>(url);
    
    // Filter out forks and archived repositories for the museum
    return repositories.filter(repo => 
      !repo.fork && 
      !repo.archived && 
      !repo.disabled &&
      !repo.private
    );
  } catch (error) {
    console.error('Error fetching user repositories:', error);
    // Return fallback data if API fails
    return getFallbackRepositories();
  }
}

export async function fetchRepositoryDetails(owner: string, repo: string): Promise<GitHubRepository> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  return await fetchWithCache<GitHubRepository>(url);
}

export async function fetchRepositoryReadme(owner: string, repo: string): Promise<string | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;
  
  try {
    const response = await fetchWithCache<{ content: string; encoding: string }>(url);
    
    if (response.encoding === 'base64') {
      return atob(response.content);
    }
    
    return response.content;
  } catch (error) {
    console.warn(`README not found for ${owner}/${repo}:`, error);
    return null;
  }
}

function categorizeProject(repo: GitHubRepository): string {
  const name = repo.name.toLowerCase();
  const description = (repo.description || '').toLowerCase();
  const topics = repo.topics?.map(t => t.toLowerCase()) || [];
  
  // Check topics first (most reliable)
  if (topics.some(topic => ['productivity', 'tool', 'workflow'].includes(topic))) {
    return 'productivity';
  }
  
  if (topics.some(topic => ['data', 'processing', 'analysis'].includes(topic))) {
    return 'data-processing';
  }
  
  if (topics.some(topic => ['api', 'integration', 'client'].includes(topic))) {
    return 'api-integration';
  }
  
  if (topics.some(topic => ['webapp', 'website', 'frontend'].includes(topic))) {
    return 'web-applications';
  }
  
  if (topics.some(topic => ['library', 'framework', 'package'].includes(topic))) {
    return 'libraries';
  }
  
  if (topics.some(topic => ['automation', 'script', 'bot'].includes(topic))) {
    return 'automation';
  }
  
  // Fallback to name/description analysis
  if (name.includes('tool') || description.includes('tool') || description.includes('productivity')) {
    return 'productivity';
  }
  
  if (name.includes('data') || description.includes('data') || description.includes('process')) {
    return 'data-processing';
  }
  
  if (name.includes('api') || description.includes('api') || name.includes('client')) {
    return 'api-integration';
  }
  
  if (name.includes('web') || name.includes('app') || description.includes('application')) {
    return 'web-applications';
  }
  
  if (name.includes('lib') || description.includes('library')) {
    return 'libraries';
  }
  
  return 'other';
}

function transformRepositoryToMuseumProject(repo: GitHubRepository): MuseumProject {
  return {
    id: repo.name,
    displayName: repo.name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    description: repo.description || 'No description available',
    language: repo.language,
    category: categorizeProject(repo),
    featured: repo.stargazers_count > 5 || repo.forks_count > 2, // Simple featured logic
    demoUrl: repo.homepage || null,
    githubUrl: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    topics: repo.topics || [],
    updatedAt: repo.updated_at,
    createdAt: repo.created_at,
    homepage: repo.homepage
  };
}

export async function generateMuseumData(username: string): Promise<MuseumData> {
  try {
    const repositories = await fetchUserRepositories(username);
    const projects = repositories.map(transformRepositoryToMuseumProject);
    
    const categories = Array.from(new Set(projects.map(p => p.category)));
    const languages = Array.from(new Set(projects.map(p => p.language).filter(Boolean)));
    
    return {
      lastUpdated: new Date().toISOString(),
      projects,
      categories,
      languages,
      totalProjects: projects.length
    };
  } catch (error) {
    console.error('Error generating museum data:', error);
    return getFallbackMuseumData();
  }
}

// Fallback data for development and error cases
function getFallbackRepositories(): GitHubRepository[] {
  return [
    {
      id: 1,
      name: 'smart-tool-of-knowing',
      full_name: 'emily-flambe/smart-tool-of-knowing',
      description: 'A super good and cool tool for planning and summarizing work in Linear',
      html_url: 'https://github.com/emily-flambe/smart-tool-of-knowing',
      language: 'TypeScript',
      stargazers_count: 0,
      forks_count: 0,
      topics: ['productivity', 'tool'],
      updated_at: '2025-06-30T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      homepage: null,
      archived: false,
      disabled: false,
      private: false,
      fork: false,
      size: 1024,
      open_issues_count: 0,
      has_wiki: false,
      has_pages: false,
      has_projects: false,
      has_downloads: true,
      has_issues: true,
      watchers_count: 0,
      default_branch: 'main',
      pushed_at: '2025-06-30T00:00:00Z',
      clone_url: 'https://github.com/emily-flambe/smart-tool-of-knowing.git',
      ssh_url: 'git@github.com:emily-flambe/smart-tool-of-knowing.git',
      svn_url: 'https://github.com/emily-flambe/smart-tool-of-knowing',
      git_url: 'git://github.com/emily-flambe/smart-tool-of-knowing.git',
      mirror_url: null,
      license: null,
      owner: {
        login: 'emily-flambe',
        id: 123456,
        avatar_url: 'https://github.com/identicons/emily-flambe.png',
        gravatar_id: null,
        url: 'https://api.github.com/users/emily-flambe',
        html_url: 'https://github.com/emily-flambe',
        type: 'User',
        site_admin: false
      }
    }
  ];
}

function getFallbackMuseumData(): MuseumData {
  const fallbackRepos = getFallbackRepositories();
  const projects = fallbackRepos.map(transformRepositoryToMuseumProject);
  
  return {
    lastUpdated: new Date().toISOString(),
    projects,
    categories: ['productivity'],
    languages: ['TypeScript'],
    totalProjects: projects.length
  };
}

export { PROJECT_CATEGORIES };
export type { ProjectCategory };