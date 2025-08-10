import type { 
  GitHubRepository, 
  GitHubApiResponse, 
  GitHubApiError,
  MuseumProject,
  MuseumData,
  ProjectCategory,
  MuseumConfig,
  MuseumRepositoryConfig
} from './types.js';
import museumConfig from '../../data/museum-config.json' with { type: 'json' };

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

export function loadMuseumConfig(): MuseumConfig {
  const config = museumConfig as MuseumConfig;
  
  // Basic validation
  if (!config.owner || !config.repositories || !Array.isArray(config.repositories)) {
    throw new Error('Invalid museum configuration: missing required fields');
  }
  
  if (config.repositories.length === 0) {
    throw new Error('Invalid museum configuration: no repositories specified');
  }
  
  // Validate each repository config
  for (const repo of config.repositories) {
    if (!repo.name) {
      throw new Error(`Invalid repository configuration: missing name field`);
    }
    // Only require order if sortBy is set to 'order'
    if (config.settings?.sortBy === 'order' && typeof repo.order !== 'number') {
      throw new Error(`Invalid repository configuration for ${repo.name}: order field is required when sortBy is 'order'`);
    }
  }
  
  return config;
}

export async function fetchConfiguredRepositories(): Promise<GitHubRepository[]> {
  const config = loadMuseumConfig();
  const repositories: GitHubRepository[] = [];
  
  try {
    // Fetch each configured repository individually
    for (const repoConfig of config.repositories) {
      try {
        const repo = await fetchRepositoryDetails(config.owner, repoConfig.name);
        repositories.push(repo);
      } catch (error) {
        console.warn(`Failed to fetch repository ${repoConfig.name}:`, error);
        // Continue with other repositories
      }
    }
    
    return repositories;
  } catch (error) {
    console.error('Error fetching configured repositories:', error);
    return getFallbackRepositories();
  }
}

export async function fetchUserRepositories(username: string): Promise<GitHubRepository[]> {
  const config = loadMuseumConfig();
  
  if (config.settings.showOnlyConfigured) {
    return fetchConfiguredRepositories();
  }
  
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


function transformRepositoryToMuseumProject(repo: GitHubRepository, config?: MuseumRepositoryConfig): MuseumProject {
  const defaultDisplayName = repo.name.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return {
    id: repo.name,
    displayName: config?.displayName || defaultDisplayName,
    description: config?.customDescription || repo.description || 'No description available',
    extendedDescription: config?.extendedDescription || null,
    language: repo.language,
    demoUrl: config?.demoUrl ?? repo.homepage ?? null,
    githubUrl: repo.html_url,
    topics: repo.topics || [],
    updatedAt: repo.updated_at,
    createdAt: repo.created_at,
    homepage: repo.homepage,
    screenshot: config?.screenshot || null,
    screenshots: config?.screenshots || null,
    section: config?.section || null
  };
}

export async function generateMuseumData(username: string): Promise<MuseumData> {
  try {
    const config = loadMuseumConfig();
    const repositories = await fetchUserRepositories(username);
    
    // Create a map of repository configs for easy lookup
    const configMap = new Map(config.repositories.map(rc => [rc.name, rc]));
    
    // Transform repositories with their config overrides
    const projects = repositories.map(repo => {
      const repoConfig = configMap.get(repo.name);
      return transformRepositoryToMuseumProject(repo, repoConfig);
    });
    
    // Filter out hidden projects
    const visibleProjects = projects.filter(project => {
      const repoConfig = configMap.get(project.id);
      return repoConfig?.hidden !== true;
    });
    
    // Sort projects based on configuration
    const sortedProjects = sortProjects(visibleProjects, config.settings.sortBy, config.repositories);
    
    const languages = Array.from(new Set(sortedProjects.map(p => p.language).filter(Boolean)));
    
    return {
      lastUpdated: new Date().toISOString(),
      projects: sortedProjects,
      languages,
      totalProjects: sortedProjects.length
    };
  } catch (error) {
    console.error('Error generating museum data:', error);
    return generateFallbackMuseumData();
  }
}

function sortProjects(projects: MuseumProject[], sortBy: 'order' | 'updated' | 'created', repoConfigs: MuseumRepositoryConfig[]): MuseumProject[] {
  const configMap = new Map(repoConfigs.map(rc => [rc.name, rc]));
  
  return [...projects].sort((a, b) => {
    switch (sortBy) {
      case 'order':
        const orderA = configMap.get(a.id)?.order ?? 999;
        const orderB = configMap.get(b.id)?.order ?? 999;
        return orderA - orderB;
      
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      
      default:
        return 0;
    }
  });
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

function generateFallbackMuseumData(): MuseumData {
  try {
    const config = loadMuseumConfig();
    const fallbackRepos = getFallbackRepositories();
    
    // Create a map of repository configs for easy lookup
    const configMap = new Map(config.repositories.map(rc => [rc.name, rc]));
    
    // Transform repositories with their config overrides
    const projects = fallbackRepos.map(repo => {
      const repoConfig = configMap.get(repo.name);
      return transformRepositoryToMuseumProject(repo, repoConfig);
    });
    
    // Filter out hidden projects
    const visibleProjects = projects.filter(project => {
      const repoConfig = configMap.get(project.id);
      return repoConfig?.hidden !== true;
    });
    
    // Sort projects based on configuration
    const sortedProjects = sortProjects(visibleProjects, config.settings.sortBy, config.repositories);
    
    const languages = Array.from(new Set(sortedProjects.map(p => p.language).filter(Boolean)));
    
    return {
      lastUpdated: new Date().toISOString(),
      projects: sortedProjects,
      languages,
      totalProjects: sortedProjects.length
    };
  } catch (error) {
    console.error('Error generating fallback museum data:', error);
    // Last resort fallback
    return {
      lastUpdated: new Date().toISOString(),
      projects: [],
      languages: [],
      totalProjects: 0
    };
  }
}

