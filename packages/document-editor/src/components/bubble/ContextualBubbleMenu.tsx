"use client";

/**
 * Toolbar contextuelle flottante (style Apple Pages / Adobe Acrobat).
 *
 * Remplace complètement la `EditorToolbar` fixe en haut du canvas. Apparaît
 * automatiquement au-dessus de la sélection, adapte son contenu selon le
 * contexte :
 *
 *   - `text`        : Gras + Police + Taille + Alignement (sélection dans paragraphe)
 *   - `block`       : Alignement + Monter/Descendre + Supprimer (curseur dans bloc, pas de sélection)
 *   - `table`       : commandes de tableau (ajouter ligne/colonne, fusionner, supprimer)
 *   - `placeholder` : Modifier clé + Supprimer (placeholder sélectionné)
 *
 * La détection du contexte se fait via `detectContext(editor)` — mémoisée
 * par `shouldShow` de Tiptap (évalué à chaque selectionUpdate).
 */

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { ReactElement } from "react";
import { BlockBubble } from "./contexts/BlockBubble";
import { PlaceholderBubble } from "./contexts/PlaceholderBubble";
import { TableBubble } from "./contexts/TableBubble";
import { TextBubble } from "./contexts/TextBubble";

export type BubbleContext =
	| "text"
	| "block"
	| "table"
	| "placeholder"
	| "hidden";

/**
 * Inspecte l'état de l'éditeur pour déterminer quelle bubble afficher.
 *
 * Ordre de priorité : placeholder > table > text (selection non-vide) >
 * block (caret seul dans un bloc éditable).
 */
export function detectContext(editor: Editor): BubbleContext {
	if (!editor || !editor.isEditable) return "hidden";
	const { state } = editor;
	const { selection } = state;

	// Placeholder (inline ou bloc) sélectionné ?
	if (
		editor.isActive("placeholder") ||
		editor.isActive("imagePlaceholder") ||
		editor.isActive("signaturePlaceholder")
	) {
		return "placeholder";
	}

	// Dans une cellule de tableau ?
	if (editor.isActive("table")) {
		return "table";
	}

	// Sélection non-vide → texte
	if (!selection.empty) return "text";

	// Curseur seul → bloc (alignement, déplacement)
	if (selection.$from.depth >= 1) return "block";

	return "hidden";
}

export interface ContextualBubbleMenuProps {
	editor: Editor | null;
}

export function ContextualBubbleMenu({
	editor,
}: ContextualBubbleMenuProps): ReactElement | null {
	if (!editor) return null;

	return (
		<BubbleMenu
			editor={editor}
			pluginKey="contextual-bubble-menu"
			updateDelay={80}
			shouldShow={({ editor }) => detectContext(editor) !== "hidden"}
			options={{
				placement: "top",
				offset: 8,
				strategy: "fixed",
			}}
			className="z-50 flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-foreground shadow-lg shadow-black/10"
		>
			<ContextSwitcher editor={editor} />
		</BubbleMenu>
	);
}

function ContextSwitcher({ editor }: { editor: Editor }): ReactElement | null {
	const context = detectContext(editor);
	switch (context) {
		case "text":
			return <TextBubble editor={editor} />;
		case "block":
			return <BlockBubble editor={editor} />;
		case "table":
			return <TableBubble editor={editor} />;
		case "placeholder":
			return <PlaceholderBubble editor={editor} />;
		case "hidden":
		default:
			return null;
	}
}
