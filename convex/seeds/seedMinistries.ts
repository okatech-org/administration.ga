/**
 * Seed des 28 ministères de la 5e République gabonaise (Gouvernement Oligui
 * Nguema II, formé le 1er janvier 2026).
 *
 * Couvre :
 *  - 3 ministres d'État (Défense, Éducation Nationale, Transports)
 *  - 24 ministres
 *  - 1 ministre délégué (Budget, rattaché à Économie/Finances)
 *
 * Tutelle : niveau 1 (rattachement logique à la Présidence — non matérialisé
 * via parentOrgId pour ne pas surcharger l'organigramme racine, sauf pour
 * le ministère délégué Budget qui a `parentOrgId = min-economie-finances`).
 *
 * Utilisation :
 *   npx convex run seeds/seedMinistries:run
 *
 * Sources : ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md §3 + §4.1-§4.28
 *           ADMINISTRATION.GA/SYNTHESE_REFERENCES.md §A.2
 */
import { mutation } from "../_generated/server";
import { OrganizationType, MinistrySubType } from "../lib/constants";

// Modules pré-activés sur les ministères : iBureau complet, noyau administratif,
// supervision réseau correspondance + AI institutionnel.
const DEFAULT_MINISTRY_MODULES = [
  "correspondence",
  "documents",
  "calendar",
  "messaging",
  "iasted",
  "iarchive",
  "iboite",
  "network_correspondence_oversight",
];

const LIBREVILLE_DEFAULT_ADDRESS = {
  street: "À préciser",
  city: "Libreville",
  postalCode: "BP 000",
  country: "GA" as const,
};

interface MinistryInput {
  slug: string;
  name: string;
  ministrySubType: (typeof MinistrySubType)[keyof typeof MinistrySubType];
  // Titulaire du portefeuille selon §3.2-§3.4. Utilisé pour `headOfMission`.
  headOfMission?: string;
  headOfMissionTitle?: string;
  // Pour le ministère délégué uniquement.
  parentSlug?: string;
  // Type override (par défaut Ministry, sauf Budget = DelegatedMinistry).
  type?: (typeof OrganizationType)[keyof typeof OrganizationType];
}

