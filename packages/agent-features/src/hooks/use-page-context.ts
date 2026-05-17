import { usePathname } from "@workspace/routing";
import { useEffect, useMemo, useRef } from "react";
import {
	pageContextStore,
	type FieldSpec,
	type PageAction,
	type PageContextSnapshot,
	type PageEntity,
	type PanelContextSnapshot,
	type ShellContextSnapshot,
} from "../stores/page-context-store";

export type UsePageContextInput = {
	module: string;
	title: string;
	summary: string;
	visibleEntities?: PageEntity[];
	availableActions?: PageAction[];
	scopedToolNames?: string[];
};

/**
 * Déclare le contexte de la page courante auprès de l'assistant IA.
 *
 * À appeler dans un composant client de la page (souvent au plus haut
 * niveau du shell de la page). Le snapshot est publié au montage et
 * effacé au démontage. Re-publié si l'input change (key sérialisée).
 *
 * Pour câbler les handlers d'actions, utiliser `useRegisterPageAction`.
 */
export function usePageContext(input: UsePageContextInput): void {
	const pathname = usePathname();

	// Sérialise pour comparer en valeur (évite les rerenders sur référence).
	const stableKey = useMemo(
		() =>
			JSON.stringify({
				module: input.module,
				pathname,
				title: input.title,
				summary: input.summary,
				visibleEntities: input.visibleEntities ?? [],
				availableActions: input.availableActions ?? [],
				scopedToolNames: input.scopedToolNames ?? [],
			}),
		[
			input.module,
			pathname,
			input.title,
			input.summary,
			input.visibleEntities,
			input.availableActions,
			input.scopedToolNames,
		],
	);

	useEffect(() => {
		const snapshot: PageContextSnapshot = {
			module: input.module,
			pathname,
			title: input.title,
			summary: input.summary,
			visibleEntities: input.visibleEntities ?? [],
			availableActions: input.availableActions ?? [],
			scopedToolNames: input.scopedToolNames ?? [],
			updatedAt: Date.now(),
		};
		pageContextStore.setSnapshot(snapshot);

		return () => {
			// Ne nettoie que si le snapshot publié est encore le nôtre
			// (évite la course quand une autre page se monte avant qu'on démonte).
			const current = pageContextStore.getSnapshot();
			if (current?.pathname === pathname && current.module === input.module) {
				pageContextStore.setSnapshot(null);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stableKey]);
}

/**
 * Enregistre un handler exécutable par l'IA via `executePageAction(actionId)`.
 *
 * - Le handler est remplacé si le composant rerender avec une nouvelle
 *   référence — `useCallback` côté appelant si vous voulez stabiliser.
 * - Désinscrit automatiquement au démontage.
 *
 * S'utilise aussi bien pour les actions page que pour les actions shell —
 * les handlers vivent dans la même map.
 */
export function useRegisterPageAction(
	id: string,
	handler: (params?: Record<string, unknown>) => Promise<unknown> | unknown,
): void {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		const wrapped = async (params?: Record<string, unknown>) => {
			return await handlerRef.current(params);
		};
		const unregister = pageContextStore.registerAction(id, wrapped);
		return unregister;
	}, [id]);
}

/**
 * Enregistre un champ de formulaire pilotable à la voix par iAsted.
 *
 * - Le `setter` reçoit la valeur dictée (déjà normalisée pour les selects via
 *   fuzzy match sur les `options.label`).
 * - Le `getCurrentValue` permet à iAsted de lire la valeur courante (« quel
 *   prénom ai-je saisi ? »).
 * - Le `validator` peut throw une erreur claire — iAsted la lit à voix haute.
 *
 * Désinscrit automatiquement au démontage.
 *
 * Exemple :
 * ```tsx
 * useRegisterPageField("profile.firstName", {
 *   type: "text",
 *   label: "Prénom",
 *   setter: (v) => setFirstName(String(v)),
 *   getCurrentValue: () => firstName,
 *   required: true,
 *   formId: "profile",
 * });
 * ```
 */
