/**
 * Canonical Tiptap extension list — single source of truth used by:
 *  - The editor (`@workspace/document-editor`) for authoring
 *  - The server HTML renderer (`generateHTML`) for previews outside the editor
 *
 * PDF rendering walks the Tiptap JSON tree directly (see `pdf-renderer.tsx`) and
 * does not need the extension list, but the schema it assumes is the one below.
 *
 * The editor adds a `ReactNodeViewRenderer` wrapper on top of `PlaceholderNode`
 * for the pill UI; the schema definition is identical.
 */

import { Node } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { StarterKit } from "@tiptap/starter-kit";

import type { PlaceholderAttrs } from "./types.js";

/**
 * Inline atom node representing a dynamic placeholder like `{{firstName}}`.
 * Schema-only definition (no NodeView) so it can be reused server-side.
 */
export const PlaceholderNodeSchema = Node.create({
	name: "placeholder",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	draggable: false,

	addAttributes() {
		return {
			key: { default: "" },
			source: { default: "formData" },
			label: { default: null },
		};
	},

	parseHTML() {
		return [
			{
				tag: "span[data-placeholder-key]",
				getAttrs: (node) => {
					if (typeof node === "string") return false;
					const el = node as HTMLElement;
					return {
						key: el.getAttribute("data-placeholder-key") ?? "",
						source: el.getAttribute("data-placeholder-source") ?? "formData",
						label: el.getAttribute("data-placeholder-label") ?? null,
					};
				},
			},
		];
	},

	renderHTML({ node }) {
		const attrs = node.attrs as PlaceholderAttrs;
		return [
			"span",
			{
				"data-placeholder-key": attrs.key,
				"data-placeholder-source": attrs.source,
				"data-placeholder-label": attrs.label ?? "",
				class: "placeholder-chip",
			},
			`{{${attrs.key}}}`,
		];
	},
});

/**
 * Build the canonical extension list. StarterKit (v3) bundles bold, italic,
 * underline, strike, heading, blockquote, lists, hardBreak, horizontalRule,
 * code, codeBlock, link and the undoRedo history stack — so we only add the
 * non-bundled extensions on top.
 */
export function buildCoreExtensions() {
	return [
		StarterKit,
		TextAlign.configure({ types: ["heading", "paragraph"] }),
		Image.configure({ allowBase64: false }),
		TableKit.configure({
			table: { resizable: false },
		}),
		PlaceholderNodeSchema,
	];
}
