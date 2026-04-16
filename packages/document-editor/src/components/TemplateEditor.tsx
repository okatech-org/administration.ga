/**
 * Shared Tiptap template editor, used by the backoffice (global templates) and
 * the agent workspace (org templates). Emits raw Tiptap JSON + optional HTML
 * through `onChange`; parent persists via Convex.
 *
 * Layout : la page d'écriture au format A4 occupe la zone principale à gauche
 * et prend toute la hauteur disponible, avec la toolbar + le picker de
 * variables regroupés dans une sidebar à droite. Les couleurs s'adaptent au
 * mode sombre via les tokens du design system.
 *
 * Image upload : the editor itself never talks to a backend. Parents inject
 * `onUploadImage` (e.g. the Convex `generateUploadUrl` flow) and the toolbar
 * wires it to the file input — keeps `@workspace/document-editor` framework-
 * agnostic.
 */

"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { PlaceholderDescriptor, TiptapDocument } from "@workspace/document-rendering/types";
import { Sparkles } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { buildEditorExtensions } from "../extensions/build-editor-extensions";
import { EditorToolbar } from "./EditorToolbar";
import { PlaceholderPicker } from "./PlaceholderPicker";

export interface TemplateEditorProps {
	/** Initial Tiptap JSON document. If omitted an empty doc is created. */
	initialContent?: TiptapDocument;
	/** Placeholders available to the picker. Used when `showInlineSidebar` is true. */
	placeholders?: PlaceholderDescriptor[];
	/** Called on every doc change with the current JSON. */
	onChange?: (doc: TiptapDocument) => void;
	/** Read-only mode (e.g. viewing a published version). */
	editable?: boolean;
	/** Optional className forwarded to the root container. */
	className?: string;
	/**
	 * When true, render the PlaceholderPicker as a right-hand sidebar INSIDE
	 * this component. Default: false — the parent page lays out the sidebar
	 * itself so it can include additional config blocks alongside the picker.
	 */
	showInlineSidebar?: boolean;
	/** Paper format. Controls the aspect ratio of the canvas page. */
	paperSize?: "A4" | "LETTER";
	/** Orientation. Controls the aspect ratio too. */
	orientation?: "portrait" | "landscape";
	/** Page margins in millimetres. Defaults to 20 mm on every side. */
	marginTop?: number;
	marginRight?: number;
	marginBottom?: number;
	marginLeft?: number;
	/**
	 * Called when the user picks an image to insert from the toolbar. The parent
	 * is expected to upload the file (typically to Convex storage) and return a
	 * `src` URL. The optional `storageId` is persisted alongside `src` on the
	 * Image node so the PDF renderer can re-resolve a fresh signed URL at
	 * generation time. When omitted, the image button is hidden in the toolbar.
	 */
	onUploadImage?: (file: File) => Promise<{ src: string; storageId?: string }>;
	/**
	 * When true, exposes a "Assistant IA" button above the toolbar. The parent
	 * page is responsible for hosting the `<TemplateAIDrawer />` and applying
	 * the result via `editor.commands.setContent()`. The button stays hidden
	 * unless the user has the `documents.ai_generation` capability — gating is
	 * the parent's responsibility (so the editor stays auth-agnostic).
	 */
	enableAI?: boolean;
	/**
	 * Called when the user clicks the "Assistant IA" button. The parent should
	 * open its `<TemplateAIDrawer />`. Required when `enableAI` is true.
	 */
	onAIGenerate?: () => void;
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

/** 1 mm in CSS pixels (96 DPI). */
const MM_TO_PX = 3.7795;

const DEFAULT_MARGIN_MM = 20;

export function TemplateEditor({
	initialContent,
	placeholders = [],
	onChange,
	editable = true,
	className,
	showInlineSidebar = false,
	paperSize = "A4",
	orientation = "portrait",
	marginTop,
	marginRight,
	marginBottom,
	marginLeft,
	onUploadImage,
	enableAI = false,
	onAIGenerate,
}: TemplateEditorProps): ReactElement {
	const { t } = useTranslation();
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
	const padding = {
		paddingTop: `${(marginTop ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
		paddingRight: `${(marginRight ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
		paddingBottom: `${(marginBottom ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
		paddingLeft: `${(marginLeft ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
	};

	const canvas = (
		<div
			className={[
				"flex h-full min-h-[calc(100vh-20rem)] flex-col gap-3",
				showInlineSidebar ? "" : className ?? "",
			].join(" ")}
		>
			{/* Assistant IA — visible only when the parent gates `enableAI` true. */}
			{enableAI && onAIGenerate ? (
				<div className="flex items-center justify-end">
					<button
						type="button"
						onClick={onAIGenerate}
						className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
					>
						<Sparkles className="h-3.5 w-3.5" />
						{t("templates.ai.button")}
					</button>
				</div>
			) : null}

			{/* Toolbar au-dessus de la page */}
			<EditorToolbar editor={editor} onUploadImage={onUploadImage} />

			{/* Page au format papier — remplit la hauteur disponible */}
			<div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-xl bg-muted/40 p-4 md:p-6">
				<div
					className="w-full max-w-[860px] overflow-hidden rounded-sm bg-white text-slate-900 shadow-xl shadow-black/10"
					style={{ aspectRatio: aspect }}
				>
					<EditorContent
						editor={editor}
						style={padding}
						className="prose max-w-none h-full overflow-auto focus:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:focus:outline-none [&_.placeholder-chip]:mx-0.5 [&_.placeholder-chip]:inline-flex [&_.placeholder-chip]:items-center [&_.placeholder-chip]:rounded-md [&_.placeholder-chip]:border [&_.placeholder-chip]:border-blue-200 [&_.placeholder-chip]:bg-blue-50 [&_.placeholder-chip]:px-1.5 [&_.placeholder-chip]:py-0.5 [&_.placeholder-chip]:font-mono [&_.placeholder-chip]:text-[0.85em] [&_.placeholder-chip]:text-blue-700"
					/>
				</div>
			</div>
		</div>
	);

	if (!showInlineSidebar) return canvas;

	return (
		<div className={["flex flex-col gap-4 lg:flex-row", className ?? ""].join(" ")}>
			<div className="min-w-0 flex-1">{canvas}</div>
			<aside className="w-full shrink-0 lg:w-80">
				<PlaceholderPicker editor={editor} placeholders={placeholders} />
			</aside>
		</div>
	);
}
