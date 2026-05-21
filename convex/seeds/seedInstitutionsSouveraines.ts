/**
 * Seed des institutions souveraines de la 5e République gabonaise.
 *
 * Couvre :
 *  - Présidence + 8 services (Vice-Présidence République, SG, Cabinets, DG Protocole,
 *    DG Communication présidentielle, Garde Républicaine, Vice-Présidence Gouvernement)
 *  - Parlement : Assemblée nationale, Sénat, Office Parlementaire d'Évaluation
 *  - Juridictions suprêmes : Cour constitutionnelle, Cour de cassation, Conseil d'État,
 *    Cour des comptes, Haute Cour de Justice, Cour de Justice de la République, CSM
 *  - Institutions consultatives : CESEC, Médiateur, CNDH, CNLCEI
 *
 * Tutelle : niveau 0 (souverain — pas de tutelle).
 *
 * Utilisation :
 *   npx convex run seeds/seedInstitutionsSouveraines:run
 *
 * Sources : ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md §2, §5, §6, §7
 */
import { mutation } from "../_generated/server";
import { OrganizationType } from "../lib/constants";

// ─── Modules par défaut ──────────────────────────────────────────
// Institutions souveraines : iBureau complet + noyau administratif.
// On exclut consular_affairs/diplomatic_affairs (réservé aux représentations
// diplomatiques) et les modules network_* (réservés aux ministères).
const DEFAULT_SOVEREIGN_MODULES = [
  "correspondence",
  "documents",
  "calendar",
  "messaging",
  "iasted",
  "iarchive",
  "iboite",
];

// Adresse standard à Libreville quand la précision exacte n'est pas dans le
// référentiel — pattern documenté dans le brief Phase 2.
const LIBREVILLE_DEFAULT_ADDRESS = {
  street: "À préciser",
  city: "Libreville",
  postalCode: "BP 000",
  country: "GA" as const,
};

interface SovereignOrgInput {
  slug: string;
  name: string;
  type: (typeof OrganizationType)[keyof typeof OrganizationType];
  description?: string;
  // Le parent éventuel (référencé par slug pour résolution à l'insertion).
  parentSlug?: string;
}

// ─── Présidence + Vice-Présidence + Gouvernement (9 entités) ────
// Cf. §2.3 — cellules rattachées explicitement listées dans le référentiel.
const PRESIDENCY_ORGS: SovereignOrgInput[] = [
  {
    slug: "presidence",
    name: "Présidence de la République",
    type: OrganizationType.Presidency,
    description:
      "Chef de l'État et Chef du Gouvernement. Mandat de 7 ans, renouvelable une seule fois.",
  },
  {
    slug: "vice-presidence-republique",
    name: "Vice-Présidence de la République",
    type: OrganizationType.VicePresidency,
    parentSlug: "presidence",
  },
  {
    slug: "secretariat-general-presidence",
    name: "Secrétariat général de la Présidence",
    type: OrganizationType.Presidency,
    parentSlug: "presidence",
  },
  {
    slug: "cabinet-civil-presidence",
    name: "Cabinet civil de la Présidence",
    type: OrganizationType.Presidency,
    parentSlug: "presidence",
  },
  {
    slug: "cabinet-militaire-presidence",
    name: "Cabinet militaire / État-major particulier",
    type: OrganizationType.Presidency,
    parentSlug: "presidence",
  },
  {
    slug: "dg-protocole-etat",
    name: "Direction Générale du Protocole d'État",
    type: OrganizationType.DirectorateGeneral,
    parentSlug: "presidence",
  },
  {
    slug: "dg-communication-presidentielle",
    name: "Direction Générale de la Communication présidentielle",
    type: OrganizationType.DirectorateGeneral,
    parentSlug: "presidence",
  },
  {
    slug: "garde-republicaine",
    name: "Garde Républicaine",
    type: OrganizationType.Presidency,
    description:
      "Unité d'élite directement rattachée au Chef de l'État.",
    parentSlug: "presidence",
  },
  {
    slug: "vice-presidence-gouvernement",
    name: "Vice-Présidence du Gouvernement",
    type: OrganizationType.Government,
    description:
      "Exerce la fonction équivalente à un Premier ministre. Canal logique 'Primature' selon PROJET_DIGITALISATION §8.1.",
    parentSlug: "presidence",
  },
];

// ─── Parlement (3 entités) — §5 ─────────────────────────────────
const PARLIAMENT_ORGS: SovereignOrgInput[] = [
  {
    slug: "assemblee-nationale",
    name: "Assemblée nationale",
    type: OrganizationType.ParliamentChamber,
    description: "145 députés élus pour 5 ans (dont 2 représentant la diaspora).",
  },
  {
    slug: "senat",
    name: "Sénat",
    type: OrganizationType.ParliamentChamber,
    description:
      "70 sénateurs (52 élus + 15 nommés par le Président + 3 sièges additionnels créés en 2025). Mandat de 6 ans.",
  },
  {
    slug: "office-parlementaire-evaluation",
    name: "Office Parlementaire d'Évaluation des Politiques Publiques",
    type: OrganizationType.ConsultativeInstitution,
    description: "Organe parlementaire d'évaluation, mentionné §5.4.",
  },
];

