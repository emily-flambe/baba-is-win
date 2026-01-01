<script>
  import { onMount } from 'svelte';

  export let games = [];

  let visible = false;
  let element;

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) visible = true; },
      { threshold: 0.1 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  });

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return { fullStars, halfStar, emptyStars };
  }
</script>

<div bind:this={element} class="games-list" class:visible>
  {#each games as game, index}
    {@const stars = renderStars(game.rating)}
    <div class="game-item" style="transition-delay: {index * 100}ms">
      <div class="game-header">
        <h3 class="game-title">{game.title}</h3>
        <div class="rating" aria-label="{game.rating} out of 5 stars">
          {#each Array(stars.fullStars) as _}
            <span class="star filled">★</span>
          {/each}
          {#if stars.halfStar}
            <span class="star half">★</span>
          {/if}
          {#each Array(stars.emptyStars) as _}
            <span class="star empty">★</span>
          {/each}
        </div>
      </div>
      <p class="game-description">{game.description}</p>
    </div>
  {/each}
</div>

<style>
  .games-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .game-item {
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1.25rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;
  }

  .games-list.visible .game-item {
    opacity: 1;
    transform: translateY(0);
  }

  .game-item:hover {
    border-color: rgba(84, 142, 155, 0.3);
    background: #2d2e2f;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .game-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    flex: 1;
  }

  .rating {
    flex-shrink: 0;
    display: flex;
    gap: 2px;
  }

  .star {
    font-size: 1rem;
    line-height: 1;
  }

  .star.filled {
    color: #548e9b;
  }

  .star.half {
    color: #548e9b;
    position: relative;
  }

  .star.half::after {
    content: '★';
    position: absolute;
    left: 0;
    top: 0;
    width: 50%;
    overflow: hidden;
    color: #548e9b;
  }

  .star.empty {
    color: rgba(84, 142, 155, 0.3);
  }

  .game-description {
    font-size: 0.9375rem;
    color: #ccc;
    margin: 0;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .games-list {
      grid-template-columns: 1fr;
    }

    .game-header {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
