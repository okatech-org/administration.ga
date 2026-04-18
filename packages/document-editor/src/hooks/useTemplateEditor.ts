"use client";

/**
 * Hook partagé pour créer l'instance Tiptap du template editor.
 * Permet à la page parent de consommer la même instance que le composant
 * `<TemplateEditor>` et que la sidebar contextuelle `<ContextualFormatPanel>`.
 *
 * Jusqu'à PR3, `useEditor` vivait dans `TemplateEditor.tsx` et l'instance
 * n'était accessible qu'en interne — la sidebar ne pouvait donc pas réagir
 * à la sélection. Ce hook règle ce problème : la page crée l'editor et le
 * passe aux deux consommateurs.
 */

import { useEditor, type Editor } from "@tiptap/react";
import type {
	PlaceholderDescriptor,
	TiptapDocument,
} from "@workspace/document-rendering/types";
import { useEffect } from "react";
import { buildEditorExtensions } from "../extensions/build-editor-extensions";

const EMPTY_DOC: TiptapDocument = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

export interface UseTemplateEditorOptions {
	initialContent?: TiptapDocument;
	editable?: boolean;
	onChange?: (doc: TiptapDocument) => void;
	/** Nombre à incrémenter pour forcer le re-chargement du `initialContent`. */
	contentRevision?: number;
	/** Liste des placeholders — passée à ceux qui l'ont besoin. */
	placeholders?: PlaceholderDescriptor[];
}

export function useTemplateEditor({
	initialContent,
	editable = true,
	onChange,
	contentRevision,
}: UseTemplateEditorOptions): Editor | null {
	const editor = useEditor({
		extensions: buildEditorExtensions(),
		content: initialContent ?? EMPTY_DOC,
		editable,
		immediatelyRender: false,
		onUpdate: ({ editor: ed }) => {
			if (!onChange) return;
			onChange(ed.getJSON() as TiptapDocument);
		},
	});

	useEffect(() => {
		if (!editor) return;
		editor.setEditable(editable);
	}, [editor, editable]);

	// Re-load canonique quand `contentRevision` change (AI Apply).
	useEffect(() => {
		if (!editor || contentRevision === undefined) return;
		if (!initialContent) return;
		const timer = setTimeout(() => {
			editor.chain().focus().setContent(initialContent).run();
		}, 0);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editor, contentRevision]);

	return editor;
}
