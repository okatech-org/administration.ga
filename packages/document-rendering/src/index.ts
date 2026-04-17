export * from "./types";
export {
	buildCoreExtensions,
	FontSize,
	ImagePlaceholderNodeSchema,
	ImageWithAttrs,
	PlaceholderNodeSchema,
	SignaturePlaceholderNodeSchema,
} from "./extensions";
export {
	type CollectedImagePlaceholder,
	type CollectedSignaturePlaceholder,
	type SignatureFillin,
	collectImagePlaceholders,
	collectPlaceholderKeys,
	collectSignaturePlaceholders,
	injectImagePlaceholderSrcs,
	injectSignaturePlaceholderFills,
	readPath,
	substitutePlaceholders,
	toDisplayString,
} from "./placeholder-utils";
export { renderDocumentToHtml, type RenderDocumentOptions } from "./html-renderer";
export { TemplatePdfDocument, type PdfRenderOptions } from "./pdf-renderer";
export {
	resolveHeaderFooterBlock,
	resolveTypographyBlock,
	voiceBlockToPromptContext,
	type HeaderFooterBlockDoc,
	type TypographyBlockDoc,
	type VoiceBlockDoc,
} from "./block-resolver";
