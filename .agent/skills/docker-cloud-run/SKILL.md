---
name: Docker Containerization & Google Cloud Run
description: Create Docker images for Next.js and Vite apps, deploy to Google Cloud Run with scaling, logging, and CI/CD integration
activation: ["docker", "dockerfile", "cloud run", "gcp", "container", "artifact registry", "cloud build", "cloudbuild.yaml", "containerization"]
projects: ["AGASA-Pro", "AGASA-Admin", "AGASA-Core", "AGASA-Citoyen", "AGASA-Inspect", "secretariat-general-gouv"]
version: 1.0.0
---

# Docker Containerization & Google Cloud Run Deployment

## Overview

Docker enables consistent deployments across environments. Google Cloud Run provides serverless container execution with automatic scaling, logging, and monitoring. OkaTech uses Docker + Cloud Run for:
- AGASA Platform (Pro, Admin, Core, Citoyen, Inspect)
- secretariat-general-gouv

## Dockerfile Patterns

### Next.js Multi-Stage Build

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only dependency files
COPY package.json bun.lock* package-lock.json* yarn.lock* ./

# Install all dependencies (including devDependencies for build)
RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    else \
      npm ci; \
    fi

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build Next.js
RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun run build; \
    elif [ -f yarn.lock ]; then \
      yarn build; \
    else \
      npm run build; \
    fi

# Stage 3: Runtime (production dependencies only)
FROM node:20-alpine AS runtime-deps
WORKDIR /app
COPY package.json bun.lock* package-lock.json* yarn.lock* ./

RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun install --frozen-lockfile --production; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile --production; \
    else \
      npm ci --only=production; \
    fi

# Stage 4: Runner (final image)
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
```

**Key Points**:
- Stage 1: Install all deps (build + runtime)
- Stage 2: Build application
- Stage 3: Install only production deps
- Stage 4: Final slim image with built app + prod deps only

### Vite + React Multi-Stage Build

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* package-lock.json* yarn.lock* ./

RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    else \
      npm ci; \
    fi

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun run build; \
    elif [ -f yarn.lock ]; then \
      yarn build; \
    else \
      npm run build; \
    fi

# Stage 3: Runtime (Node.js for SSR or nginx for static)
FROM node:20-alpine AS runner
WORKDIR /app

# Install lightweight HTTP server
RUN npm install -g serve

RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001

# Copy built dist folder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Optional: Copy package.json if SSR middleware needed
COPY --from=builder /app/package.json ./

RUN chown -R appuser:nodejs /app
USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/

EXPOSE 3000
ENV NODE_ENV=production

# For static SPA
CMD ["serve", "-s", "dist", "-l", "3000"]

# For SSR (if middleware in package.json)
# CMD ["node", "dist/server.js"]
```

### .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.next
dist
.turbo
.env.local
.env.*.local
coverage
.DS_Store
```

## Docker Compose for Local Development

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_CONVEX_URL: ${NEXT_PUBLIC_CONVEX_URL}
      CONVEX_DEPLOYMENT: ${CONVEX_DEPLOYMENT}
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  convex-dev:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./services/convex:/app
      - convex-node:/app/node_modules
    environment:
      CONVEX_DEPLOYMENT: ${CONVEX_DEPLOYMENT}
    command: npx convex dev
    ports:
      - "3210:3210"

volumes:
  convex-node:
```

**Usage**:
```bash
docker-compose up
# App at http://localhost:3000
# Convex at http://localhost:3210
```

## Google Cloud Run Deployment

### Setup Prerequisites

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login

# Set project
gcloud config set project PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create Artifact Registry
gcloud artifacts repositories create okatech-containers \
  --repository-format=docker \
  --location=us-central1
```

### Deploy via gcloud CLI

```bash
# Build and deploy
gcloud run deploy my-app \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 100 \
  --min-instances 1 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_CONVEX_URL=${CONVEX_URL}"

