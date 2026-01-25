<script lang="ts">
  import { onMount } from 'svelte';

  interface ThoughtImage {
    url: string;
    offset?: { x: number; y: number };
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
  }

  export let thoughts: Thought[] = [];
  export let allTags: string[] = [];

  let selectedTags: Set<string> = new Set();
  let sortOrder: 'newest' | 'oldest' = 'newest';
  let mounted = false;

  $: filteredThoughts = thoughts
    .filter(thought => {
      if (selectedTags.size === 0) return true;
      return thought.tags.some(tag => selectedTags.has(tag));
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.publishDate || '1970-01-01'} ${a.publishTime || '00:00'}`);
      const dateB = new Date(`${b.publishDate || '1970-01-01'} ${b.publishTime || '00:00'}`);
      return sortOrder === 'newest'
        ? dateB.valueOf() - dateA.valueOf()
        : dateA.valueOf() - dateB.valueOf();
    });

  function toggleTag(tag: string) {
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }
    selectedTags = selectedTags;
  }

  function clearFilters() {
    selectedTags = new Set();
  }

  function processSimpleMarkdown(text: string): string {
    if (!text) return text;
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // Carousel state per thought
  let carouselIndices: Record<string, number> = {};

  function getCarouselIndex(thoughtId: string): number {
    return carouselIndices[thoughtId] || 0;
  }

  function nextSlide(thoughtId: string, imageCount: number) {
    const current = getCarouselIndex(thoughtId);
    carouselIndices[thoughtId] = (current + 1) % imageCount;
    carouselIndices = carouselIndices;
  }

  function prevSlide(thoughtId: string, imageCount: number) {
    const current = getCarouselIndex(thoughtId);
    carouselIndices[thoughtId] = (current - 1 + imageCount) % imageCount;
    carouselIndices = carouselIndices;
  }

  function goToSlide(thoughtId: string, index: number) {
    carouselIndices[thoughtId] = index;
    carouselIndices = carouselIndices;
  }

  onMount(() => {
    mounted = true;
  });
</script>

<div class="thoughts-masonry-container">
  <div class="controls-bar">
    <div class="tag-filters">
      <span class="filter-label">Filter:</span>
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
      {#if selectedTags.size > 0}
        <button class="clear-filters" on:click={clearFilters}>
          Clear
        </button>
      {/if}
    </div>
    <div class="sort-control">
      <label for="sort-select">Sort:</label>
      <select id="sort-select" bind:value={sortOrder}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  </div>

  <div class="masonry-grid">
    {#each filteredThoughts as thought (thought.id)}
      <article
        class="thought-card"
        style="background-color: {thought.color || 'var(--background-body)'};"
      >
        <a href="/thoughts/{thought.slug}" class="thought-link">
          <div class="thought-content" set:innerHTML={processSimpleMarkdown(thought.content)}>
          </div>
        </a>

        {#if thought.images && thought.images.length > 0}
          <div class="thought-carousel">
            <div class="carousel-wrapper">
              <div
                class="carousel-track"
                style="transform: translateX(-{getCarouselIndex(thought.id) * 100}%)"
              >
                {#each thought.images as image, index}
                  <div class="carousel-slide">
                    <img
                      src={typeof image === 'string' ? image : image.url}
                      alt="Thought image {index + 1}"
                      loading="lazy"
                    />
                  </div>
                {/each}
              </div>

              {#if thought.images.length > 1}
                <button
                  class="carousel-button carousel-button--prev"
                  on:click={() => prevSlide(thought.id, thought.images.length)}
                  aria-label="Previous image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                </button>
                <button
                  class="carousel-button carousel-button--next"
                  on:click={() => nextSlide(thought.id, thought.images.length)}
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
                      class:active={getCarouselIndex(thought.id) === index}
                      on:click={() => goToSlide(thought.id, index)}
                      aria-label="Go to image {index + 1}"
                    ></button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <div class="thought-meta">
          <div class="thought-datetime">
            <time>{thought.publishDate}</time>
            {#if thought.publishTime}
              <span class="thought-time">{thought.publishTime}</span>
            {/if}
          </div>
          {#if thought.tags && thought.tags.length > 0}
            <div class="thought-tags">
              {#each thought.tags as tag}
                <button
                  class="tag-link"
                  class:active={selectedTags.has(tag)}
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

  {#if filteredThoughts.length === 0}
    <div class="no-results">
      <p>No thoughts match the selected filters.</p>
      <button class="clear-filters" on:click={clearFilters}>Clear filters</button>
    </div>
  {/if}
</div>

<style>
  .thoughts-masonry-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
  }

  .controls-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding: 1.25rem;
    background: linear-gradient(135deg, #2a2a2a 0%, #222 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }

  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .filter-label {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .tag-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    padding: 0.4rem 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .tag-pill:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
  }

  .tag-pill.active {
    background: var(--primary-color, #e91e63);
    border-color: var(--primary-color, #e91e63);
    color: #fff;
  }

  .clear-filters {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 0.4rem 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .clear-filters:hover {
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }

  .sort-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sort-control label {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }

  .sort-control select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
  }

  .sort-control select:focus {
    outline: none;
    border-color: var(--primary-color, #e91e63);
  }

  .masonry-grid {
    column-count: 3;
    column-gap: 1.5rem;
  }

  .thought-card {
    break-inside: avoid;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .thought-card:hover {
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    transform: translateY(-2px);
  }

  .thought-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .thought-content {
    padding: 1.25rem;
    font-size: 1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .thought-content :global(strong) {
    font-weight: 600;
    color: #fff;
  }

  .thought-content :global(code) {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.125rem 0.3rem;
    border-radius: 3px;
    font-size: 0.85em;
    font-family: 'Courier New', monospace;
  }

  .thought-carousel {
    position: relative;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
  }

  .carousel-wrapper {
    position: relative;
    overflow: hidden;
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

  .carousel-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: white;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .carousel-button:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .carousel-button--prev {
    left: 8px;
  }

  .carousel-button--next {
    right: 8px;
  }

  .carousel-button svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .carousel-indicators {
    position: absolute;
    bottom: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.4rem;
  }

  .carousel-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid white;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .carousel-indicator.active {
    background: white;
  }

  .thought-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .thought-datetime {
    display: flex;
    gap: 0.5rem;
    font-family: var(--font-family-sans, sans-serif);
  }

  .thought-time {
    opacity: 0.7;
  }

  .thought-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .tag-link {
    background: transparent;
    border: none;
    padding: 0;
    color: var(--primary-color, #e91e63);
    font-size: 0.75rem;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s ease;
    font-family: inherit;
  }

  .tag-link:hover,
  .tag-link.active {
    opacity: 1;
    text-decoration: underline;
  }

  .no-results {
    text-align: center;
    padding: 3rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .no-results p {
    margin-bottom: 1rem;
  }

  /* Responsive breakpoints */
  @media (max-width: 1200px) {
    .masonry-grid {
      column-count: 2;
    }
  }

  @media (max-width: 768px) {
    .masonry-grid {
      column-count: 1;
    }

    .controls-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .tag-filters {
      flex-direction: column;
      align-items: flex-start;
    }

    .sort-control {
      justify-content: flex-start;
    }

    .carousel-button {
      width: 2rem;
      height: 2rem;
    }

    .carousel-button svg {
      width: 1rem;
      height: 1rem;
    }
  }

  @media (max-width: 480px) {
    .thoughts-masonry-container {
      padding: 0.5rem;
    }

    .controls-bar {
      padding: 1rem;
    }

    .thought-content {
      padding: 1rem;
      font-size: 0.95rem;
    }

    .carousel-slide img {
      height: 220px;
    }

    .thought-meta {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
</style>
