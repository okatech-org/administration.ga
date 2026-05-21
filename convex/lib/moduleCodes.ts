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
  statistics: "statistics",

  // Administration
  settings: "settings",

  // Supervision réseau (exclusifs aux organismes de type "ministry")
  // Ces modules donnent une vue agrégée en lecture seule des organismes
  // rattachés au ministère via parentOrgId. Ils ne peuvent pas être activés
  // sur un consulat/ambassade — validation côté mutation.
  network_diplomatic_oversight: "network_diplomatic_oversight",
  network_correspondence_oversight: "network_correspondence_oversight",
  network_intelligence: "network_intelligence",
  // Renseignement diplomatique (services). Cloisonné, ministry-only.
  intelligence: "intelligence",

  // ─── Phase 1 administration.ga ────────────────────────────────
  // Modules du noyau étendu pour l'administration publique gabonaise,
  // cf. ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md §6.
  // iCorrespondance/iDocument/iAgenda/iCom existent déjà sous les codes
  // canoniques anglophones (correspondence/documents/calendar/messaging).
  // Trois modules supplémentaires nécessitent un code top-level dédié :
  iasted: "iasted", // Assistant IA institutionnel (RAG sur docs autorisés)
  iarchive: "iarchive", // Archive longue durée (rétention, non-altération)
  iboite: "iboite", // Messagerie institutionnelle informelle (inbox, accusés)
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
  | "administration"
  | "network"
  | "intelligence"
  // Phase 1 administration.ga : catégorie "noyau administratif" pour les
  // modules supplémentaires (iAsted, iArchive, iBoîte) qui complètent iBureau.
  | "noyau_administratif";

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
// CONVEX VALIDATOR — canonical only
// ═══════════════════════════════════════════════════════════════

