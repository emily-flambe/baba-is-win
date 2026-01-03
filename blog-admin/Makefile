.PHONY: help dev build sync android android-build clean install

help:
	@echo "blog-admin development commands:"
	@echo ""
	@echo "  make dev           Start Vite dev server (port 5173)"
	@echo "  make build         Build web app for production"
	@echo "  make sync          Build and sync to Capacitor platforms"
	@echo "  make android       Open Android project in Android Studio"
	@echo "  make android-build Build debug APK locally"
	@echo "  make clean         Remove build artifacts"
	@echo "  make install       Install npm dependencies"
	@echo ""
	@echo "Note: Dev server proxies API calls to localhost:4321 (Astro)"

dev:
	npm run dev

build:
	npm run build

sync:
	npm run cap:sync

android:
	npm run cap:open

android-build:
	npm run build
	npx cap sync android
	cd android && ./gradlew assembleDebug
	@echo ""
	@echo "APK built at: android/app/build/outputs/apk/debug/app-debug.apk"

clean:
	rm -rf dist
	rm -rf android/app/build
	rm -rf node_modules/.vite

install:
	npm install
