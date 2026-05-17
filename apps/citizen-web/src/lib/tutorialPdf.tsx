/**
 * Génération du PDF d'un guide « Ressources ».
 *
 * Côté client uniquement (`@react-pdf/renderer` instancie une VM PDF dans le
 * navigateur, pas d'aller-retour serveur). Le rendu reflète la structure de
 * la page publique : header, résumé, prérequis, étapes, tarifs, délais, FAQ,
 * sources. Les sections vides sont silencieusement omises.
 *
 * Le `step.body` étant du HTML Tiptap, on le parse avec DOMParser pour en
 * extraire des blocs (paragraphes, listes, titres) — react-pdf ne rend pas
 * HTML nativement.
 */

import type { Doc } from "@convex/_generated/dataModel";
import {
	Document,
	Page,
	pdf,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import { getLocalizedValue } from "@/lib/i18n-utils";

type Tutorial = Doc<"tutorials">;
type Lang = "fr" | "en";

const styles = StyleSheet.create({
	page: {
		padding: 48,
		paddingBottom: 64,
		fontSize: 10.5,
		fontFamily: "Helvetica",
		color: "#1f1f23",
		lineHeight: 1.5,
	},
	headerBadge: {
		fontSize: 8,
		color: "#1a59b8",
		marginBottom: 6,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	h1: {
		fontSize: 22,
		fontFamily: "Helvetica-Bold",
		color: "#0b0b0d",
		marginBottom: 8,
	},
	lede: {
		fontSize: 11,
		color: "#48484c",
		marginBottom: 18,
		lineHeight: 1.55,
	},
	summaryCard: {
		borderWidth: 0.5,
		borderColor: "#d4d4d8",
		borderRadius: 6,
		padding: 12,
		marginBottom: 22,
		backgroundColor: "#fafafa",
	},
	summaryTitle: {
		fontSize: 9,
		color: "#71717a",
		marginBottom: 6,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	summaryRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 3,
		marginBottom: 3,
	},
	summaryLabel: { color: "#71717a", fontSize: 10 },
	summaryValue: {
		color: "#1f1f23",
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
	},
	section: { marginTop: 18 },
	h2: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		color: "#0b0b0d",
		marginBottom: 4,
	},
	sectionHint: {
		fontSize: 9.5,
		color: "#71717a",
		marginBottom: 10,
	},
	prereqRow: {
		flexDirection: "row",
		marginBottom: 7,
		alignItems: "flex-start",
	},
	prereqBullet: {
		width: 9,
		height: 9,
		borderWidth: 1,
		borderColor: "#a1a1aa",
		borderRadius: 1.5,
		marginRight: 8,
		marginTop: 2,
	},
	prereqMain: { flex: 1 },
	prereqTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
	prereqDesc: { fontSize: 9.5, color: "#71717a", marginTop: 1 },
	prereqPill: {
		fontSize: 8,
		color: "#71717a",
		marginLeft: 8,
		paddingTop: 2,
	},
	step: {
		borderWidth: 0.5,
		borderColor: "#e4e4e7",
		borderRadius: 5,
		padding: 11,
		marginBottom: 8,
	},
	stepHeader: { flexDirection: "row", alignItems: "flex-start" },
	stepNumber: {
		width: 22,
		height: 22,
		borderRadius: 3,
		backgroundColor: "#27272a",
		color: "#fff",
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		textAlign: "center",
		paddingTop: 5,
		marginRight: 10,
	},
	stepMain: { flex: 1 },
	stepTitle: { fontSize: 11.5, fontFamily: "Helvetica-Bold" },
	stepMeta: { fontSize: 9, color: "#71717a", marginTop: 2 },
	stepBody: { marginTop: 8, fontSize: 10, color: "#3f3f46" },
	feeRow: {
		flexDirection: "row",
		paddingVertical: 5,
		borderBottomWidth: 0.5,
		borderColor: "#e4e4e7",
	},
	feeLabel: { flex: 1, fontSize: 10 },
	feeAmount: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		marginLeft: 8,
	},
	delayRow: {
		flexDirection: "row",
		paddingVertical: 5,
		borderBottomWidth: 0.5,
		borderColor: "#e4e4e7",
	},
	delayLabel: { flex: 1 },
	delayLabelMain: { fontSize: 10, fontFamily: "Helvetica-Bold" },
	delayLabelDesc: { fontSize: 9.5, color: "#71717a", marginTop: 1 },
	delaySpeed: { fontSize: 9, color: "#71717a", marginLeft: 8, paddingTop: 2 },
	faq: { marginBottom: 9 },
	faqQ: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
	faqA: { fontSize: 10, color: "#3f3f46" },
	source: { fontSize: 9.5, color: "#1a59b8", marginBottom: 3 },
	footer: {
		position: "absolute",
		bottom: 24,
		left: 48,
		right: 48,
		fontSize: 8.5,
		color: "#a1a1aa",
		flexDirection: "row",
		justifyContent: "space-between",
		borderTopWidth: 0.5,
		borderColor: "#e4e4e7",
		paddingTop: 8,
	},
	paragraph: { fontSize: 10, color: "#3f3f46", marginBottom: 4 },
	listItem: {
		fontSize: 10,
		color: "#3f3f46",
		marginBottom: 3,
		flexDirection: "row",
	},
	listBullet: { width: 12 },
	listText: { flex: 1 },
	h3: {
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		color: "#27272a",
		marginTop: 6,
		marginBottom: 3,
	},
});

