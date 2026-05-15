/**
 * iAsted Memories Schema
 *
 * Mémoire long terme per-user pour l'agent vocal iAsted. Stocke :
 *   - Contextes récurrents : "L'utilisateur travaille principalement sur les visas"
 *   - Préférences détectées : "Préfère les réponses courtes"
 *   - Callbacks différés : "M'a demandé de rappeler Marc demain"
 *   - Faits durables : "Son adjoint s'appelle Patrice"
 *
 * Distinct de :
 *   - `userAIPreferences` (préférences explicites configurées dans les Settings)
 *   - `aiActivityLog` (audit log des actions vocales)
 *   - `iastedKnowledge` (RAG de la plateforme, partagé entre utilisateurs)
 *
 * L'agent peut écrire ici via un tool `remember_for_later` (à ajouter Phase 3.x)
 * et lire automatiquement les souvenirs pertinents au démarrage de chaque session.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const iastedMemoriesTable = defineTable({
  /** Propriétaire de la mémoire. */
  userId: v.id("users"),
  /**
   * Catégorie de la mémoire :
   * - `context`     : fait persistant sur le travail ou les habitudes
   * - `preference`  : préférence détectée (style de réponse, sujets préférés)
   * - `callback`    : rappel différé avec dueAt
   * - `relation`    : information sur une autre personne (collègue, contact)
   */
  category: v.union(
    v.literal("context"),
    v.literal("preference"),
    v.literal("callback"),
    v.literal("relation"),
  ),
  /** Texte court de la mémoire ("Préfère les versions courtes"). */
  content: v.string(),
  /**
   * Pour les callbacks : timestamp d'échéance.
   * À ce moment, l'agent rappellera l'item au début de la prochaine session.
   */
  dueAt: v.optional(v.number()),
  /** Pour les relations : userId de la personne concernée. */
  relatedUserId: v.optional(v.id("users")),
  /**
   * Confiance dans l'information (0..1). L'agent peut décroitre la confiance
   * à chaque rappel non confirmé, ou archiver les items en-dessous d'un seuil.
   */
  confidence: v.number(),
  /** Métadonnées libres (source, lien vers entité, etc.). */
  metadata: v.optional(v.any()),
  /** Timestamp de création. */
  createdAt: v.number(),
  /** Dernière fois que l'agent a lu ou écrit cette mémoire. */
  lastAccessedAt: v.number(),
  /**
   * Si true, la mémoire est expirée et ne doit plus être surfaced.
   * Permet d'archiver sans supprimer (récupération possible).
   */
  archived: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_user_category", ["userId", "category"])
  .index("by_user_due", ["userId", "dueAt"])
  .index("by_user_archived", ["userId", "archived"]);
