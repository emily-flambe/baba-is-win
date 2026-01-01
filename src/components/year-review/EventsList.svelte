<script>
  import { onMount } from 'svelte';

  export let events = [];

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
</script>

<div bind:this={element} class="events-list" class:visible>
  {#each events as event, index}
    <div class="event-item" style="transition-delay: {index * 100}ms">
      <span class="month-tag">{event.month}</span>
      <div class="event-content">
        <h3 class="event-title">{event.title}</h3>
        <p class="event-description">{event.description}</p>
      </div>
    </div>
  {/each}
</div>

<style>
  .events-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .event-item {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1.25rem;
    opacity: 0;
    transform: translateX(-20px);
    transition: all 0.6s ease-out;
  }

  .events-list.visible .event-item {
    opacity: 1;
    transform: translateX(0);
  }

  .event-item:hover {
    border-color: rgba(84, 142, 155, 0.3);
    background: #2d2e2f;
  }

  .month-tag {
    flex-shrink: 0;
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: rgba(84, 142, 155, 0.2);
    color: #548e9b;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 4px;
  }

  .event-content {
    flex: 1;
    min-width: 0;
  }

  .event-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 0.5rem 0;
  }

  .event-description {
    font-size: 0.9375rem;
    color: #ccc;
    margin: 0;
    line-height: 1.6;
  }

  @media (max-width: 640px) {
    .event-item {
      flex-direction: column;
      gap: 0.75rem;
    }

    .event-title {
      font-size: 1rem;
    }
  }
</style>
