/**
 * Seed des établissements publics et entreprises sous tutelle.
 *
 * Échantillon représentatif des ~80 EP mentionnés dans §4.1-§4.28 du
 * référentiel 5e République, organisé par ministère de tutelle.
 *
 * Conflit nommage SNI résolu (cf. SYNTHESE §D.3) :
 *  - Société Nationale Immobilière (Logement)   → `sni-immobiliere`
 *  - Société Nationale d'Imprimerie (Médias)    → `sni-imprimerie`
 *
 * Type Convex utilisé : `PublicEstablishment`.
 *
 * Utilisation :
 *   npx convex run seeds/seedEtablissementsPublics:run
 *
 * Sources : ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md §4.1-§4.28
 *           ADMINISTRATION.GA/SYNTHESE_REFERENCES.md §A.4
 */
import { mutation } from "../_generated/server";
import { OrganizationType } from "../lib/constants";

const DEFAULT_EP_MODULES = [
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

interface EPInput {
  slug: string;
  name: string;
  parentSlug: string;
  description?: string;
}

// ─── §4.3 Sous tutelle Économie/Finances ──────────────────────
const EP_FINANCES: EPInput[] = [
  {
    slug: "beac",
    name: "Banque des États de l'Afrique Centrale",
    parentSlug: "min-economie-finances",
    description: "Banque centrale commune des États de la CEMAC.",
  },
  {
    slug: "bgd",
    name: "Banque Gabonaise de Développement",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "cdc",
    name: "Caisse des Dépôts et Consignations",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "caistab",
    name: "Caisse de Stabilisation et de Péréquation",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "fgis",
    name: "Fonds Gabonais d'Investissements Stratégiques",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "societe-patrimoniale",
    name: "Société Patrimoniale",
    parentSlug: "min-economie-finances",
    description: "Gestion des participations de l'État.",
  },
  {
    slug: "loterie-nationale",
    name: "Loterie Nationale Gabonaise",
    parentSlug: "min-economie-finances",
  },
];

// ─── §4.5 Sous tutelle Justice ─────────────────────────────────
const EP_JUSTICE: EPInput[] = [
  {
    slug: "enm",
    name: "École Nationale de la Magistrature",
    parentSlug: "min-justice",
  },
  {
    slug: "securite-penitentiaire",
    name: "Sécurité Pénitentiaire",
    parentSlug: "min-justice",
    description:
      "Corps paramilitaire d'État sous tutelle du Ministère de la Justice depuis 2010.",
  },
  {
    slug: "conseil-national-mediation",
    name: "Conseil National de la Médiation",
    parentSlug: "min-justice",
  },
  {
    slug: "cnpcei",
    name:
      "Commission Nationale pour la Prévention de la Corruption et de l'Enrichissement Illicite",
    parentSlug: "min-justice",
  },
  {
    slug: "prison-centrale-libreville",
    name: "Prison Centrale de Libreville",
    parentSlug: "min-justice",
    description:
      "Établissement pénitentiaire principal (cf. 9 établissements pénitentiaires, un par province).",
  },
];

// ─── §4.6 Sous tutelle Pétrole et Gaz ─────────────────────────
const EP_PETROLE: EPInput[] = [
  {
    slug: "goc",
    name: "Gabon Oil Company",
    parentSlug: "min-petrole-gaz",
    description: "Compagnie pétrolière nationale.",
  },
  {
    slug: "sogara",
    name: "Société Gabonaise de Raffinage",
    parentSlug: "min-petrole-gaz",
  },
  {
    slug: "sndp",
    name: "Société Nationale de Distribution de Produits Pétroliers",
    parentSlug: "min-petrole-gaz",
  },
  {
    slug: "caisse-stabilisation-hydrocarbures",
    name: "Caisse de Stabilisation des Hydrocarbures",
    parentSlug: "min-petrole-gaz",
  },
];

// ─── §4.7 Sous tutelle Mines ──────────────────────────────────
const EP_MINES: EPInput[] = [
  {
    slug: "sem",
    name: "Société Équatoriale des Mines",
    parentSlug: "min-mines",
  },
  {
    slug: "comilog",
    name: "Compagnie Minière de l'Ogooué (COMILOG)",
    parentSlug: "min-mines",
    description: "Filiale Eramet — État actionnaire historique.",
  },
];

// ─── §4.8 Sous tutelle Eau/Énergie ────────────────────────────
const EP_EAU_ENERGIE: EPInput[] = [
  {
    slug: "seeg",
    name: "Société d'Énergie et d'Eau du Gabon",
    parentSlug: "min-eau-energie",
  },
  {
    slug: "fser",
    name: "Fonds Spécial d'Électrification Rurale",
    parentSlug: "min-eau-energie",
  },
];

// ─── §4.9 Sous tutelle Agriculture ────────────────────────────
const EP_AGRICULTURE: EPInput[] = [
  {
    slug: "onader",
    name: "Office National de Développement Rural",
    parentSlug: "min-agriculture",
  },
  {
    slug: "agasa",
    name: "Agence Gabonaise de Sécurité Alimentaire",
    parentSlug: "min-agriculture",
  },
  {
    slug: "accopa",
    name:
      "Agence de Collecte et de Commercialisation des Produits Agricoles",
    parentSlug: "min-agriculture",
  },
  {
    slug: "sotrader",
    name:
      "Société de Transformation Agricole et de Développement Rural",
    parentSlug: "min-agriculture",
  },
  {
    slug: "igad",
    name: "Institut Gabonais d'Appui au Développement",
    parentSlug: "min-agriculture",
  },
  {
    slug: "graine",
    name: "Programme GRAINE",
    parentSlug: "min-agriculture",
  },
];

// ─── §4.10 Sous tutelle Pêche ─────────────────────────────────
const EP_PECHE: EPInput[] = [
  {
    slug: "anpa",
    name: "Agence Nationale des Pêches et de l'Aquaculture",
    parentSlug: "min-peche-mer",
  },
  {
    slug: "irho",
    name: "Institut de Recherches Halieutiques et Océanographiques",
    parentSlug: "min-peche-mer",
  },
];

// ─── §4.11 Sous tutelle Eaux et Forêts ────────────────────────
const EP_EAUX_FORETS: EPInput[] = [
  {
    slug: "anpn",
    name: "Agence Nationale des Parcs Nationaux",
    parentSlug: "min-eaux-forets",
    description: "Gestion des 13 parcs nationaux du Gabon.",
  },
  {
    slug: "aeaffb",
    name: "Agence d'Exécution des Activités de la Filière Forêt-Bois",
    parentSlug: "min-eaux-forets",
  },
  {
    slug: "cnc-climat",
    name: "Conseil National Climat",
    parentSlug: "min-eaux-forets",
  },
  {
    slug: "ageos",
    name: "Agence Gabonaise d'Études et d'Observations Spatiales",
    parentSlug: "min-eaux-forets",
  },
  {
    slug: "snbg",
    name: "Société Nationale des Bois du Gabon",
    parentSlug: "min-eaux-forets",
    description: "En gestion partagée avec Industrie.",
  },
];

// ─── §4.12 Sous tutelle Santé ─────────────────────────────────
const EP_SANTE: EPInput[] = [
  {
    slug: "chul",
    name: "Centre Hospitalier Universitaire de Libreville",
    parentSlug: "min-sante",
  },
  {
    slug: "chuo",
    name: "Centre Hospitalier Universitaire d'Owendo",
    parentSlug: "min-sante",
  },
  {
    slug: "chua",
    name: "Centre Hospitalier Universitaire d'Angondjé",
    parentSlug: "min-sante",
  },
  {
    slug: "chu-mere-enfant",
    name:
      "Centre Hospitalier Universitaire de Mère-Enfant Fondation Jeanne Ebori",
    parentSlug: "min-sante",
  },
  {
    slug: "opn",
    name: "Office Pharmaceutique National",
    parentSlug: "min-sante",
    description: "Devenu société d'État.",
  },
  {
    slug: "cnamgs",
    name: "Caisse Nationale d'Assurance Maladie et de Garantie Sociale",
    parentSlug: "min-sante",
  },
  {
    slug: "cnss",
    name: "Caisse Nationale de Sécurité Sociale",
    parentSlug: "min-sante",
  },
  {
    slug: "ihpa",
    name: "Institut d'Hygiène Publique et d'Assainissement",
    parentSlug: "min-sante",
  },
  {
    slug: "cermel",
    name: "Centre de Recherches Médicales de Lambaréné",
    parentSlug: "min-sante",
  },
];

// ─── §4.13 Sous tutelle Éducation Nationale ───────────────────
const EP_EDUCATION: EPInput[] = [
  {
    slug: "onb",
    name: "Office National du Baccalauréat",
    parentSlug: "min-education",
  },
  {
    slug: "office-examens-concours",
    name: "Office National des Examens et Concours",
    parentSlug: "min-education",
  },
  {
    slug: "ipn",
    name: "Institut Pédagogique National",
    parentSlug: "min-education",
  },
];

// ─── §4.14 Sous tutelle Enseignement Supérieur ────────────────
const EP_ENSEIGNEMENT_SUP: EPInput[] = [
  {
    slug: "uob",
    name: "Université Omar Bongo",
    parentSlug: "min-enseignement-superieur",
    description: "Université publique — Libreville.",
  },
  {
    slug: "ustm",
    name: "Université des Sciences et Techniques de Masuku",
    parentSlug: "min-enseignement-superieur",
    description: "Université publique — Franceville.",
  },
  {
    slug: "uss",
    name: "Université des Sciences de la Santé",
    parentSlug: "min-enseignement-superieur",
    description: "Université publique — Libreville/Owendo.",
  },
  {
    slug: "ens",
    name: "École Normale Supérieure",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "enset",
    name: "École Normale Supérieure de l'Enseignement Technique",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "insg",
    name: "Institut National des Sciences de Gestion",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "iuso",
    name: "Institut Universitaire des Sciences de l'Organisation",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "ist",
    name: "Institut Supérieur de Technologie",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "cenarest",
    name: "Centre National de la Recherche Scientifique et Technologique",
    parentSlug: "min-enseignement-superieur",
    description:
      "Chapeaute IRT, IRAF, IRSH, IPHAMETRA, IRET (instituts de recherche).",
  },
];

// ─── §4.15 Sous tutelle Transports ────────────────────────────
const EP_TRANSPORTS: EPInput[] = [
  {
    slug: "anac",
    name: "Agence Nationale de l'Aviation Civile",
    parentSlug: "min-transports",
  },
  {
    slug: "oprag",
    name: "Office des Ports et Rades du Gabon",
    parentSlug: "min-transports",
  },
  {
    slug: "onsfag",
    name: "Office National de la Sécurité Ferroviaire",
    parentSlug: "min-transports",
  },
  {
    slug: "sogatra",
    name: "Société Nationale des Transports Gabonais",
    parentSlug: "min-transports",
  },
  {
    slug: "setrag",
    name: "Société d'Exploitation du Transgabonais",
    parentSlug: "min-transports",
    description: "Partenariat ferroviaire.",
  },
  {
    slug: "asecna",
    name:
      "Agence pour la Sécurité de la Navigation Aérienne en Afrique et à Madagascar",
    parentSlug: "min-transports",
    description: "Implantation gabonaise.",
  },
];

// ─── §4.16 Sous tutelle Travaux Publics ───────────────────────
const EP_TRAVAUX_PUBLICS: EPInput[] = [
  {
    slug: "fer",
    name: "Fonds d'Entretien Routier",
    parentSlug: "min-travaux-publics",
  },
  {
    slug: "sag",
    name: "Société Autoroutière du Gabon",
    parentSlug: "min-travaux-publics",
  },
];

// ─── §4.17 Sous tutelle Logement ──────────────────────────────
const EP_LOGEMENT: EPInput[] = [
  {
    slug: "snls",
    name: "Société Nationale du Logement Social",
    parentSlug: "min-logement",
  },
  {
    slug: "anuttc",
    name:
      "Agence Nationale de l'Urbanisme, des Travaux Topographiques et du Cadastre",
    parentSlug: "min-logement",
  },
  {
    slug: "sni-immobiliere",
    name: "Société Nationale Immobilière",
    parentSlug: "min-logement",
    description:
      "Conflit nommage SNI résolu (cf. SYNTHESE §D.3) — slug disambigué de la Société Nationale d'Imprimerie (sni-imprimerie).",
  },
];

// ─── §4.18 Sous tutelle Industrie ─────────────────────────────
const EP_INDUSTRIE: EPInput[] = [
  {
    slug: "gsez-nkok",
    name: "Zone Économique Spéciale de Nkok",
    parentSlug: "min-industrie",
    description: "Partenariat industriel.",
  },
  {
    slug: "aganor",
    name: "Agence Gabonaise de Normalisation",
    parentSlug: "min-industrie",
  },
];

// ─── §4.20 Sous tutelle Numérique ─────────────────────────────
const EP_NUMERIQUE: EPInput[] = [
  {
    slug: "aninf",
    name:
      "Agence Nationale des Infrastructures Numériques et des Fréquences",
    parentSlug: "min-numerique",
    description: "Créée par décret n° 212/PR du 27 janvier 2011.",
  },
  {
    slug: "poste-gabon",
    name: "Société des Postes Gabonaises",
    parentSlug: "min-numerique",
    // TODO: à vérifier post-remaniement 2026 — historiquement rattaché à
    // min-communication (cf. SYNTHESE §D.11).
  },
  {
    slug: "gabon-digital",
    name: "Programme Gabon-Digital",
    parentSlug: "min-numerique",
    description:
      "Financement Banque mondiale : 44 milliards FCFA.",
  },
];

// ─── §4.21 Sous tutelle Fonction Publique ─────────────────────
const EP_FONCTION_PUBLIQUE: EPInput[] = [
  {
    slug: "ena",
    name: "École Nationale d'Administration",
    parentSlug: "min-fonction-publique",
  },
  {
    slug: "ief",
    name: "Institut de l'Économie et des Finances",
    parentSlug: "min-fonction-publique",
  },
  // Note : ONE est listé sous Fonction Publique §4.21 ET sous Travail §4.22.
  // On le rattache ici, sous le ministère qui le mentionne en premier.
  {
    slug: "one",
    name: "Office National de l'Emploi",
    parentSlug: "min-fonction-publique",
    description:
      "Mentionné aussi sous §4.22 Ministère du Travail. Rattachement principal Fonction Publique.",
  },
];

// ─── §4.4 Sous tutelle Affaires Étrangères ────────────────────
const EP_MAE: EPInput[] = [
  {
    slug: "idri",
    name: "Institut Diplomatique et des Relations Internationales",
    parentSlug: "min-affaires-etrangeres",
  },
  {
    slug: "csge",
    name: "Conseil Supérieur des Gabonais de l'Étranger",
    parentSlug: "min-affaires-etrangeres",
  },
];

// ─── §4.26 Sous tutelle Communication ─────────────────────────
const EP_COMMUNICATION: EPInput[] = [
  {
    slug: "gabon-tv",
    name: "Gabon Télévision",
    parentSlug: "min-communication",
    description: "Chaîne nationale publique.",
  },
  {
    slug: "radio-gabon",
    name: "Radio Gabon",
    parentSlug: "min-communication",
  },
  {
    slug: "agp",
    name: "Agence Gabonaise de Presse",
    parentSlug: "min-communication",
  },
  {
    slug: "sni-imprimerie",
    name: "Société Nationale d'Imprimerie",
    parentSlug: "min-communication",
    description:
      "Conflit nommage SNI résolu (cf. SYNTHESE §D.3) — slug disambigué de la Société Nationale Immobilière (sni-immobiliere).",
  },
];

const ALL_EP: EPInput[] = [
  ...EP_FINANCES,
  ...EP_MAE,
  ...EP_JUSTICE,
  ...EP_PETROLE,
  ...EP_MINES,
  ...EP_EAU_ENERGIE,
  ...EP_AGRICULTURE,
  ...EP_PECHE,
  ...EP_EAUX_FORETS,
  ...EP_SANTE,
  ...EP_EDUCATION,
  ...EP_ENSEIGNEMENT_SUP,
  ...EP_TRANSPORTS,
  ...EP_TRAVAUX_PUBLICS,
  ...EP_LOGEMENT,
  ...EP_INDUSTRIE,
  ...EP_NUMERIQUE,
  ...EP_FONCTION_PUBLIQUE,
  ...EP_COMMUNICATION,
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

    for (const ep of ALL_EP) {
      try {
        const existing = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", ep.slug))
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        const parent = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", ep.parentSlug))
          .first();

        if (!parent) {
          results.errors.push(
            `Parent ${ep.parentSlug} introuvable pour ${ep.slug}`,
          );
          continue;
        }

        await ctx.db.insert("orgs", {
          slug: ep.slug,
          name: ep.name,
          type: OrganizationType.PublicEstablishment,
          country: "GA",
          timezone: "Africa/Libreville",
          address: LIBREVILLE_DEFAULT_ADDRESS,
          tutelleLevel: 2,
          parentOrgId: parent._id as any,
          ...(ep.description && { description: ep.description }),
          modules: DEFAULT_EP_MODULES,
          isActive: true,
        } as any);

        results.created++;
      } catch (error) {
        results.errors.push(
          `${ep.slug}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  },
});
