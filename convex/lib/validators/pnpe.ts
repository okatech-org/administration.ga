import { v } from "convex/values";

/**
 * Validators spécifiques au domaine PNPE (Pôle National de Promotion de l'Emploi).
 *
 * Réutilisés par les 8 tables `convex/schemas/pnpe/` et les fonctions
 * `convex/functions/pnpe/`. Tout enum à valeurs courtes lié à l'emploi
 * (statuts, types, niveaux, programmes) y est centralisé pour éviter la
 * duplication et garantir la cohérence cross-schema.
 *
 * Cf. plan Phase 1 dans `/Users/okatech/.claude/plans/dans-le-contexte-du-eventual-blum.md`.
 */

// ─── Géographie gabonaise ─────────────────────────────────────

/**
 * Les 9 provinces de la République Gabonaise.
 * Source : Constitution 2024 et découpage administratif national.
 *
 * Le PNPE est implanté dans 7 d'entre elles. Ngounié et Ogooué-Ivindo restent
 * à couvrir (champ `mobiliteGeographique` peut inclure n'importe laquelle).
 */
export const codeProvinceGaValidator = v.union(
  v.literal("ESTUAIRE"),
  v.literal("HAUT_OGOOUE"),
  v.literal("MOYEN_OGOOUE"),
  v.literal("NGOUNIE"),
  v.literal("NYANGA"),
  v.literal("OGOOUE_IVINDO"),
  v.literal("OGOOUE_LOLO"),
  v.literal("OGOOUE_MARITIME"),
  v.literal("WOLEU_NTEM"),
);

// ─── Codes sectoriels NAF Gabon ───────────────────────────────

/**
 * Codes secteurs d'activité usuels au Gabon. Inspiré des NAF français mais
 * réduit aux secteurs pertinents pour le marché de l'emploi gabonais.
 * Extensible — à compléter avec les codes officiels DGI quand disponibles.
 */
export const codeNAFGabonValidator = v.union(
  v.literal("AGRICULTURE_PECHE"),
  v.literal("MINES_EXTRACTION"),
  v.literal("PETROLE_GAZ"),
  v.literal("INDUSTRIE_MANUFACTURE"),
  v.literal("BTP_CONSTRUCTION"),
  v.literal("COMMERCE"),
  v.literal("TRANSPORT_LOGISTIQUE"),
  v.literal("HOTELLERIE_RESTAURATION"),
  v.literal("TELECOMS_NUMERIQUE"),
  v.literal("BANQUE_ASSURANCE"),
  v.literal("SANTE_SOCIAL"),
  v.literal("EDUCATION_FORMATION"),
  v.literal("ADMINISTRATION_PUBLIQUE"),
  v.literal("SERVICES_AUX_ENTREPRISES"),
  v.literal("ARTS_CULTURE_SPORT"),
  v.literal("ENERGIE_EAU"),
  v.literal("AUTRES"),
);

// ─── Contrats ─────────────────────────────────────────────────

/**
 * Types de contrats de travail reconnus au Gabon.
 * Source : Code du travail gabonais, articles L. 27 et suivants.
 */
export const typeContratValidator = v.union(
  v.literal("CDI"), // Contrat à durée indéterminée
  v.literal("CDD"), // Contrat à durée déterminée
  v.literal("STAGE"), // Stage conventionné
  v.literal("ALTERNANCE"), // Contrat d'apprentissage ou de professionnalisation
  v.literal("INTERIM"), // Mission d'intérim / travail temporaire
  v.literal("INSERTION"), // Contrat d'insertion / professionnalisation
  v.literal("INDEPENDANT"), // Auto-entrepreneur / freelance
);

// ─── Niveau d'études ──────────────────────────────────────────

/**
 * Niveaux de qualification reconnus dans le système éducatif gabonais.
 * BAC série A/B/C/D = bac littéraire/économique/scientifique/sciences nat.
 */
export const niveauEtudesValidator = v.union(
  v.literal("AUCUN"),
  v.literal("CEP"), // Certificat d'études primaires
  v.literal("BEPC"), // Brevet d'études du premier cycle
  v.literal("BAC_A"),
  v.literal("BAC_B"),
  v.literal("BAC_C"),
  v.literal("BAC_D"),
  v.literal("BAC_PRO"),
  v.literal("BAC_PLUS_2"), // BTS, DUT, DEUG
  v.literal("BAC_PLUS_3"), // Licence
  v.literal("BAC_PLUS_5"), // Master, ingénieur
  v.literal("DOCTORAT"),
);

// ─── Statuts métier ───────────────────────────────────────────

/**
 * Statut d'un Demandeur d'Emploi (D.E) dans son cycle d'inscription PNPE.
 *
 * Workflow :
 *   BROUILLON -> EN_VALIDATION -> ACTIF -> (EN_FORMATION | EN_CONTRAT) -> PLACE
 *                                       \-> SUSPENDU -> RADIE
 */
