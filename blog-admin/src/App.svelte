<script lang="ts">
  import { onMount } from 'svelte';
  import { user, loading } from './lib/stores';
  import { getMe, type User, type Post, type Thought } from './lib/api';
  import Login from './components/Login.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import PostEditor from './components/PostEditor.svelte';
  import ThoughtEditor from './components/ThoughtEditor.svelte';

  const version = __APP_VERSION__;

  type ViewState = 'dashboard' | 'editPost' | 'newPost' | 'editThought' | 'newThought';

  let currentUser = $state<User | null>(null);
  let isLoading = $state(true);
  let currentView = $state<ViewState>('dashboard');
  let editingId = $state<string | undefined>(undefined);
  let dashboardKey = $state(0);

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
    user.set(null);
    window.location.reload();
  }

  function handleEditPost(event: CustomEvent<string>) {
    editingId = event.detail;
    currentView = 'editPost';
  }

  function handleEditThought(event: CustomEvent<string>) {
    editingId = event.detail;
    currentView = 'editThought';
  }

  function handleNewPost() {
    editingId = undefined;
    currentView = 'newPost';
  }

  function handleNewThought() {
    editingId = undefined;
    currentView = 'newThought';
  }

  function returnToDashboard() {
    currentView = 'dashboard';
    editingId = undefined;
    // Increment key to force Dashboard remount and refresh data
    dashboardKey++;
  }

  function handlePostSave(_event: CustomEvent<Post>) {
    returnToDashboard();
  }

  function handlePostDelete() {
    returnToDashboard();
  }

  function handlePostCancel() {
    returnToDashboard();
  }

  function handleThoughtSave(_event: CustomEvent<Thought>) {
    returnToDashboard();
  }

  function handleThoughtDelete() {
    returnToDashboard();
  }

  function handleThoughtCancel() {
    returnToDashboard();
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
    {#if currentView === 'dashboard'}
      {#key dashboardKey}
        <Dashboard
          on:logout={handleLogout}
          on:editPost={handleEditPost}
          on:editThought={handleEditThought}
          on:newPost={handleNewPost}
          on:newThought={handleNewThought}
        />
      {/key}
    {:else if currentView === 'newPost'}
      <PostEditor
        on:save={handlePostSave}
        on:delete={handlePostDelete}
        on:cancel={handlePostCancel}
      />
    {:else if currentView === 'editPost'}
      <PostEditor
        postId={editingId}
        on:save={handlePostSave}
        on:delete={handlePostDelete}
        on:cancel={handlePostCancel}
      />
    {:else if currentView === 'newThought'}
      <ThoughtEditor
        on:save={handleThoughtSave}
        on:delete={handleThoughtDelete}
        on:cancel={handleThoughtCancel}
      />
    {:else if currentView === 'editThought'}
      <ThoughtEditor
        thoughtId={editingId}
        on:save={handleThoughtSave}
        on:delete={handleThoughtDelete}
        on:cancel={handleThoughtCancel}
      />
    {/if}
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
