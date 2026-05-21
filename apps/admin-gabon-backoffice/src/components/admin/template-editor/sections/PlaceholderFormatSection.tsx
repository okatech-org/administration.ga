"use client";

/**
 * Panneau "Format Placeholder" affiché quand un nœud placeholder
 * (chip, image-placeholder ou signature-placeholder) est sélectionné.
 */

import type { Editor } from "@tiptap/react";
import { Tag, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";

export function PlaceholderFormatSection({
	editor,
}: { editor: Editor }): ReactElement {
	const isImage = editor.isActive("imagePlaceholder");
	const isSignature = editor.isActive("signaturePlaceholder");
	const nodeType = isImage
		? "imagePlaceholder"
		: isSignature
			? "signaturePlaceholder"
			: "placeholder";

	const attrs = editor.getAttributes(nodeType);
	const key = (attrs.key as string | undefined) ?? "";
	const source = (attrs.source as string | undefined) ?? "";
	const width = attrs.width as number | undefined;
	const height = attrs.height as number | undefined;
	const signerRole = attrs.signerRole as string | undefined;

	const displayKey = isSignature ? (signerRole ?? "signature") : key;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
				<Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" />
				<span>
					{isImage
						? "Placeholder image — remplacé au rendu par une image du contexte (org, user…)."
						: isSignature
							? "Placeholder signature — zone de signature d'un agent autorisé."
							: "Placeholder texte — remplacé au rendu par une valeur dynamique (user, request, form…)."}
				</span>
			</div>

			<div className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/10 p-3">
				<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					Identifiant
				</div>
				<div className="font-mono text-sm text-primary">{`{{${displayKey}}}`}</div>
				{source ? (
					<div className="text-[11px] text-muted-foreground">
						Source : <span className="font-mono">{source}</span>
					</div>
				) : null}
				{(width ?? height) ? (
					<div className="text-[11px] text-muted-foreground">
						Dimensions : {width ?? "?"} × {height ?? "?"} mm
					</div>
				) : null}
			</div>

			<p className="text-xs text-muted-foreground">
				La modification fine (clé, source, dimensions) se fait via l'éditeur
				inline de l'IA et la liste des variables dynamiques dans le panneau
				"Document".
			</p>

			<Button
				type="button"
				variant="outline"
				size="sm"
				onMouseDown={(e) => e.preventDefault()}
				onClick={() => editor.chain().focus().deleteNode(nodeType).run()}
				className="justify-start gap-2 text-destructive"
			>
				<Trash2 className="h-3.5 w-3.5" />
				Supprimer ce placeholder
			</Button>
		</div>
	);
}
