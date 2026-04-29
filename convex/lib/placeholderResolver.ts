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
 * Per-placeholder override of `(source, path)` OR a literal value. When a key
 * matches a `mappingOverride` entry:
 *  - if `literal` is set, the resolver returns it directly (skips bucket lookup);
 *  - otherwise the resolver pulls from `(override.source ?? descriptor.source,
 *     override.path ?? descriptor.path ?? key)`.
 *
 * Used by:
 *  - `autoGenerationRule.fieldMapping` (PR4) to wire a template's
 *     placeholders to the actual fields of a service formSchema.
 *  - The manual generation flow (`generateFromTemplate`) when an agent
 *     wants to override the convention for a one-shot generation, including
 *     supplying free-text values for placeholders whose data does not exist
 *     anywhere in the request.
 */
export interface FieldMappingOverride {
	source?: PlaceholderDescriptor["source"];
	path?: string;
	literal?: string;
}
export type FieldMapping = Record<string, FieldMappingOverride>;

/**
 * Detailed resolution outcome for a single placeholder. Returned by
 * `previewResolvedPlaceholders` to power the read-only preview table in
 * the manual generation flow — never throws, always reports the status.
 */
export interface PlaceholderResolutionEntry {
	key: string;
	/** Optional — newer templates omit labels entirely (key is self-explanatory). */
	label?: Record<string, string>;
	source: PlaceholderDescriptor["source"];
	path?: string;
	value: string;
	status: "resolved" | "empty" | "error";
	error?: string;
	fromMapping: boolean;
}

/**
 * Resolve every placeholder declared on the template against the provided
 * context. Throws `PlaceholderResolutionError` if any declared placeholder
 * cannot be resolved (missing value AND no `allowEmpty` fallback).
 *
 * `mappingOverride` lets the caller swap `(source, path)` per-key — the
 * descriptor's defaults are kept as a fallback when the key is absent
 * from the override map.
 */
export function resolvePlaceholders(
	placeholders: PlaceholderDescriptor[],
	ctx: ResolverContext,
	opts: { allowEmpty?: boolean; mappingOverride?: FieldMapping } = {},
): ResolvedPlaceholders {
	const resolved: ResolvedPlaceholders = {};
	const missing: string[] = [];

	for (const p of placeholders) {
		const override = opts.mappingOverride?.[p.key];
		// Literal value override short-circuits the bucket lookup — used when
		// the data does not exist in the request and the agent supplies a
		// free-text value during the manual mapping flow.
		if (override?.literal !== undefined) {
			resolved[p.key] = override.literal;
			continue;
		}
		const source = override?.source ?? p.source;
		const path = override?.path ?? p.path ?? p.key;
		const bucket = pickBucket(source, ctx);
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

/**
 * Non-throwing variant returning a per-key status (resolved / empty / error).
 * Used by the read-only preview UI before generation.
 */
export function describeResolution(
	placeholders: PlaceholderDescriptor[],
	ctx: ResolverContext,
	opts: { mappingOverride?: FieldMapping } = {},
): PlaceholderResolutionEntry[] {
	const out: PlaceholderResolutionEntry[] = [];
	for (const p of placeholders) {
		const override = opts.mappingOverride?.[p.key];
		// Literal value override short-circuits the bucket lookup — surfaced
		// in the preview as `resolved` + `fromMapping: true`.
		if (override?.literal !== undefined) {
			out.push({
				key: p.key,
				label: p.label,
				source: override.source ?? p.source,
				path: override.path ?? p.path ?? p.key,
				value: override.literal,
				status: "resolved",
				fromMapping: true,
			});
			continue;
		}
		const source = override?.source ?? p.source;
		const path = override?.path ?? p.path ?? p.key;
		try {
			const bucket = pickBucket(source, ctx);
			const value = readPath(bucket, path);
			const str = formatValue(value);
			if (str !== undefined) {
				out.push({
					key: p.key,
					label: p.label,
					source,
					path,
					value: str,
					status: "resolved",
					fromMapping: Boolean(override),
				});
			} else {
				out.push({
					key: p.key,
					label: p.label,
					source,
					path,
					value: "",
					status: "empty",
					fromMapping: Boolean(override),
				});
			}
		} catch (err) {
			out.push({
				key: p.key,
				label: p.label,
				source,
				path,
				value: "",
				status: "error",
				error: err instanceof Error ? err.message : String(err),
				fromMapping: Boolean(override),
			});
		}
	}
	return out;
}

/** Build the standard `system` bucket with commonly needed values. */
export function buildSystemBucket(options: {
	requestReference?: string;
	documentNumber?: string;
	orgName?: string;
	signerName?: string;
	signerTitle?: string;
	cityName?: string;
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
		signerTitle: options.signerTitle ?? "",
		// Ville de la représentation — utilisée dans les formules
		// « Fait à {{city}}, le {{today}} ». Fallback sur le nom de l'org
		// si aucun `branding.cityName` n'est défini.
		city: options.cityName ?? options.orgName ?? "",
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
