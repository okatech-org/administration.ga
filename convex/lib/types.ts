import type { Id } from "../_generated/dataModel";

// ============================================================================
// SIGNAL TYPES — Tous les signaux métier du système consulaire
// ============================================================================

export const SIGNAL_TYPES = {
  // ── Système ──
  ALERTE_SYSTEME: "ALERTE_SYSTEME",
  CONFIG_UPDATE: "CONFIG_UPDATE",
  ERREUR: "ERREUR",
  WEBHOOK_EXTERNE: "WEBHOOK_EXTERNE",
  SYNC_POSTGRES_OK: "SYNC_POSTGRES_OK",

  // ── Entités génériques ──
  TYPE_CREE: "TYPE_CREE",
  TYPE_MODIFIE: "TYPE_MODIFIE",
  TYPE_SUPPRIME: "TYPE_SUPPRIME",

  // ── Utilisateurs ──
  UTILISATEUR_CREE: "UTILISATEUR_CREE",
  UTILISATEUR_MODIFIE: "UTILISATEUR_MODIFIE",
  UTILISATEUR_DESACTIVE: "UTILISATEUR_DESACTIVE",

  // ── Profils ──
  PROFIL_CREE: "PROFIL_CREE",
  PROFIL_MODIFIE: "PROFIL_MODIFIE",
  PROFIL_VERIFIE: "PROFIL_VERIFIE",

  // ── Demandes / Requests ──
  DEMANDE_CREEE: "DEMANDE_CREEE",
  DEMANDE_SOUMISE: "DEMANDE_SOUMISE",
  DEMANDE_ASSIGNEE: "DEMANDE_ASSIGNEE",
  DEMANDE_STATUT_CHANGE: "DEMANDE_STATUT_CHANGE",
  DEMANDE_COMPLETEE: "DEMANDE_COMPLETEE",
  DEMANDE_REJETEE: "DEMANDE_REJETEE",

  // ── Documents ──
  DOCUMENT_UPLOADE: "DOCUMENT_UPLOADE",
  DOCUMENT_VERIFIE: "DOCUMENT_VERIFIE",
  DOCUMENT_REJETE: "DOCUMENT_REJETE",
  DOCUMENT_SUPPRIME: "DOCUMENT_SUPPRIME",

  // ── Paiements ──
  PAIEMENT_CREE: "PAIEMENT_CREE",
  PAIEMENT_EN_COURS: "PAIEMENT_EN_COURS",
  PAIEMENT_VALIDE: "PAIEMENT_VALIDE",
  PAIEMENT_ECHOUE: "PAIEMENT_ECHOUE",
  PAIEMENT_REMBOURSE: "PAIEMENT_REMBOURSE",

  // ── Rendez-vous ──
  RDV_CREE: "RDV_CREE",
  RDV_CONFIRME: "RDV_CONFIRME",
  RDV_ANNULE: "RDV_ANNULE",
  RDV_COMPLETE: "RDV_COMPLETE",
  RDV_NO_SHOW: "RDV_NO_SHOW",

  // ── Organisations & Membres ──
  ORG_CREEE: "ORG_CREEE",
  ORG_MODIFIEE: "ORG_MODIFIEE",
  MEMBRE_AJOUTE: "MEMBRE_AJOUTE",
  MEMBRE_RETIRE: "MEMBRE_RETIRE",
  MEMBRE_ROLE_CHANGE: "MEMBRE_ROLE_CHANGE",

  // ── Registre Consulaire ──
  INSCRIPTION_CONSULAIRE_CREEE: "INSCRIPTION_CONSULAIRE_CREEE",
  INSCRIPTION_CONSULAIRE_VALIDEE: "INSCRIPTION_CONSULAIRE_VALIDEE",
  INSCRIPTION_CONSULAIRE_REJETEE: "INSCRIPTION_CONSULAIRE_REJETEE",
  CARTE_CONSULAIRE_IMPRIMEE: "CARTE_CONSULAIRE_IMPRIMEE",

  // ── Services ──
  SERVICE_CREE: "SERVICE_CREE",
  SERVICE_MODIFIE: "SERVICE_MODIFIE",
  SERVICE_DESACTIVE: "SERVICE_DESACTIVE",

  // ── Posts / Contenu ──
  POST_CREE: "POST_CREE",
  POST_PUBLIE: "POST_PUBLIE",
  POST_MODIFIE: "POST_MODIFIE",
  POST_SUPPRIME: "POST_SUPPRIME",

  // ── Support / Tickets ──
  TICKET_CREE: "TICKET_CREE",
  TICKET_REPONDU: "TICKET_REPONDU",
  TICKET_FERME: "TICKET_FERME",

  // ── Associations ──
  ASSOCIATION_CREEE: "ASSOCIATION_CREEE",
  ASSOCIATION_MODIFIEE: "ASSOCIATION_MODIFIEE",
  ASSOCIATION_CLAIM: "ASSOCIATION_CLAIM",

  // ── Notifications ──
  NOUVELLE_NOTIFICATION: "NOUVELLE_NOTIFICATION",
  NOTIFICATION_LUE: "NOTIFICATION_LUE",

  // ── Meetings / Appels ──
  MEETING_CREE: "MEETING_CREE",
  MEETING_TERMINE: "MEETING_TERMINE",
  APPEL_INITIE: "APPEL_INITIE",

  // ── Sécurité ──
  CONNEXION_UTILISATEUR: "CONNEXION_UTILISATEUR",
  PERMISSION_MODIFIEE: "PERMISSION_MODIFIEE",
  ROLE_CONFIG_MODIFIE: "ROLE_CONFIG_MODIFIE",

  // ── Système (Phase G.2 — observabilité cron) ──
  SYSTEM_CRON_SUCCESS: "SYSTEM_CRON_SUCCESS",
  SYSTEM_CRON_ERROR: "SYSTEM_CRON_ERROR",
} as const;

