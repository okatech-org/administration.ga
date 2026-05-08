# Gabon Diplomatie — Monorepo

Plateforme de services consulaires de la **République Gabonaise** pour les citoyens, agents consulaires et administrateurs.

## Architecture

```
gabon-diplomatie/
├── apps/
│   ├── citizen-web      # Portail citoyen         → consulat.ga         (port 3000)
│   ├── agent-web        # Portail agent/consulat   → diplomate.ga        (port 3003)
│   └── backoffice-web   # Back-office super admin  → admin.consulat.ga   (port 3002)
├── packages/
│   ├── api              # Client Convex partagé (provider, hooks, auth)
│   ├── ui               # Composants shadcn/ui partagés (~45 composants)
│   ├── i18n             # Internationalisation FR/EN (i18next)
│   ├── shared           # Types, constantes et utilitaires partagés
│   └── tsconfig         # Configurations TypeScript de base
├── convex/              # Backend Convex (fonctions, schémas, seeds, AI)
└── .github/workflows/   # CI/CD GitHub Actions (deploy par app)
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | [TanStack Start](https://tanstack.com/start) (file-based routing, SSR) |
| UI | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| Backend | [Convex](https://convex.dev/) (base de données temps-réel, fonctions serverless) |
| Auth | [Better Auth](https://better-auth.com/) (OTP email/SMS, OAuth IDN, multi-domaine) |
| Monorepo | [Turborepo](https://turbo.build/) + [Bun](https://bun.sh/) 1.2.17 |
| i18n | [i18next](https://www.i18next.com/) (FR/EN) |
| Vidéo | [LiveKit](https://livekit.io/) (appels vidéo citoyen/agent) |
| Cartes | [Mapbox GL](https://www.mapbox.com/) |
| Analytics | [PostHog](https://posthog.com/) |
| Deploy | [GCP Cloud Run](https://cloud.google.com/run) + [Artifact Registry](https://cloud.google.com/artifact-registry) |

## Prérequis

- **Bun** >= 1.2.17 (`curl -fsSL https://bun.sh/install | bash`)
- **Node.js** >= 20
- Accès au projet **Convex** `gabon-diplomatie`
- Accès au projet **GCP** `gabon-diplomatie` (pour le deploy)

## Installation

```bash
git clone https://github.com/okatech-org/gabon-diplomatie.git
cd gabon-diplomatie
bun install
```

## Configuration

Chaque app a son propre `.env.local`. Variables requises :

### Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | URL du déploiement Convex | `https://xxx.eu-west-1.convex.cloud` |
| `CONVEX_SITE_URL` | URL HTTP du site Convex | `https://xxx.eu-west-1.convex.site` |
| `NEXT_PUBLIC_SITE_URL` | URL de l'app (pour l'auth) | `http://consulat.local:3000` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Clé PostHog | |
| `NEXT_PUBLIC_POSTHOG_HOST` | Host PostHog | |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | URL WebSocket LiveKit | |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token Mapbox (citizen-web uniquement) | |

### Variables Convex (backend)

Configurées via `bunx convex env set <KEY> <VALUE>` :

| Variable | Description |
|----------|-------------|
| `TRUSTED_ORIGINS` | Origins autorisés pour Better Auth (séparés par virgule) |
| `BETTER_AUTH_SECRET` | Secret pour la session Better Auth |
| `LIVEKIT_API_KEY` | Clé API LiveKit |
| `LIVEKIT_API_SECRET` | Secret API LiveKit |
| `RESEND_API_KEY` | Clé API Resend (envoi emails) |
| `BIRD_API_KEY` | Clé API Bird (SMS/WhatsApp) |

## Lancement en dev

```bash
# Lancer TOUTES les apps en parallèle
bun run dev

# Lancer UNE seule app
cd apps/citizen-web && bun run dev     # http://localhost:3000
cd apps/agent-web && bun run dev       # http://localhost:3003
cd apps/backoffice-web && bun run dev  # http://localhost:3002

# Lancer le backend Convex (dans un terminal séparé)
bunx convex dev
```

### Ports locaux

| App | Port | URL locale recommandée |
|-----|------|------------------------|
| citizen-web | 3000 | `http://consulat.local:3000` |
| backoffice-web | 3002 | `http://admin.consulat.local:3002` |
| agent-web | 3003 | `http://diplomate.local:3003` |

> Ajouter les domaines locaux dans `/etc/hosts` :
> ```
> 127.0.0.1 consulat.local diplomate.local admin.consulat.local
> ```

## Build

```bash
# Build toutes les apps
bun run build

# Build une seule app
cd apps/citizen-web && bun run build
```

## Packages partagés

