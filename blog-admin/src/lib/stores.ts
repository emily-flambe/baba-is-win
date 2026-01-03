import { writable } from 'svelte/store';
import type { User } from './api';

// Current authenticated user (null if not logged in)
export const user = writable<User | null>(null);

// Global loading state
export const loading = writable<boolean>(true);
