<script>
  import { onMount } from 'svelte';

  export let value = 0;
  export let label = '';
  export let detail = '';
  export let prefix = '';
  export let suffix = '';

  let visible = false;
  let element;
  let currentValue = 0;

  function animateCounter(target, duration = 2000) {
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentValue = Math.floor(target * eased);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          animateCounter(value);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  });

  function formatNumber(num) {
    return num.toLocaleString();
  }
</script>

<div bind:this={element} class="big-number-card" class:visible>
  <div class="value">
    {#if prefix}<span class="prefix">{prefix}</span>{/if}
    <span class="number">{formatNumber(currentValue)}</span>
    {#if suffix}<span class="suffix">{suffix}</span>{/if}
  </div>
  <div class="label">{label}</div>
  {#if detail}
    <div class="detail">{detail}</div>
  {/if}
</div>

<style>
  .big-number-card {
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out, box-shadow 0.3s ease, border-color 0.3s ease;
  }

  .big-number-card.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .big-number-card:hover {
    transform: translateY(-4px);
    border-color: rgba(84, 142, 155, 0.5);
    box-shadow: 0 8px 30px rgba(84, 142, 155, 0.15);
  }

  .value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 3rem;
    font-weight: 700;
    color: #548e9b;
    line-height: 1;
    margin-bottom: 0.75rem;
  }

  .prefix,
  .suffix {
    font-size: 1.5rem;
    color: #4a7c87;
  }

  .number {
    display: inline-block;
  }

  .label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    font-weight: 500;
    color: #fff;
    margin-bottom: 0.5rem;
  }

  .detail {
    font-size: 0.875rem;
    color: #ccc;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    .big-number-card {
      padding: 1.5rem;
    }

    .value {
      font-size: 2.25rem;
    }

    .prefix,
    .suffix {
      font-size: 1.125rem;
    }

    .label {
      font-size: 0.875rem;
    }
  }
</style>
