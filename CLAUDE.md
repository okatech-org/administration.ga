<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Design System

Ce projet suit la **Charte Graphique Consulat.ga** — un systeme de design neumorphique Soft UI.

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

### Decisions de non-extraction

Trois items du plan d'audit n'ont PAS ete extraits dans les packages partages. Decisions documentees ici pour eviter qu'un futur contributeur refasse l'analyse :

- **`useMeeting` reste per-app** (3 copies identiques dans `agent-web`, `citizen-web`, `backoffice-web`) : le hook importe `@convex/_generated/api` dont le type depend de la configuration Convex de chaque app. L'extraction necessiterait une injection de l'API en parametre (`useMeeting(api, meetingId)`), ce qui casse la lisibilite. La duplication accepte : 3 fichiers a maintenir ensemble.
- **`ChatComposer` reste per-app** : les 3 apps (Citizen, Agent, Backoffice) ont des UX tres differentes (suggestions IA cote citoyen, macros cote agent, contextes org cote backoffice). Le composer est trop couple au shell pour etre factorise sans perte d'expressivite.
- **tsconfig paths non modifies** : le champ `exports` des `package.json` (ex. `"./room-options": "./src/room-options.ts"`) suffit pour la resolution TypeScript+Next.js. Ajouter manuellement `@workspace/livekit/*` et `@workspace/chat/*` dans chaque `tsconfig.json` est redondant et genere des conflits de resolution.
- **`AddressWithAutocomplete` (citizen-web) reste per-app**, ne migre PAS vers `@workspace/ui/components/address-input`. Le composant shared est value/onChange-based et pleinement compose (rue + ville + code postal + pays + GPS + score de completion), tandis que le composant citizen-web est `react-hook-form`-bound (`Controller name="contactInfo.street"...`) avec un Select pays restreint a la liste cible (FR/GA/BE/CH/CA/US/GB/DE/ES/IT) et une UX d'inscription consulaire. Les deux partagent deja le backend (`places.autocomplete` Convex action) ; la duplication concerne uniquement la couche presentation, et la refonte du flux d'inscription critique pour zero gain fonctionnel n'est pas justifiee. La duplication accepte : 2 fichiers (citizen `auth/AddressWithAutocomplete.tsx` + shared `ui/address-input.tsx`).
