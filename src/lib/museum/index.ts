/**
 * Museum library - TypeScript types and data handling for the museum feature
 * 
 * This module provides complete TypeScript integration for the museum feature,
 * including type definitions, data loading, and transformation utilities.
 * 
 * @example
 * ```typescript
 * import { loadMuseumConfig, enhanceProjects, ProjectCategory } from '@/lib/museum';
 * 
 * const config = await loadMuseumConfig();
 * if (config.success) {
 *   const projects = enhanceProjects(config.data.repositories, config.data.owner);
 *   const productivityProjects = getProjectsByCategory(projects, ProjectCategory.PRODUCTIVITY);
 * }
 * ```
 */

// Export all types
export type {
  Project,
  EnhancedProject,
  MuseumConfig,
  MuseumSettings,
  CategoryInfo,
  MuseumStats,
  MuseumError,
  MuseumResult,
  GalleryState
} from './types';

// Export enums
export {
  ProjectCategory,
  SortOption,
  GalleryLayout
} from './types';

// Export all data utilities
export {
  loadMuseumConfig,
  enhanceProjects,
  sortProjects,
  filterProjectsByCategory,
  searchProjects,
  getCategoryInfo,
  generateMuseumStats,
  applyGalleryState,
  getProjectByName,
  getProjectsByCategory,
  getFeaturedProjects
} from './data';