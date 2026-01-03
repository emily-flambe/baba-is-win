<script lang="ts">
  import { onMount } from 'svelte';
  import { user, loading } from './lib/stores';
  import { getMe, type User } from './lib/api';
  import Login from './components/Login.svelte';
  import Dashboard from './components/Dashboard.svelte';

  const version = __APP_VERSION__;

  let currentUser = $state<User | null>(null);
  let isLoading = $state(true);

  // Subscribe to stores
  $effect(() => {
    const unsubUser = user.subscribe((u) => {
      currentUser = u;
    });
    const unsubLoading = loading.subscribe((l) => {
      isLoading = l;
    });

    return () => {
      unsubUser();
      unsubLoading();
    };
  });

  onMount(async () => {
    try {
      const result = await getMe();
      user.set(result.user);
    } catch {
      // Not authenticated - this is expected
      user.set(null);
    } finally {
      loading.set(false);
    }
  });

  function handleLogin(event: CustomEvent<User>) {
    user.set(event.detail);
  }

  function handleLogout() {
    // Clear user state (actual logout API call would happen here if needed)
    user.set(null);
    // Reload to clear any cached state
    window.location.reload();
  }

  function handleEditPost(event: CustomEvent<string>) {
    // TODO: Navigate to post editor (Task 3.3)
    console.log('Edit post:', event.detail);
  }

  function handleEditThought(event: CustomEvent<string>) {
    // TODO: Navigate to thought editor (Task 3.3)
    console.log('Edit thought:', event.detail);
  }

  function handleNewPost() {
    // TODO: Navigate to new post editor (Task 3.3)
    console.log('New post');
  }

  function handleNewThought() {
    // TODO: Navigate to new thought editor (Task 3.3)
    console.log('New thought');
  }
</script>

<main>
  {#if isLoading}
    <div class="loading-container">
      <h1>Blog Admin</h1>
      <p class="status">Loading...</p>
      <p class="version">v{version}</p>
    </div>
  {:else if currentUser}
    <Dashboard
      on:logout={handleLogout}
      on:editPost={handleEditPost}
      on:editThought={handleEditThought}
      on:newPost={handleNewPost}
      on:newThought={handleNewThought}
    />
  {:else}
    <Login on:login={handleLogin} />
  {/if}
</main>

<style>
  main {
    width: 100%;
    min-height: 100vh;
    background: #0f0f0f;
  }

  .loading-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #fff;
  }

  .status {
    font-size: 1.125rem;
    color: #888;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .version {
    margin-top: 2rem;
    font-size: 0.75rem;
    color: #555;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
