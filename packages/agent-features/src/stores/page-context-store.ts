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

/**
 * Spec d'un champ de formulaire enregistré par une page via
 * `useRegisterPageField`. Permet à iAsted de remplir un champ par la voix.
 */
export type FieldSpec = {
	/** Type de contrôle. */
	type: "text" | "number" | "date" | "time" | "datetime" | "email" | "tel" | "url" | "select" | "multiselect" | "checkbox" | "radio" | "textarea";
	/** Label affiché à l'utilisateur (sert au modèle pour la résolution fuzzy). */
	label: string;
	/** Setter appliqué quand iAsted dicte une valeur. Reçoit la valeur normalisée. */
	setter: (value: unknown) => void | Promise<void>;
	/** Lecture de la valeur courante (optionnel — sert à read_form_state). */
	getCurrentValue?: () => unknown;
	/** Options pour select/multiselect/radio — { value, label } pour fuzzy-match. */
	options?: Array<{ value: string; label: string }>;
	/** Validation optionnelle — throw avec message clair si invalide. */
	validator?: (value: unknown) => void;
	/** Le champ appartient à ce form (pour grouper plusieurs forms). Défaut : "default". */
	formId?: string;
	/** Champ requis pour soumission. */
	required?: boolean;
};

interface PageContextState {
	snapshot: PageContextSnapshot | null;
	shellSnapshot: ShellContextSnapshot | null;
	actionHandlers: Map<string, PageActionHandler>;
	fields: Map<string, FieldSpec>;
}

