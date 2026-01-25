---
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebFetch
---

# Fix GitHub Issue

Fix the GitHub issue specified by number.

## Instructions

1. Fetch issue details:
   ```bash
   gh issue view $ARGUMENTS --json title,body,labels,comments
   ```

2. Analyze the issue to understand:
   - What is broken or needs to change
   - Which files are likely affected
   - Any reproduction steps or expected behavior

3. Search the codebase to find relevant files:
   - Use Grep/Glob to locate related code
   - Read the affected files to understand current implementation

4. Implement the fix:
   - Make minimal, focused changes
   - Follow existing code patterns
   - Add tests if the fix involves logic changes

5. Verify the fix:
   ```bash
   npm test
   npm run check
   ```

6. Stage changes and summarize what was fixed:
   ```bash
   git add -A
   git status
   ```
