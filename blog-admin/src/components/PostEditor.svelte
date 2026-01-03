<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    getPost,
    createPost,
    updatePost,
    deletePost,
    type Post,
    type ContentStatus,
    type ApiError,
  } from '../lib/api';

  interface Props {
    postId?: string;
  }

  let { postId }: Props = $props();

  const dispatch = createEventDispatcher<{
    save: Post;
    delete: void;
    cancel: void;
  }>();

  const isEditMode = $derived(!!postId);

  // Form state
  let title = $state('');
  let slug = $state('');
  let description = $state('');
  let content = $state('');
  let thumbnail = $state('');
  let tags = $state('');
  let premium = $state(false);
  let status = $state<ContentStatus>('draft');
  let publishDate = $state('');

  // UI state
  let loading = $state(false);
  let saving = $state(false);
  let deleting = $state(false);
  let error = $state('');
  let slugManuallyEdited = $state(false);

  onMount(async () => {
    if (postId) {
      await loadPost();
    }
  });

  async function loadPost() {
    if (!postId) return;
    loading = true;
    error = '';

    try {
      const result = await getPost(postId);
      const post = result.post;
      title = post.title;
      slug = post.slug;
      description = post.description ?? '';
      content = post.content;
      thumbnail = post.thumbnail ?? '';
      tags = post.tags.join(', ');
      premium = post.premium;
      status = post.status;
      publishDate = post.publishDate ?? '';
      slugManuallyEdited = true; // Don't auto-generate for existing posts
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to load post';
    } finally {
      loading = false;
    }
  }

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
  }

  function handleTitleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    title = target.value;

    if (!slugManuallyEdited) {
      slug = generateSlug(title);
    }
  }

  function handleSlugChange(e: Event) {
    const target = e.target as HTMLInputElement;
    slug = target.value;
    slugManuallyEdited = true;
  }

  function parseTags(input: string): string[] {
    return input
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) {
      error = 'Title is required';
      return;
    }
    if (!slug.trim()) {
      error = 'Slug is required';
      return;
    }

    saving = true;
    error = '';

    const postData = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      content: content.trim(),
      thumbnail: thumbnail.trim() || null,
      tags: parseTags(tags),
      premium,
      status,
      publishDate: publishDate || null,
    };

    try {
      let result: { post: Post };
      if (isEditMode && postId) {
        result = await updatePost(postId, postData);
      } else {
        result = await createPost(postData);
      }
      dispatch('save', result.post);
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to save post';
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!postId) return;
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    deleting = true;
    error = '';

    try {
      await deletePost(postId);
      dispatch('delete');
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to delete post';
    } finally {
      deleting = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="editor">
  <header>
    <h1>{isEditMode ? 'Edit Post' : 'New Post'}</h1>
    <button class="cancel-btn" onclick={handleCancel} disabled={saving || deleting}>
      Cancel
    </button>
  </header>

  {#if loading}
    <div class="loading">Loading post...</div>
  {:else}
    {#if error}
      <div class="error">{error}</div>
    {/if}

    <form onsubmit={handleSubmit}>
      <div class="field">
        <label for="title">Title *</label>
        <input
          type="text"
          id="title"
          value={title}
          oninput={handleTitleChange}
          required
          disabled={saving}
          placeholder="Post title"
        />
      </div>

      <div class="field">
        <label for="slug">Slug *</label>
        <input
          type="text"
          id="slug"
          value={slug}
          oninput={handleSlugChange}
          required
          disabled={saving}
          placeholder="post-url-slug"
        />
        <span class="hint">URL-friendly identifier (auto-generated from title)</span>
      </div>

      <div class="field">
        <label for="description">Description</label>
        <textarea
          id="description"
          bind:value={description}
          disabled={saving}
          rows="2"
          placeholder="Brief description for previews and SEO"
        ></textarea>
      </div>

      <div class="field">
        <label for="content">Content</label>
        <textarea
          id="content"
          class="content-textarea"
          bind:value={content}
          disabled={saving}
          rows="15"
          placeholder="Write your post content in Markdown..."
        ></textarea>
      </div>

      <div class="field">
        <label for="thumbnail">Thumbnail URL</label>
        <input
          type="url"
          id="thumbnail"
          bind:value={thumbnail}
          disabled={saving}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div class="field">
        <label for="tags">Tags</label>
        <input
          type="text"
          id="tags"
          bind:value={tags}
          disabled={saving}
          placeholder="tag1, tag2, tag3"
        />
        <span class="hint">Comma-separated list of tags</span>
      </div>

      <div class="row">
        <div class="field checkbox-field">
          <label>
            <input type="checkbox" bind:checked={premium} disabled={saving} />
            Premium content
          </label>
        </div>

        <div class="field">
          <label for="status">Status</label>
          <select id="status" bind:value={status} disabled={saving}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div class="field">
          <label for="publishDate">Publish Date</label>
          <input
            type="date"
            id="publishDate"
            bind:value={publishDate}
            disabled={saving}
          />
        </div>
      </div>

      <div class="actions">
        {#if isEditMode}
          <button
            type="button"
            class="delete-btn"
            onclick={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        {/if}
        <button type="submit" class="save-btn" disabled={saving || deleting}>
          {saving ? 'Saving...' : isEditMode ? 'Update Post' : 'Create Post'}
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .editor {
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

  .cancel-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #444;
    border-radius: 6px;
    color: #aaa;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cancel-btn:hover:not(:disabled) {
    border-color: #666;
    color: #fff;
  }

  .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading {
    text-align: center;
    color: #888;
    padding: 2rem;
    font-size: 1rem;
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

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  label {
    font-size: 0.875rem;
    color: #ccc;
  }

  input[type='text'],
  input[type='url'],
  input[type='date'],
  textarea,
  select {
    padding: 0.75rem 1rem;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    color: #e0e0e0;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.15s ease;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: #4a9eff;
  }

  input:disabled,
  textarea:disabled,
  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }

  .content-textarea {
    min-height: 300px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .hint {
    font-size: 0.75rem;
    color: #666;
  }

  .row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .row .field {
    flex: 1;
    min-width: 150px;
  }

  .checkbox-field {
    justify-content: flex-end;
  }

  .checkbox-field label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-field input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #4a9eff;
    cursor: pointer;
  }

  select {
    cursor: pointer;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #2a2a2a;
  }

  .save-btn {
    padding: 0.75rem 1.5rem;
    background: #4a9eff;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .save-btn:hover:not(:disabled) {
    background: #3a8eef;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .delete-btn {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: 1px solid #6b2020;
    border-radius: 8px;
    color: #f87171;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .delete-btn:hover:not(:disabled) {
    background: #3d1515;
    border-color: #f87171;
  }

  .delete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    .row {
      flex-direction: column;
    }

    .row .field {
      min-width: 100%;
    }

    .actions {
      flex-direction: column-reverse;
    }

    .save-btn,
    .delete-btn {
      width: 100%;
    }
  }
</style>
