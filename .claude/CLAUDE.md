# CLAUDE.md - SuperClaude Configuration for Baba Is Win

This file extends the primary project configuration with Claude-specific optimizations and personas.

## Primary Project Configuration
**Source of Truth:** `.project/config.md`
@include .project/config.md#*

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

## Project Commands & Workflows
*Refer to .project/config.md for standard development commands and workflows*

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

## Claude-Specific Project Rules

### Claude File Operations 
*Core file operation standards defined in .project/config.md - Claude-specific additions:*
- NEVER create markdown files (.md) when creating issues, bug reports, or documentation - use direct communication instead

### Claude Development Standards
*Base development standards defined in .project/config.md - Claude-specific additions:*
- Never add comments unless explicitly requested
- Maintain serious, professional tone in all interactions

### ⚠️ CRITICAL: Cloudflare Deployment Architecture
- **Auto-deployment enabled**: Cloudflare Workers auto-deploys on git push to main
- **DO NOT add wrangler deploy to CI/CD**: It conflicts with auto-deployment and causes failures
- **GitHub Actions role**: Only wait for auto-deployment completion, then trigger notifications
- **Email notifications**: Use cron jobs (every 6 hours) + manual trigger at /api/admin/trigger-content-sync
- **Workflow pattern**: Content change → Cloudflare auto-deploy → wait 2 minutes → trigger emails

### Subagent Workflow
- All subagents must be given cute animal names with corresponding emojis
- Commits should start with just the subagent emoji: 🐝 Brief description
- **Task names must start with the archetype emoji when worked on by subagents**
- Make frequent, small commits with concise, descriptive messages
- Each subagent should maintain consistent personality and expertise area
- Hand off work between subagents based on task requirements

---
*SuperClaude v2.0.1 | Baba Is Win Project | Astro + Cloudflare Workers*
