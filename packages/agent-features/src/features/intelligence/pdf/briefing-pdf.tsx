/**
 * Briefing Renseignement — Générateur PDF
 *
 * Génère un briefing IA au format PDF (en-tête classification, corps
 * markdown parsé en blocs typés). Utilise @react-pdf/renderer.
 *
 * Usage :
 *   const blob = await generateBriefingPDFBlob(briefing);
 *   downloadBriefingPDF(briefing);
 */

import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	pdf,
} from "@react-pdf/renderer";

interface BriefingData {
	title: string;
	content: string;
	classification: "internal" | "restricted" | "secret" | "top_secret";
	model: string;
	generatedAt: number;
	costMicroCents?: number;
}

const CLASSIFICATION_LABEL: Record<BriefingData["classification"], string> = {
	internal: "INTERNE",
	restricted: "RESTREINT",
	secret: "SECRET",
	top_secret: "TRÈS SECRET",
};

const CLASSIFICATION_COLOR: Record<BriefingData["classification"], string> = {
	internal: "#475569",
	restricted: "#b45309",
	secret: "#b91c1c",
	top_secret: "#7f1d1d",
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
	page: {
		padding: 40,
		fontSize: 10,
		fontFamily: "Helvetica",
		color: "#1e1e1e",
	},
	classificationBanner: {
		padding: 8,
		marginBottom: 20,
		borderRadius: 4,
		borderWidth: 1,
		alignItems: "center",
	},
	classificationLabel: {
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		letterSpacing: 1.5,
	},
	classificationMeta: {
		fontSize: 8,
		marginTop: 3,
		color: "#475569",
	},
	title: {
		fontSize: 18,
		fontFamily: "Helvetica-Bold",
		marginBottom: 6,
		color: "#0f172a",
	},
	meta: {
		fontSize: 8,
		color: "#64748b",
		marginBottom: 18,
	},
	heading2: {
		fontSize: 13,
		fontFamily: "Helvetica-Bold",
		marginTop: 14,
		marginBottom: 6,
		color: "#0f172a",
	},
	heading3: {
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		marginTop: 10,
		marginBottom: 4,
		color: "#1e293b",
	},
	paragraph: {
		fontSize: 10,
		lineHeight: 1.5,
		marginBottom: 6,
		color: "#1e293b",
	},
	bullet: {
		fontSize: 10,
		lineHeight: 1.5,
		marginBottom: 3,
		color: "#1e293b",
		paddingLeft: 12,
	},
	quote: {
		fontSize: 9,
		fontStyle: "italic",
		color: "#64748b",
		marginBottom: 8,
		paddingLeft: 8,
		borderLeftWidth: 2,
		borderLeftColor: "#cbd5e1",
		borderLeftStyle: "solid",
	},
	footer: {
		position: "absolute",
		bottom: 20,
		left: 40,
		right: 40,
		fontSize: 7,
		color: "#94a3b8",
		textAlign: "center",
		borderTopWidth: 1,
		borderTopColor: "#e2e8f0",
		borderTopStyle: "solid",
		paddingTop: 6,
	},
});

// ─── Markdown parsing (subset) ──────────────────────────────

type Block =
	| { type: "h2"; text: string }
	| { type: "h3"; text: string }
	| { type: "quote"; text: string }
	| { type: "bullet"; text: string }
	| { type: "paragraph"; text: string };

