// Detect if running in Capacitor (mobile) or web
const isCapacitor =
  typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
const API_BASE = isCapacitor ? 'https://emilycogsdill.com/api' : '/api';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export type ContentStatus = 'draft' | 'published' | 'archived';

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  description: string | null;
  thumbnail: string | null;
  tags: string[];
  premium: boolean;
  status: ContentStatus;
  publishDate: string | null;
  readingTimeMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThoughtImage {
  url: string;
  offset?: { x: number; y: number };
}

export interface Thought {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  color: string | null;
  images: ThoughtImage[];
  tags: string[];
  status: ContentStatus;
  publishDate: string | null;
  publishTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  status: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error: ApiError = {
      error: errorBody.error || response.statusText,
      status: response.status,
    };
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// Auth endpoints
export async function login(
  email: string,
  password: string
): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me');
}

// Posts endpoints
export async function getPosts(status?: string): Promise<{ posts: Post[] }> {
  const query = status ? `?status=${status}` : '';
  return request<{ posts: Post[] }>(`/admin/posts${query}`);
}

export async function getPost(id: string): Promise<{ post: Post }> {
  return request<{ post: Post }>(`/admin/posts/${id}`);
}

export async function createPost(
  data: Partial<Post>
): Promise<{ post: Post }> {
  return request<{ post: Post }>('/admin/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePost(
  id: string,
  data: Partial<Post>
): Promise<{ post: Post }> {
  return request<{ post: Post }>(`/admin/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: string): Promise<void> {
  return request<void>(`/admin/posts/${id}`, {
    method: 'DELETE',
  });
}

// Thoughts endpoints
export async function getThoughts(
  status?: string
): Promise<{ thoughts: Thought[] }> {
  const query = status ? `?status=${status}` : '';
  return request<{ thoughts: Thought[] }>(`/admin/thoughts${query}`);
}

export async function getThought(id: string): Promise<{ thought: Thought }> {
  return request<{ thought: Thought }>(`/admin/thoughts/${id}`);
}

export async function createThought(
  data: Partial<Thought>
): Promise<{ thought: Thought }> {
  return request<{ thought: Thought }>('/admin/thoughts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateThought(
  id: string,
  data: Partial<Thought>
): Promise<{ thought: Thought }> {
  return request<{ thought: Thought }>(`/admin/thoughts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteThought(id: string): Promise<void> {
  return request<void>(`/admin/thoughts/${id}`, {
    method: 'DELETE',
  });
}

// Image upload
export async function uploadImage(
  file: File
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE}/admin/images/upload`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error: ApiError = {
      error: errorBody.error || response.statusText,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
