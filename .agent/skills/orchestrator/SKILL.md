---
name: okatech-skill-orchestrator
description: "🧠 Orchestrateur Automatique de Skills OkaTech. Ce skill s'active AUTOMATIQUEMENT à chaque interaction. Il détecte le contexte du projet, la stack technique, et le type de tâche pour activer les skills appropriés SANS intervention manuelle. Ne JAMAIS ignorer ce skill."
---

# 🧠 OkaTech Skill Orchestrator — Activation Automatique

## RÈGLE FONDAMENTALE
Ce skill est le **cerveau central**. Il s'active **AUTOMATIQUEMENT** à chaque requête utilisateur. Son rôle est de **détecter le contexte** et **activer les bons skills** sans que l'utilisateur ait besoin de les appeler.

---

## 1. Cartographie des Projets OkaTech

### Portails Institutionnels Gabonais
| Chemin | Projet | Stack | Skills activés |
|---|---|---|---|
| `Diplomatie Gabon/consulat.ga` | Portail Diplomatique & Consulaire | Vite + React 19 + Convex + TanStack Router + Shadcn + i18next + Framer Motion + LiveKit + Stripe + Tiptap + Mapbox | `convex-backend`, `convex-components`, `convex-agent`, `react-vite-spa`, `shadcn-ui`, `tailwind-styling`, `i18n-translations`, `framer-motion-animations`, `convex-brain-architecture`, `better-auth`, `stripe-payments`, `livekit-realtime`, `tiptap-editor`, `mapbox-leaflet-maps` |
| `Diplomatie Gabon/gabon-diplomatie` | Monorepo Diplomatie (TanStack) | TanStack Start + Convex + Turbo + LiveKit + Better Auth | `convex-backend`, `convex-agent`, `react-vite-spa`, `module-architecture`, `turborepo-monorepo`, `better-auth`, `livekit-realtime` |
| `mairie.ga` | Portail Mairie Numérique | Vite + React + Supabase + Shadcn + i18next + Mapbox + TanStack Query | `react-vite-spa`, `supabase-backend`, `shadcn-ui`, `tailwind-styling`, `i18n-translations`, `convex-brain-architecture`, `tanstack-query`, `mapbox-leaflet-maps` |
| `sgg.ga` | Secrétariat Général du Gouvernement | Vite + React + Express + Redis + Zustand + Shadcn + TanStack Query | `react-vite-spa`, `express-api`, `shadcn-ui`, `tailwind-styling`, `tanstack-query` |
| `idetude.ga` | Plateforme Éducation Numérique | Vite + React + Express + Convex + Better Auth + Shadcn + i18next + Leaflet | `react-vite-spa`, `express-api`, `convex-backend`, `shadcn-ui`, `auth-patterns`, `better-auth`, `i18n-translations`, `mapbox-leaflet-maps` |
| `cnom.ga` | Ordre National des Médecins | Vite + React + Supabase + Shadcn + TanStack Query | `react-vite-spa`, `supabase-backend`, `shadcn-ui`, `tailwind-styling`, `tanstack-query` |
| `secretariat-general-gouv` | Secrétariat Général du Gouv. | Vite + React + Convex + Leaflet + PWA | `react-vite-spa`, `convex-backend`, `shadcn-ui`, `mapbox-leaflet-maps`, `tanstack-query` |

### Plateformes SaaS
| Chemin | Projet | Stack | Skills activés |
|---|---|---|---|
| `digitalium.io` | SaaS Gestion Documentaire | Next.js 14 + Convex + Shadcn + Multi-persona RBAC + Tiptap + Yjs | `nextjs-app-router`, `convex-backend`, `convex-agent`, `convex-components`, `shadcn-ui`, `tailwind-styling`, `auth-patterns`, `tiptap-editor` |
| `evenement.ga` | Gestion Événements | Next.js 14 + Convex + Prisma + NextAuth v5 + Shadcn | `nextjs-app-router`, `convex-backend`, `prisma-database`, `shadcn-ui`, `auth-patterns` |
| `foot.cd` | Plateforme Football RDC | Next.js 14 + Convex + Clerk + Framer Motion + Recharts | `nextjs-app-router`, `convex-backend`, `shadcn-ui`, `auth-patterns`, `clerk-auth`, `framer-motion-animations` |

