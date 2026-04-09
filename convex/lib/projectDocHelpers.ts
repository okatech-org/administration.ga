/**
 * Helpers partagés pour la génération de documents "Projet de Coopération"
 *
 * Types normalisés, constantes, utilitaires pour DOCX/PPTX/PDF.
 */

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

export const PAGE = {
  WIDTH: 12240,       // 8.5 inches (Letter) en DXA
  HEIGHT: 15840,      // 11 inches en DXA
  MARGIN_TOP: 1440,   // 1 inch
  MARGIN_BOTTOM: 1440,
  MARGIN_LEFT: 1440,
  MARGIN_RIGHT: 1440,
  CONTENT_W: 9360,    // largeur utile
};

export const COLORS = {
  VERT_GABON: "009E49",
  VERT_FONCE: "1B6B4A",
  BLEU_MARINE: "1B3A5C",
  GRIS_FONCE: "374151",
  GRIS_MOYEN: "6B7280",
  GRIS_CLAIR: "F3F4F6",
  GRIS_VERY_LIGHT: "F9FAFB",
  BLANC: "FFFFFF",
  JAUNE_GABON: "FCD116",
  BLEU_GABON: "3A75C4",
  ROUGE_RISQUE: "DC2626",
  AMBER_MOYEN: "D97706",
  VERT_FAIBLE: "059669",
  BORDER_GRAY: "D1D5DB",
  PURPLE: "7C3AED",
};

export const FONTS = {
  TITLE: "Georgia",
  HEADING: "Calibri",
  BODY: "Calibri",
};

export const CHART_COLORS = [
  "009E49", "1B3A5C", "D97706", "2563EB", "DC2626", "0F766E", "7C3AED", "059669",
];

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface KpiCard {
  label: string;
  value: string;
  color: string;
}

export interface Indicator {
  indicator: string;
  targetValue: string;
  verificationMeans: string;
}

export interface Activity {
  id: string;
  description: string;
}

export interface Result {
  id: string;
  title: string;
  description: string;
  indicators: Indicator[];
  activities: Activity[];
}

export interface BudgetItem {
  category: string;
  amount: string;
  percentage: number;
}

export interface BudgetSource {
  source: string;
  instrument: string;
  amount: string;
  percentage: number;
}

export interface Phase {
  phase: string;
  details: string;
  startDate: string;
  endDate: string;
  milestones: string[];
  deliverables: string[];
}

export interface Stakeholder {
  name: string;
  role: string;
  organization: string;
  contact: string;
}

export interface KpiIndicator {
  indicator: string;
  target: string;
  frequency: string;
}

export interface Risk {
  category: string;
  risk: string;
  probability: string;
  impact: string;
  mitigation: string;
  responsible: string;
}

export interface QuantifiableImpact {
  indicator: string;
  value: string;
}

/**
 * Structure normalisée du projet — interface commune pour DOCX/PPTX/PDF.
 * Découple le schema Convex (noms français) du code de rendu.
 */
export interface ProjectData {
  // Métadonnées
  title: string;
  reference: string;
  projectType: string;
  projectTypeLabel: string;
  partnerName: string;
  partnerCountry: string;
  partnerSector: string;
  dateStr: string;
  description: string;

  // Résumé exécutif
  budget: string;
  currency: string;
  duration: string;
  agreementType: string;
  estimatedJobs: string;
  beneficiaries: string;
  scenarioRetenu?: string;
  kpis: KpiCard[];

  // Contexte
  contextNational: string;
  contextJustification: string;
  assumptions: string[];

  // Cadre logique
  generalObjective: string;
  specificObjective: string;
  results: Result[];

  // Budget détaillé
  budgetTotal: string;
  budgetCurrency: string;
  budgetItems: BudgetItem[];
  budgetSources: BudgetSource[];

  // Calendrier
  totalDuration: string;
  phases: Phase[];

  // Cadre institutionnel
  agreementTypeDetail: string;
  legalBasis: string;
  requiredAuthorizations: string[];
  essentialClauses: string[];

  // Parties prenantes
  stakeholders: Stakeholder[];

  // Suivi et évaluation
  monitoringMechanism: string;
  reportingFrequency: string;
  monitoringKpis: KpiIndicator[];
  finalEvaluation: string;

  // Risques
  risks: Risk[];

  // Impact
  economicImpact: string[];
  socialImpact: string[];
  environmentalImpact: string[];
  estimatedJobsDetail: string;
  estimatedBeneficiaries: string;
  quantifiableImpacts: QuantifiableImpact[];

