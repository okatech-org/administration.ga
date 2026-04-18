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
 * Trois zones Tiptap : entête, corps, pied de page. Chaque zone est un
 * éditeur indépendant pour :
 *   - Correspondre au schéma Convex `headerFooter.header.content` /
 *     `.footer.content` / `content` (trois docs Tiptap distincts)
 *   - Permettre des jeux d'extensions différenciés (pas de table dans un
 *     pied, pas de placeholder dynamique dans un entête)
 *   - Gérer l'undo/redo par zone (Ctrl-Z dans le header ne défait pas une
 *     frappe dans le body)
 *
 * Le focus actif est tracké par `useActiveEditor`. La bubble menu et la
 * sidebar contextuelle consomment l'éditeur actif via `onReady`.
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
import { useEffect, type CSSProperties, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { buildEditorExtensions } from "../extensions/build-editor-extensions";
import {
	buildFooterEditorExtensions,
	buildHeaderEditorExtensions,
} from "../extensions/build-header-footer-extensions";
import { useActiveEditor, type ActiveZone } from "../hooks/use-active-editor";
import { ContextualBubbleMenu } from "./bubble/ContextualBubbleMenu";
import { PlaceholderPicker } from "./PlaceholderPicker";

export interface TemplateEditorReadyContext {
	headerEditor: Editor | null;
	bodyEditor: Editor | null;
	footerEditor: Editor | null;
	activeEditor: Editor | null;
	activeZone: ActiveZone;
}

export interface TemplateEditorProps {
	/** Initial Tiptap JSON document (body). If omitted an empty doc is created. */
	initialContent?: TiptapDocument;
	/** Placeholders available to the picker. Used when `showInlineSidebar` is true. */
	placeholders?: PlaceholderDescriptor[];
	/** Called on every body change with the current JSON. */
	onChange?: (doc: TiptapDocument) => void;
	/** Read-only mode (e.g. viewing a published version). Applies to the body. */
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

	// ─── Entête éditable ───────────────────────────────────────────────
	/**
	 * Contenu Tiptap initial de l'entête. Si fourni, la zone d'entête
	 * est rendue au-dessus du corps et éditable en ligne (comme Word/
	 * Pages). Si omis, aucun entête n'est rendu.
	 */
	initialHeaderContent?: TiptapDocument;
	/** Émis à chaque changement du contenu de l'entête. */
	onHeaderChange?: (doc: TiptapDocument) => void;
	/** Override de l'éditabilité du header — défaut : `editable`. */
	headerEditable?: boolean;
	/**
	 * URL du sceau affiché au-dessus de l'entête textuel. Non-éditable
	 * dans le flux Tiptap — reste un `<img>` positionné librement
	 * (cohérent avec le rendu React-PDF qui positionne le logo à part).
	 */
	headerLogoSrc?: string | null;
	/** Hauteur du sceau en px. Défaut : 80. */
	headerLogoHeight?: number;
	/**
	 * Police CSS appliquée au texte de l'entête (ex : "Optima").
	 * Défaut : "Optima".
	 */
	headerFontFamily?: string;
	/**
	 * Incrémenté par le parent pour forcer le reload du `initialHeaderContent`.
	 * Utilisé par le mode "preview représentation" qui injecte temporairement
	 * le branding d'une rep dans l'éditeur.
	 */
	headerRevision?: number;

	// ─── Pied de page éditable ─────────────────────────────────────────
	/**
	 * Contenu Tiptap initial du pied de page. Si fourni, la zone est
	 * rendue en bas du corps et éditable. Si omis, aucun pied n'est rendu.
	 */
	initialFooterContent?: TiptapDocument;
	/** Émis à chaque changement du contenu du pied. */
	onFooterChange?: (doc: TiptapDocument) => void;
	/** Override de l'éditabilité du footer — défaut : `editable`. */
	footerEditable?: boolean;
	/** Incrémenté par le parent pour forcer le reload du `initialFooterContent`. */
	footerRevision?: number;

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
	 * Appelé dès que les instances Tiptap sont prêtes, et chaque fois que
	 * l'éditeur actif change (navigation header ↔ body ↔ footer).
	 * Permet au parent de consommer les instances — ex : alimenter la
	 * sidebar contextuelle `<ContextualFormatPanel editor={…}>`.
	 */
	onReady?: (context: TemplateEditorReadyContext) => void;
	/**
	 * Taille de la grille de repère en mm. Affiche un quadrillage CSS
	 * sur le canvas blanc (uniquement à l'édition, invisible dans le PDF).
	 * `null` ou `undefined` = aucune grille.
	 */
	gridSize?: number | null;
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
	initialHeaderContent,
	onHeaderChange,
	headerEditable,
	headerLogoSrc,
	headerLogoHeight,
	headerFontFamily,
	headerRevision,
	initialFooterContent,
	onFooterChange,
	footerEditable,
	footerRevision,
	enableAI = false,
	onAIGenerate,
	contentRevision,
	onReady,
	gridSize,
}: TemplateEditorProps): ReactElement {
	const { t } = useTranslation();

	const bodyEditor = useEditor({
		extensions: buildEditorExtensions(),
		content: initialContent ?? EMPTY_DOC,
		editable,
		immediatelyRender: false,
		onUpdate: ({ editor: ed }) => {
			if (!onChange) return;
			onChange(ed.getJSON() as TiptapDocument);
		},
	});

	// L'entête n'est instancié que si le parent passe du contenu initial.
	// Si `initialHeaderContent` est undefined, la zone reste absente (comme
	// dans agent-web où l'éditeur ne montre que le body).
	const headerEnabled = initialHeaderContent !== undefined;
	const headerEditorInstance = useEditor({
		extensions: buildHeaderEditorExtensions(),
		content: initialHeaderContent ?? EMPTY_DOC,
		editable: headerEnabled ? (headerEditable ?? editable) : false,
		immediatelyRender: false,
		onUpdate: ({ editor: ed }) => {
			if (!onHeaderChange) return;
			onHeaderChange(ed.getJSON() as TiptapDocument);
		},
	});
	const headerEditor = headerEnabled ? headerEditorInstance : null;

	const footerEnabled = initialFooterContent !== undefined;
	const footerEditorInstance = useEditor({
		extensions: buildFooterEditorExtensions(),
		content: initialFooterContent ?? EMPTY_DOC,
		editable: footerEnabled ? (footerEditable ?? editable) : false,
		immediatelyRender: false,
		onUpdate: ({ editor: ed }) => {
			if (!onFooterChange) return;
			onFooterChange(ed.getJSON() as TiptapDocument);
		},
	});
	const footerEditor = footerEnabled ? footerEditorInstance : null;

	const { activeEditor, activeZone } = useActiveEditor({
		header: headerEditor,
		body: bodyEditor,
		footer: footerEditor,
	});

	useEffect(() => {
		if (!bodyEditor) return;
		bodyEditor.setEditable(editable);
	}, [bodyEditor, editable]);

	useEffect(() => {
		if (!headerEditor) return;
		headerEditor.setEditable(headerEditable ?? editable);
	}, [headerEditor, headerEditable, editable]);

	useEffect(() => {
		if (!footerEditor) return;
		footerEditor.setEditable(footerEditable ?? editable);
	}, [footerEditor, footerEditable, editable]);

	// Notifie le parent dès que les instances Tiptap sont prêtes, ou que
	// l'éditeur actif change. La sidebar contextuelle + la bubble menu
	// suivent ainsi toujours la zone focus du moment.
	useEffect(() => {
		if (!onReady) return;
		onReady({
			headerEditor,
			bodyEditor,
			footerEditor,
			activeEditor,
			activeZone,
		});
	}, [onReady, headerEditor, bodyEditor, footerEditor, activeEditor, activeZone]);

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
		if (!bodyEditor || contentRevision === undefined) return;
		if (!initialContent) return;
		const timer = setTimeout(() => {
			bodyEditor.chain().focus().setContent(initialContent).run();
		}, 0);
		return () => clearTimeout(timer);
		// We deliberately depend on `contentRevision` only — not on
		// `initialContent` — to avoid re-applying on every keystroke (the
		// parent's `onChange` flips `content` and would otherwise re-enter).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bodyEditor, contentRevision]);

	// Même mécanisme pour header et footer — le mode "preview rep"
	// injecte le branding d'une org via bump de `headerRevision`, sans
	// écrire dans le state template du parent (emitUpdate=false).
	useEffect(() => {
		if (!headerEditor || headerRevision === undefined) return;
		if (!initialHeaderContent) return;
		const timer = setTimeout(() => {
			headerEditor.commands.setContent(initialHeaderContent, { emitUpdate: false });
		}, 0);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [headerEditor, headerRevision]);

	useEffect(() => {
		if (!footerEditor || footerRevision === undefined) return;
		if (!initialFooterContent) return;
		const timer = setTimeout(() => {
			footerEditor.commands.setContent(initialFooterContent, { emitUpdate: false });
		}, 0);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [footerEditor, footerRevision]);

	const aspect = PAPER_RATIOS[paperSize][orientation];
	const gridPx = gridSize ? gridSize * MM_TO_PX : null;
	const gridStyle: CSSProperties = gridPx
		? {
				backgroundImage: [
					`repeating-linear-gradient(to right, rgba(99,102,241,0.12) 0, rgba(99,102,241,0.12) 1px, transparent 1px, transparent ${gridPx}px)`,
					`repeating-linear-gradient(to bottom, rgba(99,102,241,0.12) 0, rgba(99,102,241,0.12) 1px, transparent 1px, transparent ${gridPx}px)`,
				].join(", "),
				backgroundSize: `${gridPx}px ${gridPx}px`,
			}
		: {};
	const padding = {
		paddingTop: `${(marginTop ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
		paddingRight: `${(marginRight ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
		paddingBottom: `${(marginBottom ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
		paddingLeft: `${(marginLeft ?? DEFAULT_MARGIN_MM) * MM_TO_PX}px`,
	};

	const headerFontStyle: CSSProperties = {
		fontFamily: headerFontFamily
			? `'${headerFontFamily}', serif`
			: "'Optima', serif",
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
			     sélection (style Apple Pages). Suit l'éditeur actif. Le
			     `key={activeZone}` force un remount propre quand l'utilisateur
			     passe d'une zone à l'autre, évitant toute rémanence de
			     position depuis l'éditeur précédent. */}
			<ContextualBubbleMenu key={activeZone} editor={activeEditor} />

			{/* Page au format papier — remplit la hauteur disponible */}
			<div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-xl bg-muted/40 p-4 md:p-6">
				<div
					className="flex w-full max-w-[860px] flex-col overflow-hidden rounded-sm bg-white text-slate-900 shadow-xl shadow-black/10"
					style={{ aspectRatio: aspect, ...gridStyle }}
				>
					{/* Entête éditable — logo (non-éditable) + texte Tiptap. */}
					{headerEnabled && headerEditor ? (
						<div
							className="flex shrink-0 flex-col items-center gap-1 pb-2 pt-2"
							aria-label="Entête du document"
						>
							{headerLogoSrc ? (
								<img
									src={headerLogoSrc}
									alt="Sceau de la République Gabonaise"
									className="w-auto object-contain"
									style={{
										height: `${headerLogoHeight ?? 80}px`,
									}}
								/>
							) : null}
							<EditorContent
								editor={headerEditor}
								style={headerFontStyle}
								className={[
									"w-full px-6 text-center text-[11px] font-semibold uppercase text-slate-700",
									"rounded-sm transition-colors",
									activeZone === "header"
										? "ring-1 ring-primary/30"
										: "hover:ring-1 hover:ring-primary/10",
									"[&_.ProseMirror]:min-h-[1em] [&_.ProseMirror]:focus:outline-none",
									"[&_.ProseMirror_p]:m-0",
								].join(" ")}
							/>
						</div>
					) : null}

					<EditorContent
						editor={bodyEditor}
						style={padding}
						className="prose max-w-none flex-1 overflow-auto focus:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:focus:outline-none [&_.placeholder-chip]:mx-0.5 [&_.placeholder-chip]:inline-flex [&_.placeholder-chip]:items-center [&_.placeholder-chip]:rounded-md [&_.placeholder-chip]:border [&_.placeholder-chip]:border-primary/30 [&_.placeholder-chip]:bg-primary/10 [&_.placeholder-chip]:px-1.5 [&_.placeholder-chip]:py-0.5 [&_.placeholder-chip]:font-mono [&_.placeholder-chip]:text-[0.85em] [&_.placeholder-chip]:text-primary"
					/>

					{/* Pied de page éditable. */}
					{footerEnabled && footerEditor ? (
						<div
							className="shrink-0 pb-2 pt-1"
							aria-label="Pied de page du document"
						>
							<EditorContent
								editor={footerEditor}
								className={[
									"w-full px-6 text-center text-[10px] italic text-slate-500",
									"rounded-sm transition-colors",
									activeZone === "footer"
										? "ring-1 ring-primary/30"
										: "hover:ring-1 hover:ring-primary/10",
									"[&_.ProseMirror]:min-h-[1em] [&_.ProseMirror]:focus:outline-none",
									"[&_.ProseMirror_p]:m-0",
								].join(" ")}
							/>
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
				<PlaceholderPicker editor={bodyEditor} placeholders={placeholders} />
			</aside>
		</div>
	);
}
