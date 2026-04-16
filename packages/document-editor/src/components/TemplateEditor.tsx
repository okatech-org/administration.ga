/**
 * Shared Tiptap template editor, used by the backoffice (global templates) and
 * the agent workspace (org templates). Emits raw Tiptap JSON + optional HTML
 * through `onChange`; parent persists via Convex.
 *
 * Preview / PDF rendering lives in `@workspace/document-rendering` — this
 * component only handles authoring. A consuming page is responsible for pairing
 * the editor with a live preview pane when desired.
 */

"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { PlaceholderDescriptor, TiptapDocument } from "@workspace/document-rendering/types";
import { useEffect, type ReactElement } from "react";

import { buildEditorExtensions } from "../extensions/build-editor-extensions.js";
import { EditorToolbar } from "./EditorToolbar.js";
import { PlaceholderPicker } from "./PlaceholderPicker.js";

export interface TemplateEditorProps {
	/** Initial Tiptap JSON document. If omitted an empty doc is created. */
	initialContent?: TiptapDocument;
	/** Placeholders available to the picker sidebar. */
	placeholders: PlaceholderDescriptor[];
	/** Called on every doc change with the current JSON. */
	onChange?: (doc: TiptapDocument) => void;
	/** Read-only mode (e.g. viewing a published version). */
	editable?: boolean;
	/** Optional className forwarded to the root container. */
	className?: string;
	/** Hide the placeholder sidebar (useful in tight layouts or previews). */
	hideSidebar?: boolean;
}

const EMPTY_DOC: TiptapDocument = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

export function TemplateEditor({
	initialContent,
	placeholders,
	onChange,
	editable = true,
	className,
	hideSidebar = false,
}: TemplateEditorProps): ReactElement {
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

	return (
		<div className={["flex gap-4", className ?? ""].join(" ")}>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<EditorToolbar editor={editor} />
				<div className="min-h-[320px] rounded-md border border-gray-200 bg-white p-6 shadow-sm">
					<EditorContent
						editor={editor}
						className="prose max-w-none focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:focus:outline-none"
					/>
				</div>
			</div>
			{!hideSidebar ? (
				<div className="w-72 shrink-0">
					<PlaceholderPicker editor={editor} placeholders={placeholders} />
				</div>
			) : null}
		</div>
	);
}
