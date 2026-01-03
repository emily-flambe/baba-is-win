<script lang="ts">
  import { login, type User, type ApiError } from '../lib/api';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ login: User }>();

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let submitting = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    submitting = true;

    try {
      const result = await login(email, password);
      dispatch('login', result.user);
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Login failed. Please try again.';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="login-container">
  <form class="login-form" onsubmit={handleSubmit}>
    <h1>Blog Admin</h1>
    <p class="subtitle">Sign in to manage your content</p>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="field">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        required
        autocomplete="email"
        disabled={submitting}
      />
    </div>

    <div class="field">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        required
        autocomplete="current-password"
        disabled={submitting}
      />
    </div>

    <button type="submit" disabled={submitting}>
      {submitting ? 'Signing in...' : 'Sign In'}
    </button>
  </form>
</div>

<style>
  .login-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .login-form {
    width: 100%;
    max-width: 360px;
    padding: 2rem;
    background: #1a1a1a;
    border-radius: 12px;
    border: 1px solid #2a2a2a;
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .subtitle {
    font-size: 0.875rem;
    color: #888;
    text-align: center;
    margin-bottom: 1.5rem;
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

  .field {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    font-size: 0.875rem;
    color: #ccc;
    margin-bottom: 0.375rem;
  }

  input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 8px;
    color: #e0e0e0;
    font-size: 1rem;
    transition: border-color 0.15s ease;
  }

  input:focus {
    outline: none;
    border-color: #4a9eff;
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button {
    width: 100%;
    padding: 0.875rem 1rem;
    margin-top: 0.5rem;
    background: #4a9eff;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  button:hover:not(:disabled) {
    background: #3a8eef;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
