/**
 * ═══════════════════════════════════════════════════════════════
 * ROLE MODULE SYSTEM
 * ═══════════════════════════════════════════════════════════════
 *
 * Architecture:
 *   TaskCode (atomic permission — defined in taskCodes.ts)
 *     └─ RoleModule (group of tasks)
 *         └─ Position (job title with multiple role modules)
 *             └─ OrganizationTemplate (preset positions per org type)
 *
 * CONVENTIONS:
 *   - All user-facing text uses i18n keys (roles.modules.<code>.label, etc.)
 *   - Icons use Lucide React icon names (string), rendered on frontend
 *   - Task codes are typed via TaskCodeValue import
 */

import { OrganizationType, MinistrySubType } from "./constants";
import { TaskCode, type TaskCodeValue } from "./taskCodes";
import { ModuleCode, ALL_MODULE_CODES, CORE_MODULE_CODES, type ModuleCodeValue, type ModuleAccessLevel } from "./moduleCodes";
import type { LocalizedString } from "./validators";

// ═══════════════════════════════════════════════════════════════
// ROLE MODULES — Groups of tasks
// ═══════════════════════════════════════════════════════════════

export interface TaskPresetDefinition {
  code: string;
  /** i18n key: roles.modules.<code>.label */
  label: LocalizedString;
  /** i18n key: roles.modules.<code>.description */
  description: LocalizedString;
  /** Lucide icon name (e.g. "Crown", "FileText") */
  icon: string;
  /** Tailwind color class */
  color: string;
  tasks: TaskCodeValue[];
}