export function useRegisterPageField(id: string, spec: FieldSpec): void {
	const specRef = useRef(spec);
	specRef.current = spec;

	useEffect(() => {
		// Wrapper pour permettre au store d'appeler le setter sans capturer
		// la version au moment de l'enregistrement.
		const wrappedSpec: FieldSpec = {
			...spec,
			setter: (value) => specRef.current.setter(value),
			getCurrentValue: spec.getCurrentValue
				? () => specRef.current.getCurrentValue?.()
				: undefined,
			validator: spec.validator
				? (value) => specRef.current.validator?.(value)
				: undefined,
		};
		const unregister = pageContextStore.registerField(id, wrappedSpec);
		return unregister;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		id,
		spec.type,
		spec.label,
		spec.formId,
		spec.required,
		// options sérialisés pour détecter les changements de shape
		JSON.stringify(spec.options ?? []),
	]);
}

export type UseShellContextInput = {
	summary?: string;
	availableActions: PageAction[];
};

/**
 * Déclare le contexte « panel iAsted » — décrit l'onglet de la fenêtre
 * flottante iAsted ouvert par l'utilisateur (iAppel, iContact, iChat,
 * iRéunion, Réglages).
 *
 * À appeler dans chaque composant onglet (`BackofficeCallTab`,
 * `IAstedContactTab`, `CitizenChatTab`…). Le snapshot est publié au
 * montage et effacé au démontage. Re-publié si l'input change.
 *
 * Coexiste avec le snapshot page : la page derrière (ex. `/requests`)
 * reste visible et continue d'exposer ses propres `availableActions`.
 *
 * **Règle d'or sur les `actionId`** : préfixer obligatoirement avec le
 * namespace du tab (`iappel.*`, `icontact.*`, `ichat.*`, `imeeting.*`,
 * `isettings.*`). Les handlers vivent dans la même map que les actions
 * page — sans préfixe, une collision avec une action de la page derrière
 * volerait le handler.
 *
 * Les handlers s'enregistrent via `useRegisterPageAction(id, fn)` comme
 * pour les actions page et shell.
 */
export function usePanelContext(
	input: Omit<PanelContextSnapshot, "updatedAt">,
): void {
	const stableKey = useMemo(
		() =>
			JSON.stringify({
				panelId: input.panelId,
				tabId: input.tabId,
				surface: input.surface,
				title: input.title,
				summary: input.summary,
				// Ne sérialise que les ids+labels des entités pour éviter
				// les boucles React quand `data` change (objet imbriqué).
				visibleEntities: input.visibleEntities.map((e) => ({
					id: e.id,
					type: e.type,
					label: e.label,
				})),
				availableActions: input.availableActions,
			}),
		[
			input.panelId,
			input.tabId,
			input.surface,
			input.title,
			input.summary,
			input.visibleEntities,
			input.availableActions,
		],
	);

	useEffect(() => {
		const snapshot: PanelContextSnapshot = {
			panelId: input.panelId,
			tabId: input.tabId,
			surface: input.surface,
			title: input.title,
			summary: input.summary,
			visibleEntities: input.visibleEntities,
			availableActions: input.availableActions,
			updatedAt: Date.now(),
		};
		pageContextStore.setPanelSnapshot(snapshot);

		return () => {
			// Ne nettoie que si le snapshot publié est encore le nôtre
			// (évite la course quand un autre onglet se monte avant qu'on démonte).
			const current = pageContextStore.getPanelSnapshot();
			if (current?.panelId === input.panelId && current.tabId === input.tabId) {
				pageContextStore.setPanelSnapshot(null);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stableKey]);
}

/**
 * Déclare le contexte « shell » — actions globales disponibles peu importe
 * la page courante (toggle thème, basculer une org, ouvrir un panneau...).
 *
 * À appeler une seule fois dans le composant `AppShell`. Le snapshot est
 * fusionné côté formatter avec le snapshot page pour donner à l'IA la
 * vue complète des actions exécutables.
 *
 * Les handlers s'enregistrent via `useRegisterPageAction(id, fn)` comme
 * pour les actions page (mêmes IDs, même map). Convention : préfixer les
 * IDs shell par `shell.` pour éviter les collisions (`shell.toggle_theme`).
 */
export function useShellContext(input: UseShellContextInput): void {
	const stableKey = useMemo(
		() =>
			JSON.stringify({
				summary: input.summary ?? "",
				availableActions: input.availableActions,
			}),
		[input.summary, input.availableActions],
	);

	useEffect(() => {
		const snapshot: ShellContextSnapshot = {
			summary: input.summary,
			availableActions: input.availableActions,
			updatedAt: Date.now(),
		};
		pageContextStore.setShellSnapshot(snapshot);
		return () => {
			pageContextStore.setShellSnapshot(null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stableKey]);
}
