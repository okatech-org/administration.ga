/**
 * Editor-aware placeholder node. Extends the canonical schema-only node from
 * `@workspace/document-rendering/extensions` and attaches a React NodeView that
 * renders a non-editable pill. The HTML shape (same `data-placeholder-*` attrs)
 * is preserved so the same JSON round-trips through the server HTML/PDF renderers.
 */

import { PlaceholderNodeSchema } from "@workspace/document-rendering/extensions";
import type { PlaceholderAttrs } from "@workspace/document-rendering/types";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import type { ReactElement } from "react";

export const PlaceholderNode = PlaceholderNodeSchema.extend({
	addNodeView() {
		return ReactNodeViewRenderer(PlaceholderChip);
	},
});

/**
 * Renders the placeholder chip as `{{key}}` only. Labels were dropped from
 * the UX — `key` is in snake_case and meant to be self-explanatory. Any
 * `attrs.label` left over by the AI is ignored here.
 */
function PlaceholderChip({ node }: ReactNodeViewProps): ReactElement {
	const { key } = node.attrs as PlaceholderAttrs;
	return (
		<NodeViewWrapper as="span" className="inline-block align-baseline">
			<span
				contentEditable={false}
				className="mx-0.5 inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.85em] text-primary"
				data-placeholder-chip={key}
			>
				{`{{${key}}}`}
			</span>
		</NodeViewWrapper>
	);
}