const state: PageContextState = {
	snapshot: null,
	shellSnapshot: null,
	actionHandlers: new Map(),
	fields: new Map(),
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

	/**
	 * Enregistre un champ de formulaire fillable par la voix. Retourne un unregister.
	 * Si un champ existe déjà pour cet ID, il est remplacé.
	 */
	registerField(id: string, spec: FieldSpec): () => void {
		state.fields.set(id, spec);
		emit();
		return () => {
			const current = state.fields.get(id);
			if (current === spec) {
				state.fields.delete(id);
				emit();
			}
		};
	},

	getField(id: string): FieldSpec | undefined {
		return state.fields.get(id);
	},

	getFieldsSnapshot(): ReadonlyMap<string, FieldSpec> {
		return state.fields;
	},

	listFieldsForForm(formId: string = "default"): Array<{ id: string; spec: FieldSpec }> {
		const out: Array<{ id: string; spec: FieldSpec }> = [];
		for (const [id, spec] of state.fields) {
			if ((spec.formId ?? "default") === formId) {
				out.push({ id, spec });
			}
		}
		return out;
	},

	/**
	 * Retourne une vue sérialisable des champs courants (sans setters/validateurs).
	 * Utilisé par `formatPageContextForVoice` pour injecter le bloc CHAMPS
	 * DE FORMULAIRE dans le system prompt.
	 */
	getFieldDescriptors(): Array<{
		id: string;
		type: FieldSpec["type"];
		label: string;
		formId: string;
		required: boolean;
		currentValue?: unknown;
		options?: Array<{ value: string; label: string }>;
	}> {
		const out: Array<{
			id: string;
			type: FieldSpec["type"];
			label: string;
			formId: string;
			required: boolean;
			currentValue?: unknown;
			options?: Array<{ value: string; label: string }>;
		}> = [];
		for (const [id, spec] of state.fields) {
			let currentValue: unknown;
			try {
				currentValue = spec.getCurrentValue?.();
			} catch {
				currentValue = undefined;
			}
			out.push({
				id,
				type: spec.type,
				label: spec.label,
				formId: spec.formId ?? "default",
				required: spec.required ?? false,
				currentValue,
				options: spec.options,
			});
		}
		return out;
	},

	/**
	 * Applique une commande de formulaire (fill/clear/submit/read_state) dictée
	 * par iAsted. Centralise la résolution fuzzy pour les selects.
	 * Retourne un message lisible (relayé au modèle via tool result).
	 */
	async applyFormFieldAction(input: {
		action: "fill" | "clear" | "submit" | "read_state";
		fieldId?: string;
		formId?: string;
		value?: unknown;
	}): Promise<{ success: boolean; message: string }> {
		const { action, fieldId, formId, value } = input;

		if (action === "fill" || action === "clear") {
			if (!fieldId) return { success: false, message: "fieldId manquant" };
			const spec = state.fields.get(fieldId);
			if (!spec) {
				return {
					success: false,
					message: `Champ inconnu : ${fieldId}. Liste disponible via read_form_state.`,
				};
			}
			try {
				if (action === "clear") {
					await spec.setter(spec.type === "checkbox" ? false : "");
					return { success: true, message: `Champ « ${spec.label} » effacé.` };
				}
				let resolved: unknown = value;
				if (
					(spec.type === "select" || spec.type === "radio") &&
					spec.options &&
					spec.options.length > 0 &&
					typeof value === "string"
				) {
					const needle = value.trim().toLowerCase();
					const exact = spec.options.find(
						(o) => o.value === value || o.label === value,
					);
					const fuzzy =
						exact ??
						spec.options.find(
							(o) =>
								o.label.toLowerCase().includes(needle) ||
								needle.includes(o.label.toLowerCase()),
						);
					if (fuzzy) resolved = fuzzy.value;
				}
				if (spec.type === "number" && typeof value === "string") {
					const n = Number(value.replace(",", "."));
					if (Number.isFinite(n)) resolved = n;
				}
				if (spec.type === "checkbox") {
					if (typeof value === "string") {
						resolved = /^(oui|true|1|yes|coch)/i.test(value);
					}
				}
				spec.validator?.(resolved);
				await spec.setter(resolved);
				return {
					success: true,
					message: `Champ « ${spec.label} » renseigné.`,
				};
			} catch (e: any) {
				return {
					success: false,
					message: e?.message ?? "Erreur lors du remplissage.",
				};
			}
		}

		if (action === "submit") {
			const fid = formId ?? "default";
			const submitHandler =
				state.actionHandlers.get(`${fid}.submit`) ??
				state.actionHandlers.get("submit") ??
				(() => {
					for (const [id, h] of state.actionHandlers) {
						if (id.endsWith(".submit")) return h;
					}
					return undefined;
				})();
			if (!submitHandler) {
				return {
					success: false,
					message: "Aucun handler de soumission enregistré sur cette page.",
				};
			}
			try {
				await submitHandler();
				return { success: true, message: "Formulaire soumis." };
			} catch (e: any) {
				return {
					success: false,
					message: e?.message ?? "Soumission échouée.",
				};
			}
		}

		if (action === "read_state") {
			const fid = formId ?? "default";
			const fields = pageContextStore.listFieldsForForm(fid);
			if (fields.length === 0) {
				return {
					success: true,
					message: "Aucun champ enregistré sur cette page.",
				};
			}
			const lines = fields.map(({ id, spec }) => {
				let cur: unknown = undefined;
				try {
					cur = spec.getCurrentValue?.();
				} catch {
					cur = undefined;
				}
				const display =
					cur === undefined || cur === "" || cur === null
						? "(vide)"
						: typeof cur === "string"
							? cur
							: JSON.stringify(cur);
				return `- ${spec.label} (${id}) : ${display}`;
			});
			return {
				success: true,
				message: `État du formulaire :\n${lines.join("\n")}`,
			};
		}

		return { success: false, message: `Action inconnue : ${action}` };
	},

	/** Test-only / désinscription d'urgence. */
	clear() {
		state.snapshot = null;
		state.shellSnapshot = null;
		state.actionHandlers.clear();
		state.fields.clear();
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

/**
 * Hook React — descripteurs sérialisables des champs de formulaire courants.
 * Recalculé à chaque émission du store (registerField / removeField).
 * Le résultat est mémoïsé sur un counter pour éviter les boucles infinies.
 */
let fieldsCounter = 0;
function bumpFieldsCounter() {
	fieldsCounter++;
}
// Augmenter le counter à chaque emit pour forcer une nouvelle référence.
listeners.add(bumpFieldsCounter);

export function useFieldDescriptorsSnapshot(): ReturnType<
	typeof pageContextStore.getFieldDescriptors
> {
	const counter = useSyncExternalStore(
		subscribe,
		() => fieldsCounter,
		() => fieldsCounter,
	);
	// `counter` est consommé pour s'abonner ; le calcul est lazy.
	void counter;
	return pageContextStore.getFieldDescriptors();
}
