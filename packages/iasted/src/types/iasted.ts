/**
 * Types partagés pour le module iAsted.
 *
 * Reflètent les surfaces d'interface (citizen / agent / backoffice / agent-desktop),
 * les onglets disponibles, et le contexte utilisateur consommé par le WindowShell.
 */

// ─────────────────────────────────────────────────────────────
// Surfaces (les 4 apps consommatrices)
// ─────────────────────────────────────────────────────────────

export type IAstedSurface = "citizen" | "agent" | "backoffice" | "agent-desktop";

// ─────────────────────────────────────────────────────────────
// Onglets — union de tous les ID possibles ; chaque preset
// déclare la sous-liste qu'il utilise.
// ─────────────────────────────────────────────────────────────

export type IAstedTabId =
	| "ichat"
	| "icall"
	| "icontact"
	| "imeeting"
	| "iqueue"
	| "ivoicemail"
	| "isettings";

export interface IAstedTabDefinition {
	id: IAstedTabId;
	/** Clé i18n (ex : "iasted.tabs.ichat"). */
	labelKey: string;
	/** Label de fallback si i18n absent (ne pas afficher directement, utiliser labelKey). */
	fallbackLabel: string;
	/** Nom de l'icône Lucide (ex : "MessageSquare"). */
	iconName: string;
}

// ─────────────────────────────────────────────────────────────
// Context runtime (consommé par le WindowShell via Context API)
// ─────────────────────────────────────────────────────────────

export interface IAstedContextValue {
	/** ID Convex de l'organisation active. */
	orgId: string;
	/** ID Convex de l'utilisateur courant. */
	userId: string;
	/** Surface qui rend le module. */
	surface: IAstedSurface;
	/** Rôle fonctionnel de l'utilisateur. */
	role: "citizen" | "agent" | "admin" | "superadmin";
	/** Locale active (ex : "fr-FR"). */
	locale?: string;
}

// ─────────────────────────────────────────────────────────────
// Presets — contrat d'une surface
// ─────────────────────────────────────────────────────────────

export interface IAstedPreset {
	/** Identifiant unique du preset. */
	id: IAstedSurface;
	/** Onglets activés dans ce preset, dans l'ordre d'affichage. */
	tabs: IAstedTabId[];
	/** Items exposés par le CircleMenu (facultatif, seul citizen en a). */
	circleMenuItems?: CircleMenuItemSpec[];
	/** Flags capacitaires. */
	flags: IAstedPresetFlags;
	/**
	 * Classe Tailwind optionnelle pour le trigger du CircleMenu.
	 * Citizen : `bg-foreground` (achromatique) · Agent : `bg-primary`.
	 */
	triggerClassName?: string;
}

export interface IAstedPresetFlags {
	/** Le preset supporte plusieurs agents assignés à une même conversation citoyen. */
	supportsMultiAgent?: boolean;
	/** Le preset supporte l'édition de la config iAsted (backoffice). */
	supportsConfigEditor?: boolean;
	/** Mode fenêtre : "docked" (ancrée bottom-right) ou "docked-native" (Electron). */
	windowMode?: "docked" | "docked-native";
	/** Le preset expose un slot `callQueueSlot` pour injection call-center. */
	hasCallQueueSlot?: boolean;
}

export interface CircleMenuItemSpec {
	/** Identifiant de l'item (utilisé pour le routage). */
	id: string;
	/** Clé i18n du label. */
	labelKey: string;
	/** Label de fallback. */
	fallbackLabel: string;
	/** Nom de l'icône Lucide. */
	iconName: string;
	/** Classe Tailwind de fond (ex : "bg-emerald-600", "bg-gabon-blue"). */
	className?: string;
	/** Route Next.js optionnelle. */
	href?: string;
	/** Si ouvre un onglet iAsted, son ID. */
	opensTab?: IAstedTabId;
}

// Note : `WindowShellProps` est défini dans components/window/WindowShell.tsx
// et ré-exporté depuis components/window/index.ts + src/index.ts.
