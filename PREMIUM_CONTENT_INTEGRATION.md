# Premium Content Paywall Integration Guide

This guide explains how to integrate the content processing utilities for the premium content paywall system into your existing Astro pages.

## Overview

The premium content system provides utilities to:
- Mark content as premium using frontmatter flags
- Truncate content for anonymous users based on content type
- Display premium indicators and authentication prompts
- Maintain full access for authenticated users

## Files Created

### Core Utilities
- `src/utils/contentProcessing.ts` - Main content processing utilities
- `src/types/env.ts` - Enhanced with content-related TypeScript types
- `src/components/PremiumContentIndicator.astro` - UI component for premium content indicators

### Test Files
- `src/__tests__/contentProcessing.test.ts` - Comprehensive test suite for utilities

### Example Content
- `src/data/thoughts/published/20250721-premium-test.md` - Sample premium thought
- `src/data/blog-posts/published/20250721-premium-blog-test.md` - Sample premium blog post

### Integration Examples
- `examples/enhanced-blog-slug.astro` - Example blog post page with premium support
- `examples/enhanced-thoughts-slug.astro` - Example thoughts page with premium support

## Content Processing Functions

### `truncateContent(content: string, wordLimit: number): string`
Truncates content to specified word limit and adds ellipsis.

### `isPremiumContent(frontmatter: ContentFrontmatter): boolean`
Checks if content is marked as premium in frontmatter (`premium: true`).

### `shouldShowFullContent(user: User | null, isPremium: boolean): boolean`
Determines if user should see full content based on authentication and premium status.

### `processContentForDisplay(content, frontmatter, user, contentType): ProcessedContent`
Main processing function that applies truncation rules and returns processed content with metadata.

### `createContentPreview(content: string, maxWords: number): string`
Creates short previews for content listings (default 20 words).

## Truncation Rules

- **Blog posts**: 50 words for anonymous users viewing premium content
- **Thoughts**: 10 words for anonymous users viewing premium content
- **Non-premium content**: Full content for all users
- **Authenticated users**: Full content regardless of premium status

## Integration Steps

### 1. Mark Content as Premium

Add `premium: true` to the frontmatter of content files:

```yaml
---
title: Premium Blog Post
publishDate: 21 Jul 2025
premium: true
---
```

### 2. Modify Page Components

In your Astro page files (e.g., `src/pages/blog/[slug].astro`):

```astro
---
import { processContentForDisplay } from '../../utils/contentProcessing';
import PremiumContentIndicator from '../../components/PremiumContentIndicator.astro';

// Get user from middleware
const user = Astro.locals.user || null;

// Process content
const rawContent = post.rawContent();
const contentData = processContentForDisplay(rawContent, frontmatter, user, 'blog');
---

<article class="content">
  {contentData.isTruncated ? (
    <div class="truncated-content">
      <p set:html={contentData.content}></p>
    </div>
  ) : (
    <Content />
  )}
</article>

<PremiumContentIndicator 
  isPremium={contentData.isPremium}
  requiresAuth={contentData.requiresAuth}
  isTruncated={contentData.isTruncated}
/>
```

### 3. Handle Thoughts Pages

For thoughts (which use content from frontmatter):

```astro
---
import { processContentForDisplay } from '../../utils/contentProcessing';
import { processSimpleMarkdown } from '../../utils/simpleMarkdown.js';

const user = Astro.locals.user || null;
const contentData = processContentForDisplay(frontmatter.content, frontmatter, user, 'thought');
const processedMarkdown = processSimpleMarkdown(contentData.content);
---

<div class="thought-body">
  <p set:html={processedMarkdown}></p>
</div>
```

## Authentication Integration

The system integrates with the existing middleware in `src/middleware.ts`:
- User context is available in `Astro.locals.user`
- Anonymous users have `Astro.locals.user = null`
- Authenticated users have full user object with id, email, username, etc.

## TypeScript Support

All utilities include comprehensive TypeScript types:
- `ContentFrontmatter` - Interface for content frontmatter
- `ProcessedContent` - Return type for processed content
- `BlogPost` and `Thought` - Interfaces for content objects

## Testing

Run the test suite to verify functionality:

```bash
npx vitest run src/__tests__/contentProcessing.test.ts
```

The test suite covers:
- Content truncation logic
- Premium content detection
- User authentication scenarios
- Different content types (blog vs thoughts)
- Edge cases and error handling

## Security Considerations

- All content processing happens server-side
- Anonymous users cannot bypass truncation via client-side manipulation
- Premium flags are checked against frontmatter, not user input
- Authentication state is managed by the existing middleware system

## UI/UX Features

The `PremiumContentIndicator` component provides:
- Visual premium badge for premium content
- Clear authentication prompts for truncated content
- Styled indication that content requires sign-in
- Responsive design that works across device sizes

## Performance

- Content processing is lightweight and efficient
- Utilities use simple string operations and word counting
- No additional database queries required
- Compatible with existing Astro static generation

## Future Enhancements

Potential areas for expansion:
- Different premium tiers with varying word limits
- Time-based content access (e.g., early access for subscribers)
- Content analytics and engagement tracking
- Email notifications for premium content updates
- Integration with payment systems for premium subscriptions

## Support

The implementation follows existing codebase patterns:
- Uses the same TypeScript conventions
- Integrates with existing authentication system
- Maintains compatibility with current content structure
- Preserves existing functionality for non-premium content