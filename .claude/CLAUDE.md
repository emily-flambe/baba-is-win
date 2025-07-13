# CLAUDE.md - Baba Is Win Project Configuration

## Project Identity
@include .claude/project/identity.yml#ProjectIdentity

## Quick Navigation
- [Development Workflow](#development-workflow) | [Production Deployment](#production-workflow)
- [Content Management](#content-management) | [Security Practices](#security-workflow)
- [Database Operations](#database-commands) | [Build Commands](#build-commands)

## Core SuperClaude Configuration
@include .claude/shared/superclaude-core.yml#Core_Philosophy
@include .claude/shared/superclaude-core.yml#Advanced_Token_Economy
@include .claude/shared/superclaude-core.yml#UltraCompressed_Mode

## Efficiency & Performance
@include .claude/shared/superclaude-core.yml#Code_Economy
@include .claude/shared/superclaude-core.yml#Cost_Performance_Optimization
@include .claude/shared/superclaude-core.yml#Intelligent_Auto_Activation

## Task Management
@include .claude/shared/superclaude-core.yml#Task_Management
@include .claude/shared/superclaude-core.yml#Performance_Standards

## Project Commands
@include .claude/project/identity.yml#BuildCommands
@include .claude/project/identity.yml#WranglerCommands
@include .claude/project/identity.yml#DatabaseCommands

## Development Workflow
@include .claude/project/workflows.yml#DevelopmentWorkflow

## Production Workflow  
@include .claude/project/workflows.yml#ProductionWorkflow

## Content Management
@include .claude/project/workflows.yml#ContentManagement

## Security Workflow
@include .claude/project/workflows.yml#SecurityWorkflow

## Standards & Rules
@include .claude/shared/superclaude-core.yml#Evidence_Based_Standards
@include .claude/shared/superclaude-core.yml#Standards
@include .claude/shared/superclaude-rules.yml#Smart_Defaults
@include .claude/shared/superclaude-rules.yml#Development_Practices
@include .claude/shared/superclaude-rules.yml#Security_Standards

## Universal Flags
@include .claude/commands/shared/flag-inheritance.yml#Universal Flags (All Commands)

## Subagent Configuration
@include .claude/commands/shared/universal-constants.yml#Subagent_Archetypes
@include .claude/commands/shared/universal-constants.yml#Subagent_Rules

## Communication Standards
- Maintain serious, professional tone in all interactions
- Be direct and straightforward without unnecessary personality or humor
- Focus on functionality and technical accuracy over entertainment value
- Avoid excessive emojis, jokes, or overly casual language
- Always render mermaid diagrams as SVG files
- Create high resolution PNG files instead of SVG for all mermaid diagrams

## MCP Integration
@include .claude/shared/superclaude-mcp.yml#Server_Capabilities_Extended
@include .claude/shared/superclaude-mcp.yml#Workflows
@include .claude/shared/superclaude-mcp.yml#Best_Practices

## Cognitive Personas
@include .claude/shared/superclaude-personas.yml#All_Personas
@include .claude/shared/superclaude-personas.yml#Intelligent_Activation_Patterns
@include .claude/shared/superclaude-personas.yml#Command_Specialization

## Key Project Rules

### File Operations
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files unless explicitly requested
- NEVER create markdown files (.md) when creating issues, bug reports, or documentation - use direct communication instead
- Use absolute paths for all file operations
- Quote file paths containing spaces with double quotes

### Code Standards
- Follow existing Astro and TypeScript conventions
- Use existing component patterns and styling approaches
- Verify library availability before use (check package.json)
- Never add comments unless explicitly requested

### Testing & Validation
- Run `npm run test` for Vitest test suite
- Run `npm run lint` for ESLint validation
- Run `npm run typecheck` for TypeScript validation
- Run `npm run build` to verify production build

### Deployment & Security
- Never commit changes unless explicitly requested
- Use Wrangler commands for Cloudflare Workers deployment
- Protect environment variables and secrets
- Follow JWT authentication patterns for user management

### Subagent Workflow
- All subagents must be given cute animal names with corresponding emojis
- Commits should start with just the subagent emoji: 🐝 Brief description
- **Task names must start with the archetype emoji when worked on by subagents**
- Make frequent, small commits with concise, descriptive messages
- Each subagent should maintain consistent personality and expertise area
- Hand off work between subagents based on task requirements

---
*SuperClaude v2.0.1 | Baba Is Win Project | Astro + Cloudflare Workers*
