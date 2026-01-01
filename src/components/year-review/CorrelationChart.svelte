<script>
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  export let data = [];

  let visible = false;
  let element;
  let lineChartCanvas;
  let scatterChartCanvas;
  let lineChart;
  let scatterChart;

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          createCharts();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (lineChart) lineChart.destroy();
      if (scatterChart) scatterChart.destroy();
    };
  });

  function calculate7DayMovingAverage(values) {
    const result = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - 6);
      const window = values.slice(start, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      result.push(avg);
    }
    return result;
  }

  function calculateTrendLine(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...x);
    const maxX = Math.max(...x);

    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept }
    ];
  }

  function createCharts() {
    if (!lineChartCanvas || !scatterChartCanvas || data.length === 0) return;

    const labels = data.map(d => d.date || d.day || `Day ${data.indexOf(d) + 1}`);
    const tempDeviations = data.map(d => d.temp_deviation ?? 0);
    const linesMerged = data.map(d => d.lines_merged ?? 0);
    const linesMovingAvg = calculate7DayMovingAverage(linesMerged);

    // Dual-axis line chart
    lineChart = new Chart(lineChartCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperature Deviation (F)',
            data: tempDeviations,
            borderColor: '#e57373',
            backgroundColor: 'rgba(229, 115, 115, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Lines Merged (7-day avg)',
            data: linesMovingAvg,
            borderColor: '#548e9b',
            backgroundColor: 'rgba(84, 142, 155, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
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
            titleFont: { family: "'JetBrains Mono', monospace" },
            bodyFont: { family: "'JetBrains Mono', monospace" }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#ccc',
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 12
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Temp Deviation (F)',
              color: '#e57373',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#e57373',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Lines Merged (avg)',
              color: '#548e9b',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            },
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#548e9b',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          }
        }
      }
    });

    // Scatter plot with trend line
    const scatterData = data.map(d => ({
      x: d.temp_deviation ?? 0,
      y: d.lines_merged ?? 0
    }));

    const trendLine = calculateTrendLine(
      data.map(d => d.temp_deviation ?? 0),
      data.map(d => d.lines_merged ?? 0)
    );

    scatterChart = new Chart(scatterChartCanvas.getContext('2d'), {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Daily Data',
            data: scatterData,
            backgroundColor: 'rgba(84, 142, 155, 0.6)',
            borderColor: '#548e9b',
            borderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Trend Line',
            data: trendLine,
            type: 'line',
            borderColor: '#e57373',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#ccc',
              font: { family: "'JetBrains Mono', monospace", size: 12 },
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
            titleFont: { family: "'JetBrains Mono', monospace" },
            bodyFont: { family: "'JetBrains Mono', monospace" },
            callbacks: {
              label: (context) => {
                if (context.dataset.label === 'Trend Line') return null;
                return `Temp: ${context.raw.x.toFixed(2)}F, Lines: ${context.raw.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Temperature Deviation (F)',
              color: '#ccc',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#ccc',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Lines Merged',
              color: '#ccc',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#ccc',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          }
        }
      }
    });
  }
</script>

<div bind:this={element} class="correlation-chart" class:visible>
  <div class="chart-intro">
    <h3 class="chart-title">The Cursed Correlation: Menstrual Cycle vs. Productivity</h3>
    <p class="chart-description">
      Basal body temperature deviations mapped against code output. Is there a pattern?
    </p>
  </div>

  <div class="charts-container">
    <div class="chart-section">
      <h4 class="section-label">Over Time</h4>
      <div class="chart-wrapper">
        <canvas bind:this={lineChartCanvas}></canvas>
      </div>
    </div>

    <div class="chart-section">
      <h4 class="section-label">Correlation View</h4>
      <div class="chart-wrapper">
        <canvas bind:this={scatterChartCanvas}></canvas>
      </div>
    </div>
  </div>
</div>

<style>
  .correlation-chart {
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 2rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;
  }

  .correlation-chart.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .chart-intro {
    text-align: center;
    margin-bottom: 2rem;
  }

  .chart-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.75rem 0;
  }

  .chart-description {
    font-size: 1rem;
    color: #ccc;
    margin: 0;
  }

  .charts-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .chart-section {
    background: #202122;
    border-radius: 8px;
    padding: 1.25rem;
  }

  .section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    font-weight: 500;
    color: #548e9b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 1rem 0;
  }

  .chart-wrapper {
    height: 300px;
    position: relative;
  }

  @media (max-width: 768px) {
    .correlation-chart {
      padding: 1.25rem;
    }

    .chart-title {
      font-size: 1.25rem;
    }

    .chart-wrapper {
      height: 250px;
    }
  }
</style>
