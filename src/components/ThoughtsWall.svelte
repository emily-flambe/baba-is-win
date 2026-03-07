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

  let selectedTag: string | null = null;
  let sortOrder: 'newest' | 'oldest' = 'newest';
  let filteredThoughts: Thought[] = [];
  let carouselIndexes: Record<string, number> = {};
  let focusedThoughtId: string | null = null;

  // Responsive column count - 2 columns default for wider cards
  let numColumns = 2;
  let windowWidth = 1400;

  function updateColumnCount() {
    if (typeof window !== 'undefined') {
      windowWidth = window.innerWidth;
      if (windowWidth <= 700) numColumns = 1;
      else numColumns = 2;
    }
  }

  onMount(() => {
    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  });

  // Pin the focused thought, or fall back to most recent
  $: pinnedThought = (() => {
    if (filteredThoughts.length === 0) return null;
    if (focusedThoughtId) {
      const found = filteredThoughts.find(t => t.id === focusedThoughtId);
      if (found) return found;
    }
    return filteredThoughts[0];
  })();

  // Remaining thoughts (excluding pinned) distributed into columns
  $: thoughtColumns = (() => {
    const pinnedId = pinnedThought?.id;
    const remaining = filteredThoughts.filter(t => t.id !== pinnedId);
    const columns: Thought[][] = Array.from({ length: numColumns }, () => []);
    remaining.forEach((thought, index) => {
      columns[index % numColumns].push(thought);
    });
    return columns;
  })();

  // Extract unique tags from all thoughts
  $: allTags = [...new Set(thoughts.flatMap(t => t.tags || []))].sort();

  // Filter and sort thoughts
  $: {
    let result = [...thoughts];

    // Filter by tag
    if (selectedTag) {
      result = result.filter(t => t.tags && t.tags.includes(selectedTag));
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(`${a.publishDate} ${a.publishTime || '00:00'}`);
      const dateB = new Date(`${b.publishDate} ${b.publishTime || '00:00'}`);
      return sortOrder === 'newest'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    filteredThoughts = result;
  }

  function selectTag(tag: string | null) {
    selectedTag = tag;
    focusedThoughtId = null;
  }

  function setSortOrder(order: 'newest' | 'oldest') {
    sortOrder = order;
    focusedThoughtId = null;
  }

  function focusThought(id: string) {
    focusedThoughtId = id;
    requestAnimationFrame(() => {
      document.querySelector('.pinned-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function processSimpleMarkdown(text: string): string {
    if (!text) return text;
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function getCarouselIndex(thoughtId: string): number {
    return carouselIndexes[thoughtId] || 0;
  }

  function nextSlide(thoughtId: string, totalImages: number) {
    const current = carouselIndexes[thoughtId] || 0;
    carouselIndexes[thoughtId] = (current + 1) % totalImages;
    carouselIndexes = carouselIndexes; // trigger reactivity
  }

  function prevSlide(thoughtId: string, totalImages: number) {
    const current = carouselIndexes[thoughtId] || 0;
    carouselIndexes[thoughtId] = (current - 1 + totalImages) % totalImages;
    carouselIndexes = carouselIndexes; // trigger reactivity
  }

  function goToSlide(thoughtId: string, index: number) {
    carouselIndexes[thoughtId] = index;
    carouselIndexes = carouselIndexes; // trigger reactivity
  }

  function getImageUrl(image: ThoughtImage | string): string {
    if (typeof image === 'string') return image;
    return image.url;
  }

  function getImageOffset(image: ThoughtImage | string): string {
    if (typeof image === 'string') return '50%';
    return image.offset ? `${image.offset.y}%` : '50%';
  }

  // Scroll reveal effect - cards below the fold fade in as they scroll into view
  function scrollReveal(node: HTMLElement) {
    // Check if card is mostly above the fold (top 70% of viewport)
    const rect = node.getBoundingClientRect();
    const isAboveFold = rect.top < window.innerHeight * 0.6;

    if (isAboveFold) {
      // Cards mostly in initial viewport start fully visible
      node.classList.add('in-view');
      return { destroy() {} };
    }

    // Cards below the fold start faded and reveal on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add('in-view');
            observer.unobserve(node);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    observer.observe(node);

    return {
      destroy() {
        observer.unobserve(node);
      }
    };
  }
</script>

<div class="wall-container">
  <div class="wall-header">
    <div class="title-row">
      <img src="/assets/thoughts/gerbil.png" alt="" class="gerbil-left" />
      <h1 class="wall-title">WELCOME</h1>
      <img src="/assets/thoughts/gerbil.png" alt="" class="gerbil-right" />
    </div>
    <p class="wall-subtitle">I HOPE YOU FIND WHAT YOU'RE LOOKING FOR</p>
  </div>


  {#if pinnedThought}
    <div class="pinned-section">
      <article
        class="thought-card pinned-card in-view"
        style="background-color: {pinnedThought.color || 'var(--background-body)'};"
      >
        <div class="card-content">
          <div class="thought-text">
            {@html processSimpleMarkdown(pinnedThought.content)}
          </div>

          {#if pinnedThought.images && pinnedThought.images.length > 0}
            <div class="card-carousel">
              <div class="carousel-track" style="transform: translateX(-{(carouselIndexes[pinnedThought.id] || 0) * 100}%);">
                {#each pinnedThought.images as image, i}
                  <div class="carousel-slide">
                    <img
                      src={getImageUrl(image)}
                      alt="Thought image {i + 1}"
                      loading="lazy"
                      style="object-position: center {getImageOffset(image)};"
                    />
                  </div>
                {/each}
              </div>

              {#if pinnedThought.images.length > 1}
                <button
                  class="carousel-btn carousel-btn-prev"
                  on:click={() => prevSlide(pinnedThought.id, pinnedThought.images.length)}
                  aria-label="Previous image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                </button>
                <button
                  class="carousel-btn carousel-btn-next"
                  on:click={() => nextSlide(pinnedThought.id, pinnedThought.images.length)}
                  aria-label="Next image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9,18 15,12 9,6"></polyline>
                  </svg>
                </button>

                <div class="carousel-indicators">
                  {#each pinnedThought.images as _, i}
                    <button
                      class="carousel-dot {(carouselIndexes[pinnedThought.id] || 0) === i ? 'active' : ''}"
                      on:click={() => goToSlide(pinnedThought.id, i)}
                      aria-label="Go to image {i + 1}"
                    ></button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="card-footer">
          <a href="/thoughts/{pinnedThought.slug}" class="card-date">
            <time>{pinnedThought.publishDate}</time>
            {#if pinnedThought.publishTime}
              <span class="card-time">{pinnedThought.publishTime}</span>
            {/if}
          </a>

          {#if pinnedThought.tags && pinnedThought.tags.length > 0}
            <div class="card-tags">
              {#each pinnedThought.tags as tag}
                <button
                  class="card-tag {selectedTag === tag ? 'active' : ''}"
                  on:click={() => selectTag(tag)}
                >
                  #{tag}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </article>
    </div>

    <div class="hamu-row">
      {#each Array(8) as _, i}
        <img src="/assets/thoughts/hamu.png" alt="" class="hamu" style="animation-delay: {i * 0.1}s" />
      {/each}
    </div>
  {/if}

  <div class="wall-grid">
    {#each thoughtColumns as column, colIndex}
      <div class="wall-column">
        {#each column as thought, rowIndex (thought.id)}
          <article
            class="thought-card grid-card"
            style="background-color: {thought.color || 'var(--background-body)'};"
            use:scrollReveal
            on:click={() => focusThought(thought.id)}
          >
        <div class="card-content">
          <div class="thought-text">
            {@html processSimpleMarkdown(thought.content)}
          </div>

          {#if thought.images && thought.images.length > 0}
            <div class="card-carousel">
              <div class="carousel-track" style="transform: translateX(-{(carouselIndexes[thought.id] || 0) * 100}%);">
                {#each thought.images as image, i}
                  <div class="carousel-slide">
                    <img
                      src={getImageUrl(image)}
                      alt="Thought image {i + 1}"
                      loading="lazy"
                      style="object-position: center {getImageOffset(image)};"
                    />
                  </div>
                {/each}
              </div>

              {#if thought.images.length > 1}
                <button
                  class="carousel-btn carousel-btn-prev"
                  on:click={() => prevSlide(thought.id, thought.images.length)}
                  aria-label="Previous image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                </button>
                <button
                  class="carousel-btn carousel-btn-next"
                  on:click={() => nextSlide(thought.id, thought.images.length)}
                  aria-label="Next image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9,18 15,12 9,6"></polyline>
                  </svg>
                </button>

                <div class="carousel-indicators">
                  {#each thought.images as _, i}
                    <button
                      class="carousel-dot {(carouselIndexes[thought.id] || 0) === i ? 'active' : ''}"
                      on:click={() => goToSlide(thought.id, i)}
                      aria-label="Go to image {i + 1}"
                    ></button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="card-footer">
          <a href="/thoughts/{thought.slug}" class="card-date">
            <time>{thought.publishDate}</time>
            {#if thought.publishTime}
              <span class="card-time">{thought.publishTime}</span>
            {/if}
          </a>

          {#if thought.tags && thought.tags.length > 0}
            <div class="card-tags">
              {#each thought.tags as tag}
                <button
                  class="card-tag {selectedTag === tag ? 'active' : ''}"
                  on:click={() => selectTag(tag)}
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
  </div>

  {#if filteredThoughts.length === 0}
    <div class="no-results">
      <p>No thoughts match your filter.</p>
      <button class="reset-btn" on:click={() => selectTag(null)}>Show all thoughts</button>
    </div>
  {/if}
</div>

<style>
  .wall-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .wall-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .title-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }

  .gerbil-left,
  .gerbil-right {
    width: 48px;
    height: auto;
    animation: gerbilWiggle 0.4s ease-in-out infinite alternate;
  }

  .gerbil-right {
    transform: scaleX(-1);
    animation: gerbilWiggleFlipped 0.4s ease-in-out infinite alternate;
  }

  @keyframes gerbilWiggle {
    0% { transform: rotate(-3deg); }
    100% { transform: rotate(3deg); }
  }

  @keyframes gerbilWiggleFlipped {
    0% { transform: scaleX(-1) rotate(-3deg); }
    100% { transform: scaleX(-1) rotate(3deg); }
  }

  .hamu-row {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    padding-bottom: 3rem;
    flex-wrap: wrap;
  }

  .hamu {
    width: 40px;
    height: auto;
    animation: hamuWiggle 0.3s ease-in-out infinite alternate;
  }

  @keyframes hamuWiggle {
    0% { transform: rotate(-4deg); }
    100% { transform: rotate(4deg); }
  }

  .wall-title {
    font-family: var(--font-family-sans);
    font-size: 3rem;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0 0 0.5rem 0;
    letter-spacing: 4px;
    animation: titleBounce 0.8s ease-out;
  }

  .wall-subtitle {
    font-style: italic;
    color: var(--text-secondary);
    margin: 0;
    animation: fadeSlideIn 0.6s ease-out 0.2s both;
  }

  @keyframes titleBounce {
    0% {
      opacity: 0;
      transform: translateY(-30px) scale(0.9);
    }
    60% {
      transform: translateY(5px) scale(1.02);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
  }

  .tags-collapsible {
    position: relative;
  }

  .tags-toggle {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: var(--font-family-sans);
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tags-toggle::-webkit-details-marker {
    display: none;
  }

  .tags-toggle::after {
    content: '';
    border: solid var(--text-secondary);
    border-width: 0 2px 2px 0;
    padding: 3px;
    transform: rotate(45deg);
    transition: transform 0.2s ease;
    margin-left: 0.25rem;
  }

  .tags-collapsible[open] .tags-toggle::after {
    transform: rotate(-135deg);
  }

  .tags-toggle:hover {
    background: rgba(84, 142, 155, 0.2);
    border-color: var(--primary-color);
    color: var(--text-main);
  }

  .tags-list {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    background: var(--background-body);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    max-width: 400px;
    min-width: 200px;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: tagsDropdown 0.2s ease-out;
  }

  @keyframes tagsDropdown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .filter-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: var(--font-family-sans);
  }

  .filter-btn:hover {
    background: rgba(84, 142, 155, 0.2);
    border-color: var(--primary-color);
    color: var(--text-main);
    transform: translateY(-2px);
  }

  .filter-btn.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(84, 142, 155, 0.4);
  }

  .sort-bar {
    display: flex;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 25px;
    padding: 0.25rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .sort-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: var(--font-family-sans);
  }

  .sort-btn:hover {
    color: var(--text-main);
  }

  .sort-btn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 8px rgba(84, 142, 155, 0.3);
  }

  .results-count {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 2rem;
    animation: fadeSlideIn 0.4s ease-out;
  }

  .pinned-section {
    display: flex;
    justify-content: center;
    margin-bottom: 3rem;
  }

  .pinned-card {
    max-width: 700px;
    width: 100%;
  }

  .grid-card {
    cursor: pointer;
  }

  .wall-grid {
    display: flex;
    gap: 2rem;
  }

  .wall-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .thought-card {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(20px);
  }

  .thought-card.in-view {
    opacity: 1;
    transform: translateY(0);
  }

  /* Staggered card tilts for visual interest - only when in view */
  .thought-card.in-view:nth-child(3n+1) {
    transform: translateY(0) rotate(-0.5deg);
  }
  .thought-card.in-view:nth-child(3n+2) {
    transform: translateY(0) rotate(0.3deg);
  }
  .thought-card.in-view:nth-child(3n) {
    transform: translateY(0) rotate(-0.2deg);
  }

  .thought-card:hover {
    transform: rotate(0deg) translateY(-6px) scale(1.03);
    border-color: var(--primary-color);
    box-shadow:
      0 25px 50px rgba(0, 0, 0, 0.4),
      0 0 40px rgba(84, 142, 155, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    z-index: 10;
  }

  .card-content {
    padding: 1.25rem;
    flex: 1;
  }

  .thought-text {
    font-size: 1.125rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .thought-text :global(strong) {
    font-weight: 600;
    color: #fff;
  }

  .thought-text :global(em) {
    font-style: italic;
  }

  .thought-text :global(code) {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.85em;
    font-family: monospace;
  }

  /* Carousel styles */
  .card-carousel {
    position: relative;
    margin-top: 1rem;
    border-radius: 8px;
    overflow: hidden;
    background: var(--background-body);
    border: 1px solid rgba(255, 255, 255, 0.1);
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
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .carousel-btn:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: translateY(-50%) scale(1.1);
  }

  .carousel-btn-prev {
    left: 8px;
  }

  .carousel-btn-next {
    right: 8px;
  }

  .carousel-btn svg {
    width: 16px;
    height: 16px;
  }

  .carousel-indicators {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
  }

  .carousel-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid white;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .carousel-dot.active {
    background: white;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.1);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .card-date {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-family: var(--font-family-sans);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .card-date:hover {
    color: var(--primary-color);
  }

  .card-time {
    opacity: 0.7;
  }

  .card-tags {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .card-tag {
    background: transparent;
    border: none;
    color: var(--primary-color);
    font-size: 0.75rem;
    font-family: var(--font-family-sans);
    cursor: pointer;
    padding: 0.15rem 0.4rem;
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .card-tag:hover {
    background: rgba(84, 142, 155, 0.2);
  }

  .card-tag.active {
    background: var(--primary-color);
    color: white;
  }

  .no-results {
    text-align: center;
    padding: 3rem;
    animation: fadeSlideIn 0.4s ease-out;
  }

  .no-results p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .reset-btn {
    background: var(--primary-color);
    border: none;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: var(--font-family-sans);
  }

  .reset-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(84, 142, 155, 0.4);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .wall-container {
      padding: 1rem;
    }

    .wall-title {
      font-size: 2rem;
      letter-spacing: 2px;
    }

    .controls {
      flex-direction: column;
      gap: 1rem;
    }

    .filter-bar {
      width: 100%;
    }

    .wall-grid {
      gap: 1.5rem;
    }

    .wall-column {
      gap: 1.5rem;
    }

    .carousel-btn {
      display: none;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .thought-card {
      opacity: 1;
      transform: none;
      transition: none;
    }

    .filter-btn,
    .sort-btn,
    .wall-title,
    .wall-subtitle,
    .results-count {
      animation: none;
      transition: none;
    }

    .thought-card:hover {
      transform: none;
    }

    .filter-btn:hover,
    .filter-btn.active {
      transform: none;
    }
  }
</style>
