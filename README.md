# ADMINISTRATION.GA

> Plateforme de digitalisation de l'administration publique gabonaise — citoyens, agents, et autorités.

[![Convex](https://img.shields.io/badge/backend-Convex-purple)](https://convex.dev)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-red)](https://turbo.build)
[![Cloud Run](https://img.shields.io/badge/deploy-GCP_Cloud_Run-4285F4)](https://cloud.google.com/run)

---

## Mission

ADMINISTRATION.GA est la plateforme unifiée de digitalisation de **l'administration publique gabonaise** :

- **Côté usager (citoyens & entreprises)** : un point d'entrée unique aux ~260 institutions publiques (Présidence, ministères, directions générales, établissements publics, AAI, parlement, juridictions, collectivités locales) et à leurs démarches administratives (CNI, passeport, état civil, casier judiciaire, etc.).
- **Côté agent** : un poste de travail digital pour traiter les correspondances, suivre les dossiers, animer les réunions et collaborer en temps réel.
- **Côté gouvernance** : un back-office souverain (Admin Système + Admin Institution) pour piloter le registre national, le catalogue de modules et les canaux d'interconnexion inter-institutions.

Ce projet est le **pendant administratif** de [`gabon-diplomatie`](https://github.com/okatech-org/gabon-diplomatie) : là où ce dernier gère les représentations diplomatiques (ambassades, consulats) et les démarches consulaires depuis l'étranger, ADMINISTRATION.GA gère les administrations nationales et les démarches sur le territoire gabonais. Le socle technique est **IDENTIQUE** ; seuls le domaine métier, le modèle organisationnel et la terminologie diffèrent (cf. [`docs/MIGRATION_FROM_DIPLOMATIE.md`](./docs/MIGRATION_FROM_DIPLOMATIE.md)).

---

## Architecture

Le monorepo expose **3 applications Next.js 14** pointées sur un backend Convex partagé :

```
administration.ga/
├── apps/
│   ├── admin-gabon-citizen     # Portail citoyen / entreprise  → demarche.ga                (port 3000)
│   ├── admin-gabon             # Poste de travail agent         → administration.ga          (port 3003)
│   ├── admin-gabon-backoffice  # Back-office souverain          → admin.administration.ga    (port 3002)
│   └── agent-desktop           # App Electron pour les agents (optionnel, en alpha)
├── packages/
│   ├── api              # Provider Convex (AppConvexProvider), hooks auth, client Better Auth
│   ├── ui               # ~45 composants shadcn/ui partagés
│   ├── i18n             # Provider i18next, traductions FR/EN
│   ├── shared           # Types partagés, constantes, utilitaires
│   ├── livekit          # Hooks LiveKit (room-options, disconnect-guard, ringtone)
│   ├── chat             # Hooks chat (idempotency-key, attachments, safe-markdown)
│   ├── iasted           # Sphère 3D + circle menu de l'agent vocal iAsted
│   ├── document-editor  # Éditeur Tiptap partagé
│   ├── document-rendering # Génération PDF/DOCX/PPTX
│   ├── agent-features   # Features cross-apps (iDocument, iProfil, team, etc.)
│   ├── posthog-shared   # Provider PostHog + helpers events
│   ├── routing          # Routes typées partagées
│   ├── settings-form    # Form schemas réutilisables
│   ├── map              # Wrapper Mapbox / Leaflet
│   ├── desktop-shared   # Utilitaires Electron
│   └── tsconfig         # Configs TypeScript de base
├── convex/              # Backend Convex (functions, schemas, ai, lib, seeds, migrations, crons)
└── .github/workflows/   # CI/CD GitHub Actions (deploy par app sur Cloud Run)
```

| Application | URL prod | Port dev | Audience |
|---|---|---|---|
| `apps/admin-gabon-citizen` | `demarche.ga` | 3000 | Citoyens, résidents, entreprises |
| `apps/admin-gabon` | `administration.ga` | 3003 | Agents administratifs (ministères, DG, EP) |
| `apps/admin-gabon-backoffice` | `admin.administration.ga` | 3002 | Admin Système + Admin Institution |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Monorepo | [Turborepo](https://turbo.build/) + [Bun](https://bun.sh/) 1.2.17 |
| Frontend | [Next.js 14](https://nextjs.org) (App Router, React 19) |
| UI | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com) (neumorphisme Soft UI, cf. `DESIGN_CHARTER.md`) |
| Backend | [Convex](https://convex.dev) (base temps-réel, fonctions serverless, schémas TypeScript) |
| Auth | [Better Auth](https://better-auth.com) (OTP email/SMS, OAuth IDN, multi-domaine) + RBAC TaskCode |
| Temps réel | [LiveKit](https://livekit.io) (appels, réunions, partage d'écran) |
| Éditeur | [Tiptap](https://tiptap.dev) (correspondance, documents, archive) |
| IA | [OpenAI Realtime](https://platform.openai.com/docs/guides/realtime) (iAsted Mode God) + Gemini (Mr Ray) + Anthropic (analyse de documents) |
| i18n | [i18next](https://www.i18next.com/) (FR/EN) |
| Cartes | [Mapbox GL](https://www.mapbox.com/) + Leaflet |
| Analytics | [PostHog](https://posthog.com/) |
| Génération de documents | [docx](https://github.com/dolanmiu/docx), [pptxgenjs](https://gitbrent.github.io/PptxGenJS/), [pdf-lib](https://pdf-lib.js.org/), [JSZip](https://stuk.github.io/jszip/) |
| Déploiement | [GCP Cloud Run](https://cloud.google.com/run) + [Artifact Registry](https://cloud.google.com/artifact-registry) |

---

## Documents de référence

### Référentiels métier (lecture obligatoire avant tout travail business)

| Document | Description |
|---|---|
| [`ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](./ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md) | Référentiel exhaustif des 28 ministères, ~110 DG, ~80 EP, AAI, parlement, juridictions, collectivités. |
| [`ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md`](./ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md) | Spécification fonctionnelle universelle du module iCorrespondance (DEM/ADM/INST, workflow, copies, audit). |
| [`ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md`](./ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md) | Vision cible globale (7 modules du noyau, canaux souverains, gouvernance Admin Système vs Admin Institution). |
| [`ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](./ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) | Synthèse opérationnelle (slugs canoniques, ministrySubType, glossaire, arbitrages tranchés). |
| [`DESIGN_CHARTER.md`](./DESIGN_CHARTER.md) | Charte graphique neumorphique Soft UI (palette achromatique + 4 accents, identité Gabon en décoratif). |

### Documentation projet

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Architecture technique détaillée (modèle organisationnel, modules, iAsted, sovereign channels). |
| [`docs/MIGRATION_FROM_DIPLOMATIE.md`](./docs/MIGRATION_FROM_DIPLOMATIE.md) | Histoire de la migration depuis `gabon-diplomatie` + dette résiduelle. |
| [`docs/REFERENTIEL_INSTITUTIONS.md`](./docs/REFERENTIEL_INSTITUTIONS.md) | Index institutionnel + règle de non-invention. |
| [`docs/GOUVERNANCE.md`](./docs/GOUVERNANCE.md) | Modèle de gouvernance, RBAC, classifications, audit. |
| [`docs/iasted-posthog-dashboard.md`](./docs/iasted-posthog-dashboard.md) | Dashboard PostHog pour la télémétrie iAsted. |

> Le règlement le plus important : **ne JAMAIS inventer** une donnée métier (titulaire, libellé officiel, organigramme, tutelle). Toute information doit être vérifiée dans `ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`. En cas d'ambiguïté, lever une question d'arbitrage AVANT d'écrire — voir [`ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](./ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §D pour les points déjà tranchés.

---

## Quickstart

### Prérequis

- **Bun** >= 1.2.17 (`curl -fsSL https://bun.sh/install | bash`)
- **Node.js** >= 20
- Accès au projet **Convex** `administration-ga`
- Accès au projet **GCP** `administration-ga` (pour le déploiement)

### Installation

```bash
git clone https://github.com/okatech-org/administration.ga.git
cd administration.ga
bun install
```

### Lancement en dev

```bash
# Démarrer le backend Convex (hot-reload schéma + fonctions)
bun run dev:convex          # ou : bunx convex dev

# Démarrer une app (dans un terminal séparé)
bun run dev:admin-gabon-citizen     # http://localhost:3000
bun run dev:admin-gabon             # http://localhost:3003
bun run dev:admin-gabon-backoffice  # http://localhost:3002

# Démarrer toutes les apps en parallèle
bun run dev
```

### Variables d'environnement

Chaque app a son propre `.env.local`. Variables principales :

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | URL du déploiement Convex |
| `CONVEX_SITE_URL` | URL HTTP du site Convex |
| `NEXT_PUBLIC_SITE_URL` | URL de l'app (pour l'auth multi-domaine) |
| `NEXT_PUBLIC_APP_NAME` | `ADMINISTRATION.GA` |
| `NEXT_PUBLIC_DOMAIN_CITIZEN` | `demarche.ga` |
| `NEXT_PUBLIC_DOMAIN_AGENT` | `administration.ga` |
| `NEXT_PUBLIC_DOMAIN_ADMIN` | `admin.administration.ga` |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Telemetry PostHog |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | URL WebSocket LiveKit |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token Mapbox (citizen-web uniquement) |

Variables Convex (backend) à configurer via `bunx convex env set <KEY> <VALUE>` :

| Variable | Description |
|---|---|
| `TRUSTED_ORIGINS` | Origins autorisés pour Better Auth (séparés par virgule) |
| `BETTER_AUTH_SECRET` | Secret pour la session Better Auth |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Credentials LiveKit |
| `RESEND_API_KEY` | Clé API Resend (envoi emails) |
| `BIRD_API_KEY` | Clé API Bird (SMS / WhatsApp) |
| `OPENAI_API_KEY` | iAsted Mode God (sinon UI affiche "vocal indisponible") |
| `GOOGLE_GENAI_API_KEY` | Gemini (Mr Ray, analyse de documents) |
| `ANTHROPIC_API_KEY` | Anthropic (analyse de documents complémentaire) |

### Tests et qualité

```bash
bun run typecheck    # TypeScript strict mode (turbo)
bun run lint         # ESLint (turbo)
bun run format       # Prettier (turbo)
bun run build        # Build de production de toutes les apps
```

---

## Conventions

- **Code** : anglais (variables, fonctions, types, noms de fichiers en kebab-case, composants React en PascalCase)
- **Commentaires** : français
- **UI** : français — utiliser les clés i18n quand disponibles, **jamais** de fallback hardcodé
- **TypeScript** : strict mode partout, jamais `any` sans justification documentée
- **Exports** : named exports préférés aux default exports
- **Styling** : Tailwind CSS, jamais de CSS inline quand Tailwind suffit
- **Composants UI** : Shadcn/UI — JAMAIS modifier `packages/ui/src/components/ui/` directement, créer des wrappers dans `components/shared/` ou `components/custom/`
- **Formulaires** : React Hook Form + Zod pour TOUS les formulaires
- **Toasts** : `sonner` (standard dans tous les projets)
- **Icônes** : `lucide-react` exclusivement
- **Design** : palette achromatique 6 gris + 4 accents (bleu, vert, amber, rose). Couleurs Gabon (vert/jaune/bleu) en décoratif uniquement. Voir [`DESIGN_CHARTER.md`](./DESIGN_CHARTER.md).

Voir [`CLAUDE.md`](./CLAUDE.md) pour les conventions complètes ainsi que les patterns iAsted Mode God et l'extension des modules.

---

## Statut du projet

Le projet a été industrialisé en **9 phases**, toutes complétées. Voir [`docs/MIGRATION_FROM_DIPLOMATIE.md`](./docs/MIGRATION_FROM_DIPLOMATIE.md) pour le détail (PRs, commits, dette résiduelle).

| Phase | Sujet | Statut |
|---|---|---|
| 0 | Fork et bootstrap depuis `gabon-diplomatie` | OK (PR #1) |
| 1 | Modèle organisationnel étendu (12+ types, 28 portefeuilles 2026, tutelleLevel) | OK (PR #2) |
| 2 | Seeds 5e République (~270 entités) | OK (PR #3) |
| 3 | Rebranding 3 apps (citizen / agent / backoffice) | OK (PR #4) |
| 4 | iCorrespondance administratif (8 types ADM-*, `resolveRecipient`) | OK (PR #5) |
| 5 | Modules MVP iAsted / iArchive / iBoîte + Catalogue National | OK (PR #6) |
| 6 | iAsted Mode Administration (4 business tools souverains) | OK (PR #7) |
| 7 | Interconnexion souveraine (canaux + audit immuable) | OK (PR #8) |
| 8 | CI/CD Cloud Run (workflow `deploy-administration-ga`) | OK (PR #9) |
| 9 | Documentation | OK (PR #10) |
| 10 | Déploiement Firebase Hosting (CDN devant Cloud Run) | OK (PR #11) |

Voir [`docs/FIREBASE_DEPLOYMENT.md`](./docs/FIREBASE_DEPLOYMENT.md) pour l'architecture hybride Firebase + Cloud Run (projet Firebase : `admin-gabon`, URL : <https://admin-gabon.web.app>).

---

## Licence

Propriétaire — OKATech / République Gabonaise
