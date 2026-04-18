"use client";

/**
 * Panneau "Format Bloc" affiché dans la sidebar quand le curseur est dans
 * un bloc (paragraphe, titre) sans sélection de texte active.
 *
 * Expose les contrôles d'espacement (interligne, avant, après) qui
 * s'appliquent au bloc en cours. Un cadre bleu pointillé encadre le bloc
 * sélectionné dans le canvas (BlockFocusOutline) ; la poignée ⋮⋮ à gauche
 * permet de le déplacer par glisser-déposer.
 */

import type { Editor } from "@tiptap/react";
import type { ReactElement } from "react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const LINE_HEIGHT_OPTIONS = [
	{ value: "_default", label: "Défaut" },
	{ value: "1", label: "Simple (×1)" },
	{ value: "1.15", label: "×1.15" },
	{ value: "1.5", label: "×1.5" },
	{ value: "1.75", label: "×1.75" },
	{ value: "2", label: "Double (×2)" },
	{ value: "2.5", label: "×2.5" },
];

const SPACE_OPTIONS = [
	{ value: "_default", label: "Défaut" },
	{ value: "0pt", label: "0 pt" },
	{ value: "6pt", label: "6 pt" },
	{ value: "12pt", label: "12 pt" },
	{ value: "18pt", label: "18 pt" },
	{ value: "24pt", label: "24 pt" },
	{ value: "36pt", label: "36 pt" },
];

export function BlockFormatSection({ editor }: { editor: Editor }): ReactElement {
	const nodeAttrs = editor.isActive("heading")
		? editor.getAttributes("heading")
		: editor.getAttributes("paragraph");

	const lineHeight = (nodeAttrs?.lineHeight as string | null) ?? "";
	const spaceBefore = (nodeAttrs?.spaceBefore as string | null) ?? "";
	const spaceAfter = (nodeAttrs?.spaceAfter as string | null) ?? "";

	function applySpacing(attr: Record<string, string | null>) {
		editor
			.chain()
			.focus()
			.updateAttributes("paragraph", attr)
			.updateAttributes("heading", attr)
			.run();
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Interligne */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium">Interligne</Label>
				<Select
					value={lineHeight || "_default"}
					onValueChange={(v) =>
						applySpacing({ lineHeight: v === "_default" ? null : v })
					}
				>
					<SelectTrigger size="sm">
						<SelectValue placeholder="Interligne" />
					</SelectTrigger>
					<SelectContent>
						{LINE_HEIGHT_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Espacement avant / après */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium">Espacement</Label>
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label className="text-[10px] text-muted-foreground">Avant</Label>
						<Select
							value={spaceBefore || "_default"}
							onValueChange={(v) =>
								applySpacing({ spaceBefore: v === "_default" ? null : v })
							}
						>
							<SelectTrigger size="sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SPACE_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<Label className="text-[10px] text-muted-foreground">Après</Label>
						<Select
							value={spaceAfter || "_default"}
							onValueChange={(v) =>
								applySpacing({ spaceAfter: v === "_default" ? null : v })
							}
						>
							<SelectTrigger size="sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SPACE_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				Cadre bleu = bloc actif. Glissez la poignée ⋮⋮ à gauche pour
				déplacer ce bloc à n'importe quel endroit du document.
			</p>
		</div>
	);
}
