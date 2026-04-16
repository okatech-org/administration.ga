/**
 * Editor extension list — mirrors the server's `buildCoreExtensions` but swaps
 * the schema-only `PlaceholderNodeSchema` for the React-aware `PlaceholderNode`
 * (with a NodeView rendering a pill).
 *
 * All other extensions (StarterKit, TextAlign, TextStyle, Color, FontFamily,
 * FontSize, ImageWithAttrs, TableKit) come from the shared rendering package
 * to guarantee the schema is identical on both sides.
 */

import { TextAlign } from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { StarterKit } from "@tiptap/starter-kit";
import { FontSize, ImageWithAttrs } from "@workspace/document-rendering/extensions";

import { ImagePlaceholderNode } from "./image-placeholder-node";
import { PlaceholderNode } from "./placeholder-node";
import { SignaturePlaceholderNode } from "./signature-placeholder-node";

export function buildEditorExtensions() {
	return [
		StarterKit,
		TextAlign.configure({ types: ["heading", "paragraph"] }),
		TextStyle,
		Color,
		FontFamily,
		FontSize,
		ImageWithAttrs.configure({ allowBase64: false }),
		TableKit.configure({
			table: { resizable: false },
		}),
		PlaceholderNode,
		ImagePlaceholderNode,
		SignaturePlaceholderNode,
	];
}
