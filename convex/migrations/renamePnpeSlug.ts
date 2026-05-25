/**
 * renamePnpeSlug — Phase 1 PNPE
 *
 * Renomme l'org "Office National de l'Emploi" (slug historique "one",
 * rattachée à `min-fonction-publique`) en "Pôle National de Promotion
 * de l'Emploi" (slug "pnpe", rattachée à `min-travail`).
 *
 * CONTEXTE
 *   Le seed initial (`seedEtablissementsPublics.ts`) plaçait l'ONE sous
 *   la Fonction Publique car le référentiel §4.21 le listait là. La
 *   tutelle réelle (constitution gouvernement Oligui Nguema II, jan. 2026)
 *   est le Ministère du Travail, du Plein Emploi, du Dialogue Social et
 *   de la Formation Professionnelle. De plus, l'institution a été rebaptisée
 *   PNPE (Pôle National de Promotion de l'Emploi) en 2025.
 *
 *   Cette migration corrige les bases qui auraient encore l'ancien slug
 *   "one". Le nouveau seed officiel utilise déjà "pnpe" + parent
 *   "min-travail" (cf. `seedEtablissementsPublics.ts` après commit
 *   "feat(pnpe): bootstrap PNPE app rebranded from direction_ga").
 *
 * IDEMPOTENCE
 *   - Si l'org "pnpe" existe déjà → no-op (status "already_renamed").
 *   - Si seul "one" existe → renomme slug + name + parentOrgId.
 *   - Si aucune n'existe → no-op (status "not_found", base vierge).
 *   - Si BOTH existent (cas anormal) → renvoie "ambiguous" sans toucher,
 *     l'humain doit trancher manuellement.
 *
 * INVOCATION MANUELLE (dashboard Convex)
 *   internal.migrations.renamePnpeSlug.run
 *
 * INVOCATION DRY-RUN
 *   internal.migrations.renamePnpeSlug.run { dryRun: true }
 *   → ne modifie rien, retourne l'action qui serait appliquée.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun === true;
    const startedAt = Date.now();

    // 1. Recherche les deux versions possibles de l'org.
    const oneOrg = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "one"))
      .unique();
    const pnpeOrg = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "pnpe"))
      .unique();

    // 2. Détection des cas.
    if (pnpeOrg && !oneOrg) {
      return {
        status: "already_renamed",
        orgId: pnpeOrg._id,
        durationMs: Date.now() - startedAt,
        message: "Org PNPE déjà au bon slug, rien à faire.",
      } as const;
    }

    if (!pnpeOrg && !oneOrg) {
      return {
        status: "not_found",
        durationMs: Date.now() - startedAt,
        message:
          "Ni 'one' ni 'pnpe' n'existent. Base probablement vierge — exécuter d'abord seedEtablissementsPublics.",
      } as const;
    }

    if (pnpeOrg && oneOrg) {
      // Cas anormal : les deux coexistent. Refuse de toucher pour éviter
      // d'écraser des données. L'humain doit trancher (fusion / suppression).
      return {
        status: "ambiguous",
        oneOrgId: oneOrg._id,
        pnpeOrgId: pnpeOrg._id,
        durationMs: Date.now() - startedAt,
        message:
          "Org 'one' ET 'pnpe' coexistent. Intervention manuelle requise pour fusionner ou supprimer l'une des deux.",
      } as const;
    }

    // 3. Cas nominal : seul "one" existe → renomme.
    if (!oneOrg) {
      // Garde-fou TS — déjà couvert ci-dessus, mais le narrow ne s'applique
      // qu'après les branches précédentes. Ne devrait jamais s'exécuter.
      return {
        status: "not_found",
        durationMs: Date.now() - startedAt,
        message: "Org 'one' introuvable (état théoriquement inaccessible).",
      } as const;
    }

    // Cherche la nouvelle tutelle (min-travail).
    const minTravail = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "min-travail"))
      .unique();

    if (!minTravail) {
      return {
        status: "parent_missing",
        durationMs: Date.now() - startedAt,
        message:
          "Org 'min-travail' introuvable. Lancer d'abord seedMinistries pour créer la tutelle.",
      } as const;
    }

    const patch = {
      slug: "pnpe",
      name: "Pôle National de Promotion de l'Emploi",
      parentOrgId: minTravail._id,
      description:
        "Opérateur public gabonais de l'emploi (héritier ONE). Sous tutelle du Ministère du Travail, du Plein Emploi, du Dialogue Social et de la Formation Professionnelle. 7 antennes régionales : Libreville (siège), Franceville, Lambaréné, Koulamoutou, Port-Gentil, Tchibanga, Oyem.",
    };

    if (!dryRun) {
      await ctx.db.patch(oneOrg._id, patch);
    }

    return {
      status: dryRun ? "dry_run" : "renamed",
      orgId: oneOrg._id,
      from: {
        slug: oneOrg.slug,
        name: oneOrg.name,
        parentOrgId: oneOrg.parentOrgId,
      },
      to: patch,
      durationMs: Date.now() - startedAt,
    } as const;
  },
});