export const statutDemandeurValidator = v.union(
  v.literal("BROUILLON"), // Inscription en cours, non soumise
  v.literal("EN_VALIDATION"), // Soumis, en attente conseiller
  v.literal("ACTIF"), // Validé, peut candidater
  v.literal("EN_FORMATION"), // Inscrit en formation BMC ou autre
  v.literal("EN_CONTRAT"), // Embauché ou en contrat apprentissage
  v.literal("PLACE"), // Insertion réussie, suivi post-placement
  v.literal("SUSPENDU"), // Inactif temporairement
  v.literal("RADIE"), // Compte clos
);

/**
 * Statut d'une offre d'emploi publiée par un employeur.
 */
export const statutOffreValidator = v.union(
  v.literal("BROUILLON"),
  v.literal("EN_VALIDATION"),
  v.literal("PUBLIEE"),
  v.literal("POURVUE"),
  v.literal("EXPIREE"),
  v.literal("RETIREE"),
);

/**
 * Statut d'une candidature D.E sur une offre.
 *
 * Workflow employeur :
 *   ENVOYEE -> VUE -> PRESELECTIONNEE -> ENTRETIEN -> (RETENUE | NON_RETENUE)
 *                                                  \-> RETIREE (par le D.E)
 */
export const statutCandidatureValidator = v.union(
  v.literal("ENVOYEE"),
  v.literal("VUE"),
  v.literal("PRESELECTIONNEE"),
  v.literal("ENTRETIEN"),
  v.literal("RETENUE"),
  v.literal("NON_RETENUE"),
  v.literal("RETIREE"),
);

/**
 * Statut de vérification d'un employeur (DGI fiscal + CNSS social).
 */
export const verificationEmployeurValidator = v.union(
  v.literal("NON_VERIFIE"),
  v.literal("EN_COURS"),
  v.literal("VERIFIE"),
  v.literal("REJETE"),
);

/**
 * Type de programme PNPE auquel un D.E s'inscrit.
 */
export const programmeTypeValidator = v.union(
  v.literal("EMPLOI_SALARIE"),
  v.literal("AUTO_EMPLOI"),
  v.literal("FORMATION"),
  v.literal("APPRENTISSAGE"),
);

// ─── Type d'antenne PNPE ──────────────────────────────────────

/**
 * Statut opérationnel d'une antenne régionale PNPE.
 * Lambaréné (Moyen-Ogooué) ouvre en février 2026.
 */
export const statutAntenneValidator = v.union(
  v.literal("OPERATIONNELLE"),
  v.literal("EN_OUVERTURE"),
  v.literal("SUSPENDUE"),
  v.literal("FERMEE"),
);

// ─── Type de contrat de suivi (apprentissage / insertion) ────

/**
 * Types de contrats que le PNPE accompagne au-delà de l'emploi direct.
 */
export const typeContratSuiviValidator = v.union(
  v.literal("APPRENTISSAGE"),
  v.literal("PROFESSIONNALISATION"),
  v.literal("ADAPTATION"),
  v.literal("INSERTION"),
);

/**
 * Statut d'un contrat suivi par le PNPE.
 */
export const statutContratSuiviValidator = v.union(
  v.literal("EN_COURS"),
  v.literal("TERMINE"),
  v.literal("ROMPU_EMPLOYEUR"),
  v.literal("ROMPU_APPRENTI"),
);

// ─── Étape parcours Auto-Emploi ───────────────────────────────

/**
 * Étape du parcours Auto-Emploi (Business Model Canvas + ANPI-Gabon).
 */
export const etapeAutoEmploiValidator = v.union(
  v.literal("EVALUATION"),
  v.literal("FORMATION_BMC"),
  v.literal("ELABORATION_PLAN"),
  v.literal("VALIDATION"),
  v.literal("LANCEMENT"),
  v.literal("SUIVI"),
  v.literal("CLOTURE"),
);

// ─── Disponibilité D.E ────────────────────────────────────────

export const disponibiliteDEValidator = v.union(
  v.literal("IMMEDIATE"),
  v.literal("PREAVIS"),
  v.literal("FUTUR"),
);

// ─── Taille entreprise (employeur) ────────────────────────────

/**
 * Catégorisation INSEE-like de la taille d'une entreprise gabonaise.
 *  - TPE : 0-9 salariés
 *  - PME : 10-49 salariés
 *  - ETI : 50-249 salariés
 *  - GE  : 250+ salariés
 */
export const tailleEntrepriseValidator = v.union(
  v.literal("TPE"),
  v.literal("PME"),
  v.literal("ETI"),
  v.literal("GE"),
);
