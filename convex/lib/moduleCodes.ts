/**
 * ═══════════════════════════════════════════════════════════════
 * MODULE CODES — Single source of truth for application features
 * ═══════════════════════════════════════════════════════════════
 *
 * Modules represent application features/functionalities.
 * They control WHAT areas of the app a user or org can access.
 * (Tasks control WHAT ACTIONS a user can perform within those areas.)
 *
 * Modules are defined in code — adding a module requires code changes.
 * They are NOT customizable via the database.
 *
 * Usage:
 *   - org.modules: ModuleCodeValue[] — features activated for this org (superadmin)
 *   - position.modules: ModuleCodeValue[] — features this position can access
 */

import { v } from "convex/values";
import type { LocalizedString } from "./validators";

// ═══════════════════════════════════════════════════════════════
// MODULE CODE ENUM
// ═══════════════════════════════════════════════════════════════

export const ModuleCode = {
  // Core
  requests: "requests",
  documents: "documents",
  appointments: "appointments",
  profiles: "profiles",
  citizen_profiles: "citizen_profiles",
  iprofil: "iprofil",

  // Consular services
  consular_registrations: "consular_registrations",
  consular_notifications: "consular_notifications",
  consular_cards: "consular_cards",
  civil_status: "civil_status",
  passports: "passports",
  visas: "visas",

  // Community
  associations: "associations",
  companies: "companies",
  community_events: "community_events",

  // Finance
  finance: "finance",
  payments: "payments",

  // Communication
  communication: "communication",
  correspondance: "correspondance",
  digital_mail: "digital_mail",
  meetings: "meetings",
  tutorials: "tutorials",

  // Admin
  team: "team",
  roles: "roles",
  permissions: "permissions",
  settings: "settings",
  org_config: "org_config",
  services_config: "services_config",
  platform_settings: "platform_settings",
  analytics: "analytics",
  monitoring: "monitoring",
  statistics: "statistics",

  // Special
  intelligence: "intelligence",
  cv: "cv",
} as const;

export type ModuleCodeValue = (typeof ModuleCode)[keyof typeof ModuleCode];

/** All module codes as a flat array */
export const ALL_MODULE_CODES: ModuleCodeValue[] = Object.values(ModuleCode);

// ═══════════════════════════════════════════════════════════════
// MODULE CATEGORIES
// ═══════════════════════════════════════════════════════════════

export type ModuleCategory = "core" | "consular" | "diplomatic" | "tools" | "finance" | "admin";

// Legacy alias — some frontend files may still reference old categories
export type LegacyModuleCategory = "core" | "consular" | "community" | "finance" | "communication" | "admin" | "special";

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
  level: number; // 1=reader, 2=editor, 3=admin — for comparison
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

/** Check if a level includes another (admin includes editor includes reader) */
export function accessLevelIncludes(userLevel: ModuleAccessLevel, requiredLevel: ModuleAccessLevel): boolean {
  return ACCESS_LEVEL_META[userLevel].level >= ACCESS_LEVEL_META[requiredLevel].level;
}

/** Convex validator for access levels */
export const accessLevelValidator = v.union(
  v.literal("reader"),
  v.literal("editor"),
  v.literal("admin"),
);

/**
 * Module access map type — maps module codes to access levels.
 * Used in orgs.moduleAccess and memberships.moduleAccess.
 */
export type ModuleAccessMap = Partial<Record<ModuleCodeValue, ModuleAccessLevel>>;

// ═══════════════════════════════════════════════════════════════
// CONVEX VALIDATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Convex validator for module codes.
 * Use in schema definitions: `modules: v.array(moduleCodeValidator)`
 */
export const moduleCodeValidator = v.union(
  // Core
  v.literal(ModuleCode.requests),
  v.literal(ModuleCode.documents),
  v.literal(ModuleCode.appointments),
  v.literal(ModuleCode.profiles),
  v.literal(ModuleCode.citizen_profiles),
  // Consular
  v.literal(ModuleCode.consular_registrations),
  v.literal(ModuleCode.consular_notifications),
  v.literal(ModuleCode.consular_cards),
  v.literal(ModuleCode.civil_status),
  v.literal(ModuleCode.passports),
  v.literal(ModuleCode.visas),
  // Community
  v.literal(ModuleCode.associations),
  v.literal(ModuleCode.companies),
  v.literal(ModuleCode.community_events),
  // Finance
  v.literal(ModuleCode.finance),
  v.literal(ModuleCode.payments),
  // Communication
  v.literal(ModuleCode.communication),
  v.literal(ModuleCode.correspondance),
  v.literal(ModuleCode.digital_mail),
  v.literal(ModuleCode.meetings),
  v.literal(ModuleCode.tutorials),
  // Admin
  v.literal(ModuleCode.team),
  v.literal(ModuleCode.roles),
  v.literal(ModuleCode.permissions),
  v.literal(ModuleCode.settings),
  v.literal(ModuleCode.org_config),
  v.literal(ModuleCode.services_config),
  v.literal(ModuleCode.platform_settings),
  v.literal(ModuleCode.analytics),
  v.literal(ModuleCode.monitoring),
  v.literal(ModuleCode.statistics),
  // Special
  v.literal(ModuleCode.intelligence),
  v.literal(ModuleCode.cv),
  v.literal(ModuleCode.iprofil),
);

