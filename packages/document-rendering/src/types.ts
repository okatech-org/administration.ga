/**
 * Canonical Tiptap AST types shared between the editor and the server renderers.
 *
 * A template is stored as a Tiptap JSON `doc` node. Every placeholder is an
 * inline atom node (`type: "placeholder"`) carrying `attrs.key` + `attrs.source`
 * + optional `attrs.label`. Resolution swaps these nodes for text nodes just
 * before rendering.
 */

/** Where a placeholder pulls its value from at generation time. */
export type PlaceholderSource =
	| "user"
	| "profile"
	| "request"
	| "formData"
	| "org"
	| "system";

/** Attributes on a `placeholder` Tiptap node (inline atom). */
export interface PlaceholderAttrs {
	key: string;
	source: PlaceholderSource;
	/** Optional display label used inside the pill when editing. */
	label?: string;
}

/** Generic Tiptap mark. */
export interface TiptapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

/** Generic Tiptap node (recursive). */
export interface TiptapNode {
	type: string;
	attrs?: Record<string, unknown>;
	content?: TiptapNode[];
	marks?: TiptapMark[];
	text?: string;
}

/** Top-level Tiptap document. */
export interface TiptapDocument extends TiptapNode {
	type: "doc";
	content: TiptapNode[];
}

/** Page layout options for rendering to PDF. */
export interface PageLayoutOptions {
	paperSize?: "A4" | "LETTER";
	orientation?: "portrait" | "landscape";
	/** Page margins in millimetres. Defaults to 20 mm on all sides. */
	marginTop?: number;
	marginRight?: number;
	marginBottom?: number;
	marginLeft?: number;
}

/** Context passed to placeholder resolution. */
export interface PlaceholderContext {
	user?: Record<string, unknown>;
	profile?: Record<string, unknown>;
	request?: Record<string, unknown>;
	formData?: Record<string, unknown>;
	org?: Record<string, unknown>;
	system?: Record<string, unknown>;
}

/** Resolved placeholder map: `"firstName" -> "Jean"`. */
export type ResolvedPlaceholders = Record<string, string>;

/** A placeholder descriptor stored on a template (for the picker UI). */
export interface PlaceholderDescriptor {
	key: string;
	/**
	 * Localized label. Stored as a `Record<string, string>` at the schema layer
	 * (Convex `localizedStringValidator`) so any subset of locales is allowed;
	 * the editor always writes `fr` first.
	 */
	label: Record<string, string>;
	source: PlaceholderSource;
	/** Optional JSONPath (e.g. `formData.identity.firstName`) resolved against the corresponding source bucket. */
	path?: string;
}

/** Error thrown when a placeholder referenced in the template cannot be resolved. */
export class PlaceholderResolutionError extends Error {
	constructor(public readonly missingKeys: string[]) {
		super(
			`Unable to resolve placeholders: ${missingKeys.join(", ")}`,
		);
		this.name = "PlaceholderResolutionError";
	}
}
