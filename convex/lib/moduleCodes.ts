/**
 * ═══════════════════════════════════════════════════════════════
 * MODULE CODES — Single source of truth for application features
 * ═══════════════════════════════════════════════════════════════
 *
 * 13 canonical top-level modules, aligned with the agent navigation.
 * Each module = one entry in the sidebar. Sub-domains live as
 * `capabilities` of the parent module.
 *
 * Canonical codes are in English, snake_case for multi-word.
 * Display labels stay branded (iProfil, iDocument, iAgenda, iCom…).
 */

import { v } from "convex/values";
import type { LocalizedString } from "./validators";

// ═══════════════════════════════════════════════════════════════
// MODULE CODES — the 13 top-level modules
// ═══════════════════════════════════════════════════════════════

export const ModuleCode = {
  // Operations
  profile: "profile",
  diplomatic_affairs: "diplomatic_affairs",
  consular_affairs: "consular_affairs",
  news: "news",
  community: "community",

  // iBureau
  correspondence: "correspondence",
  documents: "documents",
  calendar: "calendar",
  messaging: "messaging",

  // Gestion
  team: "team",
  payments: "payments",
  statistics: "statistics",

  // Administration
  settings: "settings",
} as const;

export type ModuleCodeValue = (typeof ModuleCode)[keyof typeof ModuleCode];

/** All canonical module codes as a flat array. */
export const ALL_MODULE_CODES: ModuleCodeValue[] = Object.values(ModuleCode);

// ═══════════════════════════════════════════════════════════════
// MODULE CATEGORIES — match sidebar sections
// ═══════════════════════════════════════════════════════════════

export type ModuleCategory =
  | "operations"
  | "ibureau"
  | "gestion"
  | "administration";

// ═══════════════════════════════════════════════════════════════
// MODULE ACCESS LEVELS — Granular permission tiers
// ═══════════════════════════════════════════════════════════════

/**
 * Access levels for module attribution:
 * - reader: Consultation seule (tâches *.view)
 * - editor: Lecture + actions métier (*.create, *.process, *.manage, etc.)
 * - admin:  Éditeur + peut attribuer le module à d'autres utilisateurs
 */
export type ModuleAccessLevel = "reader" | "editor" | "admin";
export const ALL_ACCESS_LEVELS: ModuleAccessLevel[] = ["reader", "editor", "admin"];

export const ACCESS_LEVEL_META: Record<ModuleAccessLevel, {
  label: LocalizedString;
  description: LocalizedString;
  icon: string;
  color: string;
  level: number;
}> = {
  reader: {
    label: { fr: "Lecture", en: "Read" },
    description: { fr: "Consultation des données uniquement", en: "View data only" },
    icon: "Eye",
    color: "text-blue-500",
    level: 1,
  },
  editor: {
    label: { fr: "Éditeur", en: "Editor" },
    description: { fr: "Lecture + actions et tâches du module", en: "Read + module actions and tasks" },
    icon: "PenLine",
    color: "text-amber-500",
    level: 2,
  },
  admin: {
    label: { fr: "Admin", en: "Admin" },
    description: { fr: "Éditeur + peut attribuer le module à d'autres", en: "Editor + can assign module to others" },
    icon: "ShieldCheck",
    color: "text-emerald-500",
    level: 3,
  },
};

export function accessLevelIncludes(userLevel: ModuleAccessLevel, requiredLevel: ModuleAccessLevel): boolean {
  return ACCESS_LEVEL_META[userLevel].level >= ACCESS_LEVEL_META[requiredLevel].level;
}

export const accessLevelValidator = v.union(
  v.literal("reader"),
  v.literal("editor"),
  v.literal("admin"),
);

export type ModuleAccessMap = Partial<Record<ModuleCodeValue, ModuleAccessLevel>>;

// ═══════════════════════════════════════════════════════════════
// CONVEX VALIDATOR — canonical + legacy literals (transition)
// ═══════════════════════════════════════════════════════════════
//
// Le validator accepte les 13 codes canoniques (nouvelles écritures) ET
// les codes legacy encore présents en base avant que la migration
// `internal.migrations.normalizeModuleCodes.run` n'ait tourné en prod.
// Une fois la migration lancée et vérifiée, narrow ce validator aux
// 13 canoniques uniquement.

