# 2025 Year in Review - Design Document

## Overview

An interactive year-in-review experience embedded as a blog post at `/blog/2025-year-in-review`. Combines auto-generated metrics from GitHub and Oura with hand-curated personal highlights (video games, life events).

**Theme**: Productivity meets wellness balance - quantified output alongside health metrics, with curated personal content leading the narrative.

---

## Page Structure

### URL & File Location
- **URL**: `/blog/2025-year-in-review`
- **Blog post file**: `src/data/blog-posts/published/20251231-2025-year-in-review.md`

### Sections (in order)

1. **Hero** - "2025" title with subtle animation
2. **Things That Happened** - Curated life events list (human story first)
3. **Video Games Played** - Rated list with one-liner descriptions
4. **The Big Numbers** - Aggregate stats cards (commits, PRs, sleep score, steps)
5. **GitHub: Personal Projects** - Repo breakdown, highlights, fun commit messages
6. **GitHub: Work** - Aggregate numbers only (no repo names, languages, or specifics)
7. **Wellness Trends** - Monthly charts for sleep/readiness/activity
8. **The Cursed Correlation** - Body temp deviation vs. code productivity chart + scatter plot
9. **Footer/Outro**

---

## Data Architecture

### Data Sources
- **GitHub**: Query from BigQuery (already ingested via etl-for-dumdums)
- **Oura**: Query from BigQuery (already ingested via etl-for-dumdums)
- **Curated content**: Hand-edited JSON file

### Data Pipeline
```
BigQuery (existing data)
    ↓
Python extraction script (scripts/extract-year-in-review.py)
    ↓
src/data/year-in-review-2025.json (auto-generated metrics)
src/data/year-in-review-2025-curated.json (hand-edited)
    ↓
Blog post imports JSON, renders with Svelte components
```

### Auto-Generated Data Schema

**`src/data/year-in-review-2025.json`**:

```json
{
  "generated_at": "2025-12-31T12:00:00Z",

  "github": {
    "personal": {
      "total_prs": 0,
      "total_commits": 0,
      "repos": [
        {
          "name": "baba-is-win",
          "commits": 0,
          "prs": 0,
          "description": "Personal website"
        }
      ],
      "fun_commits": [
        {
          "message": "fix my bad copy-paste job",
          "repo": "baba-is-win",
          "sha": "abc123",
          "url": "https://github.com/emily-flambe/baba-is-win/commit/abc123"
        }
      ],
      "busiest_day": {
        "date": "2025-10-15",
        "commits": 23
      },
      "longest_streak_days": 14,
      "languages": {
        "TypeScript": 45,
        "Python": 30,
        "Astro": 15,
        "Other": 10
      }
    },
    "work": {
      "total_prs": 0,
      "total_commits": 0
    }
  },

  "oura": {
    "averages": {
      "sleep_score": 82,
      "readiness_score": 78,
      "activity_score": 70,
      "steps_daily": 7200,
      "total_sleep_hours": 7.2
    },
    "totals": {
      "steps": 2628000,
      "active_calories": 450000
    },
    "monthly": [
      {
        "month": "2025-01",
        "month_label": "Jan",
        "sleep_score": 79,
        "readiness_score": 75,
        "activity_score": 68,
        "avg_steps": 6800
      }
    ],
    "correlation_data": [
      {
        "date": "2025-01-01",
        "temp_deviation": 0.2,
        "lines_merged": 145,
        "temp_7day_avg": 0.15,
        "lines_7day_avg": 120
      }
    ],
    "fun_facts": {
      "best_sleep": { "date": "2025-03-15", "score": 98 },
      "worst_sleep": { "date": "2025-11-02", "score": 52 },
      "best_readiness": { "date": "2025-06-20", "score": 95 },
      "most_steps_day": { "date": "2025-07-04", "steps": 25000 }
    }
  }
}
```

### Curated Data Schema

**`src/data/year-in-review-2025-curated.json`**:

```json
{
  "events": [
    {
      "title": "Event Title",
      "description": "Brief description of what happened",
      "month": "March"
    }
  ],
  "games": [
    {
      "title": "Game Name",
      "rating": 5,
      "description": "One-liner review or memorable moment"
    }
  ]
}
```

---

## Visual Design

