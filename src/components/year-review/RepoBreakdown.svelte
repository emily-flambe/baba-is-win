<script>
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  export let repos = [];
  export let funCommits = [];

  let visible = false;
  let element;
  let chartCanvas;
  let chart;

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
    if (!chartCanvas || repos.length === 0) return;

    const ctx = chartCanvas.getContext('2d');
    const sortedRepos = [...repos].sort((a, b) => b.prs - a.prs).slice(0, 10);

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedRepos.map(r => r.name),
        datasets: [
          {
            label: 'PRs',
            data: sortedRepos.map(r => r.prs),
            backgroundColor: 'rgba(84, 142, 155, 0.8)',
            borderColor: '#548e9b',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Lines Changed (K)',
            data: sortedRepos.map(r => Math.round(r.lines_changed / 1000)),
            backgroundColor: 'rgba(74, 124, 135, 0.6)',
            borderColor: '#4a7c87',
            borderWidth: 1,
            borderRadius: 4,
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#ccc',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 12
              },
              padding: 20
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
              display: false
            },
            ticks: {
              color: '#fff',
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

  const commitColors = [
    '#548e9b',
    '#4a7c87',
    '#6ba3b0',
    '#3d6870',
    '#7fb8c4'
  ];
</script>

<div bind:this={element} class="repo-breakdown" class:visible>
  <div class="chart-container">
    <canvas bind:this={chartCanvas}></canvas>
  </div>

  {#if funCommits && funCommits.length > 0}
    <div class="fun-commits">
      <h4 class="commits-title">Commit Messages Hall of Fame</h4>
      <div class="commits-grid">
        {#each funCommits as commit, index}
          <div
            class="commit-block"
            style="border-left-color: {commitColors[index % commitColors.length]}"
          >
            <code class="commit-message">{commit}</code>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .repo-breakdown {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;
  }

  .repo-breakdown.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .chart-container {
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    height: 400px;
    margin-bottom: 2rem;
  }

  .fun-commits {
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .commits-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 1.25rem 0;
  }

  .commits-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .commit-block {
    background: #202122;
    border-left: 3px solid #548e9b;
    border-radius: 0 6px 6px 0;
    padding: 0.875rem 1rem;
  }

  .commit-message {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    color: #ccc;
    display: block;
    word-break: break-word;
  }

  @media (max-width: 768px) {
    .chart-container {
      height: 350px;
      padding: 1rem;
    }

    .fun-commits {
      padding: 1rem;
    }
  }
</style>
