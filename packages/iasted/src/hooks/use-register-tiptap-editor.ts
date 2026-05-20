/**
 * useRegisterTipTapEditor — Bridge TipTap ↔ pageContextStore.documentEditor
 *
 * Sprint 9 — wiring TipTap (Ronde 3). Branche un éditeur TipTap concret
 * à l'API générique `DocumentEditorHandle` du pageContextStore pour que
 * l'agent vocal iAsted puisse insérer/remplacer/lire du texte dedans via
 * les tools `editor_*`.
 *
 * Usage typique :
 *
 *   const editor = useEditor({ ... });
 *   useRegisterTipTapEditor(editor, { title: documentTitle });
 *
 * Le hook gère :
 *   - register au mount (quand editor est non-null)
 *   - unregister au unmount
 *   - re-register si l'éditeur change
 *
 * Important : ce hook vit dans `@workspace/iasted` mais ne dépend PAS
 * directement de `@tiptap/react` (pour éviter d'imposer cette dep aux
 * consumers qui n'utiliseraient PAS TipTap). Le type `EditorLike` capture
 * juste l'API minimale dont on a besoin via duck typing.
 */

"use client";

import { useEffect } from "react";

/**
 * Sous-ensemble de l'API TipTap dont on a besoin pour le bridge iAsted.
 * Compatible avec `Editor` de `@tiptap/react`. Pas d'import direct.
 */
interface EditorLike {
	commands: {
		insertContent: (content: string) => boolean;
		insertContentAt: (
			position: number | { from: number; to: number },
			content: string,
		) => boolean;
		focus: () => boolean;
	};
	state: {
		doc: { content: { size: number }; textBetween: (from: number, to: number, sep?: string) => string };
		selection: { from: number; to: number };
	};
	getText: () => string;
	getHTML: () => string;
}

interface UseRegisterTipTapEditorOptions {
	/** Titre du document (affiché dans iAsted si demandé via editor_read_state). */
	title?: string;
	/**
	 * Si false, le hook ne register PAS (utile pour suspendre temporairement
	 * — ex. éditeur en mode preview, pas accessible vocalement). Default true.
	 */
	enabled?: boolean;
}

export function useRegisterTipTapEditor(
	editor: EditorLike | null | undefined,
	options: UseRegisterTipTapEditorOptions = {},
): void {
	const { title, enabled = true } = options;
	useEffect(() => {
		if (!enabled || !editor) return;
		// Import dynamique pour éviter dépendance dure agent-features → iasted
		// dans tous les consumers. Côté browser uniquement.
		let unregister: (() => void) | null = null;
		void (async () => {
			try {
				const mod = await import(
					"@workspace/agent-features/stores" as string
				);
				const store = (mod as any).pageContextStore;
				if (!store?.registerDocumentEditor) return;
				const handle = {
					insertText: (text: string) => {
						editor.commands.focus();
						editor.commands.insertContent(text);
					},
					appendParagraph: (text: string) => {
						const endPos = editor.state.doc.content.size;
						editor.commands.insertContentAt(endPos, `<p>${escapeHtml(text)}</p>`);
					},
					replaceSelection: (text: string) => {
						editor.commands.focus();
						editor.commands.insertContent(text);
					},
					getState: () => ({
						plainText: editor.getText(),
						html: editor.getHTML(),
						selectionText: editor.state.doc.textBetween(
							editor.state.selection.from,
							editor.state.selection.to,
							" ",
						),
						title,
					}),
				};
				store.registerDocumentEditor(handle);
				unregister = () => store.registerDocumentEditor(null);
			} catch {
				// agent-features/stores pas dispo (ex. usage hors monorepo) — no-op.
			}
		})();
		return () => {
			if (unregister) unregister();
		};
	}, [editor, enabled, title]);
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
