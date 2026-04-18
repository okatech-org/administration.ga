"use client";

/**
 * Panneau "Format Texte" affiché dans la sidebar contextuelle quand
 * l'utilisateur a une sélection de texte active. Offre police, taille,
 * style, alignement + contrôles d'interligne et d'espacement avant/après.
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

export function TextFormatSection({
	editor,
}: { editor: Editor }): ReactElement {
	const currentFontFamily =
		(editor.getAttributes("textStyle")?.fontFamily as string | undefined) ?? "";
	const currentFontSize = editor.getAttributes("textStyle")?.fontSize as
		| number
		| undefined;
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

			{/* Interligne & espacement */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium">Interligne & espacement</Label>
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
				Les contrôles s'appliquent au bloc contenant la sélection active.
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
