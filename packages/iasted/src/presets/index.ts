/**
 * Presets — stubs Phase 1.
 *
 * Chaque preset définit la liste des onglets, les items du CircleMenu
 * (si applicable) et les flags de capacité.
 *
 * Les presets sont complétés au fil des phases :
 * - Phase 2 : citizen (contenu complet, multi-agents, historique)
 * - Phase 3 : agent (slot callQueueSlot, macros, fiche 360°)
 * - Phase 4 : backoffice (config editor) + agent-desktop (windowMode native)
 */

import type { IAstedPreset, IAstedTabDefinition } from "../types/iasted";

// ─────────────────────────────────────────────────────────────
// Définitions d'onglets partagées
// ─────────────────────────────────────────────────────────────

export const TAB_DEFINITIONS: Record<string, IAstedTabDefinition> = {
	ichat: {
		id: "ichat",
		labelKey: "iasted.tabs.ichat",
		fallbackLabel: "iChat",
		iconName: "MessageSquare",
	},
	icall: {
		id: "icall",
		labelKey: "iasted.tabs.icall",
		fallbackLabel: "iAppel",
		iconName: "Phone",
	},
	icontact: {
		id: "icontact",
		labelKey: "iasted.tabs.icontact",
		fallbackLabel: "iContact",
		iconName: "Contact",
	},
	imeeting: {
		id: "imeeting",
		labelKey: "iasted.tabs.imeeting",
		fallbackLabel: "iRéunion",
		iconName: "Video",
	},
	iqueue: {
		id: "iqueue",
		labelKey: "iasted.tabs.iqueue",
		fallbackLabel: "File",
		iconName: "Inbox",
	},
	ivoicemail: {
		id: "ivoicemail",
		labelKey: "iasted.tabs.ivoicemail",
		fallbackLabel: "Messagerie",
		iconName: "Voicemail",
	},
	isettings: {
		id: "isettings",
		labelKey: "iasted.tabs.isettings",
		fallbackLabel: "Réglages",
		iconName: "Settings",
	},
	ivoice: {
		id: "ivoice",
		labelKey: "iasted.tabs.ivoice",
		fallbackLabel: "iVocal",
		iconName: "Mic",
	},
};

// ─────────────────────────────────────────────────────────────
// Citizen preset (stub Phase 1 — complété Phase 2)
// ─────────────────────────────────────────────────────────────

export const citizenPreset: IAstedPreset = {
	id: "citizen",
	tabs: ["ichat", "icall", "icontact", "ivoice"],
	circleMenuItems: [
		{
			id: "mr-ray",
			labelKey: "iasted.circle.mrRay",
			fallbackLabel: "Mr Ray",
			iconName: "Headphones",
			className: "bg-rose-500 text-white",
		},
		{
			id: "ichat",
			labelKey: "iasted.circle.ichat",
			fallbackLabel: "iChat",
			iconName: "MessageSquare",
			className: "bg-emerald-600 text-white",
			opensTab: "ichat",
		},
		{
			id: "icall",
			labelKey: "iasted.circle.icall",
			fallbackLabel: "iAppel",
			iconName: "Phone",
			className: "bg-gabon-blue text-white",
			opensTab: "icall",
		},
		{
			id: "icontact",
			labelKey: "iasted.circle.icontact",
			fallbackLabel: "iContact",
			iconName: "Contact",
			className: "bg-amber-500 text-white",
			opensTab: "icontact",
		},
		{
			id: "ivoice",
			labelKey: "iasted.circle.ivoice",
			fallbackLabel: "iVocal",
			iconName: "Mic",
			className: "bg-violet-600 text-white",
			opensTab: "ivoice",
		},
	],
	flags: {
		supportsMultiAgent: true,
		windowMode: "docked",
	},
	triggerClassName: "bg-foreground",
};

// ─────────────────────────────────────────────────────────────
// Agent preset (Phase 3)
//
// Les 5 onglets reflètent l'ordre actuel de IAstedWindow (agent-web) :
// ichat → icontact → icall → imeeting → isettings.
//
// Le `hasCallQueueSlot: true` autorise le consumer à injecter un composant
// depuis `apps/agent-web/src/components/call-center/` (ex : <CallCenterShell>)
// via la prop `callQueueSlot` de WindowShell. Phase 3 respecte la
// coexistence iAsted ↔ call-center (cf. plan §Coordination avec call-center).
// ─────────────────────────────────────────────────────────────

export const agentPreset: IAstedPreset = {
	id: "agent",
	// La messagerie vocale n'est plus un onglet à part entière : elle est
	// désormais accessible depuis l'onglet iAppel (sous-cas des appels).
	tabs: ["ichat", "icontact", "icall", "imeeting", "ivoice", "isettings"],
	flags: {
		hasCallQueueSlot: true,
		windowMode: "docked",
	},
	// Trigger primary color (DS v3) — distingue visuellement de citizen (achromatique).
	triggerClassName: "bg-primary",
};

// ─────────────────────────────────────────────────────────────
// Backoffice preset (stub Phase 1 — complété Phase 4)
// ─────────────────────────────────────────────────────────────

export const backofficePreset: IAstedPreset = {
	id: "backoffice",
	tabs: ["ichat", "icontact", "icall", "imeeting", "ivoice", "isettings"],
	flags: {
		supportsConfigEditor: true,
		windowMode: "docked",
	},
	triggerClassName: "bg-foreground",
};

// ─────────────────────────────────────────────────────────────
// Agent-desktop preset (stub Phase 1 — complété Phase 4)
// ─────────────────────────────────────────────────────────────

export const agentDesktopPreset: IAstedPreset = {
	id: "agent-desktop",
	tabs: ["ichat", "icontact", "icall", "imeeting", "ivoice", "isettings"],
	flags: {
		hasCallQueueSlot: true,
		windowMode: "docked-native",
	},
	triggerClassName: "bg-primary",
};

export const presets = {
	citizen: citizenPreset,
	agent: agentPreset,
	backoffice: backofficePreset,
	"agent-desktop": agentDesktopPreset,
} as const;
