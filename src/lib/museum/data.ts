/**
 * Museum data loading and transformation utilities
 * Handles loading museum config, data transformation, and type-safe operations
 */

import {
  MuseumConfig,
  Project,
  EnhancedProject,
  ProjectCategory,
  SortOption,
  CategoryInfo,
  MuseumStats,
  MuseumResult,
  MuseumError,
  GalleryState
} from './types';

// Import the museum configuration
import museumConfigData from '../../data/museum-config.json';

/**
 * Category display names and descriptions
 */
const CATEGORY_METADATA: Record<ProjectCategory, { displayName: string; description: string }> = {
  [ProjectCategory.PRODUCTIVITY]: {
    displayName: 'Productivity',
    description: 'Tools and applications that enhance workflow and efficiency'
  },
  [ProjectCategory.WEB_APPLICATIONS]: {
    displayName: 'Web Applications',
    description: 'Full-featured web applications and interactive experiences'
  },
  [ProjectCategory.DATA_PROCESSING]: {
    displayName: 'Data Processing',
    description: 'Tools for handling, transforming, and analyzing data'
  },
  [ProjectCategory.API_INTEGRATION]: {
    displayName: 'API Integration',
    description: 'Applications that integrate with external APIs and services'
  }
};

/**
 * Load and validate museum configuration data
 * @returns Promise resolving to museum config or error
 */
export async function loadMuseumConfig(): Promise<MuseumResult<MuseumConfig>> {
  try {
    const config = museumConfigData as MuseumConfig;
    
    // Validate the configuration
    const validationResult = validateMuseumConfig(config);
    if (!validationResult.success) {
      return validationResult;
    }
    
    return {
      success: true,
      data: config
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'LOAD_ERROR',
        message: 'Failed to load museum configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Validate museum configuration structure
 * @param config - Configuration to validate
 * @returns Validation result
 */
function validateMuseumConfig(config: any): MuseumResult<MuseumConfig> {
  try {
    if (!config || typeof config !== 'object') {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid configuration: not an object'
        }
      };
    }

    if (!config.owner || typeof config.owner !== 'string') {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid configuration: missing or invalid owner'
        }
      };
    }

    if (!Array.isArray(config.repositories)) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid configuration: repositories must be an array'
        }
      };
    }

    // Validate each project
    for (const repo of config.repositories) {
      const projectValidation = validateProject(repo);
      if (!projectValidation.success) {
        return projectValidation;
      }
    }

    return {
      success: true,
      data: config as MuseumConfig
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Configuration validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Validate individual project structure
 * @param project - Project to validate
 * @returns Validation result
 */
function validateProject(project: any): MuseumResult<Project> {
  const requiredFields = ['name', 'displayName', 'extendedDescription', 'category', 'order'];
  
  for (const field of requiredFields) {
    if (!(field in project) || project[field] === undefined) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: `Invalid project: missing required field '${field}'`
        }
      };
    }
  }

  if (!Object.values(ProjectCategory).includes(project.category)) {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: `Invalid project category: ${project.category}`
      }
    };
  }

  return {
    success: true,
    data: project as Project
  };
}

/**
 * Transform projects to enhanced projects with computed properties
 * @param projects - Array of base projects
 * @param owner - GitHub owner/organization name
 * @returns Array of enhanced projects
 */
export function enhanceProjects(projects: Project[], owner: string): EnhancedProject[] {
  return projects.map(project => ({
    ...project,
    githubUrl: `https://github.com/${owner}/${project.name}`,
    categoryDisplayName: CATEGORY_METADATA[project.category].displayName,
    hasDemo: project.demoUrl !== null
  }));
}

/**
 * Sort projects by specified criteria
 * @param projects - Projects to sort
 * @param sortBy - Sort criteria
 * @param direction - Sort direction
 * @returns Sorted projects array
 */
