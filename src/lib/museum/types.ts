/**
 * TypeScript type definitions for the museum feature
 * Defines interfaces for project data, categories, and gallery layouts
 */

/**
 * Project categories available in the museum
 */
export enum ProjectCategory {
  PRODUCTIVITY = 'productivity',
  WEB_APPLICATIONS = 'web-applications',
  DATA_PROCESSING = 'data-processing',
  API_INTEGRATION = 'api-integration',
}

/**
 * Available sort options for museum display
 */
export enum SortOption {
  ORDER = 'order',
  NAME = 'name',
  CATEGORY = 'category',
  DISPLAY_NAME = 'displayName',
}

/**
 * Gallery layout types for different display modes
 */
export enum GalleryLayout {
  GRID = 'grid',
  LIST = 'list',
  MASONRY = 'masonry',
  CAROUSEL = 'carousel',
}

/**
 * Interface for individual project/repository data
 */
export interface Project {
  /** Repository name (GitHub identifier) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Optional custom short description */
  customDescription: string | null;
  /** Extended description with full details */
  extendedDescription: string;
  /** Project category classification */
  category: ProjectCategory;
  /** Optional demo URL for live preview */
  demoUrl: string | null;
  /** Display order for sorting */
  order: number;
}

/**
 * Museum configuration settings
 */
export interface MuseumSettings {
  /** Whether to fallback to showing all repositories if none configured */
  fallbackToAllRepos: boolean;
  /** Default sort method for projects */
  sortBy: SortOption;
  /** Whether to show only configured projects */
  showOnlyConfigured: boolean;
}

/**
 * Complete museum configuration structure
 */
export interface MuseumConfig {
  /** GitHub username/organization */
  owner: string;
  /** Array of configured projects */
  repositories: Project[];
  /** Museum display settings */
  settings: MuseumSettings;
}

/**
 * Project with additional computed properties
 */
export interface EnhancedProject extends Project {
  /** Computed GitHub URL */
  githubUrl: string;
  /** Computed category display name */
  categoryDisplayName: string;
  /** Whether project has demo available */
  hasDemo: boolean;
}

/**
 * Gallery display options and state
 */
export interface GalleryState {
  /** Current layout mode */
  layout: GalleryLayout;
  /** Current sort option */
  sortBy: SortOption;
  /** Sort direction */
  sortDirection: 'asc' | 'desc';
  /** Active category filter */
  categoryFilter: ProjectCategory | 'all';
  /** Search query */
  searchQuery: string;
}

/**
 * Category with project count
 */
export interface CategoryInfo {
  /** Category enum value */
  category: ProjectCategory;
  /** Human-readable category name */
  displayName: string;
  /** Number of projects in this category */
  count: number;
  /** Category description */
  description: string;
}

/**
 * Museum statistics and metadata
 */
export interface MuseumStats {
  /** Total number of projects */
  totalProjects: number;
  /** Projects by category */
  categoryCounts: Record<ProjectCategory, number>;
  /** Number of projects with demos */
  projectsWithDemos: number;
  /** Most recent project by order */
  latestProject: Project | null;
}

/**
 * Error types for museum data loading
 */
export interface MuseumError {
  /** Error type identifier */
  type: 'LOAD_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR';
  /** Human-readable error message */
  message: string;
  /** Optional error details */
  details?: string;
}

/**
 * Result type for museum data operations
 */
export type MuseumResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: MuseumError;
};