const REQUIREMENT_LABEL_FR: Record<string, string> = {
	required: "Obligatoire",
	optional: "Optionnel",
	ifAvailable: "Si disponible",
};
const SPEED_LABEL_FR: Record<string, string> = {
	fast: "Rapide",
	standard: "Standard",
	long: "Long",
};

/**
 * Parse une chaîne HTML simple (Tiptap) en blocs ordonnés pour le PDF.
 * Retombe sur du texte brut si DOMParser n'est pas dispo (SSR).
 */
type Block =
	| { type: "p"; text: string }
	| { type: "h3"; text: string }
	| { type: "ul"; items: string[] }
	| { type: "ol"; items: string[] };

function parseHtmlToBlocks(html: string): Block[] {
	if (typeof DOMParser === "undefined") {
		const stripped = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
		return stripped ? [{ type: "p", text: stripped }] : [];
	}
	const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
	const root = doc.body.firstElementChild;
	if (!root) return [];
	const blocks: Block[] = [];
	for (const node of Array.from(root.childNodes)) {
		if (node.nodeType === 3) {
			const text = (node.textContent ?? "").trim();
			if (text) blocks.push({ type: "p", text });
			continue;
		}
		if (node.nodeType !== 1) continue;
		const el = node as Element;
		const tag = el.tagName.toLowerCase();
		const text = (el.textContent ?? "").trim();
		if (!text && tag !== "ul" && tag !== "ol") continue;
		switch (tag) {
			case "h1":
			case "h2":
			case "h3":
			case "h4":
			case "h5":
			case "h6":
				blocks.push({ type: "h3", text });
				break;
			case "ul":
			case "ol": {
				const items = Array.from(el.querySelectorAll(":scope > li"))
					.map((li) => (li.textContent ?? "").trim())
					.filter((t) => t.length > 0);
				if (items.length > 0) {
					blocks.push({ type: tag === "ol" ? "ol" : "ul", items });
				}
				break;
			}
			case "p":
			default:
				blocks.push({ type: "p", text });
				break;
		}
	}
	return blocks;
}

function RenderBlocks({ blocks }: { blocks: Block[] }) {
	return (
		<>
			{blocks.map((b, i) => {
				if (b.type === "p") {
					return (
						<Text key={i} style={styles.paragraph}>
							{b.text}
						</Text>
					);
				}
				if (b.type === "h3") {
					return (
						<Text key={i} style={styles.h3}>
							{b.text}
						</Text>
					);
				}
				return (
					<View key={i}>
						{b.items.map((item, j) => (
							<View key={j} style={styles.listItem}>
								<Text style={styles.listBullet}>
									{b.type === "ol" ? `${j + 1}.` : "•"}
								</Text>
								<Text style={styles.listText}>{item}</Text>
							</View>
						))}
					</View>
				);
			})}
		</>
	);
}

function safe(text: string | undefined | null): string {
	return (text ?? "").toString().trim();
}

