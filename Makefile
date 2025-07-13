.PHONY: astro dev dev-clean dev-restart check-db kill-servers migrate-db
.PHONY: users count info delete test-user find logout recent active cleanup stats
.PHONY: users-list-prod sessions-cleanup-prod db-stats-prod
.PHONY: help help-admin content branch-cleanup

# Development Commands
# ====================

# Start Astro dev server with hot reload
astro:
	npm run dev:astro

# Start Wrangler dev server (production-like)
dev:
	npm run dev

# Kill all running dev servers
kill-servers:
	@echo "Killing all dev server processes..."
	@pkill -f "wrangler" || true
	@pkill -f "workerd" || true
	@pkill -f "astro" || true
	@sleep 2

# Check if database tables exist
check-db:
	@echo "Checking database tables..."
	npx wrangler d1 execute baba-is-win-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"

# Apply database migrations
migrate-db:
	@echo "Applying database migrations..."
	npx wrangler d1 migrations apply baba-is-win-db --local

# Clean restart: kill servers, check db, start fresh
dev-restart: kill-servers check-db
	@echo "Starting fresh dev server..."
	npm run dev

# Full clean restart with migrations
dev-clean: kill-servers migrate-db check-db
	@echo "Starting fresh dev server with clean database..."
	npm run dev



# Open Content Creator interface
content:
	@echo "🖋️  Opening Content Creator interface..."
	@open content-interface/index.html



# User Management Commands
# ========================

# List all users (simple)  
users:
	@echo "👥 All Users:"
	@echo "============="
	@printf "%-30s %-15s %s\n" "EMAIL" "USERNAME" "CREATED"
	@printf "%-30s %-15s %s\n" "-----" "--------" "-------"
	@npx wrangler d1 execute baba-is-win-db --local --json --command="SELECT email, username, created_at FROM users ORDER BY created_at DESC;" | jq -r '.[] | .results[] | "\(.email) \(.username) \(.created_at | tonumber / 1000 | strftime("%Y-%m-%d %H:%M"))"' | awk '{printf "%-30s %-15s %s\n", $$1, $$2, $$3}' 2>/dev/null || echo "No users found"

# Count users
count:
	@printf "👥 Total users: "
	@npx wrangler d1 execute baba-is-win-db --local --json --command="SELECT COUNT(*) as count FROM users;" | jq -r '.[] | .results[] | .count' 2>/dev/null || echo "0"

# Show user info
info:
	@test -n "$(EMAIL)" || (echo "❌ Usage: make info EMAIL=user@example.com" && exit 1)
	@echo "🔍 User Details:"
	@echo "==============="
	@npx wrangler d1 execute baba-is-win-db --local --json --command="SELECT email, username, created_at, email_blog_updates, email_thought_updates, email_announcements FROM users WHERE email = '$(EMAIL)';" | jq -r '.[] | .results[] | if . then "Email: \(.email)\nUsername: \(.username)\nCreated: \(.created_at | tonumber / 1000 | strftime("%Y-%m-%d %H:%M"))\nBlog Updates: \(if .email_blog_updates == 1 then "Yes" else "No" end)\nThought Updates: \(if .email_thought_updates == 1 then "Yes" else "No" end)\nAnnouncements: \(if .email_announcements == 1 then "Yes" else "No" end)" else empty end' 2>/dev/null || echo "❌ User not found"

# Delete user
delete:
	@test -n "$(EMAIL)" || (echo "❌ Usage: make delete EMAIL=user@example.com" && exit 1)
	@echo "🗑️  Delete user: $(EMAIL)"
	@echo "⚠️  This permanently deletes the user and all their data!"
	@echo -n "Type 'DELETE' to confirm: " && read confirm && [ "$$confirm" = "DELETE" ] || (echo "❌ Cancelled" && exit 1)
	@npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM users WHERE email = '$(EMAIL)';" > /dev/null
	@echo "✅ User deleted"

# Create test user
test-user:
	@echo "🧪 Creating test user..."
	@curl -s -X POST http://localhost:8787/api/auth/signup \
		-H "Content-Type: application/json" \
		-d '{"email":"test@example.com","username":"testuser","password":"testpass123","emailBlogUpdates":false,"emailThoughtUpdates":false,"emailAnnouncements":false}' \
		| grep -q '"user"' && echo "✅ Test user created (test@example.com / testuser / testpass123)" || echo "❌ Failed to create test user"

