/**
 * seedSovereignChannels — Phase 7 administration.ga
 *
 * Crée les canaux d'interconnexion souveraine MVP entre les institutions
 * de la 5e République gabonaise. Idempotent : ré-exécutable sans dommage,
 * chaque canal est identifié par son `slug` (index `by_slug`).
 *
 * Canaux MVP créés :
 *  1. Présidence ↔ Vice-Présidence du Gouvernement
 *  2. Présidence ↔ Assemblée nationale
 *  3. Présidence ↔ Sénat
 *  4. Vice-Présidence du Gouvernement ↔ chaque Ministère
 *     (28 portefeuilles seedés en Phase 2 — créés dynamiquement par query)
 *
 * Convention d'ordre des endpoints (lexicographique sur slug) :
 *   Toujours stocker en ordre lexicographique du slug d'org pour faciliter
 *   l'idempotence sur le slug du canal.
 *
 * Pas de canaux Ministère↔DG : la relation est déjà capturée par
 * `parentOrgId`. Les DG sont enfants directs de leur ministère et
 * l'interconnexion est implicite (lecture par traversée hiérarchique).
 *
 * INVOCATION MANUELLE (dashboard Convex)
 *   internal.migrations.seedSovereignChannels.run
 *
 * INVOCATION DRY-RUN
 *   internal.migrations.seedSovereignChannels.run { dryRun: true }
 *   → ne crée rien, retourne le décompte qui serait inséré.
 *
 * Sources :
 *   ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md §10
 *   ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md §2, §5
 */

import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Classification = "public" | "interne" | "confidentiel" | "secret";

interface ChannelTemplate {
  slug: string;
  label: string;
  orgASlug: string;
  orgBSlug: string;
  allowedClassifications: Classification[];
  requiresAcknowledgment: boolean;
  signatureRequired: boolean;
  timestampRequired: boolean;
  description?: string;
}

// ─── Canaux fixes (3) — Présidence ↔ institutions souveraines ────
const FIXED_CHANNELS: ChannelTemplate[] = [
  {
    slug: "presidence-vp-gouvernement",
    label: "Présidence ↔ Vice-Présidence du Gouvernement",
    orgASlug: "presidence",
    orgBSlug: "vice-presidence-gouvernement",
    allowedClassifications: ["public", "interne", "confidentiel", "secret"],
    requiresAcknowledgment: true,
    signatureRequired: true,
    timestampRequired: true,
    description:
      "Canal de coordination exécutive entre le Chef de l'État et la fonction équivalente à un Premier ministre. Tous niveaux de classification autorisés.",
  },
  {
    slug: "presidence-assemblee",
    label: "Présidence ↔ Assemblée nationale",
    orgASlug: "presidence",
    orgBSlug: "assemblee-nationale",
    allowedClassifications: ["public", "interne", "confidentiel"],
    requiresAcknowledgment: true,
    signatureRequired: true,
    timestampRequired: true,
    description:
      "Canal de communication formelle entre le Pouvoir exécutif et la chambre basse du Parlement. Niveau 'secret' exclu (relations institutionnelles).",
  },
  {
    slug: "presidence-senat",
    label: "Présidence ↔ Sénat",
    orgASlug: "presidence",
    orgBSlug: "senat",
    allowedClassifications: ["public", "interne", "confidentiel"],
    requiresAcknowledgment: true,
    signatureRequired: true,
    timestampRequired: true,
    description:
      "Canal de communication formelle entre le Pouvoir exécutif et la chambre haute du Parlement. Niveau 'secret' exclu (relations institutionnelles).",
  },
];

// ─── Configuration par défaut VP-Gouvernement ↔ Ministère ───────
// Couvre les 28 portefeuilles ministériels de la 5e République 2026.
const VP_MINISTRY_CHANNEL_DEFAULTS = {
  allowedClassifications: [
    "public",
    "interne",
    "confidentiel",
  ] as Classification[],
  requiresAcknowledgment: true,
  signatureRequired: false,
  timestampRequired: true,
} as const;

/**
 * Génère le slug d'un canal VP-Gouvernement ↔ Ministère à partir du slug du
 * ministère. Ex: "min-defense" → "vp-gouvernement-min-defense".
 */
function buildVpMinistryChannelSlug(ministrySlug: string): string {
  return `vp-gouvernement-${ministrySlug}`;
}

/**
 * Renvoie le tuple ordonné lexicographiquement (par slug) pour un binôme
 * d'orgs. Garantit que `orgAId` correspond à l'org dont le slug vient
 * d'abord. Stabilise l'idempotence.
 */
