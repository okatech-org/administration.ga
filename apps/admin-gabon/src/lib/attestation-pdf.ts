/**
 * Attestation PDF Generator — Generates an official consular card attestation
 * Uses jsPDF for client-side PDF generation with République Gabonaise header,
 * coat of arms placeholder, and official format.
 */

import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Country code to label mapping
const COUNTRY_LABELS: Record<string, string> = {
	GA: "Gabon", FR: "France", ES: "Espagne", CM: "Cameroun", CG: "Congo",
	CD: "RD Congo", SN: "Sénégal", CI: "Côte d'Ivoire", MA: "Maroc",
	BE: "Belgique", CH: "Suisse", CA: "Canada", US: "États-Unis",
	DE: "Allemagne", IT: "Italie", GB: "Royaume-Uni", PT: "Portugal",
};

interface AttestationData {
	attestationNumber: string;
	generatedAt: number;
	cardNumber: string;
	cardIssuedAt: number;
	cardExpiresAt: number;
	identity: {
		firstName?: string;
		lastName?: string;
		birthDate?: number;
		birthPlace?: string;
		birthCountry?: string;
		gender?: string;
		nationality?: string;
	};
	passportInfo?: {
		number?: string;
		expiryDate?: number;
	};
	addresses?: {
		residence?: {
			street: string;
			city: string;
			postalCode: string;
			country: string;
		};
	};
	contacts?: {
		phone?: string;
		email?: string;
	};
	identityPhotoUrl?: string | null;
	org: {
		name: string;
		shortName: string;
		type: string;
		country: string;
		address: {
			street: string;
			city: string;
			postalCode: string;
			country: string;
		};
		phone?: string | null;
		email?: string | null;
		website?: string | null;
		logoUrl?: string | null;
		headOfMission?: string | null;
		headOfMissionTitle?: string | null;
	};
}

function fmtDate(ts?: number): string {
	if (!ts) return "—";
	return format(new Date(ts), "dd MMMM yyyy", { locale: fr });
}

function getCountryLabel(code?: string): string {
	if (!code) return "—";
	return COUNTRY_LABELS[code] || code;
}

