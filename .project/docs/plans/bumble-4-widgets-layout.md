# Bumble 4-Widget Layout Implementation Plan

## Overview
Update the BumblePrompts component to display 4 Bumble-style widgets side by side, each with different content. The real responses will be randomly positioned among AI-generated placeholder responses.

## Requirements
- Display 4 identical Bumble widgets horizontally
- Each widget has the same visual design (no differentiation)
- Content varies: 1 real, 3 AI-generated placeholders
- Random positioning on each page load
- Responsive layout for different screen sizes

## TODO List

### 1. Update Component Structure
- [ ] Modify BumblePrompts.astro to render 4 widget instances
- [ ] Create a container div with CSS Grid for 4-column layout
- [ ] Each widget maintains the existing Bumble UI design

### 2. Create Content Sets
- [ ] Keep existing real prompts data
- [ ] Create AI Response Set 1 (Overly Earnest/Sincere)
- [ ] Create AI Response Set 2 (Trying Too Hard to be Funny)
- [ ] Create AI Response Set 3 (Generic Dating App Responses)

### 3. Implement Randomization
- [ ] Create array of 4 prompt sets
- [ ] Shuffle array order on component initialization
- [ ] Render widgets in shuffled order

### 4. Update JavaScript
- [ ] Modify renderPrompts() to accept prompts parameter
- [ ] Update switchCategory() to work with multiple widgets
- [ ] Ensure each widget's state is independent

### 5. Responsive Design
- [ ] Desktop: 4 columns (25% width each)
- [ ] Tablet: 2x2 grid
- [ ] Mobile: Single column or horizontal scroll

### 6. Placeholder Content Examples

#### AI Set 1 - Overly Earnest
```javascript
fun: [
  { q: "Two truths and a lie", a: "I volunteer at the animal shelter every weekend, I believe in the power of positive thinking, I've never told a white lie (the lie is the last one)" },
  { q: "If I could eat only one meal for the rest of my life", a: "A balanced, nutritious salad with grilled chicken because health is wealth" }
]
```

#### AI Set 2 - Trying Too Hard to be Funny
```javascript
fun: [
  { q: "Two truths and a lie", a: "I once ate 47 chicken nuggets in one sitting, I'm banned from 3 different escape rooms, My middle name is actually Danger (spoiler: it's not)" },
  { q: "If I could eat only one meal for the rest of my life", a: "Pizza, because I'm basic and I own it 🍕💁" }
]
```

#### AI Set 3 - Generic Dating App
```javascript
fun: [
  { q: "Two truths and a lie", a: "I love to travel, I enjoy trying new restaurants, I don't like hiking (the lie is the last one)" },
  { q: "If I could eat only one meal for the rest of my life", a: "Tacos! Can't go wrong with tacos 🌮" }
]
```

## Technical Implementation Notes

### CSS Grid Structure
```css
.bumble-widgets-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

@media (max-width: 1200px) {
  .bumble-widgets-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .bumble-widgets-container {
    grid-template-columns: 1fr;
  }
}
```

### Randomization Logic
```javascript
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

## Next Steps
After implementing the basic 4-widget layout with placeholder content, future enhancements could include:
- Real AI-generated responses using GPT
- Click to reveal which one is real
- Vote tracking and statistics
- Share functionality

But for now, focus on the visual layout with placeholder content.