export const moduleCodeValidator = v.union(
  // Canonical (13)
  v.literal("profile"),
  v.literal("diplomatic_affairs"),
  v.literal("consular_affairs"),
  v.literal("news"),
  v.literal("community"),
  v.literal("correspondence"),
  v.literal("documents"),
  v.literal("calendar"),
  v.literal("messaging"),
  v.literal("team"),
  v.literal("payments"),
  v.literal("statistics"),
  v.literal("settings"),
  // Legacy — encore en base avant migration prod
  v.literal("iprofil"),
  v.literal("intelligence"),
  v.literal("requests"),
  v.literal("communication"),
  v.literal("correspondance"),
  v.literal("appointments"),
  v.literal("passports"),
  v.literal("visas"),
  v.literal("civil_status"),
  v.literal("consular_registrations"),
  v.literal("consular_notifications"),
  v.literal("consular_cards"),
  v.literal("cv"),
  v.literal("tutorials"),
  v.literal("associations"),
  v.literal("companies"),
  v.literal("community_events"),
  v.literal("meetings"),
  v.literal("ai_assistant"),
  v.literal("roles"),
  v.literal("permissions"),
  v.literal("profiles"),
  v.literal("citizen_profiles"),
  v.literal("finance"),
  v.literal("analytics"),
  v.literal("monitoring"),
  v.literal("org_config"),
  v.literal("services_config"),
  v.literal("platform_settings"),
  v.literal("digital_mail"),
);

// ═══════════════════════════════════════════════════════════════
// MODULE REGISTRY — keyed by canonical code
// ═══════════════════════════════════════════════════════════════

export interface CapabilityDefinition {
  code: string;
  label: LocalizedString;
}

export interface ModuleDefinition {
  code: ModuleCodeValue;
  label: LocalizedString;
  description: LocalizedString;
  icon: string;
  color: string;
  category: ModuleCategory;
  isCore: boolean;
  capabilities?: CapabilityDefinition[];
}

