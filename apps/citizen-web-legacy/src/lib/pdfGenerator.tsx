import type { Doc } from "@convex/_generated/dataModel";
import {
	Document,
	Page,
	pdf,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";

// Types
interface LocalizedString {
	fr: string;
	en?: string;
}

interface TemplateContent {
	header?: {
		showLogo: boolean;
		showOrgName: boolean;
		showOrgAddress: boolean;
		title?: LocalizedString;
		subtitle?: LocalizedString;
	};
	body: Array<{
		type: "paragraph" | "heading" | "list" | "table" | "signature";
		content: LocalizedString;
		style?: {
			fontSize?: number;
			fontWeight?: "normal" | "bold";
			textAlign?: "left" | "center" | "right" | "justify";
			marginTop?: number;
			marginBottom?: number;
		};
	}>;
	footer?: {
		showDate: boolean;
		showSignature: boolean;
		signatureTitle?: LocalizedString;
		additionalText?: LocalizedString;
	};
}

export interface GenerationData {
	// User data
	user?: {
		firstName?: string;
		lastName?: string;
		email?: string;
	};
	// Profile data (more detailed)
	profile?: {
		identity?: {
			firstName?: string;
			lastName?: string;
			dateOfBirth?: string;
			placeOfBirth?: string;
			gender?: string;
		};
		contact?: {
			email?: string;
			phone?: string;
			address?: string;
			city?: string;
			country?: string;
		};
	};
	// Request data
	request?: {
		reference?: string;
		createdAt?: number;
		status?: string;
		estimatedDays?: number;
	};
	// Form submission data
	formData?: Record<string, unknown>;
	// Organization data
	org?: {
		name?: string;
		address?: string;
		phone?: string;
		email?: string;
	};
	// Service data
	service?: {
		name?: LocalizedString;
	};
	// System data (auto-generated)
	system?: {
		currentDate?: string;
		referenceNumber?: string;
	};
}

// Styles
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

// Language helper
const getText = (
	localized: LocalizedString | undefined,
	lang: "fr" | "en" = "fr",
): string => {
	if (!localized) return "";
	return localized[lang] || localized.fr || "";
};

// Placeholder replacement
const replacePlaceholders = (text: string, data: GenerationData): string => {
	return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		// Try different data sources
		const value =
			// User
			(data.user as Record<string, unknown>)?.[key] ||
			// Profile identity
			(data.profile?.identity as Record<string, unknown>)?.[key] ||
			// Profile contact
			(data.profile?.contact as Record<string, unknown>)?.[key] ||
			// Request
			(data.request as Record<string, unknown>)?.[key] ||
			// Form data (flat access)
			(data.formData as Record<string, unknown>)?.[key] ||
			// Org
			(data.org as Record<string, unknown>)?.[key] ||
			// System
			(data.system as Record<string, unknown>)?.[key] ||
			// Fallback
			`[${key}]`;

		// Format dates
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

// Format current date
const formatCurrentDate = (lang: "fr" | "en" = "fr"): string => {
	const now = new Date();
	const options: Intl.DateTimeFormatOptions = {
		day: "numeric",
		month: "long",
		year: "numeric",
	};
	return now.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", options);
};

// PDF Document Component
interface DocumentPDFProps {
	template: Doc<"documentTemplates">;
	data: GenerationData;
	lang?: "fr" | "en";
}

export const DocumentPDF = ({
	template,
	data,
	lang = "fr",
}: DocumentPDFProps) => {
	const content = template.content as TemplateContent;

	// Add system data
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
				{/* Header */}
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

				{/* Body */}
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

				{/* Footer */}
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

// Generate PDF blob
export const generatePDFBlob = async (
	template: Doc<"documentTemplates">,
	data: GenerationData,
	lang: "fr" | "en" = "fr",
): Promise<Blob> => {
	const doc = <DocumentPDF template={template} data={data} lang={lang} />;
	const blob = await pdf(doc).toBlob();
	return blob;
};

// Generate PDF and trigger download
export const downloadPDF = async (
	template: Doc<"documentTemplates">,
	data: GenerationData,
	filename: string,
	lang: "fr" | "en" = "fr",
): Promise<void> => {
	const blob = await generatePDFBlob(template, data, lang);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

// Get PDF as base64 for storage
export const getPDFBase64 = async (
	template: Doc<"documentTemplates">,
	data: GenerationData,
	lang: "fr" | "en" = "fr",
): Promise<string> => {
	const blob = await generatePDFBlob(template, data, lang);
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64 = reader.result as string;
			resolve(base64.split(",")[1]); // Remove data:application/pdf;base64, prefix
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
};
