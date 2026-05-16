/**
 * AI summary — markdown → React-PDF renderer.
 *
 * Convertit le Markdown produit par `ai.dashboardAI.generateDashboardSummary`
 * en un Document A4 portrait. Parseur minimal — on contrôle le prompt côté
 * action Convex pour garantir qu'on n'a que :
 *   - titres `##`
 *   - paragraphes
 *   - listes à puces `-` ou `*`
 *   - inline **bold**
 */

import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	pdf,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";

const COLORS = {
	text: "#14130f",
	textMuted: "#6a665b",
	textFaint: "#9a9588",
	border: "#e6e2d8",
	gabonBlue: "#0b4f9c",
	gabonGreen: "#0a8a3b",
	gabonYellow: "#f1c531",
	purple: "#6f51c4",
};

const styles = StyleSheet.create({
	page: {
		padding: "20mm",
		fontFamily: "Helvetica",
		fontSize: 11,
		color: COLORS.text,
		lineHeight: 1.55,
	},
	eyebrow: {
		fontSize: 8,
		color: COLORS.textMuted,
		letterSpacing: 1.5,
		textTransform: "uppercase",
		fontFamily: "Helvetica-Bold",
	},
	title: {
		fontSize: 22,
		fontFamily: "Helvetica-Bold",
		marginTop: 4,
		color: COLORS.text,
	},
	subtitle: {
		fontSize: 10,
		color: COLORS.textMuted,
		marginTop: 4,
	},
	stripe: {
		flexDirection: "row",
		width: 60,
		height: 3,
		marginTop: 10,
	},
	stripeGreen: { flex: 1, backgroundColor: COLORS.gabonGreen },
	stripeYellow: { flex: 1, backgroundColor: COLORS.gabonYellow },
	stripeBlue: { flex: 1, backgroundColor: COLORS.gabonBlue },
	hr: {
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		marginVertical: 16,
	},
	h2: {
		fontFamily: "Helvetica-Bold",
		fontSize: 13,
		marginTop: 16,
		marginBottom: 8,
		color: COLORS.text,
	},
	h3: {
		fontFamily: "Helvetica-Bold",
		fontSize: 11,
		marginTop: 12,
		marginBottom: 6,
		color: COLORS.text,
	},
	paragraph: {
		marginBottom: 8,
	},
	listItem: {
		flexDirection: "row",
		marginBottom: 4,
	},
	bullet: {
		width: 12,
		color: COLORS.purple,
		fontFamily: "Helvetica-Bold",
	},
	listText: { flex: 1 },
	bold: { fontFamily: "Helvetica-Bold" },
	footer: {
		position: "absolute",
		bottom: "12mm",
		left: "20mm",
		right: "20mm",
		fontSize: 8,
		color: COLORS.textFaint,
		textAlign: "center",
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		paddingTop: 6,
	},
});

// ─── Markdown parser (minimal, prompt-constrained) ─────────────────────────

type Block =
	| { type: "heading"; level: number; text: string }
	| { type: "paragraph"; text: string }
	| { type: "list"; items: string[] };

function parseMarkdown(md: string): Block[] {
	const lines = md.replace(/\r\n/g, "\n").split("\n");
	const blocks: Block[] = [];
	let cursor: Block | null = null;

	const flush = () => {
		cursor = null;
	};

	for (const rawLine of lines) {
		const line = rawLine.trimEnd();
		if (line.trim() === "") {
			flush();
			continue;
		}
		const heading = line.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			flush();
			blocks.push({
				type: "heading",
				level: heading[1].length,
				text: heading[2].trim(),
			});
			continue;
		}
		const bullet = line.match(/^[\s]*[-*]\s+(.*)$/);
		if (bullet) {
			if (cursor?.type !== "list") {
				cursor = { type: "list", items: [] };
				blocks.push(cursor);
			}
			cursor.items.push(bullet[1].trim());
			continue;
		}
		if (cursor?.type === "paragraph") {
			cursor.text += " " + line.trim();
		} else {
			cursor = { type: "paragraph", text: line.trim() };
			blocks.push(cursor);
		}
	}
	return blocks;
}