export const MODULE_REGISTRY: Record<ModuleCodeValue, ModuleDefinition> = {
  // ─── Operations ───────────────────────────────────────────
  profile: {
    code: "profile",
    label: { fr: "iProfil", en: "iProfil" },
    description: {
      fr: "Profil métier et accréditations diplomatiques",
      en: "Professional profile and diplomatic credentials",
    },
    icon: "UserCircle",
    color: "text-violet-500",
    category: "operations",
    isCore: true,
    capabilities: [
      { code: "accreditations", label: { fr: "Accréditations", en: "Accreditations" } },
      { code: "mission", label: { fr: "Mission", en: "Mission" } },
    ],
  },
  diplomatic_affairs: {
    code: "diplomatic_affairs",
    label: { fr: "Affaires Diplomatiques", en: "Diplomatic Affairs" },
    description: {
      fr: "Pipeline diplomatique, briefings, opérateurs cibles, CV",
      en: "Diplomatic pipeline, briefings, target operators, CVs",
    },
    icon: "ShieldAlert",
    color: "text-red-500",
    category: "operations",
    isCore: false,
    capabilities: [
      { code: "targets", label: { fr: "Opérateurs cibles", en: "Target operators" } },
      { code: "pipeline", label: { fr: "Pipeline", en: "Pipeline" } },
      { code: "briefings", label: { fr: "Briefings", en: "Briefings" } },
      { code: "cv", label: { fr: "CV diplomatiques", en: "Diplomatic CVs" } },
    ],
  },
  consular_affairs: {
    code: "consular_affairs",
    label: { fr: "Affaires Consulaires", en: "Consular Affairs" },
    description: {
      fr: "Demandes, profils citoyens, registre, passeports, visas, état civil, cartes consulaires",
      en: "Requests, citizen profiles, registry, passports, visas, civil status, consular cards",
    },
    icon: "FileEdit",
    color: "text-emerald-500",
    category: "operations",
    isCore: true,
    capabilities: [
      { code: "requests", label: { fr: "Demandes", en: "Requests" } },
      { code: "passports", label: { fr: "Passeports", en: "Passports" } },
      { code: "visas", label: { fr: "Visas", en: "Visas" } },
      { code: "civil_status", label: { fr: "État civil", en: "Civil status" } },
      { code: "consular_registry", label: { fr: "Registre consulaire", en: "Consular registry" } },
      { code: "consular_cards", label: { fr: "Cartes consulaires", en: "Consular cards" } },
      { code: "consular_notifications", label: { fr: "Notifications consulaires", en: "Consular notifications" } },
    ],
  },
  news: {
    code: "news",
    label: { fr: "Actualités", en: "News" },
    description: {
      fr: "Publications, notifications aux citoyens, tutoriels et guides",
      en: "Publications, citizen notifications, tutorials and guides",
    },
    icon: "Megaphone",
    color: "text-sky-500",
    category: "operations",
    isCore: false,
    capabilities: [
      { code: "posts", label: { fr: "Publications", en: "Posts" } },
      { code: "tutorials", label: { fr: "Tutoriels", en: "Tutorials" } },
    ],
  },
  community: {
    code: "community",
    label: { fr: "Communauté", en: "Community" },
    description: {
      fr: "Associations, entreprises et événements communautaires de la diaspora",
      en: "Diaspora associations, companies and community events",
    },
    icon: "Users",
    color: "text-green-500",
    category: "operations",
    isCore: false,
    capabilities: [
      { code: "associations", label: { fr: "Associations", en: "Associations" } },
      { code: "companies", label: { fr: "Entreprises", en: "Companies" } },
      { code: "events", label: { fr: "Événements", en: "Events" } },
    ],
  },

  // ─── iBureau ──────────────────────────────────────────────
  correspondence: {
    code: "correspondence",
    label: { fr: "iCorrespondance", en: "iCorrespondance" },
    description: {
      fr: "Procédures administratives et correspondance officielle",
      en: "Administrative procedures and official correspondence",
    },
    icon: "Mail",
    color: "text-cyan-500",
    category: "ibureau",
    isCore: false,
    capabilities: [
      { code: "incoming", label: { fr: "Courrier entrant", en: "Incoming" } },
      { code: "outgoing", label: { fr: "Courrier sortant", en: "Outgoing" } },
      { code: "registry", label: { fr: "Registre", en: "Registry" } },
    ],
  },
  documents: {
    code: "documents",
    label: { fr: "iDocument", en: "iDocument" },
    description: {
      fr: "Gestion, génération, signature et vérification des documents officiels",
      en: "Document management, generation, signing and verification",
    },
    icon: "FileText",
    color: "text-blue-500",
    category: "ibureau",
    isCore: true,
    capabilities: [
      { code: "explorer", label: { fr: "Explorateur", en: "Explorer" } },
      { code: "archive", label: { fr: "Archive", en: "Archive" } },
      { code: "retention", label: { fr: "Rétention", en: "Retention" } },
      { code: "templates", label: { fr: "Modèles", en: "Templates" } },
      { code: "generation", label: { fr: "Génération automatique", en: "Auto-generation" } },
      { code: "signature", label: { fr: "Signature officielle", en: "Official signature" } },
    ],
  },
  calendar: {
    code: "calendar",
    label: { fr: "iAgenda", en: "iAgenda" },
    description: {
      fr: "Planification des rendez-vous et agenda diplomatique",
      en: "Appointment scheduling and diplomatic agenda",
    },
    icon: "CalendarDays",
    color: "text-violet-500",
    category: "ibureau",
    isCore: true,
    capabilities: [
      { code: "personal", label: { fr: "Agenda personnel", en: "Personal agenda" } },
      { code: "diplomatic", label: { fr: "Agenda diplomatique", en: "Diplomatic agenda" } },
      { code: "scheduling", label: { fr: "RDV consulaires", en: "Consular appointments" } },
    ],
  },
  messaging: {
    code: "messaging",
    label: { fr: "iCom", en: "iCom" },
    description: {
      fr: "Chat, appels audio/vidéo, réunions en ligne et assistant IA",
      en: "Chat, audio/video calls, online meetings and AI assistant",
    },
    icon: "MessagesSquare",
    color: "text-rose-500",
    category: "ibureau",
    isCore: false,
    capabilities: [
      { code: "chat", label: { fr: "Messagerie instantanée", en: "Instant messaging" } },
      { code: "calls", label: { fr: "Appels", en: "Calls" } },
      { code: "meetings", label: { fr: "Réunions en ligne", en: "Online meetings" } },
      { code: "ai_assistant", label: { fr: "Assistant IA", en: "AI assistant" } },
    ],
  },

  // ─── Gestion ──────────────────────────────────────────────
  team: {
    code: "team",
    label: { fr: "Équipe", en: "Team" },
    description: {
      fr: "Gestion de l'équipe, postes, rôles, permissions et profils",
      en: "Team, positions, roles, permissions and profiles",
    },
    icon: "Users2",
    color: "text-blue-500",
    category: "gestion",
    isCore: true,
    capabilities: [
      { code: "members", label: { fr: "Membres", en: "Members" } },
      { code: "roles", label: { fr: "Postes & Rôles", en: "Positions & Roles" } },
      { code: "permissions", label: { fr: "Modules & Permissions", en: "Modules & Permissions" } },
      { code: "profiles", label: { fr: "Profils", en: "Profiles" } },
      { code: "supervise", label: { fr: "Supervision opérationnelle", en: "Operational supervision" } },
    ],
  },
  payments: {
    code: "payments",
    label: { fr: "Paiements", en: "Payments" },
    description: {
      fr: "Gestion financière, transactions et paiements consulaires",
      en: "Financial management, transactions and consular payments",
    },
    icon: "CreditCard",
    color: "text-yellow-600",
    category: "gestion",
    isCore: false,
    capabilities: [
      { code: "revenue", label: { fr: "Recettes", en: "Revenue" } },
      { code: "expenses", label: { fr: "Dépenses", en: "Expenses" } },
      { code: "transactions", label: { fr: "Transactions", en: "Transactions" } },
    ],
  },
  statistics: {
    code: "statistics",
    label: { fr: "Statistiques", en: "Statistics" },
    description: {
      fr: "Tableaux de bord, statistiques détaillées et monitoring système",
      en: "Dashboards, detailed statistics and system monitoring",
    },
    icon: "BarChart3",
    color: "text-cyan-500",
    category: "gestion",
    isCore: false,
    capabilities: [
      { code: "analytics", label: { fr: "Analytics", en: "Analytics" } },
      { code: "monitoring", label: { fr: "Monitoring", en: "Monitoring" } },
      { code: "dashboards", label: { fr: "Tableaux de bord", en: "Dashboards" } },
    ],
  },

  // ─── Administration ───────────────────────────────────────
  settings: {
    code: "settings",
    label: { fr: "Paramètres", en: "Settings" },
    description: {
      fr: "Configuration de l'organisation, services consulaires et plateforme",
      en: "Organization, consular services and platform configuration",
    },
    icon: "Settings",
    color: "text-zinc-500",
    category: "administration",
    isCore: true,
    capabilities: [
      { code: "org", label: { fr: "Configuration représentation", en: "Representation config" } },
      { code: "services", label: { fr: "Configuration services", en: "Services config" } },
      { code: "platform", label: { fr: "Paramètres plateforme", en: "Platform settings" } },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// DERIVED CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CORE_MODULE_CODES: ModuleCodeValue[] = Object.values(MODULE_REGISTRY)
  .filter((m) => m.isCore)
  .map((m) => m.code);

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function getModuleDefinition(code: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY[code as ModuleCodeValue];
}

export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.category === category);
}

// ═══════════════════════════════════════════════════════════════
// MODULE ACCESS → TASK MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Maps each canonical module × access level to the task codes it grants.
 * Tasks from absorbed sub-modules (e.g. `passports.process`) are folded
 * into the parent (`consular_affairs`).
 */
export const MODULE_ACCESS_TASKS: Partial<Record<ModuleCodeValue, Record<ModuleAccessLevel, string[]>>> = {
  consular_affairs: {
    reader: [
      "requests.view",
      "consular_registrations.view",
    ],
    editor: [
      "requests.view", "requests.create", "requests.process", "requests.validate", "requests.complete",
      "consular_registrations.view", "consular_registrations.manage",
      "civil_status.transcribe", "civil_status.register",
      "passports.process", "passports.biometric",
      "visas.process", "visas.approve",
    ],
    admin: [
      "requests.view", "requests.create", "requests.process", "requests.validate", "requests.assign", "requests.delete", "requests.complete",
      "consular_registrations.view", "consular_registrations.manage",
      "civil_status.transcribe", "civil_status.register", "civil_status.certify",
      "passports.process", "passports.biometric", "passports.deliver",
      "visas.process", "visas.approve", "visas.stamp",
    ],
  },
  documents: {
    reader: ["documents.view"],
    editor: [
      "documents.view",
      "documents.validate",
      "documents.generate",
      "documents.publish",
    ],
    admin: [
      "documents.view",
      "documents.validate",
      "documents.generate",
      "documents.delete",
      "documents.publish",
      "documents.sign",
      "documents.manage_templates",
      "documents.ai_generation",
    ],
  },
  calendar: {
    reader: ["appointments.view"],
    editor: ["appointments.view", "appointments.manage"],
    admin: ["appointments.view", "appointments.manage", "appointments.configure"],
  },
  team: {
    reader: ["team.view", "profiles.view", "citizen_profiles.view"],
    editor: ["team.view", "team.manage", "team.supervise", "profiles.view", "profiles.manage", "citizen_profiles.view", "citizen_profiles.manage"],
    admin: ["team.view", "team.manage", "team.supervise", "team.assign_roles", "profiles.view", "profiles.manage", "citizen_profiles.view", "citizen_profiles.manage"],
  },
  profile: {
    reader: ["profiles.view"],
    editor: ["profiles.view", "profiles.manage"],
    admin: ["profiles.view", "profiles.manage", "team.assign_roles"],
  },
  payments: {
    reader: ["payments.view", "finance.view"],
    editor: ["payments.view", "finance.view", "finance.collect"],
    admin: ["payments.view", "finance.view", "finance.collect", "finance.manage"],
  },
  news: {
    reader: ["communication.notify"],
    editor: ["communication.publish", "communication.notify"],
    admin: ["communication.publish", "communication.notify"],
  },
  settings: {
    reader: ["settings.view"],
    editor: ["settings.view", "settings.manage"],
    admin: ["settings.view", "settings.manage"],
  },
  statistics: {
    reader: ["statistics.view", "analytics.view"],
    editor: ["statistics.view", "analytics.view", "analytics.export"],
    admin: ["statistics.view", "analytics.view", "analytics.export"],
  },
  diplomatic_affairs: {
    reader: ["intelligence.view"],
    editor: ["intelligence.view", "intelligence.manage"],
    admin: ["intelligence.view", "intelligence.manage"],
  },
  correspondence: {
    reader: ["correspondance.view"],
    editor: [
      "correspondance.view", "correspondance.create", "correspondance.approve",
      "correspondance.sign", "correspondance.transmit", "correspondance.supervise",
    ],
    admin: [
      "correspondance.view", "correspondance.create", "correspondance.approve",
      "correspondance.sign", "correspondance.transmit", "correspondance.supervise",
      "correspondance.configure", "correspondance.admin",
    ],
  },
  community: {
    reader: ["community_events.view"],
    editor: ["community_events.view", "community_events.manage"],
    admin: ["community_events.view", "community_events.manage"],
  },
  messaging: {
    reader: [
      "meetings.view_history", "meetings.join",
      "ai_assistant.view", "ai_assistant.dismiss", "ai_assistant.configure",
    ],
    editor: [
      "meetings.view_history", "meetings.join", "meetings.create",
      "ai_assistant.view", "ai_assistant.dismiss", "ai_assistant.apply",
      "ai_assistant.configure", "ai_assistant.audit",
    ],
    admin: [
      "meetings.view_history", "meetings.join", "meetings.create", "meetings.manage",
      "ai_assistant.view", "ai_assistant.dismiss", "ai_assistant.apply",
      "ai_assistant.configure", "ai_assistant.auto_apply", "ai_assistant.admin", "ai_assistant.audit",
    ],
  },
};

export function getTasksForModuleAccess(
  moduleCode: string,
  level: ModuleAccessLevel,
): string[] {
  const mapping = MODULE_ACCESS_TASKS[moduleCode as ModuleCodeValue];
  if (!mapping) return [];
  return mapping[level] ?? [];
}

/**
 * Resolve the full set of task codes from a moduleAccess array.
 * Adds implicit cross-cutting tasks (org.view, schedules.view).
 */
export function resolveTaskCodesFromModuleAccess(
  moduleAccess: Array<{ moduleCode: string; accessLevel: ModuleAccessLevel }>,
): Set<string> {
  const tasks = new Set<string>();
  tasks.add("org.view");
  tasks.add("schedules.view");

  for (const entry of moduleAccess) {
    for (const task of getTasksForModuleAccess(entry.moduleCode, entry.accessLevel)) {
      tasks.add(task);
    }
  }

  return tasks;
}

export const CATEGORY_LABELS: Record<ModuleCategory, LocalizedString> = {
  operations: { fr: "Opérations", en: "Operations" },
  ibureau: { fr: "iBureau", en: "iBureau" },
  gestion: { fr: "Gestion", en: "Management" },
  administration: { fr: "Administration", en: "Administration" },
};

export const CATEGORY_ORDER: ModuleCategory[] = [
  "operations",
  "ibureau",
  "gestion",
  "administration",
];

export function getCoreModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.isCore);
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR MODULE GROUPS — match agent-web nav exactly
// ═══════════════════════════════════════════════════════════════

