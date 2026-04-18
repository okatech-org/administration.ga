/**
 * Commandes de manipulation de blocs top-level partagées entre la
 * ContextualBubbleMenu (PR2) et le BlockDragHandle (PR4).
 *
 * Chaque fonction opère sur le bloc top-level contenant la sélection
 * courante — paragraphe, heading, table, image placeholder, etc.
 */

import type { Editor } from "@tiptap/react";

/**
 * Déplace le bloc top-level contenant la sélection vers le haut
 * (échange avec son voisin précédent). No-op si déjà premier.
 */
export function moveBlockUp(editor: Editor): void {
	const { state, view } = editor;
	const { $from } = state.selection;
	if ($from.depth < 1) return;

	const blockStart = $from.before(1);
	const resolved = state.doc.resolve(blockStart);
	const prev = resolved.nodeBefore;
	if (!prev) return;

	const curr = $from.node(1);
	const prevStart = blockStart - prev.nodeSize;

	const tr = state.tr.replaceWith(prevStart, blockStart + curr.nodeSize, [
		curr,
		prev,
	]);
	view.dispatch(tr.scrollIntoView());
}

/**
 * Déplace le bloc top-level courant vers le bas (échange avec le voisin
 * suivant). No-op si déjà dernier.
 */
export function moveBlockDown(editor: Editor): void {
	const { state, view } = editor;
	const { $from } = state.selection;
	if ($from.depth < 1) return;

	const blockStart = $from.before(1);
	const blockEnd = $from.after(1);
	const resolved = state.doc.resolve(blockEnd);
	const next = resolved.nodeAfter;
	if (!next) return;

	const curr = $from.node(1);
	const tr = state.tr.replaceWith(blockStart, blockEnd + next.nodeSize, [
		next,
		curr,
	]);
	view.dispatch(tr.scrollIntoView());
}

/**
 * Efface le texte sélectionné. Si rien n'est sélectionné, efface le
 * bloc contenant le curseur.
 */
export function eraseSelection(editor: Editor): void {
	const { selection } = editor.state;
	if (selection.empty) {
		editor.chain().focus().selectParentNode().deleteSelection().run();
		return;
	}
	editor.chain().focus().deleteSelection().run();
}

/**
 * Supprime le bloc top-level contenant le curseur (sans se préoccuper de
 * la sélection courante). Utilisé par la BlockBubble.
 */
export function deleteCurrentBlock(editor: Editor): void {
	editor.chain().focus().selectParentNode().deleteSelection().run();
}
