/**
 * Hook de tracking de la zone active parmi trois éditeurs Tiptap.
 *
 * Utilisé par `<TemplateEditor />` pour savoir quelle zone (header, body,
 * footer) reçoit actuellement le focus clavier. Le retour alimente la
 * bubble menu + la sidebar contextuelle, qui doivent suivre l'éditeur
 * actif plutôt que d'être couplés à un seul.
 *
 * Stratégie anti-flicker : quand l'utilisateur clique d'une zone à une
 * autre, on reçoit `blur` (ancienne zone) puis `focus` (nouvelle zone)
 * dans la même tick. Si on setActive(null) sur le blur, la bubble menu
 * disparaît un frame puis réapparaît — clignotement visible. On diffère
 * le blur via `requestAnimationFrame` : s'il est suivi d'un focus dans
 * la foulée, on annule le blur.
 */

import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

export type ActiveZone = "header" | "body" | "footer";

export interface UseActiveEditorArgs {
	header: Editor | null;
	body: Editor | null;
	footer: Editor | null;
	/** Zone active par défaut avant toute interaction. Défaut : "body". */
	initialZone?: ActiveZone;
}

export interface UseActiveEditorResult {
	activeEditor: Editor | null;
	activeZone: ActiveZone;
}

export function useActiveEditor({
	header,
	body,
	footer,
	initialZone = "body",
}: UseActiveEditorArgs): UseActiveEditorResult {
	const [activeZone, setActiveZone] = useState<ActiveZone>(initialZone);
	const pendingBlurRef = useRef<number | null>(null);

	useEffect(() => {
		const editors: Array<{ editor: Editor | null; zone: ActiveZone }> = [
			{ editor: header, zone: "header" },
			{ editor: body, zone: "body" },
			{ editor: footer, zone: "footer" },
		];

		function onFocus(zone: ActiveZone) {
			// Annule un blur en attente : l'utilisateur a bougé d'une zone à
			// l'autre, on met à jour sans clignotement.
			if (pendingBlurRef.current !== null) {
				cancelAnimationFrame(pendingBlurRef.current);
				pendingBlurRef.current = null;
			}
			setActiveZone(zone);
		}

		function onBlur() {
			// Diffère : si un focus arrive dans la RAF suivante, on l'ignore
			// (géré par onFocus). Sinon, on garde `activeZone` tel quel —
			// décision : ne PAS réinitialiser sur blur seul, pour que la
			// sidebar contextuelle garde son état quand l'utilisateur clique
			// ailleurs dans l'UI.
			if (pendingBlurRef.current !== null) {
				cancelAnimationFrame(pendingBlurRef.current);
			}
			pendingBlurRef.current = requestAnimationFrame(() => {
				pendingBlurRef.current = null;
				// Intentionnel : on ne touche pas à `activeZone` ici.
			});
		}

		const handlers = editors
			.filter((e): e is { editor: Editor; zone: ActiveZone } => e.editor !== null)
			.map(({ editor, zone }) => {
				const focusHandler = () => onFocus(zone);
				const blurHandler = () => onBlur();
				editor.on("focus", focusHandler);
				editor.on("blur", blurHandler);
				return { editor, focusHandler, blurHandler };
			});

		return () => {
			if (pendingBlurRef.current !== null) {
				cancelAnimationFrame(pendingBlurRef.current);
				pendingBlurRef.current = null;
			}
			for (const { editor, focusHandler, blurHandler } of handlers) {
				editor.off("focus", focusHandler);
				editor.off("blur", blurHandler);
			}
		};
	}, [header, body, footer]);

	const activeEditor =
		activeZone === "header"
			? header
			: activeZone === "footer"
				? footer
				: body;

	return { activeEditor, activeZone };
}
