# Claude Architecture Extension

**Primary Source:** `.project/contexts/architecture.md`

This file extends the project architecture context with Claude-specific optimizations.

## Project Architecture Reference
@include .project/contexts/architecture.md#*

## Claude-Specific Architecture Considerations

### Code Generation Patterns
- Prefer editing existing files over creating new ones
- Use absolute paths for all file operations
- Follow existing Astro and TypeScript patterns exactly
- Never add comments unless explicitly requested

### SuperClaude Optimizations
- Token-efficient file operations using @include patterns
- Modular context system for specialized knowledge areas
- Persona-based task delegation for complex operations
- MCP integration for advanced tool capabilities

### Claude Tool Integration
- Use specialized context files for different knowledge domains
- Leverage MCP server capabilities for enhanced functionality
- Apply persona-based routing for task-specific expertise
- Maintain efficiency through strategic caching and reference patterns