// ═══════════════════════════════════════════════════════════════
// MODULE REGISTRY — Metadata for each module
// ═══════════════════════════════════════════════════════════════

export interface CapabilityDefinition {
  code: string;
  label: LocalizedString;
}

export interface ModuleDefinition {
  code: ModuleCodeValue;
  label: LocalizedString;
  description: LocalizedString;
  icon: string;      // Lucide icon name
  color: string;     // Tailwind color class
  category: ModuleCategory;
  isCore: boolean;   // Core modules cannot be disabled
  /** Sous-modules/onglets activables individuellement */
  capabilities?: CapabilityDefinition[];
}

export const MODULE_REGISTRY: Record<ModuleCodeValue, ModuleDefinition> = {
  // ─── Core ─────────────────────────────────────────────────
  [ModuleCode.requests]: {
    code: ModuleCode.requests,
    label: { fr: "Affaires Consulaires", en: "Consular Affairs" },
    description: { fr: "Gestion des demandes consulaires", en: "Consular request management" },
    icon: "FileEdit",
    color: "text-emerald-500",
    category: "core",
    isCore: true,
    capabilities: [
      { code: "passports", label: { fr: "Passeports", en: "Passports" } },
      { code: "visas", label: { fr: "Visas", en: "Visas" } },
      { code: "civil_status", label: { fr: "État civil", en: "Civil status" } },
      { code: "registre", label: { fr: "Registre consulaire", en: "Consular registry" } },
    ],
  },
  [ModuleCode.documents]: {
    code: ModuleCode.documents,
    label: { fr: "iDocument", en: "iDocument" },
    description: {
      fr: "Gestion, génération, signature et vérification des documents officiels",
      en: "Document management, generation, signing and verification",
    },
    icon: "FileText",
    color: "text-blue-500",
    category: "core",
    isCore: true,
    capabilities: [
      { code: "explorer", label: { fr: "Explorateur", en: "Explorer" } },
      { code: "archive", label: { fr: "Archive", en: "Archive" } },
      { code: "retention", label: { fr: "Rétention", en: "Retention" } },
      { code: "templates", label: { fr: "Modèles de documents", en: "Document templates" } },
      { code: "generation", label: { fr: "Génération automatique", en: "Auto-generation" } },
      { code: "signature", label: { fr: "Signature officielle", en: "Official signature" } },
    ],
  },
  [ModuleCode.appointments]: {
    code: ModuleCode.appointments,
    label: { fr: "iAgenda", en: "iAgenda" },
    description: { fr: "Planification des rendez-vous", en: "Appointment scheduling" },
    icon: "CalendarDays",
    color: "text-violet-500",
    category: "core",
    isCore: true,
    capabilities: [
      { code: "rdv_consulaires", label: { fr: "RDV Consulaires", en: "Consular appointments" } },
      { code: "agenda_diplomatique", label: { fr: "Agenda diplomatique", en: "Diplomatic agenda" } },
    ],
  },
  [ModuleCode.profiles]: {
    code: ModuleCode.profiles,
    label: { fr: "Utilisateurs", en: "Users" },
    description: { fr: "Gestion des comptes utilisateurs", en: "User account management" },
    icon: "Users",
    color: "text-sky-500",
    category: "core",
    isCore: true,
  },
  [ModuleCode.citizen_profiles]: {
    code: ModuleCode.citizen_profiles,
    label: { fr: "Profils citoyens", en: "Citizen Profiles" },
    description: { fr: "Consultation des profils citoyens", en: "Citizen profile browsing" },
    icon: "Crown",
    color: "text-amber-500",
    category: "core",
    isCore: false,
  },
  [ModuleCode.iprofil]: {
    code: ModuleCode.iprofil,
    label: { fr: "iProfil", en: "iProfil" },
    description: { fr: "Profil métier et accréditations diplomatiques", en: "Professional profile and diplomatic credentials" },
    icon: "UserCircle",
    color: "text-violet-500",
    category: "core",
    isCore: true,
  },

  // ─── Consular ─────────────────────────────────────────────
  [ModuleCode.consular_registrations]: {
    code: ModuleCode.consular_registrations,
    label: { fr: "Inscriptions consulaires", en: "Consular registrations" },
    description: { fr: "Inscription au registre des Français", en: "French citizen registration" },
    icon: "ClipboardList",
    color: "text-indigo-500",
    category: "consular",
    isCore: false,
  },
  [ModuleCode.consular_notifications]: {
    code: ModuleCode.consular_notifications,
    label: { fr: "Notifications consulaires", en: "Consular notifications" },
    description: { fr: "Notifications de passage consulaire", en: "Consular passage notifications" },
    icon: "Bell",
    color: "text-amber-500",
    category: "consular",
    isCore: false,
  },
  [ModuleCode.consular_cards]: {
    code: ModuleCode.consular_cards,
    label: { fr: "Cartes consulaires", en: "Consular cards" },
    description: { fr: "Gestion des cartes consulaires", en: "Consular card management" },
    icon: "CreditCard",
    color: "text-teal-500",
    category: "consular",
    isCore: false,
  },
  [ModuleCode.civil_status]: {
    code: ModuleCode.civil_status,
    label: { fr: "État civil", en: "Civil status" },
    description: { fr: "Actes d'état civil", en: "Civil status records" },
    icon: "ScrollText",
    color: "text-purple-500",
    category: "consular",
    isCore: false,
  },
  [ModuleCode.passports]: {
    code: ModuleCode.passports,
    label: { fr: "Passeports", en: "Passports" },
    description: { fr: "Demandes de passeport et biométrie", en: "Passport applications and biometrics" },
    icon: "BookOpen",
    color: "text-indigo-500",
    category: "consular",
    isCore: false,
  },
  [ModuleCode.visas]: {
    code: ModuleCode.visas,
    label: { fr: "Visas", en: "Visas" },
    description: { fr: "Instruction et délivrance des visas", en: "Visa processing and issuance" },
    icon: "Stamp",
    color: "text-orange-500",
    category: "consular",
    isCore: false,
  },

  // ─── Community (category: tools — outils transversaux) ────
  [ModuleCode.associations]: {
    code: ModuleCode.associations,
    label: { fr: "Associations", en: "Associations" },
    description: { fr: "Gestion des associations de la diaspora", en: "Diaspora association management" },
    icon: "Users",
    color: "text-green-500",
    category: "tools",
    isCore: false,
  },
  [ModuleCode.companies]: {
    code: ModuleCode.companies,
    label: { fr: "Entreprises", en: "Companies" },
    description: { fr: "Répertoire des entreprises", en: "Company directory" },
    icon: "Building2",
    color: "text-slate-500",
    category: "tools",
    isCore: false,
  },
  [ModuleCode.community_events]: {
    code: ModuleCode.community_events,
    label: { fr: "Événements", en: "Events" },
    description: { fr: "Événements communautaires", en: "Community events" },
    icon: "Calendar",
    color: "text-pink-500",
    category: "tools",
    isCore: false,
  },

  // ─── Finance ──────────────────────────────────────────────
  [ModuleCode.finance]: {
    code: ModuleCode.finance,
    label: { fr: "Paiements", en: "Payments" },
    description: { fr: "Gestion financière consulaire", en: "Consular financial management" },
    icon: "Wallet",
    color: "text-yellow-600",
    category: "finance",
    isCore: false,
  },
  [ModuleCode.payments]: {
    code: ModuleCode.payments,
    label: { fr: "Paiements", en: "Payments" },
    description: { fr: "Traitement des paiements", en: "Payment processing" },
    icon: "CreditCard",
    color: "text-green-600",
    category: "finance",
    isCore: false,
  },

  // ─── Communication & Outils (category: tools) ─────────────
  [ModuleCode.communication]: {
    code: ModuleCode.communication,
    label: { fr: "Actualités", en: "News" },
    description: { fr: "Publications et notifications aux citoyens", en: "Citizen publications and notifications" },
    icon: "Megaphone",
    color: "text-sky-500",
    category: "tools",
    isCore: false,
  },
  [ModuleCode.correspondance]: {
    code: ModuleCode.correspondance,
    label: { fr: "iCorrespondance", en: "iCorrespondance" },
    description: { fr: "Gestion des procédures administratives et correspondance officielle", en: "Administrative procedures and official correspondence management" },
    icon: "Mail",
    color: "text-cyan-500",
    category: "diplomatic",
    isCore: false,
  },
  [ModuleCode.digital_mail]: {
    code: ModuleCode.digital_mail,
    label: { fr: "iBoîte", en: "iBoîte" },
    description: { fr: "Messagerie interne et courrier dématérialisé", en: "Internal messaging and digital mail" },
    icon: "Mail",
    color: "text-blue-400",
    category: "tools",
    isCore: false,
    capabilities: [
      { code: "mail", label: { fr: "Messagerie", en: "Mail" } },
      { code: "packages", label: { fr: "Colis", en: "Packages" } },
      { code: "calls", label: { fr: "Appels", en: "Calls" } },
    ],
  },
  [ModuleCode.meetings]: {
    code: ModuleCode.meetings,
    label: { fr: "Réunions & Appels", en: "Meetings & Calls" },
    description: { fr: "Appels audio/vidéo et réunions en ligne", en: "Audio/video calls and online meetings" },
    icon: "Video",
    color: "text-rose-500",
    category: "tools",
    isCore: false,
  },
  [ModuleCode.tutorials]: {
    code: ModuleCode.tutorials,
    label: { fr: "Tutoriels", en: "Tutorials" },
    description: { fr: "Guides et tutoriels éducatifs", en: "Educational guides and tutorials" },
    icon: "BookOpen",
    color: "text-teal-500",
    category: "tools",
    isCore: false,
  },

  // ─── Admin ────────────────────────────────────────────────
  [ModuleCode.team]: {
    code: ModuleCode.team,
    label: { fr: "Équipe", en: "Team" },
    description: { fr: "Gestion de l'équipe et des membres", en: "Team and member management" },
    icon: "Building2",
    color: "text-blue-500",
    category: "admin",
    isCore: true,
  },
  [ModuleCode.roles]: {
    code: ModuleCode.roles,
    label: { fr: "Postes & Rôles", en: "Positions & Roles" },
    description: { fr: "Configuration des postes et rôles", en: "Position and role configuration" },
    icon: "Shield",
    color: "text-indigo-500",
    category: "admin",
    isCore: false,
  },
  [ModuleCode.permissions]: {
    code: ModuleCode.permissions,
    label: { fr: "Modules & Permissions", en: "Modules & Permissions" },
    description: { fr: "Attribution des modules et permissions", en: "Module and permission assignment" },
    icon: "Layers",
    color: "text-violet-500",
    category: "admin",
    isCore: false,
  },
  [ModuleCode.settings]: {
    code: ModuleCode.settings,
    label: { fr: "Paramètres", en: "Settings" },
    description: { fr: "Configuration et paramétrage", en: "Configuration and settings" },
    icon: "Wrench",
    color: "text-zinc-500",
    category: "admin",
    isCore: true,
  },
  [ModuleCode.org_config]: {
    code: ModuleCode.org_config,
    label: { fr: "Config représentations", en: "Representations Config" },
    description: { fr: "Configuration des représentations diplomatiques", en: "Diplomatic representation configuration" },
    icon: "Globe",
    color: "text-emerald-500",
    category: "admin",
    isCore: false,
  },
  [ModuleCode.services_config]: {
    code: ModuleCode.services_config,
    label: { fr: "Config services", en: "Services Config" },
    description: { fr: "Paramétrage des services consulaires", en: "Consular service configuration" },
    icon: "Cog",
    color: "text-amber-500",
    category: "admin",
    isCore: false,
  },
  [ModuleCode.platform_settings]: {
    code: ModuleCode.platform_settings,
    label: { fr: "Paramètres plateforme", en: "Platform Settings" },
    description: { fr: "Paramètres système de la plateforme", en: "Platform system settings" },
    icon: "Settings",
    color: "text-zinc-400",
    category: "admin",
    isCore: false,
  },
  [ModuleCode.analytics]: {
    code: ModuleCode.analytics,
    label: { fr: "Statistiques", en: "Statistics" },
    description: { fr: "Tableaux de bord et statistiques", en: "Dashboards and statistics" },
    icon: "ScrollText",
    color: "text-cyan-500",
    category: "admin",
    isCore: false,
  },
  [ModuleCode.monitoring]: {
    code: ModuleCode.monitoring,
    label: { fr: "Monitoring", en: "Monitoring" },
    description: { fr: "Surveillance système en temps réel", en: "Real-time system monitoring" },
    icon: "Activity",
    color: "text-rose-500",
    category: "admin",
    isCore: false,
  },
  [ModuleCode.statistics]: {
    code: ModuleCode.statistics,
    label: { fr: "Statistiques", en: "Statistics" },
    description: { fr: "Statistiques détaillées", en: "Detailed statistics" },
    icon: "LineChart",
    color: "text-emerald-600",
    category: "admin",
    isCore: false,
  },

  // ─── Diplomatique ─────────────────────────────────────────
  [ModuleCode.intelligence]: {
    code: ModuleCode.intelligence,
    label: { fr: "Affaires Diplomatiques", en: "Diplomatic Affairs" },
    description: { fr: "Intelligence et renseignement diplomatique", en: "Diplomatic intelligence and affairs" },
    icon: "ShieldAlert",
    color: "text-red-500",
    category: "diplomatic",
    isCore: false,
  },
  [ModuleCode.cv]: {
    code: ModuleCode.cv,
    label: { fr: "CV", en: "CV" },
    description: { fr: "Gestion des CV diplomatiques", en: "Diplomatic CV management" },
    icon: "FileUser",
    color: "text-indigo-400",
    category: "diplomatic",
    isCore: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// DERIVED CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Core modules — always activated, cannot be disabled */
export const CORE_MODULE_CODES: ModuleCodeValue[] = Object.values(MODULE_REGISTRY)
  .filter((m) => m.isCore)
  .map((m) => m.code);

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Get module definition by code */
export function getModuleDefinition(code: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY[code as ModuleCodeValue];
}

/** Get all modules in a category */
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.category === category);
}