| Package | Alias d'import | Description |
|---------|----------------|-------------|
| `packages/api` | `@workspace/api` | Provider Convex (`AppConvexProvider`), hooks auth, client auth |
| `packages/ui` | `@workspace/ui` | ~45 composants shadcn/ui (Button, Card, Dialog, etc.) |
| `packages/i18n` | `@workspace/i18n` | Provider i18next, traductions FR/EN |
| `packages/shared` | `@workspace/shared` | Types partagés, constantes, utilitaires |
| `packages/tsconfig` | `@workspace/tsconfig` | Configs TypeScript (`base.json`, `react.json`) |

### Ajouter un composant shadcn/ui

```bash
bunx shadcn@latest add <composant> -c packages/ui
```

Les composants sont placés dans `packages/ui/src/components/` et importés via :

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Convex (Backend)

Le backend Convex est partagé entre les 3 apps.

```
convex/
├── functions/       # Queries et mutations (users, services, requests, etc.)
├── actions/         # Actions (livekit, envoi SMS/email)
├── schemas/         # Schémas des tables
├── betterAuth/      # Configuration Better Auth
├── ai/              # Chat AI, analyse de documents
├── lib/             # Helpers, constantes, validators
├── seeds/           # Données de seed (dev)
└── http.ts          # Routes HTTP (auth)
```

### Déploiements Convex

| Environnement | Déploiement |
|---------------|-------------|
| Dev | Voir `.env.local` → `CONVEX_DEPLOYMENT` |
| Production | Voir dashboard Convex |

```bash
# Lancer en dev (hot-reload)
bunx convex dev

# Déployer en production
bunx convex deploy --prod
```

## Déploiement (Production)

Chaque app se déploie automatiquement sur **GCP Cloud Run** via GitHub Actions au push sur `main`.

### CI/CD

| Workflow | Trigger | Service Cloud Run |
|----------|---------|-------------------|
| `deploy-citizen.yml` | `apps/citizen-web/**` ou `packages/**` | `citizen-web` |
| `deploy-agent.yml` | `apps/agent-web/**` ou `packages/**` | `agent-web` |
| `deploy-backoffice.yml` | `apps/backoffice-web/**` ou `packages/**` | `backoffice-web` |

Les workflows se lancent aussi manuellement via `workflow_dispatch`.

### Domaines

| App | Domaine | URL Cloud Run (fallback) |
|-----|---------|--------------------------|
| citizen-web | `consulat.ga` | `citizen-web-xxx.europe-west1.run.app` |
| agent-web | `diplomate.ga` | `agent-web-xxx.europe-west1.run.app` |
| backoffice-web | `admin.consulat.ga` | `backoffice-web-xxx.europe-west1.run.app` |

Les redirections `www.` vers apex sont gérées par un middleware Nitro (`server/middleware/www-redirect.ts`).

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `WIF_PROVIDER` | Workload Identity Federation provider GCP |
| `NEXT_PUBLIC_CONVEX_URL` | URL Convex **production** |
| `CONVEX_SITE_URL` | URL site Convex **production** |
| `NEXT_PUBLIC_POSTHOG_KEY` | Clé PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | Host PostHog |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | URL WebSocket LiveKit |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token Mapbox |

### Deploy manuel

```bash
gh workflow run deploy-citizen.yml
gh workflow run deploy-agent.yml
gh workflow run deploy-backoffice.yml
```

## Auth multi-domaine

Better Auth est configuré pour fonctionner sur les 3 domaines simultanément :

- **Server-side** : `baseURL` omis intentionnellement (Better Auth infère depuis la requête)
- **Client-side** : utilise `window.location.origin` dynamiquement
- **`TRUSTED_ORIGINS`** : variable d'env Convex contenant tous les domaines autorisés
- Chaque app a son `auth-server.ts` qui proxy les requêtes auth vers Convex

Pour ajouter un nouveau domaine, mettre à jour `TRUSTED_ORIGINS` sur Convex (dev **et** prod) :

```bash
# Dev
CONVEX_DEPLOYMENT=dev:<deployment-name> bunx convex env set TRUSTED_ORIGINS "https://domaine1.com,https://domaine2.com,..."

# Prod
CONVEX_DEPLOYMENT=prod:<deployment-name> bunx convex env set TRUSTED_ORIGINS "https://domaine1.com,https://domaine2.com,..."
```

### Sites partenaires externes

Le site `france.consulat.ga` consomme le catalogue de services via un
second `ConvexReactClient` pointé sur ce déploiement. Il faut donc
inclure ses origines dans `TRUSTED_ORIGINS` :

```
https://france.consulat.ga,https://staging.france.consulat.ga
```

Les queries exposées (`convex/functions/publicServices.ts`) sont
**non authentifiées** et ne renvoient que des données destinées à
l'affichage public. Les mutations d'administration
(`setOrgServiceActive`, etc.) restent protégées par Better Auth — l'admin
doit donc être connecté à diplomate.ga pour piloter l'activation depuis
l'interface france.consulat.ga.

## Licence

Propriétaire — OKATech / République Gabonaise
