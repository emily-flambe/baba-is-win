/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        DB: D1Database;
        JWT_SECRET: string;
      };
    };
    user?: {
      id: string;
      email: string;
      username: string;
      createdAt: Date;
    };
  }
}
