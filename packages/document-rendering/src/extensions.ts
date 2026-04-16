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

import { Extension, Node } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { StarterKit } from "@tiptap/starter-kit";

import type { PlaceholderAttrs } from "./types";

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
 * Image node with extra attributes for templating: `width` (CSS length string
 * like "60%" or "320px"), `align` ("left" | "center" | "right"), and
 * `storageId` (Convex storage key — used to re-resolve the URL at PDF
 * generation time when the signed `src` URL has expired).
 *
 * Falls back transparently to the standard image schema for legacy nodes.
 */
export const ImageWithAttrs = Image.extend({
	addAttributes() {
		const parent = this.parent?.() ?? {};
		return {
			...parent,
			width: { default: null as string | null },
			align: { default: "left" as "left" | "center" | "right" },
			storageId: { default: null as string | null },
		};
	},

	parseHTML() {
		return [
			{
				tag: "img[src]",
				getAttrs: (node) => {
					if (typeof node === "string") return false;
					const el = node as HTMLElement;
					return {
						src: el.getAttribute("src"),
						alt: el.getAttribute("alt"),
						title: el.getAttribute("title"),
						width: el.getAttribute("width") ?? el.style.width ?? null,
						align: (el.getAttribute("data-align") as
							| "left"
							| "center"
							| "right"
							| null) ?? "left",
						storageId: el.getAttribute("data-storage-id"),
					};
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const { width, align, storageId, ...rest } = HTMLAttributes as Record<
			string,
			unknown
		>;
		const style = width ? `width: ${width}` : undefined;
		return [
			"img",
			{
				...rest,
				style,
				"data-align": align ?? undefined,
				"data-storage-id": storageId ?? undefined,
			},
		];
	},
});

/**
 * FontSize mark — extends the canonical `textStyle` mark with a `fontSize`
 * attribute (in pt). The mark is shared between editor and server renderer
 * so the JSON round-trips cleanly.
 */
export const FontSize = Extension.create({
	name: "fontSize",

	addOptions() {
		return {
			types: ["textStyle"] as string[],
		};
	},

	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					fontSize: {
						default: null as number | null,
						parseHTML: (element) => {
							const raw = (element as HTMLElement).style.fontSize;
							if (!raw) return null;
							const match = raw.match(/(\d+(?:\.\d+)?)(pt|px)?/);
							if (!match || !match[1]) return null;
							const value = parseFloat(match[1]);
							const unit = match[2];
							return unit === "px" ? Math.round(value * 0.75) : value;
						},
						renderHTML: (attributes) => {
							const fontSize = attributes.fontSize as number | null;
							if (!fontSize) return {};
							return { style: `font-size: ${fontSize}pt` };
						},
					},
				},
			},
		];
	},
});

/**
 * Build the canonical extension list. StarterKit (v3) bundles bold, italic,
 * underline, strike, heading, blockquote, lists, hardBreak, horizontalRule,
 * code, codeBlock, link and the undoRedo history stack — so we only add the
 * non-bundled extensions on top.
 *
 * Color/FontFamily depend on TextStyle (the underlying mark that carries
 * their attributes); they're loaded together so the schema is consistent.
 */
export function buildCoreExtensions() {
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
		PlaceholderNodeSchema,
	];
}
