# Tracking PostHog — Inscription consulaire

Documentation des events analytics envoyés par les wizards d'inscription
(`CitizenRegistrationForm`, `ForeignerRegistrationForm`) et des **Funnel Insights**
PostHog à créer pour exploiter ces données.

> **TL;DR** : tous les events `registration_*` portent une propriété `flow_type`
> (`long_stay` | `short_stay` | `foreigner`). Crée un Funnel Insight par flux
> avec `step_name` comme filtre par étape — tu obtiens directement le drop-off
> par étape pour chacun des 3 parcours.

---

## A. Catalogue d'events

| Event | Propriétés | Déclenché par |
|---|---|---|
| `registration_started` | `flow_type`, `total_steps` | Mount du wizard |
| `registration_step_viewed` | `flow_type`, `step_name`, `step_index`, `total_steps` | Changement de step (auto via `useRegistrationAnalytics`) |
| `registration_step_completed` | `flow_type`, `step_name`, `step_index`, `total_steps`, `time_on_step_ms` | Clic "Suivant" après validation OK |
| `registration_step_back` | `flow_type`, `from_step`, `to_step`, `from_step_index` | Clic "Précédent" |
| `registration_validation_error` | `flow_type`, `step_name`, `step_index`, `field_paths`, `error_count` | Clic "Suivant" avec champs invalides |
| `registration_document_uploaded` | `flow_type`, `document_type` | Upload Convex Storage réussi (`createDocument`) |
| `registration_ai_scan_used` | `flow_type`, `documents_scanned`, `fields_extracted`, `scan_duration_ms`, `confidence` | Scan IA réussi |
| `registration_ai_scan_failed` | `flow_type`, `error_type`, `documents_attempted` | Scan IA échoué (`no_documents` \| `rate_limited` \| `extraction_error`) |
| `registration_submitted` | `flow_type`, `total_time_ms`, `marital_status?`, `has_children?`, `jurisdiction_country?` | Soumission backend réussie |
| `registration_abandoned` | `flow_type`, `last_step`, `last_step_index`, `total_steps`, `completion_pct`, `time_in_form_ms` | `beforeunload` ou `visibilitychange=hidden` sans soumission (best-effort) |

Source : `apps/citizen-web/src/lib/analytics.ts` + `apps/citizen-web/src/lib/useRegistrationAnalytics.ts`.

---

## B. Mapping étapes par flux

Liste exacte des `step_name` ordonnés, à reprendre tel quel dans les filtres PostHog :

| Flux (`flow_type`) | Étapes ordonnées (`step_name`) | Source config |
|---|---|---|
| `long_stay` | `documents` → `basicInfo` → `family` → `contacts` → `profession` → `review` | `registrationConfig.ts` `LONG_STAY_CONFIG` |
| `short_stay` | `documents` → `basicInfo` → `contacts` → `review` | `SHORT_STAY_CONFIG` |
| `foreigner` | `purpose` → `documents` → `basicInfo` → `contacts` → `review` | `FOREIGNER_CONFIG` |

---

## C. Trois Funnel Insights à créer dans PostHog

Pour chaque flux, créer un **Funnel Insight** dans PostHog avec les étapes ci-dessous.
Conversion window suggérée : **7 jours**.

### C.1 Funnel "Inscription Consulaire — Long Séjour"

Filtre global (à appliquer sur chaque étape) : `flow_type = long_stay`.

| # | Event | Filtre propriété |
|---|---|---|
| 1 | `registration_started` | — |
| 2 | `registration_step_completed` | `step_name = documents` |
| 3 | `registration_step_completed` | `step_name = basicInfo` |
| 4 | `registration_step_completed` | `step_name = family` |
| 5 | `registration_step_completed` | `step_name = contacts` |
| 6 | `registration_step_completed` | `step_name = profession` |
| 7 | `registration_step_completed` | `step_name = review` |
| 8 | `registration_submitted` | — |

Breakdown optionnel sur l'event final : `jurisdiction_country` (pays de résidence).

### C.2 Funnel "Signalement Consulaire — Court Séjour"

Filtre global : `flow_type = short_stay`.

| # | Event | Filtre propriété |
|---|---|---|
| 1 | `registration_started` | — |
| 2 | `registration_step_completed` | `step_name = documents` |
| 3 | `registration_step_completed` | `step_name = basicInfo` |
| 4 | `registration_step_completed` | `step_name = contacts` |
| 5 | `registration_step_completed` | `step_name = review` |
| 6 | `registration_submitted` | — |

### C.3 Funnel "Enregistrement Étrangers"

Filtre global : `flow_type = foreigner`.

| # | Event | Filtre propriété |
|---|---|---|
| 1 | `registration_started` | — |
| 2 | `registration_step_completed` | `step_name = purpose` |
| 3 | `registration_step_completed` | `step_name = documents` |
| 4 | `registration_step_completed` | `step_name = basicInfo` |
| 5 | `registration_step_completed` | `step_name = contacts` |
| 6 | `registration_step_completed` | `step_name = review` |
| 7 | `registration_submitted` | — |

Breakdown utile : type de visa (à exposer via `event_property` si besoin —
le `flow_type` agrège pour l'instant tous les visa types).

---

## D. Insights complémentaires

### D.1 Drop-off par étape (Trends)
- Type : Trends
- Event : `registration_abandoned`
- Breakdown : `last_step` × `flow_type`
- → Identifie les étapes où les usagers ferment l'onglet.

### D.2 Friction par champ (Trends)
- Type : Trends
- Event : `registration_validation_error`
- Breakdown : `step_name`, puis `field_paths`
- → Identifie les champs qui font échouer la validation.

### D.3 Re-engagement / hésitation (Trends)
- Type : Trends
- Event : `registration_step_back`
- Breakdown : `from_step` × `flow_type`
- → Identifie les étapes où les usagers reviennent en arrière (signe de doute).

### D.4 Performance par étape (Trends)
- Type : Trends — agrégation **médiane** sur la propriété `time_on_step_ms`
- Event : `registration_step_completed`
- Breakdown : `step_name` × `flow_type`
- → Identifie les étapes les plus longues à compléter.

---

## E. Notes d'implémentation

- **Best-effort sur `registration_abandoned`** : émis via `posthog.capture(..., { send_instantly: true })` sur `beforeunload` et `visibilitychange=hidden`. Sur mobile (kill swipe, crash) ou si la capture est bloquée par un adblocker, l'event peut être perdu. Considérer le volume comme une borne basse.
- **Aucun stockage backend** : ces events ne transitent pas par Convex. La table `events` (audit log) continue à logger les transitions de `requests` côté serveur — c'est complémentaire et plus tardif (post-soumission).
- **Test en dev** : ouvrir DevTools → Network filtré sur `posthog`, naviguer dans `/register`, vérifier les payloads. Les events portent tous `flow_type` + `step_index`/`step_name` selon le tableau A.
