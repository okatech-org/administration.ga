"use client";

/**
 * Sidebar contextuelle inspirée d'Apple Pages : le panneau de droite mute
 * selon la sélection dans l'éditeur.
 *
 *   - Sélection de texte  → panneau "Format Texte" (police, taille, alignement, couleur)
 *   - Curseur dans table  → panneau "Format Tableau" (aide commandes)
 *   - Placeholder         → panneau "Format Placeholder" (clé, source)
 *   - Sinon (document)    → panneau "Document" (réutilise les cards existantes)
 *
 * Le panneau "Document" regroupe les sections globales du modèle (mise en
 * page, entête/pied, style rédactionnel, diffusion, variables) — c'est
 * l'état par défaut quand rien n'est sélectionné.
 */

import type { Editor } from "@tiptap/react";
import { FileText, Table2, Tag, Type } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import {
	type EditorContextKind,
	useEditorContext,
} from "./useEditorContext";
import { TextFormatSection } from "./sections/TextFormatSection";
import { TableFormatSection } from "./sections/TableFormatSection";
import { PlaceholderFormatSection } from "./sections/PlaceholderFormatSection";

interface ContextualFormatPanelProps {
	editor: Editor | null;
	/**
	 * Panneau par défaut (mode "document") — le parent fournit son propre
	 * contenu (layout, entête/pied, voice, diffusion, placeholders…).
	 */
	documentPanel: ReactNode;
}

const LABEL_BY_CONTEXT: Record<EditorContextKind, { label: string; icon: typeof Type }> = {
	text: { label: "Format Texte", icon: Type },
	table: { label: "Format Tableau", icon: Table2 },
	placeholder: { label: "Placeholder", icon: Tag },
	document: { label: "Document", icon: FileText },
};

export function ContextualFormatPanel({
	editor,
	documentPanel,
}: ContextualFormatPanelProps): ReactElement {
	const context = useEditorContext(editor);
	const meta = LABEL_BY_CONTEXT[context];
	const Icon = meta.icon;

	return (
		<div className="flex flex-col gap-4">
			{/* En-tête du panneau — indique l'état courant (Pages-like). */}
			<div className="flex items-center gap-2 px-1">
				<div className="rounded-md bg-foreground/8 p-1.5 text-foreground dark:bg-foreground/5">
					<Icon className="h-4 w-4" />
				</div>
				<div>
					<div className="text-sm font-semibold text-foreground">{meta.label}</div>
					<div className="text-xs text-muted-foreground">
						{context === "document"
							? "Aucune sélection — paramètres globaux du modèle"
							: "Applique au bloc actif"}
					</div>
				</div>
			</div>

			{/* Corps du panneau — mute selon le contexte. */}
			{context === "text" && editor ? (
				<FlatCard className="p-4">
					<TextFormatSection editor={editor} />
				</FlatCard>
			) : null}

			{context === "table" && editor ? (
				<FlatCard className="p-4">
					<TableFormatSection editor={editor} />
				</FlatCard>
			) : null}

			{context === "placeholder" && editor ? (
				<FlatCard className="p-4">
					<PlaceholderFormatSection editor={editor} />
				</FlatCard>
			) : null}

			{context === "document" ? documentPanel : null}
		</div>
	);
}
