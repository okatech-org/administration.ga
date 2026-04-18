"use client";

/**
 * Hook qui dérive le contexte de sélection Tiptap pour piloter la sidebar
 * contextuelle (`ContextualFormatPanel`) et la bubble menu. Réactif à
 * chaque `selectionUpdate` ou `focus` de l'éditeur.
 *
 * Retourne l'un de :
 *   - `'text'`        : une sélection de texte est active (range non vide)
 *   - `'table'`       : le curseur est dans une cellule de tableau
 *   - `'placeholder'` : un node placeholder est sélectionné
 *   - `'document'`    : état neutre (aucun focus ou sélection vide hors des cas ci-dessus)
 */

import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";

export type EditorContextKind =
	| "text"
	| "block"
	| "table"
	| "placeholder"
	| "document";

export function useEditorContext(
	editor: Editor | null | undefined,
): EditorContextKind {
	const [ctx, setCtx] = useState<EditorContextKind>("document");

	useEffect(() => {
		if (!editor) {
			setCtx("document");
			return;
		}

		function detect(): EditorContextKind {
			if (!editor) return "document";
			// Placeholder (inline ou bloc) actif ?
			if (
				editor.isActive("placeholder") ||
				editor.isActive("imagePlaceholder") ||
				editor.isActive("signaturePlaceholder")
			) {
				return "placeholder";
			}
			// Dans un tableau ?
			if (editor.isActive("table")) return "table";
			// Sélection non vide → texte
			if (!editor.state.selection.empty) return "text";
			// Curseur dans un bloc éditable (profondeur ≥ 1) → format bloc
			if (editor.state.selection.$from.depth >= 1) return "block";
			// Sinon : document (état neutre = paramètres globaux)
			return "document";
		}

		function update() {
			setCtx(detect());
		}

		editor.on("selectionUpdate", update);
		editor.on("focus", update);
		editor.on("blur", update);
		update();

		return () => {
			editor.off("selectionUpdate", update);
			editor.off("focus", update);
			editor.off("blur", update);
		};
	}, [editor]);

	return ctx;
}
