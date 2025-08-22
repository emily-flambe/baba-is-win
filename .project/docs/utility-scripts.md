# Utility Scripts

Helper scripts for project maintenance and development setup.

## Available Scripts

All scripts are in `.project/docs/scripts/` and can be run with Node.js.

### health-check.js
```bash
node .project/docs/scripts/health-check.js [--quick] [--fix] [--verbose]
```
Performs comprehensive health checks on the project.

### setup-dev-env.js
```bash
node .project/docs/scripts/setup-dev-env.js [--force] [--dry-run]
```
Automates local development environment setup.

### env-validator.js
```bash
node .project/docs/scripts/env-validator.js [--fix] [--strict]
```
Validates environment configurations.

### package-manager.js
```bash
node .project/docs/scripts/package-manager.js [command] [--fix] [--force]
```
Manages dependencies and security updates.

### update-context.js
```bash
node .project/docs/scripts/update-context.js [--dry-run]
```
Keeps context files synchronized with project state.

## Quick Start

For new development setup:
```bash
node .project/docs/scripts/setup-dev-env.js
node .project/docs/scripts/env-validator.js --verbose
node .project/docs/scripts/health-check.js
```

For ongoing maintenance:
```bash
node .project/docs/scripts/health-check.js --quick
node .project/docs/scripts/package-manager.js audit
```

## Note
These scripts are development utilities and are not part of the main application code.