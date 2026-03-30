---
name: deployment-cicd
description: "🚀 Expert Déploiement & CI/CD. S'active automatiquement pour les tâches de déploiement, build, production, GitHub Actions, Vercel, Cloud Run, Turborepo. Couvre Convex Deploy, Docker, workflows CI/CD, environment management, rollback, monitoring, et multi-project coordination."
---

# 🚀 Skill : Deployment & CI/CD Expert

## Auto-Activation
Ce skill s'active quand :
- La requête mentionne : deploy, déployer, build, production, CI/CD, GitHub Actions, Vercel, Cloud Run, Docker, rollback, monitoring, secret, pipeline
- Un fichier `.github/workflows/` est créé ou modifié
- Un `Dockerfile` ou `docker-compose.yml` est impliqué

---

## Matrice de Déploiement OkaTech

| Projet | Frontend | Backend | Infrastructure | CI/CD |
|---|---|---|---|---|
| `digitalium.io` | Vercel | Convex Cloud | Auto | GitHub Actions |
| `evenement.ga` | Vercel | Convex + Prisma | Auto | GitHub Actions |
| `foot.cd` | Vercel | Convex Cloud | Auto | GitHub Actions |
| `consulat.ga` | Vercel | Convex Cloud | Auto | GitHub Actions |
| `idetude.ga` | Custom/VPS | Express + Convex | VPS/Custom | Manual/Deploy scripts |
| `mairie.ga` | Vercel | Supabase Cloud | Auto | GitHub Actions |
| `sgg.ga` | Custom/VPS | Express + Redis | OVH/VPS | Manual/PM2 |
| `secretariat-general-gouv` | Custom | Docker/Cloud Run | GCP | GitHub Actions |
| `AGASA-Pro` | Vercel | Convex + GCP CloudSQL | Cloud Run | GitHub Actions (Turborepo) |
| `AGASA-Admin` | Vercel | Convex | Cloud Run | GitHub Actions (Turborepo) |
| `AGASA-Core` | Vercel | Convex | Cloud Run | GitHub Actions (Turborepo) |
| `AGASA-Citoyen` | Vercel | Convex | Cloud Run | GitHub Actions (Turborepo) |
| `AGASA-Inspect` | Vercel | Convex | Cloud Run | GitHub Actions (Turborepo) |

---

## Workflow GitHub Actions Standard (Vercel + Convex)

### Build & Deploy Next.js + Convex
```yaml
# .github/workflows/deploy-prod.yml
name: Deploy Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: "20"

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test
        env:
          NODE_ENV: test

  deploy-backend:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Deploy Convex Backend
        run: npx convex deploy
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

      - name: Capture Convex URL
        id: convex
        run: |
          CONVEX_URL=$(npx convex url)
          echo "CONVEX_URL=$CONVEX_URL" >> $GITHUB_OUTPUT

  deploy-frontend:
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build Frontend
        run: npm run build
        env:
          NEXT_PUBLIC_CONVEX_URL: ${{ needs.deploy-backend.outputs.CONVEX_URL }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
        env:
          NEXT_PUBLIC_CONVEX_URL: ${{ needs.deploy-backend.outputs.CONVEX_URL }}

      - name: Create GitHub Deployment
        uses: chrnorm/deployment-action@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment: production
          environment_url: https://myapp.vercel.app
          auto_merge: false
```

### Preview Deployments with PR Comments
```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_CONVEX_URL: ${{ secrets.NEXT_PUBLIC_CONVEX_URL }}

      - name: Deploy to Vercel Preview
        id: vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const deploymentUrl = "${{ steps.vercel.outputs.preview-url }}";
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployed to ${deploymentUrl}`
            });
```

---

## Docker + Cloud Run Deployment (AGASA Projects)

### Docker Setup
```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### Cloud Run Deployment Workflow
```yaml
# .github/workflows/deploy-cloud-run.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: europe-west1
  SERVICE_NAME: myapp-production

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for GCR
        run: gcloud auth configure-docker gcr.io

      - name: Build Docker image
        run: |
          docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
            -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
            .

      - name: Push to Google Container Registry
        run: |
          docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA
          docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
            --region $REGION \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars CONVEX_DEPLOY_KEY=${{ secrets.CONVEX_DEPLOY_KEY }}

      - name: Get Cloud Run URL
        id: deploy
        run: |
          URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')
          echo "url=$URL" >> $GITHUB_OUTPUT

      - name: Run Health Check
        run: |
          for i in {1..30}; do
            if curl -f ${{ steps.deploy.outputs.url }}/health; then
              echo "✓ Health check passed"
              exit 0
            fi
            echo "Attempt $i/30..."
            sleep 2
          done
          exit 1
```

