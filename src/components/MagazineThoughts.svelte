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
    createdAt: string;
    updatedAt: string;
  }

  export let thoughts: Thought[] = [];
  export let processMarkdown: (text: string) => string = (t) => t;

  let selectedCategory: string = 'all';
  let sortOrder: 'newest' | 'oldest' = 'newest';
  let filtersExpanded: boolean = false;

  // Extract unique tags from all thoughts
  $: allTags = [...new Set(thoughts.flatMap(t => t.tags || []))].sort();

  // Filter and sort thoughts
  $: filteredThoughts = filterAndSort(thoughts, selectedCategory, sortOrder);

  function filterAndSort(
    thoughts: Thought[],
    category: string,
    sort: 'newest' | 'oldest'
  ): Thought[] {
    let filtered = [...thoughts];

    // Filter by category (tag)
    if (category !== 'all') {
      filtered = filtered.filter(t => t.tags && t.tags.includes(category));
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.publishDate} ${a.publishTime || '00:00'}`);
      const dateB = new Date(`${b.publishDate} ${b.publishTime || '00:00'}`);
      return sort === 'newest'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }

  // Get hero thought (first in filtered list)
  $: heroThought = filteredThoughts[0];
  // Get remaining thoughts for grid
  $: gridThoughts = filteredThoughts.slice(1);

  function selectCategory(cat: string) {
    selectedCategory = cat;
  }

  function normalizeImages(images: ThoughtImage[]): { url: string; offset: string }[] {
    return images.map(img => ({
      url: img.url,
      offset: img.offset ? `${img.offset.y || 50}%` : '50%'
    }));
  }

  // Carousel initialization
  onMount(() => {
    initCarousels();
  });

  // Re-initialize when content changes
  $: if (filteredThoughts && typeof document !== 'undefined') {
    setTimeout(initCarousels, 0);
  }

  function initCarousels() {
    if (typeof document === 'undefined') return;

    // Hero carousels
    const heroCarousels = document.querySelectorAll('[data-hero-carousel]');
    heroCarousels.forEach(initSingleCarousel);

    // Grid carousels (mini)
    const miniCarousels = document.querySelectorAll('[data-mini-carousel]');
    miniCarousels.forEach(initMiniCarousel);
  }

  function initSingleCarousel(carousel: Element) {
    const track = carousel.querySelector('[data-carousel-track]') as HTMLElement;
    const slides = carousel.querySelectorAll('[data-slide]');
    const prevButton = carousel.querySelector('.hero-carousel-button--prev') as HTMLButtonElement;
    const nextButton = carousel.querySelector('.hero-carousel-button--next') as HTMLButtonElement;
    const indicators = carousel.querySelectorAll('[data-carousel-indicator]');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;

    function updateCarousel() {
      const translateX = -currentIndex * 100;
      track.style.transform = `translateX(${translateX}%)`;
      indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
      });
    }

    function nextSlide(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % slides.length;
      updateCarousel();
    }

    function prevSlide(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      updateCarousel();
    }

    if (prevButton) prevButton.addEventListener('click', prevSlide);
    if (nextButton) nextButton.addEventListener('click', nextSlide);

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = index;
        updateCarousel();
      });
    });

    updateCarousel();
  }

  function initMiniCarousel(carousel: Element) {
    const track = carousel.querySelector('[data-mini-carousel-track]') as HTMLElement;
    const slides = carousel.querySelectorAll('[data-mini-slide]');
    const prevButton = carousel.querySelector('.grid-carousel-button--prev') as HTMLButtonElement;
    const nextButton = carousel.querySelector('.grid-carousel-button--next') as HTMLButtonElement;
    const indicators = carousel.querySelectorAll('[data-mini-carousel-indicator]');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;

    function updateCarousel() {
      const translateX = -currentIndex * 100;
      track.style.transform = `translateX(${translateX}%)`;
      indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
      });
    }

    function nextSlide(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % slides.length;
      updateCarousel();
    }

    function prevSlide(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      updateCarousel();
    }

    if (prevButton) prevButton.addEventListener('click', prevSlide);
    if (nextButton) nextButton.addEventListener('click', nextSlide);

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = index;
        updateCarousel();
      });
    });

    updateCarousel();
  }
</script>

<div class="magazine-container">
  <!-- Controls Bar -->
  <div class="controls-bar">
    <div class="filter-section">
      <button
        class="filter-toggle"
        on:click={() => filtersExpanded = !filtersExpanded}
        aria-expanded={filtersExpanded}
      >
        <span class="filter-toggle-text">
          Filter by tag
          {#if selectedCategory !== 'all'}
            <span class="active-filter-indicator">({selectedCategory})</span>
          {/if}
        </span>
        <svg
          class="filter-toggle-icon"
          class:expanded={filtersExpanded}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>
      {#if filtersExpanded}
        <div class="category-tabs">
          <button
            class="tab-button"
            class:active={selectedCategory === 'all'}
            on:click={() => selectCategory('all')}
          >
            All
          </button>
          {#each allTags as tag}
            <button
              class="tab-button"
              class:active={selectedCategory === tag}
              on:click={() => selectCategory(tag)}
            >
              {tag}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <div class="sort-control">
      <label for="sort-select" class="sort-label">Sort:</label>
      <select id="sort-select" bind:value={sortOrder} class="sort-select">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  </div>

  {#if filteredThoughts.length === 0}
    <div class="empty-state">
      <p>No thoughts found for this category.</p>
    </div>
  {:else}
    <!-- Hero Section -->
    {#if heroThought}
      <a href={`/thoughts/${heroThought.slug}`} class="hero-link">
        <article class="hero-card" style={`background-color: ${heroThought.color || 'var(--background-body)'};`}>
          {#if heroThought.images && heroThought.images.length > 0}
            <div class="hero-image-wrapper" data-carousel data-hero-carousel>
              <div class="hero-carousel-track" data-carousel-track>
                {#each normalizeImages(heroThought.images) as image, index}
                  <div class="hero-carousel-slide" data-slide={index}>
                    <img src={image.url} alt="Featured thought" style={`object-position: center ${image.offset};`} />
                  </div>
                {/each}
              </div>
              {#if heroThought.images.length > 1}
                <button class="hero-carousel-button hero-carousel-button--prev" aria-label="Previous image">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                </button>
                <button class="hero-carousel-button hero-carousel-button--next" aria-label="Next image">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9,18 15,12 9,6"></polyline>
                  </svg>
                </button>
                <div class="hero-carousel-indicators">
                  {#each heroThought.images as _, index}
                    <button
                      class="hero-carousel-indicator"
                      class:active={index === 0}
                      data-carousel-indicator={index}
                      aria-label={`Go to image ${index + 1}`}
                    ></button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
          <div class="hero-content">
            <div class="hero-text">
              {@html processMarkdown(heroThought.content)}
            </div>
            <div class="hero-meta">
              <div class="hero-datetime">
                <time>{heroThought.publishDate}</time>
                {#if heroThought.publishTime}
                  <span class="hero-time">{heroThought.publishTime}</span>
                {/if}
              </div>
              {#if heroThought.tags && heroThought.tags.length > 0}
                <div class="hero-tags">
                  {#each heroThought.tags as tag}
                    <span class="hero-tag">#{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </article>
      </a>
    {/if}

    <!-- Grid Section -->
    {#if gridThoughts.length > 0}
      <div class="thoughts-grid">
        {#each gridThoughts as thought}
          <a href={`/thoughts/${thought.slug}`} class="grid-card-link">
            <article class="grid-card" style={`background-color: ${thought.color || 'var(--background-body)'};`}>
              {#if thought.images && thought.images.length > 0}
                <div class="grid-image-wrapper" data-mini-carousel>
                  <div class="grid-carousel-track" data-mini-carousel-track>
                    {#each normalizeImages(thought.images) as image, index}
                      <div class="grid-carousel-slide" data-mini-slide={index}>
                        <img src={image.url} alt="Thought image" style={`object-position: center ${image.offset};`} />
                      </div>
                    {/each}
                  </div>
                  {#if thought.images.length > 1}
                    <button class="grid-carousel-button grid-carousel-button--prev" aria-label="Previous image">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15,18 9,12 15,6"></polyline>
                      </svg>
                    </button>
                    <button class="grid-carousel-button grid-carousel-button--next" aria-label="Next image">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9,18 15,12 9,6"></polyline>
                      </svg>
                    </button>
                    <div class="grid-carousel-indicators">
                      {#each thought.images as _, index}
                        <button
                          class="grid-carousel-indicator"
                          class:active={index === 0}
                          data-mini-carousel-indicator={index}
                          aria-label={`Go to image ${index + 1}`}
                        ></button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
              <div class="grid-content">
                <div class="grid-text">
                  {@html processMarkdown(thought.content)}
                </div>
                <div class="grid-meta">
                  <div class="grid-datetime">
                    <time>{thought.publishDate}</time>
                    {#if thought.publishTime}
                      <span class="grid-time">{thought.publishTime}</span>
                    {/if}
                  </div>
                  {#if thought.tags && thought.tags.length > 0}
                    <div class="grid-tags">
                      {#each thought.tags as tag}
                        <span class="grid-tag">#{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </article>
          </a>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .magazine-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Controls Bar */
  .controls-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-family: var(--font-family-sans);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-toggle:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .filter-toggle-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .active-filter-indicator {
    color: var(--primary-color);
    font-weight: 500;
  }

  .filter-toggle-icon {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s ease;
  }

  .filter-toggle-icon.expanded {
    transform: rotate(180deg);
  }

  .category-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-left: 0.25rem;
  }

  .tab-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-family: var(--font-family-sans);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-button:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .tab-button.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .sort-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sort-label {
    font-family: var(--font-family-sans);
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .sort-select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-main);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-family: var(--font-family-sans);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .sort-select:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Hero Card */
  .hero-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .hero-card {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 3rem;
    transition: all 0.3s ease;
  }

  .hero-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }

  .hero-image-wrapper {
    position: relative;
    width: 100%;
    height: 400px;
    overflow: hidden;
  }

  .hero-carousel-track {
    display: flex;
    height: 100%;
    transition: transform 0.3s ease;
  }

  .hero-carousel-slide {
    min-width: 100%;
    height: 100%;
  }

  .hero-carousel-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-carousel-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    width: 3rem;
    height: 3rem;
    padding: 0.5rem;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .hero-carousel-button:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  .hero-carousel-button--prev {
    left: 1rem;
  }

  .hero-carousel-button--next {
    right: 1rem;
  }

  .hero-carousel-button svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .hero-carousel-indicators {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
  }

  .hero-carousel-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid white;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .hero-carousel-indicator.active {
    background: white;
  }

  .hero-content {
    padding: 2rem;
  }

  .hero-text {
    font-size: 1.4rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 1.5rem;
  }

  .hero-text :global(p) {
    margin: 0 0 1rem 0;
  }

  .hero-text :global(p:last-child) {
    margin-bottom: 0;
  }

  .hero-text :global(strong) {
    font-weight: 600;
    color: #fff;
  }

  .hero-text :global(em) {
    font-style: italic;
  }

  .hero-text :global(code) {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .hero-text :global(a) {
    color: var(--primary-color);
    text-decoration: underline;
  }

  .hero-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .hero-datetime {
    font-family: var(--font-family-sans);
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .hero-time {
    margin-left: 0.5rem;
    opacity: 0.7;
  }

  .hero-tags {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .hero-tag {
    font-family: var(--font-family-sans);
    font-size: 0.9rem;
    color: var(--primary-color);
  }

  /* Grid Layout */
  .thoughts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .grid-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .grid-card {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
  }

  .grid-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .grid-image-wrapper {
    position: relative;
    width: 100%;
    height: 180px;
    overflow: hidden;
  }

  .grid-carousel-track {
    display: flex;
    height: 100%;
    transition: transform 0.3s ease;
  }

  .grid-carousel-slide {
    min-width: 100%;
    height: 100%;
  }

  .grid-carousel-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .grid-carousel-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .grid-carousel-button:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  .grid-carousel-button--prev {
    left: 0.5rem;
  }

  .grid-carousel-button--next {
    right: 0.5rem;
  }

  .grid-carousel-button svg {
    width: 1rem;
    height: 1rem;
  }

  .grid-carousel-indicators {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.375rem;
  }

  .grid-carousel-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid white;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .grid-carousel-indicator.active {
    background: white;
  }

  .grid-content {
    padding: 1.25rem;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .grid-text {
    font-size: 1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .grid-text :global(p) {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    line-height: 1.6;
  }

  .grid-text :global(p:last-child) {
    margin-bottom: 0;
  }

  .grid-text :global(strong) {
    font-weight: 600;
    color: #fff;
  }

  .grid-text :global(em) {
    font-style: italic;
  }

  .grid-text :global(code) {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.85em;
  }

  .grid-text :global(a) {
    color: var(--primary-color);
  }

  .grid-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .grid-datetime {
    font-family: var(--font-family-sans);
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .grid-time {
    margin-left: 0.375rem;
    opacity: 0.7;
  }

  .grid-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .grid-tag {
    font-family: var(--font-family-sans);
    font-size: 0.75rem;
    color: var(--primary-color);
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .thoughts-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .hero-image-wrapper {
      height: 320px;
    }
  }

  @media (max-width: 768px) {
    .controls-bar {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-section {
      width: 100%;
    }

    .category-tabs {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      flex-wrap: nowrap;
    }

    .tab-button {
      white-space: nowrap;
    }

    .hero-image-wrapper {
      height: 250px;
    }

    .hero-content {
      padding: 1.5rem;
    }

    .hero-text {
      font-size: 1.2rem;
    }

    .thoughts-grid {
      grid-template-columns: 1fr;
    }

    .hero-carousel-button,
    .grid-carousel-button {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .hero-image-wrapper {
      height: 200px;
    }

    .hero-content {
      padding: 1rem;
    }

    .hero-text {
      font-size: 1.1rem;
    }

    .grid-content {
      padding: 1rem;
    }
  }
</style>
