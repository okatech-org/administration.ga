"use client";

/**
 * Panneau "Format Texte" affiché dans la sidebar contextuelle quand
 * l'utilisateur a une sélection de texte active. Version enrichie de la
 * BubbleMenu (`TextBubble`) avec plus d'options : couleur de texte,
 * line-height, interlignage (à venir).
 */

import type { Editor } from "@tiptap/react";
import {
	BODY_FONTS,
	FONT_SIZES,
	HEADING_FONTS,
} from "@workspace/document-editor";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold } from "lucide-react";
import type { ReactElement } from "react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function TextFormatSection({
	editor,
}: { editor: Editor }): ReactElement {
	const currentFontFamily =
		(editor.getAttributes("textStyle")?.fontFamily as string | undefined) ?? "";
	const currentFontSize = editor.getAttributes("textStyle")?.fontSize as
		| number
		| undefined;

	return (
		<div className="flex flex-col gap-4">
			{/* Police */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium">Police</Label>
				<Select
					value={currentFontFamily || "_default"}
					onValueChange={(v) => {
						if (v === "_default") {
							editor.chain().focus().unsetFontFamily().run();
						} else {
							editor.chain().focus().setFontFamily(v).run();
						}
					}}
				>
					<SelectTrigger size="sm">
						<SelectValue placeholder="Police par défaut" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="_default">Police par défaut</SelectItem>
						<SelectGroup>
							<SelectLabel>Titres & entêtes</SelectLabel>
							{HEADING_FONTS.map((f) => (
								<SelectItem
									key={f.value}
									value={f.value}
									style={{ fontFamily: f.value }}
								>
									{f.label}
								</SelectItem>
							))}
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>Corps & pied</SelectLabel>
							{BODY_FONTS.map((f) => (
								<SelectItem
									key={f.value}
									value={f.value}
									style={{ fontFamily: f.value }}
								>
									{f.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			{/* Taille */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium">Taille</Label>
				<Select
					value={currentFontSize ? String(currentFontSize) : "_default"}
					onValueChange={(v) => {
						const size = v === "_default" ? null : Number(v);
						editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
					}}
				>
					<SelectTrigger size="sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="_default">Par défaut</SelectItem>
						{FONT_SIZES.map((s) => (
							<SelectItem key={s} value={String(s)}>
								{s} pt
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Style + Alignement */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium">Style & alignement</Label>
				<div className="flex items-center gap-1">
					<FormatToggle
						icon={<Bold className="h-4 w-4" />}
						label="Gras"
						active={editor.isActive("bold")}
						onClick={() => editor.chain().focus().toggleBold().run()}
					/>
					<div aria-hidden className="mx-1 h-5 w-px bg-border/60" />
					<FormatToggle
						icon={<AlignLeft className="h-4 w-4" />}
						label="Aligner à gauche"
						active={editor.isActive({ textAlign: "left" })}
						onClick={() => editor.chain().focus().setTextAlign("left").run()}
					/>
					<FormatToggle
						icon={<AlignCenter className="h-4 w-4" />}
						label="Centrer"
						active={editor.isActive({ textAlign: "center" })}
						onClick={() => editor.chain().focus().setTextAlign("center").run()}
					/>
					<FormatToggle
						icon={<AlignRight className="h-4 w-4" />}
						label="Aligner à droite"
						active={editor.isActive({ textAlign: "right" })}
						onClick={() => editor.chain().focus().setTextAlign("right").run()}
					/>
					<FormatToggle
						icon={<AlignJustify className="h-4 w-4" />}
						label="Justifier"
						active={editor.isActive({ textAlign: "justify" })}
						onClick={() => editor.chain().focus().setTextAlign("justify").run()}
					/>
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				Les contrôles s'appliquent à la sélection de texte en cours. Une
				barre flottante au-dessus de la sélection offre les mêmes options.
			</p>
		</div>
	);
}

function FormatToggle({
	icon,
	label,
	active,
	onClick,
}: {
	icon: ReactElement;
	label: string;
	active?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onMouseDown={(e) => e.preventDefault()}
			onClick={onClick}
			title={label}
			aria-label={label}
			aria-pressed={active}
			data-active={active ? "true" : undefined}
			className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
		>
			{icon}
		</button>
	);
}
