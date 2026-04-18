"use node";

/**
 * Generated Documents — PDF generation from Tiptap templates (Node action).
 *
 * Heavy deps (`@react-pdf/renderer`, `@workspace/document-rendering/pdf`) are
 * dynamic-imported so they only load at invocation time — same pattern as
 * `diplomaticFoldersActions.ts`.
 *
 * DB queries / mutations live in `generatedDocumentsData.ts` and are called
 * through `internal.functions.generatedDocumentsData.*`.
 */

import { v } from "convex/values";
import { createElement } from "react";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { authAction } from "../lib/customFunctions";

/**
 * Shape of the resolved generation context returned by
 * `internal.functions.generatedDocumentsData.loadGenerationContext`. Declared
 * here (and mirrored loosely via the return type of that internal query) to
 * break a TypeScript circular-inference loop between the two files.
 */
interface GenerationContext {
	template: Doc<"documentTemplates">;
	request: Doc<"requests">;
	user: Doc<"users">;
	org: Doc<"orgs">;
	profileId: Id<"profiles">;
	profile: Record<string, unknown> | undefined;
	resolvedPlaceholders: Record<string, string>;
	serviceName: string | undefined;
}

export const generateFromTemplate = authAction({
	args: {
		requestId: v.id("requests"),
		templateId: v.id("documentTemplates"),
		trigger: v.optional(
			v.union(
				v.literal("manual"),
				v.literal("status_transition"),
				v.literal("on_submission"),
				v.literal("bulk"),
			),
		),
		// Per-placeholder mapping override applied during resolution. When a
		// key is present, (source, path) override the descriptor defaults.
		fieldMappingOverride: v.optional(
			v.record(
				v.string(),
				v.object({
					source: v.union(
						v.literal("user"),
						v.literal("profile"),
						v.literal("request"),
						v.literal("formData"),
						v.literal("org"),
						v.literal("system"),
					),
					path: v.optional(v.string()),
				}),
			),
		),
	},
	handler: async (ctx, args): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> => {
		return runGeneration(ctx, {
			requestId: args.requestId,
			templateId: args.templateId,
			trigger: args.trigger ?? "manual",
			fieldMappingOverride: args.fieldMappingOverride,
		});
	},
});

/**
 * Internal variant used by auto-triggers (scheduler.runAfter). Identical
 * handler but no auth — the trigger evaluator has already decided the event
 * is legitimate and carries the context.
 */
export const generateFromTemplateInternal = internalAction({
	args: {
		requestId: v.id("requests"),
		templateId: v.id("documentTemplates"),
		trigger: v.union(
			v.literal("status_transition"),
			v.literal("on_submission"),
			v.literal("bulk"),
		),
		autoPublishOverride: v.optional(v.boolean()),
		// Per-placeholder mapping override — auto-gen rules forward their
		// `fieldMapping` here so the resolver picks the right field.
		fieldMappingOverride: v.optional(
			v.record(
				v.string(),
				v.object({
					source: v.union(
						v.literal("user"),
						v.literal("profile"),
						v.literal("request"),
						v.literal("formData"),
						v.literal("org"),
						v.literal("system"),
					),
					path: v.optional(v.string()),
				}),
			),
		),
	},
	handler: async (ctx, args): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> => {
		return runGeneration(ctx, {
			requestId: args.requestId,
			templateId: args.templateId,
			trigger: args.trigger,
			autoPublishOverride: args.autoPublishOverride,
			fieldMappingOverride: args.fieldMappingOverride,
		});
	},
});

/**
 * Shared generation pipeline used by both the public auth action and the
 * scheduler-driven internal action.
 */