  // Validation
  validatedBy?: string;
  validationDate?: number;
  validationNotes?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// NORMALIZER
// ════════════════════════════════════════════════════════════════════════════

const PROJECT_TYPE_LABELS: Record<string, string> = {
  cooperation_agreement: "Accord de coopération",
  commercial_contract: "Contrat commercial",
  technical_assistance: "Assistance technique",
  cultural_exchange: "Échange culturel",
  infrastructure: "Infrastructure",
  other: "Autre",
};

/**
 * Normalise les données brutes du schema Convex (français) vers ProjectData.
 * Gère gracieusement les champs manquants.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProjectData(project: any, target: any): ProjectData {
  const pf = project.projectFramework;

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Dériver les KPIs depuis les données
  const kpis: KpiCard[] = [];
  if (pf?.budgetDetaille?.montantTotal) {
    kpis.push({ label: "Budget total", value: pf.budgetDetaille.montantTotal, color: COLORS.VERT_GABON });
  }
  if (pf?.calendrier?.dureeTotal) {
    kpis.push({ label: "Durée", value: pf.calendrier.dureeTotal, color: COLORS.BLEU_MARINE });
  }
  if (pf?.impact?.emploisEstimes) {
    kpis.push({ label: "Emplois estimés", value: pf.impact.emploisEstimes, color: COLORS.BLEU_GABON });
  }
  if (pf?.impact?.beneficiairesEstimes) {
    kpis.push({ label: "Bénéficiaires", value: pf.impact.beneficiairesEstimes, color: COLORS.AMBER_MOYEN });
  }

  // Normaliser les résultats du cadre logique
  const results: Result[] = (pf?.cadreLogique?.resultatsAttendus || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ra: any, idx: number) => ({
      id: `R${idx + 1}`,
      title: ra.resultat || "",
      description: ra.resultat || "",
      indicators: (ra.indicateurs || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ind: any) => ({
          indicator: ind.indicateur || "",
          targetValue: ind.valeurCible || "",
          verificationMeans: ind.moyenVerification || "",
        }),
      ),
      activities: (ra.activites || []).map(
        (act: string, ai: number) => ({
          id: `${idx + 1}.${ai + 1}`,
          description: act,
        }),
      ),
    }),
  );

  // Normaliser les items budget
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgetItems: BudgetItem[] = (pf?.budgetDetaille?.repartition || []).map((r: any) => ({
    category: r.poste || "",
    amount: r.montant || "",
    percentage: r.pourcentage || 0,
  }));

  // Normaliser les sources de financement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgetSources: BudgetSource[] = (pf?.budgetDetaille?.sourceFinancement || []).map((s: any) => ({
    source: s.source || "",
    instrument: s.instrument || "",
    amount: s.montant || "",
    percentage: 0, // pas de pourcentage dans le schema actuel
  }));

  // Normaliser les phases du calendrier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phases: Phase[] = (pf?.calendrier?.phases || []).map((ph: any) => ({
    phase: ph.phase || "",
    details: ph.description || "",
    startDate: ph.debut || "",
    endDate: ph.fin || "",
    milestones: ph.jalons || [],
    deliverables: ph.livrables || [],
  }));

  // Normaliser les stakeholders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stakeholders: Stakeholder[] = (project.stakeholders || []).map((s: any) => ({
    name: s.name || "",
    role: s.role || "",
    organization: s.organization || "",
    contact: s.contact || "—",
  }));

  // Normaliser les KPI de suivi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monitoringKpis: KpiIndicator[] = (pf?.suiviEvaluation?.indicateursPerformance || []).map((k: any) => ({
    indicator: k.kpi || "",
    target: k.cible || "",
    frequency: k.frequenceMesure || "",
  }));

  // Normaliser les risques
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const risks: Risk[] = (pf?.risquesProjet || []).map((r: any) => ({
    category: r.categorie || "",
    risk: r.risque || "",
    probability: r.probabilite || "faible",
    impact: r.impact || "faible",
    mitigation: r.mitigation || "",
    responsible: r.responsable || "",
  }));

  // Impacts quantifiables dérivés
  const quantifiableImpacts: QuantifiableImpact[] = [];
  if (pf?.impact?.emploisEstimes) {
    quantifiableImpacts.push({ indicator: "Emplois créés", value: pf.impact.emploisEstimes });
  }
  if (pf?.impact?.beneficiairesEstimes) {
    quantifiableImpacts.push({ indicator: "Bénéficiaires directs", value: pf.impact.beneficiairesEstimes });
  }

  return {
    // Métadonnées
    title: project.title || "",
    reference: project.reference || "",
    projectType: project.projectType || "cooperation_agreement",
    projectTypeLabel: PROJECT_TYPE_LABELS[project.projectType] || project.projectType || "",
    partnerName: target.name || "",
    partnerCountry: target.country || "",
    partnerSector: target.sector || "",
    dateStr,
    description: project.description || "Description du projet non disponible.",

    // Résumé exécutif
    budget: pf?.budgetDetaille?.montantTotal || project.budget || "À définir",
    currency: pf?.budgetDetaille?.devise || "EUR",
    duration: pf?.calendrier?.dureeTotal || "À définir",
    agreementType: pf?.cadreJuridique?.typeAccord || "À définir",
    estimatedJobs: pf?.impact?.emploisEstimes || "À évaluer",
    beneficiaries: pf?.impact?.beneficiairesEstimes || "À évaluer",
    scenarioRetenu: pf?.scenarioRetenu,
    kpis,

    // Contexte
    contextNational: "Le Gabon, engagé dans une politique ambitieuse de diversification économique " +
      "post-pétrole, cherche à attirer des partenaires internationaux de premier plan pour accélérer " +
      "sa transformation structurelle. Les axes prioritaires incluent l'industrialisation, le numérique, " +
      "les infrastructures, l'énergie et la formation professionnelle des jeunes.",
    contextJustification: `Le partenariat avec ${target.name || "le partenaire"} ` +
      `(${target.country || "partenaire international"}) s'inscrit dans le secteur ` +
      `${target.sector || "prioritaire"} et répond aux besoins identifiés lors de la phase de diagnostic stratégique.` +
      (pf?.scenarioRetenu ? ` Le scénario "${pf.scenarioRetenu}" a été retenu comme base de structuration du projet.` : ""),
    assumptions: pf?.cadreLogique?.hypotheses || [],

    // Cadre logique
    generalObjective: pf?.cadreLogique?.objectifGeneral || "À définir",
    specificObjective: pf?.cadreLogique?.objectifSpecifique || "À définir",
    results,

    // Budget
    budgetTotal: pf?.budgetDetaille?.montantTotal || project.budget || "À définir",
    budgetCurrency: pf?.budgetDetaille?.devise || "EUR",
    budgetItems,
    budgetSources,

    // Calendrier
    totalDuration: pf?.calendrier?.dureeTotal || "À définir",
    phases,

    // Cadre institutionnel
    agreementTypeDetail: pf?.cadreJuridique?.typeAccord || "À définir (MoU, Convention, PPP, etc.)",
    legalBasis: pf?.cadreJuridique?.baseJuridique || "Législation gabonaise applicable et conventions bilatérales en vigueur.",
    requiredAuthorizations: pf?.cadreJuridique?.autorisationsRequises || [],
    essentialClauses: pf?.cadreJuridique?.clausesEssentielles || [],

    // Parties prenantes
    stakeholders,

    // Suivi et évaluation
    monitoringMechanism: pf?.suiviEvaluation?.mecanismeSuivi || "Comité de pilotage bilatéral avec rapports périodiques.",
    reportingFrequency: pf?.suiviEvaluation?.frequenceRapports || "Trimestriel",
    monitoringKpis,
    finalEvaluation: pf?.suiviEvaluation?.evaluationFinale || "Évaluation externe indépendante à la clôture du projet.",

    // Risques
    risks,

    // Impact
    economicImpact: pf?.impact?.economique || [],
    socialImpact: pf?.impact?.social || [],
    environmentalImpact: pf?.impact?.environnemental || [],
    estimatedJobsDetail: pf?.impact?.emploisEstimes || "À évaluer",
    estimatedBeneficiaries: pf?.impact?.beneficiairesEstimes || "À évaluer",
    quantifiableImpacts,

    // Validation
    validatedBy: project.validatedBy,
    validationDate: project.validationDate,
    validationNotes: project.validationNotes,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Couleur de risque selon le niveau
 */
export function riskColor(level: string): string {
  if (level === "elevee" || level === "eleve" || level === "Élevé") return COLORS.ROUGE_RISQUE;
  if (level === "moyenne" || level === "moyen" || level === "Moyen") return COLORS.AMBER_MOYEN;
  return COLORS.VERT_FAIBLE;
}

/**
 * Tinte (fond léger) pour les info boxes
 */
export function tintForColor(color: string): string {
  const map: Record<string, string> = {
    [COLORS.VERT_GABON]: "F0FDF4",
    [COLORS.AMBER_MOYEN]: "FEF3C7",
    [COLORS.BLEU_GABON]: "EFF6FF",
    [COLORS.BLEU_MARINE]: "EFF6FF",
    [COLORS.ROUGE_RISQUE]: "FEF2F2",
    [COLORS.VERT_FAIBLE]: "F0FDF4",
  };
  return map[color] || COLORS.GRIS_VERY_LIGHT;
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9À-ÿ\s._-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 80);
}