// ═══════════════════════════════════════════════════════════════
// MODULE ACCESS → TASK MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Maps each module × access level to the task codes it grants.
 *
 * - reader: tâches *.view uniquement (consultation)
 * - editor: reader + tâches d'action (*.create, *.process, *.manage, etc.)
 * - admin:  editor + tâches de gouvernance (*.assign, *.delete, *.configure, *.admin)
 *
 * Si un module n'a pas d'entrée ici, toutes ses tâches
 * sont disponibles à partir du niveau "reader" (backward compat).
 */
export const MODULE_ACCESS_TASKS: Partial<Record<string, Record<ModuleAccessLevel, string[]>>> = {
  requests: {
    reader: ["requests.view"],
    editor: ["requests.view", "requests.create", "requests.process", "requests.validate", "requests.complete"],
    admin: ["requests.view", "requests.create", "requests.process", "requests.validate", "requests.assign", "requests.delete", "requests.complete"],
  },
  documents: {
    // reader : consultation seulement
    reader: ["documents.view"],
    // editor : actions courantes (valider, générer, publier au citoyen)
    editor: [
      "documents.view",
      "documents.validate",
      "documents.generate",
      "documents.publish",
    ],
    // admin : gouvernance (suppression, signature officielle, gestion des modèles)
    admin: [
      "documents.view",
      "documents.validate",
      "documents.generate",
      "documents.delete",
      "documents.publish",
      "documents.sign",
      "documents.manage_templates",
    ],
  },
  appointments: {
    reader: ["appointments.view"],
    editor: ["appointments.view", "appointments.manage"],
    admin: ["appointments.view", "appointments.manage", "appointments.configure"],
  },
  profiles: {
    reader: ["profiles.view"],
    editor: ["profiles.view", "profiles.manage"],
    admin: ["profiles.view", "profiles.manage"],
  },
  iprofil: {
    reader: ["profiles.view"],
    editor: ["profiles.view", "profiles.manage"],
    admin: ["profiles.view", "profiles.manage", "team.assign_roles"],
  },
  civil_status: {
    reader: ["civil_status.transcribe"],
    editor: ["civil_status.transcribe", "civil_status.register"],
    admin: ["civil_status.transcribe", "civil_status.register", "civil_status.certify"],
  },
  passports: {
    reader: ["passports.process"],
    editor: ["passports.process", "passports.biometric"],
    admin: ["passports.process", "passports.biometric", "passports.deliver"],
  },
  visas: {
    reader: ["visas.process"],
    editor: ["visas.process", "visas.approve"],
    admin: ["visas.process", "visas.approve", "visas.stamp"],
  },
  finance: {
    reader: ["finance.view"],
    editor: ["finance.view", "finance.collect"],
    admin: ["finance.view", "finance.collect", "finance.manage"],
  },
  communication: {
    reader: ["communication.notify"],
    editor: ["communication.publish", "communication.notify"],
    admin: ["communication.publish", "communication.notify"],
  },
  team: {
    reader: ["team.view"],
    editor: ["team.view", "team.manage"],
    admin: ["team.view", "team.manage", "team.assign_roles"],
  },
  settings: {
    reader: ["settings.view"],
    editor: ["settings.view", "settings.manage"],
    admin: ["settings.view", "settings.manage"],
  },
  analytics: {
    reader: ["analytics.view"],
    editor: ["analytics.view", "analytics.export"],
    admin: ["analytics.view", "analytics.export"],
  },
  intelligence: {
    reader: ["intelligence.view"],
    editor: ["intelligence.view", "intelligence.manage"],
    admin: ["intelligence.view", "intelligence.manage"],
  },
  consular_registrations: {
    reader: ["consular_registrations.view"],
    editor: ["consular_registrations.view", "consular_registrations.manage"],
    admin: ["consular_registrations.view", "consular_registrations.manage"],
  },
  digital_mail: {
    reader: ["digital_mail.view"],
    editor: ["digital_mail.view", "digital_mail.manage"],
    admin: ["digital_mail.view", "digital_mail.manage"],
  },
  meetings: {
    reader: ["meetings.view_history", "meetings.join"],
    editor: ["meetings.view_history", "meetings.join", "meetings.create"],
    admin: ["meetings.view_history", "meetings.join", "meetings.create", "meetings.manage"],
  },
  correspondance: {
    reader: ["correspondance.view"],
    editor: ["correspondance.view", "correspondance.create", "correspondance.approve", "correspondance.sign", "correspondance.transmit"],
    admin: ["correspondance.view", "correspondance.create", "correspondance.approve", "correspondance.sign", "correspondance.transmit", "correspondance.configure", "correspondance.admin"],
  },
  community_events: {
    reader: ["community_events.view"],
    editor: ["community_events.view", "community_events.manage"],
    admin: ["community_events.view", "community_events.manage"],
  },
  payments: {
    reader: ["payments.view"],
    editor: ["payments.view"],
    admin: ["payments.view"],
  },
  schedules: {
    reader: ["schedules.view"],
    editor: ["schedules.view", "schedules.manage"],
    admin: ["schedules.view", "schedules.manage"],
  },
  statistics: {
    reader: ["statistics.view"],
    editor: ["statistics.view"],
    admin: ["statistics.view"],
  },
};

