<script lang="ts">
  import { onMount } from 'svelte';

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
    publishDate: string | null;
    publishTime: string | null;
  }

  export let thoughts: Thought[] = [];

  let searchQuery = '';
  let selectedTags: Set<string> = new Set();
  let sortOrder: 'newest' | 'oldest' = 'newest';
  let tagsExpanded = false;

  // Extract all unique tags from thoughts
  $: allTags = [...new Set(thoughts.flatMap(t => t.tags || []))].sort();

  // Filter and sort thoughts
  $: filteredThoughts = thoughts
    .filter(thought => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        thought.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (thought.title && thought.title.toLowerCase().includes(searchQuery.toLowerCase()));

      // Tag filter
      const matchesTags = selectedTags.size === 0 ||
        (thought.tags && thought.tags.some(tag => selectedTags.has(tag)));

      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.publishDate || '1970-01-01'} ${a.publishTime || '00:00'}`);
      const dateB = new Date(`${b.publishDate || '1970-01-01'} ${b.publishTime || '00:00'}`);
      return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

  function toggleTag(tag: string) {
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }
    selectedTags = selectedTags; // Trigger reactivity
  }

  function clearFilters() {
    searchQuery = '';
    selectedTags = new Set();
    sortOrder = 'newest';
  }

  function processSimpleMarkdown(text: string): string {
    if (!text) return text;
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // Carousel state management per card
  let carouselIndices: { [key: string]: number } = {};

  function getCarouselIndex(thoughtId: string): number {
    return carouselIndices[thoughtId] || 0;
  }

  function nextImage(thoughtId: string, totalImages: number) {
    const current = getCarouselIndex(thoughtId);
    carouselIndices[thoughtId] = (current + 1) % totalImages;
    carouselIndices = carouselIndices;
  }

  function prevImage(thoughtId: string, totalImages: number) {
    const current = getCarouselIndex(thoughtId);
    carouselIndices[thoughtId] = (current - 1 + totalImages) % totalImages;
    carouselIndices = carouselIndices;
  }

  function goToImage(thoughtId: string, index: number) {
    carouselIndices[thoughtId] = index;
    carouselIndices = carouselIndices;
  }

  function getImageUrl(image: ThoughtImage | string): string {
    return typeof image === 'string' ? image : image.url;
  }

  function getImageOffset(image: ThoughtImage | string): string {
    if (typeof image === 'string') return '50%';
    return image.offset || '50%';
  }
</script>

<div class="thoughts-page">
  <div class="filter-bar">
    <div class="filter-bar-inner">
      <div class="search-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <input
          type="text"
          class="search-input"
          placeholder="Search thoughts..."
          bind:value={searchQuery}
        />
      </div>

      <div class="filter-controls">
        {#if allTags.length > 0}
          <div class="tags-collapsible">
            <button
              class="tags-toggle"
              on:click={() => tagsExpanded = !tagsExpanded}
              aria-expanded={tagsExpanded}
            >
              <span>Filter by tag ({allTags.length})</span>
              <svg class="toggle-icon" class:expanded={tagsExpanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
            {#if tagsExpanded}
              <div class="tag-pills">
                {#each allTags as tag}
                  <button
                    class="tag-pill"
                    class:active={selectedTags.has(tag)}
                    on:click={() => toggleTag(tag)}
                  >
                    #{tag}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <select class="sort-dropdown" bind:value={sortOrder}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        {#if searchQuery || selectedTags.size > 0}
          <button class="clear-btn" on:click={clearFilters}>
            Clear
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="results-count">
    {filteredThoughts.length} thought{filteredThoughts.length !== 1 ? 's' : ''}
  </div>

  <div class="grid">
    {#each filteredThoughts as thought (thought.id)}
      <article class="card" style="--card-bg: {thought.color || 'var(--background-body)'}">
        <a href="/thoughts/{thought.slug}" class="card-link">
          {#if thought.images && thought.images.length > 0}
            <div class="card-carousel">
              <div class="carousel-track" style="transform: translateX(-{getCarouselIndex(thought.id) * 100}%)">
                {#each thought.images as image, idx}
                  <div class="carousel-slide">
                    <img
                      src={getImageUrl(image)}
                      alt="Thought image {idx + 1}"
                      loading="lazy"
                      style="object-position: center {getImageOffset(image)}"
                    />
                  </div>
                {/each}
              </div>
              {#if thought.images.length > 1}
                <button
                  class="carousel-btn carousel-btn-prev"
                  on:click|preventDefault|stopPropagation={() => prevImage(thought.id, thought.images.length)}
                  aria-label="Previous image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                </button>
                <button
                  class="carousel-btn carousel-btn-next"
                  on:click|preventDefault|stopPropagation={() => nextImage(thought.id, thought.images.length)}
                  aria-label="Next image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9,18 15,12 9,6"></polyline>
                  </svg>
                </button>
                <div class="carousel-indicators">
                  {#each thought.images as _, idx}
                    <button
                      class="carousel-indicator"
                      class:active={getCarouselIndex(thought.id) === idx}
                      on:click|preventDefault|stopPropagation={() => goToImage(thought.id, idx)}
                      aria-label="Go to image {idx + 1}"
                    ></button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          <div class="card-content">
            <div class="card-text" >
              {@html processSimpleMarkdown(thought.content)}
            </div>
          </div>

          <div class="card-footer">
            <div class="card-meta">
              {#if thought.publishDate}
                <time>{thought.publishDate}</time>
              {/if}
              {#if thought.publishTime}
                <span class="meta-time">{thought.publishTime}</span>
              {/if}
            </div>
            {#if thought.tags && thought.tags.length > 0}
              <div class="card-tags">
                {#each thought.tags as tag}
                  <span class="card-tag">#{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
        </a>
      </article>
    {/each}
  </div>

  {#if filteredThoughts.length === 0}
    <div class="no-results">
      <p>No thoughts match your filters.</p>
      <button class="clear-btn" on:click={clearFilters}>Clear filters</button>
    </div>
  {/if}
</div>

<style>
  .thoughts-page {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .filter-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(32, 33, 34, 0.95);
    backdrop-filter: blur(10px);
    padding: 1rem 0;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .filter-bar-inner {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .search-wrapper {
    position: relative;
    width: 100%;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: var(--text-secondary);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 3rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-main);
    font-size: 1rem;
    font-family: var(--font-family-sans);
    transition: all 0.2s ease;
  }

  .search-input::placeholder {
    color: var(--text-secondary);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    background: rgba(255, 255, 255, 0.08);
  }

  .filter-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .tags-collapsible {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .tags-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-family: var(--font-family-sans);
    cursor: pointer;
    transition: all 0.2s ease;
    width: fit-content;
  }

  .tags-toggle:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .toggle-icon {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s ease;
  }

  .toggle-icon.expanded {
    transform: rotate(180deg);
  }

  .tag-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    flex: 1;
  }

  .tag-pill {
    padding: 0.375rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-family: var(--font-family-sans);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tag-pill:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .tag-pill.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .sort-dropdown {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-main);
    font-size: 0.9rem;
    font-family: var(--font-family-sans);
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
  }

  .sort-dropdown:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .clear-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-family: var(--font-family-sans);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--text-main);
  }

  .results-count {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-family: var(--font-family-sans);
    margin-bottom: 1.5rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: var(--card-bg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .card-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .card-carousel {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    background: rgba(0, 0, 0, 0.2);
  }

  .carousel-track {
    display: flex;
    height: 100%;
    transition: transform 0.3s ease;
  }

  .carousel-slide {
    min-width: 100%;
    height: 100%;
  }

  .carousel-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10;
  }

  .card:hover .carousel-btn {
    opacity: 1;
  }

  .carousel-btn:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  .carousel-btn-prev {
    left: 0.5rem;
  }

  .carousel-btn-next {
    right: 0.5rem;
  }

  .carousel-btn svg {
    width: 1rem;
    height: 1rem;
  }

  .carousel-indicators {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.375rem;
  }

  .carousel-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid white;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
  }

  .carousel-indicator.active {
    background: white;
  }

  .card-content {
    padding: 1.25rem;
  }

  .card-text {
    font-size: 0.95rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-text :global(strong) {
    font-weight: 600;
    color: white;
  }

  .card-text :global(code) {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.85em;
    font-family: monospace;
  }

  .card-footer {
    padding: 0 1.25rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .card-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-family: var(--font-family-sans);
  }

  .meta-time {
    opacity: 0.7;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    justify-content: flex-end;
  }

  .card-tag {
    font-size: 0.75rem;
    color: var(--primary-color);
    font-family: var(--font-family-sans);
  }

  .no-results {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);
  }

  .no-results p {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .filter-bar {
      padding: 0.75rem 0;
    }

    .filter-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .tag-pills {
      order: 2;
    }

    .sort-dropdown {
      width: 100%;
    }

    .card-content {
      padding: 1rem;
    }

    .card-footer {
      padding: 0 1rem 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .card-tags {
      justify-content: flex-start;
    }
  }
</style>
