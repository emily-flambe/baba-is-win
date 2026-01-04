<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    getThought,
    createThought,
    updateThought,
    deleteThought,
    uploadImage,
    type Thought,
    type ThoughtImage,
    type ContentStatus,
    type ApiError,
  } from '../lib/api';

  interface Props {
    thoughtId?: string;
  }

  let { thoughtId }: Props = $props();

  const dispatch = createEventDispatcher<{
    save: Thought;
    delete: void;
    cancel: void;
  }>();

  const isEditMode = $derived(!!thoughtId);
  const MAX_CONTENT_LENGTH = 280;

  // Form state
  let title = $state('');
  let slug = $state('');
  let content = $state('');
  let color = $state('#1a1a1a');
  let tags = $state('');
  let status = $state<ContentStatus>('draft');
  let publishDate = $state('');
  let publishTime = $state('');
  let images = $state<ThoughtImage[]>([]);

  // UI state
  let loading = $state(false);
  let saving = $state(false);
  let deleting = $state(false);
  let uploading = $state(false);
  let error = $state('');
  let slugManuallyEdited = $state(false);
  let fileInput: HTMLInputElement;

  const contentLength = $derived(content.length);
  const contentOverLimit = $derived(contentLength > MAX_CONTENT_LENGTH);

  onMount(async () => {
    if (thoughtId) {
      await loadThought();
    } else {
      // Auto-populate date and time for new thoughts (user's local time)
      const now = new Date();
      publishDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      publishTime = now.toTimeString().slice(0, 5); // HH:MM format
    }
  });

  async function loadThought() {
    if (!thoughtId) return;
    loading = true;
    error = '';

    try {
      const result = await getThought(thoughtId);
      const thought = result.thought;
      title = thought.title ?? '';
      slug = thought.slug;
      content = thought.content;
      color = thought.color ?? '#1a1a1a';
      tags = thought.tags.join(', ');
      status = thought.status;
      publishDate = thought.publishDate ?? '';
      publishTime = thought.publishTime ?? '';
      images = thought.images;
      slugManuallyEdited = true;
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to load thought';
    } finally {
      loading = false;
    }
  }

  function generateSlug(text: string): string {
    // For thoughts, use a timestamp-based slug if no title
    if (!text.trim()) {
      const now = new Date();
      return `thought-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`;
    }
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
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

  function addImage() {
    images = [...images, { url: '' }];
  }

  function removeImage(index: number) {
    images = images.filter((_, i) => i !== index);
  }

  function updateImageUrl(index: number, url: string) {
    images = images.map((img, i) => (i === index ? { ...img, url } : img));
  }

  function triggerFileUpload() {
    fileInput?.click();
  }

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      error = 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP';
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      error = 'File too large. Maximum size: 10MB';
      return;
    }

    uploading = true;
    error = '';

    try {
      const result = await uploadImage(file);
      images = [...images, { url: result.url }];
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to upload image';
    } finally {
      uploading = false;
      // Reset file input so same file can be selected again
      target.value = '';
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!content.trim()) {
      error = 'Content is required';
      return;
    }

    // Generate slug if empty
    const finalSlug = slug.trim() || generateSlug(title);

    saving = true;
    error = '';

    const thoughtData = {
      title: title.trim() || null,
      slug: finalSlug,
      content: content.trim(),
      color: color || null,
      tags: parseTags(tags),
      status,
      publishDate: publishDate || null,
      publishTime: publishTime || null,
      images: images.filter((img) => img.url.trim()),
    };

    try {
      let result: { thought: Thought };
      if (isEditMode && thoughtId) {
        result = await updateThought(thoughtId, thoughtData);
      } else {
        result = await createThought(thoughtData);
      }
      dispatch('save', result.thought);
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to save thought';
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!thoughtId) return;
    if (!confirm('Are you sure you want to delete this thought? This action cannot be undone.')) {
      return;
    }

    deleting = true;
    error = '';

    try {
      await deleteThought(thoughtId);
      dispatch('delete');
    } catch (err) {
      const apiError = err as ApiError;
      error = apiError.error || 'Failed to delete thought';
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
    <h1>{isEditMode ? 'Edit Thought' : 'New Thought'}</h1>
    <button class="cancel-btn" onclick={handleCancel} disabled={saving || deleting}>
      Cancel
    </button>
  </header>

  {#if loading}
    <div class="loading">Loading thought...</div>
  {:else}
    {#if error}
      <div class="error">{error}</div>
    {/if}

    <form onsubmit={handleSubmit}>
      <div class="field">
        <label for="title">Title (optional)</label>
        <input
          type="text"
          id="title"
          value={title}
          oninput={handleTitleChange}
          disabled={saving}
          placeholder="Optional title"
        />
      </div>

      <div class="field">
        <label for="slug">Slug</label>
        <input
          type="text"
          id="slug"
          value={slug}
          oninput={handleSlugChange}
          disabled={saving}
          placeholder="Auto-generated if empty"
        />
        <span class="hint">URL-friendly identifier (auto-generated if empty)</span>
      </div>

      <div class="field">
        <label for="content">
          Content *
          <span class="char-count" class:over-limit={contentOverLimit}>
            {contentLength}/{MAX_CONTENT_LENGTH}
          </span>
        </label>
        <textarea
          id="content"
          bind:value={content}
          disabled={saving}
          rows="4"
          placeholder="What's on your mind?"
        ></textarea>
        {#if contentOverLimit}
          <span class="warning">Content exceeds recommended length</span>
        {/if}
      </div>

      <div class="row">
        <div class="field color-field">
          <label for="color">Background Color</label>
          <div class="color-input-wrapper">
            <input
              type="color"
              id="color"
              bind:value={color}
              disabled={saving}
            />
            <input
              type="text"
              value={color}
              oninput={(e) => color = (e.target as HTMLInputElement).value}
              disabled={saving}
              placeholder="#1a1a1a"
              class="color-text"
            />
          </div>
        </div>

        <div class="field">
          <label for="status">Status</label>
          <select id="status" bind:value={status} disabled={saving}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label for="publishDate">Publish Date</label>
          <input
            type="date"
            id="publishDate"
            bind:value={publishDate}
            disabled={saving}
          />
        </div>

        <div class="field">
          <label for="publishTime">Publish Time</label>
          <input
            type="time"
            id="publishTime"
            bind:value={publishTime}
            disabled={saving}
          />
        </div>
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

      <div class="field">
        <span class="field-label">Images</span>
        <div class="images-list">
          {#each images as image, index (index)}
            <div class="image-item">
              {#if image.url}
                <img src={image.url} alt="Uploaded image" class="image-preview" />
              {/if}
              <div class="image-row">
                <input
                  type="text"
                  value={image.url}
                  oninput={(e) => updateImageUrl(index, (e.target as HTMLInputElement).value)}
                  disabled={saving}
                  placeholder="Image URL or /assets/uploads/..."
                />
                <button
                  type="button"
                  class="remove-image-btn"
                  onclick={() => removeImage(index)}
                  disabled={saving}
                >
                  Remove
                </button>
              </div>
            </div>
          {/each}
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onchange={handleFileSelect}
            bind:this={fileInput}
            class="file-input-hidden"
          />
          <div class="image-buttons">
            <button
              type="button"
              class="upload-image-btn"
              onclick={triggerFileUpload}
              disabled={saving || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
            <button
              type="button"
              class="add-image-btn"
              onclick={addImage}
              disabled={saving || uploading}
            >
              + Add URL
            </button>
          </div>
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
          {saving ? 'Saving...' : isEditMode ? 'Update Thought' : 'Create Thought'}
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .editor {
    width: 100%;
    min-height: 100vh;
    max-width: 600px;
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

  label,
  .field-label {
    font-size: 0.875rem;
    color: #ccc;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .char-count {
    font-size: 0.75rem;
    color: #666;
  }

  .char-count.over-limit {
    color: #f87171;
  }

  input[type='text'],
  input[type='url'],
  input[type='date'],
  input[type='time'],
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
    min-height: 100px;
  }

  .hint {
    font-size: 0.75rem;
    color: #666;
  }

  .warning {
    font-size: 0.75rem;
    color: #f87171;
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

  .color-field {
    flex: 1;
  }

  .color-input-wrapper {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  input[type='color'] {
    width: 50px;
    height: 44px;
    padding: 4px;
    border: 1px solid #333;
    border-radius: 8px;
    background: #1a1a1a;
    cursor: pointer;
  }

  .color-text {
    flex: 1;
    font-family: 'SF Mono', Monaco, monospace;
  }

  select {
    cursor: pointer;
  }

  .images-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .image-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
  }

  .image-preview {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: 4px;
  }

  .image-row {
    display: flex;
    gap: 0.5rem;
  }

  .image-row input {
    flex: 1;
  }

  .file-input-hidden {
    display: none;
  }

  .image-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .upload-image-btn {
    padding: 0.5rem 1rem;
    background: #2d5a2d;
    border: 1px solid #3d7a3d;
    border-radius: 6px;
    color: #8fdf8f;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .upload-image-btn:hover:not(:disabled) {
    background: #3d7a3d;
    color: #afffaf;
  }

  .upload-image-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .remove-image-btn {
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: 1px solid #6b2020;
    border-radius: 6px;
    color: #f87171;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .remove-image-btn:hover:not(:disabled) {
    background: #3d1515;
  }

  .remove-image-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .add-image-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px dashed #444;
    border-radius: 6px;
    color: #888;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .add-image-btn:hover:not(:disabled) {
    border-color: #666;
    color: #ccc;
  }

  .add-image-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