export const moduleCodeValidator = v.union(
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
  v.literal("statistics"),
  v.literal("settings"),
  // Supervision réseau (ministry-only)
  v.literal("network_diplomatic_oversight"),
  v.literal("network_correspondence_oversight"),
  v.literal("network_intelligence"),
  v.literal("intelligence"),
  // Phase 1 administration.ga — noyau administratif
  v.literal("iasted"),
  v.literal("iarchive"),
  v.literal("iboite"),
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
      fr: "Courriers officiels et démarches administratives (CNI, passeport, casier judiciaire, etc.)",
      en: "Official correspondence and administrative procedures (ID card, passport, criminal record, etc.)",
    },
    icon: "Mail",
    color: "text-cyan-500",
    category: "ibureau",
    isCore: false,
    capabilities: [
      { code: "incoming", label: { fr: "Courrier entrant", en: "Incoming" } },
      { code: "outgoing", label: { fr: "Courrier sortant", en: "Outgoing" } },
      { code: "registry", label: { fr: "Registre", en: "Registry" } },
      { code: "demarches", label: { fr: "Démarches administratives", en: "Administrative procedures" } },
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

  // ─── Réseau diplomatique (ministry-only) ──────────────────
  network_diplomatic_oversight: {
    code: "network_diplomatic_oversight",
    label: { fr: "Pipeline réseau", en: "Network Pipeline" },
    description: {
      fr: "Vue consolidée du pipeline diplomatique des organismes rattachés",
      en: "Consolidated view of the diplomatic pipeline across subordinate orgs",
    },
    icon: "Network",
    color: "text-red-500",
    category: "network",
    isCore: false,
    capabilities: [
      { code: "targets", label: { fr: "Cibles consolidées", en: "Consolidated targets" } },
      { code: "plans", label: { fr: "Plans stratégiques", en: "Strategic plans" } },
      { code: "projects", label: { fr: "Projets de coopération", en: "Cooperation projects" } },
    ],
  },
  network_correspondence_oversight: {
    code: "network_correspondence_oversight",
    label: { fr: "Correspondance réseau", en: "Network Correspondence" },
    description: {
      fr: "Courriers du réseau diplomatique, lecture seule",
      en: "Network correspondence, read-only",
    },
    icon: "Mailbox",
    color: "text-cyan-500",
    category: "network",
    isCore: false,
    capabilities: [
      { code: "incoming", label: { fr: "Courriers entrants", en: "Incoming" } },
      { code: "outgoing", label: { fr: "Courriers sortants", en: "Outgoing" } },
      { code: "circulars", label: { fr: "Circulaires", en: "Circulars" } },
    ],
  },
  network_intelligence: {
    code: "network_intelligence",
    label: { fr: "Intelligence réseau", en: "Network Intelligence" },
    description: {
      fr: "Tableau de bord exécutif et KPI agrégés par organisme rattaché",
      en: "Executive dashboard and KPIs aggregated by subordinate org",
    },
    icon: "BarChart3",
    color: "text-amber-500",
    category: "network",
    isCore: false,
    capabilities: [
      { code: "kpis", label: { fr: "KPI consolidés", en: "Consolidated KPIs" } },
      { code: "breakdown", label: { fr: "Répartition par poste", en: "Per-post breakdown" } },
      { code: "exports", label: { fr: "Exports", en: "Exports" } },
    ],
  },
  intelligence: {
    code: "intelligence",
    label: { fr: "Renseignement", en: "Intelligence" },
    description: {
      fr: "Module de renseignement souverain : profils, notes confidentielles, cartographie, dossiers",
      en: "Sovereign intelligence module: profiles, confidential notes, mapping, cases",
    },
    icon: "ShieldAlert",
    color: "text-rose-500",
    category: "intelligence",
    isCore: false,
    capabilities: [
      { code: "profiles", label: { fr: "Profils surveillés", en: "Watched profiles" } },
      { code: "notes", label: { fr: "Notes confidentielles", en: "Confidential notes" } },
      { code: "map", label: { fr: "Cartographie", en: "Map" } },
    ],
  },

  // ─── Noyau administratif (Phase 1 administration.ga) ──────────
  // Trois modules supplémentaires complétant iBureau pour la spécificité
  // de l'administration publique gabonaise.
  iasted: {
    code: "iasted",
    label: { fr: "iAsted", en: "iAsted" },
    description: {
      fr: "Assistant IA institutionnel — RAG sur les documents autorisés, dans le respect strict des permissions",
      en: "Institutional AI assistant — RAG on authorized documents, with strict permissions enforcement",
    },
    icon: "Sparkles",
    color: "text-violet-500",
    category: "noyau_administratif",
    isCore: false,
    capabilities: [
      { code: "rag", label: { fr: "Recherche augmentée", en: "Retrieval augmented" } },
      { code: "voice", label: { fr: "Mode vocal", en: "Voice mode" } },
      { code: "compose", label: { fr: "Composition assistée", en: "Assisted composition" } },
    ],
  },
  iarchive: {
    code: "iarchive",
    label: { fr: "iArchive", en: "iArchive" },
    description: {
      fr: "Archive longue durée — règles de rétention, verrouillage non-altération, audit immuable",
      en: "Long-term archive — retention policies, immutability locking, immutable audit",
    },
    icon: "Archive",
    color: "text-amber-500",
    category: "noyau_administratif",
    isCore: false,
    capabilities: [
      { code: "retention", label: { fr: "Politiques de rétention", en: "Retention policies" } },
      { code: "lock", label: { fr: "Verrouillage", en: "Lock" } },
      { code: "audit", label: { fr: "Audit immuable", en: "Immutable audit" } },
      { code: "destruction", label: { fr: "Destruction réglementaire", en: "Regulated destruction" } },
    ],
  },
  iboite: {
    code: "iboite",
    label: { fr: "iBoîte", en: "iBoîte" },
    description: {
      fr: "Messagerie institutionnelle informelle — inbox, notifications de workflow, accusés de réception",
      en: "Informal institutional mailbox — inbox, workflow notifications, read receipts",
    },
    icon: "Inbox",
    color: "text-cyan-500",
    category: "noyau_administratif",
    isCore: false,
    capabilities: [
      { code: "inbox", label: { fr: "Boîte de réception", en: "Inbox" } },
      { code: "receipts", label: { fr: "Accusés de réception", en: "Read receipts" } },
      { code: "workflow_notifs", label: { fr: "Notifications workflow", en: "Workflow notifications" } },
    ],
  },
};

/**
 * Codes des modules de supervision réseau, exclusifs au type d'organisme
 * "ministry". Utilisé pour rejeter toute tentative d'activation sur un autre
 * type d'organisme (cf. orgs.create / update validation).
 */
export const NETWORK_MODULE_CODES: ModuleCodeValue[] = [
  "network_diplomatic_oversight",
  "network_correspondence_oversight",
  "network_intelligence",
];

export function isNetworkModule(code: string): boolean {
  return (NETWORK_MODULE_CODES as string[]).includes(code);
}

/**
 * Codes des modules exclusifs au type d'organisme "intelligence_agency".
 * Le module `intelligence` (et ses extensions futures : cases, TAL, GEOINT,
 * briefings) ne peut être activé que sur un organisme de renseignement
 * souverain — pas sur un ministère, consulat ou ambassade. Symétriquement,
 * une intelligence_agency ne peut activer QUE des modules de cette catégorie
 * (pas de courrier, pas de RDV, pas de team management standard).
 */
export const INTELLIGENCE_AGENCY_MODULE_CODES: ModuleCodeValue[] = [
  "intelligence",
];

