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
  extendedDescription?: string | null;
  language: string | null;
  category: string;
  demoUrl: string | null;
  githubUrl: string;
  topics: string[];
  updatedAt: string;
  createdAt: string;
  homepage?: string | null;
  screenshot?: string | null;
  screenshots?: string[] | null;
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


export interface GitHubApiError {
  message: string;
  status: number;
  documentation_url?: string;
}

export interface MuseumRepositoryConfig {
  name: string;
  displayName?: string;
  customDescription?: string | null;
  extendedDescription?: string | null;
  category?: string;
  demoUrl?: string | null;
  order: number;
  screenshot?: string | null;
  screenshots?: string[] | null;
}

export interface MuseumConfig {
  owner: string;
  repositories: MuseumRepositoryConfig[];
  categories: Record<string, ProjectCategory>;
  settings: {
    fallbackToAllRepos: boolean;
    sortBy: 'order' | 'updated' | 'created';
    showOnlyConfigured: boolean;
  };
}