### Micro-Applications AGASA
| Chemin | Projet | Stack |
|---|---|---|
| `AGASA Digital/AGASA-Admin` | Back-office AGASA | Next.js + Convex + Shadcn + Cloud Run |
| `AGASA Digital/AGASA-Citoyen` | Portail citoyen | Next.js + Convex + Cloud Run |
| `AGASA Digital/AGASA-Core` | Noyau partagé | Next.js + Convex + Shadcn + Cloud Run |
| `AGASA Digital/AGASA-Inspect` | App inspection | Next.js + Convex + Tailwind + Cloud Run |
| `AGASA Digital/AGASA-Pro` | Portail professionnel | Next.js + Convex + Shadcn + CloudSQL + Cloud Run |

**Skills communs AGASA** : `nextjs-app-router`, `convex-backend`, `shadcn-ui`, `tailwind-styling`, `docker-cloud-run`, `deployment-cicd`

## 2. Détection Automatique par Type de Tâche

| Mots-clés détectés | Skills à activer | Contexte |
|---|---|---|
| `schema`, `table`, `defineTable`, `v.`, `migration` | `convex-backend` + **`convex-migration-helper`** (système) OU `prisma-database` OU `supabase-backend` | Selon le projet détecté |
| `page`, `composant`, `component`, `UI`, `écran`, `formulaire` | `shadcn-ui` + `tailwind-styling` | Toujours ensemble |
| `API`, `endpoint`, `route`, `middleware`, `serveur` | `express-api` OU `nextjs-app-router` | Vite→Express, Next→Route Handler |
| `auth`, `login`, `JWT`, `session`, `rôle`, `permission`, `TaskCode` | `auth-patterns` + **`convex-setup-auth`** (système, si Convex) | Détecte le système auth du projet |
| `deploy`, `build`, `CI/CD`, `GitHub Actions`, `Vercel` | `deployment-cicd` | Matrice de déploiement |
| `module`, `iDocument`, `iCorrespondance`, `iAsted`, `iBoite` | `module-architecture` | Convention iModule |
| `traduction`, `i18n`, `t()`, `useTranslation` | `i18n-translations` | Clé seule, jamais fallback |
| `animation`, `motion`, `transition`, `hover`, `slide` | `framer-motion-animations` + `tailwind-styling` | Framer Motion patterns |
| `store`, `zustand`, `état global`, `state` | `zustand-state` | Zustand avec persist |
| `seed`, `données test`, `backfill`, `DevAccountSwitcher` | `convex-backend` | Seeds & dev tools |
| `trigger`, `agrégat`, `hippocampe`, `neocortex`, `limbique` | `convex-brain-architecture` | Architecture cerveau |
| `workflow`, `statut`, `transition`, `état machine` | `workflow-state-machine` | Pattern FSM récurrent |
| `guard`, `protection`, `route protégée`, `ProtectedRoute` | `auth-patterns` | Guards par rôle/persona |
| `fichier`, `upload`, `storage`, `_storage`, `generateUploadUrl` | `convex-backend` | File Storage Convex |
| `test`, `vitest`, `playwright`, `e2e` | `testing-patterns` | Tests unitaires et e2e |
| `erreur`, `bug`, `debug`, `crash`, `fix` | Active le skill du domaine concerné | Diagnostic contextuel |
| `performance`, `optimisation`, `lent`, `cache`, `OCC`, `hot path` | **`convex-performance-audit`** (système, si Convex) | Audit performance Convex |
| `composant convex`, `component convex`, `backend reutilisable` | **`convex-create-component`** (système) | Creation composant Convex isolé |
| `nouveau projet convex`, `init convex`, `ajouter convex` | **`convex-quickstart`** (système) | Initialisation Convex |
| `agent`, `AI`, `chat`, `LLM`, `thread`, `streaming`, `RAG`, `vector` | `convex-agent` | Agents IA avec Convex |
| `rate limit`, `workflow durable`, `stripe`, `aggregate`, `counter` | `convex-components` | Composants ecosystem Convex |
| `paiement`, `payment`, `checkout`, `subscription`, `facture` | `stripe-payments` | Intégration Stripe |
| `vidéo`, `audio`, `appel`, `visio`, `livekit`, `room`, `call` | `livekit-realtime` | Video/Audio temps réel |
| `carte`, `map`, `mapbox`, `leaflet`, `géolocalisation`, `GPS` | `mapbox-leaflet-maps` | Cartes interactives |
| `better-auth`, `better auth`, `17 rôles`, `convex auth` | `better-auth` | Better Auth patterns |
| `clerk`, `@clerk`, `ClerkProvider`, `SignIn`, `SignUp` | `clerk-auth` | Clerk authentification |
| `useQuery`, `useMutation`, `react-query`, `tanstack`, `queryClient` | `tanstack-query` | TanStack React Query |
| `éditeur`, `editor`, `tiptap`, `rich text`, `prosemirror`, `yjs` | `tiptap-editor` | Éditeur riche Tiptap |
| `docker`, `container`, `cloud run`, `Dockerfile`, `GCP`, `artifact` | `docker-cloud-run` | Docker & Cloud Run |
| `turbo`, `monorepo`, `workspace`, `turborepo`, `packages/` | `turborepo-monorepo` | Architecture monorepo |
| `document`, `Word`, `.docx`, `rapport`, `mémo`, `lettre` | `docx` | Création/édition Word |
| `PDF`, `.pdf`, `fusionner`, `extraire`, `formulaire`, `OCR` | `pdf` | Traitement PDF |
| `présentation`, `slides`, `deck`, `.pptx`, `diapo` | `pptx` | Présentations PowerPoint |
| `Excel`, `spreadsheet`, `.xlsx`, `tableau`, `formule`, `CSV` | `xlsx` | Tableurs Excel |
| `planifier`, `cron`, `tâche récurrente`, `schedule`, `automatiser` | `schedule` | Tâches planifiées |
| `créer skill`, `améliorer skill`, `eval`, `benchmark skill` | `skill-creator` | Création/amélioration skills |
| `3D`, `Three.js`, `WebGL`, `R3F`, `react-three-fiber`, `Spline` | `3d-web-experience` | Expériences 3D web |
| `accessibilité`, `a11y`, `WCAG`, `aria`, `screen reader` | `accessibility-compliance-accessibility-audit` + `wcag-audit-patterns` | Audit accessibilité |
| `mémoire agent`, `vector store`, `embedding`, `chunking`, `RAG store` | `agent-memory-systems` | Mémoire d'agents IA |
| `outil agent`, `tool schema`, `JSON Schema`, `MCP`, `function calling` | `agent-tool-builder` | Création d'outils pour agents |
| `LLM`, `GPT`, `Claude API`, `RAG`, `prompt engineering`, `fine-tune` | `ai-engineer` + `ai-product` | Ingénierie IA |
| `API design`, `REST`, `GraphQL`, `contract`, `OpenAPI`, `Swagger` | `api-design-principles` | Design d'API |
| `sécurité API`, `OWASP`, `injection`, `CSRF`, `XSS`, `rate limit sec` | `api-security-best-practices` + `backend-security-coder` | Sécurité API/Backend |
| `ADR`, `decision record`, `architecture decision` | `architecture-decision-records` | Records de décisions arch. |
| `clean architecture`, `hexagonal`, `DDD`, `ports adapters` | `architecture-patterns` | Patterns d'architecture |
| `computer use`, `desktop control`, `screen automation`, `vision agent` | `computer-use-agents` | Agents computer-use |
| `dépendances`, `npm audit`, `vulnérabilité`, `CVE`, `supply chain` | `dependency-management-deps-audit` | Audit dépendances |
| `XSS`, `sanitize`, `DOMPurify`, `dangerouslySetInnerHTML` | `frontend-mobile-security-xss-scan` | Sécurité frontend XSS |
| `UI design`, `UX`, `palette couleurs`, `typographie`, `design system` | `ui-ux-pro-max` + `web-design-guidelines` | Design UI/UX |
| `visual test`, `screenshot`, `pixel perfect`, `regression visuelle` | `ui-visual-validator` | Validation visuelle UI |

