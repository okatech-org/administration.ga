"use client";

/**
 * Bubble menu pour un bloc (curseur seul, sans sélection de texte).
 * Commandes : alignement, déplacement vertical, suppression du bloc.
 *
 * Réutilise les utilitaires partagés `moveBlockUp`, `moveBlockDown`,
 * `deleteCurrentBlock` de `../../../extensions/block-commands`.
 */

import type { Editor } from "@tiptap/react";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	ArrowDown,
	ArrowUp,
	Trash2,
} from "lucide-react";
import type { ReactElement } from "react";
import {
	deleteCurrentBlock,
	moveBlockDown,
	moveBlockUp,
} from "../../../extensions/block-commands";
import { BubbleButton, BubbleDivider } from "../BubbleButton";

export function BlockBubble({ editor }: { editor: Editor }): ReactElement {
	return (
		<>
			{/* Alignement */}
			<BubbleButton
				icon={AlignLeft}
				label="Aligner à gauche"
				active={editor.isActive({ textAlign: "left" })}
				onClick={() => editor.chain().focus().setTextAlign("left").run()}
			/>
			<BubbleButton
				icon={AlignCenter}
				label="Centrer"
				active={editor.isActive({ textAlign: "center" })}
				onClick={() => editor.chain().focus().setTextAlign("center").run()}
			/>
			<BubbleButton
				icon={AlignRight}
				label="Aligner à droite"
				active={editor.isActive({ textAlign: "right" })}
				onClick={() => editor.chain().focus().setTextAlign("right").run()}
			/>
			<BubbleButton
				icon={AlignJustify}
				label="Justifier"
				active={editor.isActive({ textAlign: "justify" })}
				onClick={() => editor.chain().focus().setTextAlign("justify").run()}
			/>

			<BubbleDivider />

			{/* Déplacer le bloc */}
			<BubbleButton
				icon={ArrowUp}
				label="Déplacer le bloc vers le haut"
				onClick={() => moveBlockUp(editor)}
			/>
			<BubbleButton
				icon={ArrowDown}
				label="Déplacer le bloc vers le bas"
				onClick={() => moveBlockDown(editor)}
			/>

			<BubbleDivider />

			{/* Supprimer le bloc */}
			<BubbleButton
				icon={Trash2}
				label="Supprimer le bloc"
				onClick={() => deleteCurrentBlock(editor)}
			/>
		</>
	);
}
