/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

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
