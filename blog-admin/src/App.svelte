<script lang="ts">
  const version = __APP_VERSION__;
</script>

<main>
  <div class="loading-container">
    <h1>Blog Admin</h1>
    <p class="status">Loading...</p>
    <p class="version">v{version}</p>
  </div>
</main>

<style>
  main {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-container {
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
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
