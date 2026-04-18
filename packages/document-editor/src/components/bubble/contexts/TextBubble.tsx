"use client";

/**
 * Bubble menu pour une sélection de texte : Gras + Police + Taille +
 * Alignement. Toutes les commandes utilisent `chain().focus()` pour
 * restaurer le focus (preventDefault au mousedown empêche le blur).
 */

import type { Editor } from "@tiptap/react";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
} from "lucide-react";
import type { ReactElement } from "react";
import {
	BODY_FONTS,
	FONT_SIZES,
	HEADING_FONTS,
} from "../../../extensions/typography-tokens";
import { BubbleButton, BubbleDivider } from "../BubbleButton";

export function TextBubble({ editor }: { editor: Editor }): ReactElement {
	const currentFontFamily =
		(editor.getAttributes("textStyle")?.fontFamily as string | undefined) ?? "";
	const currentFontSize = editor.getAttributes("textStyle")?.fontSize as
		| number
		| undefined;
	const nodeAttrs = editor.isActive("heading")
		? editor.getAttributes("heading")
		: editor.getAttributes("paragraph");
	const currentLineHeight = (nodeAttrs?.lineHeight as string | null) ?? "";

	function applyLineHeight(value: string) {
		const lh = value || null;
		editor
			.chain()
			.focus()
			.updateAttributes("paragraph", { lineHeight: lh })
			.updateAttributes("heading", { lineHeight: lh })
			.run();
	}

	function setFontFamily(family: string) {
		if (family) {
			editor.chain().focus().setFontFamily(family).run();
		} else {
			editor.chain().focus().unsetFontFamily().run();
		}
	}

	function setFontSize(size: string) {
		editor
			.chain()
			.focus()
			.setMark("textStyle", { fontSize: size ? Number(size) : null })
			.run();
	}

	return (
		<>
			{/* Gras */}
			<BubbleButton
				icon={Bold}
				label="Gras"
				active={editor.isActive("bold")}
				onClick={() => editor.chain().focus().toggleBold().run()}
			/>

			<BubbleDivider />

			{/* Police */}
			<select
				value={currentFontFamily}
				onMouseDown={(e) => e.stopPropagation()}
				onChange={(e) => setFontFamily(e.target.value)}
				aria-label="Police"
				className="h-8 max-w-[140px] rounded bg-transparent px-2 text-xs hover:bg-muted focus:bg-muted focus:outline-none"
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

			{/* Taille */}
			<select
				value={currentFontSize ? String(currentFontSize) : ""}
				onMouseDown={(e) => e.stopPropagation()}
				onChange={(e) => setFontSize(e.target.value)}
				aria-label="Taille"
				className="h-8 w-14 rounded bg-transparent px-2 text-xs hover:bg-muted focus:bg-muted focus:outline-none"
			>
				<option value="">—</option>
				{FONT_SIZES.map((s) => (
					<option key={s} value={s}>
						{s}
					</option>
				))}
			</select>

			<BubbleDivider />

			{/* Interligne rapide */}
			<select
				value={currentLineHeight}
				onMouseDown={(e) => e.stopPropagation()}
				onChange={(e) => applyLineHeight(e.target.value)}
				aria-label="Interligne"
				title="Interligne"
				className="h-8 w-[4.5rem] rounded bg-transparent px-1 text-xs hover:bg-muted focus:bg-muted focus:outline-none"
			>
				<option value="">⇕ —</option>
				<option value="1">× 1</option>
				<option value="1.15">× 1.15</option>
				<option value="1.5">× 1.5</option>
				<option value="2">× 2</option>
			</select>

			<BubbleDivider />

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
		</>
	);
}
