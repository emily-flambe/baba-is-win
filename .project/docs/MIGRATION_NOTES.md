# Steering Documentation Migration Notes

## Migration Date: 2025-08-21

## Changes Made

This project's steering documentation has been refactored to align with the standardized STEERING_FRAMEWORK.md structure.

### Old Structure → New Structure

1. **Entry Point**
   - OLD: `.project/README.md` (general project info)
   - NEW: `.project/README.md` (structured entry point with clear navigation)

2. **Guidelines** (NEW: `.project/guidelines/`)
   - `ai-guidelines.md` → `guidelines/ai-behavior.md` (consolidated and standardized)
   - NEW: `guidelines/coding-standards.md` (extracted from dev-guide.md)
   - NEW: `guidelines/tdd-approach.md` (new, defines testing philosophy)
   - NEW: `guidelines/troubleshooting.md` (extracted and expanded from dev-guide.md)

3. **Requirements** (NEW: `.project/requirements/`)
   - NEW: `requirements/overview.md` (project vision, goals, and requirements)
   - `dev-guide.md` → `requirements/technical.md` (tech stack and architecture)

4. **Optional Documentation** (`.project/docs/`)
   - NEW: `docs/api.md` (API endpoint documentation)
   - NEW: `docs/deployment.md` (deployment procedures)
   - Moved: Scripts, contexts, logs, and old files preserved here

### Key Improvements

1. **Consistent Structure**: Now follows the standardized framework used across all projects
2. **Clear Separation**: Guidelines (how we work) vs Requirements (what we build) vs Docs (additional info)
3. **Better Navigation**: README.md serves as a clear entry point
4. **AI-Friendly**: Explicit instructions for AI assistants to read all files
5. **Human-Friendly**: Clear organization for human developers

### Preserved Content

All original content has been preserved:
- Old files moved to `docs/` with `_OLD` suffix
- Scripts remain functional in `docs/scripts/`
- Context files preserved in `docs/contexts/`
- Environment examples preserved

### Using the New Structure

For AI Assistants:
1. Always start by reading `.project/README.md`
2. Read ALL files in `guidelines/` before starting work
3. Understand the project from `requirements/`
4. Reference `docs/` for additional details as needed

For Humans:
1. Start with `.project/README.md` for overview
2. Check `guidelines/troubleshooting.md` for common issues
3. Review `requirements/` to understand the project
4. Use `docs/` for detailed references

### Benefits of Standardization

- **Familiarity**: Same structure across all projects
- **Predictability**: Know where to find information
- **Completeness**: All required aspects documented
- **Maintainability**: Clear what needs updating
- **Onboarding**: Faster for new developers/AI assistants