export interface SidebarModuleGroup {
  key: string;
  label: LocalizedString;
  icon: string;
  modules: ModuleCodeValue[];
}

export const SIDEBAR_MODULE_GROUPS: SidebarModuleGroup[] = [
  {
    key: "operations",
    label: { fr: "Opérations", en: "Operations" },
    icon: "Globe2",
    modules: [
      "diplomatic_affairs",
      "consular_affairs",
      "news",
      "community",
    ],
  },
  {
    key: "ibureau",
    label: { fr: "iBureau", en: "iBureau" },
    icon: "Briefcase",
    modules: [
      "correspondence",
      "documents",
      "calendar",
      "messaging",
    ],
  },
  {
    key: "gestion",
    label: { fr: "Gestion", en: "Management" },
    icon: "BarChart3",
    modules: [
      "team",
      "payments",
      "statistics",
    ],
  },
  {
    key: "administration",
    label: { fr: "Administration", en: "Administration" },
    icon: "Settings",
    modules: [
      "settings",
    ],
  },
];

export function getDefaultCapabilities(moduleCode: string): string[] {
  const def = getModuleDefinition(moduleCode);
  return def?.capabilities?.map((c) => c.code) ?? [];
}

// ═══════════════════════════════════════════════════════════════
// ADMIN AXES — High-level grouping for backoffice sidebar
// ═══════════════════════════════════════════════════════════════

