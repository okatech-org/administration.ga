---
name: Turborepo Monorepo Architecture
description: Configure and manage Turborepo monorepo structure, pipeline optimization, cache strategies, and multi-app development workflow
activation: ["turborepo", "monorepo", "workspace", "turbo.json", "apps/", "packages/", "build pipeline", "cache strategy"]
projects: ["gabon-diplomatie", "min_eco_num"]
version: 1.0.0
---

# Turborepo Monorepo Architecture

## Overview

Turborepo enables high-performance monorepo management with intelligent caching, parallel task execution, and workspace orchestration. OkaTech uses Turborepo for:
- `gabon-diplomatie` (Diplomacy Portal Turborepo)
- `min_eco_num` (Digital Economy Ministry)

## Turborepo Configuration

### turbo.json Structure

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env.local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "type-check": {
      "outputs": [],
      "cache": true
    },
    "test": {
      "outputs": ["coverage/**"],
      "cache": true
    },
    "db:push": {
      "cache": false,
      "inputs": ["prisma/schema.prisma"]
    },
    "convex:deploy": {
      "cache": false,
      "env": ["CONVEX_DEPLOY_KEY"]
    }
  },
  "globalEnv": ["NODE_ENV"],
  "remoteCache": {
    "enabled": true,
    "apiUrl": "https://cache.vercel.com",
    "signature": true,
    "teamId": "okatech-team-id"
  }
}
```

### Cache Configuration

**Local Cache** (`.turbo/` directory):
- Automatically stored and reused per workspace
- Include `.turbo/` in `.gitignore`
- Survives `npm install` with pnpm/bun

**Remote Cache** (Vercel):
- Enable with Vercel team integration
- Signature verification prevents cache poisoning
- Automatic on CI/CD with `VERCEL_SYSTEM_TOKEN`

### Pipeline Definition

**Key Concepts**:
- `^build` means "run build in all dependencies first"
- `outputs` defines what Turbo caches (includes in artifact)
- `cache: false` for dev tasks, side-effects, deployments
- `persistent: true` keeps dev server running across changes
- `inputs` specifies files that invalidate cache

## Workspace Structure

### Standard OkaTech Monorepo Layout

```
monorepo/
├── turbo.json
├── package.json (root, contains workspaces declaration)
├── pnpm-workspace.yaml (if using pnpm) or bun.lock (if using bun)
├── .turbo/ (gitignored local cache)
│
├── apps/                          # Customer-facing apps
│   ├── admin/                     # Next.js admin dashboard
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── src/
│   │   └── tsconfig.json (extends ../../packages/tsconfig)
│   ├── citizen/                   # Citizen Vite + React app
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── src/
│   └── public/                    # Shared public assets
│       └── images/
│
├── packages/                      # Shared libraries
│   ├── ui/                        # Shadcn/UI component library
│   │   ├── package.json
│   │   ├── index.ts (exports)
│   │   ├── components/
│   │   └── tsconfig.json
│   ├── types/                     # Shared TypeScript types
│   │   ├── index.ts
│   │   └── entities.ts
│   ├── config/                    # Shared config (auth, API endpoints)
│   │   ├── index.ts
│   │   └── env.ts
│   ├── tsconfig/                  # Shareable TypeScript configs
│   │   ├── base.json
│   │   ├── react.json
│   │   ├── next.json
│   │   └── vite.json
│   ├── eslint-config/             # Shared ESLint rules
│   │   └── index.js
│   └── utils/                     # Utility functions
│       ├── index.ts
│       └── validators.ts
│
├── services/                      # Backend services (optional)
│   ├── api/                       # Express/Node.js API
│   │   ├── package.json
│   │   └── src/
│   └── convex/                    # Shared Convex backend
│       ├── convex/
│       └── package.json
│
└── docs/                          # Documentation
    ├── architecture.md
    └── deployment.md
```

### Internal vs External Packages

**Internal Packages** (under `packages/`, `apps/`, `services/`):
- Referenced with `workspace:*` protocol in package.json
- Hoisted to root `node_modules/` or link-only
- No npm registry publishing
- Full source code available

**External Packages** (npm registry):
- Installed normally with version ranges
- No workspace protocol
- Example: `@tiptap/react`, `convex`, `next`

### Root package.json Configuration

```json
{
  "name": "@okatech/monorepo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "bun@1.x",
  "workspaces": [
    "apps/*",
    "packages/*",
    "services/*"
  ],
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.x",
    "eslint": "^8.x"
  },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules .turbo",
    "turbo:login": "turbo login",
    "turbo:link": "turbo link"
  }
}
```

## Shared Component Library Pattern

### packages/ui Structure

```typescript
// packages/ui/index.ts
export { Button } from './components/Button';
export { Dialog } from './components/Dialog';
export { Card } from './components/Card';
// ... export all shadcn/UI wrappers

// packages/ui/components/Button.tsx
import { Button as ShadcnButton } from '../ui/button';
// Wrapper adds OkaTech-specific styling, defaults, behavior
export const Button = ({ variant = 'primary', ...props }) => (
  <ShadcnButton variant={variant} className="..." {...props} />
);
```

### tsconfig Sharing

```json
// packages/tsconfig/base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  }
}

// apps/admin/tsconfig.json
{
  "extends": "@okatech/tsconfig/base",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".turbo"]
}
```

## Build Pipeline Optimization

### Task Dependencies

Turbo automatically resolves dependencies with `^` prefix:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

**Execution Order**:
1. Build `packages/types`
2. Build `packages/ui`
3. Build `packages/config`
4. Build `apps/admin` (depends on types, ui, config)
5. Build `apps/citizen` (depends on types, ui, config)

### Parallel Task Execution

```bash
# Run all tasks in parallel (respecting dependencies)
turbo build

