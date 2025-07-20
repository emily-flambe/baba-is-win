# Claude Coding Standards Extension

**Primary Source:** `.project/contexts/coding-standards.md`

This file extends the project coding standards with Claude-specific rules.

## Project Coding Standards Reference
@include .project/contexts/coding-standards.md#*

## Claude-Specific Coding Standards

### File Creation Policy
- **ALWAYS prefer editing existing files over creating new ones**
- **NEVER proactively create documentation files unless explicitly requested**
- Only create new files when absolutely necessary for the goal
- Use absolute paths for all file operations

### Code Generation Rules
- Never add comments unless explicitly requested
- Follow existing patterns exactly rather than introducing new approaches
- Maintain serious, professional tone in all code and documentation
- Focus on functionality and technical accuracy over style

### Claude Communication Standards
- Be direct and straightforward without unnecessary personality or humor
- Avoid excessive emojis, jokes, or overly casual language
- Always render mermaid diagrams as high-resolution PNG files
- Focus on technical accuracy over entertainment value

### Error Handling for Claude
- Read existing error handling patterns before implementing new ones
- Use existing error types and response formats
- Never introduce new error handling approaches without explicit requirement
- Maintain consistency with project error handling standards