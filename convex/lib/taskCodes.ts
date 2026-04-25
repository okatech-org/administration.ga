/**
 * ═══════════════════════════════════════════════════════════════
 * TASK CODES — Single source of truth
 * ═══════════════════════════════════════════════════════════════
 *
 * Every permission in the system is represented by a task code.
 * This file is the authoritative definition:
 *   - Nested object for IDE autocompletion (TaskCode.requests.view)
 *   - Union type for compile-time safety
 *   - Flat array for iteration and validation
 *   - Convex validator for DB storage
 *   - Metadata (category, risk level)
 *
 * i18n keys follow the pattern: tasks.<code>.label / tasks.<code>.description
 * e.g. tasks.requests.view.label, tasks.requests.view.description
 */

import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// TASK CODE OBJECT — Nested for autocompletion
// ═══════════════════════════════════════════════════════════════

export const TaskCode = {
  requests: {
    view: "requests.view",
    create: "requests.create",
    process: "requests.process",
    validate: "requests.validate",
    assign: "requests.assign",
    delete: "requests.delete",
    complete: "requests.complete",
  },
  documents: {
    view: "documents.view",
    validate: "documents.validate",
    generate: "documents.generate",
    delete: "documents.delete",
    // Document template / generation / signature workflow
    manage_templates: "documents.manage_templates",
    sign: "documents.sign",
    publish: "documents.publish",
    // AI assistant — gates the "generate template from document" feature.
    // Distributed by default to admin/manager positions; can be revoked
    // per-org if costs need to be controlled.
    ai_generation: "documents.ai_generation",
  },
  appointments: {
    view: "appointments.view",
    manage: "appointments.manage",
    configure: "appointments.configure",
  },
  profiles: {
    view: "profiles.view",
    manage: "profiles.manage",
  },
  citizen_profiles: {
    view: "citizen_profiles.view",
    manage: "citizen_profiles.manage",
  },
  civil_status: {
    transcribe: "civil_status.transcribe",
    register: "civil_status.register",
    certify: "civil_status.certify",
  },
  passports: {
    process: "passports.process",
    biometric: "passports.biometric",
    deliver: "passports.deliver",
  },
  visas: {
    process: "visas.process",
    approve: "visas.approve",
    stamp: "visas.stamp",
  },
  finance: {
    view: "finance.view",
    collect: "finance.collect",
    manage: "finance.manage",
  },
  communication: {
    publish: "communication.publish",
    notify: "communication.notify",
  },
  team: {
    view: "team.view",
    manage: "team.manage",
    assign_roles: "team.assign_roles",
    /** Supervision opérationnelle : voir les membres de son sous-arbre,
     * leurs stats, RDV et demandes traitées. Lecture seule. */
    supervise: "team.supervise",
  },
  settings: {
    view: "settings.view",
    manage: "settings.manage",
  },
  org: {
    view: "org.view",
  },
  schedules: {
    view: "schedules.view",
    manage: "schedules.manage",
  },
  analytics: {
    view: "analytics.view",
    export: "analytics.export",
  },
  statistics: {
    view: "statistics.view",
  },
  intelligence: {
    view: "intelligence.view",
    manage: "intelligence.manage",
  },
  // Consular services
  consular_registrations: {
    view: "consular_registrations.view",
    manage: "consular_registrations.manage",
  },
  consular_notifications: {
    view: "consular_notifications.view",
  },
  consular_cards: {
    manage: "consular_cards.manage",
  },
  // Community
  community_events: {
    view: "community_events.view",
    manage: "community_events.manage",
  },
  // Payments
  payments: {
    view: "payments.view",
  },
  // Digital Mail
  digital_mail: {
    view: "digital_mail.view",
    manage: "digital_mail.manage",
  },
  // Meetings & Calls
  meetings: {
    create: "meetings.create",
    join: "meetings.join",
    manage: "meetings.manage",
    view_history: "meetings.view_history",
    // Centre d'Appels — gestion multi-lignes (Sprint 2+)
    hold: "meetings.hold",
    transfer: "meetings.transfer",
    supervise: "meetings.supervise",
  },
  // Chat peer-to-peer
  chats: {
    view: "chats.view",
    send: "chats.send",
    /**
     * Permission spéciale pour accéder aux threads "standard" (Mr Ray) de
     * l'org en tant qu'agent. Par défaut distribuée aux rôles superviseur
     * et admin uniquement — empêche un agent quelconque de lire les
     * conversations assistant IA ↔ citoyen de son org.
     */
    accessStandardThread: "chats.accessStandardThread",
  },
  // Correspondance & Dossiers de procédure
  // Mapping des 7 rôles spec iCorrespondance §3.1 :
  //   Lecteur → view, Contributeur → create, Validateur → approve,
  //   Signataire → sign, Transmetteur → transmit, Superviseur → supervise,
  //   Admin procédure → admin.
  correspondance: {
    view: "correspondance.view",
    create: "correspondance.create",
    approve: "correspondance.approve",
    sign: "correspondance.sign",
    transmit: "correspondance.transmit",
    /** Superviseur : consulter tout dossier de son périmètre, commenter,
     * assigner un agent à une étape. Distinct de `admin` qui gère la config
     * des types de démarche et l'arrêt de processus. */
    supervise: "correspondance.supervise",
    configure: "correspondance.configure",
    admin: "correspondance.admin",
  },
  // Voicemails — Sprint 6 (Centre d'Appels)
  voicemails: {
    view: "voicemails.view",
    listen: "voicemails.listen",
    delete: "voicemails.delete",
  },
  // Call recordings — Sprint 6 (Centre d'Appels)
  callRecordings: {
    start: "callRecordings.start",
    stop: "callRecordings.stop",
    listen: "callRecordings.listen",
    delete: "callRecordings.delete",
  },
  // Push notifications — Sprint 6
  notifications: {
    push_subscribe: "notifications.push_subscribe",
  },
  // AI Assistant Proactif
  ai_assistant: {
    /** Voir les suggestions IA pertinentes pour son contexte */
    view: "ai_assistant.view",
    /** Rejeter une suggestion IA */
    dismiss: "ai_assistant.dismiss",
    /** Appliquer manuellement une action proposee par l'IA */
    apply: "ai_assistant.apply",
    /** Configurer ses preferences personnelles (capabilities, sensibilite, canaux) */
    configure: "ai_assistant.configure",
    /** Autoriser l'auto-application de certaines actions sans validation */
    auto_apply: "ai_assistant.auto_apply",
    /** Gouverner la config IA au niveau org (capabilities autorisees, budgets, modeles) */
    admin: "ai_assistant.admin",
    /** Consulter le journal d'activite IA (interventions, couts, performances) */
    audit: "ai_assistant.audit",
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPE — Union of all task code strings
// ═══════════════════════════════════════════════════════════════

/** Recursively extract all string leaf values from a nested object */
type ExtractLeafValues<T> = T extends string
  ? T
  : { [K in keyof T]: ExtractLeafValues<T[K]> }[keyof T];

/** Union type of every valid task code: "requests.view" | "requests.create" | ... */
export type TaskCodeValue = ExtractLeafValues<typeof TaskCode>;

// ═══════════════════════════════════════════════════════════════
// FLAT ARRAY — For iteration and validation
// ═══════════════════════════════════════════════════════════════

/** Extract all leaf string values from the nested TaskCode object */
function extractCodes(obj: Record<string, unknown>): string[] {
  const codes: string[] = [];
  for (const value of Object.values(obj)) {
    if (typeof value === "string") {
      codes.push(value);
    } else if (typeof value === "object" && value !== null) {
      codes.push(...extractCodes(value as Record<string, unknown>));
    }
  }
  return codes;
}

/** Flat array of every task code in the system */
export const ALL_TASK_CODES = extractCodes(TaskCode) as TaskCodeValue[];

/** Get all task codes for a specific category */
export function getTaskCodesForCategory(
  category: keyof typeof TaskCode,
): TaskCodeValue[] {
  const group = TaskCode[category];
  return Object.values(group) as TaskCodeValue[];
}

// ═══════════════════════════════════════════════════════════════
// CONVEX VALIDATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Convex validator for task codes.
 * Use in schema definitions: `tasks: v.array(taskCodeValidator)`
 */
export const taskCodeValidator = v.union(
  // Requests
  v.literal(TaskCode.requests.view),
  v.literal(TaskCode.requests.create),
  v.literal(TaskCode.requests.process),
  v.literal(TaskCode.requests.validate),
  v.literal(TaskCode.requests.assign),
  v.literal(TaskCode.requests.delete),
  v.literal(TaskCode.requests.complete),
  // Documents
  v.literal(TaskCode.documents.view),
  v.literal(TaskCode.documents.validate),
  v.literal(TaskCode.documents.generate),
  v.literal(TaskCode.documents.delete),
  v.literal(TaskCode.documents.manage_templates),
  v.literal(TaskCode.documents.sign),
  v.literal(TaskCode.documents.publish),
  v.literal(TaskCode.documents.ai_generation),
  // Appointments
  v.literal(TaskCode.appointments.view),
  v.literal(TaskCode.appointments.manage),
  v.literal(TaskCode.appointments.configure),
  // Profiles
  v.literal(TaskCode.profiles.view),
  v.literal(TaskCode.profiles.manage),
  // Citizen Profiles
  v.literal(TaskCode.citizen_profiles.view),
  v.literal(TaskCode.citizen_profiles.manage),
  // Civil Status
  v.literal(TaskCode.civil_status.transcribe),
  v.literal(TaskCode.civil_status.register),
  v.literal(TaskCode.civil_status.certify),
  // Passports
  v.literal(TaskCode.passports.process),
  v.literal(TaskCode.passports.biometric),
  v.literal(TaskCode.passports.deliver),
  // Visas
  v.literal(TaskCode.visas.process),
  v.literal(TaskCode.visas.approve),
  v.literal(TaskCode.visas.stamp),
  // Finance
  v.literal(TaskCode.finance.view),
  v.literal(TaskCode.finance.collect),
  v.literal(TaskCode.finance.manage),
  // Communication
  v.literal(TaskCode.communication.publish),
  v.literal(TaskCode.communication.notify),
  // Team
  v.literal(TaskCode.team.view),
  v.literal(TaskCode.team.manage),
  v.literal(TaskCode.team.assign_roles),
  v.literal(TaskCode.team.supervise),
  // Settings
  v.literal(TaskCode.settings.view),
  v.literal(TaskCode.settings.manage),
  // Org
  v.literal(TaskCode.org.view),
  // Schedules
  v.literal(TaskCode.schedules.view),
  v.literal(TaskCode.schedules.manage),
  // Analytics
  v.literal(TaskCode.analytics.view),
  v.literal(TaskCode.analytics.export),
  // Statistics
  v.literal(TaskCode.statistics.view),
  // Intelligence
  v.literal(TaskCode.intelligence.view),
  v.literal(TaskCode.intelligence.manage),
  // Consular Registrations
  v.literal(TaskCode.consular_registrations.view),
  v.literal(TaskCode.consular_registrations.manage),
  // Consular Notifications
  v.literal(TaskCode.consular_notifications.view),
  // Consular Cards
  v.literal(TaskCode.consular_cards.manage),
  // Community Events
  v.literal(TaskCode.community_events.view),
  v.literal(TaskCode.community_events.manage),
  // Payments
  v.literal(TaskCode.payments.view),
  // Digital Mail
  v.literal(TaskCode.digital_mail.view),
  v.literal(TaskCode.digital_mail.manage),
  // Chat peer-to-peer
  v.literal(TaskCode.chats.view),
  v.literal(TaskCode.chats.send),
  v.literal(TaskCode.chats.accessStandardThread),
  // Meetings & Calls
  v.literal(TaskCode.meetings.create),
  v.literal(TaskCode.meetings.join),
  v.literal(TaskCode.meetings.manage),
  v.literal(TaskCode.meetings.view_history),
  v.literal(TaskCode.meetings.hold),
  v.literal(TaskCode.meetings.transfer),
  v.literal(TaskCode.meetings.supervise),
  // Correspondance & Dossiers
  v.literal(TaskCode.correspondance.view),
  v.literal(TaskCode.correspondance.create),
  v.literal(TaskCode.correspondance.approve),
  v.literal(TaskCode.correspondance.sign),
  v.literal(TaskCode.correspondance.transmit),
  v.literal(TaskCode.correspondance.supervise),
  v.literal(TaskCode.correspondance.configure),
  v.literal(TaskCode.correspondance.admin),
  // Voicemails (Sprint 6)
  v.literal(TaskCode.voicemails.view),
  v.literal(TaskCode.voicemails.listen),
  v.literal(TaskCode.voicemails.delete),
  // Call recordings (Sprint 6)
  v.literal(TaskCode.callRecordings.start),
  v.literal(TaskCode.callRecordings.stop),
  v.literal(TaskCode.callRecordings.listen),
  v.literal(TaskCode.callRecordings.delete),
  // Push notifications (Sprint 6)
  v.literal(TaskCode.notifications.push_subscribe),
  // AI Assistant Proactif
  v.literal(TaskCode.ai_assistant.view),
  v.literal(TaskCode.ai_assistant.dismiss),
  v.literal(TaskCode.ai_assistant.apply),
  v.literal(TaskCode.ai_assistant.configure),
  v.literal(TaskCode.ai_assistant.auto_apply),
  v.literal(TaskCode.ai_assistant.admin),
  v.literal(TaskCode.ai_assistant.audit),
);

// ═══════════════════════════════════════════════════════════════
// TASK CATEGORIES
// ═══════════════════════════════════════════════════════════════

/** All task category keys */
export type TaskCategory = keyof typeof TaskCode;

/** All task category keys as array */
export const ALL_TASK_CATEGORIES = Object.keys(TaskCode) as TaskCategory[];

// ═══════════════════════════════════════════════════════════════
// RISK LEVELS
// ═══════════════════════════════════════════════════════════════

export type TaskRisk = "low" | "medium" | "high" | "critical";

/**
 * Risk level for each task code.
 * Determines UI treatment (warnings, confirmation dialogs, audit logging).
 */
export const TASK_RISK: Record<TaskCodeValue, TaskRisk> = {
  // Requests
  [TaskCode.requests.view]: "low",
  [TaskCode.requests.create]: "low",
  [TaskCode.requests.process]: "medium",
  [TaskCode.requests.validate]: "high",
  [TaskCode.requests.assign]: "medium",
  [TaskCode.requests.delete]: "critical",
  [TaskCode.requests.complete]: "medium",
  // Documents
  [TaskCode.documents.view]: "low",
  [TaskCode.documents.validate]: "high",
  [TaskCode.documents.generate]: "high",
  [TaskCode.documents.delete]: "critical",
  [TaskCode.documents.manage_templates]: "medium",
  [TaskCode.documents.sign]: "high",
  [TaskCode.documents.publish]: "medium",
  [TaskCode.documents.ai_generation]: "medium",
  // Appointments
  [TaskCode.appointments.view]: "low",
  [TaskCode.appointments.manage]: "medium",
  [TaskCode.appointments.configure]: "medium",
  // Profiles
  [TaskCode.profiles.view]: "low",
  [TaskCode.profiles.manage]: "high",
  // Citizen Profiles — RGPD : accès aux données personnelles citoyennes
  [TaskCode.citizen_profiles.view]: "medium",
  [TaskCode.citizen_profiles.manage]: "high",
  // Civil Status
  [TaskCode.civil_status.transcribe]: "high",
  [TaskCode.civil_status.register]: "high",
  [TaskCode.civil_status.certify]: "high",
  // Passports
  [TaskCode.passports.process]: "high",
  [TaskCode.passports.biometric]: "medium",
  [TaskCode.passports.deliver]: "high",
  // Visas
  [TaskCode.visas.process]: "high",
  [TaskCode.visas.approve]: "critical",
  [TaskCode.visas.stamp]: "high",
  // Finance
  [TaskCode.finance.view]: "medium",
  [TaskCode.finance.collect]: "high",
  [TaskCode.finance.manage]: "critical",
  // Communication
  [TaskCode.communication.publish]: "medium",
  [TaskCode.communication.notify]: "medium",
  // Team
  [TaskCode.team.view]: "low",
  [TaskCode.team.manage]: "high",
  [TaskCode.team.assign_roles]: "critical",
  [TaskCode.team.supervise]: "medium",
  // Settings
  [TaskCode.settings.view]: "low",
  [TaskCode.settings.manage]: "high",
  // Org
  [TaskCode.org.view]: "low",
  // Schedules
  [TaskCode.schedules.view]: "low",
  [TaskCode.schedules.manage]: "medium",
  // Analytics
  [TaskCode.analytics.view]: "low",
  [TaskCode.analytics.export]: "medium",
  // Statistics
  [TaskCode.statistics.view]: "low",
  // Intelligence
  [TaskCode.intelligence.view]: "critical",
  [TaskCode.intelligence.manage]: "critical",
  // Consular Registrations
  [TaskCode.consular_registrations.view]: "low",
  [TaskCode.consular_registrations.manage]: "high",
  // Consular Notifications
  [TaskCode.consular_notifications.view]: "low",
  // Consular Cards
  [TaskCode.consular_cards.manage]: "high",
  // Community Events
  [TaskCode.community_events.view]: "low",
  [TaskCode.community_events.manage]: "medium",
  // Payments
  [TaskCode.payments.view]: "medium",
  // Digital Mail
  [TaskCode.digital_mail.view]: "low",
  [TaskCode.digital_mail.manage]: "medium",
  // Chat peer-to-peer
  [TaskCode.chats.view]: "low",
  [TaskCode.chats.send]: "low",
  [TaskCode.chats.accessStandardThread]: "medium",
  // Meetings & Calls
  [TaskCode.meetings.create]: "low",
  [TaskCode.meetings.join]: "low",
  [TaskCode.meetings.manage]: "medium",
  [TaskCode.meetings.view_history]: "low",
  // Centre d'Appels (Sprint 2+)
  [TaskCode.meetings.hold]: "low",
  [TaskCode.meetings.transfer]: "medium",
  [TaskCode.meetings.supervise]: "high",
  // Correspondance & Dossiers
  [TaskCode.correspondance.view]: "low",
  [TaskCode.correspondance.create]: "low",
  [TaskCode.correspondance.approve]: "high",
  [TaskCode.correspondance.sign]: "high",
  [TaskCode.correspondance.transmit]: "medium",
  [TaskCode.correspondance.supervise]: "high",
  [TaskCode.correspondance.configure]: "high",
  [TaskCode.correspondance.admin]: "critical",
  // Voicemails (Sprint 6) — listen/delete = high (GDPR)
  [TaskCode.voicemails.view]: "low",
  [TaskCode.voicemails.listen]: "high",
  [TaskCode.voicemails.delete]: "high",
  // Call recordings (Sprint 6) — listen/delete = high (GDPR)
  [TaskCode.callRecordings.start]: "medium",
  [TaskCode.callRecordings.stop]: "low",
  [TaskCode.callRecordings.listen]: "high",
  [TaskCode.callRecordings.delete]: "high",
  // Push notifications (Sprint 6)
  [TaskCode.notifications.push_subscribe]: "low",
  // AI Assistant Proactif — auto_apply et admin sont sensibles (l'IA peut agir sans validation)
  [TaskCode.ai_assistant.view]: "low",
  [TaskCode.ai_assistant.dismiss]: "low",
  [TaskCode.ai_assistant.apply]: "medium",
  [TaskCode.ai_assistant.configure]: "low",
  [TaskCode.ai_assistant.auto_apply]: "high",
  [TaskCode.ai_assistant.admin]: "critical",
  [TaskCode.ai_assistant.audit]: "low",
};
