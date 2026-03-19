/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface Window {
  posthog?: {
    capture: (event: string, properties?: Record<string, unknown>) => void;
    identify: (distinctId: string, properties?: Record<string, unknown>) => void;
    reset: () => void;
  };
}

import type { Env } from './types/env';

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
    };
    user?: {
      id: string;
      email: string;
      username: string;
      createdAt: Date;
    };
  }
}
