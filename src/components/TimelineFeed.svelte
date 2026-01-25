<script lang="ts">
  import { onMount } from 'svelte';

  // Types
  interface ThoughtImage {
    url: string;
    offset?: string;
  }

  interface Thought {
    id: string;
    slug: string;
    title: string | null;
    content: string;
    color: string | null;
    images: ThoughtImage[];
    tags: string[];
    status: string;
    publishDate: string | null;
    publishTime: string | null;
    createdAt: string;
    updatedAt: string;
  }

  // State
  let thoughts: Thought[] = [];
  let filteredThoughts: Thought[] = [];
  let allTags: string[] = [];
  let selectedTags: Set<string> = new Set();
  let sortOrder: 'newest' | 'oldest' = 'newest';
  let dateRange: 'all' | 'week' | 'month' = 'all';
  let isLoading = true;
  let error: string | null = null;
  let carouselIndices: Record<string, number> = {};

  // Fetch thoughts on mount
  onMount(async () => {
    try {
      const response = await fetch('/api/thoughts');
      if (!response.ok) {
        throw new Error('Failed to fetch thoughts');
      }
      const data = await response.json();
      thoughts = data.thoughts || [];

      // Extract all unique tags
      const tagSet = new Set<string>();
      thoughts.forEach(thought => {
        thought.tags?.forEach(tag => tagSet.add(tag));
      });
      allTags = Array.from(tagSet).sort();

      applyFilters();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  });

  // Apply filters and sorting
  function applyFilters() {
    let result = [...thoughts];

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateRange === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }
      result = result.filter(thought => {
        if (!thought.publishDate) return false;
        const thoughtDate = new Date(thought.publishDate);
        return thoughtDate >= cutoff;
      });
    }

    // Filter by selected tags (multi-select - thought must have ALL selected tags)
    if (selectedTags.size > 0) {
      result = result.filter(thought => {
        const thoughtTags = new Set(thought.tags || []);
        return Array.from(selectedTags).every(tag => thoughtTags.has(tag));
      });
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(`${a.publishDate} ${a.publishTime || '00:00'}`);
      const dateB = new Date(`${b.publishDate} ${b.publishTime || '00:00'}`);
      return sortOrder === 'newest'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    filteredThoughts = result;
  }

  // Toggle tag selection
  function toggleTag(tag: string) {
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }
    selectedTags = selectedTags; // Trigger reactivity
    applyFilters();
  }

  // Clear all filters
  function clearFilters() {
    selectedTags = new Set();
    dateRange = 'all';
    applyFilters();
  }

  // Set date range
  function setDateRange(range: 'all' | 'week' | 'month') {
    dateRange = range;
    applyFilters();
  }

  // Toggle sort order
  function toggleSort() {
    sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
    applyFilters();
  }

  // Simple markdown processing
  function processMarkdown(text: string): string {
    if (!text) return text;
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // Group thoughts by date for timeline display
  function getThoughtsByDate(thoughts: Thought[]): Record<string, Thought[]> {
    return thoughts.reduce((acc, thought) => {
      const date = thought.publishDate || 'Unknown Date';
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(thought);
      return acc;
    }, {} as Record<string, Thought[]>);
  }

  // Format date for display
  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Carousel navigation
  function nextImage(thoughtId: string, totalImages: number) {
    const current = carouselIndices[thoughtId] || 0;
    carouselIndices[thoughtId] = (current + 1) % totalImages;
    carouselIndices = carouselIndices;
  }

  function prevImage(thoughtId: string, totalImages: number) {
    const current = carouselIndices[thoughtId] || 0;
    carouselIndices[thoughtId] = (current - 1 + totalImages) % totalImages;
    carouselIndices = carouselIndices;
  }

  function goToImage(thoughtId: string, index: number) {
    carouselIndices[thoughtId] = index;
    carouselIndices = carouselIndices;
  }

  $: thoughtsByDate = getThoughtsByDate(filteredThoughts);
  $: hasActiveFilters = selectedTags.size > 0 || dateRange !== 'all';
</script>

<div class="timeline-container">
  <!-- Filter Controls -->
  <div class="filter-controls">
    <div class="filter-section">
      <div class="filter-row">
        <div class="date-filters">
          <button
            class="date-btn"
            class:active={dateRange === 'all'}
            on:click={() => setDateRange('all')}
          >
            All Time
          </button>
          <button
            class="date-btn"
            class:active={dateRange === 'month'}
            on:click={() => setDateRange('month')}
          >
            This Month
          </button>
          <button
            class="date-btn"
            class:active={dateRange === 'week'}
            on:click={() => setDateRange('week')}
          >
            This Week
          </button>
        </div>

        <button class="sort-toggle" on:click={toggleSort}>
          {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          <svg class="sort-icon" class:flipped={sortOrder === 'oldest'} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </button>
      </div>

      {#if allTags.length > 0}
        <details class="tag-filters-collapsible">
          <summary class="tag-filters-toggle">
            Filter by tags ({allTags.length})
            <svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </summary>
          <div class="tag-filters">
            {#each allTags as tag}
              <button
                class="tag-pill"
                class:selected={selectedTags.has(tag)}
                on:click={() => toggleTag(tag)}
              >
                #{tag}
              </button>
            {/each}
          </div>
        </details>
      {/if}

      {#if hasActiveFilters}
        <button class="clear-filters" on:click={clearFilters}>
          Clear Filters
        </button>
      {/if}
    </div>
  </div>

  <!-- Timeline Feed -->
  <div class="timeline-feed">
    {#if isLoading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading thoughts...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>Error: {error}</p>
      </div>
    {:else if filteredThoughts.length === 0}
      <div class="empty-state">
        <p>No thoughts found matching your filters.</p>
        {#if hasActiveFilters}
          <button class="clear-filters" on:click={clearFilters}>Clear Filters</button>
        {/if}
      </div>
    {:else}
      {#each Object.entries(thoughtsByDate) as [date, dateThoughts]}
        <div class="date-group">
          <div class="date-divider">
            <span class="date-label">{formatDate(date)}</span>
          </div>

          {#each dateThoughts as thought (thought.id)}
            <article
              class="thought-card"
              style="background-color: {thought.color || 'var(--background-body)'}"
            >
              <div class="thought-content">
                <div class="thought-text">
                  {@html processMarkdown(thought.content)}
                </div>

                {#if thought.images && thought.images.length > 0}
                  <div class="thought-carousel">
                    <div class="carousel-track" style="transform: translateX(-{(carouselIndices[thought.id] || 0) * 100}%)">
                      {#each thought.images as image, index}
                        <div class="carousel-slide">
                          <img
                            src={typeof image === 'string' ? image : image.url}
                            alt="Thought image {index + 1}"
                            loading="lazy"
                            style="object-position: center {typeof image === 'string' ? '50%' : (image.offset || '50%')}"
                          />
                        </div>
                      {/each}
                    </div>

                    {#if thought.images.length > 1}
                      <button
                        class="carousel-btn carousel-btn--prev"
                        on:click={() => prevImage(thought.id, thought.images.length)}
                        aria-label="Previous image"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="15,18 9,12 15,6"></polyline>
                        </svg>
                      </button>
                      <button
                        class="carousel-btn carousel-btn--next"
                        on:click={() => nextImage(thought.id, thought.images.length)}
                        aria-label="Next image"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9,18 15,12 9,6"></polyline>
                        </svg>
                      </button>

                      <div class="carousel-indicators">
                        {#each thought.images as _, index}
                          <button
                            class="carousel-indicator"
                            class:active={(carouselIndices[thought.id] || 0) === index}
                            on:click={() => goToImage(thought.id, index)}
                            aria-label="Go to image {index + 1}"
                          ></button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>

              <div class="thought-meta">
                <a href="/thoughts/{thought.slug}" class="thought-time">
                  <time>{thought.publishTime || ''}</time>
                </a>
                {#if thought.tags && thought.tags.length > 0}
                  <div class="thought-tags">
                    {#each thought.tags as tag}
                      <button
                        class="tag"
                        class:selected={selectedTags.has(tag)}
                        on:click={() => toggleTag(tag)}
                      >
                        #{tag}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .timeline-container {
    max-width: 650px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Filter Controls */
  .filter-controls {
    position: sticky;
    top: 0;
    background: var(--background-body);
    padding: 1rem 0;
    z-index: 10;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 2rem;
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .filter-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .date-filters {
    display: flex;
    gap: 0.5rem;
  }

  .date-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    font-family: var(--font-family-sans);
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .date-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .date-btn.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .sort-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    font-family: var(--font-family-sans);
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .sort-toggle:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .sort-icon {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s ease;
  }

  .sort-icon.flipped {
    transform: rotate(180deg);
  }

  .tag-filters-collapsible {
    width: 100%;
  }

  .tag-filters-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-family: var(--font-family-sans);
    font-size: 0.85rem;
    color: var(--text-secondary);
    padding: 0.5rem 0;
    user-select: none;
    list-style: none;
  }

  .tag-filters-toggle::-webkit-details-marker {
    display: none;
  }

  .tag-filters-toggle:hover {
    color: var(--primary-color);
  }

  .toggle-icon {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s ease;
  }

  details[open] .toggle-icon {
    transform: rotate(180deg);
  }

  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.5rem;
  }

  .tag-pill {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-secondary);
    padding: 0.35rem 0.75rem;
    border-radius: 15px;
    cursor: pointer;
    font-family: var(--font-family-sans);
    font-size: 0.8rem;
    transition: all 0.2s ease;
  }

  .tag-pill:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .tag-pill.selected {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .clear-filters {
    align-self: flex-start;
    background: transparent;
    border: none;
    color: var(--primary-color);
    font-family: var(--font-family-sans);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.25rem 0;
    text-decoration: underline;
    transition: color 0.2s ease;
  }

  .clear-filters:hover {
    color: white;
  }

  /* Timeline Feed */
  .timeline-feed {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .date-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .date-divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .date-divider::before,
  .date-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }

  .date-label {
    font-family: var(--font-family-sans);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--primary-color);
    white-space: nowrap;
  }

  /* Thought Cards */
  .thought-card {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .thought-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .thought-content {
    padding: 1rem 1.25rem;
  }

  .thought-text {
    font-size: 1rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .thought-text :global(strong) {
    font-weight: 600;
    color: #fff;
  }

  .thought-text :global(code) {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.85em;
    font-family: monospace;
  }

  /* Carousel */
  .thought-carousel {
    position: relative;
    margin-top: 1rem;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
  }

  .carousel-track {
    display: flex;
    transition: transform 0.3s ease;
  }

  .carousel-slide {
    min-width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .carousel-slide img {
    width: 100%;
    height: 280px;
    object-fit: cover;
  }

  .carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 5;
  }

  .carousel-btn:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .carousel-btn--prev {
    left: 0.75rem;
  }

  .carousel-btn--next {
    right: 0.75rem;
  }

  .carousel-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .carousel-indicators {
    position: absolute;
    bottom: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
  }

  .carousel-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid white;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
  }

  .carousel-indicator.active {
    background: white;
  }

  /* Thought Meta */
  .thought-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1.25rem 1rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .thought-time {
    color: inherit;
    text-decoration: none;
    font-family: var(--font-family-sans);
    transition: color 0.2s ease;
  }

  .thought-time:hover {
    color: var(--primary-color);
    text-decoration: underline;
  }

  .thought-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tag {
    background: transparent;
    border: none;
    color: var(--primary-color);
    font-family: var(--font-family-sans);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0;
    opacity: 0.8;
    transition: all 0.2s ease;
  }

  .tag:hover {
    opacity: 1;
  }

  .tag.selected {
    text-decoration: underline;
    opacity: 1;
  }

  /* States */
  .loading-state,
  .error-state,
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    margin: 0 auto 1rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    color: #ff6b6b;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .timeline-container {
      padding: 0 0.5rem;
    }

    .filter-row {
      flex-direction: column;
      align-items: stretch;
    }

    .date-filters {
      justify-content: center;
    }

    .sort-toggle {
      justify-content: center;
    }

    .tag-filters {
      justify-content: center;
    }

    .thought-content {
      padding: 1rem;
    }

    .thought-meta {
      padding: 0.75rem 1rem 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .carousel-btn {
      display: none;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .thought-card,
    .carousel-track,
    .loading-spinner {
      transition: none;
      animation: none;
    }
  }
</style>
