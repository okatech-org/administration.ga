/**
 * iCorrespondance — OCR sur courriers entrants scannés (Sprint 4 — D1)
 *
 * Délègue l'extraction de texte à `getOcrProvider()` (mock par défaut,
 * Tesseract / AWS Textract / Google Document AI à brancher selon contrat).
 *
 * Trois points d'entrée :
 *   1. `runOcrOnItem` (publique) : déclenchement manuel depuis l'UI sur un
 *      courrier reçu (ou n'importe quel item avec PDF/image attachées).
 *   2. `_runOcrInternal` (internal) : variante schedulable pour le webhook
 *      `ingestInboundEmail` qui poste l'OCR en arrière-plan via
 *      `ctx.scheduler.runAfter`.
 *
 * Idempotent : si l'item porte déjà le tag `ocr-processed`, l'action retourne
 * sans rien faire (cf. `_recordOcrResult`).
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  getOcrProvider,
  isOcrSupportedMime,
} from "../lib/ocrProviders";

async function performOcr(
  ctx: any,
  itemId: Id<"correspondanceItems">,
): Promise<
  | {
      ok: true;
      provider: string;
      charsExtracted: number;
      pageCount?: number;
      confidence?: number;
    }
  | { error: string; ok?: false }
  | { ok: false; reason: string }
> {
  const item = await ctx.runQuery(
    internal.functions.correspondanceCore._getItemForOcr,
    { itemId },
  );
  if (!item) return { error: "Dossier introuvable" };

  // Filtre les pièces océrisables
  const targets = (item.documents as any[]).filter((d) =>
    isOcrSupportedMime(d.mimeType),
  );
  if (targets.length === 0) {
    return { error: "Aucune pièce jointe compatible OCR (PDF/image) trouvée." };
  }

  const provider = getOcrProvider();
  let aggregatedText = "";
  let totalPages = 0;
  let avgConfidence = 0;
  let confidenceSamples = 0;

  for (const doc of targets) {
    const blob = await ctx.storage.get(doc.storageId as Id<"_storage">);
    if (!blob) continue;
    const bytes = await blob.arrayBuffer();
    const result = await provider.extractText({
      bytes,
      mimeType: doc.mimeType,
      filename: doc.filename,
      languages: ["fra", "eng"],
    });
    if ("error" in result) {
      console.warn(`[ocr] ${doc.filename}: ${result.error}`);
      continue;
    }
    if (result.text) {
      aggregatedText += `\n\n— ${doc.filename} —\n${result.text}`;
    }
    if (result.pageCount) totalPages += result.pageCount;
    if (typeof result.confidence === "number") {
      avgConfidence += result.confidence;
      confidenceSamples++;
    }
  }

  const trimmed = aggregatedText.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "no-text-extracted",
    };
  }

  const recorded = (await ctx.runMutation(
    internal.functions.correspondanceCore._recordOcrResult,
    {
      itemId,
      extractedText: trimmed,
      provider: provider.id,
      pageCount: totalPages || undefined,
      confidence:
        confidenceSamples > 0
          ? avgConfidence / confidenceSamples
          : undefined,
    },
  )) as { ok: boolean; reason?: string };

  if (!recorded.ok) {
    return { ok: false, reason: recorded.reason ?? "skip" };
  }

  return {
    ok: true,
    provider: provider.id,
    charsExtracted: trimmed.length,
    pageCount: totalPages || undefined,
    confidence:
      confidenceSamples > 0 ? avgConfidence / confidenceSamples : undefined,
  };
}

/** Déclenchement manuel depuis l'UI. */
export const runOcrOnItem = authAction({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => performOcr(ctx, args.itemId),
});

/**
 * Variante interne — appelée en arrière-plan par
 * `correspondanceInbound.ingestInboundEmail` via `ctx.scheduler.runAfter(0, …)`
 * pour ne pas bloquer la confirmation HTTP du webhook.
 */
export const _runOcrInternal = internalAction({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => performOcr(ctx, args.itemId),
});
