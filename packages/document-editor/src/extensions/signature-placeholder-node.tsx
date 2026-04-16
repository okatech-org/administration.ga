/**
 * Editor-aware signature placeholder node. Extends the canonical schema-only
 * node from `@workspace/document-rendering/extensions` and attaches a React
 * NodeView that renders a dashed bordered box with a pen icon and the role
 * (when set). Multiple instances may live in the same document — each gets
 * a stable `id` (UUID) at insertion time so signatures can be correlated.
 */

import { SignaturePlaceholderNodeSchema } from "@workspace/document-rendering/extensions";
import { toDisplayString } from "@workspace/document-rendering/placeholder-utils";
import type { SignaturePlaceholderAttrs } from "@workspace/document-rendering/types";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { PenTool } from "lucide-react";
import type { ReactElement } from "react";

export const SignaturePlaceholderNode = SignaturePlaceholderNodeSchema.extend({
	addNodeView() {
		return ReactNodeViewRenderer(SignaturePlaceholderBox);
	},
});

const MM_TO_PX = 3.7795;

function SignaturePlaceholderBox({ node }: ReactNodeViewProps): ReactElement {
	const attrs = node.attrs as SignaturePlaceholderAttrs;
	const widthPx = (attrs.width ?? 80) * MM_TO_PX;
	const heightPx = (attrs.height ?? 30) * MM_TO_PX;
	// AI sometimes sends `signerRole` as the localized object form. Coerce
	// to a string so the renderer never crashes on an `{fr: ...}` value.
	const roleText = toDisplayString(attrs.signerRole);
	return (
		<NodeViewWrapper
			as="div"
			className="my-3 flex w-full"
			contentEditable={false}
		>
			<div
				className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-amber-400 bg-amber-50/60 text-xs text-amber-800"
				style={{ width: widthPx, height: heightPx }}
				data-signature-placeholder-id={attrs.id}
			>
				<PenTool className="h-5 w-5 opacity-70" />
				<span className="text-[0.7em] uppercase tracking-wide">
					{roleText ? `Signature: ${roleText}` : "Signature"}
				</span>
			</div>
		</NodeViewWrapper>
	);
}