export async function generateAttestationPDF(data: AttestationData): Promise<void> {
	const doc = new jsPDF({
		orientation: "portrait",
		unit: "mm",
		format: "a4",
	});

	const pageWidth = 210;
	const marginLeft = 25;
	const marginRight = 25;
	const contentWidth = pageWidth - marginLeft - marginRight;
	let y = 20;

	// ═══════════════════════════════════════════════════════════
	// HEADER — République Gabonaise
	// ═══════════════════════════════════════════════════════════
	
	doc.setFont("helvetica", "bold");
	doc.setFontSize(14);
	doc.setTextColor(0, 80, 0); // Dark green
	doc.text("RÉPUBLIQUE GABONAISE", pageWidth / 2, y, { align: "center" });
	y += 5;

	doc.setFontSize(8);
	doc.setFont("helvetica", "italic");
	doc.setTextColor(80, 80, 80);
	doc.text("Union — Travail — Justice", pageWidth / 2, y, { align: "center" });
	y += 8;

	// Coat of Arms placeholder — decorative separator
	doc.setDrawColor(0, 100, 0);
	doc.setLineWidth(0.5);
	doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
	y += 3;
	doc.setDrawColor(255, 204, 0); // Gold
	doc.line(pageWidth / 2 - 25, y, pageWidth / 2 + 25, y);
	y += 3;
	doc.setDrawColor(0, 100, 0);
	doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
	y += 8;

	// Ministry / Org header
	doc.setFont("helvetica", "bold");
	doc.setFontSize(11);
	doc.setTextColor(0, 0, 0);
	doc.text(data.org.name.toUpperCase(), pageWidth / 2, y, { align: "center" });
	y += 6;

	if (data.org.address) {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.setTextColor(80, 80, 80);
		doc.text(
			`${data.org.address.street}, ${data.org.address.postalCode} ${data.org.address.city}`,
			pageWidth / 2, y, { align: "center" },
		);
		y += 4;
		if (data.org.phone) {
			doc.text(`Tél: ${data.org.phone}`, pageWidth / 2, y, { align: "center" });
			y += 4;
		}
		if (data.org.email) {
			doc.text(`Email: ${data.org.email}`, pageWidth / 2, y, { align: "center" });
			y += 4;
		}
	}
	y += 8;

	// ═══════════════════════════════════════════════════════════
	// TITLE
	// ═══════════════════════════════════════════════════════════

	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.setTextColor(0, 80, 0);
	doc.text("ATTESTATION", pageWidth / 2, y, { align: "center" });
	y += 6;
	doc.setFontSize(11);
	doc.setTextColor(0, 0, 0);
	doc.text("DE CARTE CONSULAIRE", pageWidth / 2, y, { align: "center" });
	y += 5;

	// Reference number
	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	doc.setTextColor(100, 100, 100);
	doc.text(`Réf: ${data.attestationNumber}`, pageWidth / 2, y, { align: "center" });
	y += 10;

	// Decorative line
	doc.setDrawColor(0, 100, 0);
	doc.setLineWidth(0.3);
	doc.line(marginLeft, y, pageWidth - marginRight, y);
	y += 10;

	// ═══════════════════════════════════════════════════════════
	// BODY TEXT
	// ═══════════════════════════════════════════════════════════

	const fullName = `${data.identity.firstName || ""} ${(data.identity.lastName || "").toUpperCase()}`.trim();
	const genderTitle = data.identity.gender === "female" || data.identity.gender === "F"
		? "Madame" : "Monsieur";
	const genderPronoun = data.identity.gender === "female" || data.identity.gender === "F"
		? "la" : "le";

	const headTitle = data.org.headOfMissionTitle || "Le Consul Général";
	const headName = data.org.headOfMission || "";

	doc.setFont("helvetica", "normal");
	doc.setFontSize(11);
	doc.setTextColor(0, 0, 0);

	// Intro paragraph
	const introText = `${headTitle} du Gabon${data.org.address ? ` à ${data.org.address.city}` : ""} atteste par la présente que :`;
	const introLines = doc.splitTextToSize(introText, contentWidth);
	doc.text(introLines, marginLeft, y);
	y += introLines.length * 6 + 6;

	// Citizen info block
	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.text(`${genderTitle} ${fullName}`, marginLeft + 10, y);
	y += 7;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);

	const infoLines = [
		`Né(e) le ${fmtDate(data.identity.birthDate)}${data.identity.birthPlace ? ` à ${data.identity.birthPlace}` : ""}${data.identity.birthCountry ? ` (${getCountryLabel(data.identity.birthCountry)})` : ""}`,
		`Nationalité : ${getCountryLabel(data.identity.nationality)}`,
	];

	if (data.passportInfo?.number) {
		infoLines.push(`Passeport N° ${data.passportInfo.number}${data.passportInfo.expiryDate ? ` (expire le ${fmtDate(data.passportInfo.expiryDate)})` : ""}`);
	}

	if (data.addresses?.residence) {
		const addr = data.addresses.residence;
		infoLines.push(`Résidant au ${addr.street}, ${addr.postalCode} ${addr.city}, ${getCountryLabel(addr.country)}`);
	}

	for (const line of infoLines) {
		const splitLines = doc.splitTextToSize(line, contentWidth - 10);
		doc.text(splitLines, marginLeft + 10, y);
		y += splitLines.length * 5 + 2;
	}
	y += 6;

	// Card info
	doc.setFont("helvetica", "normal");
	doc.setFontSize(11);
	const cardText = `est bien titulaire d'une carte consulaire portant le numéro :`;
	doc.text(cardText, marginLeft, y);
	y += 8;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(14);
	doc.setTextColor(0, 80, 0);
	doc.text(data.cardNumber, pageWidth / 2, y, { align: "center" });
	y += 8;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(0, 0, 0);
	doc.text(`Délivrée le : ${fmtDate(data.cardIssuedAt)}`, marginLeft + 10, y);
	y += 5;
	doc.text(`Valide jusqu'au : ${fmtDate(data.cardExpiresAt)}`, marginLeft + 10, y);
	y += 10;

	// Closing paragraph
	doc.setFontSize(11);
	const closingText = `Cette attestation est délivrée à ${genderPronoun} intéressé(e) pour servir et valoir ce que de droit.`;
	const closingLines = doc.splitTextToSize(closingText, contentWidth);
	doc.text(closingLines, marginLeft, y);
	y += closingLines.length * 6 + 15;

	// ═══════════════════════════════════════════════════════════
	// SIGNATURE
	// ═══════════════════════════════════════════════════════════

	const signatureX = pageWidth - marginRight - 60;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.text(
		`Fait à ${data.org.address?.city || "—"}, le ${fmtDate(data.generatedAt)}`,
		signatureX, y,
	);
	y += 8;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text(headTitle, signatureX, y);
	y += 5;

	if (headName) {
		doc.setFont("helvetica", "italic");
		doc.setFontSize(10);
		doc.text(headName, signatureX, y);
	}
	y += 20;

	// ═══════════════════════════════════════════════════════════
	// TAMPON / CACHET placeholder
	// ═══════════════════════════════════════════════════════════

	// Draw a circular stamp placeholder
	doc.setDrawColor(0, 100, 0);
	doc.setLineWidth(0.5);
	doc.circle(signatureX + 20, y - 5, 15);
	doc.setFontSize(7);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(0, 100, 0);
	doc.text("CACHET", signatureX + 20, y - 7, { align: "center" });
	doc.text("OFFICIEL", signatureX + 20, y - 3, { align: "center" });

	// ═══════════════════════════════════════════════════════════
	// FOOTER
	// ═══════════════════════════════════════════════════════════

	const footerY = 280;
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(0.2);
	doc.line(marginLeft, footerY, pageWidth - marginRight, footerY);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(7);
	doc.setTextColor(150, 150, 150);
	doc.text(
		`Document généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })} — Ce document n'est valable que s'il est accompagné de la carte consulaire originale.`,
		pageWidth / 2, footerY + 4,
		{ align: "center", maxWidth: contentWidth },
	);

	// ═══════════════════════════════════════════════════════════
	// DOWNLOAD
	// ═══════════════════════════════════════════════════════════

	const fileName = `attestation_carte_consulaire_${data.cardNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
	doc.save(fileName);
}
