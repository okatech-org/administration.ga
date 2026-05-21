# Architecture technique — ADMINISTRATION.GA

> **Cible :** développeurs et architectes qui interviennent sur le monorepo.
> **Pré-requis :** lire [`../README.md`](../README.md) et [`../CLAUDE.md`](../CLAUDE.md) avant d'approfondir.
> **Maintenu :** mai 2026 (post-Phase 9).

---

## 1. Vue d'ensemble

ADMINISTRATION.GA est un **monorepo Turborepo** composé de :

- 3 applications [Next.js 14](https://nextjs.org) (citizen-web, agent-web, backoffice-web) servant 3 audiences distinctes.
- 1 application [Electron](https://www.electronjs.org) optionnelle (agent-desktop, en alpha).
- 1 backend [Convex](https://convex.dev) unique et partagé entre toutes les apps.
- ~16 packages workspace partagés (UI, i18n, hooks LiveKit/chat, agent-features, etc.).

Le backend Convex porte la totalité du modèle de données, de la logique métier, de l'authentification (via Better Auth) et des intégrations externes (LiveKit, OpenAI, Gemini, Anthropic, Resend, Bird, PostHog). Les 3 apps Next.js sont purement présentationnelles : elles consomment l'API Convex au travers du `AppConvexProvider` exposé par `@workspace/api`.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               BROWSER / DEVICE                                   │
│                                                                                  │
│  citizen-web (demarche.ga)   agent-web (administration.ga)   backoffice-web      │
│         ↓                            ↓                              ↓            │
│   ConvexReactClient  ←—————— @workspace/api ——————→   ConvexReactClient          │
└────────────────────────────────────│─────────────────────────────────────────────┘
                                     ↓ WebSocket / HTTPS
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CONVEX BACKEND                                      │
│                                                                                  │
│  schemas/  │  functions/  │  ai/  │  lib/  │  seeds/  │  migrations/  │  crons/  │
│                                                                                  │
│  Better Auth (OTP, OAuth IDN, multi-domaine)                                     │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ Intégrations : LiveKit · OpenAI Realtime · Gemini · Anthropic · Resend ·   │  │
│  │                Bird (SMS) · PostHog · Mapbox                               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Structure du monorepo

```
administration.ga/
├── apps/
│   ├── citizen-web/        # Portail citoyen (Next.js 14, App Router)
│   ├── agent-web/          # Poste de travail agent (Next.js 14, App Router)
│   ├── backoffice-web/     # Back-office souverain (Next.js 14, App Router)
│   └── agent-desktop/      # App Electron (alpha)
├── packages/
│   ├── api/                # AppConvexProvider, hooks auth, client Better Auth
│   ├── ui/                 # ~45 composants shadcn/ui + tokens CSS
│   ├── i18n/               # Provider i18next + traductions FR/EN
│   ├── shared/             # Types, constantes et utilitaires partagés
│   ├── livekit/            # room-options · use-livekit-disconnect-guard · use-ringtone
│   ├── chat/               # use-idempotency-key · use-chat-attachments · safe-markdown
│   ├── iasted/             # Sphère 3D + CircleMenu + use-realtime-voice
│   ├── document-editor/    # Éditeur Tiptap partagé
│   ├── document-rendering/ # Génération PDF / DOCX / PPTX
│   ├── agent-features/     # iDocument · iProfil · team · settings (cross-apps)
│   ├── posthog-shared/     # Provider PostHog + helpers events
│   ├── routing/            # Routes typées partagées
│   ├── settings-form/      # Form schemas (Zod) réutilisables
│   ├── map/                # Wrapper Mapbox / Leaflet
│   ├── desktop-shared/     # Utilitaires Electron
│   └── tsconfig/           # Configs TypeScript de base (base.json, react.json)
├── convex/                 # Backend (cf. §3)
├── .github/workflows/      # CI/CD GitHub Actions
└── ADMINISTRATION.GA/      # Référentiels métier (institutions, iCorrespondance, projet)
```

### Alias d'import

Tous les packages sont importés via `@workspace/<nom>` :

```ts
import { Button } from "@workspace/ui/components/button";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useChatAttachments } from "@workspace/chat/use-chat-attachments";
import { useT } from "@workspace/i18n";
```

Pour les fichiers internes à une app, l'alias est `@/` :

```ts
// dans apps/citizen-web/src/...
import { CitizenSidebar } from "@/components/shared/citizen-sidebar";
```

---

## 3. Backend Convex

Tout vit sous `convex/`. Les sous-dossiers les plus structurants :

| Dossier | Rôle |
|---|---|
| `convex/_generated/` | Auto-généré par Convex. **JAMAIS modifier**. |
| `convex/schemas/` | Définitions de tables (`defineTable`), indexes, validators. |
| `convex/functions/` | `query` / `mutation` métier exposés aux apps. |
| `convex/actions/` | Actions Node.js (appels externes : LiveKit, IA, emails). |
| `convex/ai/` | Tout iAsted : prompt, registry des tools, dispatcher, stores. |
| `convex/lib/` | Helpers (`customFunctions`, `validators`, `permissions`, `roles`, `taskCodes`, `moduleCodes`, `requestWorkflow`). |
| `convex/seeds/` | Seeds idempotentes pour le dev (5e République, services, utilisateurs). |
| `convex/migrations/` | Migrations idempotentes (backfills, renommages, ajout de champs). |
| `convex/betterAuth/` | Configuration Better Auth (OTP, OAuth IDN, multi-domaine). |
| `convex/crons/` | Tâches récurrentes (`iasted-realtime-keep-warm`, etc.). |
| `convex/tests/` | Tests unitaires Convex (Vitest). |

### Custom functions (pattern OkaTech)

Tout `query` / `mutation` exposé aux apps DOIT être déclaré avec les wrappers de `convex/lib/customFunctions.ts` :

```ts
import { authQuery, authMutation, authAction } from "../lib/customFunctions";
```

Ces wrappers injectent automatiquement :
- l'identité Better Auth (`ctx.auth.getUserIdentity()`),
- l'utilisateur applicatif (`ctx.user`),
- la membership active (`ctx.membership`),
- les helpers de check de TaskCode (`ctx.assertTask(code)`).

Importer directement depuis `convex/_generated/server` est **interdit** (RBAC bypass).

---

## 4. Modèle organisationnel

Le cœur du modèle est la table `orgs` (organisations). Phase 1 a étendu le modèle pour couvrir toute l'architecture institutionnelle de la 5e République gabonaise (cf. [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md)).

### 4.1 OrganizationType (12 administratifs + 8 diplomatiques héritage)

Source : `convex/lib/validators.ts` → `orgTypeValidator` (cf. `OrgType` dans `convex/lib/constants.ts`).

**Administration nationale (Phase 1) :**

| Type | Usage |
|---|---|
| `presidency` | Présidence de la République |
| `vice_presidency` | Vice-Présidence de la République |
| `government` | Vice-Présidence du Gouvernement (alias "Primature") |
| `ministry` | Ministère (existait déjà) |
| `delegated_ministry` | Ministère délégué (ex: Budget) |
| `directorate_general` | Direction Générale (DGI, DGDDI, DGDI, etc.) |
| `public_establishment` | Établissement public (CHUL, ANPN, CNAMGS, etc.) |
| `national_agency` | Agence nationale |
| `independent_authority` | AAI (HAC, CGE, ARCEP, ARSEE, CNPDCP, etc.) |
| `parliament_chamber` | Assemblée nationale / Sénat |
| `supreme_court` | Cour Constitutionnelle / Cassation / Conseil d'État / Cour des Comptes |
| `consultative_institution` | CESEC, Médiateur de la République, CNDH |
| `local_authority` | Gouvernorat / Préfecture / Mairie / Conseil départemental |

**Représentations diplomatiques (héritage, conservées) :**

`embassy`, `consulate`, `consulate_general`, `permanent_mission`, `high_commission`, `high_representation`, `honorary_consulate`, `intelligence_agency`. Ces types restent valides pour interopérabilité avec le ministère des Affaires Étrangères.

### 4.2 MinistrySubType (28 portefeuilles 2026)

Les sous-types couvrent les 28 portefeuilles du gouvernement Oligui Nguema II (1er janvier 2026) : `defense`, `interior_security`, `economy_finance`, `budget` (délégué), `foreign_affairs`, `justice`, `oil_gas`, `mines`, `water_energy`, `agriculture`, `fisheries_sea`, `forest_environment`, `health`, `education`, `higher_education`, `transport_logistics`, `public_works`, `housing_urbanism`, `industry`, `commerce_sme`, `digital_economy`, `civil_service`, `labor_employment`, `social_affairs`, `youth_sports_culture`, `tourism_crafts`, `media_communication`, `planning_prospective`, `reforms_institutional_relations`.

Les valeurs legacy (`foreign_affairs`, `justice`, `finance`, `interior`, `other`) sont conservées pour compatibilité.

### 4.3 tutelleLevel (Phase 1)

Champ `tutelleLevel: 0 | 1 | 2 | 3` ajouté sur `orgs` pour matérialiser le niveau hiérarchique :

| Niveau | Sens |
|---|---|
| 0 | Souverain (Présidence, Vice-Présidence, Parlement, Juridictions, Institutions consultatives, AAI) |
| 1 | Ministère / Vice-Présidence du Gouvernement / Collectivité (province, préfecture, mairie) |
| 2 | Direction Générale rattachée à un ministère via `parentOrgId` |
| 3 | Établissement public / Service / Bureau d'ordre rattaché à une DG ou à un ministère |

Le helper `getOrgsByTutelle(parentOrgId)` retourne la hiérarchie filtrée par parent. Une migration idempotente (`backfillTutelleLevel.ts`) pose le niveau par défaut sur les orgs existantes.

### 4.4 Modules par type d'organisation

Le mapping `ORG_TYPE_MODULE_MAP` (dans `convex/lib/moduleCodes.ts`) définit la liste des modules pré-éligibles pour chaque type d'organisme. Les administrations nationales héritent par défaut du noyau iCorrespondance / iDocument / iAgenda / iBoîte / iArchive / iAsted.

---

## 5. Catalogue des modules (19 modules cibles)

Source : `convex/lib/moduleCodes.ts` → `MODULE_REGISTRY` + `SIDEBAR_MODULE_GROUPS`.

Chaque module se décompose en `capabilities` (sous-domaines) et expose 3 niveaux d'accès (`reader`, `editor`, `admin`) qui se résolvent en TaskCodes atomiques via `MODULE_ACCESS_TASKS`.

### 5.1 Operations

| Code | Label | Description |
|---|---|---|
| `profile` | iProfil | Profil métier et accréditations |
| `diplomatic_affairs` | Affaires Diplomatiques | Pipeline diplomatique, briefings, opérateurs cibles |
| `consular_affairs` | Affaires Consulaires | Demandes, profils citoyens, passeports, visas, état civil |
| `news` | Actualités | Publications, notifications, tutoriels |
| `community` | Communauté | Associations, entreprises, événements |

### 5.2 iBureau

| Code | Label | Description |
|---|---|---|
| `correspondence` | iCorrespondance | Courriers officiels et démarches administratives |
| `documents` | iDocument | Gestion, génération, signature des documents officiels |
| `calendar` | iAgenda | Planification des rendez-vous et agenda |
| `messaging` | iCom | Chat, appels, réunions en ligne |

### 5.3 Noyau administratif (Phase 1)

| Code | Label | Description |
|---|---|---|
| `iasted` | iAsted | Assistant IA institutionnel — RAG sur documents autorisés |
| `iarchive` | iArchive | Archive longue durée — rétention, verrouillage, audit immuable |
| `iboite` | iBoîte | Messagerie institutionnelle informelle — inbox, accusés |

### 5.4 Gestion

| Code | Label | Description |
|---|---|---|
| `team` | Équipe | Gestion membres, postes, rôles, permissions |
| `statistics` | Statistiques | Dashboards, monitoring, KPI |

### 5.5 Administration

| Code | Label | Description |
|---|---|---|
| `settings` | Paramètres | Configuration org, services, plateforme |

### 5.6 Réseau (ministry-only)

| Code | Label | Description |
|---|---|---|
| `network_diplomatic_oversight` | Pipeline réseau | Vue consolidée du pipeline des orgs rattachés |
| `network_correspondence_oversight` | Correspondance réseau | Courriers du réseau, lecture seule |
| `network_intelligence` | Intelligence réseau | Dashboard exécutif + KPI agrégés |

### 5.7 Intelligence (intelligence_agency-only)

| Code | Label | Description |
|---|---|---|
| `intelligence` | Renseignement | Profils, notes confidentielles, cartographie, dossiers |

---

## 6. iAsted — Mode God + Mode Administration

iAsted est l'agent vocal IA temps réel qui couvre toutes les surfaces (citizen, agent, backoffice).

### 6.1 Architecture des 3 couches

1. **Registry** (`convex/ai/realtimeTools.ts`) — déclare chaque tool (`BUSINESS_TOOLS`) avec :
   - `requiredTask` (TaskCode pour gating RBAC)
   - `superadminOnly` (vrai pour les actions souveraines)
   - `surfaceOnly` (`"agent" | "backoffice"` ou non défini = toutes les surfaces)
   - `tool` (signature JSON Schema OpenAI Realtime)
2. **Dispatcher** (`convex/ai/realtimeToolExecutor.ts`) — implémente l'exécution :
   - re-vérifie auth + RBAC en runtime
   - appelle la mutation/query Convex existante via `ctx.runMutation` / `ctx.runQuery`
   - retourne un `RealtimeToolResult` (`success`, `message`, optionnellement `uiAction` et `data`)
   - re-mappe les erreurs Convex (CANNOT_REMOVE_SELF, INSUFFICIENT_PERMISSIONS) en messages parlants
3. **System prompt** (`convex/ai/iastedRealtimePrompt.ts`) — annonce la capacité :
   - quand utiliser l'outil
   - règles de confirmation orale (simple recap, double confirmation pour actions destructives)
   - paramètres attendus + ordre canonique (find_contact AVANT launch_call, etc.)

### 6.2 Mode Administration (Phase 6)

Le prompt inclut une section `CAPACITES D'ADMINISTRATION` qui active 4 business tools souverains :

- `iasted_list_institutions` — lister les institutions par type / ministrySubType / tutelleLevel
- `iasted_describe_institution` — décrire une institution (titulaire, hiérarchie, services)
- `iasted_list_correspondance_admin` — lister les correspondances administratives d'une org
- `iasted_send_sovereign_message` — envoyer un message via un canal souverain (double confirmation obligatoire)

### 6.3 Variables d'environnement

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Requise. Sans elle l'UI affiche "vocal indisponible". |
| `IASTED_AB_FORCE_MODEL` | `gpt-realtime-mini` \| `gpt-realtime`. Force tous les users sur ce modèle (QA). |
| `IASTED_AB_PERCENT_FULL` | 0-100. % d'users servis avec le grand modèle. Hash déterministe sur userId. |
| `IASTED_VAD_MODE` | `semantic_vad` (sinon `server_vad` par défaut). |

Le cron `iasted-realtime-keep-warm` ping `keepAliveNodeRuntime` toutes les 4 min pour éviter le cold-start de l'isolate Node.

### 6.4 Sécurité et garde-fous

- Auth + RBAC re-vérifiés à l'exécution dans le dispatcher (pas de confiance au prompt).
- Préférer une mutation Convex existante AVEC ses guards (self-action, rank hierarchy, SuperAdmin protection) plutôt que des contrôles manuels.
- Toute action destructive a une **double confirmation orale obligatoire** annoncée dans le prompt.
- Audit log automatique : `auditLog` + `aiActivityLog` alimentés pour toute action mutative.

Voir [`../CLAUDE.md`](../CLAUDE.md) §"Etendre l'agent vocal iAsted (Mode God)" pour la procédure d'ajout d'un nouveau tool.

---

## 7. Authentification — Better Auth

Source : `convex/betterAuth/auth.ts`, `convex/betterAuth/*`.

### 7.1 Stack

[Better Auth](https://better-auth.com) en mode **minimal**, intégré à Convex via [`@convex-dev/better-auth`](https://www.npmjs.com/package/@convex-dev/better-auth). Plugins activés :

- `emailOTP` — code OTP par email (via Resend)
- `phoneNumber` — code OTP par SMS (via Bird)
- `genericOAuth` — IDN (Identité Numérique gouvernementale) en OAuth
- `convex` + `crossDomain` — partage de session entre `demarche.ga`, `administration.ga`, `admin.administration.ga`

### 7.2 Multi-domaine

- **Server-side** : `baseURL` omis intentionnellement, Better Auth infère depuis la requête.
- **Client-side** : `window.location.origin` utilisé dynamiquement.
- **`TRUSTED_ORIGINS`** : variable d'env Convex contenant la liste des origines autorisées (séparées par virgule).
- Chaque app a son `auth-server.ts` qui proxy les requêtes auth vers Convex.

Pour ajouter un nouveau domaine, mettre à jour `TRUSTED_ORIGINS` sur Convex (dev et prod) :

```bash
bunx convex env set TRUSTED_ORIGINS "https://demarche.ga,https://administration.ga,https://admin.administration.ga,..."
```

### 7.3 RBAC — TaskCode + ModuleCode

Le RBAC est à 3 niveaux :

1. **TaskCode** (`convex/lib/taskCodes.ts`) — atome de permission (`requests.view`, `documents.sign`, `intelligence.profiles.export`, etc.).
2. **ModuleCode** (`convex/lib/moduleCodes.ts`) — module top-level avec 3 niveaux d'accès (`reader`/`editor`/`admin`) qui se résolvent en TaskCodes via `MODULE_ACCESS_TASKS`.
3. **Position** (`convex/lib/roles.ts`) — poste qui agrège plusieurs modules + niveaux d'accès.

Une membership porte la liste des modules + niveaux d'accès de l'utilisateur sur une org donnée. Le helper `resolveTaskCodesFromModuleAccess(moduleAccess)` calcule le `Set<string>` des TaskCodes effectifs.

---

## 8. iCorrespondance — Workflow administratif (Phase 4)

Source : `convex/functions/correspondance*.ts`, `convex/schemas/correspondance.ts`, `convex/lib/correspondanceHelpers.ts`. Spec fonctionnelle dans [`../ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md`](../ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md).

### 8.1 Schémas de référence

Trois familles paramétrables par TypeDemarche :

- **DEM** : `DEM/{annee}/{categorie}/{seq}` — démarches citoyennes (ex: `DEM/2026/NAT/007`)
- **ADM** : `ADM/{annee}/{orgEmetteur}/{seq}` — interne admin (ex: `ADM/2026/CONS-PAR/142`)
- **INST/NV** : `NV/{annee}/{axe}/{seq}` — diplomatique (ex: `NV/2026/GAB-FR/001`)

Phase 4 a ajouté 8 types ADM-* couvrant les correspondances administratives internes (note de service, lettre officielle, transmission, accusé, etc.).

### 8.2 Workflow (statuts + transitions)

- **Statuts dossier :** `brouillon | en_cours | en_attente | suspendu | cloture_positive | cloture_negative | cloture_administrative`
- **Statuts étape :** `a_venir | en_cours | complete | renvoi | saute`
- **Transitions clés :** créer → constituer → transmettre (bloqué si pièces manquantes) → traiter → valider/renvoyer/suspendre → clôturer (irréversible)

### 8.3 Copie lecture seule

À chaque transmission, le dossier actif quitte l'organisme. Une entité `CopiePassage` est créée avec le snapshot complet du dossier au moment de la transmission, marquée "COPIE — Passage le [date]", non-modifiable. Droits copie/impression paramétrables par rôle/étape.

### 8.4 resolveRecipient (Phase 4)

Helper qui résout un destinataire à partir d'un `(orgSlug, roleSlug?)` :

```ts
resolveRecipient(orgSlug: string, roleSlug?: string): {
  userId?: Id<"users">;
  serviceId?: Id<"orgServices">;
  orgEntryPointId?: Id<"orgs">;
}
```

Comportement :
- compte utilisateur = contact direct
- service = routage vers le responsable du service (paramétrable, fallback délégation si absent)
- administration/organisme = point d'entrée (secrétariat/bureau d'ordre/accueil)
- résolution depuis l'organigramme enregistré

### 8.5 Audit immuable

Table `journalAction` : `dossierId`, `utilisateurId`, `action` (`creation|transmission|signature|renvoi|consultation|impression`), `detail`, `horodatage`, `adresseIP`. Commentaires immuables (correctifs additionnels seulement). Consultation des dossiers `confidentiel|secret` obligatoirement tracée.

---

## 9. Interconnexion souveraine (Phase 7)

Source : `convex/schemas/sovereignChannels.ts`, `convex/functions/sovereignChannels.ts`, `convex/migrations/seedSovereignChannels.ts`.

### 9.1 Modèle

Un **canal souverain** matérialise un lien de communication formel entre deux orgs souveraines (orgAId ↔ orgBId), avec :

- une liste des **classifications autorisées** (`public | interne | confidentiel | secret`)
- un flag **accusé de réception** obligatoire
- un flag **horodatage qualifié** obligatoire
- une option **signature électronique** du chef de poste

Le slug est calculé de manière lexicographique sur les deux endpoints (ordre A < B) pour garantir l'idempotence des seeds.

### 9.2 Audit immuable

La table `sovereignChannelEvents` journalise tous les évènements (`sent | received | opened | acknowledged | error`) avec :

- routage (`fromOrgId`, `toOrgId`, `byUserId`, `byMembershipId`)
- classification effective du message
- timestamp + détail + metadata libre

Index `by_channel_timestamp` pour la lecture chronologique d'un canal, `by_correspondance` pour reconstituer l'historique d'un courrier.

### 9.3 Canaux pré-câblés

La migration `seedSovereignChannels.ts` pré-câble les canaux explicites mentionnés dans la spec :

- `Presidence ↔ Vice-Présidence du Gouvernement` (alias "Primature")
- `Presidence ↔ Assemblée Nationale`
- `Presidence ↔ Sénat`
- `SGG ↔ Ministères`

### 9.4 Périmètre MVP

Pas d'UI dédiée en Phase 7 : les canaux sont consommés par les modules iCorrespondance et iBoîte pour matérialiser les flux inter-institutions et bloquer/autoriser une transmission selon la classification du dossier.

---

## 10. Packages partagés — Modules de communication

Source : [`../CLAUDE.md`](../CLAUDE.md) §"Utilitaires partages — Modules de communication".

### 10.1 `@workspace/livekit`

| Export | Rôle |
|---|---|
| `room-options` → `LIVEKIT_CALL_ROOM_OPTIONS` | Simulcast VP9 (180p/360p/720p), adaptiveStream, dynacast, audio 48 kHz mono. À passer en prop `options=` de TOUT `<LiveKitRoom>`. |
| `use-livekit-disconnect-guard` | Empêche la fermeture prématurée d'un appel sur un `onDisconnected` émis AVANT le premier `onConnected` (handshake WebRTC, StrictMode, ICE restart). |
| `use-ringtone` | Hook Web Audio qui génère la sonnerie dual-tone sans asset. |

### 10.2 `@workspace/chat`

| Export | Rôle |
|---|---|
| `use-idempotency-key` | `crypto.randomUUID()` stable par intent d'envoi, reset sur success. À passer dans `sendMessage({ ..., idempotencyKey })` pour dédupliquer côté backend. |
| `use-chat-attachments` | State local + validation client (taille 50 Mo, MIME) pour les fichiers joints. Retourne `addFiles/remove/clear/consumeForUpload`. |
| `safe-markdown` → `<SafeMarkdown>` | Wrapper `react-markdown` avec `rehype-sanitize` strict. À utiliser pour tout contenu généré par Mr Ray / iAsted IA / utilisateurs. |

### 10.3 Décisions de non-extraction

Trois items du plan d'audit n'ont PAS été extraits dans les packages partagés — voir [`../CLAUDE.md`](../CLAUDE.md) §"Decisions de non-extraction" pour les justifications :

- `useMeeting` reste per-app (3 copies identiques)
- `ChatComposer` reste per-app (UX trop différentes entre Citizen/Agent/Backoffice)
- `tsconfig paths` non modifiés (le champ `exports` du `package.json` suffit)
- `AddressWithAutocomplete` reste per-app (à adapter aux provinces/départements/communes gabonaises en Phase 3)

---

## 11. Conventions de code

| Domaine | Règle |
|---|---|
| Code | Anglais (variables, fonctions, types, fichiers kebab-case, composants PascalCase) |
| Commentaires | Français |
| UI | Français — clés i18n quand disponibles, jamais de fallback hardcodé |
| TypeScript | Strict mode partout, jamais `any` sans justification documentée |
| Exports | Named exports préférés aux default exports |
| Styling | Tailwind CSS — jamais de CSS inline quand Tailwind suffit |
| Composants UI | shadcn/ui — JAMAIS modifier `packages/ui/src/components/ui/` directement, créer des wrappers dans `components/shared/` ou `components/custom/` |
| Formulaires | React Hook Form + Zod pour TOUS les formulaires |
| Toasts | `sonner` (standard) |
| Icônes | `lucide-react` exclusivement |
| Design | Palette achromatique 6 gris + 4 accents (bleu/vert/amber/rose). Couleurs Gabon en décoratif uniquement. Voir [`../DESIGN_CHARTER.md`](../DESIGN_CHARTER.md). |

---

## 12. Fichiers protégés

NE JAMAIS modifier directement :

- `.env*` (sauf `.env.example`) — secrets
- `packages/ui/src/components/ui/*` — généré par shadcn, créer des wrappers
- `convex/_generated/*` — auto-généré par Convex (`bunx convex codegen`)
- `node_modules/` — géré par Bun
- `bun.lock` — modifier via `bun add/remove` uniquement
- `.git/` — géré par Git

---

## 13. Pour aller plus loin

- [`./MIGRATION_FROM_DIPLOMATIE.md`](./MIGRATION_FROM_DIPLOMATIE.md) — histoire de la migration depuis `gabon-diplomatie`
- [`./GOUVERNANCE.md`](./GOUVERNANCE.md) — modèle de gouvernance, RBAC, classifications
- [`./REFERENTIEL_INSTITUTIONS.md`](./REFERENTIEL_INSTITUTIONS.md) — index institutionnel + règle de non-invention
- [`./iasted-posthog-dashboard.md`](./iasted-posthog-dashboard.md) — télémétrie iAsted
- [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) — slugs canoniques + glossaire des sigles
- [`../CLAUDE.md`](../CLAUDE.md) — conventions complètes + procédures iAsted Mode God