function parseMarkdownBlocks(content: string): Block[] {
	const lines = content.split(/\r?\n/);
	const blocks: Block[] = [];
	let buffer: string[] = [];

	const flushParagraph = () => {
		if (buffer.length > 0) {
			blocks.push({ type: "paragraph", text: buffer.join(" ") });
			buffer = [];
		}
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		if (line === "") {
			flushParagraph();
			continue;
		}
		if (line.startsWith("## ")) {
			flushParagraph();
			blocks.push({ type: "h2", text: stripFormatting(line.slice(3)) });
			continue;
		}
		if (line.startsWith("### ")) {
			flushParagraph();
			blocks.push({ type: "h3", text: stripFormatting(line.slice(4)) });
			continue;
		}
		if (line.startsWith("# ")) {
			flushParagraph();
			blocks.push({ type: "h2", text: stripFormatting(line.slice(2)) });
			continue;
		}
		if (line.startsWith("> ")) {
			flushParagraph();
			blocks.push({ type: "quote", text: stripFormatting(line.slice(2)) });
			continue;
		}
		if (/^[-*]\s+/.test(line)) {
			flushParagraph();
			blocks.push({
				type: "bullet",
				text: `• ${stripFormatting(line.replace(/^[-*]\s+/, ""))}`,
			});
			continue;
		}
		if (/^\d+\.\s+/.test(line)) {
			flushParagraph();
			blocks.push({
				type: "bullet",
				text: stripFormatting(line),
			});
			continue;
		}
		buffer.push(stripFormatting(line));
	}
	flushParagraph();
	return blocks;
}

function stripFormatting(s: string): string {
	return s
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/__([^_]+)__/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/_([^_]+)_/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

// ─── PDF document ───────────────────────────────────────────

export function IntelligenceBriefingPDF({ data }: { data: BriefingData }) {
	const blocks = parseMarkdownBlocks(data.content);
	const classifColor = CLASSIFICATION_COLOR[data.classification];
	const classifLabel = CLASSIFICATION_LABEL[data.classification];
	const generatedDate = new Date(data.generatedAt).toLocaleString("fr-FR", {
		dateStyle: "long",
		timeStyle: "short",
	});

	return (
		<Document
			title={data.title}
			author="Agence de Renseignement"
			subject={`Briefing ${classifLabel}`}
			creator="Diplomate.ga — Module Renseignement"
		>
			<Page size="A4" style={styles.page}>
				<View
					style={[
						styles.classificationBanner,
						{ borderColor: classifColor, backgroundColor: `${classifColor}15` },
					]}
				>
					<Text style={[styles.classificationLabel, { color: classifColor }]}>
						CLASSIFICATION : {classifLabel}
					</Text>
					<Text style={styles.classificationMeta}>
						Usage strictement interne à l&apos;agence — diffusion contrôlée
					</Text>
				</View>

				<Text style={styles.title}>{data.title}</Text>
				<Text style={styles.meta}>
					Généré le {generatedDate} · {data.model}
					{data.costMicroCents != null
						? ` · coût ${(data.costMicroCents / 1_000_000).toFixed(4)} ¢`
						: ""}
				</Text>

				{blocks.map((block, i) => {
					switch (block.type) {
						case "h2":
							return (
								<Text key={i} style={styles.heading2}>
									{block.text}
								</Text>
							);
						case "h3":
							return (
								<Text key={i} style={styles.heading3}>
									{block.text}
								</Text>
							);
						case "quote":
							return (
								<Text key={i} style={styles.quote}>
									{block.text}
								</Text>
							);
						case "bullet":
							return (
								<Text key={i} style={styles.bullet}>
									{block.text}
								</Text>
							);
						case "paragraph":
							return (
								<Text key={i} style={styles.paragraph}>
									{block.text}
								</Text>
							);
					}
				})}

				<Text style={styles.footer} fixed>
					Diplomate.ga — Module Renseignement souverain · {classifLabel} ·
					{` ${generatedDate}`}
				</Text>
			</Page>
		</Document>
	);
}

// ─── Public API ─────────────────────────────────────────────

export async function generateBriefingPDFBlob(
	data: BriefingData,
): Promise<Blob> {
	return await pdf(<IntelligenceBriefingPDF data={data} />).toBlob();
}

export async function downloadBriefingPDF(data: BriefingData): Promise<void> {
	const blob = await generateBriefingPDFBlob(data);
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${slugify(data.title)}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}