# Search users by username or email
find:
	@test -n "$(Q)" || (echo "❌ Usage: make find Q=search_term" && exit 1)
	@echo "🔍 Search results for '$(Q)':"
	@echo "=============================="
	@printf "%-30s %-15s\n" "EMAIL" "USERNAME"
	@printf "%-30s %-15s\n" "-----" "--------"
	@npx wrangler d1 execute baba-is-win-db --local --json --command="SELECT email, username FROM users WHERE email LIKE '%$(Q)%' OR username LIKE '%$(Q)%' ORDER BY created_at DESC;" | jq -r '.[] | .results[] | "\(.email) \(.username)"' | awk '{printf "%-30s %-15s\n", $$1, $$2}' 2>/dev/null || echo "No users found"

# Logout user (clear their sessions)
logout:
	@test -n "$(EMAIL)" || (echo "❌ Usage: make logout EMAIL=user@example.com" && exit 1)
	@echo "🚪 Logging out user: $(EMAIL)"
	@npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = '$(EMAIL)');" > /dev/null
	@echo "✅ User logged out"

# Show recent registrations
recent:
	@echo "📅 Recent Registrations (last 10):"
	@echo "=================================="
	@printf "%-30s %-15s %s\n" "EMAIL" "USERNAME" "CREATED"
	@printf "%-30s %-15s %s\n" "-----" "--------" "-------"
	@npx wrangler d1 execute baba-is-win-db --local --json --command="SELECT email, username, created_at FROM users ORDER BY created_at DESC LIMIT 10;" | jq -r '.[] | .results[] | "\(.email) \(.username) \(.created_at | tonumber / 1000 | strftime("%Y-%m-%d %H:%M"))"' | awk '{printf "%-30s %-15s %s\n", $$1, $$2, $$3}' 2>/dev/null || echo "No recent registrations"

# Show active sessions
active:
	@echo "🔑 Active Sessions:"
	@echo "=================="
	@printf "%-30s %-15s %s\n" "EMAIL" "USERNAME" "EXPIRES"
	@printf "%-30s %-15s %s\n" "-----" "--------" "-------"
	@npx wrangler d1 execute baba-is-win-db --local --json --command="SELECT u.email, u.username, s.expires_at FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.expires_at > unixepoch() ORDER BY s.expires_at DESC;" | jq -r '.[] | .results[] | "\(.email) \(.username) \(.expires_at | tonumber / 1000 | strftime("%Y-%m-%d %H:%M"))"' | awk '{printf "%-30s %-15s %s\n", $$1, $$2, $$3}' 2>/dev/null || echo "No active sessions"

# Clean up expired sessions
cleanup:
	@echo "🧹 Cleaning expired sessions..."
	@npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE expires_at <= unixepoch();" > /dev/null
	@echo "✅ Cleanup complete"

# Show quick stats
stats:
	@echo "📊 Quick Stats:"
	@echo "=============="
	@echo -n "Total users: "
	@npx wrangler d1 execute baba-is-win-db --local --command="SELECT COUNT(*) FROM users;" 2>/dev/null | grep -E '^[0-9]+$$' || echo "0"
	@echo -n "Active sessions: "
	@npx wrangler d1 execute baba-is-win-db --local --command="SELECT COUNT(*) FROM sessions WHERE expires_at > unixepoch();" 2>/dev/null | grep -E '^[0-9]+$$' || echo "0"
	@echo -n "Blog subscribers: "
	@npx wrangler d1 execute baba-is-win-db --local --command="SELECT COUNT(*) FROM users WHERE email_blog_updates = 1;" 2>/dev/null | grep -E '^[0-9]+$$' || echo "0"

# Session Management Commands
# ===========================

# View active sessions
sessions-active:
	@echo "🔑 Listing active sessions..."
	npx wrangler d1 execute baba-is-win-db --local --command="SELECT s.id, s.user_id, u.username, u.email, datetime(s.expires_at, 'unixepoch') as expires_at, datetime(s.created_at, 'unixepoch') as created_at FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.expires_at > unixepoch() ORDER BY s.created_at DESC;"

# Clear expired sessions
sessions-cleanup:
	@echo "🧹 Cleaning up expired sessions..."
	npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE expires_at <= unixepoch();"
	@echo "✅ Expired sessions cleaned up"

