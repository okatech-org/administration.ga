import { usePathname } from "@workspace/routing";
import { useEffect, useMemo, useRef } from "react";
import {
	pageContextStore,
	type PageAction,
	type PageContextSnapshot,
	type PageEntity,
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

export type UseShellContextInput = {
	summary?: string;
	availableActions: PageAction[];
};

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
