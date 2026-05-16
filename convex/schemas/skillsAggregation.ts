/**
 * Tables dénormalisées + stats précalculées pour l'agrégation des
 * compétences super-admin.
 *
 * Architecture :
 *
 * 1. `cvSkillItems` / `aiSuggestedSkillItems` — dénormalisation 1-N
 *    de `cv.skills[]` / `profession.aiSuggestedSkills[]` en 1 ligne par
 *    item. Permet aggregates en O(log n) sur les tables sources.
 *
 * 2. `skillCatalogStats` / `professionTitleStats` — tables de stats
 *    précalculées (count par skill/title) maintenues par trigger. Indexées
 *    par count → top N via `withIndex("by_count").order("desc")`,
 *    aussi en O(log n).
 *
 * 3. `aiEnrichmentRuns` — historique des runs IA affiché dans la
 *    tab Santé.
 *
 * Maintenance :
 * - Les triggers `cv` / `profiles` (cf. `convex/triggers/index.ts`)
 *   synchronisent `cvSkillItems` / `aiSuggestedSkillItems` sur chaque
 *   mutation.
 * - Les triggers `cvSkillItems` / `aiSuggestedSkillItems` synchronisent
 *   `skillCatalogStats`.
 * - Le trigger `profiles` synchronise `professionTitleStats`.
 * - Le backfill initial est dans
 *   `convex/migrations/backfillSkillsAggregates.ts`.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";
import { skillLevelValidator } from "../lib/validators";

// ─── 1. cvSkillItems ─────────────────────────────────────────────────
// 1 ligne par entrée de `cv.skills` — permet d'agréger par nom de skill,
// par niveau, ou cross (skillName × level).
export const cvSkillItemsTable = defineTable({
  userId: v.id("users"),
  cvId: v.id("cv"),
  // Nom de la skill, lower-cased trimmed pour l'agrégation (l'affichage
  // utilise `displayName` pour conserver la casse originale).
  skillName: v.string(),
  displayName: v.string(),
  level: skillLevelValidator,
})
  .index("by_user", ["userId"])
  .index("by_cv", ["cvId"])
  .index("by_skillName", ["skillName"]);

// ─── 2. aiSuggestedSkillItems ────────────────────────────────────────
// 1 ligne par entrée de `profile.profession.aiSuggestedSkills` — permet
// de mesurer les compétences "suggérées mais pas validées".
export const aiSuggestedSkillItemsTable = defineTable({
  userId: v.id("users"),
  profileId: v.id("profiles"),
  skillName: v.string(),
  displayName: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_profile", ["profileId"])
  .index("by_skillName", ["skillName"]);

// ─── 3. skillCatalogStats ────────────────────────────────────────────
// Stats précalculées par nom de skill — alimente :
//   - Top 10 compétences CV (tab Overview) → tri par declaredCount
//   - Catalog (tab Catalogue) → declared vs ai + niveaux
//   - Recherche talents : autocomplete sur compétences populaires
// Maintenue par triggers sur cvSkillItems & aiSuggestedSkillItems.
export const skillCatalogStatsTable = defineTable({
  // Clé canonique (lowercase trimmed)
  skillName: v.string(),
  // Pour l'affichage — première casse rencontrée
  displayName: v.string(),
  // Compteurs
  declaredCount: v.number(),
  aiCount: v.number(),
  // Distribution par niveau (déclarés uniquement)
  byLevel: v.object({
    beginner: v.number(),
    intermediate: v.number(),
    advanced: v.number(),
    expert: v.number(),
  }),
})
  .index("by_name", ["skillName"])
  .index("by_declared", ["declaredCount"])
  .index("by_ai", ["aiCount"]);

// ─── 4. professionTitleStats ─────────────────────────────────────────
// Stats précalculées par intitulé de métier libre — alimente le top 10
// métiers (tab Overview) et les listes "top titles" par catégorie (tab
// Catégories). Maintenue par trigger sur profiles.profession.title.
export const professionTitleStatsTable = defineTable({
  // Clé canonique
  titleLower: v.string(),
  // Affichage (première casse rencontrée)
  displayTitle: v.string(),
  count: v.number(),
  // Catégorie majoritaire associée (peut diverger entre profils, on garde
  // la dernière rencontrée par simplicité). Utile pour grouper le top 10
  // par catégorie.
  category: v.optional(v.string()),
})
  .index("by_title", ["titleLower"])
  .index("by_count", ["count"])
  .index("by_category_count", ["category", "count"]);

// 1 doc par run d'enrichissement IA — alimente la table "Historique des
// runs IA" + le bandeau "Run IA dans X jours".
export const aiEnrichmentRunsTable = defineTable({
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
  processed: v.number(),
  success: v.number(),
  failed: v.number(),
  skippedAlreadyEnriched: v.optional(v.number()),
  skippedNoTitle: v.optional(v.number()),
  profilesPatched: v.optional(v.number()),
  cvsEnriched: v.optional(v.number()),
  durationMs: v.optional(v.number()),
  triggeredBy: v.union(
    v.literal("manual"),
    v.literal("scheduled"),
    v.literal("one_off"),
  ),
  triggeredByUserId: v.optional(v.id("users")),
  // "running" tant que finishedAt n'est pas posé.
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  errorMessage: v.optional(v.string()),
}).index("by_startedAt", ["startedAt"]);