export type SignalType = (typeof SIGNAL_TYPES)[keyof typeof SIGNAL_TYPES];

// ============================================================================
// CORTEX — Modules du système nerveux
// ============================================================================

export const CORTEX = {
  LIMBIQUE: "LIMBIQUE",
  HIPPOCAMPE: "HIPPOCAMPE",
  PREFRONTAL: "PREFRONTAL",
  SENSORIEL: "SENSORIEL",
  VISUEL: "VISUEL",
  AUDITIF: "AUDITIF",
  MOTEUR: "MOTEUR",
  PLASTICITE: "PLASTICITE",
} as const;

export type CortexType = (typeof CORTEX)[keyof typeof CORTEX];

// ============================================================================
// CATÉGORIES D'ACTIONS — Pour l'hippocampe
// ============================================================================

export const CATEGORIES_ACTION = {
  METIER: "METIER",
  SYSTEME: "SYSTEME",
  UTILISATEUR: "UTILISATEUR",
  SECURITE: "SECURITE",
} as const;

export type CategorieAction =
  (typeof CATEGORIES_ACTION)[keyof typeof CATEGORIES_ACTION];

// ============================================================================
// TABLE DE ROUTAGE — Signal → Cortex destination
// ============================================================================

/**
 * Mappe un type de signal vers le(s) cortex qui doivent le traiter.
 * Le limbique utilise cette table pour router les signaux.
 */
export const ROUTING_TABLE: Record<string, string[]> = {
  // Notifications → Auditif (qui dispatche vers Moteur pour envoi)
  NOUVELLE_NOTIFICATION: [CORTEX.AUDITIF],
  DEMANDE_SOUMISE: [CORTEX.AUDITIF, CORTEX.HIPPOCAMPE],
  DEMANDE_ASSIGNEE: [CORTEX.AUDITIF],
  DEMANDE_COMPLETEE: [CORTEX.AUDITIF],
  DEMANDE_REJETEE: [CORTEX.AUDITIF],

  // Paiements → Auditif (notification) + Hippocampe (métriques)
  PAIEMENT_VALIDE: [CORTEX.AUDITIF, CORTEX.HIPPOCAMPE],
  PAIEMENT_ECHOUE: [CORTEX.AUDITIF],
  PAIEMENT_REMBOURSE: [CORTEX.AUDITIF],

  // Documents → Visuel (traitement) + Auditif (notification)
  DOCUMENT_UPLOADE: [CORTEX.VISUEL],
  DOCUMENT_VERIFIE: [CORTEX.AUDITIF],

  // RDV → Auditif (rappels)
  RDV_CREE: [CORTEX.AUDITIF],
  RDV_ANNULE: [CORTEX.AUDITIF],
  RDV_NO_SHOW: [CORTEX.AUDITIF, CORTEX.HIPPOCAMPE],

  // Registre consulaire → Auditif
  INSCRIPTION_CONSULAIRE_VALIDEE: [CORTEX.AUDITIF],
  INSCRIPTION_CONSULAIRE_REJETEE: [CORTEX.AUDITIF],

  // Config → Plasticité
  CONFIG_UPDATE: [CORTEX.PLASTICITE],

  // Sécurité → Hippocampe (audit trail renforcé)
  CONNEXION_UTILISATEUR: [CORTEX.HIPPOCAMPE],
  PERMISSION_MODIFIEE: [CORTEX.HIPPOCAMPE],

  // Système → Monitoring
  ALERTE_SYSTEME: [CORTEX.AUDITIF],
  ERREUR: [CORTEX.HIPPOCAMPE],

  // Webhooks → Préfrontal (décision de traitement)
  WEBHOOK_EXTERNE: [CORTEX.PREFRONTAL],
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface SignalPondere {
  type: string;
  source: string;
  destination?: string;
  entiteType?: string;
  entiteId?: string;
  payload: any;
  confiance: number;
  priorite: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  correlationId: string;
  parentSignalId?: Id<"signaux">;
  ttl?: number;
  timestamp: number;
}

export interface LogCortexParams {
  action: string;
  categorie: CategorieAction | string;
  entiteType: string;
  entiteId: string;
  userId?: string;
  avant?: unknown;
  apres?: unknown;
  signalType: SignalType | string;
  priorite?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  destination?: CortexType | string;
}

// ============================================================================
// HELPERS
// ============================================================================

export function genererCorrelationId() {
  return crypto.randomUUID();
}

export function calculerScorePondere(
  scores: { valeur: number; poids: number }[],
) {
  if (scores.length === 0) return 0;
  let sommePoids = 0;
  let sommeValeursPonderees = 0;
  for (const score of scores) {
    sommePoids += score.poids;
    sommeValeursPonderees += score.valeur * score.poids;
  }
  return sommePoids > 0 ? sommeValeursPonderees / sommePoids : 0;
}
