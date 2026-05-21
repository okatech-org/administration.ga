"use client";

/**
 * Panneau "Format Tableau" affiché dans la sidebar contextuelle quand le
 * curseur est dans une cellule de tableau. Complète les commandes de la
 * BubbleMenu (`TableBubble`) par des informations et quelques actions.
 */

import type { Editor } from "@tiptap/react";
import {
	ArrowDownToLine,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUpToLine,
	Combine,
	Table2,
	Trash2,
} from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";

export function TableFormatSection({
	editor,
}: { editor: Editor }): ReactElement {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
				<Table2 className="h-3.5 w-3.5" />
				<span>
					Le curseur est dans une cellule de tableau. Les commandes
					d'insertion / suppression agissent sur la cellule courante.
				</span>
			</div>

			{/* Lignes */}
			<div className="flex flex-col gap-1.5">
				<span className="text-xs font-medium">Lignes</span>
				<div className="grid grid-cols-2 gap-1.5">
					<TableAction
						icon={<ArrowUpToLine className="h-3.5 w-3.5" />}
						label="Insérer au-dessus"
						onClick={() => editor.chain().focus().addRowBefore().run()}
					/>
					<TableAction
						icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
						label="Insérer en dessous"
						onClick={() => editor.chain().focus().addRowAfter().run()}
					/>
					<TableAction
						icon={<Trash2 className="h-3.5 w-3.5" />}
						label="Supprimer la ligne"
						variant="destructive"
						onClick={() => editor.chain().focus().deleteRow().run()}
					/>
				</div>
			</div>

			{/* Colonnes */}
			<div className="flex flex-col gap-1.5">
				<span className="text-xs font-medium">Colonnes</span>
				<div className="grid grid-cols-2 gap-1.5">
					<TableAction
						icon={<ArrowLeftToLine className="h-3.5 w-3.5" />}
						label="Insérer à gauche"
						onClick={() => editor.chain().focus().addColumnBefore().run()}
					/>
					<TableAction
						icon={<ArrowRightToLine className="h-3.5 w-3.5" />}
						label="Insérer à droite"
						onClick={() => editor.chain().focus().addColumnAfter().run()}
					/>
					<TableAction
						icon={<Trash2 className="h-3.5 w-3.5" />}
						label="Supprimer la colonne"
						variant="destructive"
						onClick={() => editor.chain().focus().deleteColumn().run()}
					/>
				</div>
			</div>

			{/* Actions globales */}
			<div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
				<span className="text-xs font-medium">Tableau</span>
				<div className="grid grid-cols-1 gap-1.5">
					<TableAction
						icon={<Combine className="h-3.5 w-3.5" />}
						label="Fusionner cellules sélectionnées"
						onClick={() => editor.chain().focus().mergeCells().run()}
					/>
					<TableAction
						icon={<Trash2 className="h-3.5 w-3.5" />}
						label="Supprimer le tableau"
						variant="destructive"
						onClick={() => editor.chain().focus().deleteTable().run()}
					/>
				</div>
			</div>
		</div>
	);
}

function TableAction({
	icon,
	label,
	variant = "default",
	onClick,
}: {
	icon: ReactElement;
	label: string;
	variant?: "default" | "destructive";
	onClick: () => void;
}) {
	return (
		<Button
			type="button"
			variant={variant === "destructive" ? "outline" : "outline"}
			size="sm"
			onMouseDown={(e) => e.preventDefault()}
			onClick={onClick}
			className="h-8 justify-start gap-1.5 px-2 text-xs font-normal"
		>
			{icon}
			<span>{label}</span>
		</Button>
	);
}
