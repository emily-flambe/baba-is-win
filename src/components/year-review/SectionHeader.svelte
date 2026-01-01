<script>
  import { onMount } from 'svelte';

  export let label = '';
  export let title = '';
  export let subtitle = '';

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

<header bind:this={element} class="section-header" class:visible>
  {#if label}
    <span class="label">{label}</span>
  {/if}
  <h2 class="title">{title}</h2>
  {#if subtitle}
    <p class="subtitle">{subtitle}</p>
  {/if}
</header>

<style>
  .section-header {
    text-align: center;
    margin-bottom: 3rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;
  }

  .section-header.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .label {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(84, 142, 155, 0.2);
    color: #548e9b;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.5rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.75rem 0;
    line-height: 1.2;
  }

  .subtitle {
    font-size: 1.125rem;
    color: #ccc;
    margin: 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .title {
      font-size: 1.75rem;
    }

    .subtitle {
      font-size: 1rem;
    }
  }
</style>
