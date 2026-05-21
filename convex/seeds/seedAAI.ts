/**
 * Seed des 10 Autorités Administratives Indépendantes (AAI) du Gabon.
 *
 * Les AAI gabonaises bénéficient d'une autonomie de gestion et participent
 * à la régulation de secteurs sensibles. Elles ne sont sous tutelle d'aucun
 * ministère (tutelleLevel: 0).
 *
 * Liste complète (cf. SYNTHESE §A.8 + référentiel §8) :
 *  1. HAC          — Haute Autorité de la Communication
 *  2. CGE          — Centre Gabonais des Élections
 *  3. ARCEP        — Autorité de Régulation des Communications Électroniques et des Postes
 *  4. ARSEE        — Agence de Régulation Secteur Eau/Électricité
 *  5. CNPDCP       — Commission Nationale Protection Données à Caractère Personnel
 *  6. ANPI         — Agence Nationale de Promotion des Investissements
 *  7. ARTF         — Autorité de Régulation du Transport Ferroviaire
 *  8. ANAC         — Agence Nationale de l'Aviation Civile
 *  9. Conseil Économique de la Nation
 * 10. Comité Stratégique de la Transition Énergétique
 *
 * Utilisation :
 *   npx convex run seeds/seedAAI:run
 *
 * Sources : ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md §8
 *           ADMINISTRATION.GA/SYNTHESE_REFERENCES.md §A.8
 */
import { mutation } from "../_generated/server";
import { OrganizationType } from "../lib/constants";

const DEFAULT_AAI_MODULES = [
  "correspondence",
  "documents",
  "calendar",
  "messaging",
  "iasted",
  "iarchive",
  "iboite",
];

const LIBREVILLE_DEFAULT_ADDRESS = {
  street: "À préciser",
  city: "Libreville",
  postalCode: "BP 000",
  country: "GA" as const,
};

interface AAIInput {
  slug: string;
  name: string;
  description?: string;
}

const AAI_ORGS: AAIInput[] = [
  {
    slug: "hac",
    name: "Haute Autorité de la Communication",
    description:
      "Créée en 2018 en remplacement du Conseil National de la Communication (CNC). Autorité administrative indépendante à autonomie financière. Régulation de la communication audiovisuelle, écrite, cinématographique et numérique.",
  },
  {
    slug: "cge",
    name: "Centre Gabonais des Élections",
    description:
      "Autorité de régulation et d'organisation des scrutins. Remplace l'ancien CENAP supprimé sous la transition. Organisation des élections nationales et locales, gestion du fichier électoral, proclamation des résultats provisoires.",
  },
  {
    slug: "arcep",
    name:
      "Autorité de Régulation des Communications Électroniques et des Postes",
    description:
      "Autorité de régulation du secteur des télécommunications, du numérique et des services postaux.",
  },
  {
    slug: "arsee",
    name:
      "Agence de Régulation du Secteur de l'Eau Potable et de l'Énergie Électrique",
    description:
      "Régulation économique et technique des secteurs eau et électricité.",
  },
  {
    slug: "cnpdcp",
    name:
      "Commission Nationale pour la Protection des Données à Caractère Personnel",
    description:
      "Régulation de la protection des données personnelles, équivalent gabonais de la CNIL française.",
  },
  {
    slug: "anpi",
    name: "Agence Nationale de Promotion des Investissements",
    description:
      "Guichet unique pour les investisseurs nationaux et étrangers.",
  },
  {
    slug: "artf",
    name: "Autorité de Régulation du Transport Ferroviaire",
    description:
      "Régulation des activités ferroviaires (concession SETRAG, sécurité, tarifs).",
  },
  {
    slug: "anac",
    name: "Agence Nationale de l'Aviation Civile",
    description:
      "Régulation et supervision de la sécurité et de la sûreté aérienne.",
  },
  {
    slug: "conseil-economique-nation",
    name: "Conseil Économique de la Nation",
    description:
      "Organe consultatif nouvellement créé par la 5e République pour piloter la stratégie économique nationale.",
  },
  {
    slug: "comite-transition-energetique",
    name: "Comité Stratégique de la Transition Énergétique",
    description:
      "Organe consultatif nouvellement créé par la 5e République pour piloter la transition énergétique.",
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const aai of AAI_ORGS) {
      try {
        const existing = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", aai.slug))
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        await ctx.db.insert("orgs", {
          slug: aai.slug,
          name: aai.name,
          type: OrganizationType.IndependentAuthority,
          country: "GA",
          timezone: "Africa/Libreville",
          address: LIBREVILLE_DEFAULT_ADDRESS,
          tutelleLevel: 0,
          ...(aai.description && { description: aai.description }),
          modules: DEFAULT_AAI_MODULES,
          isActive: true,
        } as any);

        results.created++;
      } catch (error) {
        results.errors.push(
          `${aai.slug}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  },
});
