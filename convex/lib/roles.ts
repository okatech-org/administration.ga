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

import { OrganizationType } from "./constants";
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
    ma(ModuleCode.requests, "reader"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.appointments, "editor"),
    ma(ModuleCode.profiles, "admin"),
    ma(ModuleCode.consular_registrations, "reader"),
    ma(ModuleCode.civil_status, "reader"),
    ma(ModuleCode.passports, "reader"),
    ma(ModuleCode.visas, "reader"),
    ma(ModuleCode.intelligence, "admin"),
    ma(ModuleCode.digital_mail, "editor"),
    ma(ModuleCode.correspondance, "admin"),
    ma(ModuleCode.meetings, "editor"),
    ma(ModuleCode.communication, "admin"),
    ma(ModuleCode.team, "admin"),
    ma(ModuleCode.finance, "reader"),
    ma(ModuleCode.analytics, "admin"),
    ma(ModuleCode.statistics, "admin"),
    ma(ModuleCode.settings, "admin"),
  ],
  management: [
    ma(ModuleCode.requests, "admin"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.appointments, "editor"),
    ma(ModuleCode.profiles, "editor"),
    ma(ModuleCode.consular_registrations, "admin"),
    ma(ModuleCode.civil_status, "admin"),
    ma(ModuleCode.passports, "admin"),
    ma(ModuleCode.visas, "admin"),
    ma(ModuleCode.digital_mail, "editor"),
    ma(ModuleCode.correspondance, "editor"),
    ma(ModuleCode.meetings, "editor"),
    ma(ModuleCode.communication, "editor"),
    ma(ModuleCode.team, "editor"),
    ma(ModuleCode.finance, "editor"),
    ma(ModuleCode.analytics, "reader"),
    ma(ModuleCode.statistics, "reader"),
  ],
  request_processing: [
    ma(ModuleCode.requests, "editor"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.appointments, "editor"),
    ma(ModuleCode.profiles, "reader"),
    ma(ModuleCode.consular_registrations, "editor"),
    ma(ModuleCode.digital_mail, "editor"),
  ],
  validation: [
    ma(ModuleCode.requests, "editor"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.profiles, "reader"),
    ma(ModuleCode.consular_registrations, "reader"),
  ],
  civil_status: [
    ma(ModuleCode.civil_status, "admin"),
    ma(ModuleCode.requests, "editor"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.profiles, "reader"),
  ],
  passports: [
    ma(ModuleCode.passports, "admin"),
    ma(ModuleCode.requests, "editor"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.profiles, "reader"),
    ma(ModuleCode.appointments, "reader"),
  ],
  visas: [
    ma(ModuleCode.visas, "admin"),
    ma(ModuleCode.requests, "editor"),
    ma(ModuleCode.documents, "editor"),
    ma(ModuleCode.profiles, "reader"),
    ma(ModuleCode.appointments, "reader"),
  ],
  finance: [
    ma(ModuleCode.finance, "admin"),
    ma(ModuleCode.analytics, "editor"),
    ma(ModuleCode.statistics, "reader"),
  ],
  communication: [
    ma(ModuleCode.communication, "editor"),
    ma(ModuleCode.analytics, "reader"),
  ],
  reception: [
    ma(ModuleCode.requests, "reader"),
    ma(ModuleCode.appointments, "editor"),
    ma(ModuleCode.profiles, "reader"),
    ma(ModuleCode.digital_mail, "reader"),
    ma(ModuleCode.meetings, "reader"),
  ],
  consultation: [
    ma(ModuleCode.requests, "reader"),
    ma(ModuleCode.documents, "reader"),
    ma(ModuleCode.appointments, "reader"),
    ma(ModuleCode.profiles, "reader"),
    ma(ModuleCode.analytics, "reader"),
    ma(ModuleCode.digital_mail, "reader"),
  ],
  intelligence: [
    ma(ModuleCode.intelligence, "editor"),
    ma(ModuleCode.profiles, "reader"),
  ],
  system_admin: [
    ma(ModuleCode.settings, "admin"),
    ma(ModuleCode.team, "admin"),
    ma(ModuleCode.analytics, "admin"),
    ma(ModuleCode.statistics, "reader"),
  ],
  meetings: [
    ma(ModuleCode.meetings, "admin"),
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
}

// ─── Default module sets per org type ────────────────────

/** All modules — for full diplomatic posts */
const ALL_MODULES: ModuleCodeValue[] = [...ALL_MODULE_CODES];

/** Core + consular + finance + communication + admin — for consulates */
const CONSULATE_MODULES: ModuleCodeValue[] = [
  ...CORE_MODULE_CODES,
  ModuleCode.consular_registrations,
  ModuleCode.consular_notifications,
  ModuleCode.consular_cards,
  ModuleCode.civil_status,
  ModuleCode.passports,
  ModuleCode.visas,
  ModuleCode.associations,
  ModuleCode.companies,
  ModuleCode.community_events,
  ModuleCode.finance,
  ModuleCode.payments,
  ModuleCode.communication,
  ModuleCode.digital_mail,
  ModuleCode.meetings,
  ModuleCode.analytics,
  ModuleCode.statistics,
];

/** Core + communication — for honorary consulates */
const HONORARY_MODULES: ModuleCodeValue[] = [
  ...CORE_MODULE_CODES,
  ModuleCode.communication,
  ModuleCode.meetings,
];

/** Core + community + communication + admin — for permanent missions */
const MISSION_MODULES: ModuleCodeValue[] = [
  ...CORE_MODULE_CODES,
  ModuleCode.associations,
  ModuleCode.companies,
  ModuleCode.community_events,
  ModuleCode.communication,
  ModuleCode.digital_mail,
  ModuleCode.meetings,
  ModuleCode.analytics,
  ModuleCode.statistics,
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
  // Digital Mail
  digital_mail: { label: { fr: "Courrier numérique", en: "Digital Mail" }, icon: "Mail" },
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
