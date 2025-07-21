# PremiumContent Component Guide

The `PremiumContent.astro` component is the main component for handling conditional rendering of premium content based on user authentication. It integrates seamlessly with the existing authentication middleware and content processing utilities.

## Overview

This component provides a complete solution for:
- **Conditional Content Rendering**: Shows full content to authenticated users, truncated content to anonymous users
- **Visual Fade Effects**: CSS-only fade-out effects for premium content previews
- **Authentication Prompts**: User-friendly sign-in/sign-up prompts for premium content
- **Server-side Security**: All content processing happens server-side for security
- **SEO Optimization**: Search engines see preview content appropriately

## Component Location

```
src/components/PremiumContent.astro
```

## Props Interface

```typescript
interface Props {
  content: string;                    // Raw content (markdown or HTML)
  isPremium: boolean;                 // Whether content is marked as premium
  isAuthenticated: boolean;           // User authentication status
  contentType?: 'blog' | 'thought';  // Content type (affects truncation limits)
  customTruncateLimit?: number;       // Override default word limits
  frontmatter?: ContentFrontmatter;   // Content metadata
  ContentComponent?: any;             // Astro component for full markdown rendering
  showIndicator?: boolean;            // Whether to show premium indicator
}
```

## Basic Usage

### Blog Post Integration

```astro
---
// In src/pages/blog/[slug].astro
import PremiumContent from '../../components/PremiumContent.astro';
import type { User } from '../../lib/auth/types';

// Get post data (existing logic)
const { Content, frontmatter } = post;
const user: User | null = Astro.locals.user || null;
const rawContent = post.rawContent();
---

<article>
  <PremiumContent 
    content={rawContent}
    isPremium={frontmatter.premium || false}
    isAuthenticated={!!user}
    contentType="blog"
    frontmatter={frontmatter}
    ContentComponent={Content}
  />
</article>
```

### Thought Post Integration

```astro
---
// In src/pages/thoughts/[slug].astro
import PremiumContent from '../../components/PremiumContent.astro';

// Similar setup but with contentType="thought"
---

<article>
  <PremiumContent 
    content={rawContent}
    isPremium={frontmatter.premium || false}
    isAuthenticated={!!user}
    contentType="thought"
    frontmatter={frontmatter}
    ContentComponent={Content}
  />
</article>
```

## Advanced Usage

### Custom Truncation Limits

```astro
<!-- Override default word limits -->
<PremiumContent 
  content={rawContent}
  isPremium={true}
  isAuthenticated={false}
  contentType="blog"
  customTruncateLimit={75}
  frontmatter={frontmatter}
  ContentComponent={Content}
/>
```

### Without Premium Indicator

```astro
<!-- Hide the premium indicator (useful for custom placement) -->
<PremiumContent 
  content={rawContent}
  isPremium={true}
  isAuthenticated={false}
  contentType="blog"
  frontmatter={frontmatter}
  ContentComponent={Content}
  showIndicator={false}
/>
```

### HTML-only Content (without Astro Component)

```astro
<!-- For processed HTML content without Astro component -->
<PremiumContent 
  content={htmlContent}
  isPremium={true}
  isAuthenticated={false}
  contentType="blog"
  frontmatter={frontmatter}
/>
```

## Content Processing Integration

The component automatically uses the content processing utilities:

- **`processContentForDisplay()`**: Handles truncation logic based on authentication
- **`shouldShowFullContent()`**: Determines content visibility
- **`truncateContent()`**: Applies word limits with ellipsis

### Default Word Limits

- **Blog posts**: 50 words for anonymous users
- **Thoughts**: 10 words for anonymous users
- **Custom**: Override with `customTruncateLimit` prop

## Visual Features

### Fade-out Effect

For truncated premium content, the component applies:
- **CSS-only fade gradient**: No JavaScript required
- **Responsive overlay**: Adapts to different screen sizes
- **Accessible design**: Works with screen readers and high contrast mode

### Authentication Prompt

The unlock prompt includes:
- **Clear call-to-action**: "Continue reading with a free account"
- **Dual options**: Sign In and Sign Up buttons
- **Responsive design**: Stacks vertically on mobile

## Styling and Customization

### CSS Classes