export const AdminAxis = {
  network: "network",
  population: "population",
  security: "security",
  control: "control",
} as const;

export type AdminAxisValue = (typeof AdminAxis)[keyof typeof AdminAxis];
export const ALL_ADMIN_AXES: AdminAxisValue[] = Object.values(AdminAxis);

export interface AdminAxisDefinition {
  code: AdminAxisValue;
  label: { fr: string; en: string };
  icon: string;
  description: { fr: string; en: string };
}

export const ADMIN_AXIS_REGISTRY: Record<AdminAxisValue, AdminAxisDefinition> = {
  network: {
    code: "network",
    label: { fr: "Réseau", en: "Network" },
    icon: "Building2",
    description: {
      fr: "Organismes, services et opérations consulaires",
      en: "Organizations, services and consular operations",
    },
  },
  population: {
    code: "population",
    label: { fr: "Population", en: "Population" },
    icon: "Users",
    description: {
      fr: "Comptes, profils citoyens et assistance",
      en: "Accounts, citizen profiles and support",
    },
  },
  security: {
    code: "security",
    label: { fr: "Sécurité & Système", en: "Security & System" },
    icon: "Shield",
    description: {
      fr: "Audit, monitoring et paramètres plateforme",
      en: "Audit, monitoring and platform settings",
    },
  },
  control: {
    code: "control",
    label: { fr: "Éditorial", en: "Editorial" },
    icon: "PenLine",
    description: {
      fr: "Publications, tutoriels et événements communautaires",
      en: "Publications, tutorials and community events",
    },
  },
};

