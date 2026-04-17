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
 *
 * Composition : un template peut référencer 3 briques réutilisables :
 *  - `headerFooter` : contenu HTML injecté dans <header>/<footer>
 *  - `typography`   : produit un bloc <style scoped> appliqué au document
 *  - voice          : PAS rendu (métier IA uniquement — cf. `templateVoiceBlocks`)
 */

import { generateHTML } from "@tiptap/html";

import { buildCoreExtensions } from "./extensions";
import type {
	HeaderFooterBlockResolved,
	TiptapDocument,
	TypographyBlockResolved,
} from "./types";

export interface RenderDocumentOptions {
	headerFooter?: HeaderFooterBlockResolved;
	typography?: TypographyBlockResolved;
}

/**
 * Rend un document Tiptap en HTML brut. Quand `options` est fourni, le HTML
 * produit est un document composé avec :
 *   <style> ... </style>   (généré depuis `typography`)
 *   <header>   ...  </header>   (rendu depuis `headerFooter.header.content`)
 *   <main>     ...  </main>     (rendu depuis `doc`)
 *   <footer>   ...  </footer>   (rendu depuis `headerFooter.footer.content`)
 *
 * La prop `options` est facultative pour conserver la rétrocompatibilité des
 * anciens appels `renderDocumentToHtml(doc)` qui produisent uniquement le
 * fragment Tiptap sans habillage.
 */
export function renderDocumentToHtml(
	doc: TiptapDocument,
	options?: RenderDocumentOptions,
): string {
	const body = generateHTML(doc, buildCoreExtensions());

	if (!options?.headerFooter && !options?.typography) {
		return body;
	}

	const styleBlock = options.typography
		? `<style>${buildTypographyCss(options.typography)}</style>`
		: "";

	const headerHtml = options.headerFooter
		? buildHeaderHtml(options.headerFooter)
		: "";
	const footerHtml = options.headerFooter
		? buildFooterHtml(options.headerFooter)
		: "";

	return `<div class="doc-composed">${styleBlock}${headerHtml}<main class="doc-body">${body}</main>${footerHtml}</div>`;
}

// ============================================================================
// Helpers
// ============================================================================

function buildHeaderHtml(hf: HeaderFooterBlockResolved): string {
	const contentHtml = generateHTML(hf.header.content, buildCoreExtensions());
	const height = hf.header.height ?? 30;
	const align = hf.header.logoAlignment;
	const logoHtml = hf.header.logoSrc
		? `<img src="${escapeAttr(hf.header.logoSrc)}" alt="" class="doc-logo doc-logo-${align}" />`
		: "";
	return `<header class="doc-header" style="min-height:${height}mm">${logoHtml}<div class="doc-header-content">${contentHtml}</div></header>`;
}

function buildFooterHtml(hf: HeaderFooterBlockResolved): string {
	const contentHtml = generateHTML(hf.footer.content, buildCoreExtensions());
	const height = hf.footer.height ?? 15;
	const pages = hf.footer.showPageNumbers
		? '<span class="doc-page-number"></span>'
		: "";
	return `<footer class="doc-footer" style="min-height:${height}mm">${contentHtml}${pages}</footer>`;
}

/**
 * Traduit une brique typographique en CSS ciblant `.doc-composed`. Ne
 * « fuit » pas hors du document : toutes les règles sont préfixées.
 */
function buildTypographyCss(t: TypographyBlockResolved): string {
	const pageBreakSel = (t.pageBreakBefore ?? [])
		.map((level) => `.doc-composed .doc-body ${level} { page-break-before: always; break-before: page; }`)
		.join("\n");

	const widowOrphan = t.widowOrphanControl
		? ".doc-composed .doc-body p { orphans: 2; widows: 2; }"
		: "";

	const keepHeadings = t.keepHeadingsWithNext
		? ".doc-composed .doc-body h1, .doc-composed .doc-body h2, .doc-composed .doc-body h3 { page-break-after: avoid; break-after: avoid; }"
		: "";

	return [
		`.doc-composed { font-family: ${t.fontFamily}; font-size: ${t.fontSizeBase}pt; line-height: ${t.lineHeight}; }`,
		`.doc-composed .doc-body p { text-align: ${t.defaultAlignment}; margin-top: ${t.paragraphSpacingBefore ?? 0}mm; margin-bottom: ${t.paragraphSpacingAfter ?? 0}mm; text-indent: ${t.paragraphFirstLineIndent ?? 0}mm; }`,
		headingCss("h1", t.headingStyles.h1),
		headingCss("h2", t.headingStyles.h2),
		headingCss("h3", t.headingStyles.h3),
		pageBreakSel,
		widowOrphan,
		keepHeadings,
		".doc-header { margin-bottom: 8mm; }",
		".doc-footer { margin-top: 8mm; font-size: 0.85em; color: #4A4A4A; }",
	]
		.filter(Boolean)
		.join("\n");
}

function headingCss(
	tag: "h1" | "h2" | "h3",
	style: TypographyBlockResolved["headingStyles"]["h1"],
): string {
	const rules = [
		`font-size: ${style.fontSize}pt`,
		`font-weight: ${style.bold ? "bold" : "normal"}`,
		`text-transform: ${style.uppercase ? "uppercase" : "none"}`,
	];
	if (style.alignment) rules.push(`text-align: ${style.alignment}`);
	if (style.spacingBefore !== undefined)
		rules.push(`margin-top: ${style.spacingBefore}mm`);
	if (style.spacingAfter !== undefined)
		rules.push(`margin-bottom: ${style.spacingAfter}mm`);
	return `.doc-composed .doc-body ${tag} { ${rules.join("; ")}; }`;
}

function escapeAttr(v: string): string {
	return v.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
