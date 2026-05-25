import { defineTable } from "convex/server";
import { v } from "convex/values";
import { addressValidator, weeklyScheduleValidator } from "../../lib/validators";
import {
  codeProvinceGaValidator,
  statutAntenneValidator,
} from "../../lib/validators/pnpe";

/**
 * Antennes régionales PNPE.
 *
 * Le PNPE compte 7 antennes opérationnelles ou en ouverture (mai 2026) :
 *   - Libreville (Estuaire, siège)
 *   - Franceville (Haut-Ogooué)
 *   - Lambaréné (Moyen-Ogooué, ouverture février 2026)
 *   - Koulamoutou (Ogooué-Lolo)
 *   - Port-Gentil (Ogooué-Maritime)
 *   - Tchibanga (Nyanga)
 *   - Oyem (Woleu-Ntem)
 *
 * Provinces à anticiper : Ngounié, Ogooué-Ivindo.
 *
 * Chaque D.E est rattaché à une antenne, et chaque conseiller travaille
 * pour une antenne. Le chef d'antenne pilote son équipe.
 */
export const antennesPnpeTable = defineTable({
  /** Slug stable, unique (ex: `antenne-libreville`). */
  slug: v.string(),
  /** Nom complet d'affichage (ex: "Antenne PNPE de Libreville"). */
  nom: v.string(),

  // ─── Implantation territoriale ──────────────────────────────
  province: codeProvinceGaValidator,
  ville: v.string(),
  adresse: addressValidator,
  /** Coordonnées GPS pour affichage carte (cf. @workspace/map). */
  coordonnees: v.optional(
    v.object({
      lat: v.number(),
      lng: v.number(),
    }),
  ),

  // ─── Pilotage ───────────────────────────────────────────────
  /** Chef d'antenne (membership rôle CHEF_ANTENNE_PNPE). */
  chefAntenneId: v.optional(v.id("users")),
  /** Conseillers PNPE affectés à cette antenne. */
  conseillerIds: v.optional(v.array(v.id("users"))),

  // ─── Services et horaires ──────────────────────────────────
  horairesOuverture: v.optional(weeklyScheduleValidator),
  servicesOfferts: v.optional(v.array(v.string())),

  // ─── Contact ────────────────────────────────────────────────
  telephone: v.optional(v.string()),
  email: v.optional(v.string()),

  // ─── Cycle de vie ───────────────────────────────────────────
  statut: statutAntenneValidator,
  /** Date d'ouverture officielle (ms). */
  dateOuverture: v.optional(v.number()),
  /** Date de fermeture si applicable. */
  dateFermeture: v.optional(v.number()),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_slug", ["slug"])
  .index("by_province", ["province"])
  .index("by_statut", ["statut"])
  .index("by_chef", ["chefAntenneId"]);