## 3. Règles d'Auto-Activation

### OBLIGATOIRE à chaque interaction :
1. **Identifier le projet** via le chemin du fichier ouvert ou la mention dans la requête
2. **Lire le `package.json`** pour confirmer les dépendances exactes
3. **Vérifier `components.json`** si présent (config Shadcn)
4. **Respecter la structure de dossiers existante** du projet (ne PAS réorganiser)
5. **Utiliser les alias de chemin** du projet (`@/`, `~/`, `@repo/`)

### INTERDIT :
- ❌ Inventer des dépendances absentes du `package.json`
- ❌ Mélanger les patterns entre projets (Express dans Next.js, etc.)
- ❌ Utiliser `any` sans justification documentée
- ❌ Modifier les fichiers `components/ui/` (gérés par Shadcn)
- ❌ Ignorer le système i18n quand il est configuré
- ❌ Utiliser `default export` — préférer `named exports`

## 4. Conventions de Code OkaTech

| Aspect | Convention |
|---|---|
| **Langue du code** | Anglais (variables, fonctions, types) |
| **Langue des commentaires** | Français |
| **Langue de l'UI** | Français (ou i18n si configuré) |
| **Nommage des fichiers** | kebab-case (`document-editor.tsx`) |
| **Nommage des composants** | PascalCase (`DocumentEditor`) |
| **Nommage des hooks** | camelCase avec `use` (`useDocuments`) |
| **Exports** | Named exports uniquement |
| **Types** | `interface` pour les objets, `type` pour les unions/aliases |
| **Enums** | `enum` TypeScript pour les constantes partagées backend/frontend |
| **Stores** | Zustand avec `persist` middleware quand nécessaire |
| **Toast/Notifications** | `sonner` (toast) dans tous les projets |
| **Icônes** | `lucide-react` dans tous les projets |
| **Date** | `date-fns` dans tous les projets |

