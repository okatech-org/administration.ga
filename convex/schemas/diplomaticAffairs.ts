/**
 * Affaires Diplomatiques — Schema
 *
 * Tables pour la gestion du pipeline diplomatique IA :
 * - Cibles (entreprises, organismes partenaires potentiels)
 * - Plans stratégiques (stratégie de partenariat)
 * - Lettres de contact (courriers formels aux cibles)
 * - Rapports (pour la hiérarchie : Président, Ministre)
 * - Projets de coopération (après validation haute autorité)
 *
 * Pipeline : CIBLES → PLAN STRATÉGIQUE → LETTRE → RAPPORT → PROJET
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Validators partagés ───────────────────────────────────────────────────

export const pipelinePhaseValidator = v.union(
  v.literal("targeting"),
  v.literal("strategy"),
  v.literal("outreach"),
  v.literal("reporting"),
  v.literal("project"),
);

export const targetTypeValidator = v.union(
  v.literal("enterprise"),
  v.literal("government"),
  v.literal("ngo"),
  v.literal("international_org"),
  v.literal("academic"),
  v.literal("media"),
  v.literal("other"),
);

export const targetStatusValidator = v.union(
  v.literal("identified"),
  v.literal("contacted"),
  v.literal("in_discussion"),
  v.literal("partnership"),
  v.literal("inactive"),
);

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

export const attachmentValidator = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  uploadedAt: v.number(),
});

// ─── Cibles ─────────────────────────────────────────────────────────────────

export const diplomaticTargetsTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  // Identification
  name: v.string(),
  type: targetTypeValidator,
  sector: v.optional(v.string()),
  country: v.optional(v.string()),
  city: v.optional(v.string()),

  // Contact
  contactName: v.optional(v.string()),
  contactTitle: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  website: v.optional(v.string()),

  // Évaluation
  priority: priorityValidator,
  status: targetStatusValidator,
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  tags: v.array(v.string()),

  // Pipeline IA
  pipelinePhase: v.optional(pipelinePhaseValidator),
  aiDiscoveryData: v.optional(
    v.object({
      source: v.string(),
      searchQuery: v.string(),
      executivePriority: v.string(),
      aiConfidence: v.number(),
      discoveredAt: v.number(),
    }),
  ),
  opportunityScore: v.optional(v.number()),
  matchReason: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),   // Archivé par la représentation (visible dans archives agent-web)
  deletedAt: v.optional(v.number()),    // Supprimé → visible dans corbeille superadmin uniquement
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_type", ["orgId", "type"])
  .index("by_org_priority", ["orgId", "priority"])
  .index("by_org_pipeline", ["orgId", "pipelinePhase"])
  .searchIndex("search_name", { searchField: "name", filterFields: ["orgId"] });

// ─── Validator analyse strategique enrichie (methodologie OkaTech R1-R4) ─────

export const strategicAnalysisValidator = v.object({
  // R1 — Diagnostic sectoriel
  diagnosticSectoriel: v.object({
    contexteMacro: v.string(),
    forcesGabon: v.array(v.string()),
    contraintesGabon: v.array(v.string()),
    partiesPrenantes: v.array(
      v.object({
        nom: v.string(),
        role: v.string(),
        influence: v.union(
          v.literal("forte"),
          v.literal("moyenne"),
          v.literal("faible"),
        ),
      }),
    ),
    benchmark: v.array(
      v.object({
        pays: v.string(),
        description: v.string(),
        leconsApprises: v.string(),
      }),
    ),
  }),

  // R2 — Points aveugles
  pointsAveugles: v.object({
    economiePolitique: v.string(),
    risquesGeopolitiques: v.string(),
    facteursSociaux: v.string(),
    contraintesTerrain: v.array(v.string()),
  }),

  // R3 — Analyse operateur
  analyseOperateur: v.object({
    profilComplet: v.string(),
    capacitesCles: v.array(v.string()),
    realisationsMarquantes: v.array(
      v.object({
        projet: v.string(),
        pays: v.string(),
        resultat: v.string(),
      }),
    ),
    presenceAfrique: v.optional(v.string()),
    alignementPriorites: v.string(),
  }),

  // R4 — Cadre du partenariat
  cadrePartenariat: v.object({
    besoinsGabon: v.array(
      v.object({
        besoin: v.string(),
        secteur: v.string(),
        urgence: v.union(
          v.literal("immediate"),
          v.literal("court_terme"),
          v.literal("moyen_terme"),
        ),
        estimationBudget: v.optional(v.string()),
      }),
    ),
    offreOperateur: v.array(
      v.object({
        capacite: v.string(),
        instrument: v.string(),
        conditions: v.optional(v.string()),
      }),
    ),
    beneficesMutuels: v.array(v.string()),
    modelesFinancement: v.array(
      v.object({
        type: v.string(),
        description: v.string(),
        montantEstime: v.optional(v.string()),
      }),
    ),
    scenariosPartenariat: v.array(
      v.object({
        scenario: v.union(
          v.literal("ambitieux"),
          v.literal("realiste"),
          v.literal("minimal"),
        ),
        description: v.string(),
        investissementEstime: v.optional(v.string()),
        delaiMiseEnOeuvre: v.optional(v.string()),
      }),
    ),
  }),

  // Strategie d'approche diplomatique
  strategieApproche: v.object({
    argumentaire: v.array(v.string()),
    negotiationPoints: v.array(v.string()),
    concessions: v.array(v.string()),
    lignesRouges: v.array(v.string()),
    chronologieApproche: v.array(
      v.object({
        etape: v.string(),
        action: v.string(),
        responsable: v.string(),
        delai: v.string(),
      }),
    ),
  }),

  // Preparation reunion
  preparationReunion: v.object({
    agenda: v.array(
      v.object({
        point: v.string(),
        duree: v.string(),
        objectif: v.string(),
      }),
    ),
    dossiersAFournir: v.array(v.string()),
    questionsStrategiques: v.array(v.string()),
    profilsAInviter: v.array(v.string()),
  }),

  // Risques et mitigations
  risques: v.array(
    v.object({
      risque: v.string(),
      probabilite: v.union(
        v.literal("faible"),
        v.literal("moyenne"),
        v.literal("elevee"),
      ),
      impact: v.union(
        v.literal("faible"),
        v.literal("moyen"),
        v.literal("eleve"),
      ),
      mitigation: v.string(),
    }),
  ),
});

// ─── Plans stratégiques ─────────────────────────────────────────────────────

export const diplomaticPlansTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),
  targetId: v.optional(v.id("diplomaticTargets")),

  title: v.string(),
  period: v.optional(v.string()),
  category: v.union(
    v.literal("bilateral"),
    v.literal("economic"),
    v.literal("cultural"),
    v.literal("security"),
    v.literal("multilateral"),
    v.literal("other"),
  ),

  // Contenu structuré
  objectives: v.array(
    v.object({
      title: v.string(),
      description: v.optional(v.string()),
      status: v.union(
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
      deadline: v.optional(v.number()),
    }),
  ),

  summary: v.optional(v.string()),
  status: v.union(
    v.literal("draft"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("archived"),
  ),

  // Contenu IA (version simplifiee pour cartes/resume)
  aiGeneratedContent: v.optional(
    v.object({
      countryNeeds: v.array(v.string()),
      operatorCapabilities: v.array(v.string()),
      mutualBenefits: v.array(v.string()),
      negotiationPoints: v.array(v.string()),
      meetingAgenda: v.array(v.string()),
      risks: v.array(v.string()),
    }),
  ),

  // Analyse strategique enrichie (methodologie OkaTech R1-R4)
  strategicAnalysis: v.optional(strategicAnalysisValidator),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_category", ["orgId", "category"])
  .index("by_target", ["targetId"]);

// ─── Lettres de contact ─────────────────────────────────────────────────────

export const diplomaticLettersTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),
  targetId: v.optional(v.id("diplomaticTargets")),
  planId: v.optional(v.id("diplomaticPlans")),

  // Contenu
  reference: v.string(),
  subject: v.string(),
  content: v.optional(v.string()),
  type: v.union(
    v.literal("introduction"),
    v.literal("follow_up"),
    v.literal("invitation"),
    v.literal("proposal"),
    v.literal("thank_you"),
    v.literal("other"),
  ),

  // Format de lettre
  letterFormat: v.optional(
    v.union(
      v.literal("formal_letter"),
      v.literal("email"),
      v.literal("note_verbale"),
      v.literal("invitation"),
    ),
  ),

  // Destinataire
  recipientName: v.string(),
  recipientTitle: v.optional(v.string()),
  recipientOrg: v.optional(v.string()),

  // Statut
  status: v.union(
    v.literal("draft"),
    v.literal("pending_approval"),
    v.literal("approved"),
    v.literal("sent"),
    v.literal("responded"),
    v.literal("archived"),
  ),

  // Contenu IA
  aiDraftContent: v.optional(v.string()),

  // Détails de réunion proposée
  meetingDetails: v.optional(
    v.object({
      proposedDate: v.optional(v.string()),
      proposedLocation: v.optional(v.string()),
      agenda: v.optional(v.array(v.string())),
    }),
  ),

  // Pièces jointes
  attachments: v.array(attachmentValidator),

  sentAt: v.optional(v.number()),
  respondedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_target", ["targetId"])
  .index("by_org_created", ["orgId", "createdAt"]);

// ─── Rapports diplomatiques ─────────────────────────────────────────────────

export const diplomaticReportsTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  title: v.string(),
  type: v.union(
    v.literal("activity"),
    v.literal("situation"),
    v.literal("mission"),
    v.literal("economic"),
    v.literal("security"),
    v.literal("annual"),
    v.literal("other"),
  ),
  recipient: v.union(
    v.literal("president"),
    v.literal("minister"),
    v.literal("secretary_general"),
    v.literal("direction"),
    v.literal("other"),
  ),

  // Contenu
  summary: v.optional(v.string()),
  content: v.optional(v.string()),
  period: v.optional(v.string()),

  // Liens pipeline
  targetIds: v.optional(v.array(v.id("diplomaticTargets"))),
  planIds: v.optional(v.array(v.id("diplomaticPlans"))),
  letterIds: v.optional(v.array(v.id("diplomaticLetters"))),

  // Contenu IA
  aiGeneratedSummary: v.optional(v.string()),
  statistics: v.optional(
    v.object({
      totalTargets: v.number(),
      contactedTargets: v.number(),
      meetingsHeld: v.number(),
      projectsInitiated: v.number(),
    }),
  ),

  // Pièces jointes
  attachments: v.array(attachmentValidator),

  status: v.union(
    v.literal("draft"),
    v.literal("pending_review"),
    v.literal("approved"),
    v.literal("submitted"),
    v.literal("archived"),
  ),

  submittedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_type", ["orgId", "type"])
  .index("by_org_created", ["orgId", "createdAt"]);

// ─── Cadre logique du projet (framework enrichi) ───────────────────────────

export const projectFrameworkValidator = v.object({
  // Cadre logique (Logical Framework — standard bailleurs)
  cadreLogique: v.object({
    objectifGeneral: v.string(),
    objectifSpecifique: v.string(),
    resultatsAttendus: v.array(v.object({
      resultat: v.string(),
      indicateurs: v.array(v.object({
        indicateur: v.string(),
        valeurCible: v.string(),
        moyenVerification: v.string(),
      })),
      activites: v.array(v.string()),
    })),
    hypotheses: v.array(v.string()),
  }),

  // Budget détaillé
  budgetDetaille: v.object({
    montantTotal: v.string(),
    devise: v.string(),
    repartition: v.array(v.object({
      poste: v.string(),
      montant: v.string(),
      financeur: v.string(),
      pourcentage: v.number(),
    })),
    sourceFinancement: v.array(v.object({
      source: v.string(),
      instrument: v.string(),
      montant: v.string(),
      conditions: v.optional(v.string()),
    })),
  }),

  // Calendrier de mise en œuvre
  calendrier: v.object({
    phases: v.array(v.object({
      phase: v.string(),
      description: v.string(),
      debut: v.string(),
      fin: v.string(),
      livrables: v.array(v.string()),
      jalons: v.array(v.string()),
    })),
    dureeTotal: v.string(),
  }),

  // Cadre juridique et institutionnel
  cadreJuridique: v.object({
    typeAccord: v.string(),
    baseJuridique: v.string(),
    autorisationsRequises: v.array(v.string()),
    clausesEssentielles: v.array(v.string()),
  }),

  // Suivi et évaluation
  suiviEvaluation: v.object({
    mecanismeSuivi: v.string(),
    frequenceRapports: v.string(),
    indicateursPerformance: v.array(v.object({
      kpi: v.string(),
      cible: v.string(),
      frequenceMesure: v.string(),
    })),
    evaluationFinale: v.string(),
  }),

  // Impact attendu
  impact: v.object({
    economique: v.array(v.string()),
    social: v.array(v.string()),
    environnemental: v.array(v.string()),
    emploisEstimes: v.optional(v.string()),
    beneficiairesEstimes: v.optional(v.string()),
  }),

  // Risques projet (catégorisés avec probabilité/impact)
  risquesProjet: v.array(v.object({
    categorie: v.union(
      v.literal("politique"),
      v.literal("financier"),
      v.literal("technique"),
      v.literal("juridique"),
      v.literal("social"),
      v.literal("environnemental"),
    ),
    risque: v.string(),
    probabilite: v.union(v.literal("faible"), v.literal("moyenne"), v.literal("elevee")),
    impact: v.union(v.literal("faible"), v.literal("moyen"), v.literal("eleve")),
    mitigation: v.string(),
    responsable: v.string(),
  })),

  // Pré-structuré depuis le plan stratégique
  sourceStrategicPlanId: v.optional(v.id("diplomaticPlans")),
  scenarioRetenu: v.optional(v.union(
    v.literal("ambitieux"),
    v.literal("realiste"),
    v.literal("minimal"),
  )),
});

// ─── Projets de coopération ─────────────────────────────────────────────────

export const diplomaticProjectsTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),
  targetId: v.id("diplomaticTargets"),
  planId: v.optional(v.id("diplomaticPlans")),
  reportId: v.optional(v.id("diplomaticReports")),

  // Identification
  title: v.string(),
  reference: v.string(),
  projectType: v.union(
    v.literal("cooperation_agreement"),
    v.literal("commercial_contract"),
    v.literal("technical_assistance"),
    v.literal("cultural_exchange"),
    v.literal("infrastructure"),
    v.literal("other"),
  ),

  // Contenu
  description: v.optional(v.string()),
  objectives: v.array(
    v.object({
      title: v.string(),
      status: v.union(
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("blocked"),
      ),
      deadline: v.optional(v.number()),
    }),
  ),
  stakeholders: v.array(
    v.object({
      name: v.string(),
      role: v.string(),
      organization: v.string(),
      contact: v.optional(v.string()),
    }),
  ),

  // Cadre logique enrichi (standard bailleurs de fonds)
  projectFramework: v.optional(projectFrameworkValidator),

  // Suivi
  status: v.union(
    v.literal("draft"),
    v.literal("pending_validation"),
    v.literal("validated"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("suspended"),
    v.literal("cancelled"),
  ),
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  budget: v.optional(v.string()),

  // Validation haute autorité
  validatedBy: v.optional(v.string()),
  validationDate: v.optional(v.number()),
  validationNotes: v.optional(v.string()),

  // Pièces jointes
  attachments: v.array(attachmentValidator),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_target", ["targetId"]);

// ─── Priorités exécutives (double niveau : global + local) ─────────────────

export const diplomaticPriorityValidator = v.object({
  title: v.string(),
  sector: v.string(),
  description: v.optional(v.string()),
  keywords: v.array(v.string()),
});

export const diplomaticPrioritiesTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  // Scope : global = priorités nationales, local = propres au chef de mission
  scope: v.union(v.literal("global"), v.literal("local")),

  // Lien vers les priorités globales (pour scope=local uniquement)
  globalPriorityId: v.optional(v.id("diplomaticPriorities")),

  // Priorités de l'exécutif gabonais
  priorities: v.array(diplomaticPriorityValidator),

  // Pays hôte principal
  hostCountry: v.string(),
  hostCountryCode: v.optional(v.string()),

  // Pays couverts additionnels (juridiction élargie)
  coveredCountries: v.optional(
    v.array(
      v.object({
        name: v.string(),
        code: v.optional(v.string()),
      }),
    ),
  ),

  // Paramètres IA par défaut
  defaultTargetsPerSearch: v.optional(v.number()), // nb de cibles trouvées par recherche IA
  defaultTargetLimitPerYear: v.optional(v.number()), // limite de cibles par an

  // Documents sources importés (base de connaissances)
  sourceDocuments: v.optional(
    v.array(
      v.object({
        storageId: v.id("_storage"),
        filename: v.string(),
        mimeType: v.string(),
        sizeBytes: v.number(),
        uploadedAt: v.number(),
        aiSummary: v.optional(v.string()),
        extractedCount: v.optional(v.number()),
      }),
    ),
  ),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["orgId"])
  .index("by_scope", ["scope"])
  .index("by_org_scope", ["orgId", "scope"]);

// ─── Documents générés (dossiers opérateurs économiques) ─────────────────────

export const docSourceTypeValidator = v.union(
  v.literal("fiche"),
  v.literal("plan"),
  v.literal("letter"),
  v.literal("report"),
  v.literal("project"),
);

export const docFormatValidator = v.union(
  v.literal("docx"),
  v.literal("pptx"),
  v.literal("pdf"),
);

/**
 * Registre des documents générés automatiquement pour chaque cible.
 * Les dossiers sont créés dans documentFolders (iDocument).
 * Cette table fait le lien entre les entités diplomatiques et les fichiers stockés.
 */
export const diplomaticDocumentsTable = defineTable({
  orgId: v.id("orgs"),
  folderId: v.id("documentFolders"),
  targetId: v.id("diplomaticTargets"),

  // Source
  sourceType: docSourceTypeValidator,
  sourceId: v.string(),

  // Organisation dans le dossier
  subfolder: v.string(),
  filename: v.string(),
  format: docFormatValidator,

  // Stockage
  storageId: v.id("_storage"),
  sizeBytes: v.number(),

  // Versioning
  version: v.number(),

  // Timestamps
  generatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_target", ["targetId"])
  .index("by_target_source", ["targetId", "sourceType", "sourceId"])
  .index("by_folder", ["folderId"])
  .index("by_org", ["orgId"]);
