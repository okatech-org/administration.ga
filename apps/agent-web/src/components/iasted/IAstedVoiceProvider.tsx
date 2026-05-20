/**
 * IAstedVoiceProvider — Wrapper qui publie le voiceController iAsted dans
 * le Context React du package `@workspace/iasted`.
 *
 * Doit être monté SOUS `<OrgProvider>` (interne à `AppShell`) car
 * `useIAstedHost` dépend de `useOrg()`. Pour cette raison, on l'injecte
 * via le slot `wrapWithAIPresence` de `AppShell` qui wrappe `shellBody`
 * (lequel est rendu après `<OrgProvider>` dans `DashboardLayout`).
 *
 * Le `<IAstedWindow>` consomme le context via `useIAstedVoiceController()`.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import {
	IAstedVoiceContext,
	formatPageContextForVoice,
} from "@workspace/iasted";
import { useVoiceProvider } from "./use-voice-provider";
import { RawGeminiVoiceProvider } from "@workspace/agent-features/components/iasted-host";
import {
	useCallStore,
	useDocumentTextSnapshot,
	useFieldDescriptorsSnapshot,
	usePageContextSnapshot,
	usePanelContextSnapshot,
	useShellContextSnapshot,
} from "@workspace/agent-features/stores";

export function IAstedVoiceProvider({ children }: { children: ReactNode }) {
	return (
		<RawGeminiVoiceProvider>
			<IAstedVoiceControllerProvider>
				{children}
			</IAstedVoiceControllerProvider>
		</RawGeminiVoiceProvider>
	);
}

/**
 * Sous-composant interne : doit être monté DANS `<RawGeminiVoiceProvider>`
 * pour que `useVoiceProvider` puisse lire l'instance Gemini singleton
 * via `useRawGeminiVoice`.
 */
function IAstedVoiceControllerProvider({ children }: { children: ReactNode }) {
	// Le controller est publié au niveau de l'AppShell — sa session
	// (WebSocket Gemini ou WebRTC OpenAI) survit donc à la fermeture
	// de la fenêtre flottante iAsted, conformément à l'UX attendue.
	const controller = useVoiceProvider();

	// Raccourci clavier global pour activer/désactiver la conversation
	// vocale : Cmd+Shift+V (mac) ou Ctrl+Shift+V (Windows / Linux).
	// On évite de capturer la combinaison si l'utilisateur a le focus
	// dans un champ texte/textarea/contenteditable (saisie utilisateur
	// prioritaire — il pourrait taper un V majuscule).
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

	// ── Synchronisation contexte page → session vocale ──
	// Toute page d'agent-features publie son snapshot via `usePageContext`.
	// Quand le snapshot change pendant une session vocale active, on
	// pousse le bloc texte formaté via `controller.updatePageContext`
	// si le provider courant supporte cette capability. Debounce léger
	// pour absorber les republications transitoires lors d'une navigation.
	const pageSnapshot = usePageContextSnapshot();
	const shellSnapshot = useShellContextSnapshot();
	const panelSnapshot = usePanelContextSnapshot();
	const fieldsSnapshot = useFieldDescriptorsSnapshot();
	// Sprint 4 — B4 : drapeau « réunion LiveKit active » → injecté en tête
	// du contexte page. Le modèle active alors la règle « voix très brève ».
	const { activeSlotId } = useCallStore();
	const meetingInProgress = activeSlotId !== null;
	// Sprint 6.5 — C4 : texte extrait du document ouvert (PDF, image OCR).
	// Injecté sous `## DOCUMENT À L'ÉCRAN` dans le pageContext.
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
