/**
 * Barre d'outils simplifiée pour l'édition des 25 modèles diplomatiques.
 *
 * L'éditeur est volontairement restreint : le contenu provient de DOCX
 * sources approuvés. L'utilisateur ne peut que **retoucher** le document —
 * il n'insère ni nouveaux éléments (images, tables, listes), ni nouveaux
 * types de bloc (headings, citations). Il peut :
 *   - changer la police et la taille des textes sélectionnés
 *   - mettre en gras
 *   - ajuster l'alignement d'un paragraphe
 *   - déplacer un bloc vers le haut / vers le bas
 *   - effacer la sélection
 *   - annuler / rétablir
 *
 * Tout le reste (italiques hérités du seed, tables, couleurs, etc.) reste
 * visible au rendu mais n'est plus éditable depuis la toolbar — cela
 * préserve la mise en page officielle tout en laissant la latitude
 * demandée pour personnaliser.
 */

import type { Editor } from "@tiptap/react";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	ArrowDown,
	ArrowUp,
	Bold,
	Eraser,
	Redo,
	Type,
	Undo,
} from "lucide-react";
import { type ReactElement, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
	eraseSelection as eraseSelectionCommand,
	moveBlockDown,
	moveBlockUp,
} from "../extensions/block-commands";
import {
	BODY_FONTS,
	FONT_SIZES,
	HEADING_FONTS,
} from "../extensions/typography-tokens";

type ToolbarAction = {
	icon: ReactElement;
	label: string;
	isActive?: boolean;
	onClick: () => void;
	disabled?: boolean;
};

// Re-exports pour compat avec les consommateurs externes (sidebar,
// RepresentationHeaderPreview...). La définition canonique vit désormais
// dans `../extensions/typography-tokens.ts`.
export { HEADING_FONTS, BODY_FONTS } from "../extensions/typography-tokens";

export interface EditorToolbarProps {
	editor: Editor | null;
	/**
	 * Conservé pour compatibilité — ignoré par la toolbar simplifiée (pas
	 * d'insertion d'image). Supprimer définitivement lorsque tous les
	 * appelants auront retiré la prop.
	 */
	onUploadImage?: (file: File) => Promise<{ src: string; storageId?: string }>;
}

// Les commandes `moveBlockUp`, `moveBlockDown`, `eraseSelection` vivent
// désormais dans `../extensions/block-commands.ts` et sont importées
// depuis cet emplacement — partagées avec la ContextualBubbleMenu (PR2)
// et le BlockDragHandle (PR4).

