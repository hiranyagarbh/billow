#!/bin/bash
# ============================================
# Billow — Git Commit History Scaffolder
# ============================================
# This script stages and commits the files in
# logical phases to build a realistic git history.

echo "🏁 Building logical git history for Billow..."

# Check if user email/name are set, if not configure local placeholders
if [ -z "$(git config user.email)" ]; then
  git config --local user.email "hiranya@example.com"
  git config --local user.name "Hiranyagarbh Singh Choudhary"
fi

# Step 1: Base Configurations & Documentation
git add .gitignore LICENSE README.md docker-compose.yml .env.example
git commit -m "feat: initialize project configuration, Docker, and README"

# Step 2: Collector Ingestion & Database Templates
git add lambda/ scripts/
git commit -m "feat(infra): add AWS Lambda cost collector, SAM templates, and DB seed scripts"

# Step 3: Backend configuration and packages configuration
git add server/package.json server/tsconfig.json server/.env.example
git commit -m "chore(backend): configure TypeScript and dependencies for API server"

# Step 4: Backend central configs and models
git add server/src/config/ server/src/types/ server/src/utils/
git commit -m "feat(backend): implement configuration loading, DynamoDB client, and regression forecasting"

# Step 5: Backend service routes and main entry
git add server/src/services/ server/src/routes/ server/src/middleware/ server/src/index.ts
git commit -m "feat(backend): implement routes and services for cost metrics, budget limits, and mock data"

# Step 6: Frontend dev configurations & styles
git add client/package.json client/tsconfig.json client/index.html client/src/index.css
git commit -m "feat(frontend): configure Vite client and establish AWS Console UI theme"

# Step 7: Frontend API modules and hooks
git add client/src/types/ client/src/utils/ client/src/hooks/
git commit -m "feat(frontend): implement API wrappers, formatting utils, and custom data-fetching hooks"

# Step 8: Frontend layout pages and component views
git add client/src/components/ client/src/App.tsx client/src/main.tsx client/src/App.css
git commit -m "feat(frontend): build modular UI views for dashboard, service tables, and budget configurator"

echo ""
echo "🎉 Git history successfully created! Run 'git log --oneline' to view."
