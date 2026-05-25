/**
 * Lettre Diplomatique — Générateur PDF
 *
 * Génère une lettre officielle de l'Ambassade du Gabon au format PDF
 * avec en-tête République Gabonaise, protocole diplomatique et formules.
 */

import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DiplomaticLetterData {
  // En-tête
  reference: string;
  date?: Date;
  city?: string;

  // Expéditeur
  ambassadorName?: string;
  ambassadorTitle?: string;
  orgName: string;
  orgAddress?: string;

  // Destinataire
  recipientName: string;
  recipientTitle?: string;
  recipientOrg?: string;
  recipientAddress?: string;

  // Contenu
  subject: string;
  content: string;
  letterFormat?: string;
}

export function generateDiplomaticLetterPDF(
  data: DiplomaticLetterData,
): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // ─── En-tête République Gabonaise ─────────────────────────────────

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("RÉPUBLIQUE GABONAISE", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(7);
  doc.text("Union — Travail — Justice", pageWidth / 2, y, { align: "center" });
  y += 3;

  // Ligne de séparation
  doc.setDrawColor(0, 158, 96); // Vert Gabon
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 2;
  doc.setDrawColor(252, 209, 22); // Jaune Gabon
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 2;
  doc.setDrawColor(58, 117, 196); // Bleu Gabon
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 6;

  // Ministère + Ambassade
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Ministère des Affaires Étrangères", marginLeft, y);
  y += 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.orgName, marginLeft, y);
  y += 4;
  if (data.orgAddress) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(data.orgAddress, marginLeft, y);
    y += 4;
  }

  // ─── Référence et date ────────────────────────────────────────────

  y += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Réf. : ${data.reference}`, marginLeft, y);

  const dateStr = format(data.date ?? new Date(), "d MMMM yyyy", {
    locale: fr,
  });
  const cityStr = data.city ?? "Paris";
  doc.text(`${cityStr}, le ${dateStr}`, pageWidth - marginRight, y, {
    align: "right",
  });
  y += 10;

  // ─── Destinataire ─────────────────────────────────────────────────

  const recipientX = pageWidth / 2 + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  if (data.recipientTitle) {
    doc.text(data.recipientTitle, recipientX, y);
    y += 4;
  }
  doc.text(data.recipientName, recipientX, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  if (data.recipientOrg) {
    doc.text(data.recipientOrg, recipientX, y);
    y += 4;
  }
  if (data.recipientAddress) {
    doc.text(data.recipientAddress, recipientX, y);
    y += 4;
  }
  y += 8;

  // ─── Objet ────────────────────────────────────────────────────────

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Objet : ${data.subject}`, marginLeft, y);
  y += 8;

  // ─── Corps de la lettre ───────────────────────────────────────────

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);

  const lines = doc.splitTextToSize(data.content, contentWidth);
  for (const line of lines) {
    if (y > 260) {
      doc.addPage();
      y = 25;
    }
    doc.text(line, marginLeft, y);
    y += 5;
  }

  // ─── Signature ────────────────────────────────────────────────────

  y += 15;
  if (y > 250) {
    doc.addPage();
    y = 40;
  }

  const sigX = pageWidth / 2 + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    data.ambassadorTitle ?? "L'Ambassadeur du Gabon",
    sigX,
    y,
  );
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text(data.ambassadorName ?? "[Nom de l'Ambassadeur]", sigX, y);

  // ─── Pied de page ────────────────────────────────────────────────

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${data.orgName} — Document officiel — Page ${i}/${pageCount}`,
      pageWidth / 2,
      290,
      { align: "center" },
    );
  }

  return doc;
}