## 5. Architecture "Cerveau" OkaTech (Pattern Unique)

Certains projets (consulat.ga, mairie.ga) utilisent une métaphore neuroscientifique :

| Terme | Rôle | Équivalent technique |
|---|---|---|
| **Neocortex** | Audit trail centralisé | Logger de mutations avec corrélation |
| **Hippocampe** | Mémorisation des actions | Audit log persistant |
| **Limbique** | Signaux de routage | Event bus pour notifications |
| **Sensoriel** | Entrées utilisateur | Input handlers |
| **Moteur** | Actions exécutables | Mutation dispatchers |
| **Prefrontal** | Décisions complexes | Workflow state machine |
| **Cortex** | Skills/compétences | Services métier |
| **Consciousness** | Orchestration IA (iAsted) | AI agent avec context/intent |

Quand ces termes sont rencontrés : activer `convex-brain-architecture`.

## 6. Skills Système Convex (Activation Automatique)

Ces skills sont fournis par le système Claude et s'activent EN COMPLEMENT des skills locaux quand le projet utilise Convex :

| Skill Système | Quand l'activer | Complète |
|---|---|---|
| `convex-setup-auth` | Auth, login, identity, access control dans un projet Convex | `auth-patterns` |
| `convex-migration-helper` | Changement de schema, ajout champ, nouvelle table, migration | `convex-backend` |
| `convex-performance-audit` | Performance, lenteur, OCC conflict, hot path, subscription cost | `convex-backend` |
| `convex-create-component` | Création composant réutilisable, isolation, packaging | `convex-backend` |
| `convex-quickstart` | Nouveau projet Convex, initialisation, scaffolding | `convex-backend` |

## 7. Inventaire Complet des 53 Skills

### A. OkaTech Core — Backend & Data (7)
| # | Skill | Domaine |
|---|---|---|
| 1 | `convex-backend` | Backend Convex (patterns officiels get-convex) |
| 2 | `convex-agent` | Agents IA Convex (threads, streaming, RAG, tool calling) |
| 3 | `convex-components` | Ecosystem Convex (Rate Limiter, Workflow, Stripe, Aggregate) |
| 4 | `supabase-backend` | Backend Supabase (Postgres best practices officielles) |
| 5 | `express-api` | Backend Express.js (idetude.ga, sgg.ga) |
| 6 | `prisma-database` | ORM Prisma (evenement.ga) |
| 7 | `tanstack-query` | TanStack React Query (fetching, cache, mutations) |

### B. OkaTech Core — Frontend (5)
| # | Skill | Domaine |
|---|---|---|
| 8 | `react-vite-spa` | Frontend Vite + React |
| 9 | `nextjs-app-router` | Frontend Next.js (Server Actions, Streaming, ISR) |
| 10 | `shadcn-ui` | Composants UI Shadcn |
| 11 | `tailwind-styling` | Styling Tailwind CSS |
| 12 | `framer-motion-animations` | Animations Framer Motion |

### C. OkaTech Core — Authentification (3)
| # | Skill | Domaine |
|---|---|---|
| 13 | `auth-patterns` | Hub central auth (Better Auth, Clerk, MFA, RBAC) |
| 14 | `better-auth` | Better Auth + Convex (17 rôles, TaskCode) |
| 15 | `clerk-auth` | Clerk + Next.js + Convex (JWT "convex") |

