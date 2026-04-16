/**
 * Pure utilities to walk, inspect and substitute placeholders in a Tiptap AST.
 *
 * These functions are used both:
 *  - Client-side (live preview in the editor)
 *  - Server-side (Convex action that generates the final PDF)
 *
 * They are deliberately Convex-free: the resolver function itself (which reads
 * from user / request / org / system) lives in `convex/lib/placeholderResolver.ts`
 * and calls `collectPlaceholderKeys` + `substitutePlaceholders` defined here.
 */

import {
	PlaceholderResolutionError,
	type ImagePlaceholderAttrs,
	type PlaceholderAttrs,
	type ResolvedPlaceholders,
	type SignaturePlaceholderAttrs,
	type TiptapNode,
} from "./types";

/** Walk the tree and collect every unique placeholder key referenced. */
export function collectPlaceholderKeys(node: TiptapNode): Set<string> {
	const keys = new Set<string>();
	walk(node, (n) => {
		if (n.type === "placeholder") {
			const key = (n.attrs as PlaceholderAttrs | undefined)?.key;
			if (key) keys.add(key);
		}
	});
	return keys;
}

/**
 * Return a new tree where every `placeholder` node has been replaced by a
 * text node containing the resolved value. Unknown keys cause a
 * `PlaceholderResolutionError` so generation fails fast rather than silently
 * rendering `{{undefined}}` to the PDF.
 */
export function substitutePlaceholders(
	node: TiptapNode,
	resolved: ResolvedPlaceholders,
	{ strict = true }: { strict?: boolean } = {},
): TiptapNode {
	const missing = new Set<string>();
	const replaced = transform(node, (n) => {
		if (n.type !== "placeholder") return n;
		const attrs = n.attrs as PlaceholderAttrs | undefined;
		const key = attrs?.key ?? "";
		if (!(key in resolved)) {
			if (strict) {
				missing.add(key);
				return n;
			}
			return { type: "text", text: `{{${key}}}`, marks: n.marks };
		}
		return {
			type: "text",
			text: resolved[key] ?? "",
			marks: n.marks,
		};
	});
	if (strict && missing.size > 0) {
		throw new PlaceholderResolutionError(Array.from(missing));
	}
	return replaced;
}

/**
 * Walk the tree and collect every `imagePlaceholder` node along with its id
 * and key. Used by the generation pipeline to pre-resolve image sources
 * before passing the document to React-PDF.
 */
export interface CollectedImagePlaceholder {
	id: string;
	key: string;
	source: string;
	fallbackStorageId?: string;
}
export function collectImagePlaceholders(
	node: TiptapNode,
): CollectedImagePlaceholder[] {
	const out: CollectedImagePlaceholder[] = [];
	walk(node, (n) => {
		if (n.type !== "imagePlaceholder") return;
		const attrs = n.attrs as ImagePlaceholderAttrs | undefined;
		if (!attrs?.id) return;
		out.push({
			id: attrs.id,
			key: attrs.key,
			source: attrs.source,
			fallbackStorageId: attrs.fallbackStorageId,
		});
	});
	return out;
}

/**
 * Walk the tree and collect every `signaturePlaceholder` node. Used by
 * `signDocument` to determine which slots can be filled by which signer.
 */
export interface CollectedSignaturePlaceholder {
	id: string;
	signerRole?: string;
}
export function collectSignaturePlaceholders(
	node: TiptapNode,
): CollectedSignaturePlaceholder[] {
	const out: CollectedSignaturePlaceholder[] = [];
	walk(node, (n) => {
		if (n.type !== "signaturePlaceholder") return;
		const attrs = n.attrs as SignaturePlaceholderAttrs | undefined;
		if (!attrs?.id) return;
		out.push({ id: attrs.id, signerRole: attrs.signerRole });
	});
	return out;
}

/**
 * Inject `_resolvedSrc` into matching `imagePlaceholder` nodes. The mapping
 * is by node id (stable per insertion). Nodes whose id is not in `srcById`
 * keep their unresolved state — the renderer will draw the fallback box.
 */
export function injectImagePlaceholderSrcs(
	node: TiptapNode,
	srcById: Record<string, string>,
): TiptapNode {
	return transform(node, (n) => {
		if (n.type !== "imagePlaceholder") return n;
		const attrs = n.attrs as ImagePlaceholderAttrs | undefined;
		const src = attrs?.id ? srcById[attrs.id] : undefined;
		if (!src) return n;
		return { ...n, attrs: { ...n.attrs, _resolvedSrc: src } };
	});
}

/**
 * Inject signature data (image src + signer name + ISO timestamp) into
 * matching `signaturePlaceholder` nodes. The mapping is by node id.
 */
export interface SignatureFillin {
	src: string;
	signerName?: string;
	signedAt?: string;
}
export function injectSignaturePlaceholderFills(
	node: TiptapNode,
	fillsById: Record<string, SignatureFillin>,
): TiptapNode {
	return transform(node, (n) => {
		if (n.type !== "signaturePlaceholder") return n;
		const attrs = n.attrs as SignaturePlaceholderAttrs | undefined;
		const fill = attrs?.id ? fillsById[attrs.id] : undefined;
		if (!fill) return n;
		return {
			...n,
			attrs: {
				...n.attrs,
				_resolvedSrc: fill.src,
				_resolvedSignerName: fill.signerName,
				_resolvedSignedAt: fill.signedAt,
			},
		};
	});
}

/** Depth-first walk with a side-effecting visitor. */
function walk(node: TiptapNode, visit: (n: TiptapNode) => void): void {
	visit(node);
	if (node.content) {
		for (const child of node.content) walk(child, visit);
	}
}

/** Depth-first transform returning a new tree. */
function transform(
	node: TiptapNode,
	map: (n: TiptapNode) => TiptapNode,
): TiptapNode {
	const mapped = map(node);
	if (!mapped.content) return mapped;
	return {
		...mapped,
		content: mapped.content.map((child) => transform(child, map)),
	};
}

/** Return a JSONPath-like dotted access against a bucket, e.g. `identity.firstName`. */
export function readPath(bucket: Record<string, unknown> | undefined, path: string): unknown {
	if (!bucket) return undefined;
	const parts = path.split(".").filter(Boolean);
	let cursor: unknown = bucket;
	for (const part of parts) {
		if (cursor === null || cursor === undefined) return undefined;
		if (typeof cursor !== "object") return undefined;
		cursor = (cursor as Record<string, unknown>)[part];
	}
	return cursor;
}
