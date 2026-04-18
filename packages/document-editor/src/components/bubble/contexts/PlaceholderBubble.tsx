"use client";

/**
 * Bubble menu pour un placeholder sélectionné (inline chip, image ou
 * signature). Permet de voir la clé courante et de supprimer le node.
 * L'édition fine de la clé / source / dimensions se fait via la sidebar
 * contextuelle (PR3).
 */

import type { Editor } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import { BubbleButton, BubbleDivider } from "../BubbleButton";

export function PlaceholderBubble({
	editor,
}: { editor: Editor }): ReactElement {
	// Récupère la clé du placeholder actif — tente les 3 types dans l'ordre.
	const key =
		(editor.getAttributes("placeholder")?.key as string | undefined) ??
		(editor.getAttributes("imagePlaceholder")?.key as string | undefined) ??
		(editor.getAttributes("signaturePlaceholder")?.signerRole as
			| string
			| undefined) ??
		"placeholder";

	return (
		<>
			<div className="flex items-center gap-1 px-2 text-xs font-medium text-muted-foreground">
				<span className="font-mono text-primary">{`{{${key}}}`}</span>
			</div>
			<BubbleDivider />
			<BubbleButton
				icon={Trash2}
				label="Supprimer le placeholder"
				onClick={() =>
					editor
						.chain()
						.focus()
						.deleteNode(
							editor.isActive("placeholder")
								? "placeholder"
								: editor.isActive("imagePlaceholder")
									? "imagePlaceholder"
									: "signaturePlaceholder",
						)
						.run()
				}
			/>
		</>
	);
}
