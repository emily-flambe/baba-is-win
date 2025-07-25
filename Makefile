.PHONY: astro help deploy build-deploy

# Development Commands
# ====================

# Start Astro dev server with hot reload
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
	@echo "  make astro         - Start Astro dev server with hot reload"
	@echo "  make deploy        - Deploy to Cloudflare Workers"
	@echo "  make build-deploy  - Build and deploy to Cloudflare Workers"
	@echo "  make help          - Show this help message"