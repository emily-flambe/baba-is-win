# Claude Instructions

## Git Worktree Management

Always create git worktrees in the `worktrees/` folder to keep the repository organized. Use worktrees for creating new branches instead of switching branches in the main working directory.

Examples:
```bash
# Create a new branch and worktree
git worktree add worktrees/feature-branch -b feature-branch

# Create worktree from existing branch
git worktree add worktrees/existing-branch existing-branch
```

## Workflow Notes

This demonstrates the worktree workflow in action - updated from the demo-worktree-workflow branch.