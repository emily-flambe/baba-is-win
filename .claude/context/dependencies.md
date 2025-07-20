# Claude Dependencies Extension

**Primary Source:** `.project/contexts/dependencies.md`

This file extends the project dependencies context with Claude-specific considerations.

## Project Dependencies Reference
@include .project/contexts/dependencies.md#*

## Claude-Specific Dependency Considerations

### Library Verification Protocol
- Always check `package.json` before suggesting new dependencies
- Use only existing dependencies unless explicitly required to add new ones
- Understand the specific versions in use to avoid compatibility issues
- Respect the existing dependency architecture

### Claude Tool Dependencies
- Leverage MCP server capabilities when available
- Use built-in Claude Code tools efficiently
- Understand Cloudflare Workers environment limitations
- Work within existing testing framework constraints