import type { Doc } from "@convex/_generated/dataModel";
import {
	Document,
	Page,
	pdf,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import type { GenerationData, LocalizedString, TemplateContent } from "./pdfGenerator.types";

const styles = StyleSheet.create({
	page: {
		padding: 50,
		fontSize: 11,
		fontFamily: "Helvetica",
		lineHeight: 1.5,
	},
	header: {
		marginBottom: 30,
		textAlign: "center",
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 5,
		textTransform: "uppercase",
		letterSpacing: 2,
	},
	subtitle: {
		fontSize: 12,
		marginBottom: 10,
		color: "#666",
	},
	orgName: {
		fontSize: 14,
		fontWeight: "bold",
		marginBottom: 3,
	},
	orgAddress: {
		fontSize: 9,
		color: "#666",
		marginBottom: 20,
	},
	body: {
		marginBottom: 30,
	},
	paragraph: {
		marginBottom: 10,
		textAlign: "justify",
	},
	heading: {
		fontSize: 13,
		fontWeight: "bold",
		marginTop: 15,
		marginBottom: 10,
	},
	footer: {
		position: "absolute",
		bottom: 50,
		left: 50,
		right: 50,
	},
	dateLocation: {
		textAlign: "right",
		marginBottom: 30,
		fontSize: 10,
	},
	signature: {
		textAlign: "right",
		marginTop: 30,
	},
	signatureTitle: {
		fontWeight: "bold",
		marginBottom: 5,
	},
	signatureLine: {
		marginTop: 40,
		borderTopWidth: 1,
		borderTopColor: "#333",
		width: 150,
		alignSelf: "flex-end",
	},
	additionalText: {
		fontSize: 9,
		color: "#666",
		marginTop: 20,
		textAlign: "center",
		fontStyle: "italic",
	},
});

const getText = (
	localized: LocalizedString | undefined,
	lang: "fr" | "en" = "fr",
): string => {
	if (!localized) return "";
	return localized[lang] || localized.fr || "";
};

const replacePlaceholders = (text: string, data: GenerationData): string => {
	return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
		const value =
			(data.user as Record<string, unknown>)?.[key] ||
			(data.profile?.identity as Record<string, unknown>)?.[key] ||
			(data.profile?.contact as Record<string, unknown>)?.[key] ||
			(data.request as Record<string, unknown>)?.[key] ||
			(data.formData as Record<string, unknown>)?.[key] ||
			(data.org as Record<string, unknown>)?.[key] ||
			(data.system as Record<string, unknown>)?.[key] ||
			`[${key}]`;

		if (key.toLowerCase().includes("date") && typeof value === "number") {
			return new Date(value).toLocaleDateString("fr-FR", {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
		}

		return String(value);
	});
};

const formatCurrentDate = (lang: "fr" | "en" = "fr"): string => {
	const now = new Date();
	const options: Intl.DateTimeFormatOptions = {
		day: "numeric",
		month: "long",
		year: "numeric",
	};
	return now.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", options);
};

interface DocumentPDFProps {
	template: Doc<"documentTemplates">;
	data: GenerationData;
	lang?: "fr" | "en";
}

const DocumentPDF = ({ template, data, lang = "fr" }: DocumentPDFProps) => {
	const content = template.content as unknown as TemplateContent;

	const enrichedData: GenerationData = {
		...data,
		system: {
			currentDate: formatCurrentDate(lang),
			referenceNumber: data.request?.reference || `REF-${Date.now()}`,
			...data.system,
		},
	};

	return (
		<Document>
			<Page size={template.paperSize || "A4"} style={styles.page}>
				{content.header && (
					<View style={styles.header}>
						{content.header.showOrgName && enrichedData.org?.name && (
							<Text style={styles.orgName}>{enrichedData.org.name}</Text>
						)}
						{content.header.showOrgAddress && enrichedData.org?.address && (
							<Text style={styles.orgAddress}>{enrichedData.org.address}</Text>
						)}
						{content.header.title && (
							<Text style={styles.title}>
								{getText(content.header.title, lang)}
							</Text>
						)}
						{content.header.subtitle && (
							<Text style={styles.subtitle}>
								{getText(content.header.subtitle, lang)}
							</Text>
						)}
					</View>
				)}

				<View style={styles.body}>
					{content.body.map((block, index) => {
						const text = replacePlaceholders(
							getText(block.content, lang),
							enrichedData,
						);

						const blockStyle = {
							...(block.type === "heading" ? styles.heading : styles.paragraph),
							...(block.style?.marginTop && {
								marginTop: block.style.marginTop,
							}),
							...(block.style?.marginBottom && {
								marginBottom: block.style.marginBottom,
							}),
							...(block.style?.textAlign && {
								textAlign: block.style.textAlign,
							}),
							...(block.style?.fontSize && { fontSize: block.style.fontSize }),
							...(block.style?.fontWeight === "bold" && { fontWeight: "bold" }),
						};

						return (
							<Text key={index} style={blockStyle}>
								{text}
							</Text>
						);
					})}
				</View>

				{content.footer && (
					<View style={styles.footer}>
						{content.footer.showDate && (
							<Text style={styles.dateLocation}>
								{lang === "fr" ? "Fait à" : "Done at"} Paris,{" "}
								{lang === "fr" ? "le" : "on"} {enrichedData.system?.currentDate}
							</Text>
						)}
						{content.footer.showSignature && (
							<View style={styles.signature}>
								{content.footer.signatureTitle && (
									<Text style={styles.signatureTitle}>
										{getText(content.footer.signatureTitle, lang)}
									</Text>
								)}
								<View style={styles.signatureLine} />
							</View>
						)}
						{content.footer.additionalText && (
							<Text style={styles.additionalText}>
								{getText(content.footer.additionalText, lang)}
							</Text>
						)}
					</View>
				)}
			</Page>
		</Document>
	);
};

export const generatePDFBlob = async (
	template: Doc<"documentTemplates">,
	data: GenerationData,
	lang: "fr" | "en" = "fr",
): Promise<Blob> => {
	const doc = <DocumentPDF template={template} data={data} lang={lang} />;
	return pdf(doc).toBlob();
};
