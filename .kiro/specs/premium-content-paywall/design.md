# Design Document

## Overview

The premium content paywall system extends the existing content management architecture to support authentication-based content access control. The system leverages the current frontmatter-based metadata approach and existing authentication middleware to provide seamless premium content experiences.

The design implements a client-side content truncation approach with visual fade effects for anonymous users, while authenticated users receive full content access. This approach maintains SEO benefits while creating conversion incentives.

## Architecture

### Content Classification System

The system extends the existing frontmatter metadata structure to include premium content designation:

```yaml
---
title: "Premium Blog Post"
publishDate: 01 Mar 2025
description: "This is premium content"
premium: true  # New field for premium designation
---
```

### Authentication Integration

The design leverages the existing authentication middleware (`src/middleware.ts`) which already provides:
- User context injection via `context.locals.user`
- Optional authentication for public routes
- JWT-based session management

### Content Rendering Strategy

**For Anonymous Users:**
- Blog post content is truncated to approximately 50 words
- Thought content is truncated to approximately 10 words
- CSS-based fade-out effect applied to truncated content
- Authentication prompt overlay displayed
- Full content hidden via CSS classes

**For Authenticated Users:**
- Complete content rendered without restrictions
- No visual overlays or authentication prompts
- Standard content styling maintained

## Components and Interfaces

### 1. Content Metadata Extension

**Location:** Frontmatter in existing `.md` files

```typescript
interface ContentFrontmatter {
  // Existing fields...
  title?: string;
  publishDate: string;
  description?: string;
  tags?: string[];
  
  // New premium field
  premium?: boolean;
}
```

### 2. Content Processing Utilities

**Location:** `src/utils/contentProcessor.ts`

```typescript
interface ContentProcessor {
  truncateContent(content: string, wordLimit: number): string;
  isPremiumContent(frontmatter: any): boolean;
  shouldShowFullContent(user: User | null, isPremium: boolean): boolean;
}
```

### 3. Premium Content Component

**Location:** `src/components/PremiumContent.astro`

```typescript
interface PremiumContentProps {
  content: string;
  isPremium: boolean;
  isAuthenticated: boolean;
  truncateAt?: number;
}
```

### 4. Authentication Prompt Component

**Location:** `src/components/AuthPrompt.astro`

```typescript
interface AuthPromptProps {
  message?: string;
  redirectUrl?: string;
}
```

## Data Models

### Extended Content Metadata

The existing frontmatter structure is extended minimally:

```yaml
# Thoughts
---
content: |
  This is premium thought content...
publishDate: 16 Jul 2025
publishTime: "9:50 PM"
tags: ["premium", "exclusive"]
color: "#1B5E20"
premium: true  # New field
---

# Blog Posts
---
title: "Premium Blog Post"
publishDate: 01 Mar 2025
description: "Exclusive content for members"
thumbnail: /assets/blog/premium.png
tags: ["premium", "exclusive"]
premium: true  # New field
---
```

### Content Processing Logic

```typescript
type ContentAccess = {
  showFullContent: boolean;
  truncatedContent?: string;
  requiresAuth: boolean;
};

function determineContentAccess(
  content: string,
  isPremium: boolean,
  user: User | null
): ContentAccess {
  if (!isPremium || user) {
    return {
      showFullContent: true,
      requiresAuth: false
    };
  }
  
  return {
    showFullContent: false,
    truncatedContent: truncateContent(content, contentType === 'blog' ? 50 : 10),
    requiresAuth: true
  };
}
```

## Error Handling

### Content Access Errors

1. **Invalid Premium Flag:** If premium metadata is malformed, default to public content
2. **Authentication Failures:** Gracefully degrade to preview mode
3. **Content Processing Errors:** Fall back to showing first paragraph as preview

### Graceful Degradation

- If JavaScript fails, CSS-only truncation ensures basic functionality
- Authentication service failures default to anonymous user experience
- Content processing errors show safe fallback previews

## Testing Strategy

### Unit Tests

**Content Processing Tests:**
```typescript
describe('ContentProcessor', () => {
  test('truncates content to specified word limit');
  test('preserves markdown formatting in truncated content');
  test('identifies premium content from frontmatter');
  test('determines correct access level for user types');
});
```

**Component Tests:**
```typescript
describe('PremiumContent Component', () => {
  test('shows full content to authenticated users');
  test('shows truncated content to anonymous users');
  test('displays authentication prompt for premium content');
  test('applies fade-out styling correctly');
});
```

### Integration Tests

**Authentication Flow Tests:**
```typescript
describe('Premium Content Authentication', () => {
  test('redirects to login when accessing premium content');
  test('shows full content after successful authentication');
  test('maintains premium access across page navigation');
});
```

**Content Rendering Tests:**
```typescript
describe('Content Rendering', () => {
  test('renders premium blog posts correctly for different user types');
  test('renders premium thoughts correctly for different user types');
  test('maintains existing functionality for non-premium content');
});
```

### Visual Regression Tests

- Fade-out effect appearance across different screen sizes
- Authentication prompt positioning and styling
- Content layout consistency between premium and regular content

## Implementation Considerations

### SEO Optimization

- Premium content previews remain indexable by search engines
- Meta descriptions use truncated content for premium posts
- Structured data markup includes premium content indicators

### Performance

- Content truncation performed server-side to avoid layout shifts
- CSS-based fade effects minimize JavaScript requirements
- Authentication checks leverage existing middleware without additional overhead

### Accessibility

- Screen readers receive appropriate content length indicators
- Keyboard navigation works correctly with authentication prompts
- Color contrast maintained in fade-out effects

### Browser Compatibility

- CSS fade effects use widely supported properties
- Fallback styling for older browsers
- Progressive enhancement approach for JavaScript features