/**
 * Editor-aware placeholder node. Extends the canonical schema-only node from
 * `@workspace/document-rendering/extensions` and attaches a React NodeView that
 * renders a non-editable pill. The HTML shape (same `data-placeholder-*` attrs)
 * is preserved so the same JSON round-trips through the server HTML/PDF renderers.
 */

import { PlaceholderNodeSchema } from "@workspace/document-rendering/extensions";
import { toDisplayString } from "@workspace/document-rendering/placeholder-utils";
import type { PlaceholderAttrs } from "@workspace/document-rendering/types";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import type { ReactElement } from "react";

export const PlaceholderNode = PlaceholderNodeSchema.extend({
	addNodeView() {
		return ReactNodeViewRenderer(PlaceholderChip);
	},
});

function PlaceholderChip({ node }: ReactNodeViewProps): ReactElement {
	const attrs = node.attrs as PlaceholderAttrs;
	const { key } = attrs;
	// AI sometimes ships `label` as the localized object `{fr: "..."}`
	// instead of a plain string. `toDisplayString` accepts both.
	const labelText = toDisplayString(attrs.label) || key;
	return (
		<NodeViewWrapper as="span" className="inline-block align-baseline">
			<span
				contentEditable={false}
				className="mx-0.5 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[0.85em] text-blue-700"
				data-placeholder-chip={key}
			>
				{labelText}
			</span>
		</NodeViewWrapper>
	);
}