/**
 * Resolve the task codes a user gets for a given module + access level.
 * Falls back to all module tasks if no mapping exists.
 */
export function getTasksForModuleAccess(
  moduleCode: string,
  level: ModuleAccessLevel,
): string[] {
  const mapping = MODULE_ACCESS_TASKS[moduleCode];
  if (!mapping) {
    // Pas de mapping défini → toutes les tâches du module sont accessibles
    // (rétrocompatibilité avec les modules sans niveaux)
    return [];
  }
  return mapping[level] ?? [];
}

/**
 * Résout l'ensemble complet des task codes depuis un tableau moduleAccess.
 *
 * Utilisé par getTasksForMembership() pour dériver les permissions
 * d'un poste depuis sa configuration module×niveau.
 *
 * Ajoute automatiquement les tâches transversales implicites
 * (org.view, schedules.view) présentes dans tous les profils.
 */
export function resolveTaskCodesFromModuleAccess(
  moduleAccess: Array<{ moduleCode: string; accessLevel: ModuleAccessLevel }>,
): Set<string> {
  const tasks = new Set<string>();

  // Tâches transversales implicites pour tout membre actif
  tasks.add("org.view");
  tasks.add("schedules.view");

  for (const entry of moduleAccess) {
    const moduleTasks = getTasksForModuleAccess(entry.moduleCode, entry.accessLevel);
    for (const task of moduleTasks) {
      tasks.add(task);
    }
  }

  return tasks;
}

