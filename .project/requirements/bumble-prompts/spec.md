# Bumble-Style Profile Prompt Widget Specification

## Overview
This is a self-contained HTML widget that mimics Bumble's dating app profile prompt interface. It displays categorized conversation starters that users can click to reveal answers, creating an interactive "get to know me" experience.

## Features
- **6 prompt categories**: Bit of fun, Date night, Looking for, About me, Real talk, Self-care
- **Click-to-reveal answers**: Each prompt expands on click to show the answer
- **Mobile-first design**: Styled to look like a native mobile app interface
- **Smooth animations**: Native-feeling transitions and interactions
- **Auto-collapse**: Opening a new prompt automatically closes others

## Integration Instructions

### Option 1: Iframe Embed (Recommended for isolation)
```html
<iframe
  src="path/to/bumble-widget.html"
  width="375"
  height="600"
  frameborder="0"
  style="border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
</iframe>
```

### Option 2: Direct Embed
1. Copy the entire HTML code into a `<div>` container on your page
2. Ensure the container has a max-width of 375px for optimal display
3. The widget is self-contained with all styles and scripts included

### Option 3: Component Integration
If using a framework, wrap the HTML in your component system:
- React: Create a component that returns the HTML using `dangerouslySetInnerHTML`
- Vue: Use as a template with styles in a `<style>` tag
- Static sites: Copy directly into your HTML file

## Customization Guide

### Modifying Prompts and Answers
The prompts are stored in a JavaScript object. Find the `prompts` variable and update:
```javascript
const prompts = {
  fun: [
    { q: "Your question here", a: "Your answer here" },
    // Add more prompts...
  ],
  // Other categories...
};
```

### Styling Adjustments
Key CSS variables to modify:
- Background color: `.phone-wrapper` background property
- Accent color: `.tab.active` border-bottom-color
- Card styling: `.prompt-card` background and border-radius
- Font: Update the `font-family` in body

### Responsive Behavior
- Widget is optimized for 375px width (iPhone size)
- Scales responsively below 400px viewport width
- For desktop, consider wrapping in a centered container

## Technical Details
- **No dependencies**: Pure HTML/CSS/JavaScript
- **File size**: ~15KB uncompressed
- **Browser support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Accessibility**: Keyboard navigable, semantic HTML

## Data Structure
Each prompt follows this format:
```javascript
{
  q: "Question text",
  a: "Answer text"
}
```

Categories available:
- `fun`: Lighthearted conversation starters
- `date`: Dating and relationship prompts
- `looking`: What you're seeking in a partner
- `about`: Personal information and preferences
- `real`: Honest/vulnerable topics
- `self`: Self-care and personal growth

## Implementation Notes
- The close button (×) triggers an alert by default - replace with your own close logic
- The status bar is decorative - update time or remove if not needed
- Prompts animate on expand/collapse for smooth UX
- Touch-optimized with active states for mobile interaction

## Example Deployment
```html
<!-- Your webpage -->
<div class="profile-section">
  <h2>Get to Know Me</h2>
  <div class="widget-container">
    <!-- Paste the entire HTML code here -->
  </div>
</div>

<style>
.widget-container {
  max-width: 375px;
  margin: 0 auto;
}
</style>
```

## Modification Checklist
- [ ] Replace all prompt answers with your personal responses
- [ ] Optionally add/remove prompts from categories
- [ ] Adjust colors to match your site theme
- [ ] Update or remove the phone status bar
- [ ] Connect close button to appropriate action
- [ ] Test on mobile devices for touch interaction
- [ ] Verify animations work smoothly

## SEO Considerations
- Prompts and answers are in the HTML, making them crawlable
- Consider adding meta descriptions based on prompt content
- Use semantic HTML for better accessibility and SEO
