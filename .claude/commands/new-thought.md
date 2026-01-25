---
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# Create New Thought

Create a new "thought" (short-form post) with the provided content.

## Arguments

Content for the thought. Can include:
- Text content
- Tags (comma-separated)
- Color (optional hex code for background)

## Instructions

1. Parse the arguments to extract:
   - Main content text
   - Tags (if mentioned)
   - Color preference (if mentioned)

2. Generate a slug from the content (first few words, lowercase, hyphenated)

3. Get current date and time:
   ```bash
   date +"%Y-%m-%d"
   date +"%H:%M"
   ```

4. Create the markdown file at `src/data/thoughts/published/{slug}.md`:
   ```markdown
   ---
   content: "The thought content here"
   publishDate: "YYYY-MM-DD"
   publishTime: "HH:MM"
   tags: ["tag1", "tag2"]
   color: "#hexcolor"
   ---
   ```

5. Verify the file was created:
   ```bash
   ls -la src/data/thoughts/published/
   ```

6. Report the new thought location and suggest testing with `make dev`.
