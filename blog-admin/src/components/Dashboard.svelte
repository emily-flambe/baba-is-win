<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    getPosts,
    getThoughts,
    type Post,
    type Thought,
    type ApiError,
  } from '../lib/api';

  const dispatch = createEventDispatcher<{
    logout: void;
    editPost: string;
    editThought: string;
    newPost: void;
    newThought: void;
  }>();

  type Tab = 'posts' | 'thoughts';
  type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

  let activeTab = $state<Tab>('posts');
  let statusFilter = $state<StatusFilter>('all');
  let posts = $state<Post[]>([]);
  let thoughts = $state<Thought[]>([]);
  let loadingData = $state(false);
  let error = $state('');

  const filteredPosts = $derived(
    statusFilter === 'all'
      ? posts
      : posts.filter((p) => p.status === statusFilter)
  );

  const filteredThoughts = $derived(
    statusFilter === 'all'
      ? thoughts
      : thoughts.filter((t) => t.status === statusFilter)
  );

  onMount(() => {
    loadData();
  });

  async function loadData() {
    loadingData = true;
    error = '';

    try {
      const [postsResult, thoughtsResult] = await Promise.all([
        getPosts(),
        getThoughts(),
      ]);
      posts = postsResult.posts;
      thoughts = thoughtsResult.thoughts;
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to load data';
    } finally {
      loadingData = false;
    }
  }

  function handleTabChange(tab: Tab) {
    activeTab = tab;
    statusFilter = 'all';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'published':
        return 'status-published';
      case 'draft':
        return 'status-draft';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  }
</script>

<div class="dashboard">
  <header>
    <h1>Blog Admin</h1>
    <button class="logout-btn" onclick={() => dispatch('logout')}>
      Logout
    </button>
  </header>

  <nav class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'posts'}
      onclick={() => handleTabChange('posts')}
    >
      Posts
    </button>
    <button
      class="tab"
      class:active={activeTab === 'thoughts'}
      onclick={() => handleTabChange('thoughts')}
    >
      Thoughts
    </button>
  </nav>

  <div class="controls">
    <div class="filter">
      <label for="status-filter">Status:</label>
      <select id="status-filter" bind:value={statusFilter}>
        <option value="all">All</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
    </div>

    <button
      class="new-btn"
      onclick={() =>
        dispatch(activeTab === 'posts' ? 'newPost' : 'newThought')}
    >
      {activeTab === 'posts' ? 'New Post' : 'New Thought'}
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if loadingData}
    <div class="loading">Loading...</div>
  {:else if activeTab === 'posts'}
    <div class="list">
      {#if filteredPosts.length === 0}
        <p class="empty">No posts found</p>
      {:else}
        {#each filteredPosts as post (post.id)}
          <button
            class="list-item"
            onclick={() => dispatch('editPost', post.id)}
          >
            <div class="item-main">
              <h3>{post.title}</h3>
              {#if post.description}
                <p class="description">{post.description}</p>
              {/if}
            </div>
            <div class="item-meta">
              <span class="status {getStatusClass(post.status)}">
                {post.status}
              </span>
              <span class="date">{post.publishDate || 'No date'}</span>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  {:else}
    <div class="list">
      {#if filteredThoughts.length === 0}
        <p class="empty">No thoughts found</p>
      {:else}
        {#each filteredThoughts as thought (thought.id)}
          <button
            class="list-item"
            onclick={() => dispatch('editThought', thought.id)}
          >
            <div class="item-main">
              <p class="thought-content">
                {thought.content.length > 100
                  ? thought.content.slice(0, 100) + '...'
                  : thought.content}
              </p>
            </div>
            <div class="item-meta">
              <span class="status {getStatusClass(thought.status)}">
                {thought.status}
              </span>
              <span class="date">{thought.publishDate || 'No date'}{thought.publishTime ? ` ${thought.publishTime}` : ''}</span>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    width: 100%;
    min-height: 100vh;
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #2a2a2a;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #fff;
  }

  .logout-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #444;
    border-radius: 6px;
    color: #aaa;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .logout-btn:hover {
    border-color: #666;
    color: #fff;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .tab {
    flex: 1;
    padding: 0.75rem 1rem;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    color: #888;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab:hover {
    border-color: #3a3a3a;
    color: #ccc;
  }

  .tab.active {
    background: #2a2a2a;
    border-color: #4a9eff;
    color: #fff;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter label {
    font-size: 0.875rem;
    color: #888;
  }

  .filter select {
    padding: 0.5rem 0.75rem;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .filter select:focus {
    outline: none;
    border-color: #4a9eff;
  }

  .new-btn {
    padding: 0.5rem 1rem;
    background: #4a9eff;
    border: none;
    border-radius: 6px;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .new-btn:hover {
    background: #3a8eef;
  }

  .error {
    background: #3d1515;
    border: 1px solid #6b2020;
    color: #f87171;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .loading {
    text-align: center;
    color: #888;
    padding: 2rem;
    font-size: 1rem;
  }

  .empty {
    text-align: center;
    color: #666;
    padding: 2rem;
    font-size: 0.875rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    width: 100%;
    padding: 1rem;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .list-item:hover {
    border-color: #3a3a3a;
    background: #1f1f1f;
  }

  .item-main {
    flex: 1;
    min-width: 0;
  }

  .item-main h3 {
    font-size: 1rem;
    font-weight: 500;
    color: #e0e0e0;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .description,
  .thought-content {
    font-size: 0.875rem;
    color: #888;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .item-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .status {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-published {
    background: #1a3d1a;
    color: #4ade80;
  }

  .status-draft {
    background: #3d3d1a;
    color: #facc15;
  }

  .status-archived {
    background: #2a2a2a;
    color: #888;
  }

  .date {
    font-size: 0.75rem;
    color: #666;
  }

  @media (max-width: 480px) {
    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .filter {
      justify-content: space-between;
    }

    .new-btn {
      text-align: center;
    }

    .list-item {
      flex-direction: column;
      gap: 0.75rem;
    }

    .item-meta {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
  }
</style>