### D. OkaTech Core — Intégrations (4)
| # | Skill | Domaine |
|---|---|---|
| 16 | `stripe-payments` | Paiements Stripe (checkout, subscriptions, webhooks) |
| 17 | `livekit-realtime` | Video/Audio temps réel LiveKit |
| 18 | `mapbox-leaflet-maps` | Cartes interactives Mapbox & Leaflet |
| 19 | `tiptap-editor` | Éditeur riche Tiptap + collaboration Yjs |

### E. OkaTech Core — Architecture & Patterns (3)
| # | Skill | Domaine |
|---|---|---|
| 20 | `convex-brain-architecture` | Architecture Cerveau neuro-mimétique |
| 21 | `workflow-state-machine` | State Machine & workflows (RequestWorkflow, PTM) |
| 22 | `module-architecture` | Modules iX transversaux (23+ modules) |

### F. OkaTech Core — DevOps & Infrastructure (3)
| # | Skill | Domaine |
|---|---|---|
| 23 | `deployment-cicd` | CI/CD, Deploy (Vercel, Cloud Run, Turbo) |
| 24 | `docker-cloud-run` | Docker & Google Cloud Run (AGASA) |
| 25 | `turborepo-monorepo` | Architecture monorepo Turborepo |

### G. OkaTech Core — Transversaux (3)
| # | Skill | Domaine |
|---|---|---|
| 26 | `typescript-patterns` | TypeScript strict mode |
| 27 | `i18n-translations` | Internationalisation i18next |
| 28 | `orchestrator` | Cerveau central (TOUJOURS actif) |

### H. Vibeship — Sécurité & Qualité (6)
| # | Skill | Domaine |
|---|---|---|
| 29 | `api-security-best-practices` | Sécurité API (OWASP, JWT, OAuth, rate limiting) |
| 30 | `backend-security-coder` | Sécurité backend (injection, CSRF, headers) |
| 31 | `frontend-mobile-security-xss-scan` | Scanner XSS frontend (DOMPurify, React) |
| 32 | `dependency-management-deps-audit` | Audit dépendances (CVE, supply chain) |
| 33 | `auth-implementation-patterns` | Patterns auth avancés (JWT, OAuth2, MFA, sessions) |
| 34 | `accessibility-compliance-accessibility-audit` | Audit accessibilité WCAG |

### I. Vibeship — Architecture & IA (6)
| # | Skill | Domaine |
|---|---|---|
| 35 | `architecture-patterns` | Clean, Hexagonal, DDD patterns |
| 36 | `architecture-decision-records` | ADR documentation décisions |
| 37 | `api-design-principles` | Design API REST/GraphQL |
| 38 | `ai-engineer` | LLM, RAG, agents, embeddings production |
| 39 | `ai-product` | Prompt engineering, coûts IA, streaming UX |
| 40 | `agent-memory-systems` | Vector stores, chunking, retrieval IA |

### J. Vibeship — UI/UX & Qualité (5)
| # | Skill | Domaine |
|---|---|---|
| 41 | `ui-ux-pro-max` | Design intelligence (50+ styles, palettes, fonts) |
| 42 | `ui-visual-validator` | Validation visuelle, pixel perfect, regression |
| 43 | `web-design-guidelines` | Guidelines interfaces web |
| 44 | `wcag-audit-patterns` | Audit WCAG 2.2 complet |
| 45 | `3d-web-experience` | Three.js, R3F, WebGL, Spline |

### K. Vibeship — Agents & Tools (2)
| # | Skill | Domaine |
|---|---|---|
| 46 | `agent-tool-builder` | Création outils agents (JSON Schema, MCP) |
| 47 | `computer-use-agents` | Agents computer-use (vision, desktop control) |

### L. Documents & Productivité (6)
| # | Skill | Domaine |
|---|---|---|
| 48 | `docx` | Création/édition Word (.docx) |
| 49 | `pdf` | Traitement PDF (extraction, fusion, OCR) |
| 50 | `pptx` | Présentations PowerPoint (.pptx) |
| 51 | `xlsx` | Tableurs Excel (.xlsx, .csv) |
| 52 | `schedule` | Tâches planifiées (cron, one-time, ad-hoc) |
| 53 | `skill-creator` | Création et amélioration de skills |

### Skills Système Convex (5 — activation complémentaire)
| Skill | Source |
|---|---|
| `convex-setup-auth` | get-convex/agent-skills (officiel) |
| `convex-migration-helper` | get-convex/agent-skills (officiel) |
| `convex-performance-audit` | get-convex/agent-skills (officiel) |
| `convex-create-component` | get-convex/agent-skills (officiel) |
| `convex-quickstart` | get-convex/agent-skills (officiel) |