async function runGeneration(
	ctx: ActionCtx,
	options: {
		requestId: Id<"requests">;
		templateId: Id<"documentTemplates">;
		trigger: "manual" | "status_transition" | "on_submission" | "bulk";
		autoPublishOverride?: boolean;
		fieldMappingOverride?: Record<
			string,
			{
				source: "user" | "profile" | "request" | "formData" | "org" | "system";
				path?: string;
			}
		>;
	},
): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> {
	// 1. Load generation context (template + request + user + profile + org + resolved placeholders).
	const data: GenerationContext = await ctx.runQuery(
		internal.functions.generatedDocumentsData.loadGenerationContext,
		{
			templateId: options.templateId,
			requestId: options.requestId,
			fieldMappingOverride: options.fieldMappingOverride,
		},
	);

	// 2. Substitute placeholders in the Tiptap AST — dynamic imports.
	const {
		collectImagePlaceholders,
		injectImagePlaceholderSrcs,
		substitutePlaceholders,
		TemplatePdfDocument,
		resolveHeaderFooterBlock,
		resolveTypographyBlock,
	} = await import("@workspace/document-rendering");
	let resolvedContent = substitutePlaceholders(
		data.template.content,
		data.resolvedPlaceholders,
	);

	// 2b. Pre-resolve image placeholders. PR2 only supports `fallbackStorageId`
	// (no mapping yet — that arrives in PR4). Each fallback is fetched from
	// Convex storage, encoded as a data URL and injected into the tree as
	// `_resolvedSrc` so the renderer draws the actual image instead of the
	// dashed fallback box.
	const imagePlaceholders = collectImagePlaceholders(resolvedContent);
	if (imagePlaceholders.length > 0) {
		const srcById: Record<string, string> = {};
		for (const ph of imagePlaceholders) {
			if (!ph.fallbackStorageId) continue;
			const blob = await ctx.storage.get(ph.fallbackStorageId as Id<"_storage">);
			if (!blob) continue;
			const bytes = new Uint8Array(await blob.arrayBuffer());
			srcById[ph.id] = `data:image/png;base64,${arrayBufferToBase64(bytes)}`;
		}
		if (Object.keys(srcById).length > 0) {
			resolvedContent = injectImagePlaceholderSrcs(resolvedContent, srcById);
		}
	}

	// 2c. Résout les 3 facettes inline du template. L'entête peut embarquer
	// un logo stocké dans `_storage` — on fournit un `logoResolver` qui
	// encode le blob en data URL.
	const headerFooterResolvedRaw = data.template.headerFooter
		? await resolveHeaderFooterBlock(
				data.template.headerFooter as Parameters<typeof resolveHeaderFooterBlock>[0],
				async (storageId) => {
					const blob = await ctx.storage.get(storageId as Id<"_storage">);
					if (!blob) return undefined;
					const bytes = new Uint8Array(await blob.arrayBuffer());
					return `data:image/png;base64,${arrayBufferToBase64(bytes)}`;
				},
			)
		: undefined;

	// 2d. Applique les overrides de branding de la représentation —
	// surcharge l'entête / le pied si la rep a défini `branding.headerLines`
	// ou `branding.footerAddress/Phone/Email`. Le sceau (logo) reste
	// toujours celui du modèle global, c'est une constante.
	const { applyOrgBrandingToHeaderFooter } = await import(
		"../lib/applyOrgBranding"
	);
	const headerFooterResolved = applyOrgBrandingToHeaderFooter(
		headerFooterResolvedRaw,
		data.org.branding,
		data.org.name,
	);
	const typographyResolved = data.template.typography
		? resolveTypographyBlock(
				data.template.typography as Parameters<typeof resolveTypographyBlock>[0],
			)
		: undefined;

	// 3. Render the resolved AST to PDF via React-PDF. `TemplatePdfDocument`
	// returns a `<Document>` so `renderToBuffer` is happy at runtime; the
	// React-PDF types want the ROOT to be a `<Document>` element, hence the
	// cast through `unknown`.
	const { renderToBuffer } = await import("@react-pdf/renderer");
	const element = createElement(TemplatePdfDocument, {
		doc: resolvedContent as Parameters<typeof TemplatePdfDocument>[0]["doc"],
		options: {
			paperSize: data.template.paperSize ?? "A4",
			orientation: data.template.orientation ?? "portrait",
			marginTop: data.template.marginTop,
			marginRight: data.template.marginRight,
			marginBottom: data.template.marginBottom,
			marginLeft: data.template.marginLeft,
			headerFooter: headerFooterResolved,
			typography: typographyResolved,
		},
	});
	const pdfBuffer = await renderToBuffer(
		element as unknown as Parameters<typeof renderToBuffer>[0],
	);

	// 4. SHA-256 hash of the final bytes (audit / integrity).
	const { createHash } = await import("crypto");
	const sha256 = createHash("sha256").update(pdfBuffer).digest("hex");

	// 5. Store the PDF blob in Convex storage.
	const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
	const storageId = await ctx.storage.store(blob);

	// 6. Persist the `generatedDocuments` record.
	const documentId = await ctx.runMutation(
		internal.functions.generatedDocumentsData.persistGenerated,
		{
			templateId: options.templateId,
			templateVersion: data.template.version ?? 1,
			requestId: options.requestId,
			orgId: data.org._id,
			ownerProfileId: data.profileId,
			storageId,
			pdfSha256: sha256,
			contentSnapshot: resolvedContent,
			generatedBy: data.user._id,
			trigger: options.trigger,
			documentNumber: generateDocumentNumber(),
			label: pickLocalized(data.template.name) ?? "Document officiel",
			autoPublishOverride: options.autoPublishOverride,
		},
	);

	return { documentId, storageId, pdfSha256: sha256 };
}