const TutorialPDF = ({
	tutorial,
	lang,
	siteOrigin,
}: {
	tutorial: Tutorial;
	lang: Lang;
	siteOrigin: string;
}) => {
	const title = safe(getLocalizedValue(tutorial.titleI18n ?? tutorial.title, lang));
	const excerpt = safe(getLocalizedValue(tutorial.excerptI18n ?? tutorial.excerpt, lang));
	const lede = safe(getLocalizedValue(tutorial.ledeI18n ?? tutorial.lede ?? "", lang));
	const summary = tutorial.procedureSummary;
	const prerequisites = tutorial.prerequisites ?? [];
	const steps = tutorial.steps ?? [];
	const fees = tutorial.fees ?? [];
	const delays = tutorial.delays ?? [];
	const faqItems = tutorial.faqItems ?? [];
	const sources = tutorial.sources ?? [];

	const updatedDate = tutorial.updatedAt
		? new Date(tutorial.updatedAt).toLocaleDateString(
				lang === "en" ? "en-GB" : "fr-FR",
				{ year: "numeric", month: "long", day: "numeric" },
		  )
		: null;
	const generatedDate = new Date().toLocaleDateString(
		lang === "en" ? "en-GB" : "fr-FR",
		{ year: "numeric", month: "long", day: "numeric" },
	);

	const hasNoStructure =
		prerequisites.length === 0 &&
		steps.length === 0 &&
		fees.length === 0 &&
		delays.length === 0 &&
		faqItems.length === 0;
	const legacyContent = safe(
		getLocalizedValue((tutorial.contentI18n ?? tutorial.content ?? "") as string, lang),
	);
	const legacyBlocks = hasNoStructure && legacyContent
		? parseHtmlToBlocks(legacyContent)
		: [];

	return (
		<Document
			title={title}
			author="Consulat.ga"
			creator="Consulat.ga"
			producer="Consulat.ga"
		>
			<Page size="A4" style={styles.page}>
				<Text style={styles.headerBadge}>Guide procédural · Consulat.ga</Text>
				<Text style={styles.h1}>{title}</Text>
				{(lede || excerpt) && (
					<Text style={styles.lede}>{lede || excerpt}</Text>
				)}

				{summary && (
					<View style={styles.summaryCard}>
						<Text style={styles.summaryTitle}>Résumé de la démarche</Text>
						{summary.steps && (
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Étapes</Text>
								<Text style={styles.summaryValue}>
									{safe(getLocalizedValue(summary.stepsI18n ?? summary.steps, lang))}
								</Text>
							</View>
						)}
						{summary.delay && (
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Délai</Text>
								<Text style={styles.summaryValue}>
									{safe(getLocalizedValue(summary.delayI18n ?? summary.delay, lang))}
								</Text>
							</View>
						)}
						{summary.fees && (
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Frais</Text>
								<Text style={styles.summaryValue}>
									{safe(getLocalizedValue(summary.feesI18n ?? summary.fees, lang))}
								</Text>
							</View>
						)}
						{summary.location && (
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Lieu</Text>
								<Text style={styles.summaryValue}>
									{safe(getLocalizedValue(summary.locationI18n ?? summary.location, lang))}
								</Text>
							</View>
						)}
						{updatedDate && (
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Mis à jour</Text>
								<Text style={styles.summaryValue}>{updatedDate}</Text>
							</View>
						)}
					</View>
				)}

				{prerequisites.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.h2}>Pièces à fournir</Text>
						<Text style={styles.sectionHint}>
							Cochez-les au fur et à mesure pour suivre votre préparation.
						</Text>
						{prerequisites.map((p, i) => {
							const pTitle = safe(getLocalizedValue(p.titleI18n ?? p.title, lang));
							const pDesc = safe(
								getLocalizedValue(p.descriptionI18n ?? p.description ?? "", lang),
							);
							return (
								<View key={i} style={styles.prereqRow} wrap={false}>
									<View style={styles.prereqBullet} />
									<View style={styles.prereqMain}>
										<Text style={styles.prereqTitle}>{pTitle}</Text>
										{pDesc && <Text style={styles.prereqDesc}>{pDesc}</Text>}
									</View>
									<Text style={styles.prereqPill}>
										{REQUIREMENT_LABEL_FR[p.requirement] ?? "Optionnel"}
									</Text>
								</View>
							);
						})}
					</View>
				)}

				{steps.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.h2}>Les {steps.length} étapes</Text>
						<Text style={styles.sectionHint}>
							Suivez les étapes dans l'ordre. Chaque étape précise sa durée et
							son lieu lorsque pertinent.
						</Text>
						{steps.map((s) => {
							const sTitle = safe(getLocalizedValue(s.titleI18n ?? s.title, lang));
							const sDur = safe(
								getLocalizedValue(s.durationLabelI18n ?? s.durationLabel ?? "", lang),
							);
							const sLoc = safe(
								getLocalizedValue(s.locationLabelI18n ?? s.locationLabel ?? "", lang),
							);
							const sBody = safe(
								getLocalizedValue(s.bodyI18n ?? s.body ?? "", lang),
							);
							const blocks = sBody ? parseHtmlToBlocks(sBody) : [];
							return (
								<View key={s.number} style={styles.step} wrap={false}>
									<View style={styles.stepHeader}>
										<Text style={styles.stepNumber}>
											{String(s.number).padStart(2, "0")}
										</Text>
										<View style={styles.stepMain}>
											<Text style={styles.stepTitle}>{sTitle}</Text>
											{(sDur || sLoc) && (
												<Text style={styles.stepMeta}>
													{[sDur, sLoc].filter(Boolean).join(" · ")}
												</Text>
											)}
										</View>
									</View>
									{blocks.length > 0 && (
										<View style={styles.stepBody}>
											<RenderBlocks blocks={blocks} />
										</View>
									)}
								</View>
							);
						})}
					</View>
				)}

				{fees.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.h2}>Tarifs &amp; modes de paiement</Text>
						{fees.map((f, i) => {
							const label = safe(getLocalizedValue(f.labelI18n ?? f.label, lang));
							const desc = safe(
								getLocalizedValue(f.descriptionI18n ?? f.description ?? "", lang),
							);
							const delay = safe(
								getLocalizedValue(f.delayI18n ?? f.delay ?? "", lang),
							);
							return (
								<View key={i} style={styles.feeRow} wrap={false}>
									<View style={styles.feeLabel}>
										<Text>
											{label}
											{f.badge ? ` (${f.badge})` : ""}
										</Text>
										{(desc || delay) && (
											<Text style={{ fontSize: 9, color: "#71717a", marginTop: 1 }}>
												{[desc, delay].filter(Boolean).join(" · ")}
											</Text>
										)}
									</View>
									<Text style={styles.feeAmount}>{f.amount}</Text>
								</View>
							);
						})}
					</View>
				)}

				{delays.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.h2}>Délais &amp; retrait</Text>
						{delays.map((d) => {
							const label = safe(getLocalizedValue(d.labelI18n ?? d.label, lang));
							const desc = safe(
								getLocalizedValue(d.descriptionI18n ?? d.description, lang),
							);
							return (
								<View key={d.region} style={styles.delayRow} wrap={false}>
									<View style={styles.delayLabel}>
										<Text style={styles.delayLabelMain}>{label}</Text>
										{desc && <Text style={styles.delayLabelDesc}>{desc}</Text>}
									</View>
									<Text style={styles.delaySpeed}>
										{SPEED_LABEL_FR[d.speed] ?? "Standard"}
									</Text>
								</View>
							);
						})}
					</View>
				)}

				{faqItems.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.h2}>Questions fréquentes</Text>
						{faqItems.map((f, i) => {
							const q = safe(getLocalizedValue(f.questionI18n ?? f.question, lang));
							const a = safe(getLocalizedValue(f.answerI18n ?? f.answer, lang));
							return (
								<View key={i} style={styles.faq} wrap={false}>
									<Text style={styles.faqQ}>{q}</Text>
									<Text style={styles.faqA}>{a}</Text>
								</View>
							);
						})}
					</View>
				)}

				{legacyBlocks.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.h2}>Contenu</Text>
						<RenderBlocks blocks={legacyBlocks} />
					</View>
				)}

				{sources.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.h2}>Sources</Text>
						{sources.map((s) => (
							<Text key={s.url} style={styles.source}>
								{s.label} — {s.url}
							</Text>
						))}
					</View>
				)}

				<View style={styles.footer} fixed>
					<Text>
						{siteOrigin} · Généré le {generatedDate}
					</Text>
					<Text
						render={({ pageNumber, totalPages }) =>
							`${pageNumber} / ${totalPages}`
						}
					/>
				</View>
			</Page>
		</Document>
	);
};

function buildFilename(tutorial: Tutorial): string {
	const base = (tutorial.slug || "guide").toLowerCase();
	const date = new Date().toISOString().slice(0, 10);
	return `consulat-ga_${base}_${date}.pdf`;
}

export async function downloadTutorialPdf(
	tutorial: Tutorial,
	lang: Lang = "fr",
): Promise<void> {
	const siteOrigin =
		typeof window !== "undefined" ? window.location.origin : "https://consulat.ga";
	const blob = await pdf(
		<TutorialPDF tutorial={tutorial} lang={lang} siteOrigin={siteOrigin} />,
	).toBlob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = buildFilename(tutorial);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
