# @workspace/iasted

Module iAsted partagé — consommé par `apps/citizen-web`, `apps/agent-web`, `apps/backoffice-web` et `apps/agent-desktop`.

> **Référentiel design :** `.claude/skills/consulat-design-system/CITIZEN_DESIGN_SYSTEM_V3.md`
> **Audit source :** `docs/audits/2026-04-15_iasted_audit.md`
> **Plan d'implémentation :** `/Users/okatech/.claude/plans/spicy-frolicking-lagoon.md`

---

## Contenu

| Sous-module | Rôle |
|---|---|
| `tokens/animation` | Springs, staggers, presets motion (source unique de vérité) |
| `tokens/sizes` | Dimensions window, breakpoints, z-index |
| `types` | Unions partagées (`IAstedTabId`, `IAstedSurface`, `IAstedContext`) |
| `hooks/use-reduced-motion` | Détection `prefers-reduced-motion` SSR-safe (WCAG 2.1 AA) |
| `hooks/use-iasted-context` | Context provider (orgId, userId, surface, role) |
| `components/circle-menu` | FAB radial + variante reduced-motion, switcher runtime |
| `components/window` | `WindowShell`, `WindowHeader`, `TabsNav` DS v3 |
| `components/primitives` | `AgentStatusDot`, `PriorityBadge`, `ChannelIcon` |
| `presets` | 4 presets : citizen, agent, backoffice, agent-desktop |

---

## Presets — matrice d'onglets

| Preset | Onglets | Particularités |
|---|---|---|
| `citizen` | iChat · iAppel · iContact | 4 items CircleMenu (Mr Ray, iChat, iAppel, iContact), `supportsMultiAgent: true` |
| `agent` | File · iChat · iContact · iAppel · iRéunion · Réglages | Slot `callQueueSlot?: ReactNode` pour injecter le call-center de `apps/agent-web` |
| `backoffice` | iChat · iContact · iAppel · iRéunion · Réglages | `supportsConfigEditor: true` (ConfigPanelShell + SandboxPreview + VersionHistory) |
| `agent-desktop` | Identique `agent` | `windowMode: "docked-native"` (fenêtre Electron), slot bridge IPC |

---

## Contrat d'animation (CircleMenu)

Toute évolution du CircleMenu **doit préserver bit-exact** les primitives listées dans `tokens/animation.ts` :

| Paramètre | Valeur |
|---|---|
| `itemSize` | 48 px |
| `containerSize` | 250 px |
| `openStagger` | 0.05 s entre items |
| `closeStagger` | 0.12 s |
| `shakeDuration` | 0.15 s |
| Spring items | `{ stiffness: 180, damping: 22 }` |
| Spring trigger | `{ stiffness: 200, damping: 18 }` |
| Orbit duration | `0.12 × (n + 2)` s |

**Séquence OPEN** : trigger grow → pause 150 ms → shake + shrink → pause 250 ms → orbit +360° + blur → items déploient (stagger) → trigger `itemSize × 2`.
**Séquence CLOSE** : miroir exact.

**Fallback `prefers-reduced-motion: reduce`** : fade + scale 150 ms, aucun shake/orbit/blur. API de props identique.

---

## Coexistence avec call-center (Sprint 6)

`@workspace/iasted` **ne dépend jamais** de `apps/agent-web/src/components/call-center/*`. Intégration par **slot** uniquement :

```tsx
// apps/agent-web
import { WindowShell } from "@workspace/iasted";
import { IncomingCallQueue } from "@/components/call-center/IncomingCallQueue";

<WindowShell preset={agentPreset} callQueueSlot={<IncomingCallQueue />} />
```

Hooks partagés via Convex (`agentPresence.dndUntil`, `currentCallIds[]`) garantissent la cohérence d'état sans copie.

---

## Hors scope strict

- Prompts LLM Gemini / guardrails F2.3 (stables depuis commit `bac7824`).
- Schemas Convex (consommation seule).
- Logique call-center, voicemail, RoomEgress (Sprint 6).
- Offline-first (sprint PWA ultérieur).
