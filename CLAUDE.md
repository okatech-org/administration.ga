<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Projet ADMINISTRATION.GA

ADMINISTRATION.GA est la plateforme de digitalisation de l'administration publique gabonaise. Elle est le pendant **administratif** du monorepo `gabon-diplomatie` : là où ce dernier gère les représentations diplomatiques et les démarches consulaires depuis l'étranger, ADMINISTRATION.GA gère les administrations gabonaises (Présidence, Vice-Présidence, ministères, directions générales, établissements publics, AAI, parlement, juridictions, collectivités locales) et les démarches administratives des citoyens et entreprises sur le territoire national.

Le socle technique est **IDENTIQUE** à `gabon-diplomatie` (Turborepo + Convex + Next.js 14 + Better Auth + LiveKit + Tiptap). Seuls le domaine métier, le modèle organisationnel et la terminologie changent.

### Mapping métier (terminologie)

| Concept `gabon-diplomatie` | Concept `administration.ga` |
|---|---|
| Représentation diplomatique | Administration publique |
| Ambassade | Ministère / Institution souveraine |
| Consulat / Consulat général | Direction générale / Guichet administratif local |
| Section consulaire | Service / Bureau d'ordre |
| Ressortissant | Citoyen / Usager / Entreprise |
| Démarche consulaire | Démarche administrative |
| Juridiction consulaire | Ressort territorial (province / département / commune) |
| Ambassadeur / Chef de mission | Ministre / Directeur général / Responsable |

### Mapping des apps

| Source `gabon-diplomatie` | Cible `administration.ga` | URL prod | Port dev |
|---|---|---|---|
| `apps/agent-web` (diplomate.ga) | `apps/agent-web` (administration.ga) | `administration.ga` | 3003 |
| `apps/backoffice-web` | `apps/backoffice-web` | `admin.administration.ga` | 3002 |
| `apps/citizen-web` (consulat.ga) | `apps/citizen-web` (demarche.ga) | `demarche.ga` | 3000 |
| `apps/agent-desktop` | `apps/agent-desktop` | — | — |

### Variables d'environnement de domaine

- `NEXT_PUBLIC_APP_NAME=ADMINISTRATION.GA`
- `NEXT_PUBLIC_DOMAIN_CITIZEN=demarche.ga`
- `NEXT_PUBLIC_DOMAIN_AGENT=administration.ga`
- `NEXT_PUBLIC_DOMAIN_ADMIN=admin.administration.ga`

### Documents de référence (lecture obligatoire avant tout travail métier)