# Force logout user (requires EMAIL variable)
sessions-force-logout:
	@echo "🚪 Force logging out user $(EMAIL)..."
	@test -n "$(EMAIL)" || (echo "❌ Usage: make sessions-force-logout EMAIL=user@example.com" && exit 1)
	npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = '$(EMAIL)');"
	@echo "✅ User logged out successfully"

# Database Statistics & Maintenance
# ==================================

# Show database statistics
db-stats:
	@echo "📊 Database Statistics:"
	@echo
	@echo "Table Sizes:"
	npx wrangler d1 execute baba-is-win-db --local --command="SELECT 'users' as table_name, COUNT(*) as row_count FROM users UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles;"
	@echo
	@echo "Active Sessions:"
	npx wrangler d1 execute baba-is-win-db --local --command="SELECT COUNT(*) as active_sessions FROM sessions WHERE expires_at > unixepoch();"
	@echo
	@echo "Email Preferences:"
	npx wrangler d1 execute baba-is-win-db --local --command="SELECT SUM(CASE WHEN email_blog_updates = 1 THEN 1 ELSE 0 END) as blog_subscribers, SUM(CASE WHEN email_thought_updates = 1 THEN 1 ELSE 0 END) as thought_subscribers, SUM(CASE WHEN email_announcements = 1 THEN 1 ELSE 0 END) as announcement_subscribers, COUNT(*) as total_users FROM users;"

# Clean up old data
db-cleanup:
	@echo "🧹 Cleaning up old database data..."
	@echo "Removing expired sessions..."
	npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE expires_at <= unixepoch() - (7 * 24 * 60 * 60);"
	@echo "✅ Database cleanup completed"

# Production Database Commands
# =============================

# Production user list (requires PROD=true)
users-list-prod:
	@test "$(PROD)" = "true" || (echo "❌ Usage: make users-list-prod PROD=true" && exit 1)
	@echo "📋 Listing production users..."
	npx wrangler d1 execute baba-is-win-db --remote --command="SELECT id, email, username, datetime(created_at, 'unixepoch') as created_at FROM users ORDER BY created_at DESC LIMIT 10;"

# Production session cleanup (requires PROD=true)
sessions-cleanup-prod:
	@test "$(PROD)" = "true" || (echo "❌ Usage: make sessions-cleanup-prod PROD=true" && exit 1)
	@echo "🧹 Cleaning up production expired sessions..."
	npx wrangler d1 execute baba-is-win-db --remote --command="DELETE FROM sessions WHERE expires_at <= unixepoch();"

# Production database stats (requires PROD=true)
db-stats-prod:
	@test "$(PROD)" = "true" || (echo "❌ Usage: make db-stats-prod PROD=true" && exit 1)
	@echo "📊 Production Database Statistics:"
	npx wrangler d1 execute baba-is-win-db --remote --command="SELECT 'users' as table_name, COUNT(*) as row_count FROM users UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles;"

# Git Management
# ===============

