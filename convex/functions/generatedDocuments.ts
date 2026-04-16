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
	},
	handler: async (ctx, args): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> => {
		return runGeneration(ctx, {
			requestId: args.requestId,
			templateId: args.templateId,
			trigger: args.trigger ?? "manual",
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
	},
	handler: async (ctx, args): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> => {
		return runGeneration(ctx, {
			requestId: args.requestId,
			templateId: args.templateId,
			trigger: args.trigger,
			autoPublishOverride: args.autoPublishOverride,
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
	},
): Promise<{ documentId: Id<"generatedDocuments">; storageId: Id<"_storage">; pdfSha256: string }> {
	// 1. Load generation context (template + request + user + profile + org + resolved placeholders).
	const data: GenerationContext = await ctx.runQuery(
		internal.functions.generatedDocumentsData.loadGenerationContext,
		{ templateId: options.templateId, requestId: options.requestId },
	);

	// 2. Substitute placeholders in the Tiptap AST — dynamic imports.
	const { substitutePlaceholders, TemplatePdfDocument } = await import(
		"@workspace/document-rendering"
	);
	const resolvedContent = substitutePlaceholders(
		data.template.content,
		data.resolvedPlaceholders,
	);

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
