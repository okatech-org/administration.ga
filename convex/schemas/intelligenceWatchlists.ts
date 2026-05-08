import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Listes de surveillance du module Renseignement.
 *
 * Une watchlist regroupe des cibles (profils, contacts, agents, mineurs)
 * autour d'un thème ou d'un dossier (« Diaspora économique FR »,
 * « Visite officielle 2026 »).
 *
 * Visibilité :
 *   - `private` : visible uniquement par le propriétaire
 *   - `shared`  : visible à tous les porteurs du module Intelligence de l'org
 *   - `directorate` : restreint à un sous-ensemble (cf. classification)
 *
 * Cloisonnement strict : jamais joint depuis les autres modules.
 */
export const intelligenceWatchlistsTable = defineTable({
  orgId: v.id("orgs"),
  ownerId: v.id("users"),

  name: v.string(),
  description: v.optional(v.string()),

  visibility: v.union(
    v.literal("private"),
    v.literal("shared"),
    v.literal("directorate"),
  ),

  // Code couleur libre pour différencier les listes (« #ef4444 »)
  color: v.optional(v.string()),
  // Icône Lucide React (ex. "Eye", "Flag", "Globe")
  icon: v.optional(v.string()),

  // Catégorie thématique
  theme: v.optional(
    v.union(
      v.literal("economic"),       // Économique
      v.literal("political"),      // Politique
      v.literal("security"),       // Sécurité
      v.literal("diaspora"),       // Diaspora
      v.literal("event"),          // Événement / visite
      v.literal("operational"),    // Opérationnel courant
      v.literal("other"),
    ),
  ),

  // Soft-delete pour traçabilité
  archivedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_org", ["orgId"])
  .index("by_owner", ["ownerId"])
  .index("by_org_visibility", ["orgId", "visibility"]);

/**
 * Items d'une watchlist : pointeur typé vers une cible.
 * Une cible peut figurer dans plusieurs watchlists ; chaque entrée
 * porte ses propres notes locales (commentaire de surveillance).
 */
export const intelligenceWatchlistItemsTable = defineTable({
  watchlistId: v.id("intelligenceWatchlists"),
  orgId: v.id("orgs"),
  addedBy: v.id("users"),

  targetType: v.union(
    v.literal("profile"),
    v.literal("child_profile"),
    v.literal("diplomatic_target"),
    v.literal("agent"),
  ),
  targetId: v.string(),

  /** Commentaire propre à cette entrée — ex. raison de l'ajout. */
  comment: v.optional(v.string()),

  /** Indique une priorité d'attention au sein de la liste. */
  priority: v.optional(
    v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
    ),
  ),
})
  .index("by_watchlist", ["watchlistId"])
  .index("by_target", ["targetType", "targetId"])
  .index("by_org", ["orgId"]);
