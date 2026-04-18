export {
	TemplateEditor,
	type TemplateEditorProps,
	type TemplateEditorReadyContext,
} from "./components/TemplateEditor";
export {
	useActiveEditor,
	type ActiveZone,
	type UseActiveEditorArgs,
	type UseActiveEditorResult,
} from "./hooks/use-active-editor";
export {
	buildHeaderEditorExtensions,
	buildFooterEditorExtensions,
} from "./extensions/build-header-footer-extensions";
export {
	EditorToolbar,
	HEADING_FONTS,
	BODY_FONTS,
} from "./components/EditorToolbar";
export {
	FONT_SIZES,
	type FontDefinition,
} from "./extensions/typography-tokens";
export {
	ContextualBubbleMenu,
	detectContext,
	type BubbleContext,
} from "./components/bubble/ContextualBubbleMenu";
export { PlaceholderPicker } from "./components/PlaceholderPicker";
export {
	TemplateAIDrawer,
	type TemplateAIDrawerProps,
	type TemplateAIInput,
	type TemplateAIResult,
	type TemplateAITemplateType,
} from "./components/TemplateAIDrawer";
export { buildEditorExtensions } from "./extensions/build-editor-extensions";
export { ImagePlaceholderNode } from "./extensions/image-placeholder-node";
export { PlaceholderNode } from "./extensions/placeholder-node";
export { SignaturePlaceholderNode } from "./extensions/signature-placeholder-node";