/** Category labels for UI */
export const CATEGORY_LABELS: Record<ModuleCategory, LocalizedString> = {
  core: { fr: "Modules fondamentaux", en: "Core modules" },
  consular: { fr: "Modules consulaires", en: "Consular modules" },
  diplomatic: { fr: "Modules diplomatiques", en: "Diplomatic modules" },
  tools: { fr: "Communication & Outils", en: "Communication & Tools" },
  finance: { fr: "Finances & Paiements", en: "Finance & Payments" },
  admin: { fr: "Administration", en: "Administration" },
};

/** Category display order */
export const CATEGORY_ORDER: ModuleCategory[] = ["core", "consular", "diplomatic", "tools", "finance", "admin"];

/** Get all core modules (cannot be disabled) */
export function getCoreModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.isCore);
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR MODULE GROUPS — Sections du sidebar agent-web
// Utilisé pour la configuration des modules (OrgModulesPanel)
// ═══════════════════════════════════════════════════════════════

export interface SidebarModuleGroup {
  key: string;
  label: LocalizedString;
  icon: string;
  modules: ModuleCodeValue[];
}

/**
 * Groupement des modules par sections du sidebar agent-web.
 * L'admin configure ces sections — elles correspondent exactement
 * a ce que l'utilisateur voit dans le menu.
 */