### Docker Compose for Local Development
```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_CONVEX_URL: ${NEXT_PUBLIC_CONVEX_URL}
      CONVEX_DEPLOY_KEY: ${CONVEX_DEPLOY_KEY}
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Turborepo CI/CD (Multi-Project AGASA)

### Turborepo Monorepo Structure
```
agasa-monorepo/
├── apps/
│   ├── admin/
│   ├── core/
│   ├── pro/
│   ├── citoyen/
│   └── inspect/
├── packages/
│   ├── ui/
│   ├── utils/
│   └── convex/
├── turbo.json
├── package.json
└── .github/workflows/
```

### Turbo Build Configuration
```json
{
  "name": "agasa-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "deploy": "turbo run build && npm run deploy:apps"
  },
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "^1.13.0"
  }
}
```

### turbo.json Configuration
```json
{
  "version": "1",
  "tasks": {
    "build": {
      "outputs": [".next/**", "dist/**"],
      "cache": true,
      "dependsOn": ["^build"]
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "test": {
      "outputs": ["coverage/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalDependencies": ["package.json"]
}
```

### Turborepo Deployment Workflow
```yaml
# .github/workflows/turborepo-deploy.yml
name: Turborepo Deploy

on:
  push:
    branches: [main]

jobs:
  setup:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [admin, core, pro, citoyen, inspect]
    outputs:
      affected-apps: ${{ steps.filter.outputs.apps }}

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check affected apps
        id: filter
        run: |
          git diff HEAD~1 --name-only | grep -E "^apps/(${{ matrix.app }}|shared)" || true

  build-and-deploy:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [admin, core, pro, citoyen, inspect]
    if: always()

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build with Turborepo
        run: turbo run build --filter="apps/${{ matrix.app }}"

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_APP_${{ matrix.app }} }}
          vercel-args: "--prod"
          working-directory: apps/${{ matrix.app }}

      - name: Deploy to Cloud Run (Backend)
        if: ${{ matrix.app == 'core' }}
        run: |
          gcloud run deploy agasa-${{ matrix.app }} \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/agasa-${{ matrix.app }}:$GITHUB_SHA \
            --region europe-west1 \
            --platform managed
```

### Turbo Prune for Selective Deployment
```bash
# Install dependencies for specific app only
npx turbo prune --scope=apps/admin

# Build dependencies in dependency order
cd out
npm install
npm run build --scope=apps/admin
```

---

## Convex Deploy Key Management

### Setup Convex Deploy Key
```bash
# 1. Generate key in Convex Dashboard (Project → Settings → Deploy Keys)
# 2. Add to GitHub Secrets as CONVEX_DEPLOY_KEY

# 3. Verify in workflow
npx convex deploy --help
```

### Manual Convex Deployment
```bash
# Deploy with specific environment
npx convex deploy --prod

# Check deployment status
npx convex logs --limit 100

# Export data before major changes
npx convex export --tables "*"

# Import data after schema migration
npx convex import data.jsonl --format jsonl

# Rollback to previous deployment
npx convex deploy --rollback <deployment-id>
```

### Environment-Specific Convex Config
```ts
// convex/environment.ts
export const getEnvironment = () => {
  const env = process.env.CONVEX_ENVIRONMENT || "production";

  return {
    isDev: env === "development",
    isProd: env === "production",
    isStaging: env === "staging",
  };
};

// Use in convex functions
import { getEnvironment } from "./environment";

export const log = mutation({
  handler: async (ctx) => {
    const { isProd } = getEnvironment();

    if (isProd) {
      // Production-only logic
    }
  },
});
```

---

## Environment-Specific Deployments

### Multi-Environment Strategy
```yaml
# .github/workflows/multi-env.yml
name: Deploy Multi-Environment

on:
  push:
    branches: [main, staging, develop]

jobs:
  determine-env:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.name }}
      convex-key: ${{ steps.env.outputs.convex-key }}
    steps:
      - id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "name=production" >> $GITHUB_OUTPUT
            echo "convex-key=${{ secrets.CONVEX_DEPLOY_KEY_PROD }}" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "name=staging" >> $GITHUB_OUTPUT
            echo "convex-key=${{ secrets.CONVEX_DEPLOY_KEY_STAGING }}" >> $GITHUB_OUTPUT
          else
            echo "name=development" >> $GITHUB_OUTPUT
            echo "convex-key=${{ secrets.CONVEX_DEPLOY_KEY_DEV }}" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: determine-env
    runs-on: ubuntu-latest
    environment: ${{ needs.determine-env.outputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Deploy Convex
        run: npx convex deploy
        env:
          CONVEX_DEPLOY_KEY: ${{ needs.determine-env.outputs.convex-key }}

      - name: Deploy Frontend
        run: npm run build
        env:
          NEXT_PUBLIC_ENV: ${{ needs.determine-env.outputs.environment }}
```

### .env File Management
```bash
# vercel env pull .env.local
# This pulls all environment variables from Vercel project

# For local development
cp .env.example .env.local
# Then fill in values

# Deploy specific env vars
vercel env add NEXT_PUBLIC_API_URL --scope production
```

---

## Rollback Strategies

### Vercel Instant Rollback
```bash
# View deployments
vercel deployments list

# Promote previous deployment to production
vercel promote <deployment-id>

# Or via GitHub: go to Vercel Dashboard → Deployments → Promote
```

### Convex Schema Rollback
```bash
# List deployments
npx convex deployments list

# Rollback to specific deployment
npx convex deploy --rollback <deployment-id>

# After rollback, migrate data if needed
npx convex import --table <table-name> data.jsonl
```

### Docker Image Rollback
```bash
# On Cloud Run: go to Revisions → Select previous revision
gcloud run deploy SERVICE_NAME \
  --image gcr.io/PROJECT_ID/SERVICE_NAME:PREVIOUS_SHA \
  --region REGION

# Or via kubectl (if using GKE)
kubectl rollout undo deployment/myapp -n production
```

### Database Rollback (Prisma)
```bash
# View migrations
npx prisma migrate status

# Resolve failed migrations
npx prisma migrate resolve --rolled-back "20240101120000_migration_name"

# After fixing, redeploy
npx prisma migrate deploy
```

---

## Health Check Endpoints

### Next.js Health Check
```ts
// app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  try {
    // Check Convex connectivity
    const convexHealth = await fetch(
      `${process.env.NEXT_PUBLIC_CONVEX_URL}/health`
    ).then(r => r.ok);

    if (!convexHealth) {
      return NextResponse.json(
        { ...health, status: "degraded", convex: "down" },
        { status: 503 }
      );
    }

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Kubernetes Liveness Probe
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: gcr.io/project/app:latest

        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Monitoring & Alerting Setup

### Sentry Error Tracking
```ts
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});
```

### Cloud Monitoring Alerts
```bash
# Create uptime check alert
gcloud monitoring policies create \
  --display-name="Production App Uptime" \
  --condition-display-name="HTTP Status" \
  --condition-threshold-value=1 \
  --condition-threshold-filter='resource.type="uptime_url" AND metric.type="monitoring.googleapis.com/uptime_check/check_passed"' \
  --notification-channels=$CHANNEL_ID
```

### GitHub Actions Email Notification
```yaml
# Send notification on failure
- name: Notify on failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: ${{ secrets.MAIL_SERVER }}
    server_port: ${{ secrets.MAIL_PORT }}
    username: ${{ secrets.MAIL_USERNAME }}
    password: ${{ secrets.MAIL_PASSWORD }}
    subject: "Deploy Failed: ${{ github.repository }}"
    body: "See logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
    to: devops@example.com
```

---

## Cost Optimization

### Cloud Run Min Instances & Scaling
```yaml
# deployment-cloud-run.yml
- name: Configure Cloud Run scaling
  run: |
    gcloud run services update $SERVICE_NAME \
      --region $REGION \
      --min-instances 1 \
      --max-instances 10 \
      --cpu 1 \
      --memory 512Mi \
      --timeout 3600
```

### Vercel Edge Functions for Low Latency
```ts
// pages/api/fast-endpoint.ts
export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  // Runs on Vercel Edge Network globally
  return new Response("Hello from Edge!");
}
```

### Database Connection Pooling
```ts
// lib/db.ts (with Prisma + PgBouncer)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

// Use connection pooling with PgBouncer on production
// DB URL: postgresql://user:pass@pgbouncer-host:6432/db?schema=public
```

---

## Security: Secret Scanning & Dependency Audit

### GitHub Secret Scanning
```yaml
# Auto-enabled for public repos
# Manual setup for private:
# Settings → Security → Secret scanning → Enable

# Scan for secrets before push
npm install --save-dev husky pre-commit

# .husky/pre-commit
#!/bin/sh
npx detect-secrets scan --all-files --update .secrets.baseline
```

### Dependency Audit in CI
```yaml
# .github/workflows/security.yml
name: Security Checks

on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: npm audit
        run: npm audit --audit-level=moderate

      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Renovate Bot for Dependency Updates
```json
// renovate.json
{
  "extends": ["config:base"],
  "schedule": ["before 3am on Monday"],
  "major": {
    "enabled": false
  },
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    }
  ]
}
```

---

## Multi-Project Deployment Coordination

### Deploy All Apps Script
```bash
#!/bin/bash
# scripts/deploy-all.sh