export function EditorToolbar({
	editor,
}: EditorToolbarProps): ReactElement | null {
	const { t } = useTranslation();

	// Suit la dernière sélection non-vide de l'éditeur et la garde en ref.
	// Indispensable pour que les boutons de toolbar agissent toujours sur
	// la dernière sélection même si l'utilisateur sort brièvement de la
	// zone éditable avant de cliquer (les selects natifs peuvent collapse
	// la sélection en ouvrant leur popup ; le pointeur qui survole la
	// sidebar peut aussi brouiller l'état).
	const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

	// Abonnement continu : capture chaque changement de sélection non-vide
	// dans l'éditeur. Le `savedSelectionRef` reflète toujours le dernier
	// range significatif choisi par l'utilisateur.
	useEffect(() => {
		if (!editor) return;
		function capture() {
			if (!editor) return;
			const { from, to, empty } = editor.state.selection;
			if (!empty) {
				savedSelectionRef.current = { from, to };
			}
		}
		editor.on("selectionUpdate", capture);
		// Capture initiale au cas où l'éditeur arrive avec une sélection déjà active.
		capture();
		return () => {
			editor.off("selectionUpdate", capture);
		};
	}, [editor]);

	if (!editor) return null;
	const ed = editor;

	const currentFontSize =
		(ed.getAttributes("textStyle")?.fontSize as number | undefined) ??
		undefined;
	const currentFontFamily =
		(ed.getAttributes("textStyle")?.fontFamily as string | undefined) ?? "";

	function captureSelection() {
		const { from, to } = ed.state.selection;
		savedSelectionRef.current = { from, to };
	}

	/**
	 * Exécute `builder(chain)` après avoir restauré la sélection sauvegardée
	 * (ou l'actuelle si aucune n'a été sauvegardée). Indispensable pour les
	 * `<select>` natifs qui collapse parfois la sélection en ouvrant leur
	 * popup.
	 */
	function withSavedSelection(
		builder: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>,
	): void {
		const sel = savedSelectionRef.current;
		let chain = ed.chain().focus();
		if (sel) chain = chain.setTextSelection(sel);
		builder(chain).run();
	}

	function setFontSize(size: string): void {
		withSavedSelection((chain) =>
			size
				? chain.setMark("textStyle", { fontSize: Number(size) })
				: chain.setMark("textStyle", { fontSize: null }),
		);
	}

	function setFontFamily(family: string): void {
		withSavedSelection((chain) =>
			family ? chain.setFontFamily(family) : chain.unsetFontFamily(),
		);
	}

	const alignActions: ToolbarAction[] = [
		{
			icon: <AlignLeft size={16} />,
			label: t("templates.editor.toolbar.alignLeft"),
			isActive: editor.isActive({ textAlign: "left" }),
			onClick: () =>
				withSavedSelection((chain) => chain.setTextAlign("left")),
		},
		{
			icon: <AlignCenter size={16} />,
			label: t("templates.editor.toolbar.alignCenter"),
			isActive: editor.isActive({ textAlign: "center" }),
			onClick: () =>
				withSavedSelection((chain) => chain.setTextAlign("center")),
		},
		{
			icon: <AlignRight size={16} />,
			label: t("templates.editor.toolbar.alignRight"),
			isActive: editor.isActive({ textAlign: "right" }),
			onClick: () =>
				withSavedSelection((chain) => chain.setTextAlign("right")),
		},
		{
			icon: <AlignJustify size={16} />,
			label: t("templates.editor.toolbar.alignJustify"),
			isActive: editor.isActive({ textAlign: "justify" }),
			onClick: () =>
				withSavedSelection((chain) => chain.setTextAlign("justify")),
		},
	];

	const moveActions: ToolbarAction[] = [
		{
			icon: <ArrowUp size={16} />,
			label: "Déplacer le bloc vers le haut",
			onClick: () => moveBlockUp(ed),
		},
		{
			icon: <ArrowDown size={16} />,
			label: "Déplacer le bloc vers le bas",
			onClick: () => moveBlockDown(ed),
		},
	];

	const historyActions: ToolbarAction[] = [
		{
			icon: <Undo size={16} />,
			label: t("templates.editor.toolbar.undo"),
			onClick: () => editor.chain().focus().undo().run(),
			disabled: !editor.can().undo(),
		},
		{
			icon: <Redo size={16} />,
			label: t("templates.editor.toolbar.redo"),
			onClick: () => editor.chain().focus().redo().run(),
			disabled: !editor.can().redo(),
		},
	];

	return (
		<div
			className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 text-foreground"
			onMouseDown={captureSelection}
		>
			{/* Gras */}
			<ToolbarGroup
				actions={[
					{
						icon: <Bold size={16} />,
						label: t("templates.editor.toolbar.bold"),
						isActive: editor.isActive("bold"),
						onClick: () =>
							withSavedSelection((chain) => chain.toggleBold()),
					},
				]}
			/>

			{/* Police + Taille */}
			<div className="flex items-center gap-1 border-r border-border/60 pr-1">
				<Type size={14} className="text-muted-foreground" />
				<select
					value={currentFontFamily}
					onMouseDown={captureSelection}
					onFocus={captureSelection}
					onChange={(e) => setFontFamily(e.target.value)}
					aria-label={t("templates.editor.toolbar.fontFamily")}
					className="h-7 max-w-[150px] rounded border border-transparent bg-transparent px-1.5 text-xs hover:border-border focus:border-primary focus:outline-none"
				>
					<option value="">Police par défaut</option>
					<optgroup label="Titres & entêtes">
						{HEADING_FONTS.map((f) => (
							<option
								key={f.value}
								value={f.value}
								style={{ fontFamily: f.value }}
							>
								{f.label}
							</option>
						))}
					</optgroup>
					<optgroup label="Corps & pied">
						{BODY_FONTS.map((f) => (
							<option
								key={f.value}
								value={f.value}
								style={{ fontFamily: f.value }}
							>
								{f.label}
							</option>
						))}
					</optgroup>
				</select>
				<select
					value={currentFontSize ? String(currentFontSize) : ""}
					onMouseDown={captureSelection}
					onFocus={captureSelection}
					onChange={(e) => setFontSize(e.target.value)}
					aria-label={t("templates.editor.toolbar.fontSize")}
					className="h-7 w-14 rounded border border-transparent bg-transparent px-1.5 text-xs hover:border-border focus:border-primary focus:outline-none"
				>
					<option value="">—</option>
					{FONT_SIZES.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
			</div>

			{/* Alignement */}
			<ToolbarGroup actions={alignActions} />

			{/* Déplacer bloc */}
			<ToolbarGroup actions={moveActions} />

			{/* Effacer */}
			<ToolbarGroup
				actions={[
					{
						icon: <Eraser size={16} />,
						label: "Effacer la sélection",
						onClick: () => eraseSelectionCommand(ed),
					},
				]}
			/>

			{/* Annuler / Rétablir */}
			<ToolbarGroup actions={historyActions} last />
		</div>
	);
}

function ToolbarGroup({
	actions,
	last,
}: {
	actions: ToolbarAction[];
	last?: boolean;
}): ReactElement {
	return (
		<div
			className={`flex items-center gap-0.5 ${last ? "" : "border-r border-border/60 pr-1"}`}
		>
			{actions.map((a) => (
				<button
					key={a.label}
					type="button"
					// preventDefault sur mousedown : empêche la perte de sélection
					// Tiptap quand on clique sur un bouton de toolbar (sinon le
					// focus passe au bouton, collapse la sélection, et la commande
					// s'applique sur un range vide).
					onMouseDown={(e) => e.preventDefault()}
					onClick={a.onClick}
					disabled={a.disabled}
					title={a.label}
					aria-label={a.label}
					data-active={a.isActive ? "true" : undefined}
					className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
				>
					{a.icon}
				</button>
			))}
		</div>
	);
}