export const SIDEBAR_MODULE_GROUPS: SidebarModuleGroup[] = [
  {
    key: "operations",
    label: { fr: "Opérations", en: "Operations" },
    icon: "Globe2",
    modules: [
      ModuleCode.intelligence,
      ModuleCode.requests,
      ModuleCode.communication,
    ],
  },
  {
    key: "ibureau",
    label: { fr: "iBureau", en: "iBureau" },
    icon: "Briefcase",
    modules: [
      ModuleCode.digital_mail,
      ModuleCode.correspondance,
      ModuleCode.documents,
      ModuleCode.appointments,
    ],
  },
  {
    key: "gestion",
    label: { fr: "Gestion", en: "Management" },
    icon: "BarChart3",
    modules: [
      ModuleCode.team,
      ModuleCode.finance,
      ModuleCode.analytics,
    ],
  },
  {
    key: "communication",
    label: { fr: "Communication", en: "Communication" },
    icon: "Video",
    modules: [
      ModuleCode.meetings,
    ],
  },
  {
    key: "administration",
    label: { fr: "Administration", en: "Administration" },
    icon: "Settings",
    modules: [
      ModuleCode.settings,
    ],
  },
];

/** Get all default capabilities for a module */
export function getDefaultCapabilities(moduleCode: ModuleCodeValue): string[] {
  const def = MODULE_REGISTRY[moduleCode];
  return def?.capabilities?.map((c) => c.code) ?? [];
}

// ═══════════════════════════════════════════════════════════════
// ADMIN AXES — High-level grouping for admin sidebar
// ═══════════════════════════════════════════════════════════════

/**
 * Admin axes represent the 4 major responsibility domains in the back-office.
 * Each axis groups related sidebar sections and controls access at a higher level
 * than individual modules.
 *
 * Usage:
 *   - Sidebar: group navigation items by axis
 *   - Permissions: filter axes by user role
 *   - Attribution: "this admin can access the network and population axes"
 */
export const AdminAxis = {
  /**  Réseau — Organismes, services, demandes, communauté */
  network: "network",
  /**  Population — Comptes staff, profils citoyens, support */
  population: "population",
  /**  Sécurité & Système — Audit, monitoring, paramètres */
  security: "security",
  /**  Éditorial — Postes, modules, permissions, contenu éditorial */
  control: "control",
} as const;

export type AdminAxisValue = (typeof AdminAxis)[keyof typeof AdminAxis];
export const ALL_ADMIN_AXES: AdminAxisValue[] = Object.values(AdminAxis);

/** Axis metadata for UI display */
export interface AdminAxisDefinition {
  code: AdminAxisValue;
  label: { fr: string; en: string };
  icon: string;
  description: { fr: string; en: string };
}

