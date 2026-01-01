<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import SectionHeader from './SectionHeader.svelte';
  import BigNumberCard from './BigNumberCard.svelte';
  import EventsList from './EventsList.svelte';
  import GamesList from './GamesList.svelte';
  import RepoBreakdown from './RepoBreakdown.svelte';
  import TrendChart from './TrendChart.svelte';
  import CorrelationChart from './CorrelationChart.svelte';

  export let metricsData = {};
  export let curatedData = {};

  let heroVisible = false;
  let heroElement;

  // Transform raw data into display-ready format
  $: personalGitHub = metricsData.github?.personal || null;
  $: workGitHub = metricsData.github?.work || null;
  $: ouraData = metricsData.oura || {};

  // Build big numbers from available data
  $: bigNumbers = buildBigNumbers(metricsData);

  function buildBigNumbers(data) {
    const numbers = [];
    const github = data.github || {};
    const oura = data.oura || {};

    // Personal GitHub PRs
    if (github.personal?.total_prs > 0) {
      numbers.push({
        value: github.personal.total_prs,
        label: 'Personal PRs',
        detail: 'Merged across personal repos'
      });
    }

    // Work GitHub PRs
    if (github.work?.total_prs > 0) {
      numbers.push({
        value: github.work.total_prs,
        label: 'Work PRs',
        detail: 'Professional contributions'
      });
    }

    // Sleep score
    if (oura.averages?.sleep_score > 0) {
      numbers.push({
        value: Math.round(oura.averages.sleep_score),
        label: 'Avg Sleep Score',
        detail: 'Nightly average from Oura'
      });
    }

    // Daily steps
    if (oura.averages?.steps_daily > 0) {
      numbers.push({
        value: oura.averages.steps_daily,
        label: 'Daily Steps',
        detail: 'Average steps per day'
      });
    }

    // Total steps
    if (oura.totals?.steps > 0) {
      numbers.push({
        value: Math.round(oura.totals.steps / 1000000 * 10) / 10,
        label: 'Total Steps',
        detail: 'Million steps walked',
        suffix: 'M'
      });
    }

    // Active calories
    if (oura.totals?.active_calories > 0) {
      numbers.push({
        value: Math.round(oura.totals.active_calories / 1000),
        label: 'Active Calories',
        detail: 'Thousands burned',
        suffix: 'K'
      });
    }

    return numbers;
  }

  // Transform monthly data for wellness trends chart
  $: wellnessTrends = (ouraData.monthly || []).map(m => ({
    month: m.month_label || m.month,
    sleep_score: m.sleep_score || 0,
    readiness_score: m.readiness_score || 0,
    activity_score: m.activity_score || 0,
    avg_steps: Math.round((m.avg_steps || 0) / 1000)
  }));

  $: wellnessMetrics = [
    { key: 'sleep_score', label: 'Sleep Score', fill: true },
    { key: 'readiness_score', label: 'Readiness Score', fill: false },
    { key: 'activity_score', label: 'Activity Score', fill: false }
  ];

  // Correlation data is already in correct format
  $: correlationData = ouraData.correlation_data || [];

  // Extract fun commits as simple strings for display
  $: personalFunCommits = (personalGitHub?.fun_commits || []).map(c => c.message || c);

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) heroVisible = true; },
      { threshold: 0.1 }
    );
    observer.observe(heroElement);
    return () => observer.disconnect();
  });
</script>

