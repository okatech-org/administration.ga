/**
 * CitizenIAstedVoiceProvider — Wrapper qui publie le voiceController iAsted
 * dans le Context React du package `@workspace/iasted`, scope a l'espace
 * ressortissant (consulat.ga / /my-space).
 *
 * Doit etre monte AU-DESSUS de `<CitizenIAstedWindow>` pour que celui-ci
 * recupere un voiceController non-null via `useIAstedVoiceController()`.
 *
 * Le `<CitizenIAstedWindow>` est lui-meme rendu dans `MySpaceWrapper`, donc
 * ce provider est wrappe au meme niveau (cf. my-space-wrapper.tsx).
 *
 * Equivalent fonctionnel du `IAstedVoiceProvider` d'agent-web mais :
 *   - utilise OpenAI Realtime DIRECTEMENT (pas de dispatcher provider-
 *     agnostique — decision produit canonique sur consulat.ga, cf. memory)
 *   - sans `OrgProvider` (le ressortissant n'est pas membre d'une org)
 *
 * Le voiceController publie ici survit a la fermeture de la fenetre
 * flottante iAsted (la session WebRTC reste ouverte tant que l'utilisateur
 * n'a pas explicitement raccroche), conformement a l'UX attendue : on peut
 * fermer la fenetre tout en continuant a parler.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import {
	IAstedVoiceContext,
	formatPageContextForVoice,
} from "@workspace/iasted";
import {
	useCallStore,
	useDocumentTextSnapshot,
	useFieldDescriptorsSnapshot,
	usePageContextSnapshot,
	usePanelContextSnapshot,
	useShellContextSnapshot,
} from "@workspace/agent-features/stores";
import { useCitizenIAstedHost } from "./use-citizen-iasted-host";

export function CitizenIAstedVoiceProvider({
	children,
}: {
	children: ReactNode;
}) {
	const controller = useCitizenIAstedHost();

	// ── Raccourci clavier global Cmd+Shift+V (mac) / Ctrl+Shift+V (Win/Linux)
	// pour activer/desactiver le mode vocal. Bypass si focus dans un champ
	// texte (saisie utilisateur prioritaire). ──
	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			const isShortcut =
				(event.metaKey || event.ctrlKey) &&
				event.shiftKey &&
				(event.key === "V" || event.key === "v");
			if (!isShortcut) return;
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				(target && (target as HTMLElement).isContentEditable)
			) {
				return;
			}
			event.preventDefault();
			if (controller.isConnected) {
				void controller.deactivateVoice();
			} else {
				void controller.activateVoice();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [controller]);

	// ── Synchronisation contexte page → session vocale. ──
	// Toute page de citizen-web qui publie un snapshot (titre, entites
	// visibles, actions disponibles, champs de formulaire) via les hooks
	// agent-features (`usePageContext`, `useRegisterPageAction`, …) voit
	// son etat injecte au modele via `session.update`. Debounce 150 ms
	// pour absorber les transitions de navigation. ──
	const pageSnapshot = usePageContextSnapshot();
	const shellSnapshot = useShellContextSnapshot();
	const panelSnapshot = usePanelContextSnapshot();
	const fieldsSnapshot = useFieldDescriptorsSnapshot();
	const { activeSlotId } = useCallStore();
	const meetingInProgress = activeSlotId !== null;
	const documentText = useDocumentTextSnapshot();

	useEffect(() => {
		if (!controller.isConnected) return;
		if (!controller.capabilities.pageContextUpdate) return;
		if (!controller.updatePageContext) return;
		const update = controller.updatePageContext;
		const timer = setTimeout(() => {
			update(
				formatPageContextForVoice({
					page: pageSnapshot,
					shell: shellSnapshot,
					panel: panelSnapshot,
					fields: fieldsSnapshot,
					meetingInProgress,
					documentText,
				}),
			);
		}, 150);
		return () => clearTimeout(timer);
	}, [
		pageSnapshot,
		shellSnapshot,
		panelSnapshot,
		fieldsSnapshot,
		meetingInProgress,
		documentText,
		controller.isConnected,
		controller.capabilities.pageContextUpdate,
		controller.updatePageContext,
	]);

	return (
		<IAstedVoiceContext.Provider value={controller}>
			{children}
		</IAstedVoiceContext.Provider>
	);
}
