# CLAUDE.md - Baba Is Win Project Configuration

Enhanced Claude configuration for the baba-is-win project.

## Core Configuration
@include shared/core.yml#Core_Philosophy
@include shared/core.yml#Advanced_Token_Economy
@include shared/core.yml#Code_Economy
@include shared/core.yml#Performance_Standards
@include shared/core.yml#Task_Management

## Rules & Standards
@include shared/rules.yml#Development_Practices
@include shared/rules.yml#Code_Generation
@include shared/rules.yml#Security_Standards
@include shared/rules.yml#Project_Quality
@include shared/rules.yml#Communication_Standards

## Project-Specific Configuration

### Worktree Management
@include configs/worktree-rules.yml#Worktree_Rules
@include configs/worktree-rules.yml#Worktree_Structure
@include configs/worktree-rules.yml#Worktree_Best_Practices

### Technology Stack
This project uses:
- Astro for static site generation
- TypeScript for type safety
- Cloudflare Pages for hosting
- Cloudflare D1 for database
- Gmail API for email functionality
- Google OAuth for authentication

### Development Guidelines
- Follow existing Astro patterns and conventions
- Use TypeScript strictly - no any types
- Test email functionality thoroughly in development
- Ensure OAuth flows work correctly
- Maintain responsive design principles
- Keep bundle sizes optimized

---
*Baba Is Win Project Configuration v1.0*