/**
 * Editor-aware image placeholder node. Extends the canonical schema-only node
 * from `@workspace/document-rendering/extensions` and attaches a React
 * NodeView that renders a dashed bordered box with an image icon and the
 * placeholder key. The HTML/JSON shape is preserved so the same document
 * round-trips through the server PDF renderer.
 */

import { ImagePlaceholderNodeSchema } from "@workspace/document-rendering/extensions";
import type { ImagePlaceholderAttrs } from "@workspace/document-rendering/types";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { Image as ImageIcon } from "lucide-react";
import type { ReactElement } from "react";

export const ImagePlaceholderNode = ImagePlaceholderNodeSchema.extend({
	addNodeView() {
		return ReactNodeViewRenderer(ImagePlaceholderBox);
	},
});

const MM_TO_PX = 3.7795;

function ImagePlaceholderBox({ node }: ReactNodeViewProps): ReactElement {
	const attrs = node.attrs as ImagePlaceholderAttrs;
	const widthPx = attrs.width ? attrs.width * MM_TO_PX : 240;
	const heightPx = attrs.height ? attrs.height * MM_TO_PX : 160;
	const align = attrs.align ?? "left";
	const justify =
		align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
	return (
		<NodeViewWrapper
			as="div"
			className="my-2 flex w-full"
			style={{ justifyContent: justify }}
			contentEditable={false}
		>
			<div
				className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-blue-300 bg-blue-50/60 text-xs text-blue-700"
				style={{ width: widthPx, height: heightPx }}
				data-image-placeholder-id={attrs.id}
			>
				<ImageIcon className="h-5 w-5 opacity-70" />
				<span className="font-mono text-[0.75em]">{`{{${attrs.key}}}`}</span>
				{attrs.label ? (
					<span className="text-[0.7em] text-blue-700/80">{attrs.label}</span>
				) : null}
			</div>
		</NodeViewWrapper>
	);
}
