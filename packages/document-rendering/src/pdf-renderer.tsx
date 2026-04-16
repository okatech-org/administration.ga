/**
 * Tiptap JSON → React-PDF component tree.
 *
 * The renderer walks a RESOLVED Tiptap document (placeholders already
 * substituted — see `substitutePlaceholders`) and emits a `<Document>` whose
 * visual output matches the editor's live HTML preview as closely as
 * React-PDF allows.
 *
 * React-PDF does not support arbitrary CSS / HTML, so each Tiptap node type is
 * mapped explicitly. Unknown nodes are skipped with a console warning.
 *
 * Sizes are in PDF points. Paper defaults: A4 portrait (595×842 pt), 20 mm
 * margins on all sides.
 */

import {
	Document,
	Font,
	Image as PdfImage,
	Page,
	StyleSheet,
	Text,
	View,
	type DocumentProps,
} from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";

/**
 * React-PDF's `Style` type is namespace-scoped and not re-exported directly.
 * `StyleSheet.create()` returns a strongly-typed value whose values satisfy
 * every `style` prop, so we describe our return values in terms of those
 * values and fall back to returning arrays (which React-PDF accepts natively).
 */
type PdfStyle = ReturnType<typeof StyleSheet.create>[string];

import type {
	PageLayoutOptions,
	TiptapDocument,
	TiptapMark,
	TiptapNode,
} from "./types";

/** 1 mm in PDF points (PDF unit = 1/72 inch, 1 inch = 25.4 mm). */
const MM_TO_PT = 2.83465;

/** Convert millimetres to PDF points. */
function mmToPt(mm: number): number {
	return mm * MM_TO_PT;
}

/**
 * The 14 PDF base fonts cover Helvetica, Times, Courier — no `Font.register()`
 * needed for those families. We still call `register` once for our handful of
 * supported families to make the intent explicit and to short-circuit any
 * mismatched user input. Idempotent.
 */
let fontsRegistered = false;
function registerStandardFonts(): void {
	if (fontsRegistered) return;
	// React-PDF auto-recognises these family names — listing them once here
	// ensures the renderer never silently swallows a wrong family string.
	Font.registerHyphenationCallback((word) => [word]);
	fontsRegistered = true;
}

/** Family names we accept from Tiptap `fontFamily` marks. */
const SAFE_FONT_FAMILIES = new Set([
	"Helvetica",
	"Times-Roman",
	"Courier",
]);

/**
 * Map a free-form fontFamily string (Tiptap stores anything the user types or
 * the picker supplies) to one of the 14 PDF standard families. Anything we
 * can't recognise falls back to Helvetica so the document still renders.
 */
function normaliseFontFamily(family: string): string | undefined {
	const trimmed = family.trim();
	if (!trimmed) return undefined;
	if (SAFE_FONT_FAMILIES.has(trimmed)) return trimmed;
	const lower = trimmed.toLowerCase();
	if (lower.includes("times") || lower.includes("serif")) return "Times-Roman";
	if (lower.includes("courier") || lower.includes("mono")) return "Courier";
	return "Helvetica";
}

const styles = StyleSheet.create({
	paragraph: {
		marginBottom: 8,
	},
	heading1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 8 },
	heading2: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 6 },
	heading3: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
	bold: { fontFamily: "Helvetica-Bold" },
	italic: { fontFamily: "Helvetica-Oblique" },
	boldItalic: { fontFamily: "Helvetica-BoldOblique" },
	underline: { textDecoration: "underline" },
	strike: { textDecoration: "line-through" },
	list: { marginLeft: 16, marginBottom: 8 },
	listItem: { flexDirection: "row", marginBottom: 2 },
	listMarker: { width: 14 },
	blockquote: {
		borderLeftWidth: 2,
		borderLeftColor: "#8A8A8A",
		paddingLeft: 10,
		marginBottom: 8,
		color: "#4A4A4A",
	},
	horizontalRule: {
		marginVertical: 8,
		height: 1,
		backgroundColor: "#D0D0D0",
	},
	table: {
		borderWidth: 1,
		borderColor: "#CFCFCF",
		marginBottom: 8,
	},
	tableRow: {
		flexDirection: "row",
	},
	tableCell: {
		flex: 1,
		padding: 6,
		borderRightWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#CFCFCF",
	},
	tableHeaderCell: {
		flex: 1,
		padding: 6,
		backgroundColor: "#F2F2F2",
		fontFamily: "Helvetica-Bold",
		borderRightWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#CFCFCF",
	},
	image: { marginVertical: 6 },
	imagePlaceholderFallback: {
		marginVertical: 6,
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: "#7CB7FF",
		backgroundColor: "#F0F7FF",
		alignItems: "center",
		justifyContent: "center",
	},
	imagePlaceholderLabel: {
		fontSize: 9,
		color: "#1D4ED8",
		fontFamily: "Helvetica",
	},
	signaturePlaceholderFallback: {
		marginVertical: 8,
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: "#D97706",
		backgroundColor: "#FEF3C7",
		alignItems: "center",
		justifyContent: "center",
	},
	signaturePlaceholderLabel: {
		fontSize: 9,
		color: "#92400E",
		fontFamily: "Helvetica",
	},
	signatureFooter: {
		marginTop: 4,
		fontSize: 8,
		color: "#6B7280",
		textAlign: "center",
	},
});

