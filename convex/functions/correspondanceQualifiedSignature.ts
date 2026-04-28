/**
 * iCorrespondance — Signature électronique qualifiée (eIDAS niveau 3)
 *
 * Délègue la cérémonie de signature à un Prestataire de Services de
 * Confiance Qualifié via l'adapter `getQualifiedSignatureProvider()`.
 * Deux étapes :
 *   1. `requestQualifiedSignature` : envoie le PDF au provider, retourne
 *      l'URL de cérémonie où le signataire effectue sa signature qualifiée.
 *   2. `finalizeQualifiedSignature` : appelée via webhook ou polling après
 *      cérémonie, récupère le PDF scellé et l'enregistre comme signature
 *      niveau 3 dans `correspondanceSignatures`.
 *
 * Tant qu'aucun provider tiers n'est configuré, le mock par défaut renvoie
 * une URL placeholder — l'intégration réelle est branchée dans
 * `getQualifiedSignatureProvider()`.
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getQualifiedSignatureProvider } from "../lib/qualifiedSignatureProviders";

const PDF_MIME = "application/pdf";

/**
 * Lance une demande de signature qualifiée pour un document du dossier.
 * Retourne l'URL de cérémonie à ouvrir côté frontend.
 */
export const requestQualifiedSignature = authAction({
  args: {
    itemId: v.id("correspondanceItems"),
    documentIndex: v.number(),
    returnUrl: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { providerRef: string; provider: string; ceremonyUrl: string }
    | { error: string }
  > => {
    const data = await ctx.runQuery(
      internal.functions.correspondanceCore._getItemForSigning,
      { itemId: args.itemId, documentIndex: args.documentIndex },
    );
    if ("error" in data) return { error: data.error };

    const { item, doc, signer } = data;

    if (doc.mimeType !== PDF_MIME) {
      return {
        error: "Seuls les documents PDF peuvent être signés en niveau qualifié.",
      };
    }

    const blob = await ctx.storage.get(doc.storageId as Id<"_storage">);
    if (!blob) return { error: "Document introuvable dans le storage." };
    const pdfBytes = await blob.arrayBuffer();

    const provider = getQualifiedSignatureProvider();
    const result = await provider.requestSignature({
      pdfBytes,
      filename: doc.filename,
      signer: {
        id: signer.id,
        fullName: signer.name,
        email: (signer as any).email ?? "",
        title: signer.title,
        orgName: signer.orgName,
      },
      reference: item.reference,
      returnUrl: args.returnUrl,
    });

    if (!result.ok) return { error: result.error };

    return {
      providerRef: result.providerRef,
      provider: provider.id,
      ceremonyUrl: result.ceremonyUrl,
    };
  },
});

/**
 * Finalise la signature qualifiée : récupère le PDF scellé du provider et
 * l'enregistre comme signature niveau 3.
 *
 * À appeler après que le signataire a complété la cérémonie côté provider
 * (typiquement via un webhook ou un polling depuis le frontend).
 */
export const finalizeQualifiedSignature = authAction({
  args: {
    itemId: v.id("correspondanceItems"),
    documentIndex: v.number(),
    providerRef: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | {
        signatureId: Id<"correspondanceSignatures">;
        sealedStorageId: Id<"_storage">;
        serialNumber: string;
      }
    | { error: string }
  > => {
    const data = await ctx.runQuery(
      internal.functions.correspondanceCore._getItemForSigning,
      { itemId: args.itemId, documentIndex: args.documentIndex },
    );
    if ("error" in data) return { error: data.error };
    const { item, doc, signer } = data;

    const provider = getQualifiedSignatureProvider();
    const fetched = await provider.fetchCompleted(args.providerRef);
    if ("error" in fetched) return { error: fetched.error };

    if (!fetched.signedPdfBytes || fetched.signedPdfBytes.byteLength === 0) {
      return {
        error:
          "Le PDF signé qualifié est vide — la cérémonie n'est probablement pas terminée côté provider.",
      };
    }

    const blob = new Blob([fetched.signedPdfBytes as BlobPart], {
      type: PDF_MIME,
    });
    const sealedStorageId = (await ctx.storage.store(blob)) as Id<"_storage">;

    const recorded = (await ctx.runMutation(
      internal.functions.correspondanceCore._recordSignature,
      {
        itemId: args.itemId,
        documentIndex: args.documentIndex,
        originalStorageId: doc.storageId as Id<"_storage">,
        sealedStorageId,
        documentLabel: doc.label ?? doc.filename,
        signerId: signer.id,
        signerName: signer.name,
        signerTitle: signer.title,
        signerOrgId: signer.orgId,
        signerOrgName: signer.orgName,
        documentHash: fetched.documentHash,
        serialNumber: fetched.serialNumber,
        signedAt: fetched.signedAt,
        signatureLevel: 3,
        qualifiedProvider: provider.id,
        qualifiedProviderRef: args.providerRef,
      },
    )) as { signatureId: Id<"correspondanceSignatures"> };

    void item;
    return {
      signatureId: recorded.signatureId,
      sealedStorageId,
      serialNumber: fetched.serialNumber,
    };
  },
});