/**
 * Tokenise un texte avec marqueurs `**bold**` en segments React-PDF.
 * On reste minimal : un seul niveau de gras, pas d'italique ni de code
 * inline (le prompt côté serveur s'en tient à ça).
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
	const parts: ReactNode[] = [];
	const regex = /\*\*([^*]+)\*\*/g;
	let lastIndex = 0;
	let m: RegExpExecArray | null;
	let i = 0;
	// eslint-disable-next-line no-cond-assign
	while ((m = regex.exec(text)) !== null) {
		if (m.index > lastIndex) {
			parts.push(
				<Text key={`${keyPrefix}-t-${i++}`}>
					{text.slice(lastIndex, m.index)}
				</Text>,
			);
		}
		parts.push(
			<Text key={`${keyPrefix}-b-${i++}`} style={styles.bold}>
				{m[1]}
			</Text>,
		);
		lastIndex = m.index + m[0].length;
	}
	if (lastIndex < text.length) {
		parts.push(
			<Text key={`${keyPrefix}-t-${i++}`}>{text.slice(lastIndex)}</Text>,
		);
	}
	return parts;
}

// ─── PDF Document ──────────────────────────────────────────────────────────

export interface AiSummaryPdfData {
	markdown: string;
	generatedAt: number;
	locale: "fr" | "en";
}

export function AiSummaryDocument({ data }: { data: AiSummaryPdfData }) {
	const { markdown, generatedAt, locale } = data;
	const dateLabel = new Date(generatedAt).toLocaleDateString(
		locale === "en" ? "en-US" : "fr-FR",
		{ weekday: "long", day: "numeric", month: "long", year: "numeric" },
	);
	const timeLabel = new Date(generatedAt).toLocaleTimeString(
		locale === "en" ? "en-US" : "fr-FR",
		{ hour: "2-digit", minute: "2-digit" },
	);
	const blocks = parseMarkdown(markdown);

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View>
					<Text style={styles.eyebrow}>
						CENTRE DE COMMANDEMENT · CONSULAT.GA
					</Text>
					<Text style={styles.title}>
						{locale === "en" ? "Strategic AI summary" : "Synthèse stratégique IA"}
					</Text>
					<Text style={styles.subtitle}>
						{dateLabel} · {timeLabel}
					</Text>
					<View style={styles.stripe}>
						<View style={styles.stripeGreen} />
						<View style={styles.stripeYellow} />
						<View style={styles.stripeBlue} />
					</View>
				</View>

				<View style={styles.hr} />

				{blocks.map((block, idx) => {
					const key = `b-${idx}`;
					if (block.type === "heading") {
						const style = block.level <= 2 ? styles.h2 : styles.h3;
						return (
							<Text key={key} style={style}>
								{block.text}
							</Text>
						);
					}
					if (block.type === "list") {
						return (
							<View key={key} style={{ marginBottom: 8 }}>
								{block.items.map((item, j) => (
									<View key={`${key}-i-${j}`} style={styles.listItem}>
										<Text style={styles.bullet}>•</Text>
										<Text style={styles.listText}>
											{renderInline(item, `${key}-i-${j}`)}
										</Text>
									</View>
								))}
							</View>
						);
					}
					return (
						<Text key={key} style={styles.paragraph}>
							{renderInline(block.text, key)}
						</Text>
					);
				})}

				<Text style={styles.footer}>
					{locale === "en"
						? `Generated by Gemini · ${dateLabel} at ${timeLabel} · Confidential — internal use Consulat.ga`
						: `Généré par Gemini · ${dateLabel} à ${timeLabel} · Document confidentiel — usage interne Consulat.ga`}
				</Text>
			</Page>
		</Document>
	);
}

export async function downloadAiSummary(data: AiSummaryPdfData) {
	const blob = await pdf(<AiSummaryDocument data={data} />).toBlob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const stamp = new Date(data.generatedAt).toISOString().slice(0, 10);
	a.download = `synthese-ia-${stamp}.pdf`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
