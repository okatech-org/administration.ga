import type {
	HeaderFooterBlockResolved,
	TiptapDocument,
	TiptapNode,
} from "@workspace/document-rendering";
import type { OrgBranding } from "./validators";

/**
 * Fusionne l'entête / le pied de page résolus d'un modèle avec les
 * overrides déclarés dans le branding d'une représentation.
 *
 * Règles de composition de l'entête :
 *   1. Si la rep a défini `branding.headerLines` → override total (les
 *      lignes custom remplacent intégralement l'entête du template).
 *   2. Sinon, si le nom de la rep est connu (`org.name`) → on injecte
 *      automatiquement ce nom comme UNIQUE ligne d'entête (en majuscules).
 *   3. Sinon → on garde l'entête d'origine du template (fallback Madrid).
 *
 * Le pied fonctionne de manière indépendante : si la rep a des infos de
 * contact, elles remplacent le pied d'origine ; sinon le pied du template
 * est conservé.
 *
 * Le logo (sceau) reste intouché : il est identique pour toutes les reps.
 */
export function applyOrgBrandingToHeaderFooter(
	resolved: HeaderFooterBlockResolved | undefined,
	branding: OrgBranding | undefined,
	orgName?: string,
): HeaderFooterBlockResolved | undefined {
	if (!resolved) return resolved;

	const cleanedLines = (branding?.headerLines ?? [])
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const hasExplicitHeader = cleanedLines.length > 0;
	const hasOrgName = typeof orgName === "string" && orgName.trim().length > 0;
	const hasFooterOverride =
		Boolean(branding?.footerAddress) ||
		Boolean(branding?.footerPhone) ||
		Boolean(branding?.footerEmail);

	const shouldOverrideHeader = hasExplicitHeader || hasOrgName;
	if (!shouldOverrideHeader && !hasFooterOverride) return resolved;

	const headerLines = hasExplicitHeader
		? cleanedLines
		: hasOrgName
			? [orgName!.trim().toUpperCase()]
			: null;

	return {
		header: {
			...resolved.header,
			content: headerLines
				? buildHeaderFromLines(headerLines)
				: resolved.header.content,
		},
		footer: {
			...resolved.footer,
			content: hasFooterOverride
				? buildFooterFromBranding(branding!)
				: resolved.footer.content,
		},
	};
}

/**
 * Rend un entête centré gras à partir d'une liste de lignes, suivi d'un
 * séparateur de 15 tirets (convention visuelle des 25 templates).
 */
function buildHeaderFromLines(lines: string[]): TiptapDocument {
	const paragraphs: TiptapNode[] = lines.map((line) => ({
		type: "paragraph",
		attrs: { textAlign: "center" },
		content: [{ type: "text", text: line, marks: [{ type: "bold" }] }],
	}));
	paragraphs.push({
		type: "paragraph",
		attrs: { textAlign: "center" },
		content: [{ type: "text", text: "---------------" }],
	});
	return { type: "doc", content: paragraphs };
}

/**
 * Rend un pied de page centré italique à partir de l'adresse + téléphone +
 * email. Chaque champ manquant est simplement omis.
 */
function buildFooterFromBranding(branding: OrgBranding): TiptapDocument {
	const paragraphs: TiptapNode[] = [];

	if (branding.footerAddress) {
		paragraphs.push({
			type: "paragraph",
			attrs: { textAlign: "center" },
			content: [
				{
					type: "text",
					text: branding.footerAddress,
					marks: [{ type: "italic" }],
				},
			],
		});
	}

	const contactParts: string[] = [];
	if (branding.footerPhone) contactParts.push(`TEL : ${branding.footerPhone}`);
	if (branding.footerEmail)
		contactParts.push(`Email : ${branding.footerEmail}`);
	if (contactParts.length > 0) {
		paragraphs.push({
			type: "paragraph",
			attrs: { textAlign: "center" },
			content: [
				{
					type: "text",
					text: contactParts.join(" | "),
					marks: [{ type: "italic" }],
				},
			],
		});
	}

	return { type: "doc", content: paragraphs };
}
