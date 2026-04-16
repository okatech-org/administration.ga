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
 * Sizes are in PDF points. Paper defaults: A4 portrait (595×842 pt).
 */

import {
	Document,
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

import type { PageLayoutOptions, TiptapDocument, TiptapMark, TiptapNode } from "./types.js";

const styles = StyleSheet.create({
	page: {
		paddingTop: 56,
		paddingBottom: 56,
		paddingHorizontal: 56,
		fontSize: 11,
		fontFamily: "Helvetica",
		lineHeight: 1.45,
		color: "#1F1F1F",
	},
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
	image: { marginVertical: 6, maxWidth: "100%" },
});

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
	const paper = options?.paperSize ?? "A4";
	const orientation = options?.orientation ?? "portrait";
	return (
		<Document {...options?.documentProps}>
			<Page size={paper} orientation={orientation} style={styles.page}>
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
			return <PdfImage key={key} src={src} style={styles.image} />;
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
		default:
			return null;
	}
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
 */
function marksToStyle(marks: TiptapMark[]): PdfStyle | undefined {
	let bold = false;
	let italic = false;
	let underline = false;
	let strike = false;
	for (const m of marks) {
		if (m.type === "bold") bold = true;
		else if (m.type === "italic") italic = true;
		else if (m.type === "underline") underline = true;
		else if (m.type === "strike") strike = true;
	}
	if (!bold && !italic && !underline && !strike) return undefined;
	const merged: Record<string, unknown> = {};
	if (bold && italic) Object.assign(merged, styles.boldItalic);
	else if (bold) Object.assign(merged, styles.bold);
	else if (italic) Object.assign(merged, styles.italic);
	if (underline) Object.assign(merged, styles.underline);
	if (strike) Object.assign(merged, styles.strike);
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