# Get service URL
gcloud run services describe my-app --region us-central1
```

### Cloud Build Configuration (cloudbuild.yaml)

```yaml
steps:
  # Step 1: Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/okatech-containers/app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/okatech-containers/app:latest'
      - '.'

  # Step 2: Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/okatech-containers/app:$SHORT_SHA'

  # Step 3: Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/okatech-containers/app:$SHORT_SHA'
      - '--location=us-central1'
      - '--namespace=default'

  # Alternative: Direct Cloud Run deploy
  - name: 'gcr.io/cloud-builders/run'
    args:
      - 'deploy'
      - 'my-app'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/okatech-containers/app:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/okatech-containers/app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/okatech-containers/app:latest'

options:
  machineType: 'N1_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: 3600s
```

### Artifact Registry Management

```bash
# Push image manually
docker tag app:latest us-central1-docker.pkg.dev/PROJECT_ID/okatech-containers/app:latest
docker push us-central1-docker.pkg.dev/PROJECT_ID/okatech-containers/app:latest

# List images
gcloud artifacts docker images list us-central1-docker.pkg.dev/PROJECT_ID/okatech-containers

# Delete old images
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/PROJECT_ID/okatech-containers/app:OLD_TAG
```

## Cloud Run Configuration

### Environment Variables & Secrets

```bash
# Set environment variables
gcloud run services update my-app \
  --region us-central1 \
  --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_CONVEX_URL=https://..."

# Reference secrets from Secret Manager
gcloud secrets create convex-deploy-key --data-file=-
gcloud secrets add-iam-policy-binding convex-deploy-key \
  --member=serviceAccount:cloud-run-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Update service to use secret
gcloud run services update my-app \
  --region us-central1 \
  --set-env-vars "CONVEX_DEPLOY_KEY=ref:convex-deploy-key"
```

### Auto-Scaling Configuration

```bash
gcloud run services update my-app \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 80 \
  --cpu-throttling \
  --memory 2Gi

# Settings:
# - min-instances: Always running (cost baseline)
# - max-instances: Scale limit
# - concurrency: Requests per container
# - cpu-throttling: Disable CPU outside of requests
```

### Health Checks

**Cloud Run Health Checks** (automatic):
- Listens on $PORT (default 8080)
- Requires successful startup within 4 minutes
- Restarts failed containers

**Application Health Endpoint** (recommended):

```typescript
// apps/app/src/pages/api/health.ts
export default async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    // Check database connectivity
    const dbHealthy = await checkDatabase();

    // Check Convex connectivity
    const convexHealthy = await checkConvex();

    if (dbHealthy && convexHealthy) {
      return res.status(200).json({ status: 'ok' });
    } else {
      return res.status(503).json({ status: 'degraded' });
    }
  } catch (error) {
    return res.status(503).json({ status: 'error' });
  }
};
```

### Custom Domains

```bash
# Create DNS CNAME mapping
# In your DNS provider:
# subdomain.example.com CNAME -> goog1e-projects.run.app

# Verify domain
gcloud run domain-mappings create \
  --service=my-app \
  --domain=subdomain.example.com \
  --region=us-central1

# Check domain status
gcloud run domain-mappings describe \
  --domain=subdomain.example.com \
  --region=us-central1
```

## Logging with Cloud Logging

### View Logs

```bash
# Stream logs
gcloud run logs read my-app --region us-central1 --follow

# Filter by severity
gcloud run logs read my-app \
  --region us-central1 \
  --filter='severity=ERROR'

# Filter by date
gcloud run logs read my-app \
  --region us-central1 \
  --filter='timestamp>="2024-01-01T00:00:00Z"'
```

### Structured Logging

```typescript
// Log structured JSON for better filtering
console.log(JSON.stringify({
  severity: 'ERROR',
  message: 'Database connection failed',
  timestamp: new Date().toISOString(),
  context: {
    userId: user.id,
    action: 'create_document'
  }
}));
```

### Cloud Logging Dashboard

```bash
# Export logs to BigQuery
gcloud logging sinks create my-app-sink \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="my-app"'
```

## Cloud SQL Proxy Integration

**Pattern for idetude.ga (Cloud SQL + Cloud Run)**:

```dockerfile
# Add Cloud SQL Proxy
FROM google-cloud-cli:latest AS cloud-sql-proxy
RUN gcloud components install cloud-sql-proxy

# Final image
FROM node:20-alpine
COPY --from=cloud-sql-proxy /google-cloud-cli /opt/google-cloud

