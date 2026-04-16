/**
 * Shared Tiptap template editor, used by the backoffice (global templates) and
 * the agent workspace (org templates). Emits raw Tiptap JSON + optional HTML
 * through `onChange`; parent persists via Convex.
 *
 * Layout : la page d'écriture au format A4 occupe la zone principale à gauche
 * et prend toute la hauteur disponible, avec la toolbar + le picker de
 * variables regroupés dans une sidebar à droite. Les couleurs s'adaptent au
 * mode sombre via les tokens du design system.
 */

"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { PlaceholderDescriptor, TiptapDocument } from "@workspace/document-rendering/types";
import { useEffect, type ReactElement } from "react";

import { buildEditorExtensions } from "../extensions/build-editor-extensions";
import { EditorToolbar } from "./EditorToolbar";
import { PlaceholderPicker } from "./PlaceholderPicker";

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
	/** Hide the sidebar (useful in tight layouts or previews). */
	hideSidebar?: boolean;
	/** Paper format. Controls the aspect ratio of the canvas page. */
	paperSize?: "A4" | "LETTER";
	/** Orientation. Controls the aspect ratio too. */
	orientation?: "portrait" | "landscape";
}

const EMPTY_DOC: TiptapDocument = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

/** Paper dimensions at 96 DPI in CSS pixels. Used to pick the correct aspect. */
const PAPER_RATIOS: Record<"A4" | "LETTER", { portrait: string; landscape: string }> = {
	A4: { portrait: "210/297", landscape: "297/210" },
	LETTER: { portrait: "216/279", landscape: "279/216" },
};

export function TemplateEditor({
	initialContent,
	placeholders,
	onChange,
	editable = true,
	className,
	hideSidebar = false,
	paperSize = "A4",
	orientation = "portrait",
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

	const aspect = PAPER_RATIOS[paperSize][orientation];

	return (
		<div
			className={[
				"flex h-full min-h-[calc(100vh-20rem)] flex-col gap-4 lg:flex-row",
				className ?? "",
			].join(" ")}
		>
			{/* ─── Canvas zone — page au format papier ──────────────────── */}
			<div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-xl bg-muted/40 p-4 md:p-6">
				<div
					className="w-full max-w-[860px] overflow-hidden rounded-sm bg-white text-slate-900 shadow-xl shadow-black/10"
					style={{ aspectRatio: aspect }}
				>
					<EditorContent
						editor={editor}
						className="prose max-w-none h-full overflow-auto p-12 md:p-14 focus:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:focus:outline-none [&_.placeholder-chip]:mx-0.5 [&_.placeholder-chip]:inline-flex [&_.placeholder-chip]:items-center [&_.placeholder-chip]:rounded-md [&_.placeholder-chip]:border [&_.placeholder-chip]:border-blue-200 [&_.placeholder-chip]:bg-blue-50 [&_.placeholder-chip]:px-1.5 [&_.placeholder-chip]:py-0.5 [&_.placeholder-chip]:font-mono [&_.placeholder-chip]:text-[0.85em] [&_.placeholder-chip]:text-blue-700"
					/>
				</div>
			</div>

			{/* ─── Sidebar droite — toolbar + variables dynamiques ───────── */}
			{!hideSidebar ? (
				<aside className="flex w-full shrink-0 flex-col gap-3 lg:w-80">
					<EditorToolbar editor={editor} />
					<PlaceholderPicker editor={editor} placeholders={placeholders} />
				</aside>
			) : null}
		</div>
	);
}
