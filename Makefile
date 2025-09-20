.PHONY: astro dev help deploy build-deploy

# Development Commands
# ====================

# Start dev server with remote D1 database (for testing authenticated behavior)
dev:
	@echo "🚀 Starting dev server with remote D1 database..."
	@echo "   Database: baba-is-win-db (production)"
	@echo "   URL: http://localhost:4321"
	@echo ""
	@# Check if port 4321 is in use and kill if necessary
	@if lsof -i :4321 > /dev/null 2>&1; then \
		echo "⚠️  Port 4321 is already in use. Killing existing process..."; \
		lsof -ti :4321 | xargs kill -9 2>/dev/null || true; \
		sleep 1; \
		echo "✅ Port 4321 cleared"; \
	fi
	@echo "Building Astro project..."
	@npm run build
	@echo "Starting Wrangler dev server with remote database..."
	@npx wrangler dev --port 4321 --remote

# Start Astro dev server with hot reload (local database)
astro:
	npm run dev:astro

# Deploy to Cloudflare Workers
deploy:
	npm run deploy

# Build and deploy to Cloudflare Workers
build-deploy:
	@echo "🏗️  Building project..."
	npm run build
	@echo "🚀 Deploying to Cloudflare Workers..."
	npm run deploy
	@echo "✅ Build and deploy complete!"

# Show available commands
help:
	@echo "Available commands:"
	@echo "  make dev           - Start dev server with remote D1 database"
	@echo "  make astro         - Start Astro dev server with hot reload (local DB)"
	@echo "  make deploy        - Deploy to Cloudflare Workers"
	@echo "  make build-deploy  - Build and deploy to Cloudflare Workers"
	@echo "  make help          - Show this help message"