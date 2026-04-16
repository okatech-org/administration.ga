/**
 * Editor extension list — mirrors the server's `buildCoreExtensions` but swaps
 * the schema-only `PlaceholderNodeSchema` for the React-aware `PlaceholderNode`
 * (with a NodeView rendering a pill).
 */

import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { StarterKit } from "@tiptap/starter-kit";

import { PlaceholderNode } from "./placeholder-node";

export function buildEditorExtensions() {
	return [
		StarterKit,
		TextAlign.configure({ types: ["heading", "paragraph"] }),
		Image.configure({ allowBase64: false }),
		TableKit.configure({
			table: { resizable: false },
		}),
		PlaceholderNode,
	];
}