set -e

APPS=("admin" "core" "pro" "citoyen" "inspect")

for app in "${APPS[@]}"; do
  echo "Deploying $app..."

  cd "apps/$app"

  # Build
  npm run build

  # Deploy to Vercel
  npx vercel --prod --token $VERCEL_TOKEN

  cd ../../

  echo "✓ $app deployed"
done

echo "All apps deployed successfully!"
```

### GitHub Composite Action for Shared Deployment
```yaml
# .github/actions/deploy-app/action.yml
name: Deploy Single App
description: Deploy a Next.js app to Vercel

inputs:
  app-name:
    required: true
  vercel-token:
    required: true

runs:
  using: composite
  steps:
    - name: Build
      run: npm run build --scope=apps/${{ inputs.app-name }}
      shell: bash

    - name: Deploy
      run: npx vercel --prod --token ${{ inputs.vercel-token }}
      working-directory: apps/${{ inputs.app-name }}
      shell: bash
```

### Use in Workflow
```yaml
- uses: ./.github/actions/deploy-app
  with:
    app-name: admin
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## Commandes de Déploiement Manuel

### Convex
```bash
# Déployer le backend Convex
npx convex deploy

# Voir les logs de production
npx convex logs --limit 100

# Exporter les données avant migration
npx convex export

# Importer les données
npx convex import --table documents data.jsonl

# Lister les déploiements
npx convex deployments list

# Voir le status
npx convex status
```