# Install psql for health checks
RUN apk add --no-cache postgresql-client

COPY . .
CMD ["/opt/google-cloud/bin/cloud_sql_proxy", "-instances=PROJECT:REGION:INSTANCE=tcp:5432 & node server.js"]
```

**Environment Variable**:
```bash
gcloud run services update my-app \
  --set-env-vars "DATABASE_URL=postgresql://user:pass@localhost:5432/dbname"
```

## Service-to-Service Authentication

### Internal Communication

```typescript
// Generate ID token for Cloud Run service
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

const client = await auth.getIdTokenClient('https://other-service.run.app');
const response = await client.request({
  url: 'https://other-service.run.app/api/endpoint',
});
```

### Service Account Permissions

```bash
# Create service account
gcloud iam service-accounts create cloud-run-apps

# Grant Cloud Run Invoker role
gcloud run services add-iam-policy-binding my-app \
  --member=serviceAccount:cloud-run-apps@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/run.invoker

# Bind Cloud Run service to service account
gcloud run services update my-app \
  --region us-central1 \
  --service-account=cloud-run-apps@PROJECT_ID.iam.gserviceaccount.com
```

## CI/CD Integration

### GitHub Actions → Cloud Run

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      # Authenticate with Workload Identity
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - uses: google-github-actions/setup-gcloud@v2

      # Build and push to Artifact Registry
      - run: |
          gcloud builds submit \
            --region=us-central1 \
            --config=cloudbuild.yaml

      # Deploy to Cloud Run
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: my-app
          region: us-central1
          source: .
          env_vars: |
            NODE_ENV=production
            NEXT_PUBLIC_CONVEX_URL=${{ secrets.CONVEX_URL }}
```

### Workload Identity Setup

```bash
# Create service account
gcloud iam service-accounts create github-actions

# Grant Cloud Run Deploy permission
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/run.admin \
  --role=roles/storage.admin \
  --role=roles/cloudbuild.builds.editor

# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-actions" \
  --project="PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions"

# Configure GitHub Actions
# Add to GitHub Secrets:
# WIF_PROVIDER: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github
# WIF_SERVICE_ACCOUNT: github-actions@PROJECT_ID.iam.gserviceaccount.com
```

## Cost Optimization

### Instance Configuration

```bash
# For low-traffic services
gcloud run deploy my-app \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1

# For high-traffic services
gcloud run deploy my-app \
  --min-instances 5 \
  --max-instances 100 \
  --memory 4Gi \
  --cpu 4 \
  --concurrency 80
```

### Traffic Splitting

```bash
# Gradual rollout (10% to new version)
gcloud run services update-traffic my-app \
  --to-revisions=LATEST=10,PREVIOUS=90 \
  --region us-central1
```

## Anti-Patterns

### Do Not

1. **Run as root**: Always use non-root user in Dockerfile
2. **Store secrets in image**: Use Secret Manager or environment variables
3. **Large base images**: Use alpine (node:20-alpine), not ubuntu
4. **Copy unnecessary files**: Use .dockerignore, multi-stage builds
5. **Ignore health checks**: Always include HEALTHCHECK or liveness probes
6. **Mix concerns**: Separate app containers from proxy/init containers
7. **Set no limits**: Always configure memory/CPU limits
8. **Forget to set PORT**: Cloud Run requires PORT env variable
9. **Use localhost in containerized app**: Bind to 0.0.0.0
10. **Rebuild entire image for small changes**: Use layer caching efficiently

## Troubleshooting

### Container Won't Start

```bash
# Check logs
gcloud run logs read my-app --region us-central1

# Test locally
docker run -it -p 3000:3000 -e NODE_ENV=production my-app:latest

# Check Dockerfile startup
docker inspect my-app:latest | grep -i cmd
```

### Slow Deployments

```bash
# Profile build time
docker build --progress=plain .

# Check image size
docker images my-app

# Optimize layers
docker buildx build --build-arg BUILDKIT_INLINE_CACHE=1 .
```

### Out of Memory

```bash
# Increase memory
gcloud run services update my-app \
  --region us-central1 \
  --memory 4Gi

# Profile memory usage
docker run --memory=512m my-app:latest
```

## Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Cloud Build](https://cloud.google.com/build/docs)
