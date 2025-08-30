<script lang="ts">
  import type { MuseumProject, ProjectCategory } from '../../lib/github/types';
  import { PROJECT_CATEGORIES } from '../../lib/github/types';

  export let projects: MuseumProject[] = [];
  export let onFilter: (filtered: MuseumProject[]) => void = () => {};

  let selectedCategories: string[] = [];
  let selectedLanguages: string[] = [];
  let searchTerm: string = '';
  let sortBy: 'name' | 'stars' | 'updated' = 'name';
  let showFeaturedOnly: boolean = false;

  // Extract unique categories and languages from projects
  $: availableCategories = [...new Set(projects.map(p => p.category))];
  $: availableLanguages = [...new Set(projects.map(p => p.language).filter(Boolean))];

  // Filter and sort projects
  $: filteredProjects = filterAndSort(
    projects,
    selectedCategories,
    selectedLanguages,
    searchTerm,
    sortBy,
    showFeaturedOnly
  );

  // Call parent callback when filtered results change
  $: onFilter(filteredProjects);

  function filterAndSort(
    projects: MuseumProject[],
    categories: string[],
    languages: string[],
    search: string,
    sort: string,
    featuredOnly: boolean
  ): MuseumProject[] {
    let filtered = [...projects];

    // Filter by categories
    if (categories.length > 0) {
      filtered = filtered.filter(p => categories.includes(p.category));
    }

    // Filter by languages
    if (languages.length > 0) {
      filtered = filtered.filter(p => p.language && languages.includes(p.language));
    }

    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.displayName.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.topics.some(topic => topic.toLowerCase().includes(searchLower))
      );
    }

    // Filter by featured only
    if (featuredOnly) {
      filtered = filtered.filter(p => p.featured);
    }

    // Sort projects
    switch (sort) {
      case 'stars':
        filtered.sort((a, b) => b.stars - a.stars);
        break;
      case 'updated':
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
    }

    return filtered;
  }

  function toggleCategory(category: string) {
    if (selectedCategories.includes(category)) {
      selectedCategories = selectedCategories.filter(c => c !== category);
    } else {
      selectedCategories = [...selectedCategories, category];
    }
  }

  function toggleLanguage(language: string) {
    if (selectedLanguages.includes(language)) {
      selectedLanguages = selectedLanguages.filter(l => l !== language);
    } else {
      selectedLanguages = [...selectedLanguages, language];
    }
  }

  function clearAllFilters() {
    selectedCategories = [];
    selectedLanguages = [];
    searchTerm = '';
    showFeaturedOnly = false;
    sortBy = 'name';
  }

  $: hasActiveFilters = selectedCategories.length > 0 || 
                      selectedLanguages.length > 0 || 
                      searchTerm.trim() !== '' || 
                      showFeaturedOnly;
</script>

<div class="museum-filters">
  <div class="filters-header">
    <h3>Filter Projects</h3>
    {#if hasActiveFilters}
      <button class="clear-filters" on:click={clearAllFilters}>
        Clear All
      </button>
    {/if}
  </div>

  <!-- Search -->
  <div class="filter-section">
    <label for="search" class="filter-label">Search</label>
    <input
      id="search"
      type="text"
      bind:value={searchTerm}
      placeholder="Search projects..."
      class="search-input"
    />
  </div>

  <!-- Featured Only Toggle -->
  <div class="filter-section">
    <label class="toggle-container">
      <input
        type="checkbox"
        bind:checked={showFeaturedOnly}
        class="toggle-input"
      />
      <span class="toggle-label">Featured projects only</span>
    </label>
  </div>

  <!-- Sort Options -->
  <div class="filter-section">
    <label for="sort" class="filter-label">Sort by</label>
    <select id="sort" bind:value={sortBy} class="sort-select">
      <option value="name">Alphabetical</option>
      <option value="stars">Most Stars</option>
      <option value="updated">Recently Updated</option>
    </select>
  </div>

  <!-- Categories -->
  {#if availableCategories.length > 0}
    <div class="filter-section">
      <h4 class="filter-label">Categories</h4>
      <div class="filter-options">
        {#each availableCategories as category}
          {@const catData = PROJECT_CATEGORIES[category]}
          <label class="filter-option">
            <input
              type="checkbox"
              checked={selectedCategories.includes(category)}
              on:change={() => toggleCategory(category)}
            />
            <span class="option-label">
              <span class="category-icon">{catData?.icon || '📁'}</span>
              {catData?.name || category}
            </span>
            <span class="option-count">
              ({projects.filter(p => p.category === category).length})
            </span>
          </label>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Languages -->
  {#if availableLanguages.length > 0}
    <div class="filter-section">
      <h4 class="filter-label">Languages</h4>
      <div class="filter-options">
        {#each availableLanguages as language}
          <label class="filter-option">
            <input
              type="checkbox"
              checked={selectedLanguages.includes(language)}
              on:change={() => toggleLanguage(language)}
            />
            <span class="option-label">{language}</span>
            <span class="option-count">
              ({projects.filter(p => p.language === language).length})
            </span>
          </label>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Results Summary -->
  <div class="results-summary">
    <div class="summary-text">
      Showing {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
    </div>
    {#if hasActiveFilters}
      <div class="active-filters">
        {#if selectedCategories.length > 0}
          <div class="filter-tag">
            Categories: {selectedCategories.map(c => PROJECT_CATEGORIES[c]?.name || c).join(', ')}
          </div>
        {/if}
        {#if selectedLanguages.length > 0}
          <div class="filter-tag">
            Languages: {selectedLanguages.join(', ')}
          </div>
        {/if}
        {#if showFeaturedOnly}
          <div class="filter-tag">Featured Only</div>
        {/if}
        {#if searchTerm.trim()}
          <div class="filter-tag">Search: "{searchTerm}"</div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .museum-filters {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .filters-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .clear-filters {
    background: none;
    border: 1px solid #d1d5db;
    color: #6b7280;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    /* transition removed */
  }

  .clear-filters:hover {
    border-color: #9ca3af;
    color: #374151;
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
    margin: 0;
  }

  .search-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    /* transition removed */
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .toggle-input {
    width: 1rem;
    height: 1rem;
  }

  .toggle-label {
    font-size: 0.875rem;
    color: #374151;
  }

  .sort-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
  }

  .sort-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .filter-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem 0;
    font-size: 0.875rem;
  }

  .option-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex: 1;
    color: #374151;
  }

  .category-icon {
    font-size: 1rem;
  }

  .option-count {
    color: #9ca3af;
    font-size: 0.75rem;
  }

  .results-summary {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .summary-text {
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .active-filters {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-tag {
    font-size: 0.75rem;
    color: #6b7280;
    padding: 0.25rem 0.5rem;
    background: #e5e7eb;
    border-radius: 0.25rem;
    width: fit-content;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .museum-filters {
      gap: 1rem;
    }

    .filters-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .filters-header h3 {
      font-size: 1.125rem;
    }

    .filter-section {
      gap: 0.5rem;
    }

    .results-summary {
      padding: 0.75rem;
    }
  }
</style>