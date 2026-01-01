<script>
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  export let data = [];
  export let metrics = [];
  export let title = '';

  let visible = false;
  let element;
  let chartCanvas;
  let chart;

  const colorPalette = [
    { bg: 'rgba(84, 142, 155, 0.3)', border: '#548e9b' },
    { bg: 'rgba(74, 124, 135, 0.3)', border: '#4a7c87' },
    { bg: 'rgba(107, 163, 176, 0.3)', border: '#6ba3b0' },
    { bg: 'rgba(61, 104, 112, 0.3)', border: '#3d6870' },
    { bg: 'rgba(127, 184, 196, 0.3)', border: '#7fb8c4' }
  ];

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          createChart();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (chart) chart.destroy();
    };
  });

  function createChart() {
    if (!chartCanvas || data.length === 0 || metrics.length === 0) return;

    const ctx = chartCanvas.getContext('2d');
    const labels = data.map(d => d.month || d.label || '');

    const datasets = metrics.map((metric, index) => ({
      label: metric.label || metric.key,
      data: data.map(d => d[metric.key] ?? 0),
      backgroundColor: colorPalette[index % colorPalette.length].bg,
      borderColor: colorPalette[index % colorPalette.length].border,
      borderWidth: 2,
      fill: metric.fill !== false,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: colorPalette[index % colorPalette.length].border
    }));

    chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#ccc',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 12
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#2a2b2c',
            titleColor: '#fff',
            bodyColor: '#ccc',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleFont: {
              family: "'JetBrains Mono', monospace"
            },
            bodyFont: {
              family: "'JetBrains Mono', monospace"
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#ccc',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#ccc',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11
              }
            }
          }
        }
      }
    });
  }
</script>

<div bind:this={element} class="trend-chart" class:visible>
  {#if title}
    <h4 class="chart-title">{title}</h4>
  {/if}
  <div class="chart-container">
    <canvas bind:this={chartCanvas}></canvas>
  </div>
</div>

<style>
  .trend-chart {
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;
  }

  .trend-chart.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .chart-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 1.25rem 0;
    text-align: center;
  }

  .chart-container {
    height: 350px;
    position: relative;
  }

  @media (max-width: 768px) {
    .trend-chart {
      padding: 1rem;
    }

    .chart-container {
      height: 280px;
    }

    .chart-title {
      font-size: 1rem;
    }
  }
</style>
