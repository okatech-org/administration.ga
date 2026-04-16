/**
 * Placeholder Resolver — computes concrete string values for every placeholder
 * referenced by a template, given the resolution context (request + user +
 * profile + org + formData + system clock).
 *
 * Consumed by the PDF generation action in `convex/functions/generatedDocuments.ts`
 * (and, in the future, the live preview pane when it needs real data).
 *
 * The resolver is intentionally pure — it takes plain data buckets, not a
 * Convex context — so the same code can be reused client-side for preview.
 */

import { readPath } from "@workspace/document-rendering/placeholder-utils";
import {
	PlaceholderResolutionError,
	type PlaceholderDescriptor,
	type ResolvedPlaceholders,
} from "@workspace/document-rendering/types";

/** Data buckets from which placeholder values are pulled. */
export interface ResolverContext {
	user?: Record<string, unknown>;
	profile?: Record<string, unknown>;
	request?: Record<string, unknown>;
	formData?: Record<string, unknown>;
	org?: Record<string, unknown>;
	system?: Record<string, unknown>;
}

/**
 * Resolve every placeholder declared on the template against the provided
 * context. Throws `PlaceholderResolutionError` if any declared placeholder
 * cannot be resolved (missing value AND no `allowEmpty` fallback).
 */
export function resolvePlaceholders(
	placeholders: PlaceholderDescriptor[],
	ctx: ResolverContext,
	opts: { allowEmpty?: boolean } = {},
): ResolvedPlaceholders {
	const resolved: ResolvedPlaceholders = {};
	const missing: string[] = [];

	for (const p of placeholders) {
		const bucket = pickBucket(p.source, ctx);
		const path = p.path ?? p.key;
		const value = readPath(bucket, path);
		const str = formatValue(value);
		if (str !== undefined) {
			resolved[p.key] = str;
			continue;
		}
		if (opts.allowEmpty) {
			resolved[p.key] = "";
			continue;
		}
		missing.push(p.key);
	}

	if (missing.length > 0) {
		throw new PlaceholderResolutionError(missing);
	}
	return resolved;
}

/** Build the standard `system` bucket with commonly needed values. */
export function buildSystemBucket(options: {
	requestReference?: string;
	documentNumber?: string;
	orgName?: string;
	signerName?: string;
	now?: Date;
}): Record<string, unknown> {
	const now = options.now ?? new Date();
	return {
		today: formatFrenchDate(now),
		todayIso: now.toISOString(),
		generatedAt: formatFrenchDateTime(now),
		submissionDate: formatFrenchDate(now),
		requestReference: options.requestReference ?? "",
		documentNumber: options.documentNumber ?? "",
		orgName: options.orgName ?? "",
		signerName: options.signerName ?? "",
	};
}

function pickBucket(
	source: PlaceholderDescriptor["source"],
	ctx: ResolverContext,
): Record<string, unknown> | undefined {
	switch (source) {
		case "user":
			return ctx.user;
		case "profile":
			return ctx.profile;
		case "request":
			return ctx.request;
		case "formData":
			return ctx.formData;
		case "org":
			return ctx.org;
		case "system":
			return ctx.system;
	}
}

function formatValue(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === "string") return value.length === 0 ? undefined : value;
	if (typeof value === "number") {
		// Assume numeric timestamp values already formatted upstream; raw numbers go as-is.
		return String(value);
	}
	if (typeof value === "boolean") return value ? "Oui" : "Non";
	if (value instanceof Date) return formatFrenchDate(value);
	if (typeof value === "object") {
		// Localized strings: { fr, en } — prefer fr
		const obj = value as Record<string, unknown>;
		if (typeof obj.fr === "string" && obj.fr.length > 0) return obj.fr;
		if (typeof obj.en === "string" && obj.en.length > 0) return obj.en;
		return undefined;
	}
	return String(value);
}

function formatFrenchDate(d: Date): string {
	return d.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

function formatFrenchDateTime(d: Date): string {
	return `${formatFrenchDate(d)} à ${d.toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
}
