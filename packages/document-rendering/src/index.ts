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
} from "./placeholder-utils";
export { renderDocumentToHtml } from "./html-renderer";
export { TemplatePdfDocument, type PdfRenderOptions } from "./pdf-renderer";
