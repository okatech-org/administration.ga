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

import { PlaceholderResolutionError, type PlaceholderAttrs, type ResolvedPlaceholders, type TiptapNode } from "./types.js";

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
