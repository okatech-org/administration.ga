import { useSyncExternalStore } from "react";

/**
 * Page Context Store — donne à l'assistant IA (iAsted) la conscience
 * de l'écran courant : module, titre, résumé, entités visibles, actions
 * disponibles, et tools backend pertinents pour cette page.
 *
 * Pattern : useSyncExternalStore custom (cohérent avec call-store).
 *
 * Utilisation :
 *   - Une page appelle `usePageContext({ ... })` au montage : le snapshot
 *     est publié, et automatiquement effacé au démontage.
 *   - Une page enregistre un handler d'action via `useRegisterPageAction(id, fn)`.
 *   - Le hook `useAdminAIChat` lit `pageContextStore.getSnapshot()` à chaque
 *     envoi de message et passe `pageContext` au backend Convex.
 *   - Quand le backend renvoie une action `executePageAction(actionId, params)`,
 *     le frontend récupère le handler via `pageContextStore.getActionHandler(id)`.
 */

export type PageEntity = {
	/** ID stable utilisé par l'IA pour référencer l'élément. */
	id: string;
	/** Type d'entité (ex. "agent", "request", "appointment"). */
	type: string;
	/** Label lisible affiché à l'utilisateur. */
	label: string;
	/** Données additionnelles exposées à l'IA (kept small — voir cap ci-dessous). */
	data?: Record<string, unknown>;
};

export type PageAction = {
	/** ID stable, utilisé par l'IA pour déclencher l'action. */
	id: string;
	/** Label lisible (« Imprimer la vue »). */
	label: string;
	/** Description fonctionnelle pour l'IA (« Ouvre le dialogue d'impression »). */
	description: string;
	/** Si true, l'utilisateur doit confirmer avant exécution côté frontend. */
	requiresConfirmation?: boolean;
	/** Code de permission à recheck côté handler (defense in depth). */
	permission?: string;
	/** Schéma JSON-Schema-like des paramètres attendus. */
	params?: Record<string, unknown>;
};

export type PageContextSnapshot = {
	/** Identifiant logique du module (« team-supervision », « requests »). */
	module: string;
	/** Pathname courant (renseigné automatiquement par usePageContext). */
	pathname: string;
	/** Titre lisible de la page. */
	title: string;
	/** Résumé en 1 phrase de l'état courant (filtres appliqués, focus, etc.). */
	summary: string;
	/** Entités visibles à l'écran (cap 50 côté backend). */
	visibleEntities: PageEntity[];
	/** Actions UI déclenchables par l'IA via executePageAction. */
	availableActions: PageAction[];
	/** Tools backend supplémentaires à activer pour cette page. */
	scopedToolNames: string[];
	/** Timestamp de publication — sert au check de fraîcheur. */
	updatedAt: number;
};

/**
 * Snapshot du layer « shell » — actions globales toujours disponibles
 * indépendamment de la page courante (toggle thème, ouvrir la sidebar,
 * basculer une organisation, etc.). Publié par l'AppShell via
 * `useShellContext` et fusionné avec le snapshot page côté formatter.
 */
export type ShellContextSnapshot = {
	/** Résumé court de l'état global (ex. « Thème clair, sidebar étendue »). */
	summary?: string;
	/** Actions globales déclenchables par l'IA via executePageAction. */
	availableActions: PageAction[];
	/** Timestamp de publication. */
	updatedAt: number;
};

/** Limites de sécurité — protègent les tokens et les fuites de données. */
export const PAGE_CONTEXT_LIMITS = {
	MAX_ENTITIES: 50,
	MAX_ACTIONS: 30,
	MAX_SUMMARY_CHARS: 500,
} as const;

type PageActionHandler = (params?: Record<string, unknown>) => Promise<unknown>;

interface PageContextState {
	snapshot: PageContextSnapshot | null;
	shellSnapshot: ShellContextSnapshot | null;
	actionHandlers: Map<string, PageActionHandler>;
}

const state: PageContextState = {
	snapshot: null,
	shellSnapshot: null,
	actionHandlers: new Map(),
};

const listeners = new Set<() => void>();

let snapshotRef: PageContextSnapshot | null = null;
let shellSnapshotRef: ShellContextSnapshot | null = null;

function rebuild() {
	snapshotRef = state.snapshot;
	shellSnapshotRef = state.shellSnapshot;
}

function emit() {
	rebuild();
	for (const l of listeners) l();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return snapshotRef;
}

function getShellSnapshot() {
	return shellSnapshotRef;
}

function clamp<T>(arr: T[], max: number): T[] {
	return arr.length > max ? arr.slice(0, max) : arr;
}

function clampString(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export const pageContextStore = {
	/**
	 * Publie un nouveau snapshot. Les caps appliqués ici protègent
	 * le payload envoyé au LLM (tokens) et limitent les fuites.
	 */
	setSnapshot(input: PageContextSnapshot | null) {
		if (input === null) {
			state.snapshot = null;
			emit();
			return;
		}
		state.snapshot = {
			...input,
			summary: clampString(input.summary, PAGE_CONTEXT_LIMITS.MAX_SUMMARY_CHARS),
			visibleEntities: clamp(
				input.visibleEntities,
				PAGE_CONTEXT_LIMITS.MAX_ENTITIES,
			),
			availableActions: clamp(
				input.availableActions,
				PAGE_CONTEXT_LIMITS.MAX_ACTIONS,
			),
		};
		emit();
	},

	/** Lecture directe (hors React). */
	getSnapshot(): PageContextSnapshot | null {
		return state.snapshot;
	},

	/**
	 * Publie le snapshot du layer shell (actions globales). À appeler
	 * depuis l'AppShell. Les caps s'appliquent comme pour le snapshot page.
	 */
	setShellSnapshot(input: ShellContextSnapshot | null) {
		if (input === null) {
			state.shellSnapshot = null;
			emit();
			return;
		}
		state.shellSnapshot = {
			...input,
			summary: input.summary
				? clampString(input.summary, PAGE_CONTEXT_LIMITS.MAX_SUMMARY_CHARS)
				: input.summary,
			availableActions: clamp(
				input.availableActions,
				PAGE_CONTEXT_LIMITS.MAX_ACTIONS,
			),
		};
		emit();
	},

	getShellSnapshot(): ShellContextSnapshot | null {
		return state.shellSnapshot;
	},

	/**
	 * Enregistre un handler pour une action. Retourne un unregister.
	 * Si un handler existe déjà pour cet ID, il est remplacé.
	 */
	registerAction(id: string, handler: PageActionHandler): () => void {
		state.actionHandlers.set(id, handler);
		return () => {
			const current = state.actionHandlers.get(id);
			if (current === handler) {
				state.actionHandlers.delete(id);
			}
		};
	},

	getActionHandler(id: string): PageActionHandler | undefined {
		return state.actionHandlers.get(id);
	},

	/** Test-only / désinscription d'urgence. */
	clear() {
		state.snapshot = null;
		state.shellSnapshot = null;
		state.actionHandlers.clear();
		emit();
	},

	/** Pour useSyncExternalStore. */
	subscribe,
	getSnapshotForReact: getSnapshot,
};

/** Hook React — read-only sur le snapshot page. */
export function usePageContextSnapshot(): PageContextSnapshot | null {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Hook React — read-only sur le snapshot shell (actions globales). */
export function useShellContextSnapshot(): ShellContextSnapshot | null {
	return useSyncExternalStore(subscribe, getShellSnapshot, getShellSnapshot);
}
