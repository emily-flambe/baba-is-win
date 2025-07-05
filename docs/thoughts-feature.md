# Thoughts Feature Documentation

The Thoughts feature is a personal micro-blog system that allows you to share quick thoughts, musings, and observations with optional image attachments.

It's basically the bird app but we don't talk about the bird app anymore.

## Overview

Thoughts are:
- Short-form content (280 character limit)
- Organized by date
- Tagged for categorization
- Optionally enhanced with images
- Displayed in a clean, card-based layout

## File Structure

```
src/
├── data/thoughts/published/           # Published thought files
│   ├── 20250119-coffee-thoughts.md   # Example thought file
│   └── 20250121-image-test.md        # Example with images
├── pages/thoughts/
│   ├── index.astro                   # Thoughts listing page
│   ├── [slug].astro                  # Individual thought page
│   └── admin/new-thought.astro       # Admin form for creating thoughts
└── components/
    └── ImageCarousel.astro           # Image carousel component
```

## Creating a New Thought

### Method 1: Using the Admin Interface

1. Navigate to `/admin/new-thought` in your browser
2. Fill out the form:
   - **Thought**: Your content (max 280 characters with live counter)
   - **Tags**: Comma-separated tags (e.g., "coffee, coding, life")
   - **Images**: Image URLs, one per line (optional)
3. Click "Generate Markdown"
4. Copy the generated markdown
5. Create a new file in `src/data/thoughts/published/`
6. Name it using the format: `YYYYMMDD-short-slug.md`
7. Paste the content and save

### Method 2: Manual File Creation

Create a new `.md` file in `src/data/thoughts/published/` with this structure:

```yaml
---
content: Your thought content goes here (max 280 characters)
publishDate: 19 Jan 2025
publishTime: 11:30 AM
tags: ["tag1", "tag2", "tag3"]
color: "#1b2d1b"
images: [
  "/assets/thoughts/local-image.jpg",
  "https://example.com/remote-image.jpg"
]
---
```

## Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | String | ✅ | The thought content (280 char max) |
| `publishDate` | String | ✅ | Display date (e.g., "19 Jan 2025") |
| `publishTime` | String | ✅ | Display time (e.g., "11:30 AM") |
| `tags` | Array | ❌ | Tags for categorization |
| `color` | String | ❌ | Background color (hex code) |
| `images` | Array | ❌ | Image URLs (local or remote) |

## Image Handling

### Supported Image Sources

1. **Local Images**: Store in `public/assets/thoughts/` and reference as:
   ```yaml
   images: ["/assets/thoughts/my-photo.jpg"]
   ```

2. **Remote Images**: Direct URLs:
   ```yaml
   images: ["https://example.com/photo.jpg"]
   ```

3. **Mixed Sources**: Combine local and remote:
   ```yaml
   images: [
     "/assets/thoughts/local-photo.jpg",
     "https://cdn.example.com/remote-photo.jpg"
   ]
   ```

### Image Display Behavior

- **Single Image**: Displays as a simple image block
- **Multiple Images**: Automatically creates a carousel with:
  - Navigation arrows (left/right)
  - Dot indicators showing current position
  - Touch/swipe support on mobile
  - Keyboard navigation support

### Image Specifications

- **Max Width**: 500px
- **Height**: 300px (fixed)
- **Object Fit**: Cover (maintains aspect ratio, crops if needed)
- **Formats**: Any web-compatible format (JPG, PNG, WebP, etc.)

## File Naming Convention

Use the format: `YYYYMMDD-descriptive-slug.md`

Examples:
- `20250119-coffee-thoughts.md`
- `20250121-weekend-vibes.md`
- `20250315-coding-breakthrough.md`

## Color Customization

Set custom background colors for individual thoughts:

```yaml
color: "#1b2d1b"  # Dark green
color: "#2d1b4b"  # Purple
color: "#4b1b2d"  # Dark red
```

If no color is specified, the default theme background is used.

## Tags and Organization

### Tag Format
- Use lowercase
- Separate multiple words with spaces or hyphens
- Examples: `["coffee", "work life", "weekend-vibes"]`

### Tag Pages
Tags automatically generate individual pages at `/tags/[tag-name]` showing all thoughts with that tag.

## Display Features

### Thoughts Index (`/thoughts`)
- Groups thoughts by date
- Shows newest first
- Displays full content with images
- Shows tags and publish time
- Hover effects on cards

### Individual Thought Page (`/thoughts/[slug]`)
- Full-width display
- Large text for better readability
- Image carousel (if multiple images)
- Back link to thoughts index

## Technical Notes

### Image Carousel Component

The `ImageCarousel.astro` component features:
- Vanilla JavaScript (no external dependencies)
- Touch/swipe gesture support
- Keyboard accessibility
- Responsive design
- Smooth CSS transitions
- Automatic indicator updates

### Performance Considerations

- Images use `loading="lazy"` for better performance
- CSS transitions are optimized for 60fps
- Component only renders when images are present

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Touch events for mobile devices
- CSS Grid and Flexbox support required

## Troubleshooting

### Images Not Displaying
1. Check file paths are correct
2. Ensure images exist in `public/` directory
3. Verify image URLs are accessible
4. Check browser console for 404 errors

### Carousel Not Working
1. Ensure JavaScript is enabled
2. Check browser console for errors
3. Verify multiple images are present (single images don't show carousel controls)

### Build Errors
1. Validate frontmatter YAML syntax
2. Check for special characters in content
3. Ensure all required fields are present

## Examples

### Simple Thought (No Images)
```yaml
---
content: Just deployed a new feature and it works perfectly on the first try. Today is a good day!
publishDate: 21 Jan 2025
publishTime: 3:45 PM
tags: ["coding", "wins", "deployment"]
---
```

### Thought with Single Image
```yaml
---
content: Beautiful sunset from my office window today. Sometimes you need to pause and appreciate the view.
publishDate: 21 Jan 2025
publishTime: 6:30 PM
tags: ["nature", "photography", "mindfulness"]
color: "#4b2d1b"
images: ["/assets/thoughts/sunset-office.jpg"]
---
```

### Thought with Image Carousel
```yaml
---
content: Weekend hiking trip was incredible! Here are some highlights from the trail.
publishDate: 22 Jan 2025
publishTime: 7:00 PM
tags: ["hiking", "weekend", "nature", "adventure"]
color: "#1b4b2d"
images: [
  "/assets/thoughts/trail-start.jpg",
  "/assets/thoughts/mountain-view.jpg",
  "/assets/thoughts/summit-selfie.jpg",
  "https://weather-api.com/current-conditions.jpg"
]
---
```

## Future Enhancements

Potential features to consider:
- Direct image upload in admin interface
- Image optimization and resizing
- Draft thoughts system
- Thought scheduling
- Social sharing integration
- Comment system
- Search functionality
- Export/backup options