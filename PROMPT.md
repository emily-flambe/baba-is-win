# Google OAuth Implementation Prompt

## Context and Overview

I need you to implement Google OAuth authentication for the Baba Is Win application by reading our comprehensive planning documentation and executing the implementation in structured phases using subagents. The application currently has a robust JWT-based authentication system with Cloudflare Workers, D1 database, and Astro frontend that we need to extend with Google OAuth support.

## Planning Documentation Location

All comprehensive planning documents are located in:
```
worktrees/feature-google-oauth/docs/planning/oauth/
```

**Required Reading for Implementation:**
1. `setup-instructions.md` - Prerequisites and configuration (already completed)
2. `technical-spec.md` - Complete implementation guide with all code examples
3. `api-design.md` - Detailed API endpoint specifications and integration patterns
4. `security-architecture.md` - Security patterns and threat mitigation strategies
5. `testing-strategy.md` - Comprehensive testing approach for all scenarios
6. `README.md` - Overview document tying everything together

## Current State Analysis

**Already Completed:**
- Google Cloud Console OAuth client configured
- OAuth credentials available as Wrangler secrets
- Dependencies installed (`googleapis@^140.0.1`, `jose@^5.10.0`)
- JWT_SECRET configured and working
- Existing authentication system functional
- Comprehensive planning documentation created

**Environment Setup:**
- OAuth credentials stored in Wrangler secrets (production)
- `.env` file needed for development
- Database: Cloudflare D1 (`baba-is-win-db`)
- Current JWT secret: Available in `wrangler.json`

## Implementation Requirements

**Core Objectives:**
- Extend existing authentication to support Google OAuth alongside email/password
- Maintain backward compatibility with current users
- Implement secure OAuth flow with proper state management
- Add account linking functionality
- Comprehensive error handling and security measures

**Architecture Decisions:**
- Hybrid authentication (email/password + OAuth)
- Same JWT session system for all users
- Account linking capability
- Separate OAuth client for Gmail API (already exists)

## Phase-Based Implementation Plan

### Phase 1: Database Schema and Core Services
**Spawn Agent Task:**
"Read `technical-spec.md` sections on database schema and service implementation. Execute database migrations to add OAuth fields to users table. Implement core OAuth services including GoogleOAuthService, OAuthStateManager, and UserManager extensions. Focus on the foundational infrastructure without API endpoints."

**Deliverables:**
- Database schema updated with OAuth fields
- OAuth service classes implemented
- State token management system
- User management extensions for OAuth
- Error handling framework

### Phase 2: API Endpoints Implementation  
**Spawn Agent Task:**
"Read `api-design.md` and `technical-spec.md` API endpoint sections. Implement OAuth API endpoints: `/api/auth/google` (initiation), `/api/auth/google/callback` (handling), `/api/auth/google/status` (status check). Follow the exact specifications for request/response handling, error management, and security validation."

**Deliverables:**
- OAuth initiation endpoint
- OAuth callback endpoint with full flow handling
- OAuth status endpoint
- Rate limiting implementation
- Security headers and validation

### Phase 3: Frontend Integration
**Spawn Agent Task:**
"Read `technical-spec.md` frontend sections and `api-design.md` client examples. Create OAuth button component, update login/signup pages, enhance profile page with account linking. Implement proper error handling UI and success flows. Ensure responsive design and accessibility."

**Deliverables:**
- GoogleOAuthButton component
- Updated login/signup pages
- Enhanced profile page with linking
- Error handling UI
- Success/redirect flows

### Phase 4: Security Implementation and Testing
**Spawn Agent Task:**
"Read `security-architecture.md` and `testing-strategy.md` thoroughly. Implement all security measures including input validation, rate limiting, token security, and monitoring. Create comprehensive test suite covering unit tests, integration tests, and security tests."

**Deliverables:**
- Security validation and rate limiting
- Input sanitization and validation
- Comprehensive test suite
- Security monitoring
- Performance optimization

### Phase 5: Integration Testing and Deployment Preparation
**Spawn Agent Task:**
"Read all planning documents for deployment considerations. Perform end-to-end integration testing, ensure production readiness, verify security measures, test account linking scenarios, and prepare deployment documentation. Validate all OAuth flows work correctly."

**Deliverables:**
- End-to-end testing complete
- Production deployment ready
- Security audit passed
- Documentation updated
- Performance validated

## Implementation Guidelines

**Code Quality Standards:**
- Follow existing codebase patterns and conventions
- Use TypeScript with proper typing
- Implement comprehensive error handling
- Add proper logging and monitoring
- Follow security best practices from planning docs

**Testing Requirements:**
- Unit tests for all services and utilities
- Integration tests for API endpoints
- Security tests for OAuth flows
- End-to-end tests for user journeys
- Performance tests for concurrent usage

**Security Priorities:**
- State token cryptographic signing
- ID token validation with Google's public keys
- Proper session management and regeneration
- Rate limiting with burst protection
- Input validation and sanitization
- CSRF and replay attack prevention

## Environment and Configuration

**Development Setup:**
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/google/callback
JWT_SECRET=4wMCazSNE46y8A0hfPiZGuzj8MIr6tLn8A4ThokesBg=
```

**Database Configuration:**
- Database: `baba-is-win-db` (Cloudflare D1)
- Existing users table needs OAuth field additions
- Sessions table already exists and functional

**Production Secrets:**
- All secrets already configured via `wrangler secret put`
- OAuth credentials ready for production use
- JWT_SECRET already configured

## Critical Implementation Notes

**Existing System Integration:**
- Preserve all existing authentication functionality
- Use same JWT session system for OAuth users
- Maintain existing middleware and auth patterns
- Keep Gmail OAuth separate (already implemented)

**Security Requirements:**
- Implement ALL security measures from `security-architecture.md`
- Follow OAuth 2.0 and OpenID Connect best practices
- Validate all user inputs and state tokens
- Implement proper rate limiting and monitoring

**Error Handling:**
- Graceful degradation for OAuth failures
- Clear user-facing error messages
- Comprehensive logging for debugging
- Fallback to existing auth methods

## Success Criteria

**Functional Requirements:**
- New users can sign up via Google OAuth
- Existing OAuth users can sign in seamlessly
- Users can link Google accounts to existing accounts
- All existing authentication continues working
- Proper error handling and user feedback

**Security Requirements:**
- No security vulnerabilities introduced
- Proper token validation and management
- Rate limiting prevents abuse
- State tokens prevent CSRF attacks
- All sensitive data properly protected

**Performance Requirements:**
- OAuth flow completes within 2 seconds
- No degradation to existing auth performance
- Handles concurrent OAuth requests efficiently
- Database queries optimized with proper indexes

## Execution Instructions

1. **Read ALL planning documents** before starting any implementation
2. **Execute phases sequentially** - do not skip ahead
3. **Test thoroughly** after each phase
4. **Follow security guidelines** religiously
5. **Maintain existing functionality** throughout implementation
6. **Document any deviations** from planning specs
7. **Validate integration** at each phase boundary

## Final Validation

Before considering implementation complete:
- [ ] All OAuth flows work end-to-end
- [ ] Existing authentication unaffected
- [ ] Security measures fully implemented
- [ ] Test suite passes completely
- [ ] Performance meets requirements
- [ ] Documentation updated
- [ ] Production deployment tested

Use this prompt to coordinate multiple subagents working on different phases while ensuring comprehensive implementation following our detailed planning specifications.