export const ADMIN_AXIS_REGISTRY: Record<AdminAxisValue, AdminAxisDefinition> = {
  [AdminAxis.network]: {
    code: AdminAxis.network,
    label: { fr: "Réseau", en: "Network" },
    icon: "Building2",
    description: { fr: "Organismes, services et opérations consulaires", en: "Organizations, services and consular operations" },
  },
  [AdminAxis.population]: {
    code: AdminAxis.population,
    label: { fr: "Population", en: "Population" },
    icon: "Users",
    description: { fr: "Comptes, profils citoyens et assistance", en: "Accounts, citizen profiles and support" },
  },
  [AdminAxis.security]: {
    code: AdminAxis.security,
    label: { fr: "Sécurité & Système", en: "Security & System" },
    icon: "Shield",
    description: { fr: "Audit, monitoring et paramètres plateforme", en: "Audit, monitoring and platform settings" },
  },
  [AdminAxis.control]: {
    code: AdminAxis.control,
    label: { fr: "Éditorial", en: "Editorial" },
    icon: "PenLine",
    description: { fr: "Publications, tutoriels et événements communautaires", en: "Publications, tutorials and community events" },
  },
};

// ═══════════════════════════════════════════════════════════════
// AXIS → MODULE MAPPING — Mirrors the admin sidebar structure
// ═══════════════════════════════════════════════════════════════

/**
 * Each axis maps to:
 *  - `modules`: the unique set of module codes needed for this axis
 *  - `sidebarItems`: the sidebar menu items with their required moduleCode
 *
 * This is the **single source of truth** used by the module attribution
 * dialog so admins immediately understand what toggling an axis does.
 */
export interface AxisSidebarItem {
  title: { fr: string; en: string };
  moduleCode?: ModuleCodeValue;
  icon: string;
}

export interface AxisModuleMapping {
  modules: ModuleCodeValue[];
  sidebarItems: AxisSidebarItem[];
  /** If true, only SuperAdmin/AdminSystem can see this axis */
  restrictedToSuperSystem?: boolean;
}

export const AXIS_MODULE_MAP: Record<AdminAxisValue, AxisModuleMapping> = {
  //  AXE 1 — RÉSEAU
  [AdminAxis.network]: {
    modules: [ModuleCode.team, ModuleCode.settings, ModuleCode.requests, ModuleCode.associations],
    sidebarItems: [
      { title: { fr: "Dashboard", en: "Dashboard" }, icon: "LayoutDashboard" },
      { title: { fr: "Équipe", en: "Team" }, moduleCode: ModuleCode.team, icon: "Users2" },
      { title: { fr: "Services", en: "Services" }, moduleCode: ModuleCode.settings, icon: "Wrench" },
      { title: { fr: "Affaires Consulaires", en: "Consular Affairs" }, moduleCode: ModuleCode.requests, icon: "ClipboardList" },
      { title: { fr: "Réclamations associatives", en: "Association Claims" }, moduleCode: ModuleCode.associations, icon: "Crown" },
    ],
  },
  //  AXE 2 — POPULATION
  [AdminAxis.population]: {
    modules: [ModuleCode.profiles, ModuleCode.citizen_profiles, ModuleCode.appointments],
    sidebarItems: [
      { title: { fr: "Utilisateurs", en: "Users" }, moduleCode: ModuleCode.profiles, icon: "Users" },
      { title: { fr: "Profils", en: "Profiles" }, moduleCode: ModuleCode.citizen_profiles, icon: "Crown" },
      { title: { fr: "Support", en: "Support" }, moduleCode: ModuleCode.appointments, icon: "LifeBuoy" },
    ],
  },
  //  AXE 3 — SÉCURITÉ & SYSTÈME (SuperAdmin/AdminSystem only)
  [AdminAxis.security]: {
    modules: [ModuleCode.analytics, ModuleCode.monitoring, ModuleCode.platform_settings],
    restrictedToSuperSystem: true,
    sidebarItems: [
      { title: { fr: "Statistiques", en: "Statistics" }, moduleCode: ModuleCode.analytics, icon: "BarChart3" },
      { title: { fr: "Monitoring", en: "Monitoring" }, moduleCode: ModuleCode.monitoring, icon: "Activity" },
      { title: { fr: "Paramètres", en: "Settings" }, moduleCode: ModuleCode.platform_settings, icon: "Settings" },
    ],
  },
  //  AXE 4 — ÉDITORIAL
  [AdminAxis.control]: {
    modules: [ModuleCode.roles, ModuleCode.permissions, ModuleCode.org_config, ModuleCode.services_config, ModuleCode.communication, ModuleCode.tutorials, ModuleCode.community_events],
    sidebarItems: [
      { title: { fr: "Postes & Rôles", en: "Positions & Roles" }, moduleCode: ModuleCode.roles, icon: "Shield" },
      { title: { fr: "Modules & Permissions", en: "Modules & Permissions" }, moduleCode: ModuleCode.permissions, icon: "Layers" },
      { title: { fr: "Config représentations", en: "Representations Config" }, moduleCode: ModuleCode.org_config, icon: "Globe" },
      { title: { fr: "Config services", en: "Services Config" }, moduleCode: ModuleCode.services_config, icon: "Cog" },
      { title: { fr: "Publications", en: "Posts" }, moduleCode: ModuleCode.communication, icon: "Newspaper" },
      { title: { fr: "Tutoriels", en: "Tutorials" }, moduleCode: ModuleCode.tutorials, icon: "BookOpen" },
      { title: { fr: "Événements", en: "Events" }, moduleCode: ModuleCode.community_events, icon: "Calendar" },
    ],
  },
};

