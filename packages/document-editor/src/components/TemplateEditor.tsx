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

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { PlaceholderDescriptor, TiptapDocument } from "@workspace/document-rendering/types";
import { Sparkles } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { buildEditorExtensions } from "../extensions/build-editor-extensions";
import { ContextualBubbleMenu } from "./bubble/ContextualBubbleMenu";
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
	 * Aperçu non-éditable du sceau + entête affiché en haut de la page blanche
	 * (au-dessus du canvas Tiptap). Simule le rendu PDF final où le sceau
	 * apparaît sur chaque page. Le parent fournit :
	 *   - `logoSrc`    : URL résolue du sceau (null si absent)
	 *   - `lines`      : lignes d'entête textuelles, centrées gras (ex.
	 *                    "AMBASSADE DU GABON", "PRÈS LE ROYAUME D'ESPAGNE", …)
	 *   - `fontFamily` : police des lignes — défaut "Optima"
	 *   - `logoHeight` : hauteur du sceau en px (défaut 80)
	 */
	headerPreview?: {
		logoSrc: string | null | undefined;
		lines: string[];
		fontFamily?: string;
		logoHeight?: number;
	};
	/**
	 * Aperçu non-éditable du pied de page affiché en bas de la page blanche
	 * (au-dessous du canvas Tiptap). Lignes centrées italiques — adresse,
	 * téléphone, email de la représentation.
	 */
	footerPreview?: { lines: string[] };
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
	/**
	 * Bumped by the parent whenever it wants to force the editor to re-load
	 * `initialContent` (typically after an AI Apply). Tiptap only honours
	 * `content` at mount time — every change of this number triggers an
	 * `editor.commands.setContent(initialContent)` in a single transaction
	 * (one undo step), preserving the editor instance and toolbar state.
	 */
	contentRevision?: number;
	/**
	 * Appelé dès que l'instance Tiptap est prête, et chaque fois qu'elle
	 * change. Permet au parent de consommer la même instance — ex :
	 * alimenter la sidebar contextuelle `<ContextualFormatPanel editor={…}>`.
	 */
	onReady?: (editor: Editor | null) => void;
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
	headerPreview,
	footerPreview,
	enableAI = false,
	onAIGenerate,
	contentRevision,
	onReady,
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

	// Notifie le parent dès que l'instance Tiptap est prête. Permet à la
	// sidebar contextuelle de partager la même instance que le canvas et
	// la bubble menu — c'est ce qui fait muter le panneau "Format" à
	// chaque sélection.
	useEffect(() => {
		if (!onReady) return;
		onReady(editor);
	}, [editor, onReady]);

	// Re-load the canonical content when the parent bumps `contentRevision`
	// (typically after an AI Apply). Tiptap only honours the `content` option
	// at mount time, so we drive subsequent updates through `setContent`.
	//
	// Deferred to a macrotask via setTimeout(0) — Tiptap's `setContent` calls
	// `flushSync` internally; running it inside a React effect can collide
	// with React's render phase (the cascade is setContent → onUpdate →
	// parent's onChange → setState → re-render → flushSync from inside
	// rendering). Pushing it to the next macrotask breaks that chain.
	useEffect(() => {
		if (!editor || contentRevision === undefined) return;
		if (!initialContent) return;
		const timer = setTimeout(() => {
			editor.chain().focus().setContent(initialContent).run();
		}, 0);
		return () => clearTimeout(timer);
		// We deliberately depend on `contentRevision` only — not on
		// `initialContent` — to avoid re-applying on every keystroke (the
		// parent's `onChange` flips `content` and would otherwise re-enter).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editor, contentRevision]);

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

			{/* Toolbar contextuelle flottante — apparaît au-dessus de la
			     sélection (style Apple Pages). Remplace la toolbar fixe. */}
			<ContextualBubbleMenu editor={editor} />

			{/* Page au format papier — remplit la hauteur disponible */}
			<div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-xl bg-muted/40 p-4 md:p-6">
				<div
					className="flex w-full max-w-[860px] flex-col overflow-hidden rounded-sm bg-white text-slate-900 shadow-xl shadow-black/10"
					style={{ aspectRatio: aspect }}
				>
					{/* Aperçu du sceau + entête — non-éditable, toujours en haut. */}
					{headerPreview ? (
						<div
							className="flex shrink-0 flex-col items-center gap-1 border-b border-slate-200 pb-3 pt-4"
							aria-label="Aperçu de l'entête"
						>
							{headerPreview.logoSrc ? (
								<img
									src={headerPreview.logoSrc}
									alt="Sceau de la République Gabonaise"
									className="w-auto object-contain"
									style={{
										height: `${headerPreview.logoHeight ?? 80}px`,
									}}
								/>
							) : null}
							{headerPreview.lines.length > 0 ? (
								<div
									className="flex flex-col items-center gap-0.5 px-6 text-center text-[11px] font-semibold uppercase text-slate-700"
									style={{
										fontFamily: headerPreview.fontFamily
											? `'${headerPreview.fontFamily}', serif`
											: "'Optima', serif",
									}}
								>
									{headerPreview.lines.map((line, idx) => (
										<div key={idx}>{line}</div>
									))}
								</div>
							) : null}
							<div className="mt-1 flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[9px] italic text-slate-500">
								<span aria-hidden>ℹ</span>
								Remplacé par le nom de chaque représentation au rendu
							</div>
						</div>
					) : null}

					<EditorContent
						editor={editor}
						style={padding}
						className="prose max-w-none flex-1 overflow-auto focus:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:focus:outline-none [&_.placeholder-chip]:mx-0.5 [&_.placeholder-chip]:inline-flex [&_.placeholder-chip]:items-center [&_.placeholder-chip]:rounded-md [&_.placeholder-chip]:border [&_.placeholder-chip]:border-primary/30 [&_.placeholder-chip]:bg-primary/10 [&_.placeholder-chip]:px-1.5 [&_.placeholder-chip]:py-0.5 [&_.placeholder-chip]:font-mono [&_.placeholder-chip]:text-[0.85em] [&_.placeholder-chip]:text-primary"
					/>

					{/* Aperçu du pied de page — non-éditable, toujours en bas. */}
					{footerPreview && footerPreview.lines.length > 0 ? (
						<div
							className="flex shrink-0 flex-col items-center gap-0.5 border-t border-slate-200 pb-4 pt-2 text-center text-[10px] italic text-slate-500"
							aria-label="Aperçu du pied de page"
						>
							{footerPreview.lines.map((line, idx) => (
								<div key={idx}>{line}</div>
							))}
						</div>
					) : null}
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