export interface AxisSidebarItem {
  title: { fr: string; en: string };
  moduleCode?: ModuleCodeValue;
  icon: string;
}

export interface AxisModuleMapping {
  modules: ModuleCodeValue[];
  sidebarItems: AxisSidebarItem[];
  restrictedToSuperSystem?: boolean;
}

export const AXIS_MODULE_MAP: Record<AdminAxisValue, AxisModuleMapping> = {
  network: {
    modules: ["team", "settings", "consular_affairs", "community"],
    sidebarItems: [
      { title: { fr: "Dashboard", en: "Dashboard" }, icon: "LayoutDashboard" },
      { title: { fr: "Équipe", en: "Team" }, moduleCode: "team", icon: "Users2" },
      { title: { fr: "Services", en: "Services" }, moduleCode: "settings", icon: "Wrench" },
      { title: { fr: "Affaires Consulaires", en: "Consular Affairs" }, moduleCode: "consular_affairs", icon: "ClipboardList" },
      { title: { fr: "Communauté", en: "Community" }, moduleCode: "community", icon: "Crown" },
    ],
  },
  population: {
    modules: ["team", "calendar"],
    sidebarItems: [
      { title: { fr: "Utilisateurs", en: "Users" }, moduleCode: "team", icon: "Users" },
      { title: { fr: "Profils", en: "Profiles" }, moduleCode: "team", icon: "Crown" },
      { title: { fr: "Support", en: "Support" }, moduleCode: "calendar", icon: "LifeBuoy" },
    ],
  },
  security: {
    modules: ["statistics", "settings"],
    restrictedToSuperSystem: true,
    sidebarItems: [
      { title: { fr: "Statistiques", en: "Statistics" }, moduleCode: "statistics", icon: "BarChart3" },
      { title: { fr: "Monitoring", en: "Monitoring" }, moduleCode: "statistics", icon: "Activity" },
      { title: { fr: "Paramètres", en: "Settings" }, moduleCode: "settings", icon: "Settings" },
    ],
  },
  control: {
    modules: ["team", "settings", "news", "community"],
    sidebarItems: [
      { title: { fr: "Postes & Rôles", en: "Positions & Roles" }, moduleCode: "team", icon: "Shield" },
      { title: { fr: "Modules & Permissions", en: "Modules & Permissions" }, moduleCode: "team", icon: "Layers" },
      { title: { fr: "Config représentations", en: "Representations Config" }, moduleCode: "settings", icon: "Globe" },
      { title: { fr: "Config services", en: "Services Config" }, moduleCode: "settings", icon: "Cog" },
      { title: { fr: "Publications", en: "Posts" }, moduleCode: "news", icon: "Newspaper" },
      { title: { fr: "Tutoriels", en: "Tutorials" }, moduleCode: "news", icon: "BookOpen" },
      { title: { fr: "Événements", en: "Events" }, moduleCode: "community", icon: "Calendar" },
    ],
  },
};