/** Get all unique modules required for a set of axes */
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
// ROLE MODULE PRESETS — Quick configuration templates
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
      ModuleCode.team, ModuleCode.settings,
      ModuleCode.roles, ModuleCode.permissions,
      ModuleCode.org_config, ModuleCode.services_config,
      ModuleCode.communication, ModuleCode.tutorials, ModuleCode.community_events,
      ModuleCode.associations,
    ],
  },
  {
    id: "sous_admin",
    label: { fr: "Sous-Admin", en: "Sub-Admin" },
    description: { fr: "Réseau + Population, sans sécurité ni gouvernance", en: "Network + Population, no security or governance" },
    emoji: "",
    modules: [
      ...CORE_MODULE_CODES,
      ModuleCode.associations,
      ModuleCode.communication, ModuleCode.tutorials, ModuleCode.community_events,
    ],
  },
  {
    id: "admin_content",
    label: { fr: "Contenu uniquement", en: "Content Only" },
    description: { fr: "Publications, tutoriels et événements", en: "Posts, tutorials and events" },
    emoji: "",
    modules: [
      ...CORE_MODULE_CODES,
      ModuleCode.communication, ModuleCode.tutorials, ModuleCode.community_events,
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// CONTEXTUAL MODULE RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Context for computing recommended modules.
 * All fields optional — the engine fills gaps with sensible defaults.
 */
export interface ModuleAttributionContext {
  role?: string;          // admin, admin_system, super_admin
  continent?: string;     // africa, europe, americas, asia, middle_east, oceania
  country?: string;       // ISO 3166-1 alpha-2 (FR, ES, US, ...)
  orgType?: string;       // From OrganizationType enum (embassy, general_consulate, ...)
}

/**
 * Computes recommended modules based on a multi-dimensional context.
 *
 * Priority order:
 *   1. Role → determines the ceiling (admin_system = all, admin = subset)
 *   2. OrgType → filters by ORGANIZATION_TEMPLATES.modules
 *   3. Regional rules may be layered in the future
 *
 * The result is always a superset of CORE_MODULE_CODES.
 */
export function getRecommendedModules(ctx: ModuleAttributionContext): {
  modules: ModuleCodeValue[];
  sources: { label: string; emoji: string }[];
} {
  const sources: { label: string; emoji: string }[] = [];

  // Step 1: Start with role ceiling
  let modulePool: Set<ModuleCodeValue>;

  if (ctx.role === "super_admin" || ctx.role === "admin_system") {
    modulePool = new Set(ALL_MODULE_CODES);
    sources.push({ label: ctx.role === "super_admin" ? "Super Admin" : "Admin Système", emoji: "" });
  } else if (ctx.role === "admin") {
    // Admin standard: reasonable subset
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

  // Step 2: If orgType is specified, intersect with org template modules
  if (ctx.orgType) {
    // Import-free: scan ORGANIZATION_TEMPLATES equivalent mapping
    const orgModules = ORG_TYPE_MODULE_MAP[ctx.orgType];
    if (orgModules) {
      const orgSet = new Set(orgModules);
      // Keep only modules that are in BOTH the role pool AND the org template
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

  // Step 3: Ensure core modules are always included
  for (const core of CORE_MODULE_CODES) {
    modulePool.add(core);
  }

  return {
    modules: Array.from(modulePool),
    sources,
  };
}

/**
 * Module sets per organization type.
 * Mirrored from ORGANIZATION_TEMPLATES in roles.ts to avoid circular imports.
 */
const ORG_TYPE_MODULE_MAP: Record<string, ModuleCodeValue[]> = {
  embassy: [...ALL_MODULE_CODES],
  high_representation: [...ALL_MODULE_CODES],
  general_consulate: [
    ...CORE_MODULE_CODES,
    ModuleCode.consular_registrations, ModuleCode.consular_notifications, ModuleCode.consular_cards,
    ModuleCode.civil_status, ModuleCode.passports, ModuleCode.visas,
    ModuleCode.associations, ModuleCode.companies, ModuleCode.community_events,
    ModuleCode.finance, ModuleCode.payments,
    ModuleCode.communication, ModuleCode.tutorials, ModuleCode.digital_mail, ModuleCode.meetings,
    ModuleCode.roles, ModuleCode.permissions, ModuleCode.org_config, ModuleCode.services_config,
    ModuleCode.analytics, ModuleCode.monitoring, ModuleCode.statistics,
  ],
  permanent_mission: [
    ...CORE_MODULE_CODES,
    ModuleCode.associations, ModuleCode.companies, ModuleCode.community_events,
    ModuleCode.communication, ModuleCode.tutorials, ModuleCode.digital_mail, ModuleCode.meetings,
    ModuleCode.analytics, ModuleCode.monitoring, ModuleCode.statistics,
  ],
  high_commission: [...ALL_MODULE_CODES],
  honorary_consulate: [
    ...CORE_MODULE_CODES,
    ModuleCode.communication, ModuleCode.meetings,
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
