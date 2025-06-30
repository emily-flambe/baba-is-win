export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  created_at: string;
  homepage?: string | null;
  archived: boolean;
  disabled: boolean;
  private: boolean;
  fork: boolean;
  size: number;
  open_issues_count: number;
  has_wiki: boolean;
  has_pages: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_issues: boolean;
  watchers_count: number;
  default_branch: string;
  pushed_at: string;
  clone_url: string;
  ssh_url: string;
  svn_url: string;
  git_url: string;
  mirror_url: string | null;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string | null;
    node_id: string;
  } | null;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    gravatar_id: string | null;
    url: string;
    html_url: string;
    type: string;
    site_admin: boolean;
  };
}

export interface MuseumProject {
  id: string;
  displayName: string;
  description: string;
  language: string | null;
  category: string;
  featured: boolean;
  demoUrl: string | null;
  githubUrl: string;
  stars: number;
  forks: number;
  topics: string[];
  updatedAt: string;
  createdAt: string;
  homepage?: string | null;
}

export interface GitHubApiResponse {
  repositories: GitHubRepository[];
  lastFetched: string;
  totalCount: number;
}

export interface MuseumData {
  lastUpdated: string;
  projects: MuseumProject[];
  categories: string[];
  languages: string[];
  totalProjects: number;
}

export interface ProjectCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
}

export const PROJECT_CATEGORIES: Record<string, ProjectCategory> = {
  'productivity': {
    id: 'productivity',
    name: 'Productivity Tools',
    description: 'Tools to enhance workflow and productivity',
    color: '#2563eb',
    icon: '🛠️'
  },
  'data-processing': {
    id: 'data-processing', 
    name: 'Data Processing',
    description: 'Tools for data manipulation and analysis',
    color: '#059669',
    icon: '📊'
  },
  'api-integration': {
    id: 'api-integration',
    name: 'APIs & Integration',
    description: 'API clients and integration tools',
    color: '#dc2626',
    icon: '🔌'
  },
  'web-applications': {
    id: 'web-applications',
    name: 'Web Applications',
    description: 'Full-featured web applications',
    color: '#7c3aed',
    icon: '🌐'
  },
  'libraries': {
    id: 'libraries',
    name: 'Libraries & Frameworks',
    description: 'Reusable code libraries and frameworks',
    color: '#ea580c',
    icon: '📚'
  },
  'automation': {
    id: 'automation',
    name: 'Automation',
    description: 'Scripts and tools for automation',
    color: '#0891b2',
    icon: '⚙️'
  },
  'other': {
    id: 'other',
    name: 'Other Projects',
    description: 'Miscellaneous projects and experiments',
    color: '#6b7280',
    icon: '🔬'
  }
};

export interface GitHubApiError {
  message: string;
  status: number;
  documentation_url?: string;
}