export function getModulesForAxes(axes: AdminAxisValue[]): ModuleCodeValue[] {
  const set = new Set<ModuleCodeValue>();
  for (const axis of axes) {
    for (const mod of AXIS_MODULE_MAP[axis].modules) {
      set.add(mod);
    }
  }
  return Array.from(set);
}

// ═══════════════════════════════════════════════════════════════
// ROLE MODULE PRESETS
// ═══════════════════════════════════════════════════════════════

export interface RoleModulePreset {
  id: string;
  label: { fr: string; en: string };
  description: { fr: string; en: string };
  emoji: string;
  modules: ModuleCodeValue[];
}

export const ROLE_MODULE_PRESETS: RoleModulePreset[] = [
  {
    id: "admin_system",
    label: { fr: "Admin Système", en: "System Admin" },
    description: { fr: "Accès complet à tous les modules", en: "Full access to all modules" },
    emoji: "",
    modules: [...ALL_MODULE_CODES],
  },
  {
    id: "admin_standard",
    label: { fr: "Admin Standard", en: "Standard Admin" },
    description: { fr: "Réseau + Population + Contrôle éditorial", en: "Network + Population + Editorial Control" },
    emoji: "",
    modules: [
      ...CORE_MODULE_CODES,
      "team",
      "settings",
      "news",
      "community",
    ],
  },
  {
    id: "sous_admin",
    label: { fr: "Sous-Admin", en: "Sub-Admin" },
    description: { fr: "Réseau + Population, sans sécurité ni gouvernance", en: "Network + Population, no security or governance" },
    emoji: "",
    modules: [
      ...CORE_MODULE_CODES,
      "news",
      "community",
    ],
  },
  {
    id: "admin_content",
    label: { fr: "Contenu uniquement", en: "Content Only" },
    description: { fr: "Publications et événements communautaires", en: "Posts and community events" },
    emoji: "",
    modules: [
      ...CORE_MODULE_CODES,
      "news",
      "community",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// CONTEXTUAL MODULE RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface ModuleAttributionContext {
  role?: string;
  continent?: string;
  country?: string;
  orgType?: string;
}

export function getRecommendedModules(ctx: ModuleAttributionContext): {
  modules: ModuleCodeValue[];
  sources: { label: string; emoji: string }[];
} {
  const sources: { label: string; emoji: string }[] = [];
  let modulePool: Set<ModuleCodeValue>;

  if (ctx.role === "super_admin" || ctx.role === "admin_system") {
    modulePool = new Set(ALL_MODULE_CODES);
    sources.push({ label: ctx.role === "super_admin" ? "Super Admin" : "Admin Système", emoji: "" });
  } else if (ctx.role === "admin") {
    const preset = ROLE_MODULE_PRESETS.find((p) => p.id === "admin_standard");
    modulePool = new Set(preset?.modules ?? CORE_MODULE_CODES);
    sources.push({ label: "Admin", emoji: "" });
  } else if (ctx.role === "sous_admin") {
    const preset = ROLE_MODULE_PRESETS.find((p) => p.id === "sous_admin");
    modulePool = new Set(preset?.modules ?? CORE_MODULE_CODES);
    sources.push({ label: "Sous-Admin", emoji: "" });
  } else {
    modulePool = new Set(CORE_MODULE_CODES);
    sources.push({ label: "Base", emoji: "" });
  }

  if (ctx.orgType) {
    const orgModules = ORG_TYPE_MODULE_MAP[ctx.orgType];
    if (orgModules) {
      const orgSet = new Set(orgModules);
      const intersected = new Set<ModuleCodeValue>();
      for (const mod of modulePool) {
        if (orgSet.has(mod) || CORE_MODULE_CODES.includes(mod)) {
          intersected.add(mod);
        }
      }
      modulePool = intersected;
      sources.push({ label: ORG_TYPE_LABELS[ctx.orgType] ?? ctx.orgType, emoji: ORG_TYPE_EMOJIS[ctx.orgType] ?? "" });
    }
  }

  for (const core of CORE_MODULE_CODES) {
    modulePool.add(core);
  }

  return {
    modules: Array.from(modulePool),
    sources,
  };
}

const ORG_TYPE_MODULE_MAP: Record<string, ModuleCodeValue[]> = {
  embassy: [...ALL_MODULE_CODES],
  high_representation: [...ALL_MODULE_CODES],
  general_consulate: [
    ...CORE_MODULE_CODES,
    "consular_affairs",
    "community",
    "payments",
    "news",
    "messaging",
    "statistics",
  ],
  permanent_mission: [
    ...CORE_MODULE_CODES,
    "community",
    "news",
    "messaging",
    "statistics",
  ],
  high_commission: [...ALL_MODULE_CODES],
  honorary_consulate: [
    ...CORE_MODULE_CODES,
    "news",
    "messaging",
  ],
  third_party: [...CORE_MODULE_CODES],
  custom: [...CORE_MODULE_CODES],
};

const ORG_TYPE_LABELS: Record<string, string> = {
  embassy: "Ambassade",
  high_representation: "Haute Représentation",
  general_consulate: "Consulat Général",
  permanent_mission: "Mission Permanente",
  high_commission: "Haut-Commissariat",
  honorary_consulate: "Consulat Honoraire",
  third_party: "Partenaire Tiers",
  custom: "Personnalisé",
};

const ORG_TYPE_EMOJIS: Record<string, string> = {
  embassy: "",
  high_representation: "",
  general_consulate: "",
  permanent_mission: "",
  high_commission: "",
  honorary_consulate: "",
  third_party: "",
  custom: "",
};