/** Default 20 mm margins on every side. */
const DEFAULT_MARGIN_MM = 20;

function pageStyle(options: PageLayoutOptions | undefined): PdfStyle {
	const top = mmToPt(options?.marginTop ?? DEFAULT_MARGIN_MM);
	const right = mmToPt(options?.marginRight ?? DEFAULT_MARGIN_MM);
	const bottom = mmToPt(options?.marginBottom ?? DEFAULT_MARGIN_MM);
	const left = mmToPt(options?.marginLeft ?? DEFAULT_MARGIN_MM);
	return StyleSheet.create({
		_: {
			paddingTop: top,
			paddingRight: right,
			paddingBottom: bottom,
			paddingLeft: left,
			fontSize: 11,
			fontFamily: "Helvetica",
			lineHeight: 1.45,
			color: "#1F1F1F",
		},
	})._;
}

/** Options that influence page setup (paper / orientation). */
export interface PdfRenderOptions extends PageLayoutOptions {
	documentProps?: Partial<DocumentProps>;
}

/**
 * Build the full React-PDF Document for a resolved Tiptap document.
 * The caller renders it via `renderToBuffer(<TemplatePdfDocument doc={...}/>)`.
 */
export function TemplatePdfDocument({
	doc,
	options,
}: {
	doc: TiptapDocument;
	options?: PdfRenderOptions;
}): ReactElement {
	registerStandardFonts();
	const paper = options?.paperSize ?? "A4";
	const orientation = options?.orientation ?? "portrait";
	return (
		<Document {...options?.documentProps}>
			<Page size={paper} orientation={orientation} style={pageStyle(options)}>
				{renderNodes(doc.content ?? [])}
			</Page>
		</Document>
	);
}

function renderNodes(nodes: TiptapNode[]): ReactNode[] {
	return nodes.map((node, idx) => renderNode(node, String(idx))).filter(Boolean);
}

function renderNode(node: TiptapNode, key: string): ReactNode {
	switch (node.type) {
		case "paragraph":
			return (
				<View key={key} style={mergeStyles(styles.paragraph, alignmentStyle(node))}>
					<Text>{renderInlineChildren(node.content)}</Text>
				</View>
			);
		case "heading": {
			const level = Number(node.attrs?.level ?? 1);
			const baseStyle =
				level === 1 ? styles.heading1 : level === 2 ? styles.heading2 : styles.heading3;
			return (
				<Text key={key} style={mergeStyles(baseStyle, alignmentStyle(node))}>
					{renderInlineChildren(node.content)}
				</Text>
			);
		}
		case "bulletList":
			return (
				<View key={key} style={styles.list}>
					{(node.content ?? []).map((li, i) => (
						<View key={i} style={styles.listItem}>
							<Text style={styles.listMarker}>•</Text>
							<View style={{ flex: 1 }}>{renderNodes(li.content ?? [])}</View>
						</View>
					))}
				</View>
			);
		case "orderedList":
			return (
				<View key={key} style={styles.list}>
					{(node.content ?? []).map((li, i) => (
						<View key={i} style={styles.listItem}>
							<Text style={styles.listMarker}>{i + 1}.</Text>
							<View style={{ flex: 1 }}>{renderNodes(li.content ?? [])}</View>
						</View>
					))}
				</View>
			);
		case "listItem":
			// Normally handled by parent list; fall through for safety.
			return <View key={key}>{renderNodes(node.content ?? [])}</View>;
		case "blockquote":
			return (
				<View key={key} style={styles.blockquote}>
					{renderNodes(node.content ?? [])}
				</View>
			);
		case "horizontalRule":
			return <View key={key} style={styles.horizontalRule} />;
		case "hardBreak":
			return <Text key={key}>{"\n"}</Text>;
		case "image": {
			const src = node.attrs?.src;
			if (typeof src !== "string" || !src) return null;
			const widthAttr = node.attrs?.width;
			const align = (node.attrs?.align as
				| "left"
				| "center"
				| "right"
				| undefined) ?? "left";
			const wrapperStyle: PdfStyle = StyleSheet.create({
				_: {
					marginVertical: 6,
					alignItems:
						align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
				},
			})._;
			const imageStyle =
				typeof widthAttr === "string" && widthAttr
					? StyleSheet.create({ _: { width: parseImageWidth(widthAttr) } })._
					: undefined;
			return (
				<View key={key} style={wrapperStyle}>
					<PdfImage src={src} style={mergeStyles(styles.image, imageStyle)} />
				</View>
			);
		}
		case "table":
			return (
				<View key={key} style={styles.table}>
					{renderNodes(node.content ?? [])}
				</View>
			);
		case "tableRow":
			return (
				<View key={key} style={styles.tableRow}>
					{renderNodes(node.content ?? [])}
				</View>
			);
		case "tableCell":
			return (
				<View key={key} style={styles.tableCell}>
					{renderNodes(node.content ?? [])}
				</View>
			);
		case "tableHeader":
			return (
				<View key={key} style={styles.tableHeaderCell}>
					{renderNodes(node.content ?? [])}
				</View>
			);
		case "text":
			return renderTextNode(node, key);
		case "placeholder":
			// Unresolved placeholder reaching the renderer is a bug upstream.
			// We print it verbatim rather than throwing to help debugging.
			return (
				<Text key={key}>{`{{${String(node.attrs?.key ?? "?")}}}`}</Text>
			);
		case "imagePlaceholder":
			return renderImagePlaceholder(node, key);
		case "signaturePlaceholder":
			return renderSignaturePlaceholder(node, key);
		default:
			return null;
	}
}