export const POSITION_TASK_PRESETS: TaskPresetDefinition[] = [
  {
    code: "direction",
    label: { fr: "Direction", en: "Leadership" },
    description: { fr: "Supervision générale du poste diplomatique", en: "General oversight of the diplomatic post" },
    icon: "Crown",
    color: "text-amber-500",
    tasks: [
      TaskCode.requests.view, TaskCode.requests.validate, TaskCode.requests.assign,
      TaskCode.documents.view, TaskCode.documents.validate, TaskCode.documents.generate,
      TaskCode.documents.manage_templates, TaskCode.documents.sign, TaskCode.documents.publish,
      TaskCode.documents.ai_generation,
      TaskCode.appointments.view, TaskCode.profiles.view, TaskCode.profiles.manage,
      TaskCode.citizen_profiles.view, TaskCode.citizen_profiles.manage,
      TaskCode.finance.view, TaskCode.finance.manage,
      TaskCode.team.view, TaskCode.team.manage, TaskCode.team.assign_roles,
      TaskCode.settings.view, TaskCode.settings.manage,
      TaskCode.analytics.view, TaskCode.analytics.export,
      TaskCode.communication.publish, TaskCode.communication.notify,
      TaskCode.org.view, TaskCode.statistics.view,
      TaskCode.schedules.view, TaskCode.schedules.manage,
      TaskCode.consular_registrations.view, TaskCode.consular_registrations.manage,
      TaskCode.consular_notifications.view, TaskCode.consular_cards.manage,
      TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.manage, TaskCode.meetings.view_history,
      TaskCode.chats.accessStandardThread,
    ],
  },
  {
    code: "management",
    label: { fr: "Encadrement", en: "Management" },
    description: { fr: "Gestion des opérations courantes et supervision des agents", en: "Daily operations management and agent supervision" },
    icon: "ClipboardList",
    color: "text-blue-500",
    tasks: [
      TaskCode.requests.view, TaskCode.requests.validate, TaskCode.requests.assign, TaskCode.requests.complete,
      TaskCode.documents.view, TaskCode.documents.validate,
      TaskCode.documents.manage_templates, TaskCode.documents.publish,
      TaskCode.documents.ai_generation,
      TaskCode.appointments.view, TaskCode.appointments.manage,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.team.view, TaskCode.team.manage,
      TaskCode.analytics.view, TaskCode.communication.publish,
      TaskCode.org.view, TaskCode.statistics.view,
      TaskCode.schedules.view, TaskCode.schedules.manage,
      TaskCode.consular_registrations.view, TaskCode.consular_registrations.manage,
      TaskCode.consular_notifications.view, TaskCode.consular_cards.manage,
      TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.manage, TaskCode.meetings.view_history,
      TaskCode.chats.accessStandardThread,
    ],
  },
  {
    code: "request_processing",
    label: { fr: "Traitement des demandes", en: "Request processing" },
    description: { fr: "Instruction et traitement des demandes courantes", en: "Processing and handling of standard requests" },
    icon: "FileEdit",
    color: "text-emerald-500",
    tasks: [
      TaskCode.requests.view, TaskCode.requests.create, TaskCode.requests.process, TaskCode.requests.complete,
      TaskCode.documents.view, TaskCode.documents.validate,
      TaskCode.appointments.view, TaskCode.appointments.manage,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.org.view,
      TaskCode.schedules.view,
      TaskCode.consular_registrations.view, TaskCode.consular_notifications.view,
    ],
  },
  {
    code: "validation",
    label: { fr: "Validation", en: "Validation" },
    description: { fr: "Vérification et validation des documents et demandes", en: "Verification and validation of documents and requests" },
    icon: "CheckCircle",
    color: "text-green-600",
    tasks: [
      TaskCode.requests.view, TaskCode.requests.validate,
      TaskCode.documents.view, TaskCode.documents.validate, TaskCode.documents.generate,
      TaskCode.documents.sign, TaskCode.documents.publish,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.org.view,
      TaskCode.consular_registrations.view, TaskCode.consular_notifications.view,
    ],
  },
  {
    code: "civil_status",
    label: { fr: "État civil", en: "Civil status" },
    description: { fr: "Gestion des actes d'état civil", en: "Civil status records management" },
    icon: "ScrollText",
    color: "text-purple-500",
    tasks: [
      TaskCode.civil_status.transcribe, TaskCode.civil_status.register, TaskCode.civil_status.certify,
      TaskCode.requests.view, TaskCode.requests.process,
      TaskCode.documents.view, TaskCode.documents.validate, TaskCode.documents.generate,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.org.view,
    ],
  },
  {
    code: "passports",
    label: { fr: "Passeports", en: "Passports" },
    description: { fr: "Gestion des demandes de passeport et biométrie", en: "Passport applications and biometrics management" },
    icon: "BookOpen",
    color: "text-indigo-500",
    tasks: [
      TaskCode.passports.process, TaskCode.passports.biometric, TaskCode.passports.deliver,
      TaskCode.requests.view, TaskCode.requests.process,
      TaskCode.documents.view, TaskCode.documents.validate,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.appointments.view,
      TaskCode.org.view,
    ],
  },
  {
    code: "visas",
    label: { fr: "Visas", en: "Visas" },
    description: { fr: "Instruction et délivrance des visas", en: "Visa processing and issuance" },
    icon: "Stamp",
    color: "text-orange-500",
    tasks: [
      TaskCode.visas.process, TaskCode.visas.approve, TaskCode.visas.stamp,
      TaskCode.requests.view, TaskCode.requests.process,
      TaskCode.documents.view, TaskCode.documents.validate,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.appointments.view,
      TaskCode.org.view,
    ],
  },
  {
    code: "finance",
    label: { fr: "Finances", en: "Finance" },
    description: { fr: "Gestion financière et comptabilité consulaire", en: "Financial management and consular accounting" },
    icon: "Wallet",
    color: "text-yellow-600",
    tasks: [
      TaskCode.finance.view, TaskCode.finance.collect, TaskCode.finance.manage,
      TaskCode.analytics.view, TaskCode.analytics.export,
      TaskCode.org.view,
    ],
  },
  {
    code: "communication",
    label: { fr: "Communication", en: "Communication" },
    description: { fr: "Publications et notifications aux usagers", en: "Publications and user notifications" },
    icon: "Megaphone",
    color: "text-sky-500",
    tasks: [
      TaskCode.communication.publish, TaskCode.communication.notify,
      TaskCode.analytics.view,
      TaskCode.org.view,
    ],
  },
  {
    code: "reception",
    label: { fr: "Accueil", en: "Reception" },
    description: { fr: "Accueil du public et prise de rendez-vous", en: "Public reception and appointment scheduling" },
    icon: "HandHelping",
    color: "text-teal-500",
    tasks: [
      TaskCode.requests.view, TaskCode.requests.create,
      TaskCode.appointments.view, TaskCode.appointments.manage,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.org.view,
      TaskCode.schedules.view,
      TaskCode.meetings.join, TaskCode.meetings.view_history,
    ],
  },
  {
    code: "consultation",
    label: { fr: "Consultation", en: "Read-only access" },
    description: { fr: "Accès en lecture seule aux données du poste", en: "Read-only access to post data" },
    icon: "Eye",
    color: "text-zinc-400",
    tasks: [
      TaskCode.requests.view, TaskCode.documents.view,
      TaskCode.appointments.view, TaskCode.profiles.view,
      TaskCode.citizen_profiles.view,
      TaskCode.analytics.view,
      TaskCode.org.view,
    ],
  },
  {
    code: "intelligence",
    label: { fr: "Renseignement", en: "Intelligence" },
    description: { fr: "Gestion des notes de renseignement", en: "Intelligence notes management" },
    icon: "ShieldAlert",
    color: "text-red-500",
    tasks: [
      TaskCode.intelligence.view, TaskCode.intelligence.manage,
      TaskCode.profiles.view, TaskCode.citizen_profiles.view,
      TaskCode.org.view,
    ],
  },
  {
    code: "system_admin",
    label: { fr: "Administration système", en: "System administration" },
    description: { fr: "Configuration technique et gestion des accès", en: "Technical configuration and access management" },
    icon: "Settings",
    color: "text-zinc-500",
    tasks: [
      TaskCode.settings.view, TaskCode.settings.manage,
      TaskCode.team.view, TaskCode.team.manage, TaskCode.team.assign_roles,
      TaskCode.analytics.view, TaskCode.analytics.export,
      TaskCode.org.view, TaskCode.statistics.view,
      TaskCode.schedules.view, TaskCode.schedules.manage,
    ],
  },
  {
    code: "meetings",
    label: { fr: "Réunions & Appels", en: "Meetings & Calls" },
    description: { fr: "Gestion des appels entrants et réunions", en: "Incoming calls and meetings management" },
    icon: "Phone",
    color: "text-cyan-500",
    tasks: [
      TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.manage, TaskCode.meetings.view_history,
    ],
  },
  // ─── Presets ministériels ──────────────────────────────────
  // Notes : pas de TaskCode.* dédié pour les modules réseau (ils ont leurs
  // propres codes "network.*.view" gérés via moduleAccess). Le preset porte
  // donc seulement les tasks transversales — les modules réseau sont attribués
  // en moduleAccess via PRESET_MODULE_ACCESS plus bas.
  {
    code: "ministry_cabinet",
    label: { fr: "Cabinet ministériel", en: "Ministerial Cabinet" },
    description: { fr: "Pilotage stratégique du ministère et arbitrages", en: "Ministry strategic steering and decisions" },
    icon: "Crown",
    color: "text-amber-600",
    tasks: [
      TaskCode.documents.view, TaskCode.documents.validate, TaskCode.documents.publish,
      TaskCode.communication.publish, TaskCode.communication.notify,
      TaskCode.org.view, TaskCode.statistics.view, TaskCode.analytics.view, TaskCode.analytics.export,
      TaskCode.team.view, TaskCode.team.manage, TaskCode.team.assign_roles,
      TaskCode.settings.view, TaskCode.settings.manage,
      TaskCode.schedules.view, TaskCode.schedules.manage,
      TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.manage, TaskCode.meetings.view_history,
    ],
  },
  {
    code: "ministry_direction",
    label: { fr: "Direction ministérielle", en: "Ministry Department" },
    description: { fr: "Direction métier (politiques, économique, juridique, etc.)", en: "Operational department (political, economic, legal, etc.)" },
    icon: "Briefcase",
    color: "text-blue-600",
    tasks: [
      TaskCode.documents.view, TaskCode.documents.validate, TaskCode.documents.generate,
      TaskCode.communication.publish, TaskCode.communication.notify,
      TaskCode.org.view, TaskCode.statistics.view, TaskCode.analytics.view,
      TaskCode.team.view,
      TaskCode.schedules.view,
      TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.view_history,
    ],
  },
  {
    code: "network_supervision",
    label: { fr: "Supervision réseau", en: "Network Supervision" },
    description: { fr: "Vue agrégée des organismes rattachés (lecture seule)", en: "Aggregated view of subordinate orgs (read-only)" },
    icon: "Network",
    color: "text-red-500",
    tasks: [
      // Tasks transversales — l'accès réseau est porté par moduleAccess ci-dessous.
      TaskCode.org.view, TaskCode.statistics.view, TaskCode.analytics.view, TaskCode.analytics.export,
    ],
  },
  {
    code: "intelligence_services",
    label: { fr: "Services de renseignement", en: "Intelligence Services" },
    description: {
      fr: "Accès aux profils, notes confidentielles et cartographie du module Renseignement",
      en: "Access to profiles, confidential notes and mapping in the Intelligence module",
    },
    icon: "ShieldAlert",
    color: "text-rose-600",
    tasks: [
      TaskCode.intelligence.profiles_view,
      TaskCode.intelligence.profiles_search,
      TaskCode.intelligence.profiles_export,
      TaskCode.intelligence.notes_view,
      TaskCode.intelligence.notes_create,
      TaskCode.intelligence.notes_delete_own,
      TaskCode.intelligence.map_view,
      TaskCode.intelligence.watchlists_view,
      TaskCode.intelligence.watchlists_manage,
      TaskCode.intelligence.links_view,
      TaskCode.intelligence.links_manage,
      TaskCode.intelligence.briefing_generate,
      TaskCode.org.view,
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// GRADE SYSTEM — Named hierarchy ranks
// ═══════════════════════════════════════════════════════════════

export const POSITION_GRADES = {
  chief: {
    code: "chief" as const,
    label: { fr: "Chef de mission", en: "Head of mission" } as LocalizedString,
    shortLabel: { fr: "Chef", en: "Chief" } as LocalizedString,
    level: 1,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-300 dark:border-red-800",
    icon: "Medal",
  },
  deputy_chief: {
    code: "deputy_chief" as const,
    label: { fr: "Adjoint au Chef", en: "Deputy Head" } as LocalizedString,
    shortLabel: { fr: "Adj.", en: "Dep." } as LocalizedString,
    level: 1,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-300 dark:border-amber-800",
    icon: "Shield",
  },
  counselor: {
    code: "counselor" as const,
    label: { fr: "Conseiller", en: "Counselor" } as LocalizedString,
    shortLabel: { fr: "Cons.", en: "Coun." } as LocalizedString,
    level: 2,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-300 dark:border-blue-800",
    icon: "Briefcase",
  },
  agent: {
    code: "agent" as const,
    label: { fr: "Agent", en: "Agent" } as LocalizedString,
    shortLabel: { fr: "Ag.", en: "Ag." } as LocalizedString,
    level: 3,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-300 dark:border-green-800",
    icon: "User",
  },
  external: {
    code: "external" as const,
    label: { fr: "Externe", en: "External" } as LocalizedString,
    shortLabel: { fr: "Ext.", en: "Ext." } as LocalizedString,
    level: 4,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/30",
    borderColor: "border-gray-300 dark:border-gray-800",
    icon: "Link",
  },
} as const;

export type PositionGrade = keyof typeof POSITION_GRADES;

// ═══════════════════════════════════════════════════════════════
// MINISTRY GROUP TEMPLATES
// ═══════════════════════════════════════════════════════════════

export interface MinistryGroupTemplate {
  code: string;
  label: LocalizedString;
  description?: LocalizedString;
  /** Lucide icon name */
  icon: string;
  sortOrder: number;
  parentCode?: string;
}

export const EMBASSY_MINISTRY_GROUPS: MinistryGroupTemplate[] = [
  { code: "presidence", label: { fr: "Présidence", en: "Presidency" }, description: { fr: "Cabinet de la Présidence", en: "Presidency Cabinet" }, icon: "Landmark", sortOrder: 1 },
  { code: "mae", label: { fr: "Affaires Étrangères", en: "Foreign Affairs" }, description: { fr: "Ministère des Affaires Étrangères", en: "Ministry of Foreign Affairs" }, icon: "Globe", sortOrder: 2 },
  { code: "finances", label: { fr: "Finances", en: "Finance" }, description: { fr: "Ministère des Finances", en: "Ministry of Finance" }, icon: "Wallet", sortOrder: 3 },
  { code: "tresor_public", label: { fr: "Trésor Public", en: "Public Treasury" }, description: { fr: "Direction du Trésor Public", en: "Public Treasury Department" }, icon: "Building2", sortOrder: 4, parentCode: "finances" },
  { code: "direction_budget", label: { fr: "Direction du Budget", en: "Budget Department" }, description: { fr: "Direction Générale du Budget", en: "General Budget Department" }, icon: "BarChart3", sortOrder: 5, parentCode: "finances" },
  { code: "defense", label: { fr: "Défense", en: "Defense" }, description: { fr: "Ministère de la Défense", en: "Ministry of Defense" }, icon: "Shield", sortOrder: 6 },
  { code: "interieur", label: { fr: "Intérieur", en: "Interior" }, description: { fr: "Ministère de l'Intérieur", en: "Ministry of the Interior" }, icon: "Lock", sortOrder: 7 },
];

export const CONSULATE_MINISTRY_GROUPS: MinistryGroupTemplate[] = [
  { code: "mae", label: { fr: "Affaires Étrangères", en: "Foreign Affairs" }, description: { fr: "Ministère des Affaires Étrangères", en: "Ministry of Foreign Affairs" }, icon: "Globe", sortOrder: 1 },
  { code: "finances", label: { fr: "Finances", en: "Finance" }, description: { fr: "Ministère des Finances", en: "Ministry of Finance" }, icon: "Wallet", sortOrder: 2 },
];

// ─── MINISTRY (foreign_affairs) groups ──────────────────────
// Groupes internes au ministère : cabinet, secrétariat général, directions
// métier. Sert d'organigramme de référence pour le MAE.
export const MINISTRY_FOREIGN_AFFAIRS_GROUPS: MinistryGroupTemplate[] = [
  { code: "cabinet", label: { fr: "Cabinet", en: "Cabinet" }, description: { fr: "Cabinet du Ministre", en: "Minister's Cabinet" }, icon: "Crown", sortOrder: 1 },
  { code: "secretariat_general", label: { fr: "Secrétariat Général", en: "General Secretariat" }, description: { fr: "Direction administrative générale", en: "General administrative direction" }, icon: "Landmark", sortOrder: 2 },
  { code: "inspection_generale", label: { fr: "Inspection Générale", en: "General Inspectorate" }, description: { fr: "Contrôle interne et audit", en: "Internal control and audit" }, icon: "ShieldCheck", sortOrder: 3 },
  { code: "directions", label: { fr: "Directions", en: "Departments" }, description: { fr: "Directions métier du ministère", en: "Operational departments" }, icon: "Building2", sortOrder: 4 },
];

// ═══════════════════════════════════════════════════════════════
// PRESET → MODULE ACCESS MAPPING
// Traduit chaque preset en profil moduleAccess (reader/editor/admin)
// ═══════════════════════════════════════════════════════════════

type MA = ModuleAccessEntry;
const ma = (moduleCode: ModuleCodeValue, accessLevel: ModuleAccessLevel): MA => ({ moduleCode, accessLevel });

/**
 * Pour chaque preset, definir le profil moduleAccess associe.
 * Le niveau d'acces reflète les matrices du prompt (Section 5.1-5.3).
 */
export const PRESET_MODULE_ACCESS: Record<string, MA[]> = {
  direction: [
    ma(ModuleCode.consular_affairs, "reader"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.calendar, "editor"),
    ma(ModuleCode.diplomatic_affairs, "admin"),
    ma(ModuleCode.correspondence, "admin"),
    ma(ModuleCode.messaging, "editor"),
    ma(ModuleCode.news, "admin"),
    ma(ModuleCode.team, "admin"),
    ma(ModuleCode.payments, "reader"),
    ma(ModuleCode.statistics, "admin"),
    ma(ModuleCode.settings, "admin"),
  ],
  management: [
    ma(ModuleCode.consular_affairs, "admin"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.calendar, "editor"),
    ma(ModuleCode.correspondence, "editor"),
    ma(ModuleCode.messaging, "editor"),
    ma(ModuleCode.news, "editor"),
    ma(ModuleCode.team, "editor"),
    ma(ModuleCode.payments, "editor"),
    ma(ModuleCode.statistics, "reader"),
  ],
  request_processing: [
    ma(ModuleCode.consular_affairs, "editor"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.calendar, "editor"),
    ma(ModuleCode.team, "reader"),
  ],
  validation: [
    ma(ModuleCode.consular_affairs, "editor"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.team, "reader"),
  ],
  civil_status: [
    ma(ModuleCode.consular_affairs, "admin"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.team, "reader"),
  ],
  passports: [
    ma(ModuleCode.consular_affairs, "admin"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.team, "reader"),
    ma(ModuleCode.calendar, "reader"),
  ],
  visas: [
    ma(ModuleCode.consular_affairs, "admin"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.team, "reader"),
    ma(ModuleCode.calendar, "reader"),
  ],
  finance: [
    ma(ModuleCode.payments, "admin"),
    ma(ModuleCode.statistics, "editor"),
  ],
  communication: [
    ma(ModuleCode.news, "editor"),
    ma(ModuleCode.statistics, "reader"),
  ],
  reception: [
    ma(ModuleCode.consular_affairs, "reader"),
    ma(ModuleCode.calendar, "editor"),
    ma(ModuleCode.team, "reader"),
    ma(ModuleCode.messaging, "reader"),
  ],
  consultation: [
    ma(ModuleCode.consular_affairs, "reader"),
    ma(ModuleCode.documents, "reader"),
    ma(ModuleCode.calendar, "reader"),
    ma(ModuleCode.team, "reader"),
    ma(ModuleCode.statistics, "reader"),
  ],
  intelligence: [
    ma(ModuleCode.diplomatic_affairs, "editor"),
    ma(ModuleCode.team, "reader"),
  ],
  system_admin: [
    ma(ModuleCode.settings, "admin"),
    ma(ModuleCode.team, "admin"),
    ma(ModuleCode.statistics, "admin"),
  ],
  meetings: [
    ma(ModuleCode.messaging, "admin"),
  ],
  // ─── Ministériels ──────────────────────────────────────────
  ministry_cabinet: [
    ma(ModuleCode.documents, "admin"),
    ma(ModuleCode.correspondence, "admin"),
    ma(ModuleCode.diplomatic_affairs, "admin"),
    ma(ModuleCode.calendar, "editor"),
    ma(ModuleCode.messaging, "editor"),
    ma(ModuleCode.news, "admin"),
    ma(ModuleCode.team, "admin"),
    ma(ModuleCode.statistics, "admin"),
    ma(ModuleCode.settings, "admin"),
  ],
  ministry_direction: [
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.correspondence, "editor"),
    ma(ModuleCode.diplomatic_affairs, "editor"),
    ma(ModuleCode.calendar, "editor"),
    ma(ModuleCode.messaging, "editor"),
    ma(ModuleCode.news, "editor"),
    ma(ModuleCode.team, "reader"),
    ma(ModuleCode.statistics, "reader"),
  ],
  network_supervision: [
    ma(ModuleCode.network_diplomatic_oversight, "editor"),
    ma(ModuleCode.network_correspondence_oversight, "editor"),
    ma(ModuleCode.network_intelligence, "editor"),
  ],
  intelligence_services: [
    ma(ModuleCode.intelligence, "editor"),
  ],
};

const ACCESS_LEVEL_VALUE: Record<ModuleAccessLevel, number> = { reader: 1, editor: 2, admin: 3 };

/**
 * Merge plusieurs presets en un profil moduleAccess unique.
 * Quand un module apparait dans plusieurs presets, garde le niveau le plus eleve.
 */
export function resolveModuleAccessFromPresets(presets: string[]): MA[] {
  const map = new Map<ModuleCodeValue, ModuleAccessLevel>();
  for (const presetCode of presets) {
    const entries = PRESET_MODULE_ACCESS[presetCode];
    if (!entries) continue;
    for (const entry of entries) {
      const existing = map.get(entry.moduleCode);
      if (!existing || ACCESS_LEVEL_VALUE[entry.accessLevel] > ACCESS_LEVEL_VALUE[existing]) {
        map.set(entry.moduleCode, entry.accessLevel);
      }
    }
  }
  return Array.from(map.entries()).map(([moduleCode, accessLevel]) => ({ moduleCode, accessLevel }));
}

// ═══════════════════════════════════════════════════════════════
// POSITION TEMPLATES — Job titles with role modules
// ═══════════════════════════════════════════════════════════════

export interface ModuleAccessEntry {
  moduleCode: ModuleCodeValue;
  accessLevel: ModuleAccessLevel;
}

export interface PositionTemplate {
  code: string;
  title: LocalizedString;
  description: LocalizedString;
  level: number;
  /** Indice de pondération hiérarchique — "permanence" (perm.) */
  perm: number;
  grade?: PositionGrade;
  ministryCode?: string;
  taskPresets: string[];
  /** Acces modulaire par module (reader/editor/admin) — derive les task codes */
  moduleAccess?: ModuleAccessEntry[];
  isRequired: boolean;
}

// ─── EMBASSY positions ──────────────────────────────────

export const EMBASSY_POSITIONS: PositionTemplate[] = [
  { code: "ambassador", title: { fr: "Ambassadeur", en: "Ambassador" }, description: { fr: "Ambassadeur Extraordinaire et Plénipotentiaire — représentant personnel du Chef de l'État", en: "Ambassador Extraordinary and Plenipotentiary — personal representative of the Head of State" }, level: 1, perm: 34, grade: "chief", ministryCode: "presidence", taskPresets: ["direction", "intelligence"], isRequired: true },
  { code: "first_counselor", title: { fr: "Premier Conseiller", en: "First Counselor" }, description: { fr: "Adjoint au Chef de mission — Chargé d'Affaires a.i. en l'absence de l'Ambassadeur", en: "Deputy Head of mission — Chargé d'Affaires a.i. in the Ambassador's absence" }, level: 2, perm: 27, grade: "deputy_chief", ministryCode: "mae", taskPresets: ["management", "validation", "communication"], isRequired: true },
  { code: "chancellor", title: { fr: "Chancelier", en: "Chancellor" }, description: { fr: "Gardien des sceaux et mémoire institutionnelle — gestion du patrimoine, personnel et correspondance diplomatique", en: "Keeper of seals and institutional memory — property, staff and diplomatic correspondence management" }, level: 3, perm: 32, grade: "agent", ministryCode: "tresor_public", taskPresets: ["management", "finance", "system_admin"], isRequired: true },
  { code: "economic_counselor", title: { fr: "Conseiller Économique", en: "Economic Counselor" }, description: { fr: "Intelligence économique, promotion des investissements et diplomatie commerciale", en: "Economic intelligence, investment promotion and commercial diplomacy" }, level: 4, perm: 8, grade: "counselor", ministryCode: "mae", taskPresets: ["consultation", "communication"], isRequired: false },
  { code: "social_counselor", title: { fr: "Conseiller Social", en: "Social Counselor" }, description: { fr: "Suivi de la diaspora, relations avec les partenaires sociaux et politiques publiques du pays hôte", en: "Diaspora monitoring, social partner relations and host country public policies" }, level: 4, perm: 15, grade: "counselor", ministryCode: "mae", taskPresets: ["request_processing", "validation"], isRequired: false },
  { code: "communication_counselor", title: { fr: "Conseiller Communication", en: "Communication Counselor" }, description: { fr: "Image du Gabon, relations presse étrangère et couverture médiatique des visites officielles", en: "Gabon's image, foreign press relations and official visit media coverage" }, level: 4, perm: 8, grade: "counselor", ministryCode: "mae", taskPresets: ["communication", "consultation"], isRequired: false },
  { code: "defense_attache", title: { fr: "Attaché de Défense", en: "Defense Attaché" }, description: { fr: "Officier supérieur — coopération militaire bilatérale et analyse géopolitique", en: "Senior officer — bilateral military cooperation and geopolitical analysis" }, level: 4, perm: 8, grade: "counselor", ministryCode: "defense", taskPresets: ["intelligence", "consultation"], isRequired: false },
  { code: "security_attache", title: { fr: "Attaché de Sécurité", en: "Security Attaché" }, description: { fr: "Sécurité des emprises diplomatiques et liaison avec les services de sécurité locaux", en: "Security of diplomatic premises and liaison with local security services" }, level: 4, perm: 8, grade: "counselor", ministryCode: "interieur", taskPresets: ["intelligence", "consultation"], isRequired: false },
  { code: "first_secretary", title: { fr: "Premier Secrétaire", en: "First Secretary" }, description: { fr: "Instruction des dossiers bilatéraux, veille presse et notes de synthèse", en: "Bilateral file processing, press monitoring and summary reports" }, level: 5, perm: 16, grade: "agent", ministryCode: "mae", taskPresets: ["request_processing", "communication"], isRequired: false },
  { code: "receptionist", title: { fr: "Réceptionniste", en: "Receptionist" }, description: { fr: "Filtrage du public, gestion du standard et premier contact avec les usagers", en: "Public screening, switchboard management and first point of contact" }, level: 6, perm: 9, grade: "external", ministryCode: "mae", taskPresets: ["reception"], isRequired: false },
  { code: "paymaster", title: { fr: "Payeur", en: "Paymaster" }, description: { fr: "Comptable public principal de la Paierie du Gabon — indépendance fonctionnelle vis-à-vis de l'Ambassadeur", en: "Principal public accountant of the Gabon Treasury — functionally independent from the Ambassador" }, level: 7, perm: 6, grade: "agent", ministryCode: "direction_budget", taskPresets: ["finance"], isRequired: false },
];

// ─── CONSULATE positions ────────────────────────────────

export const CONSULATE_POSITIONS: PositionTemplate[] = [
  { code: "consul_general", title: { fr: "Consul Général", en: "Consul General" }, description: { fr: "Chef du poste consulaire — officier d'état civil, notaire public, juge de paix", en: "Head of consular post — civil registrar, public notary, justice of the peace" }, level: 1, perm: 32, grade: "chief", ministryCode: "mae", taskPresets: ["direction", "validation"], isRequired: true },
  { code: "consul", title: { fr: "Consul", en: "Consul" }, description: { fr: "Adjoint au Consul Général ou Chef de poste intermédiaire", en: "Deputy Consul General or intermediate post head" }, level: 2, perm: 30, grade: "deputy_chief", ministryCode: "mae", taskPresets: ["management", "validation", "civil_status"], isRequired: false },
  { code: "vice_consul", title: { fr: "Vice-Consul", en: "Vice Consul" }, description: { fr: "Cheville ouvrière — instruction des dossiers complexes, passeports et visas", en: "Backbone — complex file processing, passports and visas" }, level: 3, perm: 18, grade: "deputy_chief", ministryCode: "mae", taskPresets: ["validation", "request_processing", "civil_status"], isRequired: true },
  { code: "charge_affaires_consulaires", title: { fr: "Chargé d'Affaires Consulaires", en: "Consular Affairs Officer" }, description: { fr: "Gestion opérationnelle des requêtes consulaires", en: "Operational management of consular requests" }, level: 4, perm: 18, grade: "agent", ministryCode: "mae", taskPresets: ["request_processing", "validation", "passports"], isRequired: false },
  { code: "secretary", title: { fr: "Secrétaire", en: "Secretary" }, description: { fr: "Flux documentaire et vérification des pièces d'identité", en: "Document flow and identity verification" }, level: 5, perm: 15, grade: "agent", ministryCode: "mae", taskPresets: ["request_processing", "reception"], isRequired: false },
  { code: "consular_agent", title: { fr: "Agent Consulaire", en: "Consular Agent" }, description: { fr: "Agent polyvalent — traitement des dossiers et enrôlements biométriques", en: "General agent — file processing and biometric enrollment" }, level: 5, perm: 13, grade: "agent", ministryCode: "mae", taskPresets: ["request_processing"], isRequired: true },
  { code: "reception_agent", title: { fr: "Agent d'Accueil", en: "Reception Agent" }, description: { fr: "Orientation des usagers et gestion de l'accueil", en: "User guidance and reception management" }, level: 6, perm: 9, grade: "external", ministryCode: "mae", taskPresets: ["reception"], isRequired: false },
  { code: "intern", title: { fr: "Stagiaire", en: "Intern" }, description: { fr: "Stagiaire en mission d'appui", en: "Support mission intern" }, level: 7, perm: 6, grade: "external", ministryCode: "mae", taskPresets: ["consultation"], isRequired: false },
];

// ─── HONORARY CONSULATE positions ───────────────────────

export const HONORARY_CONSULATE_POSITIONS: PositionTemplate[] = [
  { code: "honorary_consul", title: { fr: "Consul Honoraire", en: "Honorary Consul" }, description: { fr: "Personnalité éminente — diplomatie d'influence et facilitation économique bénévole", en: "Eminent personality — influence diplomacy and voluntary economic facilitation" }, level: 1, perm: 32, grade: "chief", taskPresets: ["direction", "communication"], isRequired: true },
  { code: "assistant", title: { fr: "Assistant", en: "Assistant" }, description: { fr: "Assistant du Consul Honoraire — traitement de la correspondance", en: "Honorary Consul assistant — correspondence handling" }, level: 2, perm: 15, grade: "agent", taskPresets: ["request_processing", "reception"], isRequired: false },
  { code: "admin_agent", title: { fr: "Agent Administratif", en: "Administrative Agent" }, description: { fr: "Agent administratif et d'accueil", en: "Administrative and reception agent" }, level: 3, perm: 11, grade: "external", taskPresets: ["reception", "consultation"], isRequired: false },
];

// ─── HIGH COMMISSION positions ──────────────────────────

export const HIGH_COMMISSION_POSITIONS: PositionTemplate[] = [
  { code: "high_commissioner", title: { fr: "Haut-Commissaire", en: "High Commissioner" }, description: { fr: "Chef de mission — même autorité qu'un Ambassadeur au sein du Commonwealth", en: "Head of mission — same authority as an Ambassador within the Commonwealth" }, level: 1, perm: 34, grade: "chief", taskPresets: ["direction", "intelligence"], isRequired: true },
  { code: "deputy_high_commissioner", title: { fr: "Haut-Commissaire Adjoint", en: "Deputy High Commissioner" }, description: { fr: "Adjoint au Chef — fonctionnellement identique au Premier Conseiller", en: "Deputy Head — functionally identical to First Counselor" }, level: 2, perm: 27, grade: "deputy_chief", taskPresets: ["management", "validation", "communication"], isRequired: true },
  { code: "counselor", title: { fr: "Conseiller", en: "Counselor" }, description: { fr: "Conseiller du Haut-Commissariat", en: "High Commission Counselor" }, level: 3, perm: 25, grade: "counselor", taskPresets: ["management", "consultation"], isRequired: false },
  { code: "economic_counselor", title: { fr: "Conseiller Économique", en: "Economic Counselor" }, description: { fr: "Intelligence économique et facilitation commerciale", en: "Economic intelligence and trade facilitation" }, level: 4, perm: 8, grade: "counselor", taskPresets: ["consultation", "communication"], isRequired: false },
  { code: "chancellor", title: { fr: "Chancelier", en: "Chancellor" }, description: { fr: "Gardien des sceaux — gestion administrative et patrimoine de l'État", en: "Keeper of seals — administrative management and state property" }, level: 3, perm: 32, grade: "agent", taskPresets: ["management", "finance", "system_admin"], isRequired: true },
  { code: "first_secretary", title: { fr: "Premier Secrétaire", en: "First Secretary" }, description: { fr: "Instruction des dossiers et veille de la presse locale", en: "File processing and local press monitoring" }, level: 5, perm: 16, grade: "agent", taskPresets: ["request_processing", "communication"], isRequired: false },
  { code: "consular_section_head", title: { fr: "Chef de Section Consulaire", en: "Consular Section Head" }, description: { fr: "Responsable de la section consulaire intégrée au Haut-Commissariat", en: "Head of consular section integrated within the High Commission" }, level: 4, perm: 18, grade: "agent", taskPresets: ["request_processing", "validation", "civil_status"], isRequired: false },
  { code: "civil_status_officer", title: { fr: "Officier d'État Civil", en: "Civil Status Officer" }, description: { fr: "Habilité à transcrire naissances, mariages et décès des citoyens gabonais", en: "Authorized to transcribe births, marriages and deaths of Gabonese citizens" }, level: 4, perm: 17, grade: "agent", taskPresets: ["civil_status", "request_processing"], isRequired: false },
  { code: "consular_agent", title: { fr: "Agent Consulaire", en: "Consular Agent" }, description: { fr: "Agent polyvalent des services consulaires", en: "General consular services agent" }, level: 5, perm: 13, grade: "agent", taskPresets: ["request_processing"], isRequired: true },
  { code: "receptionist", title: { fr: "Réceptionniste", en: "Receptionist" }, description: { fr: "Accueil du public et gestion du standard", en: "Public reception and switchboard management" }, level: 6, perm: 9, grade: "external", taskPresets: ["reception"], isRequired: false },
  { code: "paymaster", title: { fr: "Payeur", en: "Paymaster" }, description: { fr: "Comptable public de la Paierie du Gabon", en: "Public accountant of the Gabon Treasury" }, level: 7, perm: 6, grade: "agent", taskPresets: ["finance"], isRequired: false },
];

// ─── PERMANENT MISSION positions ────────────────────────

export const PERMANENT_MISSION_POSITIONS: PositionTemplate[] = [
  { code: "permanent_representative", title: { fr: "Représentant Permanent", en: "Permanent Representative" }, description: { fr: "Chef de mission — négociation de résolutions, coalitions de vote et défense des intérêts vitaux", en: "Head of mission — resolution negotiation, voting coalitions and vital interest defense" }, level: 1, perm: 34, grade: "chief", taskPresets: ["direction", "intelligence"], isRequired: true },
  { code: "deputy_representative", title: { fr: "Représentant Permanent Adjoint", en: "Deputy Permanent Representative" }, description: { fr: "Suppléant du Représentant Permanent", en: "Deputy to the Permanent Representative" }, level: 2, perm: 27, grade: "deputy_chief", taskPresets: ["management", "validation", "communication"], isRequired: false },
  { code: "counselor", title: { fr: "Conseiller", en: "Counselor" }, description: { fr: "Diplomate multilatéral — couverture des commissions thématiques (droits de l'homme, désarmement, développement)", en: "Multilateral diplomat — coverage of thematic commissions (human rights, disarmament, development)" }, level: 3, perm: 25, grade: "counselor", taskPresets: ["management", "consultation"], isRequired: true },
  { code: "first_secretary", title: { fr: "Premier Secrétaire", en: "First Secretary" }, description: { fr: "Couverture quotidienne des réunions de travail techniques", en: "Daily coverage of technical working meetings" }, level: 4, perm: 16, grade: "agent", taskPresets: ["request_processing", "communication"], isRequired: false },
  { code: "second_secretary", title: { fr: "Deuxième Secrétaire", en: "Second Secretary" }, description: { fr: "Suivi des sous-commissions et groupes de travail", en: "Monitoring of sub-commissions and working groups" }, level: 5, perm: 13, grade: "agent", taskPresets: ["request_processing"], isRequired: false },
  { code: "attache", title: { fr: "Attaché", en: "Attaché" }, description: { fr: "Couverture des réunions techniques et rédaction de comptes rendus", en: "Technical meeting coverage and report drafting" }, level: 5, perm: 14, grade: "agent", taskPresets: ["request_processing", "consultation"], isRequired: false },
  { code: "chancellor", title: { fr: "Chancelier", en: "Chancellor" }, description: { fr: "Gardien des sceaux — gestion administrative et patrimoine de l'État", en: "Keeper of seals — administrative management and state property" }, level: 3, perm: 32, grade: "agent", taskPresets: ["management", "finance", "system_admin"], isRequired: true },
  { code: "receptionist", title: { fr: "Réceptionniste", en: "Receptionist" }, description: { fr: "Accueil du public et gestion du standard", en: "Public reception and switchboard management" }, level: 6, perm: 9, grade: "external", taskPresets: ["reception"], isRequired: false },
  { code: "paymaster", title: { fr: "Payeur", en: "Paymaster" }, description: { fr: "Comptable public de la Paierie du Gabon", en: "Public accountant of the Gabon Treasury" }, level: 7, perm: 6, grade: "agent", taskPresets: ["finance"], isRequired: false },
];

// ═══════════════════════════════════════════════════════════════
// ORGANIZATION TEMPLATES — Presets per org type
// Uses OrganizationType enum from constants.ts
// ═══════════════════════════════════════════════════════════════

export type OrgTemplateType = OrganizationType | "custom";

export interface OrganizationTemplate {
  type: OrgTemplateType;
  label: LocalizedString;
  description: LocalizedString;
  /** Lucide icon name */
  icon: string;
  positions: PositionTemplate[];
  ministryGroups?: MinistryGroupTemplate[];
  /** Default modules activated for this org type */
  modules: ModuleCodeValue[];
  /**
   * Sous-templates indexés par discriminator (ex: ministrySubType).
   * Quand renseigné, l'appelant doit choisir un sous-template via
   * `getOrgTemplate(type, subType)` qui retourne le sous-template fusionné
   * sur le template parent. Permet de partager la coquille (label, icon)
   * tout en variant positions/modules selon le sous-type.
   */
  subTemplates?: Record<string, {
    label: LocalizedString;
    description?: LocalizedString;
    icon?: string;
    positions: PositionTemplate[];
    ministryGroups?: MinistryGroupTemplate[];
    modules: ModuleCodeValue[];
  }>;
}

// ─── Default module sets per org type ────────────────────

/** All modules — for full diplomatic posts */
const ALL_MODULES: ModuleCodeValue[] = [...ALL_MODULE_CODES];

/** Core + consular + community + payments + news + messaging + statistics — for consulates */
const CONSULATE_MODULES: ModuleCodeValue[] = [
  ...CORE_MODULE_CODES,
  ModuleCode.consular_affairs,
  ModuleCode.community,
  ModuleCode.payments,
  ModuleCode.news,
  ModuleCode.messaging,
  ModuleCode.statistics,
];

/** Core + news + messaging — for honorary consulates */
const HONORARY_MODULES: ModuleCodeValue[] = [
  ...CORE_MODULE_CODES,
  ModuleCode.news,
  ModuleCode.messaging,
];

/** Core + community + news + messaging + statistics — for permanent missions */
const MISSION_MODULES: ModuleCodeValue[] = [
  ...CORE_MODULE_CODES,
  ModuleCode.community,
  ModuleCode.news,
  ModuleCode.messaging,
  ModuleCode.statistics,
];

/**
 * Modules pré-activés pour le Ministère des Affaires Étrangères.
 * Pilotage local (l'activité propre du ministère) + supervision réseau (vue
 * agrégée sur les organismes rattachés via parentOrgId).
 *
 * Volontairement absents : consular_affairs, payments, profile (irrelevants
 * pour un ministère qui n'exécute pas l'opérationnel terrain).
 */
const MINISTRY_FOREIGN_AFFAIRS_MODULES: ModuleCodeValue[] = [
  // Pilotage local
  ModuleCode.diplomatic_affairs,
  ModuleCode.correspondence,
  ModuleCode.documents,
  ModuleCode.calendar,
  ModuleCode.messaging,
  ModuleCode.news,
  ModuleCode.team,
  ModuleCode.statistics,
  ModuleCode.settings,
  // Supervision réseau (exclusifs ministry)
  ModuleCode.network_diplomatic_oversight,
  ModuleCode.network_correspondence_oversight,
  ModuleCode.network_intelligence,
  // Renseignement diplomatique (cloisonné, ministry-only)
  ModuleCode.intelligence,
];

// ─── MINISTRY (foreign_affairs) positions ───────────────────
//
// Liste étendue : Cabinet (ministre, dircab, conseillers, secrétariat)
// + Direction générale (SG, IG) + 8 directions métier. Tous les membres
// du cabinet et du SG portent le preset `network_supervision` en plus
// de leur preset principal — ils ont besoin de la vue réseau pour piloter.

export const MINISTRY_FOREIGN_AFFAIRS_POSITIONS: PositionTemplate[] = [
  // ── Cabinet ──
  { code: "minister", title: { fr: "Ministre", en: "Minister" }, description: { fr: "Membre du Gouvernement — direction politique et arbitrage final", en: "Member of Government — political leadership and final arbitration" }, level: 1, perm: 40, grade: "chief", ministryCode: "cabinet", taskPresets: ["ministry_cabinet", "network_supervision", "intelligence_services"], isRequired: true },
  { code: "chief_of_staff", title: { fr: "Directeur de cabinet", en: "Chief of Staff" }, description: { fr: "Coordination du cabinet et arbitrage administratif", en: "Cabinet coordination and administrative arbitration" }, level: 2, perm: 32, grade: "deputy_chief", ministryCode: "cabinet", taskPresets: ["ministry_cabinet", "network_supervision", "intelligence_services"], isRequired: true },
  { code: "technical_advisor", title: { fr: "Conseiller technique", en: "Technical Advisor" }, description: { fr: "Conseil thématique au Ministre (multiple)", en: "Thematic advisory to the Minister (multiple)" }, level: 3, perm: 22, grade: "counselor", ministryCode: "cabinet", taskPresets: ["ministry_direction", "network_supervision"], isRequired: false },
  { code: "private_secretary", title: { fr: "Secrétaire particulier·ère", en: "Private Secretary" }, description: { fr: "Agenda, correspondance personnelle et coordination quotidienne du Ministre", en: "Schedule, personal correspondence and daily coordination for the Minister" }, level: 4, perm: 18, grade: "agent", ministryCode: "cabinet", taskPresets: ["ministry_direction"], isRequired: false },
  { code: "mission_officer", title: { fr: "Chargé·e de mission", en: "Mission Officer" }, description: { fr: "Dossiers ad hoc et missions spéciales (multiple)", en: "Ad-hoc files and special missions (multiple)" }, level: 4, perm: 16, grade: "agent", ministryCode: "cabinet", taskPresets: ["ministry_direction"], isRequired: false },
  { code: "press_attache", title: { fr: "Attaché·e de presse", en: "Press Attaché" }, description: { fr: "Relations presse, communiqués et image du ministère", en: "Press relations, communiqués and ministry image" }, level: 4, perm: 16, grade: "agent", ministryCode: "cabinet", taskPresets: ["ministry_direction"], isRequired: false },

  // ── Direction générale ──
  { code: "secretary_general", title: { fr: "Secrétaire Général", en: "Secretary General" }, description: { fr: "Première autorité administrative — coordination des directions et continuité du service", en: "Highest administrative authority — coordination of departments and service continuity" }, level: 2, perm: 30, grade: "deputy_chief", ministryCode: "secretariat_general", taskPresets: ["ministry_cabinet", "network_supervision", "intelligence_services"], isRequired: true },
  { code: "inspector_general", title: { fr: "Inspecteur Général", en: "Inspector General" }, description: { fr: "Audit interne, contrôle de conformité et inspection du réseau", en: "Internal audit, compliance control and network inspection" }, level: 2, perm: 28, grade: "deputy_chief", ministryCode: "inspection_generale", taskPresets: ["ministry_direction", "network_supervision", "intelligence_services"], isRequired: false },

  // ── Directions métier ──
  { code: "dir_consular_affairs", title: { fr: "Directeur des Affaires Consulaires", en: "Director of Consular Affairs" }, description: { fr: "Pivot supervision réseau consulaire — politiques consulaires et accompagnement des postes", en: "Consular network supervision pivot — consular policies and post support" }, level: 3, perm: 25, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction", "network_supervision"], isRequired: true },
  { code: "dir_political_affairs", title: { fr: "Directeur des Affaires Politiques", en: "Director of Political Affairs" }, description: { fr: "Relations bilatérales et multilatérales, analyse géopolitique", en: "Bilateral and multilateral relations, geopolitical analysis" }, level: 3, perm: 25, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction", "network_supervision", "intelligence_services"], isRequired: false },
  { code: "dir_economic_cooperation", title: { fr: "Directeur des Affaires Économiques et Coopération", en: "Director of Economic Affairs and Cooperation" }, description: { fr: "Pilote du pipeline de coopération diplomatique et facilitation économique", en: "Diplomatic cooperation pipeline lead and economic facilitation" }, level: 3, perm: 25, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction", "network_supervision"], isRequired: true },
  { code: "dir_legal_affairs", title: { fr: "Directeur des Affaires Juridiques", en: "Director of Legal Affairs" }, description: { fr: "Conformité juridique des actes diplomatiques et conventions", en: "Legal compliance of diplomatic acts and conventions" }, level: 3, perm: 22, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction"], isRequired: false },
  { code: "dir_protocol", title: { fr: "Directeur du Protocole", en: "Director of Protocol" }, description: { fr: "Protocole d'État, visites officielles et cérémonies", en: "State protocol, official visits and ceremonies" }, level: 3, perm: 20, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction"], isRequired: false },
  { code: "dir_human_resources", title: { fr: "Directeur des Ressources Humaines", en: "Director of Human Resources" }, description: { fr: "Gestion du personnel diplomatique, mutations et concours", en: "Diplomatic staff management, transfers and competitive examinations" }, level: 3, perm: 22, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction"], isRequired: false },
  { code: "dir_administration_finance", title: { fr: "Directeur Administratif et Financier", en: "Director of Administration and Finance" }, description: { fr: "Budget du ministère, marchés et logistique", en: "Ministry budget, procurement and logistics" }, level: 3, perm: 22, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction"], isRequired: false },
  { code: "dir_communication", title: { fr: "Directeur de la Communication", en: "Director of Communication" }, description: { fr: "Stratégie de communication institutionnelle et image du Gabon à l'étranger", en: "Institutional communication strategy and Gabon's image abroad" }, level: 3, perm: 20, grade: "counselor", ministryCode: "directions", taskPresets: ["ministry_direction"], isRequired: false },
];

// ─── HIGH REPRESENTATION positions (same as Embassy with elevated chief title) ─

export const HIGH_REPRESENTATION_POSITIONS: PositionTemplate[] = [
  { code: "high_representative", title: { fr: "Ambassadeur Haut Représentant", en: "Ambassador High Representative" }, description: { fr: "Ambassadeur Haut Représentant — densité exceptionnelle des relations bilatérales (ex: France, Maroc)", en: "Ambassador High Representative — exceptional density of bilateral relations (e.g. France, Morocco)" }, level: 1, perm: 34, grade: "chief", ministryCode: "presidence", taskPresets: ["direction", "intelligence"], isRequired: true },
  ...EMBASSY_POSITIONS.filter(p => p.code !== "ambassador"),
];

export const ORGANIZATION_TEMPLATES: OrganizationTemplate[] = [
  {
    type: OrganizationType.Embassy,
    label: { fr: "Ambassade", en: "Embassy" },
    description: { fr: "Représentation diplomatique bilatérale — vaisseau amiral de la projection extérieure", en: "Bilateral diplomatic representation — flagship of external projection" },
    icon: "Landmark",
    positions: EMBASSY_POSITIONS,
    ministryGroups: EMBASSY_MINISTRY_GROUPS,
    modules: ALL_MODULES,
  },
  {
    type: OrganizationType.HighRepresentation,
    label: { fr: "Haute Représentation", en: "High Representation" },
    description: { fr: "Ambassade élevée pour relations bilatérales d'une densité exceptionnelle", en: "Elevated embassy for bilateral relations of exceptional density" },
    icon: "Star",
    positions: HIGH_REPRESENTATION_POSITIONS,
    ministryGroups: EMBASSY_MINISTRY_GROUPS,
    modules: ALL_MODULES,
  },
  {
    type: OrganizationType.GeneralConsulate,
    label: { fr: "Consulat Général", en: "General Consulate" },
    description: { fr: "Poste consulaire de première catégorie — état civil, visas, protection consulaire et encadrement des élections", en: "First-class consular post — civil status, visas, consular protection and elections management" },
    icon: "Building",
    positions: CONSULATE_POSITIONS,
    ministryGroups: CONSULATE_MINISTRY_GROUPS,
    modules: CONSULATE_MODULES,
  },
  {
    type: OrganizationType.PermanentMission,
    label: { fr: "Mission Permanente", en: "Permanent Mission" },
    description: { fr: "Instrument de la diplomatie multilatérale — ONU, UA, UE, UNESCO", en: "Instrument of multilateral diplomacy — UN, AU, EU, UNESCO" },
    icon: "Globe",
    positions: PERMANENT_MISSION_POSITIONS,
    modules: MISSION_MODULES,
  },
  {
    type: OrganizationType.HighCommission,
    label: { fr: "Haut-Commissariat", en: "High Commission" },
    description: { fr: "Calque institutionnel de l'Ambassade au sein du Commonwealth — intègre les fonctions consulaires", en: "Institutional copy of the Embassy within the Commonwealth — integrates consular functions" },
    icon: "Crown",
    positions: HIGH_COMMISSION_POSITIONS,
    modules: ALL_MODULES,
  },
  {
    type: OrganizationType.ThirdParty,
    label: { fr: "Partenaire Tiers", en: "Third Party" },
    description: { fr: "Organisation partenaire externe", en: "External partner organization" },
    icon: "Handshake",
    positions: [],
    modules: [...CORE_MODULE_CODES],
  },
  {
    type: OrganizationType.Ministry,
    label: { fr: "Ministère", en: "Ministry" },
    description: { fr: "Tutelle gouvernementale — chapeaute les organismes rattachés via parentOrgId", en: "Government oversight body — supervises subordinate orgs via parentOrgId" },
    icon: "Landmark",
    // Le template top-level reste vide ; chaque sous-type fournit ses positions/modules.
    positions: [],
    modules: [...CORE_MODULE_CODES],
    subTemplates: {
      [MinistrySubType.ForeignAffairs]: {
        label: { fr: "Affaires Étrangères", en: "Foreign Affairs" },
        description: { fr: "Ministère des Affaires Étrangères — pilote du réseau diplomatique gabonais", en: "Ministry of Foreign Affairs — Gabonese diplomatic network steward" },
        icon: "Globe",
        positions: MINISTRY_FOREIGN_AFFAIRS_POSITIONS,
        ministryGroups: MINISTRY_FOREIGN_AFFAIRS_GROUPS,
        modules: MINISTRY_FOREIGN_AFFAIRS_MODULES,
      },
    },
  },
  {
    type: "custom",
    label: { fr: "Personnalisé", en: "Custom" },
    description: { fr: "Configuration entièrement personnalisée", en: "Fully custom configuration" },
    icon: "Settings",
    positions: [],
    modules: [...CORE_MODULE_CODES],
  },
];

// ═══════════════════════════════════════════════════════════════
// AUTO-POPULATE moduleAccess FROM taskPresets
// Chaque template de position hérite automatiquement d'un profil
// moduleAccess dérivé de ses presets, sauf si déjà défini.
// ═══════════════════════════════════════════════════════════════

function populateModuleAccess(positions: PositionTemplate[]): void {
  for (const pos of positions) {
    if (!pos.moduleAccess && pos.taskPresets.length > 0) {
      pos.moduleAccess = resolveModuleAccessFromPresets(pos.taskPresets);
    }
  }
}

// Peupler toutes les listes de positions
populateModuleAccess(EMBASSY_POSITIONS);
populateModuleAccess(CONSULATE_POSITIONS);
populateModuleAccess(HONORARY_CONSULATE_POSITIONS);
populateModuleAccess(HIGH_COMMISSION_POSITIONS);
populateModuleAccess(PERMANENT_MISSION_POSITIONS);
populateModuleAccess(HIGH_REPRESENTATION_POSITIONS);
populateModuleAccess(MINISTRY_FOREIGN_AFFAIRS_POSITIONS);

// ═══════════════════════════════════════════════════════════════
// TASK CATEGORY METADATA (icons + labels for UI)
// ═══════════════════════════════════════════════════════════════

import type { TaskCategory } from "./taskCodes";
export type { TaskCategory };

export const TASK_CATEGORY_META: Record<TaskCategory, { label: LocalizedString; icon: string }> = {
  requests: { label: { fr: "Demandes", en: "Requests" }, icon: "FileEdit" },
  documents: { label: { fr: "Documents", en: "Documents" }, icon: "FileText" },
  appointments: { label: { fr: "Rendez-vous", en: "Appointments" }, icon: "CalendarDays" },
  profiles: { label: { fr: "Profils", en: "Profiles" }, icon: "User" },
  citizen_profiles: { label: { fr: "Profils citoyens", en: "Citizen Profiles" }, icon: "Crown" },
  civil_status: { label: { fr: "État civil", en: "Civil status" }, icon: "ScrollText" },
  passports: { label: { fr: "Passeports", en: "Passports" }, icon: "BookOpen" },
  visas: { label: { fr: "Visas", en: "Visas" }, icon: "Stamp" },
  finance: { label: { fr: "Finances", en: "Finance" }, icon: "Wallet" },
  communication: { label: { fr: "Communication", en: "Communication" }, icon: "Megaphone" },
  team: { label: { fr: "Équipe", en: "Team" }, icon: "Users" },
  settings: { label: { fr: "Paramètres", en: "Settings" }, icon: "Settings" },
  org: { label: { fr: "Organisation", en: "Organization" }, icon: "Building" },
  schedules: { label: { fr: "Plannings", en: "Schedules" }, icon: "Calendar" },
  analytics: { label: { fr: "Statistiques", en: "Analytics" }, icon: "BarChart3" },
  statistics: { label: { fr: "Statistiques", en: "Statistics" }, icon: "LineChart" },
  intelligence: { label: { fr: "Renseignement", en: "Intelligence" }, icon: "ShieldAlert" },
  // Consular services
  consular_registrations: { label: { fr: "Immatriculations", en: "Consular Registrations" }, icon: "ClipboardList" },
  consular_notifications: { label: { fr: "Signalements", en: "Consular Notifications" }, icon: "Bell" },
  consular_cards: { label: { fr: "Cartes consulaires", en: "Consular Cards" }, icon: "CreditCard" },
  // Community
  community_events: { label: { fr: "Événements communautaires", en: "Community Events" }, icon: "CalendarHeart" },
  // Payments
  payments: { label: { fr: "Paiements", en: "Payments" }, icon: "Banknote" },
  // Chat peer-to-peer
  chats: { label: { fr: "Messagerie", en: "Messaging" }, icon: "MessageSquare" },
  // Meetings & Calls
  meetings: { label: { fr: "Réunions & Appels", en: "Meetings & Calls" }, icon: "Video" },
  // Correspondance & Dossiers
  correspondance: { label: { fr: "Correspondance & Dossiers", en: "Correspondence & Procedures" }, icon: "Mail" },
  // Sprint 6 — Centre d'Appels
  notifications: { label: { fr: "Notifications", en: "Notifications" }, icon: "Bell" },
  voicemails: { label: { fr: "Messagerie vocale", en: "Voicemail" }, icon: "Voicemail" },
  callRecordings: { label: { fr: "Enregistrements d'appels", en: "Call Recordings" }, icon: "Disc" },
  // AI Assistant Proactif
  ai_assistant: { label: { fr: "Assistant IA", en: "AI Assistant" }, icon: "Sparkles" },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Get a task preset by code */
export function getTaskPreset(code: string): TaskPresetDefinition | undefined {
  return POSITION_TASK_PRESETS.find((m) => m.code === code);
}

/** Get all tasks for a position template (union of all its presets) */
export function getPresetTasks(presetCodes: string[]): TaskCodeValue[] {
  const taskSet = new Set<TaskCodeValue>();
  for (const code of presetCodes) {
    const preset = getTaskPreset(code);
    if (preset) {
      for (const task of preset.tasks) {
        taskSet.add(task);
      }
    }
  }
  return Array.from(taskSet);
}

/** Get template by org type */
export function getOrgTemplate(type: OrgTemplateType): OrganizationTemplate | undefined {
  return ORGANIZATION_TEMPLATES.find((t) => t.type === type);
}

/**
 * Résout le template effectif pour un type d'organisme donné, en sélectionnant
 * le bon sous-template si applicable (ex: ministry × foreign_affairs).
 * Retourne `{ positions, modules, ministryGroups }` prêts à instancier.
 *
 * Si `subTemplates` est défini sur le template parent et que `subType` est
 * fourni, le sous-template gagne. Sinon retourne les valeurs du parent.
 */
export function resolveOrgTemplate(
  type: OrgTemplateType,
  subType?: string,
): { positions: PositionTemplate[]; modules: ModuleCodeValue[]; ministryGroups?: MinistryGroupTemplate[] } | undefined {
  const tpl = getOrgTemplate(type);
  if (!tpl) return undefined;

  if (subType && tpl.subTemplates?.[subType]) {
    const sub = tpl.subTemplates[subType];
    return {
      positions: sub.positions,
      modules: sub.modules,
      ministryGroups: sub.ministryGroups,
    };
  }

  return {
    positions: tpl.positions,
    modules: tpl.modules,
    ministryGroups: tpl.ministryGroups,
  };
}

// ═══════════════════════════════════════════════════════════════
// TASK CATALOG — Enriched flat array for UI
// ═══════════════════════════════════════════════════════════════

import { ALL_TASK_CODES, TASK_RISK, type TaskRisk } from "./taskCodes";

/** Full task definition for UI display */
export interface TaskDefinition {
  code: TaskCodeValue;
  category: TaskCategory;
  risk: TaskRisk;
  label: LocalizedString;
}

/** Enriched flat array of all tasks with category metadata for UI */
export const TASK_CATALOG: TaskDefinition[] = ALL_TASK_CODES.map((code) => {
  const category = code.split(".")[0] as TaskCategory;
  const meta = TASK_CATEGORY_META[category];
  return {
    code,
    category,
    risk: TASK_RISK[code],
    label: meta?.label ?? { fr: code, en: code },
  };
});

/** Group tasks by category */
export function getTasksByCategory(): Record<string, TaskDefinition[]> {
  const grouped: Record<string, TaskDefinition[]> = {};
  for (const task of TASK_CATALOG) {
    if (!grouped[task.category]) grouped[task.category] = [];
    grouped[task.category].push(task);
  }
  return grouped;
}

/** Get all task definitions for a position template (from its presets) */
export function getPositionTasks(position: PositionTemplate): TaskDefinition[] {
  const taskCodes = getPresetTasks(position.taskPresets);
  return taskCodes
    .map((code) => TASK_CATALOG.find((t) => t.code === code))
    .filter((t): t is TaskDefinition => t !== undefined);
}
