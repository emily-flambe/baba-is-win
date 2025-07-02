# Museum Masonry Layout Troubleshooting

## Issue Description

**Problem**: The masonry tile layout in the museum feature displays correctly when:
- User refreshes the page
- User navigates directly to `/museum`

But tiles appear "squished together" when:
- User clicks the "museum" link in the header navigation

## Root Cause Analysis

### Current Implementation
The masonry layout (`src/components/museum/MuseumGallery.astro:177-254`) uses:
- CSS Grid with `grid-auto-rows: 10px`
- JavaScript that calculates card heights and sets `grid-row-end: span X`
- Image loading detection via `waitForImages()` function
- Event listeners for `DOMContentLoaded` and `astro:page-load`

### Identified Issue: View Transitions Timing Race Condition

When navigating via header link, Astro's view transitions create timing issues where the masonry JavaScript runs before:
1. **CSS Custom Properties Applied**: Grid layout may not have proper CSS variables
2. **DOM Fully Settled**: Cards may not have final dimensions yet
3. **Images Properly Loaded**: New DOM context may interfere with image detection
4. **Layout Calculations**: Browser may not have completed layout passes

## Evidence-Based Solutions

### 1. Enhanced DOM Readiness Detection
```javascript
// Add multiple readiness checks
function isDOMReady() {
  return new Promise((resolve) => {
    // Check if grid container exists and has computed styles
    const grid = document.querySelector('.projects-grid.masonry, .projects-grid.grid');
    if (!grid) {
      setTimeout(() => resolve(isDOMReady()), 10);
      return;
    }
    
    // Verify CSS custom properties are available
    const computedStyle = getComputedStyle(grid);
    if (!computedStyle.gridAutoRows || computedStyle.gridAutoRows === 'auto') {
      setTimeout(() => resolve(isDOMReady()), 10);
      return;
    }
    
    resolve();
  });
}
```

### 2. Improved View Transition Handling
```javascript
// Replace current astro:page-load handler
document.addEventListener('astro:page-load', async () => {
  // Wait for DOM to be fully ready
  await isDOMReady();
  
  // Additional delay for view transitions to settle
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Run masonry
  await runMasonry();
});
```

### 3. Observer-Based Layout Detection
```javascript
// Use ResizeObserver for more reliable layout detection
function initMasonryWithObserver() {
  const grids = document.querySelectorAll('.projects-grid.grid, .projects-grid.masonry');
  
  grids.forEach(grid => {
    const observer = new ResizeObserver(() => {
      // Debounce to avoid excessive calculations
      clearTimeout(observer.timeout);
      observer.timeout = setTimeout(initMasonry, 50);
    });
    
    // Observe the grid container
    observer.observe(grid);
    
    // Also observe individual cards
    const cards = grid.querySelectorAll('.project-card');
    cards.forEach(card => observer.observe(card));
  });
}
```

### 4. Force Layout Recalc
```javascript
// Add forced reflow before calculations
function initMasonry() {
  const grids = document.querySelectorAll('.projects-grid.grid, .projects-grid.masonry');
  
  grids.forEach(grid => {
    // Force layout recalculation
    grid.offsetHeight;
    
    const cards = grid.querySelectorAll('.project-card');
    const rowGap = 32;
    const rowHeight = 10;
    
    cards.forEach(card => {
      // Force reflow for each card
      card.offsetHeight;
      
      const cardHeight = card.getBoundingClientRect().height;
      const rowSpan = Math.ceil((cardHeight + rowGap) / (rowHeight + rowGap));
      card.style.gridRowEnd = `span ${rowSpan}`;
    });
  });
}
```

## Recommended Implementation Strategy

### Phase 1: Quick Fix (Low Risk)
Add enhanced delay and readiness checks to existing `astro:page-load` handler:

```javascript
document.addEventListener('astro:page-load', async () => {
  // Wait for next animation frame
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  // Additional small delay for view transitions
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Run existing masonry logic
  await runMasonry();
});
```

### Phase 2: Robust Solution (Medium Risk)
Implement comprehensive DOM readiness detection and ResizeObserver pattern.

### Phase 3: Alternative Approach (Higher Risk)
Consider CSS-only masonry using `display: grid` with `grid-template-rows: masonry` for browsers that support it, with JavaScript fallback.

## Testing Strategy

### Reproduction Steps
1. Navigate to any page other than `/museum`
2. Click the "museum" link in header navigation
3. Observe tile layout - should be properly spaced, not squished

### Validation Checklist
- [ ] Header navigation to museum displays correctly
- [ ] Direct navigation to `/museum` still works
- [ ] Page refresh still works  
- [ ] Responsive breakpoints work correctly
- [ ] Performance impact is minimal
- [ ] Works across different browsers

## Common Masonry Timing Issues

### Browser Compatibility Notes
- **Safari**: Often requires additional `requestAnimationFrame` calls
- **Firefox**: May need explicit layout forcing with `offsetHeight`
- **Chrome**: Generally more forgiving but still susceptible to race conditions

### Performance Considerations
- Debounce resize handlers to avoid excessive calculations
- Use `requestAnimationFrame` for smooth animations
- Consider using `will-change: transform` on cards during transitions

## Implementation Priority

**High Priority**: Phase 1 quick fix (minimal code change, immediate improvement)
**Medium Priority**: Enhanced image loading detection  
**Low Priority**: Complete refactor to observer-based system

## Related Issues
- Similar timing issues may affect other JavaScript-enhanced components during view transitions
- Consider creating a global utility for view transition readiness detection

---
*Generated by SuperClaude troubleshooting analysis*