### Color Palette (baba-is-win native)
```css
--background-body: #202122;
--text-main: #fff;
--text-secondary: #ccc;
--primary-color: #548e9b;
--primary-dark: #4a7c87;
--primary-darker: #3e6b75;
--primary-light: rgba(84, 142, 155, 0.1);
--gradient: linear-gradient(135deg, #548e9b, #4a7c87);
```

### Typography
- **Headings**: Fira Sans (existing)
- **Body**: Merriweather (existing)
- **Numbers/Code**: JetBrains Mono (add via Google Fonts for this page)

### Animation Patterns
- **Fade-in on scroll**: Intersection Observer triggers `.visible` class
- **Counter animation**: Numbers count up from 0 over 2 seconds when entering viewport
- **Hover states**: Subtle scale/border-color transitions on cards
- **Hero pulse**: Subtle radial gradient animation on background

### Component Styles

**Big Number Cards**:
```css
.big-number-card {
  background: #2a2b2c;
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}
.big-number-card:hover {
  transform: translateY(-4px);
  border-color: rgba(84, 142, 155, 0.3);
}
.big-number-card::before {
  /* Teal gradient top border on hover */
  background: var(--gradient);
}
```

**Chart Containers**:
```css
.chart-container {
  background: #2a2b2c;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

**List Items (events/games)**:
```css
.list-item {
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.list-item:last-child {
  border-bottom: none;
}
.star-rating {
  color: #548e9b;
}
```

---

## Component Architecture

### New Components to Create

1. **`src/components/year-review/YearInReview.svelte`** (main container)
   - Imports data JSON files
   - Orchestrates all sections
   - Manages scroll-based animations

2. **`src/components/year-review/BigNumberCard.svelte`**
   - Props: `value`, `label`, `detail`
   - Animated counter on viewport entry

3. **`src/components/year-review/TrendChart.svelte`**
   - Props: `data`, `type` (bar/line), `title`
   - Wraps Chart.js

4. **`src/components/year-review/CorrelationChart.svelte`**
   - Props: `data`
   - Dual-axis line chart + scatter plot
   - Body temp deviation vs. lines of code

5. **`src/components/year-review/EventsList.svelte`**
   - Props: `events`
   - Simple styled list

6. **`src/components/year-review/GamesList.svelte`**
   - Props: `games`
   - List with star ratings

7. **`src/components/year-review/RepoBreakdown.svelte`**
   - Props: `repos`, `funCommits`
   - Horizontal bar chart + commit message list

8. **`src/components/year-review/SectionHeader.svelte`**
   - Props: `label`, `title`, `subtitle`
   - Consistent section header styling

### Blog Post Structure

**`src/data/blog-posts/published/20251231-2025-year-in-review.md`**:

```markdown
---
title: "2025: Year in Review"
publishDate: 31 Dec 2025
description: A quantified look back at my year
thumbnail: /assets/blog/2025-year-in-review/hero.png
tags: ["personal", "data"]
---

<div id="year-in-review-root"></div>

<script>
  import YearInReview from '../../../components/year-review/YearInReview.svelte';
  import metricsData from '../../../data/year-in-review-2025.json';
  import curatedData from '../../../data/year-in-review-2025-curated.json';

  new YearInReview({
    target: document.getElementById('year-in-review-root'),
    props: { metricsData, curatedData }
  });
</script>
```

Note: May need to use Astro's client-side hydration pattern instead. Test both approaches.

---

## Data Extraction Script

### Location
`scripts/extract-year-in-review.py`

### Dependencies
- google-cloud-bigquery (already in etl-for-dumdums)
- Reuse credentials from etl-for-dumdums setup

### BigQuery Queries Needed

**Personal GitHub repos** (emily-flambe org):
```sql
SELECT
  repo,
  COUNT(*) as commit_count,
  COUNT(DISTINCT DATE(author_date)) as active_days
FROM github.raw_commits
WHERE author_date >= '2025-01-01'
  AND author_date < '2026-01-01'
  AND repo IN ('baba-is-win', 'etl-for-dumdums', 'cool-scripts', ...)
GROUP BY repo
ORDER BY commit_count DESC
```

**Work GitHub** (demexchange org - aggregate only):
```sql
SELECT
  COUNT(*) as total_commits,
  COUNT(DISTINCT pr_id) as total_prs
FROM github.raw_commits
WHERE author_date >= '2025-01-01'
  AND author_date < '2026-01-01'
  AND org = 'demexchange'
```

**Oura monthly averages**:
```sql
SELECT
  FORMAT_DATE('%Y-%m', day) as month,
  AVG(score) as avg_sleep_score
FROM oura.raw_sleep
WHERE day >= '2025-01-01' AND day < '2026-01-01'
GROUP BY month
ORDER BY month
```

**Correlation data** (daily temp + code):
```sql
SELECT
  o.day as date,
  o.temperature_deviation as temp_deviation,
  COALESCE(g.lines_changed, 0) as lines_merged
FROM oura.raw_daily_readiness o
LEFT JOIN (
  SELECT DATE(merged_at) as day, SUM(additions + deletions) as lines_changed
  FROM github.raw_pull_requests
  WHERE merged_at >= '2025-01-01' AND merged_at < '2026-01-01'
  GROUP BY day
) g ON o.day = g.day
WHERE o.day >= '2025-01-01' AND o.day < '2026-01-01'
ORDER BY o.day
```

### Fun Commits Detection
Query for commits with "funny" patterns:
- Contains "fix my"
- Contains "oops"
- Contains "?"
- All caps
- Contains "revert"
- Under 20 characters

```sql
SELECT message, repo, sha
FROM github.raw_commits
WHERE author_date >= '2025-01-01'
  AND (
    LOWER(message) LIKE '%fix my%'
    OR LOWER(message) LIKE '%oops%'
    OR message LIKE '%?%'
    OR message = UPPER(message)
    OR LOWER(message) LIKE '%revert%'
    OR LENGTH(message) < 20
  )
LIMIT 20
```

---

## Implementation Plan

### Phase 1: Data Infrastructure
1. Create `scripts/extract-year-in-review.py`
2. Set up BigQuery queries for all metrics
3. Generate initial `year-in-review-2025.json`
4. Create empty `year-in-review-2025-curated.json` template

### Phase 2: Core Components
1. Create `src/components/year-review/` directory
2. Build `SectionHeader.svelte`
3. Build `BigNumberCard.svelte` with counter animation
4. Build `EventsList.svelte` and `GamesList.svelte`

### Phase 3: Charts
1. Add Chart.js dependency (or use existing if present)
2. Build `TrendChart.svelte`
3. Build `CorrelationChart.svelte` (the fun one)
4. Build `RepoBreakdown.svelte`

### Phase 4: Main Container
1. Build `YearInReview.svelte` orchestrating all sections
2. Implement scroll-based fade-in animations
3. Add responsive styles

### Phase 5: Integration
1. Create blog post markdown file
2. Test Svelte hydration in Astro blog post context
3. Add JetBrains Mono font
4. Create any needed static assets

### Phase 6: Content & Polish
1. Fill in `year-in-review-2025-curated.json` with real events/games
2. Run data extraction to get real metrics
3. Visual QA and responsive testing
4. Screenshot for thumbnail

---

## Open Questions / Decisions Deferred

1. **Chart.js vs. alternatives**: Check if Chart.js is already a dependency. If not, could also consider lightweight alternatives like uPlot.

2. **Svelte hydration in Astro blog posts**: Need to test whether the standard blog post markdown can hydrate Svelte components or if we need a custom `.astro` page.

3. **BigQuery table names**: Need to verify exact table/column names in the existing etl-for-dumdums BigQuery dataset.

4. **Personal repos list**: Need full list of emily-flambe repos to include.

5. **Date range**: Currently assuming calendar year 2025. Confirm this is the desired range.

---

## Files to Create

```
scripts/
  extract-year-in-review.py

src/
  components/
    year-review/
      YearInReview.svelte
      BigNumberCard.svelte
      TrendChart.svelte
      CorrelationChart.svelte
      EventsList.svelte
      GamesList.svelte
      RepoBreakdown.svelte
      SectionHeader.svelte
  data/
    year-in-review-2025.json
    year-in-review-2025-curated.json
  data/blog-posts/published/
    20251231-2025-year-in-review.md
```

---

## Success Criteria

- [ ] Page loads at `/blog/2025-year-in-review`
- [ ] All sections render with real data
- [ ] Animated counters work on scroll
- [ ] Charts render correctly (monthly trends, correlation)
- [ ] Curated content displays properly
- [ ] Responsive on mobile
- [ ] Matches baba-is-win visual style
- [ ] No work repo specifics exposed (only aggregates)