export function isIntelligenceAgencyModule(code: string): boolean {
  return (INTELLIGENCE_AGENCY_MODULE_CODES as string[]).includes(code);
}

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
      "consular_notifications.view",
    ],
    editor: [
      "requests.view", "requests.create", "requests.process", "requests.validate", "requests.complete",
      "consular_registrations.view", "consular_registrations.manage",
      "consular_notifications.view",
      "consular_cards.manage",
      "civil_status.transcribe", "civil_status.register",
      "passports.process", "passports.biometric",
      "visas.process", "visas.approve",
    ],
    admin: [
      "requests.view", "requests.create", "requests.process", "requests.validate", "requests.assign", "requests.delete", "requests.complete",
      "consular_registrations.view", "consular_registrations.manage",
      "consular_notifications.view",
      "consular_cards.manage",
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
  // ─── Réseau diplomatique (ministry-only) ──────────────────
  // Lecture seule cross-org : reader = consultation, editor = filtres avancés
  // + exports, admin = configuration des filtres partagés.
  network_diplomatic_oversight: {
    reader: ["network.diplomatic.view"],
    editor: ["network.diplomatic.view", "network.diplomatic.export"],
    admin: ["network.diplomatic.view", "network.diplomatic.export", "network.diplomatic.configure"],
  },
  network_correspondence_oversight: {
    reader: ["network.correspondence.view"],
    editor: ["network.correspondence.view", "network.correspondence.export"],
    admin: ["network.correspondence.view", "network.correspondence.export", "network.correspondence.configure"],
  },
  network_intelligence: {
    reader: ["network.intelligence.view"],
    editor: ["network.intelligence.view", "network.intelligence.export"],
    admin: ["network.intelligence.view", "network.intelligence.export", "network.intelligence.configure"],
  },
  // ─── Phase 1 administration.ga ────────────────────────────────
  iasted: {
    reader: ["iasted.view"],
    editor: ["iasted.view", "iasted.invoke"],
    admin: ["iasted.view", "iasted.invoke", "iasted.configure"],
  },
  iarchive: {
    reader: ["iarchive.view"],
    editor: ["iarchive.view", "iarchive.deposit", "iarchive.search"],
    admin: [
      "iarchive.view",
      "iarchive.deposit",
      "iarchive.search",
      "iarchive.configure_retention",
      "iarchive.lock",
      "iarchive.destruct",
    ],
  },
  iboite: {
    reader: ["iboite.view"],
    editor: ["iboite.view", "iboite.send", "iboite.acknowledge"],
    admin: [
      "iboite.view",
      "iboite.send",
      "iboite.acknowledge",
      "iboite.configure",
    ],
  },
  intelligence: {
    reader: [
      "intelligence.profiles.view",
      "intelligence.notes.view",
      "intelligence.map.view",
      "intelligence.watchlists.view",
      "intelligence.links.view",
      "intelligence.cases.view",
    ],
    editor: [
      "intelligence.profiles.view",
      "intelligence.profiles.search",
      "intelligence.profiles.export",
      "intelligence.notes.view",
      "intelligence.notes.create",
      "intelligence.notes.delete_own",
      "intelligence.map.view",
      "intelligence.watchlists.view",
      "intelligence.watchlists.manage",
      "intelligence.links.view",
      "intelligence.links.manage",
      "intelligence.briefing.generate",
      "intelligence.cases.view",
      "intelligence.cases.create",
      "intelligence.cases.edit",
    ],
    admin: [
      "intelligence.profiles.view",
      "intelligence.profiles.search",
      "intelligence.profiles.export",
      "intelligence.notes.view",
      "intelligence.notes.create",
      "intelligence.notes.delete_own",
      "intelligence.notes.delete_any",
      "intelligence.map.view",
      "intelligence.watchlists.view",
      "intelligence.watchlists.manage",
      "intelligence.links.view",
      "intelligence.links.manage",
      "intelligence.briefing.generate",
      "intelligence.cases.view",
      "intelligence.cases.create",
      "intelligence.cases.edit",
      "intelligence.cases.close",
      "intelligence.cases.archive",
      "intelligence.configure",
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
  network: { fr: "Réseau diplomatique", en: "Diplomatic Network" },
  intelligence: { fr: "Renseignement", en: "Intelligence" },
  noyau_administratif: { fr: "Noyau administratif", en: "Administrative Core" },
};

export const CATEGORY_ORDER: ModuleCategory[] = [
  "operations",
  "ibureau",
  "noyau_administratif",
  "gestion",
  "administration",
  "network",
  "intelligence",
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
    key: "noyau_administratif",
    label: { fr: "Noyau administratif", en: "Administrative Core" },
    icon: "Sparkles",
    modules: [
      "iasted",
      "iarchive",
      "iboite",
    ],
  },
  {
    key: "gestion",
    label: { fr: "Gestion", en: "Management" },
    icon: "BarChart3",
    modules: [
      "team",
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
  {
    key: "network",
    label: { fr: "Réseau diplomatique", en: "Diplomatic Network" },
    icon: "Network",
    modules: [
      "network_diplomatic_oversight",
      "network_correspondence_oversight",
      "network_intelligence",
    ],
  },
  {
    key: "intelligence",
    label: { fr: "Renseignement", en: "Intelligence" },
    icon: "ShieldAlert",
    modules: [
      "intelligence",
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
  intelligence_agency: [
    "profile",
    "team",
    "settings",
    "messaging",
    "intelligence",
  ],
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
  intelligence_agency: "Agence de Renseignement",
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
  intelligence_agency: "",
};
