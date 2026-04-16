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

/**
 * Attributes on an `imagePlaceholder` node (block atom). Reserves a spot for
 * a dynamic image (logo, photo, scan) that will be resolved at generation
 * time based on a mapping rule (PR4). The optional `fallbackStorageId`
 * points to a Convex storage entry rendered when no mapping is available
 * — useful for previews and templates that ship with a default logo.
 */
export interface ImagePlaceholderAttrs {
	/** Stable id (UUID) used to correlate the placeholder with overlay logic. */
	id: string;
	/** Human-readable key used by the mapping configuration. */
	key: string;
	/** Where the image is expected to come from (PR4 will use this). */
	source: PlaceholderSource;
	/** Optional caption / display label shown inside the placeholder. */
	label?: string;
	/** Width in millimetres. Defaults to 60 mm in the renderer. */
	width?: number;
	/** Height in millimetres. Defaults to 40 mm in the renderer. */
	height?: number;
	/** Horizontal alignment within the surrounding flow. Defaults to "left". */
	align?: "left" | "center" | "right";
	/** Convex storage id of a fallback image rendered if no mapping resolves. */
	fallbackStorageId?: string;
	/** Resolved image src injected by the generation pipeline before rendering. */
	_resolvedSrc?: string;
}

/**
 * Attributes on a `signaturePlaceholder` node (block atom). Reserves a spot
 * for an agent's signature that is overlaid post-generation. Multiple
 * placeholders are allowed in the same document to support multi-signer
 * workflows; each carries an optional `signerRole` that gates which agent
 * may sign it.
 */
export interface SignaturePlaceholderAttrs {
	/** Stable id (UUID) used to correlate signature → placeholder. */
	id: string;
	/** Optional role required to fill this slot (e.g. "chef_poste"). */
	signerRole?: string;
	/** Width in millimetres. Defaults to 80 mm in the renderer. */
	width?: number;
	/** Height in millimetres. Defaults to 30 mm in the renderer. */
	height?: number;
	/**
	 * Resolved signature image src (data URL) injected by signDocument when
	 * re-rendering the PDF after a signature is recorded.
	 */
	_resolvedSrc?: string;
	/** Display name of the signer, injected after signing. */
	_resolvedSignerName?: string;
	/** ISO timestamp of the signature, injected after signing. */
	_resolvedSignedAt?: string;
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
	 * Optional localized label. Newer templates omit this entirely — the
	 * `key` (snake_case) is treated as human-readable on its own. The field
	 * is retained for back-compat with templates created before the
	 * label-less simplification.
	 */
	label?: Record<string, string>;
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