// ─── Juridictions suprêmes (7 entités) — §6 ────────────────────
const SUPREME_COURTS_ORGS: SovereignOrgInput[] = [
  {
    slug: "cour-constitutionnelle",
    name: "Cour Constitutionnelle",
    type: OrganizationType.SupremeCourt,
    description:
      "9 juges + anciens présidents membres de droit. Garantie des droits fondamentaux, contentieux électoral, contrôle de constitutionnalité.",
  },
  {
    slug: "cour-cassation",
    name: "Cour de Cassation",
    type: OrganizationType.SupremeCourt,
    description:
      "Plus haute juridiction de l'ordre judiciaire (civil, commercial, social, pénal).",
  },
  {
    slug: "conseil-etat",
    name: "Conseil d'État",
    type: OrganizationType.SupremeCourt,
    description: "Plus haute juridiction de l'ordre administratif.",
  },
  {
    slug: "cour-comptes",
    name: "Cour des Comptes",
    type: OrganizationType.SupremeCourt,
    description:
      "Plus haute juridiction de l'ordre financier. Contrôle l'exécution des lois de finances.",
  },
  {
    slug: "haute-cour-justice",
    name: "Haute Cour de Justice",
    type: OrganizationType.SupremeCourt,
    description:
      "Juge des crimes et délits commis par le Président de la République en cas de haute trahison.",
  },
  {
    slug: "cour-justice-republique",
    name: "Cour de Justice de la République",
    type: OrganizationType.SupremeCourt,
    description:
      "Juge les membres du Gouvernement pour les actes accomplis dans l'exercice de leurs fonctions.",
  },
  {
    slug: "csm",
    name: "Conseil Supérieur de la Magistrature",
    type: OrganizationType.SupremeCourt,
    description:
      "Organe de gestion de la carrière des magistrats (nominations, avancements, discipline). Présidé par le Président de la République.",
  },
];

// ─── Institutions consultatives (4 entités) — §7 ───────────────
const CONSULTATIVE_ORGS: SovereignOrgInput[] = [
  {
    slug: "cesec",
    name: "Conseil Économique, Social, Environnemental et Culturel",
    type: OrganizationType.ConsultativeInstitution,
    description:
      "60 membres issus de la société civile, du monde économique, des partenaires sociaux, des cultes, des Gabonais de l'étranger et des populations autochtones. Créé par le Titre VII de la Constitution de 2024.",
  },
  {
    slug: "mediateur-republique",
    name: "Médiateur de la République, Défenseur des Droits",
    type: OrganizationType.ConsultativeInstitution,
    description:
      "Médiation administration/citoyens, défense des droits, lutte contre les discriminations. Alignée sur les Principes de Paris des Nations Unies.",
  },
  {
    slug: "cndh",
    name: "Commission Nationale des Droits de l'Homme",
    type: OrganizationType.ConsultativeInstitution,
    description:
      "Institution nationale indépendante de promotion et de protection des droits de l'Homme.",
  },
  {
    slug: "cnlcei",
    name: "Commission Nationale de Lutte Contre l'Enrichissement Illicite",
    type: OrganizationType.ConsultativeInstitution,
    description:
      "Prévention et lutte contre la corruption, le blanchiment et l'enrichissement illicite.",
  },
];

const ALL_SOVEREIGN_ORGS: SovereignOrgInput[] = [
  ...PRESIDENCY_ORGS,
  ...PARLIAMENT_ORGS,
  ...SUPREME_COURTS_ORGS,
  ...CONSULTATIVE_ORGS,
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

    for (const org of ALL_SOVEREIGN_ORGS) {
      try {
        // Idempotence : si le slug existe, on saute.
        const existing = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", org.slug))
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Résolution du parent par slug (optionnel pour les institutions souveraines).
        let parentOrgId: string | undefined = undefined;
        if (org.parentSlug) {
          const parent = await ctx.db
            .query("orgs")
            .withIndex("by_slug", (q) => q.eq("slug", org.parentSlug as string))
            .first();
          if (!parent) {
            results.errors.push(
              `Parent ${org.parentSlug} introuvable pour ${org.slug}`,
            );
            continue;
          }
          parentOrgId = parent._id as unknown as string;
        }

        await ctx.db.insert("orgs", {
          slug: org.slug,
          name: org.name,
          type: org.type,
          country: "GA",
          timezone: "Africa/Libreville",
          address: LIBREVILLE_DEFAULT_ADDRESS,
          tutelleLevel: 0,
          ...(parentOrgId && { parentOrgId: parentOrgId as any }),
          ...(org.description && { description: org.description }),
          modules: DEFAULT_SOVEREIGN_MODULES,
          isActive: true,
        } as any);

        results.created++;
      } catch (error) {
        results.errors.push(
          `${org.slug}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  },
});
