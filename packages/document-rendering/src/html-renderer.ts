/**
 * Convert a (resolved) Tiptap JSON document to an HTML string using the
 * canonical extension list. Works in Node and the browser — `@tiptap/html`
 * ships its own lightweight DOM.
 *
 * This is used for:
 *  - Persisted `contentHtml` cache on templates (fast listing previews)
 *  - Live preview pane in the editor (rendered via `dangerouslySetInnerHTML`)
 *
 * PDF generation uses `pdf-renderer.tsx` instead (walks the JSON directly).
 */

import { generateHTML } from "@tiptap/html";

import { buildCoreExtensions } from "./extensions";
import type { TiptapDocument } from "./types";

export function renderDocumentToHtml(doc: TiptapDocument): string {
	return generateHTML(doc, buildCoreExtensions());
}