1. **[`ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](./ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md)** — référentiel exhaustif des 28 ministères, ~110 DG, ~80 établissements publics, AAI, parlement, juridictions, collectivités locales.
2. **[`ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md`](./ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md)** — spécification fonctionnelle universelle du module iCorrespondance (DEM/ADM/INST, workflow, copies lecture seule, audit).
3. **[`ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md`](./ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md)** — vision cible globale (7 modules du noyau, canaux souverains, gouvernance Admin Système vs Admin Institution).
4. **[`ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](./ADMINISTRATION.GA/SYNTHESE_REFERENCES.md)** — synthèse opérationnelle (slugs, ministrySubType, glossaire des sigles, points d'arbitrage).
5. **[`DESIGN_CHARTER.md`](./DESIGN_CHARTER.md)** — charte graphique neumorphique Soft UI conservée (cf. section ci-dessous).

### Règle critique : ne JAMAIS inventer

Toute donnée métier (titulaire, libellé officiel, compétence, organigramme, tutelle) DOIT être vérifiée dans `ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`. En cas d'ambiguïté, lever une question d'arbitrage AVANT d'écrire — ne jamais combler par inférence.

## Design System

Ce projet conserve la **Charte Graphique Consulat.ga** (palette achromatique 6 gris + 4 accents, neumorphisme Soft UI, identité Gabon en décoratif). La charte est applicable telle quelle à l'administration nationale, le branding étant tout aussi institutionnel.

- **Charte complete :** [`DESIGN_CHARTER.md`](./DESIGN_CHARTER.md) — reference authoritative du design
- **Tokens CSS :** `packages/ui/src/styles/globals.css` — variables OKLCh, ombres, radius
- **Utilitaires :** `apps/citizen-web/src/app/globals.css` — classes `.neu-*`, `.gabon-*`, animations
- **Reference vivante :** Pages `/my-space/*` du citizen-web
- **Skill :** `consulat-design-system` — active automatiquement pour les taches design/UI

### Regles design critiques

- Palette achromatique 6 gris + 4 accents (bleu, vert, amber, rose)
- Couleurs Gabon (vert/jaune/bleu) = decoratif uniquement (stripes, tints)
- JAMAIS de couleurs Tailwind brutes (blue-500, green-100, etc.)
- JAMAIS de gradient colore pour les fonds de section hero
- Ombres toujours achromatiques
- Icones : lucide-react exclusivement

## Utilitaires partages — Modules de communication

Deux packages workspace hebergent les utilitaires communs a iAppel, iReunion et iChat pour eviter la duplication entre `agent-web`, `citizen-web` et `backoffice-web` :

### `@workspace/livekit`
- `room-options` : `LIVEKIT_CALL_ROOM_OPTIONS` — simulcast VP9 (180p/360p/720p), adaptiveStream, dynacast, audio 48 kHz mono avec echoCancellation/noiseSuppression/autoGainControl, reconnectPolicy exponentielle. A passer en prop `options=` de TOUT `<LiveKitRoom>`.
- `use-livekit-disconnect-guard` : hook qui encapsule le pattern `hasConnectedRef` + `userHangUpRef`. Empeche la fermeture prematuree de l'appel sur un `onDisconnected` emis AVANT le premier `onConnected` (artefacts handshake WebRTC, StrictMode, ICE restart).
- `use-ringtone` : hook Web Audio qui genere la sonnerie dual-tone sans asset.

Usage type :
```tsx
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";

const { onConnected, onDisconnected, markUserHangUp } =
  useLiveKitDisconnectGuard(cleanupCallState);

<LiveKitRoom
  token={token}
  serverUrl={wsUrl}
  options={LIVEKIT_CALL_ROOM_OPTIONS}
  onConnected={onConnected}
  onDisconnected={onDisconnected}
  ...
/>
```

### `@workspace/chat`
- `use-idempotency-key` : genere un `crypto.randomUUID()` stable par intent d'envoi, reset sur success. A passer dans `sendMessage({ ..., idempotencyKey })` pour que le backend deduplique les doubles envois.
- `use-chat-attachments` : state local + validation client (taille 50 Mo, MIME) pour les fichiers joints d'un composer. Retourne `addFiles/remove/clear/consumeForUpload` — l'upload vers Convex storage est delegue a l'appelant.
- `safe-markdown` : wrapper `<SafeMarkdown>` avec `rehype-sanitize` strict. A utiliser a la place de `<Markdown>` de `react-markdown` pour tout contenu genere par Mr Ray / iAsted IA / utilisateurs.

## Etendre l'agent vocal iAsted (Mode God)

Pour ajouter une nouvelle capacite vocale a iAsted, suivre ces 3 etapes :

### 1. Declarer le tool dans le registry

Editer `convex/ai/realtimeTools.ts` et ajouter une entree dans `BUSINESS_TOOLS` :

```ts
{
  requiredTask: TaskCode.meetings.create, // null si pas de gating supplementaire
  superadminOnly: false,                  // true pour les actions superadmin
  surfaceOnly: "backoffice",              // "agent" / "backoffice" / undefined
  tool: {
    type: "function",
    name: "my_new_tool",
    description: "Ce que fait l'outil + REGLES de confirmation orale.",
    parameters: {
      type: "object",
      properties: { /* ... */ },
      required: ["..."],
    },
  },
},
```

### 2. Implementer le dispatcher

Editer `convex/ai/realtimeToolExecutor.ts` :
- Ajouter un `case "my_new_tool"` dans `dispatchBusinessTool`.
- Ecrire la fonction qui appelle la mutation/query existante via `ctx.runMutation(api.functions.x.y, args)` ou `ctx.runQuery`.
- Retourner un `RealtimeToolResult` (`success`, `message`, optionnellement `uiAction` et `data`).
- Re-mapper les erreurs Convex (CANNOT_REMOVE_SELF, INSUFFICIENT_PERMISSIONS) en messages parlants.

### 3. Annoncer la capacite dans le system prompt

Editer `convex/ai/iastedRealtimePrompt.ts` dans la section appropriee (`CAPACITES D'ORCHESTRATION`, `CAPACITES D'ADMINISTRATION`, etc.) :
- Quand utiliser l'outil.
- Regles de confirmation orale (simple recap, double confirmation pour actions destructives).
- Parametres attendus + ordre canonique (find_contact AVANT launch_call, etc.).

### Securite et garde-fous
- Auth + RBAC sont re-verifies a l'execution dans le dispatcher.
- Preferer une mutation Convex existante AVEC ses guards (self-action, rank hierarchy, SuperAdmin protection) plutot que d'ecrire des controles manuels.
- Tout tool destructif doit avoir une **double confirmation orale obligatoire** annoncee dans le prompt.
- Audit log automatique : `auditLog` + `aiActivityLog` doivent etre alimentes pour toute action mutative.

### Variables d'environnement iAsted Realtime

Configurables via `npx convex env set <KEY> <VALUE>` sur le deployment cible :

- `IASTED_AB_FORCE_MODEL` (`gpt-realtime-mini` | `gpt-realtime`) — force tous les users sur ce modele. Utile pour QA. Vide = comportement A/B normal.
- `IASTED_AB_PERCENT_FULL` (0-100, default `0`) — % d'users servis avec `gpt-realtime` (le grand modele). Le reste reste sur `mini`. Hash deterministe sur userId : un user donne reste sur le meme modele tant que le % ne change pas. Pour comparer perf/qualite : passer a `50` pendant quelques jours puis examiner les telemetries `realtimeToken.timing.openai_session_ms`.
- `IASTED_VAD_MODE` (`semantic_vad` | non defini) — quand defini, bascule la detection de fin de tour de `server_vad` (silence de 300 ms) vers `semantic_vad` (eagerness auto). Utile pour les locuteurs avec hesitations marquees ; legere augmentation de latence (~50-100 ms).
- `OPENAI_API_KEY` — requise pour le mode vocal (sans elle, l'UI affiche "vocal indisponible").

Le cron `iasted-realtime-keep-warm` ping `keepAliveNodeRuntime` toutes les 4 min pour eviter le cold start de l'isolate Node ou vit `realtimeToken.create`.

### Decisions de non-extraction

Trois items du plan d'audit n'ont PAS ete extraits dans les packages partages. Decisions documentees ici pour eviter qu'un futur contributeur refasse l'analyse :

- **`useMeeting` reste per-app** (3 copies identiques dans `agent-web`, `citizen-web`, `backoffice-web`) : le hook importe `@convex/_generated/api` dont le type depend de la configuration Convex de chaque app. L'extraction necessiterait une injection de l'API en parametre (`useMeeting(api, meetingId)`), ce qui casse la lisibilite. La duplication accepte : 3 fichiers a maintenir ensemble.
- **`ChatComposer` reste per-app** : les 3 apps (Citizen, Agent, Backoffice) ont des UX tres differentes (suggestions IA cote citoyen, macros cote agent, contextes org cote backoffice). Le composer est trop couple au shell pour etre factorise sans perte d'expressivite.
- **tsconfig paths non modifies** : le champ `exports` des `package.json` (ex. `"./room-options": "./src/room-options.ts"`) suffit pour la resolution TypeScript+Next.js. Ajouter manuellement `@workspace/livekit/*` et `@workspace/chat/*` dans chaque `tsconfig.json` est redondant et genere des conflits de resolution.
- **`AddressWithAutocomplete` (citizen-web) reste per-app**, ne migre PAS vers `@workspace/ui/components/address-input`. Le composant shared est value/onChange-based et pleinement compose (rue + ville + code postal + pays + GPS + score de completion), tandis que le composant citizen-web est `react-hook-form`-bound avec un Select pays restreint a la liste cible. Pour `administration.ga`, le composant citizen-web devra etre adapte aux provinces/departements/communes gabonaises (voir Phase 3 du plan d'implementation).

## Plan d'implementation en 9 phases

Voir [`ADMINISTRATION.GA/PROMPT_IMPLEMENTATION_ADMINISTRATION_GA.md`](./ADMINISTRATION.GA/PROMPT_IMPLEMENTATION_ADMINISTRATION_GA.md) pour le decoupage complet :

0. Fork et bootstrap (cette phase est en cours / vient d'etre completee)
1. Modele organisationnel etendu (Convex)
2. Seeds : 5e Republique complete (~260 entites)
3. Renommage et rebranding des apps
4. Adapter iCorrespondance au contexte administratif
5. Modules iDocument, iArchive, iBoite, iAgenda, iCom
6. iAsted Mode Administration
7. Interconnexion souveraine
8. Deploiement et CI/CD (Cloud Run)
9. Documentation

Chaque phase produit un rapport de completion + attend confirmation avant la suivante.
