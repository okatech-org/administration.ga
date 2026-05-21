/**
 * Seed des Directions Générales (DG) sous tutelle des ministères.
 *
 * Couvre la liste des DG documentées dans §4.1 à §4.28 du référentiel
 * 5e République, organisée par ministère parent. Chaque DG a :
 *  - type: OrganizationType.DirectorateGeneral
 *  - tutelleLevel: 2
 *  - parentOrgId: résolu via le slug du ministère parent
 *
 * Conflits documentés résolus avec slugs disambigués :
 *  - DGAP (Affaires Politiques MAE)        → `dgap-mae`
 *  - DGAP (Administration Pénitentiaire)   → `dgap-penitentiaire`
 *  - DGS  (Statistique partagée)           → `dgs` rattaché à Économie/Finances
 *                                            (tutelle principale, cf. SYNTHESE §A.3)
 *
 * Utilisation :
 *   npx convex run seeds/seedDirectionsGenerales:run
 *
 * Sources : ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md §4.1-§4.28
 *           ADMINISTRATION.GA/SYNTHESE_REFERENCES.md §A.3 + §D (conflits)
 */
import { mutation } from "../_generated/server";
import { OrganizationType } from "../lib/constants";

// Modules pré-activés sur les DG : iBureau + noyau administratif (sans
// supervision réseau, réservée aux ministères).
const DEFAULT_DG_MODULES = [
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

interface DGInput {
  slug: string;
  name: string;
  parentSlug: string;
}

// ─── §4.1 Ministère de la Défense ───────────────────────────────
const DG_DEFENSE: DGInput[] = [
  {
    slug: "dg-services-speciaux",
    name: "Direction Générale des Services Spéciaux",
    parentSlug: "min-defense",
  },
  {
    slug: "dg-documentation-securite-exterieure",
    name: "Direction Générale de la Documentation et de la Sécurité Extérieure",
    parentSlug: "min-defense",
  },
];

// ─── §4.2 Ministère de l'Intérieur ─────────────────────────────
const DG_INTERIEUR: DGInput[] = [
  {
    slug: "dgdi",
    name: "Direction Générale de la Documentation et de l'Immigration",
    parentSlug: "min-interieur",
  },
  {
    slug: "dgop",
    name: "Direction Générale de l'Organisation et du Personnel",
    parentSlug: "min-interieur",
  },
  {
    slug: "dgl",
    name: "Direction Générale de la Logistique",
    parentSlug: "min-interieur",
  },
  {
    slug: "dg-operations",
    name: "Direction Générale des Opérations",
    parentSlug: "min-interieur",
  },
  {
    slug: "oclad",
    name: "Direction Générale de l'Office Central de Lutte Anti-Drogue",
    parentSlug: "min-interieur",
  },
  {
    slug: "dg-decentralisation",
    name:
      "Direction Générale de la Décentralisation et du Développement Local",
    parentSlug: "min-interieur",
  },
  {
    slug: "dg-securite-civile",
    name:
      "Direction Générale de la Sécurité Civile et de la Protection des Populations",
    parentSlug: "min-interieur",
  },
  {
    slug: "dg-hygiene",
    name: "Direction Générale de l'Hygiène et de l'Assainissement",
    parentSlug: "min-interieur",
  },
];

// ─── §4.3 Ministère de l'Économie, des Finances ────────────────
const DG_FINANCES: DGInput[] = [
  {
    slug: "dgi",
    name: "Direction Générale des Impôts",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "dgddi",
    name: "Direction Générale des Douanes et Droits Indirects",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "dgbfip",
    name: "Direction Générale du Budget et des Finances Publiques",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "dgtcp",
    name:
      "Direction Générale du Trésor, de la Comptabilité Publique et des Participations",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "dgepf",
    name: "Direction Générale de l'Économie et de la Politique Fiscale",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "dg-dette",
    name: "Direction Générale de la Dette",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "dgcrcp",
    name:
      "Direction Générale du Contrôle des Ressources et des Charges Publiques",
    parentSlug: "min-economie-finances",
  },
  {
    slug: "dg-concurrence",
    name:
      "Direction Générale de la Concurrence, de la Consommation et de la Lutte contre la Vie Chère",
    parentSlug: "min-economie-finances",
  },
  // DGS = DG de la Statistique. Partagée avec Planification — rattachement
  // principal à Économie/Finances (cf. SYNTHESE §D.4 et §D.14).
  // TODO: à terme, modéliser via `secondaryTutelleOrgIds[]` une fois le champ
  // ajouté au schéma orgs.
  {
    slug: "dgs",
    name: "Direction Générale de la Statistique",
    parentSlug: "min-economie-finances",
  },
];

// ─── §4.4 Ministère des Affaires Étrangères ────────────────────
// DGAP-MAE = DG Affaires Politiques (slug disambigué cf. §D.2).
const DG_MAE: DGInput[] = [
  {
    slug: "dgap-mae",
    name: "Direction Générale des Affaires Politiques",
    parentSlug: "min-affaires-etrangeres",
  },
  {
    slug: "dg-affaires-economiques-culturelles",
    name: "Direction Générale des Affaires Économiques et Culturelles",
    parentSlug: "min-affaires-etrangeres",
  },
  {
    slug: "dg-cooperation-internationale",
    name: "Direction Générale de la Coopération Internationale",
    parentSlug: "min-affaires-etrangeres",
  },
  {
    slug: "dg-integration-sous-regionale",
    name: "Direction Générale de l'Intégration Sous-Régionale",
    parentSlug: "min-affaires-etrangeres",
  },
  {
    slug: "dg-diaspora",
    name: "Direction Générale des Gabonais de l'Étranger et de la Diaspora",
    parentSlug: "min-affaires-etrangeres",
  },
  {
    slug: "dg-protocole-mae",
    name: "Direction Générale du Protocole d'État (MAE)",
    parentSlug: "min-affaires-etrangeres",
  },
  {
    slug: "dg-affaires-juridiques-consulaires",
    name: "Direction Générale des Affaires Juridiques et Consulaires",
    parentSlug: "min-affaires-etrangeres",
  },
];

// ─── §4.5 Ministère de la Justice ──────────────────────────────
// DGAP-Pénitentiaire = DG Administration Pénitentiaire (slug disambigué).
const DG_JUSTICE: DGInput[] = [
  {
    slug: "dg-affaires-civiles",
    name: "Direction Générale des Affaires Civiles et du Sceau",
    parentSlug: "min-justice",
  },
  {
    slug: "dg-affaires-criminelles",
    name: "Direction Générale des Affaires Criminelles et des Grâces",
    parentSlug: "min-justice",
  },
  {
    slug: "dgap-penitentiaire",
    name: "Direction Générale de l'Administration Pénitentiaire",
    parentSlug: "min-justice",
  },
  {
    slug: "dg-etudes-legislation",
    name:
      "Direction Générale des Études, de la Législation et de la Documentation",
    parentSlug: "min-justice",
  },
  {
    slug: "dg-droits-humains",
    name: "Direction Générale des Droits Humains",
    parentSlug: "min-justice",
  },
  {
    slug: "ig-services-judiciaires",
    name: "Inspection Générale des Services Judiciaires",
    parentSlug: "min-justice",
  },
];

// ─── §4.6 Ministère du Pétrole et du Gaz ───────────────────────
const DG_PETROLE: DGInput[] = [
  {
    slug: "dgh",
    name: "Direction Générale des Hydrocarbures",
    parentSlug: "min-petrole-gaz",
  },
  {
    slug: "dg-gaz",
    name: "Direction Générale du Gaz",
    parentSlug: "min-petrole-gaz",
  },
  {
    slug: "dg-produits-petroliers",
    name:
      "Direction Générale des Produits Pétroliers et de la Distribution",
    parentSlug: "min-petrole-gaz",
  },
];

// ─── §4.7 Ministère des Mines ──────────────────────────────────
const DG_MINES: DGInput[] = [
  {
    slug: "dgmg",
    name: "Direction Générale des Mines et de la Géologie",
    parentSlug: "min-mines",
  },
  {
    slug: "dg-ressources-geologiques",
    name: "Direction Générale des Ressources Géologiques",
    parentSlug: "min-mines",
  },
  {
    slug: "dg-cadastre-minier",
    name: "Direction Générale du Cadastre Minier",
    parentSlug: "min-mines",
  },
];

// ─── §4.8 Ministère de l'Eau et de l'Énergie ───────────────────
const DG_EAU_ENERGIE: DGInput[] = [
  {
    slug: "dge",
    name: "Direction Générale de l'Énergie",
    parentSlug: "min-eau-energie",
  },
  {
    slug: "dgrh",
    name: "Direction Générale des Ressources Hydrauliques",
    parentSlug: "min-eau-energie",
  },
  {
    slug: "dg-electrification-rurale",
    name: "Direction Générale de l'Électrification Rurale",
    parentSlug: "min-eau-energie",
  },
  {
    slug: "dg-hydraulique-villageoise",
    name: "Direction Générale de l'Hydraulique Villageoise",
    parentSlug: "min-eau-energie",
  },
];

// ─── §4.9 Ministère de l'Agriculture ───────────────────────────
const DG_AGRICULTURE: DGInput[] = [
  {
    slug: "dg-agriculture",
    name: "Direction Générale de l'Agriculture",
    parentSlug: "min-agriculture",
  },
  {
    slug: "dg-elevage",
    name: "Direction Générale de l'Élevage",
    parentSlug: "min-agriculture",
  },
  {
    slug: "dg-developpement-rural",
    name: "Direction Générale du Développement Rural",
    parentSlug: "min-agriculture",
  },
  {
    slug: "dg-formation-recherche-agricole",
    name:
      "Direction Générale de l'Enseignement, de la Formation et de la Recherche Agricole",
    parentSlug: "min-agriculture",
  },
  {
    slug: "dg-protection-vegetaux",
    name: "Direction Générale de la Protection des Végétaux",
    parentSlug: "min-agriculture",
  },
];

// ─── §4.10 Ministère de la Pêche ───────────────────────────────
const DG_PECHE: DGInput[] = [
  {
    slug: "dgpa",
    name: "Direction Générale des Pêches et de l'Aquaculture",
    parentSlug: "min-peche-mer",
  },
  {
    slug: "dg-economie-bleue",
    name: "Direction Générale de l'Économie Bleue",
    parentSlug: "min-peche-mer",
  },
  {
    slug: "dg-surveillance-peches",
    name: "Direction Générale de la Surveillance des Pêches",
    parentSlug: "min-peche-mer",
  },
];

// ─── §4.11 Ministère des Eaux et Forêts ────────────────────────
const DG_EAUX_FORETS: DGInput[] = [
  {
    slug: "dgf",
    name: "Direction Générale des Forêts",
    parentSlug: "min-eaux-forets",
  },
  {
    slug: "dgfap",
    name: "Direction Générale de la Faune et des Aires Protégées",
    parentSlug: "min-eaux-forets",
  },
  {
    slug: "dg-environnement",
    name:
      "Direction Générale de l'Environnement et de la Protection de la Nature",
    parentSlug: "min-eaux-forets",
  },
  {
    slug: "dg-economie-verte",
    name: "Direction Générale de l'Économie Verte",
    parentSlug: "min-eaux-forets",
  },
  {
    slug: "dg-climat",
    name: "Direction Générale du Climat",
    parentSlug: "min-eaux-forets",
  },
];

// ─── §4.12 Ministère de la Santé ───────────────────────────────
const DG_SANTE: DGInput[] = [
  {
    slug: "dg-sante-publique",
    name: "Direction Générale de la Santé Publique",
    parentSlug: "min-sante",
  },
  {
    slug: "dg-soins-hopitaux",
    name: "Direction Générale des Soins et des Hôpitaux",
    parentSlug: "min-sante",
  },
  {
    slug: "dg-rh-sante",
    name:
      "Direction Générale des Ressources Humaines et des Moyens Généraux (Santé)",
    parentSlug: "min-sante",
  },
  {
    slug: "dg-medicament-pharmacie",
    name: "Direction Générale du Médicament et de la Pharmacie",
    parentSlug: "min-sante",
  },
  {
    slug: "dg-prevention-sida-endemies",
    name:
      "Direction Générale de la Prévention du SIDA et des Grandes Endémies",
    parentSlug: "min-sante",
  },
];

// ─── §4.13 Ministère de l'Éducation Nationale ──────────────────
const DG_EDUCATION: DGInput[] = [
  {
    slug: "dg-enseignement-primaire",
    name: "Direction Générale de l'Enseignement Pré-Primaire et Primaire",
    parentSlug: "min-education",
  },
  {
    slug: "dg-enseignement-secondaire",
    name: "Direction Générale de l'Enseignement Secondaire",
    parentSlug: "min-education",
  },
  {
    slug: "dg-examens-concours",
    name: "Direction Générale des Examens et Concours",
    parentSlug: "min-education",
  },
  {
    slug: "dg-rh-education",
    name: "Direction Générale des Ressources Humaines de l'Éducation",
    parentSlug: "min-education",
  },
  {
    slug: "dg-inspection-pedagogique",
    name: "Direction Générale de l'Inspection Pédagogique",
    parentSlug: "min-education",
  },
  {
    slug: "dg-vie-scolaire",
    name: "Direction Générale de la Vie Scolaire et de l'Instruction Civique",
    parentSlug: "min-education",
  },
];

// ─── §4.14 Ministère de l'Enseignement Supérieur ───────────────
const DG_ENSEIGNEMENT_SUP: DGInput[] = [
  {
    slug: "dg-enseignement-superieur",
    name: "Direction Générale de l'Enseignement Supérieur",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "dg-recherche-scientifique",
    name: "Direction Générale de la Recherche Scientifique et Technologique",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "dg-bourses-stages",
    name: "Direction Générale des Bourses et Stages",
    parentSlug: "min-enseignement-superieur",
  },
  {
    slug: "dg-insertion-professionnelle",
    name: "Direction Générale de l'Insertion Professionnelle des Diplômés",
    parentSlug: "min-enseignement-superieur",
  },
];

// ─── §4.15 Ministère des Transports ────────────────────────────
const DG_TRANSPORTS: DGInput[] = [
  {
    slug: "dg-transports-terrestres",
    name: "Direction Générale des Transports Terrestres",
    parentSlug: "min-transports",
  },
  {
    slug: "dgmm",
    name: "Direction Générale de la Marine Marchande",
    parentSlug: "min-transports",
  },
  {
    slug: "dg-aviation-civile",
    name: "Direction Générale de l'Aviation Civile",
    parentSlug: "min-transports",
  },
  {
    slug: "dg-transports-ferroviaires",
    name: "Direction Générale des Transports Ferroviaires",
    parentSlug: "min-transports",
  },
  {
    slug: "dg-logistique",
    name: "Direction Générale de la Logistique",
    parentSlug: "min-transports",
  },
];

// ─── §4.16 Ministère des Travaux Publics ───────────────────────
const DG_TRAVAUX_PUBLICS: DGInput[] = [
  {
    slug: "dgit",
    name: "Direction Générale des Infrastructures de Transport",
    parentSlug: "min-travaux-publics",
  },
  {
    slug: "dtar",
    name: "Direction Générale des Travaux d'Aménagement Routier",
    parentSlug: "min-travaux-publics",
  },
  {
    slug: "dgce",
    name: "Direction Générale de la Construction et des Équipements",
    parentSlug: "min-travaux-publics",
  },
  {
    slug: "deep",
    name:
      "Direction Générale des Études et de l'Évaluation des Projets",
    parentSlug: "min-travaux-publics",
  },
  {
    slug: "dg-assainissement",
    name: "Direction Générale de l'Assainissement",
    parentSlug: "min-travaux-publics",
  },
];

// ─── §4.17 Ministère du Logement ───────────────────────────────
const DG_LOGEMENT: DGInput[] = [
  {
    slug: "dg-logement-habitat-social",
    name: "Direction Générale du Logement et de l'Habitat Social",
    parentSlug: "min-logement",
  },
  {
    slug: "dg-urbanisme",
    name: "Direction Générale de l'Urbanisme",
    parentSlug: "min-logement",
  },
  {
    slug: "dg-cadastre-topographie",
    name: "Direction Générale du Cadastre et de la Topographie",
    parentSlug: "min-logement",
  },
  {
    slug: "dg-promotion-immobiliere",
    name: "Direction Générale de la Promotion Immobilière",
    parentSlug: "min-logement",
  },
];

// ─── §4.18 Ministère de l'Industrie ────────────────────────────
const DG_INDUSTRIE: DGInput[] = [
  {
    slug: "dg-industrie",
    name: "Direction Générale de l'Industrie",
    parentSlug: "min-industrie",
  },
  {
    slug: "dg-transformation-locale",
    name: "Direction Générale de la Transformation Locale",
    parentSlug: "min-industrie",
  },
  {
    slug: "dg-competitivite-industrielle",
    name: "Direction Générale de la Compétitivité Industrielle",
    parentSlug: "min-industrie",
  },
  {
    slug: "dg-normalisation-metrologie",
    name: "Direction Générale de la Normalisation et de la Métrologie",
    parentSlug: "min-industrie",
  },
];

// ─── §4.19 Ministère du Commerce ───────────────────────────────
const DG_COMMERCE: DGInput[] = [
  {
    slug: "dg-commerce-interieur",
    name: "Direction Générale du Commerce Intérieur",
    parentSlug: "min-commerce",
  },
  {
    slug: "dg-commerce-exterieur",
    name: "Direction Générale du Commerce Extérieur",
    parentSlug: "min-commerce",
  },
  {
    slug: "dg-pme-pmi",
    name: "Direction Générale des PME-PMI",
    parentSlug: "min-commerce",
  },
  {
    slug: "dg-entrepreneuriat-jeune",
    name: "Direction Générale de la Promotion de l'Entrepreneuriat Jeune",
    parentSlug: "min-commerce",
  },
];

// ─── §4.20 Ministère du Numérique ──────────────────────────────
const DG_NUMERIQUE: DGInput[] = [
  {
    slug: "dg-economie-numerique",
    name: "Direction Générale de l'Économie Numérique",
    parentSlug: "min-numerique",
  },
  {
    slug: "dg-promotion-economie-numerique",
    name:
      "Direction Générale de la Promotion de l'Économie Numérique",
    parentSlug: "min-numerique",
  },
  {
    slug: "dg-digitalisation",
    name: "Direction Générale de la Digitalisation",
    parentSlug: "min-numerique",
  },
  {
    slug: "dg-innovation",
    name:
      "Direction Générale de l'Innovation et de la Recherche Technologique",
    parentSlug: "min-numerique",
  },
  {
    slug: "dg-cybersecurite",
    name: "Direction Générale de la Cybersécurité",
    parentSlug: "min-numerique",
  },
];

// ─── §4.21 Ministère de la Fonction Publique ───────────────────
const DG_FONCTION_PUBLIQUE: DGInput[] = [
  {
    slug: "dg-fonction-publique",
    name: "Direction Générale de la Fonction Publique",
    parentSlug: "min-fonction-publique",
  },
  {
    slug: "dg-renforcement-capacites",
    name: "Direction Générale du Renforcement des Capacités",
    parentSlug: "min-fonction-publique",
  },
  {
    slug: "dg-reforme-administrative",
    name: "Direction Générale de la Réforme Administrative",
    parentSlug: "min-fonction-publique",
  },
  {
    slug: "dg-solde",
    name: "Direction Générale de la Solde",
    parentSlug: "min-fonction-publique",
  },
];

// ─── §4.22 Ministère du Travail ────────────────────────────────
const DG_TRAVAIL: DGInput[] = [
  {
    slug: "dg-travail",
    name: "Direction Générale du Travail",
    parentSlug: "min-travail",
  },
  {
    slug: "dg-main-doeuvre",
    name: "Direction Générale de la Main-d'œuvre",
    parentSlug: "min-travail",
  },
  {
    slug: "dg-formation-professionnelle",
    name: "Direction Générale de la Formation Professionnelle",
    parentSlug: "min-travail",
  },
  {
    slug: "dg-dialogue-social",
    name: "Direction Générale du Dialogue Social",
    parentSlug: "min-travail",
  },
  {
    slug: "dg-plein-emploi",
    name: "Direction Générale du Plein Emploi",
    parentSlug: "min-travail",
  },
];

// ─── §4.23 Ministère des Affaires Sociales ─────────────────────
const DG_AFFAIRES_SOCIALES: DGInput[] = [
  {
    slug: "dg-affaires-sociales",
    name: "Direction Générale des Affaires Sociales",
    parentSlug: "min-affaires-sociales",
  },
  {
    slug: "dg-promotion-femme",
    name: "Direction Générale de la Promotion de la Femme et du Genre",
    parentSlug: "min-affaires-sociales",
  },
  {
    slug: "dg-protection-enfance",
    name: "Direction Générale de la Protection de l'Enfance",
    parentSlug: "min-affaires-sociales",
  },
  {
    slug: "dg-solidarite-nationale",
    name: "Direction Générale de la Solidarité Nationale",
    parentSlug: "min-affaires-sociales",
  },
];

// ─── §4.24 Ministère de la Jeunesse, Sports, Culture ───────────
const DG_JEUNESSE_SPORTS: DGInput[] = [
  {
    slug: "dg-jeunesse",
    name: "Direction Générale de la Jeunesse",
    parentSlug: "min-jeunesse-sports",
  },
  {
    slug: "dg-sports",
    name: "Direction Générale des Sports",
    parentSlug: "min-jeunesse-sports",
  },
  {
    slug: "dg-culture-arts",
    name: "Direction Générale de la Culture et des Arts",
    parentSlug: "min-jeunesse-sports",
  },
  {
    slug: "dg-patrimoine",
    name: "Direction Générale du Patrimoine",
    parentSlug: "min-jeunesse-sports",
  },
  {
    slug: "dg-rayonnement-international",
    name: "Direction Générale du Rayonnement International",
    parentSlug: "min-jeunesse-sports",
  },
];

// ─── §4.25 Ministère du Tourisme ───────────────────────────────
const DG_TOURISME: DGInput[] = [
  {
    slug: "dg-tourisme",
    name: "Direction Générale du Tourisme",
    parentSlug: "min-tourisme",
  },
  {
    slug: "dg-artisanat",
    name: "Direction Générale de l'Artisanat",
    parentSlug: "min-tourisme",
  },
  {
    slug: "dg-promotion-touristique",
    name: "Direction Générale de la Promotion Touristique",
    parentSlug: "min-tourisme",
  },
  {
    slug: "dg-tourisme-durable",
    name: "Direction Générale du Développement Touristique Durable",
    parentSlug: "min-tourisme",
  },
];

// ─── §4.26 Ministère de la Communication ───────────────────────
const DG_COMMUNICATION: DGInput[] = [
  {
    slug: "dg-communication",
    name: "Direction Générale de la Communication",
    parentSlug: "min-communication",
  },
  {
    slug: "dg-presse-audiovisuel",
    name:
      "Direction Générale de la Presse Écrite, Audiovisuelle et Numérique",
    parentSlug: "min-communication",
  },
  {
    slug: "dg-information",
    name: "Direction Générale de l'Information",
    parentSlug: "min-communication",
  },
];

// ─── §4.27 Ministère de la Planification ───────────────────────
const DG_PLANIFICATION: DGInput[] = [
  {
    slug: "dg-planification",
    name: "Direction Générale de la Planification",
    parentSlug: "min-planification",
  },
  {
    slug: "dg-prospective",
    name: "Direction Générale de la Prospective et de la Stratégie",
    parentSlug: "min-planification",
  },
  {
    slug: "dg-suivi-evaluation",
    name:
      "Direction Générale du Suivi et de l'Évaluation des Politiques Publiques",
    parentSlug: "min-planification",
  },
];

// ─── §4.28 Ministère de la Réforme et des Relations ────────────
const DG_REFORMES: DGInput[] = [
  {
    slug: "dg-reformes-institutionnelles",
    name: "Direction Générale des Réformes Institutionnelles",
    parentSlug: "min-reformes-institutions",
  },
  {
    slug: "dg-relations-parlement",
    name: "Direction Générale des Relations avec le Parlement",
    parentSlug: "min-reformes-institutions",
  },
  {
    slug: "dg-relations-institutions",
    name:
      "Direction Générale des Relations avec les Institutions Constitutionnelles",
    parentSlug: "min-reformes-institutions",
  },
  {
    slug: "dg-engagements-internationaux",
    name: "Direction Générale du Suivi des Engagements Internationaux",
    parentSlug: "min-reformes-institutions",
  },
];

const ALL_DG: DGInput[] = [
  ...DG_DEFENSE,
  ...DG_INTERIEUR,
  ...DG_FINANCES,
  ...DG_MAE,
  ...DG_JUSTICE,
  ...DG_PETROLE,
  ...DG_MINES,
  ...DG_EAU_ENERGIE,
  ...DG_AGRICULTURE,
  ...DG_PECHE,
  ...DG_EAUX_FORETS,
  ...DG_SANTE,
  ...DG_EDUCATION,
  ...DG_ENSEIGNEMENT_SUP,
  ...DG_TRANSPORTS,
  ...DG_TRAVAUX_PUBLICS,
  ...DG_LOGEMENT,
  ...DG_INDUSTRIE,
  ...DG_COMMERCE,
  ...DG_NUMERIQUE,
  ...DG_FONCTION_PUBLIQUE,
  ...DG_TRAVAIL,
  ...DG_AFFAIRES_SOCIALES,
  ...DG_JEUNESSE_SPORTS,
  ...DG_TOURISME,
  ...DG_COMMUNICATION,
  ...DG_PLANIFICATION,
  ...DG_REFORMES,
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

    for (const dg of ALL_DG) {
      try {
        // Idempotence.
        const existing = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", dg.slug))
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Résolution du parent obligatoire pour les DG.
        const parent = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", dg.parentSlug))
          .first();

        if (!parent) {
          results.errors.push(
            `Parent ${dg.parentSlug} introuvable pour ${dg.slug}`,
          );
          continue;
        }

        await ctx.db.insert("orgs", {
          slug: dg.slug,
          name: dg.name,
          type: OrganizationType.DirectorateGeneral,
          country: "GA",
          timezone: "Africa/Libreville",
          address: LIBREVILLE_DEFAULT_ADDRESS,
          tutelleLevel: 2,
          parentOrgId: parent._id as any,
          modules: DEFAULT_DG_MODULES,
          isActive: true,
        } as any);

        results.created++;
      } catch (error) {
        results.errors.push(
          `${dg.slug}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  },
});