# Clean up branches and worktrees without open pull requests
branch-cleanup:
	@echo "🌿 Cleaning up branches, worktrees, and remotes without open pull requests..."
	@echo "⚠️  This will delete local branches, remote branches, and worktrees that don't have open PRs!"
	@echo -n "Type 'CLEANUP' to confirm: " && read confirm && [ "$$confirm" = "CLEANUP" ] || (echo "❌ Cancelled" && exit 1)
	@echo "Fetching latest changes..."
	@git fetch --all --prune
	@echo "Getting list of branches with open PRs..."
	@BRANCHES_WITH_PRS=$$(gh pr list --state open --json headRefName --jq '.[].headRefName' 2>/dev/null | sort | uniq); \
	ALL_LOCAL_BRANCHES=$$(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v '^main$$' | grep -v '^master$$'); \
	ALL_REMOTE_BRANCHES=$$(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | sed 's|^origin/||' | grep -v '^main$$' | grep -v '^master$$' | grep -v '^HEAD$$'); \
	ALL_WORKTREES=$$(git worktree list --porcelain | grep '^worktree ' | sed 's/^worktree //' | grep 'worktrees/' | xargs -I {} basename {}); \
	echo "🔍 Checking worktrees..."; \
	for worktree in $$ALL_WORKTREES; do \
		if ! echo "$$BRANCHES_WITH_PRS" | grep -q "^$$worktree$$"; then \
			echo "  🗑️  Removing worktree: $$worktree"; \
			git worktree remove "worktrees/$$worktree" --force 2>/dev/null || true; \
		else \
			echo "  ✅ Keeping worktree: $$worktree (has open PR)"; \
		fi; \
	done; \
	echo "🔍 Checking local branches..."; \
	for branch in $$ALL_LOCAL_BRANCHES; do \
		if ! echo "$$BRANCHES_WITH_PRS" | grep -q "^$$branch$$"; then \
			echo "  🗑️  Deleting local branch: $$branch"; \
			git branch -D "$$branch" 2>/dev/null || true; \
		else \
			echo "  ✅ Keeping local branch: $$branch (has open PR)"; \
		fi; \
	done; \
	echo "🔍 Checking remote branches..."; \
	for branch in $$ALL_REMOTE_BRANCHES; do \
		if ! echo "$$BRANCHES_WITH_PRS" | grep -q "^$$branch$$"; then \
			echo "  🗑️  Deleting remote branch: $$branch"; \
			git push origin --delete "$$branch" 2>/dev/null || true; \
		else \
			echo "  ✅ Keeping remote branch: $$branch (has open PR)"; \
		fi; \
	done; \
	echo "✅ Branch and worktree cleanup completed!"

# Help & Documentation
# =====================

# Show user management help (simple commands)
help:
	@echo "🛠️  User Management Commands"
	@echo "============================"
	@echo
	@echo "📋 View Users:"
	@echo "  make users              - List all users"
	@echo "  make count              - Count total users"
	@echo "  make recent             - Show recent registrations"
	@echo "  make active             - Show active sessions"
	@echo "  make stats              - Quick statistics"
	@echo
	@echo "🔍 Find & Inspect:"
	@echo "  make find Q=term        - Search users by email/username"
	@echo "  make info EMAIL=...     - Get detailed user info"
	@echo
	@echo "✏️  Manage Users:"
	@echo "  make test-user          - Create test user"
	@echo "  make logout EMAIL=...   - Force logout user"
	@echo "  make delete EMAIL=...   - Delete user (requires typing DELETE)"
	@echo
	@echo "💭 Content:"
	@echo "  make content            - Open Content Creator interface"
	@echo
	@echo "🧹 Maintenance:"
	@echo "  make cleanup            - Remove expired sessions"
	@echo "  make dev-clean          - Restart with fresh database"
	@echo "  make branch-cleanup     - Delete branches & worktrees without open PRs"
	@echo
	@echo "💡 Examples:"
	@echo "  make find Q=test"
	@echo "  make info EMAIL=test@example.com"
	@echo "  make delete EMAIL=spam@example.com"
	@echo "  make content            - Open Content Creator interface"

# Show all admin commands (detailed)
help-admin:
	@echo "🛠️  Complete Admin Commands"
	@echo "============================"
	@echo
	@echo "📖 Development:"
	@echo "  make dev-clean          - Clean restart with database migrations"
	@echo "  make dev-restart        - Restart dev server"
	@echo "  make migrate-db         - Apply database migrations"
	@echo "  make check-db           - Check database tables"
	@echo
	@echo "👥 User Management (Simple):"
	@echo "  make users              - List all users"
	@echo "  make count              - Count users"
	@echo "  make info EMAIL=...     - User details"
	@echo "  make find Q=...         - Search users"
	@echo "  make delete EMAIL=...   - Delete user"
	@echo "  make test-user          - Create test user"
	@echo "  make logout EMAIL=...   - Force logout"
	@echo "  make recent             - Recent registrations"
	@echo "  make active             - Active sessions"
	@echo "  make stats              - Quick stats"
	@echo "  make cleanup            - Clean expired sessions"
	@echo
	@echo "🌿 Git Management:"
	@echo "  make branch-cleanup     - Delete branches & worktrees without open PRs"
	@echo
	@echo "🌐 Production (requires PROD=true):"
	@echo "  make users-list-prod PROD=true"
	@echo "  make sessions-cleanup-prod PROD=true"
	@echo "  make db-stats-prod PROD=true"
	@echo
	@echo "📚 Documentation:"
	@echo "  See docs/authentication.md for detailed information"