### Vercel
```bash
# Déployer en preview
vercel

# Déployer en production
vercel --prod

# Variables d'environnement
vercel env pull .env.local
vercel env add VAR_NAME
vercel env rm VAR_NAME

# Voir les logs
vercel logs

# Lister les déploiements
vercel deployments
```

### Cloud Run
```bash
# Build and deploy
gcloud run deploy SERVICE_NAME \
  --source . \
  --region europe-west1 \
  --platform managed

# View logs
gcloud run logs read SERVICE_NAME --region europe-west1

# Set environment variables
gcloud run services update SERVICE_NAME \
  --set-env-vars CONVEX_DEPLOY_KEY=xxx \
  --region europe-west1
```

---

## Anti-Patterns à ÉVITER
- ❌ Ne JAMAIS déployer sans tester localement avant
- ❌ Ne JAMAIS commiter des secrets dans le code source (utiliser GitHub Secrets)
- ❌ Ne JAMAIS utiliser `convex dev` en production — seulement `convex deploy`
- ❌ Ne JAMAIS oublier de mettre à jour les variables d'environnement de production
- ❌ Ne JAMAIS déployer sans vérifier l'health check endpoint
- ❌ Ne JAMAIS ignorer les failing tests avant de merger vers main
- ❌ Ne JAMAIS changer les DATABASE URLs en production manuellement — utiliser les workflows
- ❌ Ne JAMAIS déployer plusieurs services simultanément sans orchestration
- ❌ Ne JAMAIS oublier de sauvegarder les données avant les migrations majeures
- ❌ Ne JAMAIS ignorer les alertes de monitoring post-déploiement