<div class="year-in-review">
  <!-- Hero Section -->
  <section bind:this={heroElement} class="hero" class:visible={heroVisible}>
    <div class="hero-content">
      <span class="year-tag">2025</span>
      <h1 class="hero-title">Year in Review</h1>
      <p class="hero-subtitle">A data-driven retrospective of the year that was</p>
      <div class="scroll-indicator">
        <span class="scroll-text">Scroll to explore</span>
        <div class="scroll-arrow"></div>
      </div>
    </div>
  </section>

  <!-- Events Section -->
  {#if curatedData.events && curatedData.events.length > 0}
    <section class="section">
      <div class="container">
        <SectionHeader
          label="Highlights"
          title="Major Events"
          subtitle="The moments that defined the year"
        />
        <EventsList events={curatedData.events} />
      </div>
    </section>
  {/if}

  <!-- Games Section -->
  {#if curatedData.games && curatedData.games.length > 0}
    <section class="section">
      <div class="container">
        <SectionHeader
          label="Entertainment"
          title="Games Played"
          subtitle="Adventures in virtual worlds"
        />
        <GamesList games={curatedData.games} />
      </div>
    </section>
  {/if}

  <!-- Big Numbers Section -->
  {#if bigNumbers && bigNumbers.length > 0}
    <section class="section section-dark">
      <div class="container">
        <SectionHeader
          label="By The Numbers"
          title="The Big Picture"
          subtitle="Key metrics that tell the story"
        />
        <div class="numbers-grid">
          {#each bigNumbers as stat}
            <BigNumberCard
              value={stat.value}
              label={stat.label}
              detail={stat.detail}
              prefix={stat.prefix}
              suffix={stat.suffix}
            />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Personal GitHub Section -->
  {#if personalGitHub && (personalGitHub.repos?.length > 0 || personalFunCommits.length > 0)}
    <section class="section">
      <div class="container">
        <SectionHeader
          label="Personal Projects"
          title="GitHub Activity"
          subtitle="Open source contributions and side projects"
        />
        <RepoBreakdown
          repos={personalGitHub.repos || []}
          funCommits={personalFunCommits}
        />
      </div>
    </section>
  {/if}

  <!-- Work GitHub Section - aggregate only, no repo breakdown -->
  {#if workGitHub && workGitHub.total_prs > 0}
    <section class="section">
      <div class="container">
        <SectionHeader
          label="Professional"
          title="Work Contributions"
          subtitle="Building products that matter"
        />
        <div class="work-aggregate">
          <div class="work-stat">
            <span class="work-number">{workGitHub.total_prs}</span>
            <span class="work-label">Pull Requests Merged</span>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Wellness Trends Section -->
  {#if wellnessTrends && wellnessTrends.length > 0}
    <section class="section section-dark">
      <div class="container">
        <SectionHeader
          label="Health & Wellness"
          title="Monthly Trends"
          subtitle="Tracking the journey to better health"
        />
        <TrendChart
          data={wellnessTrends}
          metrics={wellnessMetrics}
          title="Activity & Recovery"
        />
      </div>
    </section>
  {/if}

  <!-- Correlation Chart Section -->
  {#if correlationData && correlationData.length > 0}
    <section class="section">
      <div class="container">
        <SectionHeader
          label="Deep Dive"
          title="Finding Patterns"
          subtitle="What does the data reveal about productivity cycles?"
        />
        <CorrelationChart data={correlationData} />
      </div>
    </section>
  {/if}

  <!-- Footer Section -->
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <p class="footer-text">Thanks for scrolling through my year.</p>
        <p class="footer-subtext">Here's to an even better 2026.</p>
      </div>
    </div>
  </footer>
</div>

<style>
  .year-in-review {
    --background: #202122;
    --card-bg: #2a2b2c;
    --primary: #548e9b;
    --primary-dark: #4a7c87;
    --text-main: #fff;
    --text-secondary: #ccc;
    --border: rgba(255, 255, 255, 0.05);

    background: var(--background);
    color: var(--text-main);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  /* Hero Section */
  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    background: linear-gradient(135deg, #202122 0%, #2a2b2c 100%);
    overflow: hidden;
  }

  .hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 20% 20%, rgba(84, 142, 155, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(74, 124, 135, 0.1) 0%, transparent 40%);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    opacity: 0;
    transform: translateY(30px);
    transition: all 1s ease-out;
  }

  .hero.visible .hero-content {
    opacity: 1;
    transform: translateY(0);
  }

  .year-tag {
    display: inline-block;
    padding: 0.5rem 1.25rem;
    background: rgba(84, 142, 155, 0.2);
    color: var(--primary);
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }

  .hero-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 4rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 0 0 1rem 0;
    line-height: 1.1;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--text-secondary);
    margin: 0 0 3rem 0;
  }

  .scroll-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: bounce 2s ease-in-out infinite;
  }

  .scroll-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .scroll-arrow {
    width: 24px;
    height: 24px;
    border-right: 2px solid var(--primary);
    border-bottom: 2px solid var(--primary);
    transform: rotate(45deg);
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(10px); }
  }

  /* Sections */
  .section {
    padding: 6rem 0;
  }

  .section-dark {
    background: #1a1b1c;
  }

  .numbers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  /* Work Aggregate */
  .work-aggregate {
    display: flex;
    justify-content: center;
    padding: 3rem 0;
  }

  .work-stat {
    text-align: center;
    background: #2a2b2c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 3rem 4rem;
  }

  .work-number {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 4rem;
    font-weight: 700;
    color: var(--primary);
    line-height: 1;
    margin-bottom: 1rem;
  }

  .work-label {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    font-weight: 500;
    color: #fff;
  }

  /* Footer */
  .footer {
    padding: 6rem 0;
    text-align: center;
    background: linear-gradient(180deg, var(--background) 0%, #1a1b1c 100%);
  }

  .footer-content {
    max-width: 500px;
    margin: 0 auto;
  }

  .footer-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 0 0 0.75rem 0;
  }

  .footer-subtext {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .section {
      padding: 4rem 0;
    }

    .numbers-grid {
      grid-template-columns: 1fr;
    }

    .footer-text {
      font-size: 1.25rem;
    }
  }
</style>
