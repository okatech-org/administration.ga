# iAsted — Dashboard PostHog (Ronde 3)

Ce document décrit les insights PostHog à créer pour monitorer l'agent
vocal iAsted en production : latence, A/B testing des modèles, taux de
succès des tools, satisfaction perçue.

## Events PostHog instrumentés (côté client)

Tous les events sont émis par le hook `useRealtimeVoice` (cf.
`packages/iasted/src/hooks/use-realtime-voice.ts`) via `window.posthog?.capture`.

### `iasted_boot_metrics`

Émis UNE FOIS par session, dès le premier `response.audio.delta` reçu.

| Propriété              | Type    | Description                                                    |
|------------------------|---------|----------------------------------------------------------------|
| `surface`              | string  | `agent` / `backoffice` / `citizen`                             |
| `session_id`           | string  | ID OpenAI Realtime de la session                               |
| `model`                | string  | Modèle effectivement utilisé (`gpt-realtime` / `gpt-realtime-mini`) |
| `voice`                | string  | Voix utilisée (`ash`, `alloy`, etc.)                            |
| `ttf_audio_total_ms`   | number  | Temps total clic → 1ʳᵉ syllabe (cible : < 1500 ms p50)         |
| `mediastream_ms`       | number  | Durée de `getUserMedia` (~10 ms si pré-warm OK, sinon 200-2000) |
| `sdp_offer_ms`         | number  | Durée création offre WebRTC + setLocalDescription              |
| `sdp_exchange_ms`      | number  | Durée fetch SDP + setRemoteDescription                         |
| `dc_open_ms`           | number  | Délai entre setRemoteDescription et ouverture DataChannel      |
| `ttf_audio_after_dc_ms`| number  | Délai DataChannel ouvert → 1ʳᵉ syllabe                         |

### `iasted_turn_latency`

Émis à chaque tour de conversation, dès la 1ʳᵉ syllabe d'iAsted après que
l'utilisateur ait fini de parler.

| Propriété      | Type    | Description                                              |
|----------------|---------|----------------------------------------------------------|
| `surface`      | string  | `agent` / `backoffice` / `citizen`                       |
| `session_id`   | string  | ID OpenAI Realtime                                       |
| `turn_number`  | number  | Numéro du tour dans la session (1, 2, 3, ...)            |
| `latency_ms`   | number  | Délai `speech_stopped` → 1ʳᵉ syllabe iAsted (cible : < 700 ms p50) |

### Events backend (Convex logs — pas dans PostHog directement)

Émis via `console.log` côté Convex, consultables avec `convex logs`. Pour
les inclure dans le dashboard, les forwarder via un cron qui agrège :

- `[realtimeToken.timing]` — JSON-line avec tous les sous-timings du boot serveur :
  - `surface`, `sessionId`, `promptChars`, `toolCount`
  - `auth_ms`, `q_getMe_ms`, `parallel_batch_ms`, `q_buildPrompt_ms`, `openai_session_ms`, `total_ms`
  - **`ab_test_model`** : `0` = mini bucket, `1` = full bucket (Sprint 10 — H3)
- `[realtimeToolExecutor.timing]` — Par tool call :
  - `toolName`, `surface`, `success`, `total_ms`, `isUITool`

## Insights PostHog à créer

### 1. **Latence boot p50/p95 par surface** (Trends)
- **Event** : `iasted_boot_metrics`
- **Math** : `p50(ttf_audio_total_ms)` + `p95(ttf_audio_total_ms)`
- **Breakdown** : `surface`
- **Date range** : 7 derniers jours
- **Objectif** : valider que p50 < 1.5 s et p95 < 2.5 s sur les 3 surfaces.

### 2. **Latence tour p50/p95 par surface** (Trends)
- **Event** : `iasted_turn_latency`
- **Math** : `p50(latency_ms)` + `p95(latency_ms)`
- **Breakdown** : `surface`
- **Objectif** : p50 < 700 ms, p95 < 1.2 s.

### 3. **A/B testing modèles — Comparaison latence boot** (Sprint 10 — H3)
- **Event** : `iasted_boot_metrics`
- **Math** : `p50(ttf_audio_total_ms)`
- **Breakdown** : `model` (sera soit `gpt-realtime` soit `gpt-realtime-mini`)
- **Filtres** : `surface` = `agent` (puis dupliquer pour backoffice/citizen)
- **Date range** : 30 jours
- **Objectif** : confirmer que `gpt-realtime-mini` est ≥ 50 % plus rapide que `gpt-realtime` sans dégradation qualité (vérifier via funnel de satisfaction ci-dessous).

### 4. **A/B testing modèles — Funnel session complétée** (Funnel)
- Étape 1 : `iasted_boot_metrics` (session démarrée)
- Étape 2 : `iasted_turn_latency` (au moins 1 tour échangé)
- Étape 3 : event custom `iasted_session_satisfied` à créer (« 👍 » ou
  durée session > 60 s + ≥ 3 tours)
- **Breakdown** : `model`
- **Objectif** : taux de complétion équivalent entre les 2 buckets (≤ 5 % d'écart).

### 5. **Heatmap tools utilisés par persona** (Trends)
- **Event** : log Convex `[realtimeToolExecutor.timing]` parsé via un connector
  PostHog (ou ingéré manuellement via un cron). En attendant, créer côté
  Convex une mutation qui forward via PostHog Node SDK.
- **Math** : count
- **Breakdown** : `toolName` + secondary breakdown : `surface`

### 6. **Sources de latence backend — Boot decomposition** (Trends)
- **Event** : `iasted_boot_metrics`
- **Display** : Stacked bar
- **Series** :
  - `avg(mediastream_ms)`
  - `avg(sdp_offer_ms)`
  - `avg(sdp_exchange_ms)`
  - `avg(dc_open_ms)`
  - `avg(ttf_audio_after_dc_ms)`
- **Objectif** : identifier la source dominante de latence pour cibler les optimisations.

## Feature flag A/B testing modèles (Sprint 10 — H3)

Le split est géré côté serveur via `process.env.IASTED_AB_PERCENT_FULL`
(deterministic hash sur userId — pas besoin de feature flag PostHog).

**Configuration** :
1. Côté Convex env : `IASTED_AB_PERCENT_FULL=20` → 20 % des users sur
   `gpt-realtime`, 80 % sur `gpt-realtime-mini`.
2. Bypass total pour QA : `IASTED_AB_FORCE_MODEL=gpt-realtime` (ou
   `gpt-realtime-mini`).

**Propagation au dashboard** : chaque session loggue `ab_test_model` (0/1)
dans `[realtimeToken.timing]` côté backend ET le `model` final dans
`iasted_boot_metrics` côté client.

**Décision** : après 2 semaines de roulement à 50/50 (`IASTED_AB_PERCENT_FULL=50`),
comparer p50 latence × satisfaction. Si mini ≥ qualité full, basculer
définitivement à `IASTED_AB_PERCENT_FULL=0` (tout sur mini). Si full
gagne, monter à 100.

## Alertes recommandées

- **Boot p95 > 3 s** → notification Slack équipe iAsted (régression latence).
- **Turn p95 > 1.5 s** → idem.
- **Taux d'erreur OpenAI > 5 %** (recherche logs `[realtimeToken] OpenAI API error`) → alerte critique.
- **Quota mensuel > 90 %** (déjà géré via le client toast Sprint 5 — G1, mais ajouter une alerte server-side).
