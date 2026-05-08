import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Liens entre cibles du module Renseignement.
 *
 * Permet de cartographier le réseau d'une cible : famille, affaires,
 * mentor, suspect, complice, contact. Le graphe construit ainsi devient
 * la base de l'analyse de réseau (network intelligence dans son sens
 * renseignement, pas le module BI homonyme).
 *
 * Modèle dirigé : `from` → `to`. Un lien réciproque crée deux entrées
 * (l'inverse n'est pas implicite — ex. `mentor_of` n'implique pas
 * l'inverse, mais `family_of` est symétrique côté UI).
 */
export const intelligenceLinksTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  fromTargetType: v.union(
    v.literal("profile"),
    v.literal("child_profile"),
    v.literal("diplomatic_target"),
    v.literal("agent"),
  ),
  fromTargetId: v.string(),

  toTargetType: v.union(
    v.literal("profile"),
    v.literal("child_profile"),
    v.literal("diplomatic_target"),
    v.literal("agent"),
  ),
  toTargetId: v.string(),

  relationship: v.union(
    v.literal("family"),
    v.literal("business"),
    v.literal("friendship"),
    v.literal("mentor"),
    v.literal("suspect"),
    v.literal("accomplice"),
    v.literal("contact"),
    v.literal("other"),
  ),

  description: v.optional(v.string()),

  /** Force perçue du lien (faible / moyen / fort). */
  strength: v.optional(
    v.union(
      v.literal("weak"),
      v.literal("medium"),
      v.literal("strong"),
    ),
  ),

  // Statut de vérification du lien
  verified: v.optional(
    v.union(
      v.literal("unverified"),
      v.literal("confirmed"),
      v.literal("disputed"),
    ),
  ),

  // Soft-delete
  deletedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_from", ["fromTargetType", "fromTargetId"])
  .index("by_to", ["toTargetType", "toTargetId"])
  .index("by_org", ["orgId"]);
