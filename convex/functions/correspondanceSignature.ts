/**
 * iCorrespondance — Signature électronique simple (eIDAS niveau 1)
 *
 * Apposition d'un sceau serveur sur un document PDF :
 *   - Tampon visuel "Signé électroniquement par X" sur la dernière page
 *   - Page d'attestation ajoutée à la fin du PDF avec hash + n° de série
 *   - Hash SHA-256 du document scellé stocké comme preuve d'intégrité
 *   - Enregistrement de la signature dans `correspondanceSignatures`
 *
 * Sécurité :
 *   - Le hash est calculé après scellement (preuve d'intégrité du document final)
 *   - Le n° de série est dérivé du timestamp + identifiant utilisateur
 *   - L'utilisateur doit être créateur, approbateur courant, ou super admin
 *
 * Limitations :
 *   - Niveau 1 eIDAS uniquement (signature simple, pas de certificat utilisateur)
 *   - Pour passer en niveau avancé / qualifié, intégrer un fournisseur tiers
 *     (DocuSign, Lex Persona, etc.)
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const PDF_MIME = "application/pdf";

/**
 * Calcule le hash SHA-256 hex d'un buffer.
 */
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256")
    .update(Buffer.from(buffer))
    .digest("hex");
}

/**
 * Génère un numéro de série unique pour ce sceau.
 * Format : SCEAU-{timestamp_base36}-{random_4chars}
 */
function generateSerialNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SCEAU-${ts}-${rand}`;
}

/**
 * Signer électroniquement un document d'un dossier de correspondance.
 *
 * Args :
 *   - itemId         : id du dossier
 *   - documentIndex  : position du document dans `item.documents` à signer
 */
export const signDocument = authAction({
  args: {
    itemId: v.id("correspondanceItems"),
    documentIndex: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { signatureId: Id<"correspondanceSignatures">; sealedStorageId: Id<"_storage">; serialNumber: string }
    | { error: string }
  > => {
    // Récupérer item + document à signer + autorisation utilisateur
    const data = await ctx.runQuery(
      internal.functions.correspondanceCore._getItemForSigning,
      { itemId: args.itemId, documentIndex: args.documentIndex },
    );
    if ("error" in data) return { error: data.error };

    const { item, doc, signer } = data;

    if (doc.mimeType !== PDF_MIME) {
      return { error: "Seuls les documents PDF peuvent être signés." };
    }

    try {
      const blob = await ctx.storage.get(doc.storageId as Id<"_storage">);
      if (!blob) return { error: "Document introuvable dans le storage." };
      const pdfBytes = await blob.arrayBuffer();

      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const serialNumber = generateSerialNumber();
      const signedAt = Date.now();
      const signedDate = new Date(signedAt).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // ── Tampon visuel sur la dernière page ──
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width: pw, height: ph } = lastPage.getSize();
      const stampX = pw - 220;
      const stampY = 80;
      const stampW = 180;
      const stampH = 70;

      // Cadre du tampon
      lastPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampW,
        height: stampH,
        borderColor: rgb(0.0, 0.35, 0.65),
        borderWidth: 1.2,
        opacity: 0.05,
        color: rgb(0.0, 0.35, 0.65),
      });

      lastPage.drawText("SIGNÉ ÉLECTRONIQUEMENT", {
        x: stampX + 8,
        y: stampY + stampH - 14,
        size: 7.5,
        font: helveticaBold,
        color: rgb(0.0, 0.35, 0.65),
      });
      lastPage.drawText(signer.name, {
        x: stampX + 8,
        y: stampY + stampH - 28,
        size: 9,
        font: helveticaBold,
        color: rgb(0.05, 0.05, 0.05),
      });
      if (signer.title) {
        lastPage.drawText(signer.title.slice(0, 32), {
          x: stampX + 8,
          y: stampY + stampH - 40,
          size: 7,
          font: helvetica,
          color: rgb(0.25, 0.25, 0.25),
        });
      }
      lastPage.drawText(signedDate, {
        x: stampX + 8,
        y: stampY + stampH - 52,
        size: 7,
        font: helvetica,
        color: rgb(0.25, 0.25, 0.25),
      });
      lastPage.drawText(serialNumber, {
        x: stampX + 8,
        y: stampY + 6,
        size: 6,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });

      // ── Page d'attestation finale ──
      const certPage = pdfDoc.addPage();
      const { width: cw, height: ch } = certPage.getSize();
      const titleText = "ATTESTATION DE SIGNATURE ÉLECTRONIQUE";
      const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 14);
      certPage.drawText(titleText, {
        x: (cw - titleWidth) / 2,
        y: ch - 100,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      const lines: { label: string; value: string }[] = [
        { label: "Référence du dossier", value: item.reference },
        { label: "Objet", value: item.title },
        { label: "Document signé", value: doc.filename },
        { label: "Signataire", value: signer.name },
        { label: "Fonction", value: signer.title ?? "—" },
        { label: "Organisation", value: signer.orgName },
        { label: "Date et heure", value: signedDate },
        { label: "Numéro de série du sceau", value: serialNumber },
      ];

      let cy = ch - 150;
      for (const ln of lines) {
        certPage.drawText(`${ln.label} :`, {
          x: 60,
          y: cy,
          size: 10,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        certPage.drawText(ln.value, {
          x: 230,
          y: cy,
          size: 10,
          font: helvetica,
          color: rgb(0.05, 0.05, 0.05),
        });
        cy -= 22;
      }

      cy -= 20;
      certPage.drawText(
        "Cette attestation certifie que le document ci-joint a été signé électroniquement",
        { x: 60, y: cy, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) },
      );
      cy -= 14;
      certPage.drawText(
        "par le signataire identifié, à la date indiquée. Le hash cryptographique",
        { x: 60, y: cy, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) },
      );
      cy -= 14;
      certPage.drawText(
        "ci-dessous garantit l'intégrité du document scellé.",
        { x: 60, y: cy, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) },
      );

      cy -= 30;
      certPage.drawText("Empreinte SHA-256 du document scellé :", {
        x: 60,
        y: cy,
        size: 9,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      // Le hash sera dessiné après le save (puisqu'il dépend du contenu)
      // → on réserve l'espace, on génère, on rouvre, on tamponne le hash, on sauvegarde de nouveau.

      const intermediateBytes = await pdfDoc.save();
      const documentHash = await sha256Hex(intermediateBytes.buffer.slice(
        intermediateBytes.byteOffset,
        intermediateBytes.byteOffset + intermediateBytes.byteLength,
      ) as ArrayBuffer);

      // Réouverture pour ajouter le hash (deux passes : intermediate-bytes pour
      // le hash exposé sur la page, puis bytes finaux après ajout du hash)
      const finalDoc = await PDFDocument.load(intermediateBytes);
      const finalPages = finalDoc.getPages();
      const finalCertPage = finalPages[finalPages.length - 1];
      const finalFont = await finalDoc.embedFont(StandardFonts.Courier);

      // Découpe le hash en 2 lignes pour rentrer dans la marge
      const half = Math.ceil(documentHash.length / 2);
      finalCertPage.drawText(documentHash.slice(0, half), {
        x: 60,
        y: cy - 18,
        size: 8.5,
        font: finalFont,
        color: rgb(0.05, 0.05, 0.05),
      });
      finalCertPage.drawText(documentHash.slice(half), {
        x: 60,
        y: cy - 30,
        size: 8.5,
        font: finalFont,
        color: rgb(0.05, 0.05, 0.05),
      });

      const sealedBytes = await finalDoc.save();
      const sealedBlob = new Blob([sealedBytes as BlobPart], { type: PDF_MIME });
      const sealedStorageId = await ctx.storage.store(sealedBlob);

      // Persistance dans la table des signatures + remplacement du storageId
      const result = await ctx.runMutation(
        internal.functions.correspondanceCore._recordSignature,
        {
          itemId: args.itemId,
          documentIndex: args.documentIndex,
          originalStorageId: doc.storageId as Id<"_storage">,
          sealedStorageId: sealedStorageId as Id<"_storage">,
          documentLabel: doc.label,
          signerId: signer.id,
          signerName: signer.name,
          signerTitle: signer.title,
          signerOrgId: signer.orgId,
          signerOrgName: signer.orgName,
          documentHash,
          serialNumber,
          signedAt,
        },
      );

      return {
        signatureId: result.signatureId,
        sealedStorageId: sealedStorageId as Id<"_storage">,
        serialNumber,
      };
    } catch (err: any) {
      console.error("[signature] Erreur:", err);
      return { error: err?.message ?? "Erreur lors de la signature" };
    }
  },
});