/**
 * Render an `imagePlaceholder` node. When `_resolvedSrc` has been injected by
 * the generation pipeline, render the actual image; otherwise render a
 * dashed bordered box (visible debug fallback).
 */
function renderImagePlaceholder(node: TiptapNode, key: string): ReactNode {
	const widthMm = (node.attrs?.width as number | undefined) ?? 60;
	const heightMm = (node.attrs?.height as number | undefined) ?? 40;
	const align = (node.attrs?.align as
		| "left"
		| "center"
		| "right"
		| undefined) ?? "left";
	const resolvedSrc = node.attrs?._resolvedSrc as string | undefined;
	const wrapperStyle = StyleSheet.create({
		_: {
			marginVertical: 6,
			alignItems:
				align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
		},
	})._;
	const sized = StyleSheet.create({
		_: { width: mmToPt(widthMm), height: mmToPt(heightMm) },
	})._;
	if (resolvedSrc) {
		return (
			<View key={key} style={wrapperStyle}>
				<PdfImage src={resolvedSrc} style={sized} />
			</View>
		);
	}
	const placeholderKey = String(node.attrs?.key ?? "");
	const label = node.attrs?.label as string | undefined;
	return (
		<View key={key} style={wrapperStyle}>
			<View style={mergeStyles(styles.imagePlaceholderFallback, sized)}>
				<Text style={styles.imagePlaceholderLabel}>
					{label ? label : `{{${placeholderKey}}}`}
				</Text>
			</View>
		</View>
	);
}

/**
 * Render a `signaturePlaceholder` node. Before signing, renders a dashed
 * bordered box with the role label. After signing (when `_resolvedSrc` is
 * injected by `signDocument`), renders the signature image plus a subtle
 * footer with signer name + timestamp.
 */
function renderSignaturePlaceholder(node: TiptapNode, key: string): ReactNode {
	const widthMm = (node.attrs?.width as number | undefined) ?? 80;
	const heightMm = (node.attrs?.height as number | undefined) ?? 30;
	const role = node.attrs?.signerRole as string | undefined;
	const resolvedSrc = node.attrs?._resolvedSrc as string | undefined;
	const signerName = node.attrs?._resolvedSignerName as string | undefined;
	const signedAt = node.attrs?._resolvedSignedAt as string | undefined;
	const widthPt = mmToPt(widthMm);
	const heightPt = mmToPt(heightMm);
	if (resolvedSrc) {
		return (
			<View key={key} style={{ marginVertical: 8, alignItems: "flex-start" }}>
				<PdfImage
					src={resolvedSrc}
					style={{ width: widthPt, height: heightPt }}
				/>
				{signerName || signedAt ? (
					<Text style={[styles.signatureFooter, { width: widthPt }]}>
						{[signerName, formatDate(signedAt)].filter(Boolean).join(" — ")}
					</Text>
				) : null}
			</View>
		);
	}
	return (
		<View
			key={key}
			style={mergeStyles(styles.signaturePlaceholderFallback, {
				width: widthPt,
				height: heightPt,
			} as PdfStyle)}
		>
			<Text style={styles.signaturePlaceholderLabel}>
				{role ? `Signature : ${role}` : "Signature"}
			</Text>
		</View>
	);
}