function orderEndpointsBySlug(
  org1: Doc<"orgs">,
  org2: Doc<"orgs">,
): { a: Doc<"orgs">; b: Doc<"orgs"> } {
  if (org1.slug.localeCompare(org2.slug) <= 0) {
    return { a: org1, b: org2 };
  }
  return { a: org2, b: org1 };
}

export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun === true;
    const startedAt = Date.now();

    let created = 0;
    let skipped = 0;
    const errors: { slug: string; reason: string }[] = [];

    // ─── 1. Résoudre toutes les orgs nécessaires en une passe ─────
    const orgs = await ctx.db.query("orgs").collect();
    const orgsBySlug = new Map<string, Doc<"orgs">>();
    for (const org of orgs) {
      if (org.deletedAt == null) {
        orgsBySlug.set(org.slug, org);
      }
    }

    // ─── 2. Canaux fixes (3) ──────────────────────────────────────
    for (const template of FIXED_CHANNELS) {
      const result = await ensureChannel(ctx, template, orgsBySlug, dryRun);
      if (result === "created") created++;
      else if (result === "skipped") skipped++;
      else errors.push({ slug: template.slug, reason: result });
    }

    // ─── 3. Canaux dynamiques VP-Gouvernement ↔ chaque ministère ──
    const vpGouvernement = orgsBySlug.get("vice-presidence-gouvernement");
    if (!vpGouvernement) {
      errors.push({
        slug: "vp-gouvernement-base",
        reason:
          "Org 'vice-presidence-gouvernement' introuvable — seed Phase 2 manquant ?",
      });
    } else {
      // Tous les ministères (ordinaires + délégués) avec membership active.
      const ministries = orgs.filter(
        (o) =>
          (o.type === "ministry" || o.type === "delegated_ministry") &&
          o.deletedAt == null,
      );

      for (const ministry of ministries) {
        const template: ChannelTemplate = {
          slug: buildVpMinistryChannelSlug(ministry.slug),
          label: `Vice-Présidence du Gouvernement ↔ ${ministry.name}`,
          orgASlug: "vice-presidence-gouvernement",
          orgBSlug: ministry.slug,
          ...VP_MINISTRY_CHANNEL_DEFAULTS,
          allowedClassifications: [
            ...VP_MINISTRY_CHANNEL_DEFAULTS.allowedClassifications,
          ],
          description: `Canal de tutelle gouvernementale entre la Vice-Présidence du Gouvernement et le ministère "${ministry.name}".`,
        };
        const result = await ensureChannel(ctx, template, orgsBySlug, dryRun);
        if (result === "created") created++;
        else if (result === "skipped") skipped++;
        else errors.push({ slug: template.slug, reason: result });
      }
    }

    return {
      status: dryRun ? "dry_run" : "applied",
      created,
      skipped,
      errors,
      durationMs: Date.now() - startedAt,
    };
  },
});

/**
 * Crée le canal si absent (idempotent via `by_slug`). Retourne :
 *  - "created" si une nouvelle ligne a été insérée
 *  - "skipped" si le canal existait déjà (slug match)
 *  - une string d'erreur si la pré-résolution des endpoints a échoué
 */
async function ensureChannel(
  ctx: MutationCtx,
  template: ChannelTemplate,
  orgsBySlug: Map<string, Doc<"orgs">>,
  dryRun: boolean,
): Promise<"created" | "skipped" | string> {
  // Résolution des endpoints (slug → orgId).
  const orgA = orgsBySlug.get(template.orgASlug);
  const orgB = orgsBySlug.get(template.orgBSlug);
  if (!orgA) return `Endpoint A introuvable : ${template.orgASlug}`;
  if (!orgB) return `Endpoint B introuvable : ${template.orgBSlug}`;
  if (orgA._id === orgB._id) {
    return `Endpoints identiques pour le canal ${template.slug}`;
  }

  // Idempotence : check via le slug du canal (immuable).
  const existing = await ctx.db
    .query("sovereignChannels")
    .withIndex("by_slug", (q) => q.eq("slug", template.slug))
    .first();

  if (existing) {
    return "skipped";
  }

  if (dryRun) {
    return "created";
  }

  // Ordre lexicographique stable pour orgA/orgB.
  const { a, b } = orderEndpointsBySlug(orgA, orgB);

  await ctx.db.insert("sovereignChannels", {
    slug: template.slug,
    label: template.label,
    orgAId: a._id as Id<"orgs">,
    orgBId: b._id as Id<"orgs">,
    allowedClassifications: template.allowedClassifications,
    requiresAcknowledgment: template.requiresAcknowledgment,
    signatureRequired: template.signatureRequired,
    timestampRequired: template.timestampRequired,
    description: template.description,
    createdAt: Date.now(),
    isActive: true,
  });

  return "created";
}
