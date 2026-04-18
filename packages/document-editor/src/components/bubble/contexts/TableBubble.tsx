"use client";

/**
 * Bubble menu pour une sélection dans un tableau (via TableKit). Expose
 * les commandes standard d'insertion / suppression de lignes / colonnes
 * + fusion de cellules.
 */

import type { Editor } from "@tiptap/react";
import {
	ArrowDownToLine,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUpToLine,
	Combine,
	SquareX,
	Trash2,
} from "lucide-react";
import type { ReactElement } from "react";
import { BubbleButton, BubbleDivider } from "../BubbleButton";

export function TableBubble({ editor }: { editor: Editor }): ReactElement {
	return (
		<>
			{/* Lignes */}
			<BubbleButton
				icon={ArrowUpToLine}
				label="Insérer une ligne au-dessus"
				onClick={() => editor.chain().focus().addRowBefore().run()}
			/>
			<BubbleButton
				icon={ArrowDownToLine}
				label="Insérer une ligne en dessous"
				onClick={() => editor.chain().focus().addRowAfter().run()}
			/>
			<BubbleButton
				icon={Trash2}
				label="Supprimer la ligne"
				onClick={() => editor.chain().focus().deleteRow().run()}
			/>

			<BubbleDivider />

			{/* Colonnes */}
			<BubbleButton
				icon={ArrowLeftToLine}
				label="Insérer une colonne à gauche"
				onClick={() => editor.chain().focus().addColumnBefore().run()}
			/>
			<BubbleButton
				icon={ArrowRightToLine}
				label="Insérer une colonne à droite"
				onClick={() => editor.chain().focus().addColumnAfter().run()}
			/>
			<BubbleButton
				icon={SquareX}
				label="Supprimer la colonne"
				onClick={() => editor.chain().focus().deleteColumn().run()}
			/>

			<BubbleDivider />

			{/* Fusion + suppression table */}
			<BubbleButton
				icon={Combine}
				label="Fusionner les cellules"
				onClick={() => editor.chain().focus().mergeCells().run()}
			/>
			<BubbleButton
				icon={Trash2}
				label="Supprimer le tableau"
				onClick={() => editor.chain().focus().deleteTable().run()}
			/>
		</>
	);
}