```css
.premium-content-wrapper      /* Main container */
.content-display             /* Content area */
.content-display.has-fade    /* Truncated content with fade */
.fade-overlay                /* Fade effect container */
.fade-gradient               /* Gradient overlay */
.unlock-prompt               /* Authentication prompt */
.unlock-button               /* Sign in/up buttons */
```

### Custom Styling Example

```astro
<PremiumContent 
  content={rawContent}
  isPremium={true}
  isAuthenticated={false}
  contentType="blog"
  frontmatter={frontmatter}
  ContentComponent={Content}
/>

<style>
  /* Custom fade height for this page */
  .content-display.has-fade {
    max-height: 300px;
  }
  
  /* Custom button styling */
  .unlock-button {
    background: #custom-color;
  }
</style>
```

## Authentication Integration

The component works with the existing authentication middleware:

### Middleware Integration

```typescript
// In src/middleware.ts
export const onRequest = defineMiddleware(async (context, next) => {
  // Existing auth logic sets context.locals.user
  const user = await authenticateUser(token);
  context.locals.user = user;
  return next();
});
```

### Component Usage

```astro
---
// Component automatically gets user from Astro.locals
const user = Astro.locals.user || null;
const isAuthenticated = !!user;
---

<PremiumContent 
  isAuthenticated={isAuthenticated}
  {/* other props */}
/>
```

## Security Considerations

### Server-side Processing

- **Content truncation**: Happens on the server, not exposed to client
- **Authentication checks**: Server-side validation only
- **No content leakage**: Anonymous users never receive full premium content

### SEO Benefits

- **Search engine visibility**: Crawlers see appropriate content previews
- **No JavaScript dependency**: Works without client-side scripts
- **Progressive enhancement**: Core functionality works everywhere

## Performance Features

### Efficient Rendering

- **CSS-only effects**: No JavaScript for visual elements
- **Server-side processing**: Minimal client-side overhead
- **Responsive design**: Optimized for all screen sizes

### Memory Efficiency

- **Lazy evaluation**: Content processing only when needed
- **Minimal DOM**: Clean HTML output
- **Cached processing**: Leverages existing content utilities

## Testing

The component includes comprehensive tests:

```bash
npm test -- PremiumContent.test.ts
```

Test coverage includes:
- **Authentication scenarios**: Authenticated vs anonymous users
- **Content types**: Blog vs thought truncation
- **Edge cases**: Empty content, short content, undefined premium flags
- **Integration**: Works with existing content processing utilities

## Migration from Existing Implementation

### Before (Manual Implementation)

```astro
---
const contentData = processContentForDisplay(rawContent, frontmatter, user, 'blog');
---

{contentData.isTruncated ? (
  <div class="truncated-content">
    <p set:html={contentData.content}></p>
  </div>
) : (
  <Content />
)}

<PremiumContentIndicator 
  isPremium={contentData.isPremium}
  requiresAuth={contentData.requiresAuth}
  isTruncated={contentData.isTruncated}
/>
```

### After (Using PremiumContent Component)

```astro
<PremiumContent 
  content={rawContent}
  isPremium={frontmatter.premium || false}
  isAuthenticated={!!user}
  contentType="blog"
  frontmatter={frontmatter}
  ContentComponent={Content}
/>
```

## Troubleshooting

### Common Issues

1. **Content not truncating**: Check `isPremium` and `isAuthenticated` props
2. **Styling issues**: Ensure CSS variables are available in global scope
3. **Authentication not working**: Verify middleware is setting `Astro.locals.user`

### Debug Tips

```astro
---
// Add debug logging
console.log('Premium status:', frontmatter.premium);
console.log('User authenticated:', !!user);
console.log('Content length:', rawContent.length);
---
```

## Examples

See the following example files for complete implementations:
- `examples/enhanced-blog-slug-with-PremiumContent.astro`
- `examples/enhanced-thoughts-slug-with-PremiumContent.astro`
- `examples/PremiumContent-usage-examples.astro`

## Related Files

- **Content Processing**: `src/utils/contentProcessing.ts`
- **Premium Indicator**: `src/components/PremiumContentIndicator.astro`
- **Authentication**: `src/middleware.ts`
- **Types**: `src/types/env.ts`
- **Tests**: `src/__tests__/PremiumContent.test.ts`