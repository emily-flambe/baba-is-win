---
allowed-tools:
  - Bash
  - Read
  - Grep
---

# Prepare Pull Request

Run all checks, review changes, and prepare for PR submission.

## Instructions

1. Run verification suite:
   ```bash
   npm test
   npm run check
   ```

2. Review all changes:
   ```bash
   git status
   git diff --staged
   git diff
   ```

3. Check for common issues:
   - Any console.log statements that should be removed
   - Any TODO comments that need addressing
   - Any hardcoded values that should be environment variables

4. Stage all relevant changes:
   ```bash
   git add -A
   ```

5. Generate a commit message summary based on the changes:
   - Look at what files changed and what the diff shows
   - Summarize the "why" not just the "what"
   - Follow conventional commit format if appropriate

6. Report status and suggested commit message to the user.