export function sortProjects(
  projects: EnhancedProject[],
  sortBy: SortOption,
  direction: 'asc' | 'desc' = 'asc'
): EnhancedProject[] {
  const sorted = [...projects].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case SortOption.ORDER:
        comparison = a.order - b.order;
        break;
      case SortOption.NAME:
        comparison = a.name.localeCompare(b.name);
        break;
      case SortOption.DISPLAY_NAME:
        comparison = a.displayName.localeCompare(b.displayName);
        break;
      case SortOption.CATEGORY:
        comparison = a.category.localeCompare(b.category);
        break;
      default:
        comparison = a.order - b.order;
    }
    
    return direction === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Filter projects by category
 * @param projects - Projects to filter
 * @param category - Category to filter by, or 'all' for no filter
 * @returns Filtered projects array
 */
export function filterProjectsByCategory(
  projects: EnhancedProject[],
  category: ProjectCategory | 'all'
): EnhancedProject[] {
  if (category === 'all') {
    return projects;
  }
  return projects.filter(project => project.category === category);
}

/**
 * Search projects by name or description
 * @param projects - Projects to search
 * @param query - Search query
 * @returns Filtered projects array
 */
export function searchProjects(projects: EnhancedProject[], query: string): EnhancedProject[] {
  if (!query.trim()) {
    return projects;
  }
  
  const lowercaseQuery = query.toLowerCase();
  return projects.filter(project =>
    project.name.toLowerCase().includes(lowercaseQuery) ||
    project.displayName.toLowerCase().includes(lowercaseQuery) ||
    project.extendedDescription.toLowerCase().includes(lowercaseQuery) ||
    (project.customDescription && project.customDescription.toLowerCase().includes(lowercaseQuery))
  );
}

/**
 * Get category information with project counts
 * @param projects - All projects
 * @returns Array of category info
 */
export function getCategoryInfo(projects: EnhancedProject[]): CategoryInfo[] {
  const categoryCounts = projects.reduce((acc, project) => {
    acc[project.category] = (acc[project.category] || 0) + 1;
    return acc;
  }, {} as Record<ProjectCategory, number>);
  
  return Object.values(ProjectCategory).map(category => ({
    category,
    displayName: CATEGORY_METADATA[category].displayName,
    description: CATEGORY_METADATA[category].description,
    count: categoryCounts[category] || 0
  }));
}

/**
 * Generate museum statistics
 * @param projects - All projects
 * @returns Museum statistics
 */
export function generateMuseumStats(projects: EnhancedProject[]): MuseumStats {
  const categoryCounts = projects.reduce((acc, project) => {
    acc[project.category] = (acc[project.category] || 0) + 1;
    return acc;
  }, {} as Record<ProjectCategory, number>);
  
  const projectsWithDemos = projects.filter(p => p.hasDemo).length;
  const latestProject = projects.length > 0 
    ? [...projects].sort((a, b) => b.order - a.order)[0] 
    : null;
  
  return {
    totalProjects: projects.length,
    categoryCounts,
    projectsWithDemos,
    latestProject
  };
}

/**
 * Apply gallery state filters and sorting to projects
 * @param projects - Base projects array
 * @param galleryState - Current gallery state
 * @returns Filtered and sorted projects
 */
export function applyGalleryState(
  projects: EnhancedProject[],
  galleryState: GalleryState
): EnhancedProject[] {
  let filtered = projects;
  
  // Apply category filter
  filtered = filterProjectsByCategory(filtered, galleryState.categoryFilter);
  
  // Apply search filter
  filtered = searchProjects(filtered, galleryState.searchQuery);
  
  // Apply sorting
  filtered = sortProjects(filtered, galleryState.sortBy, galleryState.sortDirection);
  
  return filtered;
}

/**
 * Get project by name
 * @param projects - All projects
 * @param name - Project name to find
 * @returns Project if found, null otherwise
 */
export function getProjectByName(projects: EnhancedProject[], name: string): EnhancedProject | null {
  return projects.find(project => project.name === name) || null;
}

/**
 * Get projects by category
 * @param projects - All projects
 * @param category - Category to filter by
 * @returns Projects in the specified category
 */
export function getProjectsByCategory(
  projects: EnhancedProject[], 
  category: ProjectCategory
): EnhancedProject[] {
  return projects.filter(project => project.category === category);
}

/**
 * Get featured projects (those with demo URLs)
 * @param projects - All projects
 * @returns Projects with demo URLs available
 */
export function getFeaturedProjects(projects: EnhancedProject[]): EnhancedProject[] {
  return projects.filter(project => project.hasDemo);
}