# Run only specific app
turbo build --filter=admin

# Run dependent apps
turbo build --filter=admin --include-dependencies

# Exclude certain tasks
turbo build --skip-tasks=type-check

# Continue despite failures
turbo build --no-bail
```

### Cache Outputs

Only specified `outputs` are cached:

```json
{
  "build": {
    "outputs": [".next/**", "dist/**", "build/**"],
    "cache": true
  }
}
```

Turbo stores artifacts and restores them on subsequent runs.

## Shared Convex Backend

### Pattern: Single Convex Project for Multiple Apps

```
services/convex/
├── convex/
│   ├── auth.ts
│   ├── documents.ts
│   ├── users.ts
│   ├── _generated/
│   └── convex.json
├── package.json
└── lib/customFunctions.ts
```

### Accessing from Apps

```typescript
// apps/admin/lib/convex.ts
import { ConvexHttpClient } from 'convex/browser';

export const convex = new ConvexHttpClient(
  process.env.REACT_APP_CONVEX_URL ||
  'https://your-deployment.convex.cloud'
);

// apps/citizen/lib/convex.ts
// Same pattern, shared URL in env config
```

### Package.json Workspace Reference

```json
{
  "dependencies": {
    "@okatech/types": "workspace:*",
    "@okatech/config": "workspace:*",
    "convex": "^1.x"
  },
  "devDependencies": {
    "convex": "^1.x"
  }
}
```

## Environment Variable Handling

### .env Pattern

```
# .env.local (root, shared by all apps)
CONVEX_DEPLOYMENT=your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# apps/admin/.env.local (app-specific overrides)
NEXT_PUBLIC_API_URL=https://admin-api.example.com

# apps/citizen/.env.local (app-specific)
NEXT_PUBLIC_API_URL=https://citizen-api.example.com
```

### turbo.json Global Dependencies

```json
{
  "globalDependencies": [".env.local"],
  "globalEnv": ["NODE_ENV", "NEXT_PUBLIC_CONVEX_URL"]
}
```

Changes to shared env files invalidate all caches.

## Docker Builds for Monorepo

### Multi-Stage Dockerfile (Next.js)

```dockerfile
# Stage 1: Prune dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
RUN bun install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build -- --filter=admin
RUN cd apps/admin && bun prune --prod

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/public ./public
USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

### turbo prune for CI/CD

```bash
# Extract only dependencies needed for specific app
turbo prune --scope=admin --docker

# Creates:
# - out/json/ (package.json files)
# - out/pnpm-lock.yaml (pruned lock file)
# - out/full/ (source code)
```

## CI/CD Integration

### GitHub Actions with Turbo

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      # Cache Turbo cache
      - uses: dtolnay/rust-toolchain@stable
        with:
          cache: turbo
      - run: bun install --frozen-lockfile

      # Run pipeline
      - run: bun run build
      - run: bun run lint
      - run: bun run type-check

      # Deploy specific apps
      - run: bun run build -- --filter=admin
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

### Vercel Remote Cache

```bash
# Link project to Vercel
bun run turbo:link

# Authenticate with token
turbo login

# Automatic remote cache on CI/CD
# Set VERCEL_SYSTEM_TOKEN in GitHub Actions secrets
```

## Development Workflow

### Local Development

```bash
# Start all dev servers
bun run dev

# Start specific app + dependencies
turbo dev --filter=admin --include-dependencies

# Build single app
turbo build --filter=admin

# Run tests
turbo test

# Type checking
turbo type-check
```

### Adding New Workspace

```bash
mkdir -p apps/new-app
cd apps/new-app
# Create package.json with name: "@okatech/new-app"
# Create src/, public/, tsconfig.json

# Update root turbo.json if needed
# Turbo auto-detects new workspaces
```

### Dependency Management

**Add to shared package**:
```bash
bun add react --workspace @okatech/ui
```

**Add to specific app**:
```bash
bun add -w @okatech/admin some-library
```

**Add internal dependency**:
```bash
# In apps/admin/package.json
{
  "dependencies": {
    "@okatech/ui": "workspace:*",
    "@okatech/types": "workspace:*"
  }
}
```

## Anti-Patterns

### Do Not

1. **Bypass Turbo cache**: Don't use `--force` or `--no-cache` in CI/CD
2. **Duplicate dependencies**: Specify once in root or workspace, not both
3. **Mixed package managers**: Use bun OR pnpm, not both
4. **Ignore TypeScript**: All workspaces use strict mode
5. **Direct imports across workspaces**: Use exports from package.json index
6. **Hardcode env variables**: Use .env files, never embed in code
7. **Create implicit dependencies**: Always declare in package.json or turbo.json
8. **Forget workspace protocol**: Use `workspace:*` for internal deps
9. **Ignore cache invalidation**: List all inputs that affect task output
10. **Deploy without type-check**: Always run turbo type-check in CI

## Troubleshooting

### Cache Not Working

```bash
# Clear local cache
bun run clean

# Verify cache key
turbo run build --verbose

# Check remote cache auth
turbo login
turbo link
```

### Dependency Hell

```bash
# Audit workspace structure
bun ls --workspace

# Check for duplicate versions
bun ls react

# Resolve circular dependencies
turbo run type-check --verbose
```

### Performance Issues

```bash
# Profile Turbo execution
turbo run build --profile=profile.json

# Analyze bottlenecks
turbo run build --verbosity=verbose

# Measure task durations
turbo run build --summarize
```

## Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Workspace Protocol](https://turbo.build/repo/docs/handbook/package-installation#workspaces)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