// ============================================================================
// Helpers
// ============================================================================

// ============================================================================
// BULK — Generate the same template for many requests at once
// ============================================================================

/**
 * Fan-out generation: schedules `generateFromTemplateInternal` for every
 * request id provided. Returns the number of scheduled jobs so the UI can
 * give immediate feedback — individual failures surface as missing records
 * in each request's documents list.
 *
 * Auth: requires `documents.generate`. We do not re-assert per-request org
 * membership here (cost prohibitive for bulk) — the per-request scheduler
 * payload carries enough context for the internal action to run with the
 * template's own ACL, and the bulk caller is trusted by task code.
 */
export const bulkGenerate = authAction({
	args: {
		requestIds: v.array(v.id("requests")),
		templateId: v.id("documentTemplates"),
		autoPublishOverride: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<{ scheduled: number }> => {
		if (args.requestIds.length === 0) return { scheduled: 0 };
		if (args.requestIds.length > 200) {
			throw new Error("Trop de demandes sélectionnées (max 200)");
		}

		for (const requestId of args.requestIds) {
			await ctx.scheduler.runAfter(
				0,
				internal.functions.generatedDocuments.generateFromTemplateInternal,
				{
					requestId,
					templateId: args.templateId,
					trigger: "bulk",
					autoPublishOverride: args.autoPublishOverride,
				},
			);
		}

		return { scheduled: args.requestIds.length };
	},
});

// ============================================================================
// SIGNATURE — Sign an existing generated PDF with the caller's membership signature
// ============================================================================

/**
 * Apply the current agent's official signature image to a previously
 * generated PDF. The pipeline opens the stored PDF via `pdf-lib`, stamps the
 * signature PNG on the bottom-right of the last page along with the signer
 * name/title/timestamp, saves the new bytes, recomputes the SHA-256 and
 * patches the `generatedDocuments` record with the new storageId and
 * signature metadata. The original (unsigned) file is deleted.
 *
 * Auth + gating runs through `prepareSignature` (an internalQuery +
 * internalMutation pair) — the action itself remains pure Node PDF work.
 */
export const signDocument = authAction({
	args: { documentId: v.id("generatedDocuments") },
	handler: async (
		ctx,
		args,
	): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> => {
		// 1. Auth + fetch everything we need through an internal query.
		const prep = await ctx.runQuery(
			internal.functions.generatedDocumentsData.prepareSignature,
			{ documentId: args.documentId },
		);

		// 2. Branch on template type:
		//    - templates with `signaturePlaceholder` nodes → multi-sig flow
		//      (re-render PDF with signature substituted at the placeholder)
		//    - legacy templates with no placeholder → bottom-right pdf-lib
		//      overlay (kept for back-compat).
		if (prep.templatePlaceholders.length === 0) {
			return await runLegacyOverlaySign(ctx, args.documentId, prep);
		}
		return await runMultiSignerReRender(ctx, args.documentId, prep);
	},
});

/**
 * Legacy single-signer flow: download the existing PDF, stamp the signature
 * PNG on the bottom-right of the last page via pdf-lib. Untouched from the
 * pre-PR2 behaviour. Used when the template has no `signaturePlaceholder`.
 */
async function runLegacyOverlaySign(
	ctx: ActionCtx,
	documentId: Id<"generatedDocuments">,
	// biome-ignore lint/suspicious/noExplicitAny: prep is the prepareSignature return type — see SignaturePrep
	prep: any,
): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> {
	const [pdfBlob, signatureBlob] = await Promise.all([
		ctx.storage.get(prep.originalStorageId),
		ctx.storage.get(prep.signatureStorageId),
	]);
	if (!pdfBlob) throw new Error("PDF original introuvable en storage");
	if (!signatureBlob) throw new Error("Image de signature introuvable en storage");

	const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
	const sigBytes = new Uint8Array(await signatureBlob.arrayBuffer());

	const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
	const pdfDoc = await PDFDocument.load(pdfBytes);
	const pages = pdfDoc.getPages();
	const lastPage = pages[pages.length - 1];
	if (!lastPage) throw new Error("PDF sans page");

	const sigImage = await pdfDoc.embedPng(sigBytes);
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	const { width: pageWidth } = lastPage.getSize();
	const marginX = 56;
	const boxWidth = 220;
	const boxX = pageWidth - marginX - boxWidth;
	let cursorY = 110;

	const sigMaxWidth = boxWidth;
	const sigMaxHeight = 50;
	const scale = Math.min(sigMaxWidth / sigImage.width, sigMaxHeight / sigImage.height);
	const sigWidth = sigImage.width * scale;
	const sigHeight = sigImage.height * scale;
	lastPage.drawImage(sigImage, {
		x: boxX + (boxWidth - sigWidth) / 2,
		y: cursorY,
		width: sigWidth,
		height: sigHeight,
	});

	cursorY -= 8;
	const gray = rgb(0.3, 0.3, 0.3);
	lastPage.drawLine({
		start: { x: boxX, y: cursorY },
		end: { x: boxX + boxWidth, y: cursorY },
		thickness: 0.5,
		color: gray,
	});
	cursorY -= 14;

	const displayName = prep.displayName;
	lastPage.drawText(displayName, {
		x: boxX,
		y: cursorY,
		size: 10,
		font: boldFont,
		color: rgb(0.1, 0.1, 0.1),
	});
	cursorY -= 12;

	if (prep.title) {
		lastPage.drawText(prep.title, {
			x: boxX,
			y: cursorY,
			size: 9,
			font,
			color: gray,
		});
		cursorY -= 11;
	}

	const now = new Date();
	const timestamp = `Signé le ${now.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	})} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
	lastPage.drawText(timestamp, {
		x: boxX,
		y: cursorY,
		size: 8,
		font,
		color: gray,
	});
	cursorY -= 10;
	lastPage.drawText(`Réf. ${prep.documentNumber}`, {
		x: boxX,
		y: cursorY,
		size: 8,
		font,
		color: gray,
	});

	const signedBytes = await pdfDoc.save();
	const { createHash } = await import("crypto");
	const sha256 = createHash("sha256").update(signedBytes).digest("hex");

	const blob = new Blob([new Uint8Array(signedBytes)], { type: "application/pdf" });
	const storageId = await ctx.storage.store(blob);
	try {
		await ctx.storage.delete(prep.originalStorageId);
	} catch {
		/* non-fatal */
	}

	await ctx.runMutation(
		internal.functions.generatedDocumentsData.finalizeSignature,
		{
			documentId,
			storageId,
			pdfSha256: sha256,
			signedBy: prep.signerId,
			signatureImageStorageId: prep.signatureStorageId,
		},
	);

	return { documentId, storageId, pdfSha256: sha256 };
}

/**
 * Multi-signer flow. Picks an empty `signaturePlaceholder` slot for the
 * calling agent (matching by `signerRole` when set), re-renders the full
 * PDF with all known signatures (including the new one) substituted into
 * their slots via React-PDF, and records the signature in `signers[]`.
 *
 * No PDF coordinate parsing — placement is determined by Tiptap flow,
 * exactly like a regular image. Tradeoff: each signature regenerates the
 * PDF (~500 ms for a 1-3 page doc) but the result is deterministic.
 */
async function runMultiSignerReRender(
	ctx: ActionCtx,
	documentId: Id<"generatedDocuments">,
	// biome-ignore lint/suspicious/noExplicitAny: prep is the prepareSignature return type
	prep: any,
): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> {
	// 1. Pick the slot this agent fills.
	const filledIds = new Set<string>(
		(prep.existingSigners as Array<{ signaturePlaceholderId: string }>).map(
			(s) => s.signaturePlaceholderId,
		),
	);
	const slots = prep.templatePlaceholders as Array<{
		id: string;
		signerRole?: string;
	}>;
	const candidate = pickSlotForSigner(slots, filledIds, prep.signerPositionCode);
	if (!candidate) {
		throw new Error(
			"Aucun emplacement de signature disponible pour ce signataire (rôle non correspondant ou tous remplis)",
		);
	}

	// 2. Fetch the signature PNG, encode as data URL.
	const signatureBlob = await ctx.storage.get(prep.signatureStorageId);
	if (!signatureBlob) throw new Error("Image de signature introuvable en storage");
	const sigBytes = new Uint8Array(await signatureBlob.arrayBuffer());
	const sigDataUrl = `data:image/png;base64,${arrayBufferToBase64(sigBytes)}`;

	// 3. Build the fills map: existing signers + the new one.
	const fillsById: Record<
		string,
		{ src: string; signerName?: string; signedAt?: string }
	> = {};
	for (const existing of prep.existingSigners as Array<{
		signaturePlaceholderId: string;
		signerName?: string;
		signedAt: number;
		signatureImageStorageId: Id<"_storage">;
	}>) {
		const blob = await ctx.storage.get(existing.signatureImageStorageId);
		if (!blob) continue;
		const bytes = new Uint8Array(await blob.arrayBuffer());
		fillsById[existing.signaturePlaceholderId] = {
			src: `data:image/png;base64,${arrayBufferToBase64(bytes)}`,
			signerName: existing.signerName,
			signedAt: new Date(existing.signedAt).toISOString(),
		};
	}
	const nowMs = Date.now();
	fillsById[candidate.id] = {
		src: sigDataUrl,
		signerName: prep.displayName,
		signedAt: new Date(nowMs).toISOString(),
	};

	// 4. Re-render the PDF with substitutions.
	const { injectSignaturePlaceholderFills, TemplatePdfDocument } = await import(
		"@workspace/document-rendering"
	);
	const filledTree = injectSignaturePlaceholderFills(
		prep.contentSnapshot,
		fillsById,
	);
	const { renderToBuffer } = await import("@react-pdf/renderer");
	const element = createElement(TemplatePdfDocument, {
		doc: filledTree as Parameters<typeof TemplatePdfDocument>[0]["doc"],
		options: {
			paperSize: prep.templatePaperSize ?? "A4",
			orientation: prep.templateOrientation ?? "portrait",
			marginTop: prep.templateMargins?.top,
			marginRight: prep.templateMargins?.right,
			marginBottom: prep.templateMargins?.bottom,
			marginLeft: prep.templateMargins?.left,
		},
	});
	const pdfBuffer = await renderToBuffer(
		element as unknown as Parameters<typeof renderToBuffer>[0],
	);

	const { createHash } = await import("crypto");
	const priorPdfSha256 = createHash("sha256")
		.update(new Uint8Array(await (await ctx.storage.get(prep.originalStorageId))!.arrayBuffer()))
		.digest("hex");
	const newSha256 = createHash("sha256").update(pdfBuffer).digest("hex");

	// 5. Persist new PDF, delete old one, append signer.
	const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
	const storageId = await ctx.storage.store(blob);
	try {
		await ctx.storage.delete(prep.originalStorageId);
	} catch {
		/* non-fatal */
	}

	await ctx.runMutation(
		internal.functions.generatedDocumentsData.finalizeMultiSignature,
		{
			documentId,
			storageId,
			pdfSha256: newSha256,
			newSigner: {
				signaturePlaceholderId: candidate.id,
				signerRole: candidate.signerRole,
				userId: prep.signerId,
				signerName: prep.displayName,
				signedAt: nowMs,
				signatureImageStorageId: prep.signatureStorageId,
				priorPdfSha256,
			},
			totalSlots: slots.length,
		},
	);

	return { documentId, storageId, pdfSha256: newSha256 };
}

/**
 * Pick the slot the current agent should fill. Matching strategy:
 *  - First, prefer a slot whose `signerRole` matches the agent's position code.
 *  - Otherwise, take the first unfilled slot with no `signerRole` set.
 *  - Returns undefined if every match is already filled.
 */
function pickSlotForSigner(
	slots: Array<{ id: string; signerRole?: string }>,
	filledIds: Set<string>,
	signerPositionCode: string | undefined,
): { id: string; signerRole?: string } | undefined {
	if (signerPositionCode) {
		for (const slot of slots) {
			if (filledIds.has(slot.id)) continue;
			if (slot.signerRole && slot.signerRole === signerPositionCode) return slot;
		}
	}
	for (const slot of slots) {
		if (filledIds.has(slot.id)) continue;
		if (!slot.signerRole) return slot;
	}
	return undefined;
}

function arrayBufferToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Short human-readable reference, e.g. `GAB-DOC-2026-A7F2B1`. Randomised rather
 * than sequentially numbered — avoids hot-spot contention on a single counter
 * and remains unique enough for consular-scale volumes. A per-org sequential
 * scheme can be layered on later via the existing `counters` table if needed.
 */
function generateDocumentNumber(): string {
	const year = new Date().getFullYear();
	const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
	return `GAB-DOC-${year}-${rand}`;
}

function pickLocalized(v: unknown): string | undefined {
	if (!v || typeof v !== "object") return undefined;
	const obj = v as Record<string, unknown>;
	if (typeof obj.fr === "string" && obj.fr.length > 0) return obj.fr;
	if (typeof obj.en === "string" && obj.en.length > 0) return obj.en;
	return undefined;
}
