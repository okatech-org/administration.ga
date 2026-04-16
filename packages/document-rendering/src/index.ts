export * from "./types.js";
export {
	buildCoreExtensions,
	PlaceholderNodeSchema,
} from "./extensions.js";
export {
	collectPlaceholderKeys,
	readPath,
	substitutePlaceholders,
} from "./placeholder-utils.js";
export { renderDocumentToHtml } from "./html-renderer.js";
export { TemplatePdfDocument, type PdfRenderOptions } from "./pdf-renderer.js";