const MINISTRIES: MinistryInput[] = [
  // ─── Ministres d'État (3) — §3.2 ───────────────────────────────
  {
    slug: "min-defense",
    name: "Ministère de la Défense Nationale",
    ministrySubType: MinistrySubType.Defense,
    headOfMission: "Brigitte ONKANOWA",
    headOfMissionTitle: "Ministre d'État",
  },
  {
    slug: "min-education",
    name:
      "Ministère de l'Éducation Nationale et de l'Instruction Civique",
    ministrySubType: MinistrySubType.EducationNational,
    headOfMission: "Camélia NTOUTOUME LECLERCQ",
    headOfMissionTitle: "Ministre d'État",
  },
  {
    slug: "min-transports",
    name:
      "Ministère des Transports, de la Marine Marchande, chargé de la Logistique",
    ministrySubType: MinistrySubType.TransportMarine,
    headOfMission: "Ulrich MANFOUMBI MANFOUMBI",
    headOfMissionTitle: "Ministre d'État",
  },

  // ─── Ministres (24) — §3.3 ─────────────────────────────────────
  {
    slug: "min-interieur",
    name:
      "Ministère de l'Intérieur, de la Sécurité et de la Décentralisation",
    ministrySubType: MinistrySubType.InteriorSecurity,
    headOfMission: "Adrien NGUEMA MBA",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-economie-finances",
    name:
      "Ministère de l'Économie, des Finances, de la Dette et des Participations, chargé de la Lutte contre la Vie Chère",
    ministrySubType: MinistrySubType.EconomyFinance,
    headOfMission: "Thierry MINKO",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-affaires-etrangeres",
    name:
      "Ministère des Affaires Étrangères et de la Coopération, chargé de l'Intégration et de la Diaspora",
    ministrySubType: MinistrySubType.ForeignAffairs,
    headOfMission: "Marie-Édith TASSYLA YE DOUMBENENY",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-justice",
    name:
      "Ministère de la Justice, Garde des Sceaux, chargé des Droits Humains",
    ministrySubType: MinistrySubType.Justice,
    headOfMission: "Augustin EMANE",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-petrole-gaz",
    name: "Ministère du Pétrole et du Gaz",
    ministrySubType: MinistrySubType.PetroleumGas,
    headOfMission: "Clotaire KONDJA",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-mines",
    name: "Ministère des Mines et des Ressources Géologiques",
    ministrySubType: MinistrySubType.MinesGeology,
    headOfMission: "Sosthène NGUEMA NGUEMA",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-eau-energie",
    name: "Ministère de l'Accès Universel à l'Eau et à l'Énergie",
    ministrySubType: MinistrySubType.WaterEnergyAccess,
    headOfMission: "Philippe TONANGOYE",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-agriculture",
    name: "Ministère de l'Agriculture, de l'Élevage et du Développement Rural",
    ministrySubType: MinistrySubType.Agriculture,
    headOfMission: "Pacôme KOSSY",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-peche-mer",
    name: "Ministère de la Pêche, de la Mer et de l'Économie Bleue",
    ministrySubType: MinistrySubType.FisheriesBlueEconomy,
    headOfMission: "Aimé Martial MASSAMBA",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-eaux-forets",
    name:
      "Ministère des Eaux et Forêts, de l'Environnement, du Climat, chargé du Conflit Homme-Faune",
    ministrySubType: MinistrySubType.WatersForestsEnvironment,
    headOfMission: "Maurice NTOSSUI ALLOGO",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-sante",
    name: "Ministère de la Santé",
    ministrySubType: MinistrySubType.Health,
    headOfMission: "Elsa AYO épouse BIVIGOU",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-enseignement-superieur",
    name:
      "Ministère de l'Enseignement Supérieur et de la Recherche Scientifique, Porte-Parole du Gouvernement",
    ministrySubType: MinistrySubType.HigherEducation,
    headOfMission: "Charles Edgar MOMBO",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-travaux-publics",
    name: "Ministère des Travaux Publics et de la Construction",
    ministrySubType: MinistrySubType.PublicWorksConstruction,
    headOfMission: "Edgard MOUKOUMBI",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-logement",
    name:
      "Ministère du Logement, de l'Habitat, de l'Urbanisme et du Cadastre",
    ministrySubType: MinistrySubType.HousingUrbanismCadastre,
    headOfMission: "Mays MOUISSI",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-industrie",
    name: "Ministère de l'Industrie et de la Transformation Locale",
    ministrySubType: MinistrySubType.IndustryLocalTransformation,
    headOfMission: "Lubin NTOUTOUME",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-commerce",
    name:
      "Ministère du Commerce, des PME-PMI et de l'Entrepreneuriat des Jeunes",
    ministrySubType: MinistrySubType.CommercePme,
    headOfMission: "Zenaba GNINGA CHANING",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-numerique",
    name:
      "Ministère de l'Économie Numérique, de la Digitalisation et de l'Innovation",
    ministrySubType: MinistrySubType.DigitalEconomyInnovation,
    headOfMission: "Mark-Alexandre DOUMBA",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-fonction-publique",
    name:
      "Ministère de la Fonction Publique et du Renforcement des Capacités",
    ministrySubType: MinistrySubType.CivilServiceCapacity,
    headOfMission: "Laurence MENGUE ME NZOGHE épouse NDONG",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-travail",
    name:
      "Ministère du Travail, du Plein Emploi, du Dialogue Social et de la Formation Professionnelle",
    ministrySubType: MinistrySubType.LaborEmploymentDialogue,
    headOfMission: "Jacqueline ILOGUE épouse BIGNOUMBA",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-affaires-sociales",
    name:
      "Ministère des Affaires Sociales, chargé de la Protection de l'Enfance et de la Femme",
    ministrySubType: MinistrySubType.SocialAffairsChildhoodWomen,
    headOfMission: "Armande LONGO épouse MOULENGUI",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-jeunesse-sports",
    name:
      "Ministère de la Jeunesse, des Sports, du Rayonnement Culturel et des Arts, chargé de la Vie Associative",
    ministrySubType: MinistrySubType.YouthSportsCultureArts,
    headOfMission: "Paul Ulrich KESSANY",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-tourisme",
    name: "Ministère du Tourisme Durable et de l'Artisanat",
    ministrySubType: MinistrySubType.SustainableTourismCrafts,
    headOfMission: "Marcelle IBINGA épouse ITSITSA",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-communication",
    name: "Ministère de la Communication et des Médias",
    ministrySubType: MinistrySubType.CommunicationMedia,
    headOfMission: "Germain BIHADJOW",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-planification",
    name: "Ministère de la Planification et de la Prospective",
    ministrySubType: MinistrySubType.PlanningProspective,
    headOfMission: "Louise Pierrette MVONO",
    headOfMissionTitle: "Ministre",
  },
  {
    slug: "min-reformes-institutions",
    name:
      "Ministère de la Réforme et des Relations avec les Institutions",
    ministrySubType: MinistrySubType.ReformInstitutionsRelations,
    headOfMission: "François NDONG OBIANG",
    headOfMissionTitle: "Ministre",
  },

  // ─── Ministre délégué (1) — §3.4 ──────────────────────────────
  // Rattaché à min-economie-finances via parentOrgId (résolu à l'insertion).
  {
    slug: "min-budget",
    name:
      "Ministère Délégué auprès du Ministre de l'Économie, des Finances, de la Dette et des Participations, chargé du Budget",
    ministrySubType: MinistrySubType.Budget,
    headOfMission: "Marc ABEGHE",
    headOfMissionTitle: "Ministre Délégué",
    parentSlug: "min-economie-finances",
    type: OrganizationType.DelegatedMinistry,
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

    for (const ministry of MINISTRIES) {
      try {
        const existing = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", ministry.slug))
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Résolution du parent pour le ministère délégué.
        let parentOrgId: string | undefined = undefined;
        if (ministry.parentSlug) {
          const parent = await ctx.db
            .query("orgs")
            .withIndex("by_slug", (q) =>
              q.eq("slug", ministry.parentSlug as string),
            )
            .first();
          if (!parent) {
            results.errors.push(
              `Parent ${ministry.parentSlug} introuvable pour ${ministry.slug}`,
            );
            continue;
          }
          parentOrgId = parent._id as unknown as string;
        }

        await ctx.db.insert("orgs", {
          slug: ministry.slug,
          name: ministry.name,
          type: ministry.type ?? OrganizationType.Ministry,
          ministrySubType: ministry.ministrySubType,
          country: "GA",
          timezone: "Africa/Libreville",
          address: LIBREVILLE_DEFAULT_ADDRESS,
          tutelleLevel: 1,
          ...(parentOrgId && { parentOrgId: parentOrgId as any }),
          ...(ministry.headOfMission && { headOfMission: ministry.headOfMission }),
          ...(ministry.headOfMissionTitle && {
            headOfMissionTitle: ministry.headOfMissionTitle,
          }),
          modules: DEFAULT_MINISTRY_MODULES,
          isActive: true,
        } as any);

        results.created++;
      } catch (error) {
        results.errors.push(
          `${ministry.slug}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  },
});