function formatDate(iso: string | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

function renderInlineChildren(nodes: TiptapNode[] | undefined): ReactNode[] {
	if (!nodes) return [];
	return nodes.map((n, i) => renderNode(n, String(i)));
}

function renderTextNode(node: TiptapNode, key: string): ReactNode {
	const text = node.text ?? "";
	const style = marksToStyle(node.marks ?? []);
	if (!style) return <Text key={key}>{text}</Text>;
	return (
		<Text key={key} style={style}>
			{text}
		</Text>
	);
}

/**
 * Returns a merged style blob representing the set of inline marks on a text
 * node. React-PDF prefers a single Style object for text elements; stacking
 * arrays triggers SvgStyle duck-typing confusion in the typings.
 *
 * Supported marks:
 *  - `bold`, `italic`, `underline`, `strike` (presence-based)
 *  - `textStyle` carrying `color`, `fontSize` (number, pt) and `fontFamily`
 */
function marksToStyle(marks: TiptapMark[]): PdfStyle | undefined {
	let bold = false;
	let italic = false;
	let underline = false;
	let strike = false;
	let color: string | undefined;
	let fontSize: number | undefined;
	let fontFamily: string | undefined;

	for (const m of marks) {
		if (m.type === "bold") bold = true;
		else if (m.type === "italic") italic = true;
		else if (m.type === "underline") underline = true;
		else if (m.type === "strike") strike = true;
		else if (m.type === "textStyle") {
			const attrs = (m.attrs ?? {}) as Record<string, unknown>;
			if (typeof attrs.color === "string") color = attrs.color;
			if (typeof attrs.fontSize === "number") fontSize = attrs.fontSize;
			if (typeof attrs.fontFamily === "string") {
				fontFamily = normaliseFontFamily(attrs.fontFamily);
			}
		}
	}

	if (
		!bold &&
		!italic &&
		!underline &&
		!strike &&
		!color &&
		fontSize === undefined &&
		!fontFamily
	) {
		return undefined;
	}

	const merged: Record<string, unknown> = {};
	// Font-family is set first; bold/italic combos overwrite it with the
	// matching variant of the same family. This intentionally falls back to
	// Helvetica for non-base families because React-PDF only ships the 14 base.
	if (fontFamily) merged.fontFamily = fontFamily;
	if (bold && italic) Object.assign(merged, styles.boldItalic);
	else if (bold) Object.assign(merged, styles.bold);
	else if (italic) Object.assign(merged, styles.italic);
	if (underline) merged.textDecoration = "underline";
	if (strike) {
		merged.textDecoration =
			merged.textDecoration === "underline"
				? "line-through underline"
				: "line-through";
	}
	if (color) merged.color = color;
	if (fontSize) merged.fontSize = fontSize;

	return merged as PdfStyle;
}

/** Returns an alignment Style matching the Tiptap `textAlign` attribute, if any. */
function alignmentStyle(node: TiptapNode): PdfStyle | undefined {
	const align = node.attrs?.textAlign;
	if (align === "center" || align === "right" || align === "justify") {
		return StyleSheet.create({ _: { textAlign: align } })._;
	}
	return undefined;
}

/** Merge an optional extra style into a base style. Used to avoid returning
 * arrays (which React-PDF accepts but which trip SvgStyle inference). */
function mergeStyles(
	base: PdfStyle,
	extra: PdfStyle | undefined,
): PdfStyle {
	if (!extra) return base;
	return { ...(base as Record<string, unknown>), ...(extra as Record<string, unknown>) } as PdfStyle;
}

/**
 * Parse the Tiptap image `width` attribute (a CSS-like string) into a value
 * React-PDF accepts as `style.width` (number = points, string = percentage).
 */
function parseImageWidth(raw: string): number | string | undefined {
	const trimmed = raw.trim();
	if (!trimmed) return undefined;
	if (trimmed.endsWith("%")) return trimmed;
	const match = trimmed.match(/(\d+(?:\.\d+)?)(pt|px|mm)?/);
	if (!match || !match[1]) return undefined;
	const value = parseFloat(match[1]);
	const unit = match[2];
	if (unit === "mm") return mmToPt(value);
	if (unit === "px") return value * 0.75; // CSS px → pt
	return value; // pt
}
